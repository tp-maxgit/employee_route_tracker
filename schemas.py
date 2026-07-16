from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# ---- Coordinate Schemas ----

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

# ---- Session Schemas ----

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

class SessionDetailResponse(SessionResponse):
    """Session with its coordinates included (for dashboard route display)."""
    coordinates: List[CoordinateResponse] = []
    class Config:
        from_attributes = True

# ---- User Schemas ----

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "employee"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    message: str
    user_id: int
    name: str
    email: str
    role: str

# ---- Report Schemas ----

class DailyReport(BaseModel):
    date: str
    total_distance_km: float
    session_count: int

class MonthlyReportResponse(BaseModel):
    user_id: int
    month: str
    daily_breakdown: List[DailyReport]
    monthly_total_km: float
    total_sessions: int

# ---- Employee Dashboard Schema (for Flutter) ----

class EmployeeDashboardResponse(BaseModel):
    user_id: int
    name: str
    role: str
    is_on_duty: bool
    active_session_id: Optional[int] = None
    start_time: Optional[datetime] = None
    duration_minutes: int = 0
    todays_distance_km: float = 0.0
