import { useState, useEffect } from 'react';
import { getUsers, getUserSessions, runAudit } from '../api';
import RouteMap from '../components/RouteMap';
import DailyReport from '../components/DailyReport';

export default function DashboardPage() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedStartDate, setSelectedStartDate] = useState(formatToday());
  const [selectedEndDate, setSelectedEndDate] = useState(formatToday());
  const [sessions, setSessions] = useState([]);
  const [activeSessionIdx, setActiveSessionIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [auditStatus, setAuditStatus] = useState('');

  // Calculate daily totals for the table
  const parseDate = (dStr) => {
    if (!dStr) return null;
    let s = dStr;
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
    return new Date(s);
  };

  const dailyTotals = {};
  sessions.forEach(s => {
    const sDate = parseDate(s.start_time);
    if (sDate) {
      const dStr = sDate.toISOString().split('T')[0];
      if (!dailyTotals[dStr]) dailyTotals[dStr] = 0;
      dailyTotals[dStr] += s.total_distance_km || 0;
    }
  });

  // Load employee list on mount
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError('Failed to load employees: ' + err.message));
  }, []);

  // Fetch sessions when employee or date changes
  useEffect(() => {
    if (!selectedUserId || !selectedStartDate || !selectedEndDate) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError('');
    setActiveSessionIdx(0);
    setAuditStatus('');

    getUserSessions(selectedUserId, selectedStartDate, selectedEndDate)
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch((err) => {
        setSessions([]);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedUserId, selectedStartDate, selectedEndDate]);

  const activeSession = sessions[activeSessionIdx] || null;
  const coordinates = activeSession?.coordinates || [];

  const handleRunAudit = async () => {
    if (!activeSession) return;
    setAuditStatus('Running anomaly detection...');
    try {
      const result = await runAudit(activeSession.id);
      setAuditStatus(result.message);
      // Refresh sessions to get updated anomaly flags
      const refreshed = await getUserSessions(selectedUserId, selectedStartDate, selectedEndDate);
      setSessions(refreshed);
    } catch (err) {
      setAuditStatus('Audit failed: ' + err.message);
    }
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
          <label>Start Date</label>
          <input
            id="start-date-picker"
            type="date"
            value={selectedStartDate}
            onChange={(e) => setSelectedStartDate(e.target.value)}
          />
        </div>

        <div className="control-group">
          <label>End Date</label>
          <input
            id="end-date-picker"
            type="date"
            value={selectedEndDate}
            onChange={(e) => setSelectedEndDate(e.target.value)}
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
          {/* Daily stats */}
          <DailyReport sessions={sessions} />

          {/* Session Data Table */}
          <div className="table-container" style={{ marginTop: '24px', overflowX: 'auto', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Session No.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Started At</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Stopped At</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Session Dist.</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Daily Total</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, idx) => {
                  const sDate = parseDate(s.start_time);
                  const sDateStr = sDate ? sDate.toISOString().split('T')[0] : 'Unknown';
                  const displayDateStr = sDate ? `${String(sDate.getDate()).padStart(2, '0')}-${String(sDate.getMonth() + 1).padStart(2, '0')}-${sDate.getFullYear()}` : 'Unknown';
                  const isViewing = activeSessionIdx === idx;
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: isViewing ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                      <td style={{ padding: '12px 16px' }}>{displayDateStr}</td>
                      <td style={{ padding: '12px 16px' }}>#{idx + 1}</td>
                      <td style={{ padding: '12px 16px' }}>{sDate ? sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                      <td style={{ padding: '12px 16px' }}>{s.end_time ? parseDate(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (s.is_active ? '🟢 Active' : '--:--')}</td>
                      <td style={{ padding: '12px 16px' }}>{(s.total_distance_km || 0).toFixed(2)} km</td>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{(dailyTotals[sDateStr] || 0).toFixed(2)} km</td>
                      <td style={{ padding: '12px 16px' }}>
                        <button 
                          onClick={() => setActiveSessionIdx(idx)}
                          className={isViewing ? 'btn btn-primary' : 'btn btn-secondary'}
                          style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                          {isViewing ? 'Viewing Map' : 'View Map'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Map View — Session #{activeSessionIdx + 1}
            </h3>
            {/* Map */}
            <RouteMap coordinates={coordinates} />
          </div>
        </>
      )}
    </div>
  );
}

function formatToday() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
