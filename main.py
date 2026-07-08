from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import database, schemas
from database import engine, Base
from fastapi.middleware.cors import CORSMiddleware
from schemas import UserCreate, UserResponse, SessionCreate, SessionResponse, CoordinateCreate, CoordinateResponse
from database import Base, engine, SessionLocal, User, TrackingSession, Coordinate
import datetime
from typing import List
from utilities import calculate_total_route_distance
from ML import flag_anomalous_coordinates
from pydantic import BaseModel
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

# ---------------------------------------------------------
# NEW: Create a New Employee Endpoint
# ---------------------------------------------------------
@app.post("/api/users", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    
    # 1. Security Check: Does this email already exist?
    existing_user = db.query(database.User).filter(database.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Add to Database
    new_user = database.User(name=user.name, email=user.email, role=user.role)
    db.add(new_user)
    db.commit()           
    db.refresh(new_user) 
    
    return new_user

class LoginRequest(BaseModel):
    email: str
    password: str 

@app.post("/api/users/login")
def login_user(request: LoginRequest, db: Session = Depends(get_db)):
    
    user = db.query(database.User).filter(database.User.email == request.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid Credentials")
    
    return {"message": "Login successful", "user_id": user.id, "name": user.name}

@app.post("/api/start", response_model=SessionResponse)
def start_trip(session: SessionCreate, db: Session = Depends(get_db)):
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

# ---------------------------------------------------------
# NEW: Stop the Tracking Session (Clock-Out)
# ---------------------------------------------------------
@app.post("/api/stop/{session_id}")
def stop_trip(session_id: int, db: Session = Depends(get_db)):
    session = db.query(TrackingSession).filter(TrackingSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Tracking session not found")
    if not session.is_active:
        raise HTTPException(status_code=400, detail="Session is already closed")
    
    # 1. Fetch all coordinates to calculate the final distance
    route_points = db.query(Coordinate).filter(Coordinate.session_id == session_id).order_by(Coordinate.timestamp).all()
    
    # 2. Close the session and calculate the distance
    session.is_active = False
    session.end_time = datetime.datetime.now(datetime.timezone.utc)
    session.total_distance_km = calculate_total_route_distance(route_points) 
    
    db.commit()
    db.refresh(session)
    return {
        "message": "Session closed successfully", 
        "session_id": session.id, 
        "total_distance_km": session.total_distance_km
    }


# ---------------------------------------------------------
# NEW: Dashboard Endpoint (Get Route History)
# ---------------------------------------------------------
@app.get("/api/history/{session_id}", response_model=List[CoordinateResponse])
def get_route_history(session_id: int, db: Session = Depends(get_db)):
    # Fetch all GPS pings for this specific shift, ordered by time
    coordinates = db.query(Coordinate).filter(Coordinate.session_id == session_id).order_by(Coordinate.timestamp).all()
    
    if not coordinates:
        raise HTTPException(status_code=404, detail="No coordinates found for this session")
    
    return coordinates


@app.post("/api/audit/{session_id}")
def run_route_audit(session_id: int, db: Session = Depends(get_db)):
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