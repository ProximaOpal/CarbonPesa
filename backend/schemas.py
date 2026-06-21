from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class FarmCreate(BaseModel):
    name: str
    geometry: dict
    area_ha: float
    farmer_id: str = "+254700000000"

class FarmResponse(BaseModel):
    id: int
    name: Optional[str]
    farmer_id: str
    area_hectares: float

    class Config:
        from_attributes = True

class FeatureGeometry(BaseModel):
    type: str
    coordinates: List[Any]

class FarmFeature(BaseModel):
    type: str = "Feature"
    geometry: FeatureGeometry
    properties: Dict[str, Any]

class FarmFeatureCollection(BaseModel):
    type: str = "FeatureCollection"
    features: List[FarmFeature]

class TelemetryResponse(BaseModel):
    id: str
    status: str
    battery: str
    type: str
    latitude: float
    longitude: float
    altitude: float
    speed: float
    wind: str
    co2_level: float
    humidity: float

class StressZoneResponse(BaseModel):
    name: str
    area: str
    priority: str
    date: str
    ndvi: float
    coords: List[float]

class AuditResponse(BaseModel):
    id: int
    farm_id: int
    ndvi_score: float
    carbon_yield_tons: float
    timestamp: Optional[str]
    hash_manifest: Optional[str]

class PayoutResponse(BaseModel):
    id: int
    amount: float
    status: str
    daraja_receipt: Optional[str]
    timestamp: Optional[str]

class DashboardStatsResponse(BaseModel):
    spot_price_usd: float
    total_tco2e_sequestered: float
    total_usd_flowing: float
    total_ksh_flowing: float
