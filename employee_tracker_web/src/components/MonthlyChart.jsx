import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '8px',
      padding: '12px 16px',
      fontSize: '13px',
    }}>
      <p style={{ color: '#94a3b8', marginBottom: '4px' }}>{label}</p>
      <p style={{ color: '#f1f5f9', fontWeight: 600 }}>
        {payload[0].value.toFixed(2)} km
      </p>
      <p style={{ color: '#64748b', fontSize: '11px', marginTop: '2px' }}>
        {payload[0].payload.session_count} session{payload[0].payload.session_count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function MonthlyChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <h3>Daily Distance Breakdown</h3>
        <div className="empty-state">
          <div className="icon">📊</div>
          <h3>No Data</h3>
          <p>No trips recorded for this month</p>
        </div>
      </div>
    );
  }

  // Format dates to show just the day number
  const chartData = data.map(d => ({
    ...d,
    day: d.date.split('-')[2], // "2026-07-14" → "14"
    displayDate: new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <div className="chart-container">
      <h3>Daily Distance Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis
            dataKey="displayDate"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: '#334155' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v} km`}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }} />
          <Bar dataKey="total_distance_km" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.total_distance_km > 0 ? '#3b82f6' : '#334155'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
