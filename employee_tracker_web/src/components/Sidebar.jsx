import { NavLink } from 'react-router-dom';

export default function Sidebar({ user, onLogout }) {
  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>
          <span>📍</span>
          Route Tracker
        </h1>
        <p>Admin Dashboard</p>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon">🗺️</span>
          Live Routes
        </NavLink>

        <NavLink
          to="/monthly"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon">📊</span>
          Monthly Report
        </NavLink>

        <NavLink
          to="/employees"
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span className="icon">👥</span>
          Employees
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="name">{user?.name || 'Admin'}</div>
            <div className="role">{user?.role || 'admin'}</div>
          </div>
        </div>
        <button className="sidebar-link" onClick={onLogout} style={{ marginTop: '8px' }}>
          <span className="icon">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
