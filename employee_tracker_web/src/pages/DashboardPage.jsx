import { useState, useEffect } from 'react';
import { getUsers, getUserSessions, runAudit } from '../api';
import RouteMap from '../components/RouteMap';
import DailyReport from '../components/DailyReport';

export default function DashboardPage() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedDate, setSelectedDate] = useState(formatToday());
  const [sessions, setSessions] = useState([]);
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auditStatus, setAuditStatus] = useState('');

  // Load employee list on mount
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError('Failed to load employees: ' + err.message));
  }, []);

  // Fetch sessions when employee or date changes
  useEffect(() => {
    if (!selectedUserId || !selectedDate) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError('');
    setActiveSessionIdx(0);
    setAuditStatus('');

    getUserSessions(selectedUserId, selectedDate)
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        setSessions([]);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedUserId, selectedDate]);

  const activeSession = sessions[activeSessionIdx] || null;
  const coordinates = activeSession?.coordinates || [];

  const handleRunAudit = async () => {
    if (!activeSession) return;
    setAuditStatus('Running anomaly detection...');
    try {
      const result = await runAudit(activeSession.id);
      setAuditStatus(result.message);
      // Refresh sessions to get updated anomaly flags
      const refreshed = await getUserSessions(selectedUserId, selectedDate);
      setSessions(refreshed);
    } catch (err) {
      setAuditStatus('Audit failed: ' + err.message);
    }
  };

  const parseDate = (dStr) => {
    if (!dStr) return null;
    let s = dStr;
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
    return new Date(s);
  };

  return (
    <div>
      <div className="page-header">
        <h2>Route Tracking Dashboard</h2>
        <p>View employee routes, distances, and anomaly reports</p>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="control-group">
          <label>Employee</label>
          <select
            id="employee-selector"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Select an employee…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email})
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Date</label>
          <input
            id="date-picker"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {activeSession && (
          <div className="control-group" style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleRunAudit} style={{ width: 'auto' }}>
              🔍 Run Audit
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && <div className="error-msg">{error}</div>}

      {/* Audit status */}
      {auditStatus && (
        <div style={{
          padding: '10px 14px',
          marginBottom: '16px',
          borderRadius: '6px',
          fontSize: '13px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          color: '#60a5fa',
        }}>
          {auditStatus}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          Loading sessions…
        </div>
      )}

      {/* No selection */}
      {!selectedUserId && !loading && (
        <div className="empty-state">
          <div className="icon">👆</div>
          <h3>Select an Employee</h3>
          <p>Choose an employee and date from the controls above</p>
        </div>
      )}

      {/* No sessions for the day */}
      {selectedUserId && !loading && sessions.length === 0 && !error && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No Sessions Found</h3>
          <p>No tracking sessions recorded for this date</p>
        </div>
      )}

      {/* Sessions found */}
      {sessions.length > 0 && !loading && (
        <>
          {/* Session tabs (if multiple sessions in a day) */}
          {sessions.length > 1 && (
            <div className="session-tabs">
              {sessions.map((s, idx) => (
                <button
                  key={s.id}
                  className={`session-tab ${idx === activeSessionIdx ? 'active' : ''}`}
                  onClick={() => setActiveSessionIdx(idx)}
                >
                  Session #{s.id} — {parseDate(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {s.is_active ? ' 🟢' : ''}
                </button>
              ))}
            </div>
          )}

          {/* Daily stats */}
          <DailyReport sessions={sessions} />

          {/* Map */}
          <RouteMap coordinates={coordinates} />
        </>
      )}
    </div>
  );
}

function formatToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
