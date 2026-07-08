from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CoordinateCreate(BaseModel):
    session_id: int
    latitude: float
    longitude: float
    timestamp: datetime

class CoordinateResponse(CoordinateCreate):
    id: int
    is_anomaly: bool
    class Config:
        from_attributes = True

class SessionCreate(BaseModel):
    user_id: int

class SessionResponse(BaseModel):
    id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    total_distance_km: float
    is_active: bool
    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    name: str
    email: str
    role: str = "employee"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    class Config:
        from_attributes = True




