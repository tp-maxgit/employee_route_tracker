export default function DailyReport({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  const parseDate = (dStr) => {
    if (!dStr) return null;
    let s = dStr;
    if (!s.endsWith('Z') && !s.includes('+')) s += 'Z';
    return new Date(s);
  };

  // Aggregate stats across all sessions for the day
  const totalDistance = sessions.reduce((sum, s) => sum + (s.total_distance_km || 0), 0);
  const totalCoordinates = sessions.reduce((sum, s) => sum + (s.coordinates?.length || 0), 0);
  const anomalyCount = sessions.reduce(
    (sum, s) => sum + (s.coordinates?.filter(c => c.is_anomaly).length || 0),
    0
  );

  // Find earliest start and latest end
  const startTimes = sessions.map(s => parseDate(s.start_time));
  const endTimes = sessions.filter(s => s.end_time).map(s => parseDate(s.end_time));

  const earliestStart = new Date(Math.min(...startTimes));
  const latestEnd = endTimes.length > 0 ? new Date(Math.max(...endTimes)) : null;

  const activeSessions = sessions.filter(s => s.is_active).length;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-label">Total Distance</div>
        <div className="stat-value">
          {totalDistance.toFixed(2)}
          <span className="stat-unit">km</span>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">First Start</div>
        <div className="stat-value" style={{ fontSize: '20px' }}>
          {earliestStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Last End</div>
        <div className="stat-value" style={{ fontSize: '20px' }}>
          {latestEnd
            ? latestEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : activeSessions > 0 ? '🟢 Active' : '—'}
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Sessions</div>
        <div className="stat-value">{sessions.length}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">GPS Points</div>
        <div className="stat-value">{totalCoordinates}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">Anomalies</div>
        <div className="stat-value" style={{ color: anomalyCount > 0 ? 'var(--danger)' : 'var(--success)' }}>
          {anomalyCount}
        </div>
      </div>
    </div>
  );
}
