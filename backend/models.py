from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

# Geometry columns require PostGIS / psycopg2. On SQLite (local dev) we fall
# back to a plain Text column that stores WKT strings.  The USING_SQLITE flag
# is set by database.py when psycopg2 is not available.
from .database import Base, USING_SQLITE

if USING_SQLITE:
    _GeomType = Text          # WKT string e.g. "POLYGON((...))"
else:
    from geoalchemy2 import Geometry
    def _GeomType(geom='GEOMETRY', srid=4326):  # type: ignore[misc]
        return Geometry(geom, srid=srid)


class Farm(Base):
    __tablename__ = "farms"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=True)
    farmer_id = Column(String, index=True)
    # WGS84 EPSG:4326 — stored as PostGIS Geometry in prod, WKT Text in dev
    boundary = Column(_GeomType if USING_SQLITE else _GeomType('POLYGON', srid=4326))
    area_hectares = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    audits = relationship("Audit", back_populates="farm")


class Audit(Base):
    __tablename__ = "audits"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id"))
    ndvi_score = Column(Float)
    carbon_yield_tons = Column(Float)
    uncertainty_pct = Column(Float, default=2.9)
    timestamp = Column(DateTime, default=datetime.utcnow)
    hash_manifest = Column(String)   # Hedera Hashgraph TX / Merkle root

    farm = relationship("Farm", back_populates="audits")
    payout = relationship("Payout", back_populates="audit", uselist=False)


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(Integer, ForeignKey("audits.id"))
    amount = Column(Float)
    revenue_share_pct = Column(Float, default=88.0)
    status = Column(String)           # PENDING | COMPLETED | CONFIRMED
    daraja_receipt = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    audit = relationship("Audit", back_populates="payout")


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    uav_name = Column(String, index=True)
    status = Column(String)
    battery = Column(String)
    type = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    altitude = Column(Float)
    speed = Column(Float)
    wind = Column(String)
    co2_level = Column(Float)
    humidity = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)


class StressZone(Base):
    __tablename__ = "stress_zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    area = Column(String)
    priority = Column(String)
    date = Column(String)
    ndvi = Column(Float)
    latitude = Column(Float)
    longitude = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
