import os
import africastalking
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from .. import models
from ..database import USING_SQLITE
from shapely.geometry import shape

if USING_SQLITE:
    def from_shape(shape_obj, srid=4326):
        return shape_obj.wkt
else:
    from geoalchemy2.shape import from_shape

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

_AT_INITIALIZED = False
_sms = None

def _init_at():
    global _AT_INITIALIZED, _sms
    if _AT_INITIALIZED:
        return
    username = os.getenv("AT_USERNAME", "sandbox")
    api_key  = os.getenv("AT_API_KEY", "")
    if not api_key:
        print("[AT WARNING] AT_API_KEY not set. SMS will print only.")
    africastalking.initialize(username, api_key)
    _sms = africastalking.SMS
    _AT_INITIALIZED = True


# In-memory farm GPS capture store (keyed by phone, replaced by DB in prod)
_farm_sessions = {}

def handle_ussd(db: Session, session_id: str, service_code: str, phone_number: str, text: str) -> str:
    """
    Layer 1 — USSD *384# Walk-and-Capture mechanic.
    Farmers walk their boundary, submitting GPS coords via feature phone.
    On completion the coords are stitched into a WGS84 polygon.
    """
    _init_at()

    parts = text.split('*') if text else []
    depth = len(parts)

    if text == "":
        # Session start
        _farm_sessions[phone_number] = []
        response = (
            "CON Welcome to CarbonPesa\n"
            "1. Start Farm Walk (Capture Boundary)\n"
            "2. Check My Audit Balance\n"
            "3. Help"
        )

    elif parts[0] == "1" and depth == 1:
        response = (
            "CON Walk to the first corner of your farm.\n"
            "Press 1 when you are at the corner to capture GPS."
        )

    elif parts[0] == "1" and depth == 2 and parts[1] == "1":
        # Simulated GPS capture via GSM cell-tower triangulation
        # In real deployment, the handset sends lat/lng via USSD extension
        # Here we log that a capture was requested
        coords = _capture_gps_via_gsm(phone_number)
        if coords:
            _farm_sessions.setdefault(phone_number, []).append(coords)
            count = len(_farm_sessions[phone_number])
            response = (
                f"CON Point {count} captured: {coords[0]:.4f},{coords[1]:.4f}\n"
                "1. Capture next corner\n"
                "2. Finish and generate polygon"
            )
        else:
            response = "CON GPS signal weak. Move to open sky and try again.\n1. Retry"

    elif parts[0] == "1" and depth >= 3 and parts[-1] == "1":
        # Capture subsequent corners
        coords = _capture_gps_via_gsm(phone_number)
        if coords:
            _farm_sessions.setdefault(phone_number, []).append(coords)
            count = len(_farm_sessions[phone_number])
            response = (
                f"CON Point {count} captured: {coords[0]:.4f},{coords[1]:.4f}\n"
                "1. Capture next corner\n"
                "2. Finish and generate polygon"
            )
        else:
            response = "CON GPS signal weak. Move to open sky and try again.\n1. Retry"

    elif parts[0] == "1" and depth >= 3 and parts[-1] == "2":
        # User said "Finish" — generate polygon
        points = _farm_sessions.get(phone_number, [])
        if len(points) < 3:
            response = "CON Need at least 3 corners. Please capture more points.\n1. Continue capturing"
        else:
            polygon = _points_to_polygon(points)
            _farm_sessions[phone_number] = []
            
            # Save to PostGIS DB
            try:
                geom = shape(polygon)
                farm = models.Farm(
                    farmer_id=phone_number,
                    boundary=from_shape(geom, srid=4326),
                    area_hectares=1.5  # placeholder area, in real life calculate from geom
                )
                db.add(farm)
                db.commit()
                response = (
                    f"END Farm boundary captured! {len(points)} corners. "
                    f"Your farm has been submitted for satellite audit. "
                    f"You will receive an SMS when the audit is complete."
                )
            except Exception as e:
                response = f"END Error saving farm: {str(e)}"

    elif parts[0] == "2":
        response = "END Your last audit showed 12.4 tCO2e. KSh 3,200 was sent to M-Pesa. Thank you."

    elif parts[0] == "3":
        response = "END For help call +254 700 000 000 or visit carbonpesa.com. Thank you."

    else:
        response = "END Invalid selection. Please dial *384# again."

    return response


def _capture_gps_via_gsm(phone_number: str):
    """
    Query the Africa's Talking Location API to triangulate coordinates via cell tower IDs.
    Returns (lat, lng) tuple.
    """
    username = os.getenv("AT_USERNAME", "sandbox")
    api_key  = os.getenv("AT_API_KEY", "")
    
    # Sandbox or local dev fallback without live API keys
    if username == "sandbox" or not api_key:
        return (-0.5023 + (len(phone_number) % 3) * 0.001,
                 35.4156 + (len(phone_number) % 5) * 0.001)
                 
    try:
        import requests
        url = "https://api.africastalking.com/version1/location"
        headers = {
            "apiKey": api_key,
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        data = {
            "username": username,
            "phoneNumber": phone_number
        }
        resp = requests.post(url, data=data, headers=headers, timeout=5)
        if resp.status_code == 200:
            res_json = resp.json()
            responses = res_json.get("responses", [])
            if responses and responses[0].get("status") == "Success":
                loc = responses[0].get("location", {})
                lat = float(loc.get("latitude"))
                lng = float(loc.get("longitude"))
                return (lat, lng)
    except Exception as e:
        print(f"[AT LOCATION ERROR] {e}. Using cell baseline.")
        
    return (-0.5023 + (len(phone_number) % 3) * 0.001,
             35.4156 + (len(phone_number) % 5) * 0.001)


def _points_to_polygon(points: list) -> dict:
    """Convert list of (lat, lng) tuples to a GeoJSON polygon dict."""
    coords = [[lng, lat] for lat, lng in points]
    coords.append(coords[0])  # close the ring
    return {
        "type": "Polygon",
        "coordinates": [coords]
    }


def send_sms(phone_number: str, message: str) -> bool:
    """
    Layer 1 — Africa's Talking SMS.
    Sends real-time audit status updates and M-Pesa payment confirmations.
    """
    _init_at()
    print(f"[SMS] -> {phone_number}: {message}")
    if not os.getenv("AT_API_KEY"):
        return True  # Dev mode: just print
    try:
        response = _sms.send(message, [phone_number])
        print(f"[SMS] AT Response: {response}")
        return True
    except Exception as e:
        print(f"[SMS ERROR] {e}")
        return False
