"""
CO-NOWCAST Database Module
Defines SQLite SQLAlchemy models and database connection.
Tables:
  - events
  - frames
  - storms
  - storm_lineage
  - forecasts
  - hazards
  - sensor_status
  - model_versions
  - alerts
  - approvals
  - audit_logs
"""
import os
import json
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from backend.app.config import settings

try:
    DATABASE_URL = settings.DATABASE_URL
    if "sqlite:///" in DATABASE_URL and ":memory:" not in DATABASE_URL:
        db_path = DATABASE_URL.replace("sqlite:///", "")
        dir_name = os.path.dirname(os.path.abspath(db_path))
        if dir_name:
            os.makedirs(dir_name, exist_ok=True)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
except Exception:
    DATABASE_URL = "sqlite:///:memory:"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------- SQL Models ----------------- #

class EventModel(Base):
    __tablename__ = "events"
    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    region_bbox = Column(Text, nullable=False) # JSON [min_lat, max_lat, min_lon, max_lon]
    created_at = Column(DateTime, default=datetime.utcnow)

    frames = relationship("FrameModel", back_populates="event", cascade="all, delete-orphan")
    storms = relationship("StormModel", back_populates="event", cascade="all, delete-orphan")
    alerts = relationship("AlertModel", back_populates="event", cascade="all, delete-orphan")

class FrameModel(Base):
    __tablename__ = "frames"
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), ForeignKey("events.id"), index=True)
    timestamp = Column(String(32), index=True) # ISO format
    file_path = Column(String(256))
    source = Column(String(32), default="INSAT-3D")
    resolution_km = Column(Float, default=3.7)
    availability = Column(Boolean, default=True)
    min_tb_k = Column(Float)
    max_tb_k = Column(Float)
    mean_tb_k = Column(Float)
    convective_fraction = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("EventModel", back_populates="frames")

class StormModel(Base):
    __tablename__ = "storms"
    id = Column(Integer, primary_key=True, autoincrement=True)
    storm_id = Column(String(64), index=True) # e.g. STORM-001
    event_id = Column(String(64), ForeignKey("events.id"), index=True)
    timestamp = Column(String(32), index=True)
    centroid_lat = Column(Float)
    centroid_lon = Column(Float)
    area_km2 = Column(Float)
    intensity = Column(Float) # 0 to 1 normalized convective index
    min_tb_k = Column(Float)
    motion_u_kmh = Column(Float, default=0.0)
    motion_v_kmh = Column(Float, default=0.0)
    speed_kmh = Column(Float, default=0.0)
    direction_deg = Column(Float, default=0.0)
    polygon_geojson = Column(Text) # GeoJSON polygon coordinates string

    event = relationship("EventModel", back_populates="storms")

class StormLineageModel(Base):
    __tablename__ = "storm_lineage"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(32), index=True)
    parent_id = Column(String(64), index=True)
    child_id = Column(String(64), index=True)
    transition_type = Column(String(32)) # "CONTINUE", "MERGE", "SPLIT"
    overlap_iou = Column(Float)

class ForecastModel(Base):
    __tablename__ = "forecasts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), index=True)
    base_timestamp = Column(String(32), index=True)
    horizon_min = Column(Integer) # 15, 30, 60, 180, 360
    target_timestamp = Column(String(32))
    model_name = Column(String(64)) # "PERSISTENCE", "OPTICAL_FLOW", "CONVGRU_RESIDUAL"
    confidence = Column(Float)
    uncertainty_std = Column(Float)
    conformal_lower_bound = Column(Float)
    conformal_upper_bound = Column(Float)
    forecast_data_json = Column(Text) # Summary polygons, trajectories, metrics

class HazardModel(Base):
    __tablename__ = "hazards"
    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), index=True)
    timestamp = Column(String(32), index=True)
    horizon_min = Column(Integer)
    hazard_type = Column(String(32)) # "lightning", "hail", "downburst", "cloudburst"
    severity_level = Column(String(16)) # "NONE", "LOW", "MODERATE", "HIGH", "SEVERE"
    probability = Column(Float)
    proxy_indicator = Column(String(128))
    scientific_label = Column(String(256))
    affected_area_km2 = Column(Float)

class SensorStatusModel(Base):
    __tablename__ = "sensor_status"
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(String(32), index=True)
    insat = Column(String(32), default="available") # "available", "degraded", "missing"
    era5 = Column(String(32), default="available")
    dwr = Column(String(32), default="unavailable")
    lightning = Column(String(32), default="unavailable")
    overall_confidence_discount = Column(Float, default=0.75) # discounted because radar/lightning unavailable in prototype

class ModelVersionModel(Base):
    __tablename__ = "model_versions"
    id = Column(String(64), primary_key=True)
    name = Column(String(128))
    version = Column(String(32))
    architecture = Column(String(128))
    resolution_grid = Column(String(64))
    provenance = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class AlertModel(Base):
    __tablename__ = "alerts"
    id = Column(String(64), primary_key=True)
    event_id = Column(String(64), ForeignKey("events.id"), index=True)
    timestamp = Column(String(32), index=True)
    target_region = Column(String(128)) # e.g. "Chennai Region", "Paradeep Coastal Belt"
    hazard_types = Column(Text) # JSON list
    severity = Column(String(16))
    risk_score = Column(Float)
    estimated_arrival_minutes = Column(Float)
    countdown_display = Column(String(32)) # e.g. "00:42:18"
    confidence = Column(String(16)) # "LOW", "MEDIUM", "HIGH"
    status = Column(String(32), default="CANDIDATE") # "CANDIDATE", "APPROVED", "DISSEMINATED", "REJECTED"
    created_at = Column(DateTime, default=datetime.utcnow)

    event = relationship("EventModel", back_populates="alerts")
    approvals = relationship("ApprovalModel", back_populates="alert", cascade="all, delete-orphan")

class ApprovalModel(Base):
    __tablename__ = "approvals"
    id = Column(Integer, primary_key=True, autoincrement=True)
    alert_id = Column(String(64), ForeignKey("alerts.id"), index=True)
    operator_name = Column(String(64), default="Chief Duty Meteorologist")
    decision = Column(String(32)) # "APPROVED", "MODIFIED", "REJECTED"
    comments = Column(Text, nullable=True)
    approved_at = Column(DateTime, default=datetime.utcnow)

    alert = relationship("AlertModel", back_populates="approvals")

class AuditLogModel(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String(64)) # "ALERT_APPROVED", "SENSOR_DROPOUT_SIMULATION", "PREDICTION_RUN"
    actor = Column(String(64), default="Operator")
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Database init fallback ({e})")
