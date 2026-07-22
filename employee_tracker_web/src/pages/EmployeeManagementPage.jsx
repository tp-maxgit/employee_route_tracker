import { useState, useEffect } from 'react';
import { getUsers, register } from '../api';

export default function EmployeeManagementPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      setEmployees(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      setSubmitting(true);
      await register(formData.name, formData.email, formData.password, formData.role);
      setSuccess(`${formData.role === 'admin' ? 'Admin' : 'Employee'} "${formData.name}" created successfully!`);
      setFormData({ name: '', email: '', password: '', role: 'employee' });
      setShowForm(false);
      fetchEmployees(); // Refresh the list
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const adminCount = employees.filter(e => e.role === 'admin').length;
  const employeeCount = employees.filter(e => e.role === 'employee').length;

  return (
    <div>
      <div className="page-header">
        <h2>Employee Management</h2>
        <p>Create and manage employee accounts</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{employees.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Employees</div>
          <div className="stat-value" style={{ color: 'var(--accent-light)' }}>{employeeCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Admins</div>
          <div className="stat-value" style={{ color: 'var(--warning)' }}>{adminCount}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 24px' }}
          onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }}
        >
          {showForm ? '✕ Cancel' : '+ Add New User'}
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: 'var(--success)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '13px',
          marginBottom: '16px',
          textAlign: 'center',
        }}>
          ✓ {success}
        </div>
      )}

      {/* Error message */}
      {error && <div className="error-msg">{error}</div>}

      {/* Create User Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header">
            <h3>Create New User</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rahul@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Set a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '0' }}>
                <label>Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: 'auto', padding: '10px 32px' }}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Table */}
      <div className="card">
        <div className="card-header">
          <h3>All Users</h3>
          <span className="badge badge-success">{employees.length} total</span>
        </div>

        {loading ? (
          <div className="loading-spinner">
            <div className="spinner"></div>
            Loading employees...
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="icon">👤</div>
            <h3>No users yet</h3>
            <p>Click "Add New User" to create the first employee account.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{emp.id}</td>
                  <td style={{ fontWeight: 600 }}>{emp.name}</td>
                  <td>{emp.email}</td>
                  <td>
                    <span
                      className={`badge ${emp.role === 'admin' ? 'badge-warning' : 'badge-success'}`}
                    >
                      {emp.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
