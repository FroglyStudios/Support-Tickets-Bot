import React, { useEffect, useState } from 'react';
import { LogIn, MessageSquare, Shield, Zap, Sparkles, Server, Users } from 'lucide-react';

export default function Login() {
  const [stats, setStats] = useState({ totalGuilds: 0 });

  useEffect(() => {
    fetch('/api/public/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/login');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error(e);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '80vh', padding: '2rem 0' }}>
      
      {/* Hero Section */}
      <div style={{ textAlign: 'center', marginBottom: '4rem', maxWidth: '800px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(88, 101, 242, 0.1)', color: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '50px', marginBottom: '1.5rem', fontWeight: 'bold' }}>
          <Sparkles size={16} /> Premium Support Tickets
        </div>
        <h1 style={{ fontSize: '3.5rem', margin: '0 0 1rem 0', lineHeight: 1.1 }}>
          The Ultimate <span style={{ color: 'var(--primary)' }}>Discord</span> Ticket System
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', marginBottom: '2.5rem' }}>
          Manage your community seamlessly with beautiful embed panels, custom question modals, automated transcripts, and more.
        </p>
        
        <button 
          className="btn primary hover-pulse" 
          onClick={handleLogin} 
          style={{ padding: '1rem 3rem', fontSize: '1.2rem', display: 'inline-flex', gap: '1rem', marginBottom: '2rem' }}
        >
          <LogIn size={24} /> Login with Discord
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={20} />
            <strong>{stats.totalGuilds ? formatNumber(stats.totalGuilds) : 0}</strong> Servers
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={20} />
            <strong>{stats.totalUsers ? formatNumber(stats.totalUsers) : 0}</strong> Active Users
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px' }}>
        
        <div className="glass-panel" style={{ transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: 'var(--primary)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <MessageSquare size={24} color="#fff" />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Custom Question Modals</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Require users to answer up to 5 custom questions before opening a ticket. Gather all the context you need immediately.
          </p>
        </div>

        <div className="glass-panel" style={{ transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: '#10b981', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Zap size={24} color="#fff" />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Advanced Slash Commands</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Equip your staff with powerful tools like <code>/claim</code>, <code>/close</code>, <code>/add</code>, and <code>/tag</code> to manage tickets blazingly fast.
          </p>
        </div>

        <div className="glass-panel" style={{ transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: '#facc15', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <Shield size={24} color="#fff" />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Transcripts & Security</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Every single message is logged. Read beautiful ticket transcripts directly in your dashboard when a ticket is closed.
          </p>
        </div>

      </div>

    </div>
  );
}
