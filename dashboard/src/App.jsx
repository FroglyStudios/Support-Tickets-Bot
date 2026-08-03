import React, { createContext, useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Pages (to be created)
import Login from './pages/Login';
import Servers from './pages/Servers';
import ServerOverview from './pages/ServerOverview';
import Settings from './pages/Settings';
import Transcripts from './pages/Transcripts';
import Tags from './pages/Tags';
import Feedback from './pages/Feedback';
import ServerSettings from './pages/ServerSettings';
import Legal from './pages/Legal';
import { DashboardProvider } from './DashboardContext';

export const AuthContext = createContext(null);

const Layout = () => {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e2124', color: '#fff' } }} />
      <div className="bg-gradient"></div>
      <nav className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Support Tickets</h2>
        </div>
        <div className="nav-links">
          {user ? (
            <>
              <span>{user.username}</span>
              <button className="btn danger" style={{ padding: '0.5rem' }} onClick={logout}>
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link to="/" className="btn">Login</Link>
          )}
        </div>
      </nav>
      <div className="container" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <Outlet />
      </div>
      <footer style={{ 
        textAlign: 'center', 
        padding: '1.5rem', 
        background: 'rgba(0,0,0,0.5)', 
        borderTop: '1px solid var(--panel-border)',
        marginTop: 'auto'
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          &copy; {new Date().getFullYear()} FroglyStudios. All rights reserved.
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <Link to="/legal" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Legal & Privacy Policy</Link>
          <Link to="/legal" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Terms of Service</Link>
          <Link to="/legal" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Impressum</Link>
        </div>
      </footer>
    </div>
  );
};

const PrivateRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setUser(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={user ? <Navigate to="/servers" /> : <Login />} />
            <Route path="legal" element={<Legal />} />
            <Route path="servers" element={
              <PrivateRoute>
                <Servers />
              </PrivateRoute>
            } />
            
            {/* Guild specific routes wrapped in DashboardProvider */}
            <Route path="servers/:guildId/*" element={
              <PrivateRoute>
                <DashboardProvider>
                  <Routes>
                    <Route path="/" element={<ServerOverview />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="transcripts" element={<Transcripts />} />
                    <Route path="tags" element={<Tags />} />
                    <Route path="feedback" element={<Feedback />} />
                    <Route path="server-settings" element={<ServerSettings />} />
                  </Routes>
                </DashboardProvider>
              </PrivateRoute>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
