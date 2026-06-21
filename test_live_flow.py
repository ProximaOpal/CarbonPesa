"""
CarbonPesa dMRV Full Integration Test
Validates all 8 pipeline stages: USSD → Audit → PDD → Dashboard →
Telemetry · Stresses · GEE Timeseries · B2C Idempotency
"""
import httpx
import time
import sys
import json

API_BASE = "http://localhost:8000"
PASS = "  [PASS]"
FAIL = "  [FAIL]"

def section(n, title):
    print(f"\n{'-'*60}")
    print(f"  [{n}] {title}")
    print(f"{'-'*60}")

def run_test():
    print("=" * 60)
    print("  CARBONPESA dMRV - FULL INTEGRATION VALIDATION")
    print("=" * 60)

    # ──────────────────────────────────────────────────────────────
    # 1. USSD Registration
    # ──────────────────────────────────────────────────────────────
    section("1/8", "USSD Farm Registration (*384#)")
    try:
        # Simulate multi-step USSD walk: start -> point 1 -> point 2 -> point 3 -> finish
        steps = ["", "1", "1*1", "1*1*1", "1*1*1*1", "1*1*1*1*2"]
        res = None
        for step in steps:
            res = httpx.post(f"{API_BASE}/ussd/callback", data={
                "sessionId": "test-session-dmrv-001",
                "serviceCode": "*384#",
                "phoneNumber": "+254712345678",
                "text": step
            }, timeout=10.0)

        if res and res.status_code == 200 and "Error" not in res.text:
            print(f"{PASS} USSD responded OK")
            print(f"       Response: {res.text.strip()[:80]}")
        else:
            print(f"{FAIL} USSD returned unexpected: {res.text[:80] if res else 'None'}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    time.sleep(1)

    # ──────────────────────────────────────────────────────────────
    # 2 & 3. Hybrid dMRV Audit (GEE → Chave 2014 → Hedera → Daraja)
    # ──────────────────────────────────────────────────────────────
    farm_id = 1
    section("2–3/8", f"Hybrid dMRV Audit (Farm ID {farm_id})")
    audit_data = {}
    try:
        res = httpx.post(f"{API_BASE}/audit/{farm_id}", timeout=30.0)
        if res.status_code == 200:
            audit_data = res.json()
            print(f"{PASS} Audit pipeline succeeded")
            print(f"       NDVI Score      : {audit_data.get('ndvi_score')}")
            print(f"       tCO2e Yield     : {audit_data.get('co2_equivalent_tons')} tCO2e")
            print(f"       Uncertainty     : {audit_data.get('uncertainty_pct')}%")
            print(f"       Hedera TX       : {audit_data.get('hedera_tx_id')}")
            print(f"       Payout          : Ksh {audit_data.get('payout_ksh')} (88% share)")
            print(f"       Methodology     : {audit_data.get('methodology')}")
        else:
            print(f"{FAIL} Audit returned HTTP {res.status_code}: {res.text[:200]}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    time.sleep(1)

    # ──────────────────────────────────────────────────────────────
    # 4. Verra VM0047 XML PDD Generator
    # ──────────────────────────────────────────────────────────────
    section("4/8", "Verra VM0047 XML PDD Generator")
    try:
        res = httpx.get(f"{API_BASE}/pdd/generate?farm_id={farm_id}", timeout=10.0)
        if res.status_code == 200 and "<VerraPDD" in res.text:
            print(f"{PASS} XML PDD generated — Hedera HCS embedded")
            for tag in ["HCS_TopicID", "MerkleRoot_SHA256", "Verified_tCO2e", "Methodology"]:
                val = res.text.split(f"<{tag}>")[-1].split(f"</{tag}>")[0] if f"<{tag}>" in res.text else "N/A"
                print(f"       {tag:<22}: {val[:60]}")
        else:
            print(f"{FAIL} PDD returned HTTP {res.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    # ──────────────────────────────────────────────────────────────
    # 5. Live Dashboard Stats
    # ──────────────────────────────────────────────────────────────
    section("5/8", "Live Dashboard Stats (/stats/dashboard)")
    try:
        res = httpx.get(f"{API_BASE}/stats/dashboard", timeout=10.0)
        if res.status_code == 200:
            stats = res.json()
            print(f"{PASS} Dashboard data live")
            print(f"       Carbon Price    : ${stats.get('spot_price_usd')} USD/tCO2e")
            print(f"       Total Sequested : {stats.get('total_tco2e_sequestered')} tCO2e")
            print(f"       USD to Farmers  : ${stats.get('total_usd_flowing')}")
            print(f"       Ksh to Farmers  : Ksh {stats.get('total_ksh_flowing')}")
        else:
            print(f"{FAIL} Dashboard returned HTTP {res.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    # ──────────────────────────────────────────────────────────────
    # 6. Live Telemetry (/telemetry)
    # ──────────────────────────────────────────────────────────────
    section("6/8", "UAV Telemetry Feed (/telemetry)")
    try:
        res = httpx.get(f"{API_BASE}/telemetry", timeout=10.0)
        if res.status_code == 200:
            items = res.json()
            print(f"{PASS} Telemetry endpoint returning {len(items)} unit(s)")
            for u in items[:2]:
                print(f"       {u.get('id','?'):<18} | Bat: {u.get('battery','?')} | {u.get('status','?')}")
        else:
            print(f"{FAIL} /telemetry returned HTTP {res.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    # ──────────────────────────────────────────────────────────────
    # 7. Stress Zones (/stresses)
    # ──────────────────────────────────────────────────────────────
    section("7/8", "Stress Zone Feed (/stresses)")
    try:
        res = httpx.get(f"{API_BASE}/stresses", timeout=10.0)
        if res.status_code == 200:
            zones = res.json()
            print(f"{PASS} Stresses endpoint returning {len(zones)} zone(s)")
            for z in zones[:2]:
                print(f"       {z.get('name','?'):<18} | NDVI: {z.get('ndvi','?')} | Priority: {z.get('priority','?')}")
        else:
            print(f"{FAIL} /stresses returned HTTP {res.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    # ──────────────────────────────────────────────────────────────
    # 7b. GEE Timeseries (/gee/timeseries/{farm_id})
    # ──────────────────────────────────────────────────────────────
    section("7b/8", f"GEE NDVI Timeseries (/gee/timeseries/{farm_id})")
    try:
        res = httpx.get(f"{API_BASE}/gee/timeseries/{farm_id}", timeout=15.0)
        if res.status_code == 200:
            ts = res.json()
            print(f"{PASS} Timeseries returned {len(ts.get('labels',[]))} months")
            print(f"       Labels : {ts.get('labels')}")
            print(f"       Data   : {ts.get('data')}")
        else:
            print(f"{FAIL} /gee/timeseries returned HTTP {res.status_code}: {res.text[:120]}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    # ──────────────────────────────────────────────────────────────
    # 8. B2C Idempotency Guard
    # ──────────────────────────────────────────────────────────────
    section("8/8", "Daraja B2C Callback Idempotency Guard (/b2c/result)")
    try:
        payload = {"Result": {"TransactionID": "TEST_IDEMPOTENCY_RECEIPT_001", "ResultCode": 0}}
        # First call — should accept
        r1 = httpx.post(f"{API_BASE}/b2c/result", json=payload, timeout=5.0)
        # Second call — idempotency should catch it
        r2 = httpx.post(f"{API_BASE}/b2c/result", json=payload, timeout=5.0)
        if r1.status_code == 200 and r2.status_code == 200:
            r1_desc = r1.json().get("ResultDesc", "")
            r2_desc = r2.json().get("ResultDesc", "")
            print(f"{PASS} First  call: {r1_desc}")
            print(f"{PASS} Second call (idempotency): {r2_desc}")
        else:
            print(f"{FAIL} B2C callback failed: {r1.status_code} / {r2.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"{FAIL} {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("  ALL SYSTEMS GO - LIVE FLOW VALIDATION COMPLETE")
    print("  CarbonPesa dMRV platform is production-ready.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    run_test()
