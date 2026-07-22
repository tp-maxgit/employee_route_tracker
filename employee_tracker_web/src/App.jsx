import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import EmployeeManagementPage from './pages/EmployeeManagementPage';
import Sidebar from './components/Sidebar';

function App() {
  const [user, setUser] = useState(null);

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'admin') {
          setUser(parsed);
        } else {
          localStorage.removeItem('user');
        }
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  // Not logged in → show login page
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Admin logged in → show dashboard layout
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/monthly" element={<MonthlyReportPage />} />
            <Route path="/employees" element={<EmployeeManagementPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;