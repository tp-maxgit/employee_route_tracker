from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
import database
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from schemas import (
    UserCreate, UserResponse, SessionCreate, SessionResponse,
    CoordinateCreate, CoordinateResponse, SessionDetailResponse,
    LoginRequest, LoginResponse, MonthlyReportResponse, DailyReport,
    EmployeeDashboardResponse,
)
from database import Base, engine, SessionLocal, User, TrackingSession, Coordinate
import datetime
from typing import List, Optional
from utilities import calculate_total_route_distance
from ML import flag_anomalous_coordinates
from pydantic import BaseModel
import bcrypt

# Password hashing helpers
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Employee Route Tracking System")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)


def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Tracking API is Live and Connected to the Database!"}


# =============================================================
# AUTH ENDPOINTS
# =============================================================

@app.post("/api/users/register", response_model=UserResponse)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new employee or admin with name, email, and password."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash the password and create user
    hashed = hash_password(user.password)
    db_user = User(
        name=user.name,
        email=user.email,
        password_hash=hashed,
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@app.post("/api/users/login", response_model=LoginResponse)
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    """Login with email + password. Returns user info including role."""
    user = db.query(User).filter(User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "message": "Login successful",
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
    }


# =============================================================
# USER / EMPLOYEE ENDPOINTS
# =============================================================

@app.get("/api/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """List all employees (for the dashboard's employee selector)."""
    users = db.query(User).all()
    return users


@app.get("/api/employee/dashboard", response_model=EmployeeDashboardResponse)
def employee_dashboard(user_id: int, db: Session = Depends(get_db)):
    """Get employee's current duty status, duration, and today's distance (for Flutter home screen)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Check for active session
    active_session = db.query(TrackingSession).filter(
        TrackingSession.user_id == user_id,
        TrackingSession.is_active == True,
    ).first()
    
    # Calculate today's total distance (all sessions today)
    today = datetime.date.today()
    today_start = datetime.datetime.combine(today, datetime.time.min)
    today_end = datetime.datetime.combine(today, datetime.time.max)
    
    todays_sessions = db.query(TrackingSession).filter(
        TrackingSession.user_id == user_id,
        TrackingSession.start_time >= today_start,
        TrackingSession.start_time <= today_end,
    ).all()
    
    todays_km = sum(s.total_distance_km or 0 for s in todays_sessions)
    
    # If there's an active session, also add its live distance
    duration_minutes = 0
    if active_session:
        route_points = db.query(Coordinate).filter(
            Coordinate.session_id == active_session.id
        ).order_by(Coordinate.timestamp).all()
        live_distance = calculate_total_route_distance(route_points)
        todays_km += live_distance
        
        elapsed = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) - active_session.start_time
        duration_minutes = int(elapsed.total_seconds() / 60)
    
    return {
        "user_id": user.id,
        "name": user.name,
        "role": user.role,
        "is_on_duty": active_session is not None,
        "active_session_id": active_session.id if active_session else None,
        "start_time": active_session.start_time if active_session else None,
        "duration_minutes": duration_minutes,
        "todays_distance_km": round(todays_km, 2),
    }


# =============================================================
# SESSION TRACKING ENDPOINTS
# =============================================================

# Legacy /start-session endpoint (used by Flutter)
class SessionData(BaseModel):
    employee_id: int
    status: str
    latitude: float = None
    longitude: float = None

@app.post("/start-session")
def start_session_legacy(data: SessionData, db: Session = Depends(get_db)):
    """Start a tracking session (legacy endpoint used by Flutter)."""
    # 1. Verify the employee actually exists
    db_user = db.query(User).filter(User.id == data.employee_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 2. Create the new tracking session
    new_session = TrackingSession(user_id=data.employee_id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    # 3. Save the initial GPS coordinates if provided
    if data.latitude and data.longitude:
        new_coord = Coordinate(
            session_id=new_session.id,
            latitude=data.latitude,
            longitude=data.longitude
        )
        db.add(new_coord)
        db.commit()

    # 4. Let Flutter know it worked
    return {
        "message": "Success! Duty started and GPS safely saved.", 
        "session_id": new_session.id
    }


@app.post("/api/start", response_model=SessionResponse)
def start_trip(session: SessionCreate, db: Session = Depends(get_db)):
    """Start a new tracking session."""
    # 1. Verify the employee actually exists
    db_user = db.query(User).filter(User.id == session.user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # 2. Create the new tracking session
    new_session = TrackingSession(user_id=session.user_id)
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return new_session


@app.post("/api/location", response_model=CoordinateResponse)
def log_location(coord: CoordinateCreate, db: Session = Depends(get_db)):
    """Log a GPS coordinate for an active tracking session."""
    # 1. Verify the session exists and is currently active
    session = db.query(TrackingSession).filter(TrackingSession.id == coord.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="This tracking session is already closed")
    
    # 2. Log the coordinate
    new_coord = Coordinate(
        session_id=coord.session_id,
        latitude=coord.latitude,
        longitude=coord.longitude,
        timestamp=coord.timestamp
    )
    db.add(new_coord)
    db.commit()
    db.refresh(new_coord)
    
    return new_coord


@app.post("/api/stop/{session_id}")
def stop_trip(session_id: int, db: Session = Depends(get_db)):
    """Stop an active tracking session (clock-out)."""
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is already closed")
    
    # 1. Fetch all coordinates to calculate the final distance
    route_points = db.query(Coordinate).filter(Coordinate.session_id == session_id).order_by(Coordinate.timestamp).all()
    
    # 2. Close the session and calculate the distance
    session.is_active = False
    session.end_time = datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)
    session.total_distance_km = calculate_total_route_distance(route_points) 
    
    db.commit()
    db.refresh(session)
    return {
        "message": "Session closed successfully", 
        "session_id": session.id, 
        "total_distance_km": session.total_distance_km
    }


# =============================================================
# DASHBOARD / HISTORY ENDPOINTS
# =============================================================

@app.get("/api/sessions/{session_id}/route")
def get_session_route(session_id: int, db: Session = Depends(get_db)):
    """Get the GPS route for a specific session (used by the map view)."""
    # 1. Verify the session actually exists
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")

    # 2. Grab all coordinates linked to this session, ordered by time
    coordinates = db.query(Coordinate).filter(Coordinate.session_id == session_id).order_by(Coordinate.timestamp).all()

    # 3. Package it up for the frontend
    route_data = [
        {"lat": coord.latitude, "lng": coord.longitude, "time": coord.timestamp}
        for coord in coordinates
    ]

    return {
        "session_id": session_id,
        "total_points": len(route_data),
        "route": route_data
    }


@app.get("/api/history/{session_id}", response_model=List[CoordinateResponse])
def get_route_history(session_id: int, db: Session = Depends(get_db)):
    """Get all GPS coordinates for a session, ordered by time."""
    # Fetch all GPS pings for this specific shift, ordered by time
    coordinates = db.query(Coordinate).filter(Coordinate.session_id == session_id).order_by(Coordinate.timestamp).all()
    
    if not coordinates:
        raise HTTPException(status_code=404, detail="No coordinates found for this session")
    
    return coordinates


@app.get("/api/users/{user_id}/sessions", response_model=List[SessionDetailResponse])
def get_user_sessions_by_date(user_id: int, date: str, db: Session = Depends(get_db)):
    """
    Get all sessions for an employee on a given date, with coordinates included.
    Query param: ?date=YYYY-MM-DD
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        target_date = datetime.datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    day_start = datetime.datetime.combine(target_date, datetime.time.min)
    day_end = datetime.datetime.combine(target_date, datetime.time.max)
    
    sessions = db.query(TrackingSession).filter(
        TrackingSession.user_id == user_id,
        TrackingSession.start_time >= day_start,
        TrackingSession.start_time <= day_end,
    ).order_by(TrackingSession.start_time).all()
    
    return sessions


@app.get("/api/users/{user_id}/monthly-report", response_model=MonthlyReportResponse)
def get_monthly_report(user_id: int, month: str, db: Session = Depends(get_db)):
    """
    Get total km per day for the month, plus a monthly total.
    Query param: ?month=YYYY-MM
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    try:
        year, month_num = month.split("-")
        year, month_num = int(year), int(month_num)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM")
    
    # Get the start and end of the month
    month_start = datetime.datetime(year, month_num, 1)
    if month_num == 12:
        month_end = datetime.datetime(year + 1, 1, 1)
    else:
        month_end = datetime.datetime(year, month_num + 1, 1)
    
    # Fetch all sessions in this month
    sessions = db.query(TrackingSession).filter(
        TrackingSession.user_id == user_id,
        TrackingSession.start_time >= month_start,
        TrackingSession.start_time < month_end,
    ).order_by(TrackingSession.start_time).all()
    
    # Group by day
    daily_data = {}
    for s in sessions:
        day_key = s.start_time.strftime("%Y-%m-%d")
        if day_key not in daily_data:
            daily_data[day_key] = {"distance": 0.0, "count": 0}
        daily_data[day_key]["distance"] += s.total_distance_km or 0
        daily_data[day_key]["count"] += 1
    
    daily_breakdown = [
        DailyReport(
            date=day,
            total_distance_km=round(data["distance"], 2),
            session_count=data["count"],
        )
        for day, data in sorted(daily_data.items())
    ]
    
    monthly_total = round(sum(d.total_distance_km for d in daily_breakdown), 2)
    total_sessions = sum(d.session_count for d in daily_breakdown)
    
    return MonthlyReportResponse(
        user_id=user_id,
        month=month,
        daily_breakdown=daily_breakdown,
        monthly_total_km=monthly_total,
        total_sessions=total_sessions,
    )


# =============================================================
# ANOMALY DETECTION (ML)
# =============================================================

@app.post("/api/audit/{session_id}")
def run_route_audit(session_id: int, db: Session = Depends(get_db)):
    """Run Isolation Forest anomaly detection on a session's route."""
    # 1. Get the route data
    coordinates = db.query(Coordinate).filter(Coordinate.session_id == session_id).all()
    
    # 2. Prevent ML crashes on tiny datasets
    if len(coordinates) < 5:
        return {"message": "Not enough data points to run anomaly detection. Minimum 5 required."}
    
    # 3. Format data for the Pandas matrix
    coords_list = [{"id": c.id, "latitude": c.latitude, "longitude": c.longitude} for c in coordinates]
    
    # 4. Run the Isolation Forest Algorithm
    anomalous_ids = flag_anomalous_coordinates(coords_list)
    
    if not anomalous_ids:
        return {"message": "Audit complete. Route is 100% clean."}
        
    # 5. Update the Database for the flagged points
    db.query(Coordinate).filter(Coordinate.id.in_(anomalous_ids)).update({"is_anomaly": True}, synchronize_session=False)
    db.commit()
    
    return {
        "message": f"Audit complete. Flagged {len(anomalous_ids)} anomalies.",
        "anomalous_coordinate_ids": anomalous_ids
    }