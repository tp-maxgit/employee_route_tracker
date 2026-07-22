import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
import datetime

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Create a .env file with your database connection string.")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="employee") 
    sessions = relationship("TrackingSession", back_populates="user")

class TrackingSession(Base):
    __tablename__ = "tracking_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    start_time = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))
    end_time = Column(DateTime, nullable=True)
    total_distance_km = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    user = relationship("User", back_populates="sessions")
    coordinates = relationship("Coordinate", back_populates="session")

class Coordinate(Base):
    __tablename__ = "coordinates"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("tracking_sessions.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None))
    is_anomaly = Column(Boolean, default=False) 
    session = relationship("TrackingSession", back_populates="coordinates")