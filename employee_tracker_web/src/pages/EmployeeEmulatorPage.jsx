import { useState, useEffect } from 'react';
import { getEmployeeDashboard, startSessionLegacy, stopSession, logLocation } from '../api';

export default function EmployeeEmulatorPage({ user, onLogout }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await getEmployeeDashboard(user.user_id);
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user.user_id]);

  const handleStartDuty = async () => {
    setActionLoading(true);
    try {
      // Send a dummy starting location (e.g., somewhere in Jaipur based on the mock data)
      await startSessionLegacy(user.user_id, "start", 26.9124, 75.7873);
      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopDuty = async () => {
    if (!dashboard?.active_session_id) return;
    setActionLoading(true);
    try {
      await stopSession(dashboard.active_session_id);
      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateMove = async () => {
    if (!dashboard?.active_session_id) return;
    setActionLoading(true);
    try {
      // Add a slight random offset to simulate movement
      const lat = 26.9124 + (Math.random() * 0.01);
      const lng = 75.7873 + (Math.random() * 0.01);
      await logLocation(dashboard.active_session_id, lat, lng);
      await fetchDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.phoneScreen}>
          <div className="loading-spinner"><div className="spinner"></div></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.phoneScreen}>
          <div className="error-msg">{error}</div>
          <button className="btn btn-primary" onClick={onLogout}>Sign Out</button>
        </div>
      </div>
    );
  }

  const { is_on_duty, duration_minutes, todays_distance_km, start_time } = dashboard;
  
  const parseDate = (dStr) => {
    if (!dStr) return null;
    let s = dStr;
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
    return new Date(s);
  };

  const hours = Math.floor(duration_minutes / 60);
  const mins = duration_minutes % 60;
  const timeString = start_time ? parseDate(start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';

  return (
    <div style={styles.container}>
      <div style={styles.phoneScreen}>
        
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTop}>
            <span style={{ fontSize: '24px' }}>👤</span>
            <button 
              onClick={onLogout}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
            >
              Logout
            </button>
          </div>
          <h2 style={{ fontSize: '20px', margin: '10px 0 4px 0', color: 'white' }}>
            Welcome, {user.name}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Role: {user.role}</p>
        </div>

        {/* Status Card */}
        <div style={styles.statusCard}>
          <div style={{ marginBottom: '16px' }}>
            <p style={styles.label}>Status:</p>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              background: is_on_duty ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: is_on_duty ? '#22c55e' : '#ef4444',
              padding: '6px 12px',
              borderRadius: '20px',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              {is_on_duty ? '🟢 On Duty' : '🔴 Off Duty'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <p style={styles.label}>Started at:</p>
              <p style={styles.value}>{is_on_duty ? timeString : '--:--'}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={styles.label}>Duration:</p>
              <p style={styles.value}>{is_on_duty ? `${hours}h ${mins}m` : '0h 0m'}</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #334155', paddingTop: '16px' }}>
            <p style={styles.label}>Today's Distance:</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
              {todays_distance_km.toFixed(2)} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 'normal' }}>km</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {!is_on_duty ? (
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
              onClick={handleStartDuty}
              disabled={actionLoading}
            >
              {actionLoading ? 'Starting...' : 'Start Duty'}
            </button>
          ) : (
            <>
              <button 
                className="btn" 
                style={{ width: '100%', padding: '14px', fontSize: '16px', background: '#ef4444', color: 'white', marginBottom: '12px' }}
                onClick={handleStopDuty}
                disabled={actionLoading}
              >
                {actionLoading ? 'Stopping...' : 'Stop Duty'}
              </button>
              
              <button 
                className="btn" 
                style={{ width: '100%', padding: '14px', fontSize: '16px', background: '#334155', color: 'white' }}
                onClick={handleSimulateMove}
                disabled={actionLoading}
              >
                {actionLoading ? 'Pinging...' : '📍 Simulate GPS Ping'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                (Adds a random coordinate to increase distance)
              </p>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#0f172a',
    padding: '20px',
  },
  phoneScreen: {
    width: '100%',
    maxWidth: '400px',
    height: '800px',
    maxHeight: '90vh',
    background: '#1e293b',
    borderRadius: '32px',
    border: '8px solid #0b1120',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
  },
  header: {
    padding: '30px 24px 20px',
    background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusCard: {
    margin: '0 24px',
    background: '#0f172a',
    borderRadius: '16px',
    padding: '24px',
    border: '1px solid #334155',
  },
  label: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: '18px',
    fontWeight: '600',
    color: 'white',
  },
  actions: {
    padding: '24px',
    marginTop: 'auto',
  }
};
