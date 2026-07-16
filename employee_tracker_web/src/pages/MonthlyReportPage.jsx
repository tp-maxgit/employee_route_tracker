import { useState, useEffect } from 'react';
import { getUsers, getMonthlyReport } from '../api';
import MonthlyChart from '../components/MonthlyChart';

export default function MonthlyReportPage() {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(formatCurrentMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load employees on mount
  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError('Failed to load employees: ' + err.message));
  }, []);

  // Fetch report when employee or month changes
  useEffect(() => {
    if (!selectedUserId || !selectedMonth) {
      setReport(null);
      return;
    }

    setLoading(true);
    setError('');

    getMonthlyReport(selectedUserId, selectedMonth)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setReport(null);
        setError(err.message);
        setLoading(false);
      });
  }, [selectedUserId, selectedMonth]);

  const selectedUser = users.find(u => String(u.id) === String(selectedUserId));

  return (
    <div>
      <div className="page-header">
        <h2>Monthly Report</h2>
        <p>View total kilometers and daily breakdown for any month</p>
      </div>

      {/* Controls */}
      <div className="controls-bar">
        <div className="control-group">
          <label>Employee</label>
          <select
            id="monthly-employee-selector"
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
          <label>Month</label>
          <input
            id="month-picker"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-msg">{error}</div>}

      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
          Loading report…
        </div>
      )}

      {!selectedUserId && !loading && (
        <div className="empty-state">
          <div className="icon">👆</div>
          <h3>Select an Employee</h3>
          <p>Choose an employee and month to view their report</p>
        </div>
      )}

      {report && !loading && (
        <>
          {/* Summary cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Monthly Total</div>
              <div className="stat-value">
                {report.monthly_total_km.toFixed(2)}
                <span className="stat-unit">km</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Total Sessions</div>
              <div className="stat-value">{report.total_sessions}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Active Days</div>
              <div className="stat-value">{report.daily_breakdown.length}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">Avg per Day</div>
              <div className="stat-value">
                {report.daily_breakdown.length > 0
                  ? (report.monthly_total_km / report.daily_breakdown.length).toFixed(1)
                  : '0'}
                <span className="stat-unit">km</span>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <MonthlyChart data={report.daily_breakdown} />

          {/* Table breakdown */}
          {report.daily_breakdown.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3>Daily Breakdown</h3>
                <span className="badge badge-success">
                  {selectedUser?.name || 'Employee'}
                </span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Distance</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {report.daily_breakdown.map((d) => (
                    <tr key={d.date}>
                      <td>
                        {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td>{d.total_distance_km.toFixed(2)} km</td>
                      <td>{d.session_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {report && report.daily_breakdown.length === 0 && !loading && (
        <div className="empty-state">
          <div className="icon">📭</div>
          <h3>No Data for This Month</h3>
          <p>No tracking sessions recorded in {selectedMonth}</p>
        </div>
      )}
    </div>
  );
}

function formatCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
