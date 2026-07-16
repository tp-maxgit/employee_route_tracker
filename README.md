# Employee Route Tracking System

A full-stack, cross-platform system designed to track field executive GPS locations in real-time, complete with an Admin Dashboard and Machine Learning anomaly detection to prevent location spoofing.

## Architecture
1. **Backend (Python/FastAPI):** Handles database connections, authentication, and the Machine Learning anomaly detection model (Isolation Forest).
2. **Web Dashboard (React/Vite):** A command center for Managers/Admins to monitor live routes on an interactive map.
3. **Mobile App (Flutter):** An app for field executives to install on their phones, which tracks and syncs their GPS route in the background while "On Duty".

---

## Getting Started (Local Development Setup)

If you are cloning this repository to a new machine, you will need to start 3 separate terminals to run the 3 pieces of the architecture. 

**Prerequisites:** You must have `Python 3.10+`, `Node.js`, and `Flutter` installed on your machine.

### 1. Start the Backend API (Terminal 1)
This starts the central brain and database connection.
```bash
# In the root directory (Employee_Tracker)
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```
*The backend is now running at `http://localhost:8000`*

### 2. Start the React Admin Dashboard (Terminal 2)
This starts the web portal for managers.
```bash
# Navigate to the React web folder
cd employee_tracker_web

# Install all Node.js dependencies
npm install

# Start the development server
npm run dev
```
*The admin dashboard is now running at `http://localhost:5173`*

### 3. Start the Flutter Mobile App (Terminal 3)
This runs the mobile app in your browser for testing.
```bash
# Navigate to the Flutter mobile folder
cd employee_tracker_mobile

# Start the Flutter Web app
flutter run -d chrome
```
*A Chrome window will pop up with the mobile app.*

---

## How to Test the System
1. Open the **React Admin Dashboard** (`http://localhost:5173`) and log in as an admin (`admin@company.com` / `admin123`).
2. Open the **Flutter App** and log in as an employee (`rahul@company.com` / `emp123`).
3. On the Flutter app, click **Start Duty**. 
4. Click the **"📍 Simulate GPS Ping"** button a few times to generate simulated movement.
5. Watch the React Admin Dashboard — you will see the blue route line drawing live on the map!
6. When done, click **Stop Duty**. You can then click **"Run Audit"** on the React dashboard to run the Machine Learning model on the recorded route.
