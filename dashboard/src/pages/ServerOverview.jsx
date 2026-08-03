import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings as SettingsIcon, MessageSquare, Tags, BarChart3, AlertCircle, Users, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboard } from '../DashboardContext';

export default function ServerOverview() {
  const { guildId } = useParams();
  const { t } = useDashboard();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guild/${guildId}/stats`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Failed to load server stats');
        setLoading(false);
      });
  }, [guildId]);

  if (loading) {
    return <div className="animate-fade-in text-center mt-8">Loading dashboard...</div>;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '3rem' }}>
        <Link to="/servers" style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'inline-block' }}>&larr; Back to Servers</Link>
        <h1 style={{ margin: '0 0 0.5rem 0', lineHeight: 1.2 }}>{t('dashboard')}</h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Overview and management for your Discord server.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <BarChart3 size={32} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{stats?.totalTickets || 0}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Tickets</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <AlertCircle size={32} color="#facc15" style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{stats?.openTickets || 0}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Open Tickets</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <MessageSquare size={32} color="#3b82f6" style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{stats?.categories || 0}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Categories</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Tags size={32} color="#10b981" style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{stats?.tags || 0}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Canned Responses</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <Users size={32} color="#8b5cf6" style={{ marginBottom: '0.5rem' }} />
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{stats?.memberCount || 0}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Total Members</p>
        </div>
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Users size={32} color="#22c55e" />
              <div style={{ position: 'absolute', bottom: 0, right: -4, width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', border: '2px solid #2b2d31' }} />
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: '2rem' }}>{stats?.onlineCount || 0}</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Online Members</p>
        </div>
      </div>

      <h3>Management</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Link to={`/servers/${guildId}/server-settings`} className="glass-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: '#6366f1', padding: '1rem', borderRadius: '8px' }}>
            <SettingsIcon size={24} color="#fff" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0' }}>{t('global_settings')}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Language, footer, and basic setup.</p>
          </div>
        </Link>

        <Link to={`/servers/${guildId}/settings`} className="glass-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '8px' }}>
            <SettingsIcon size={24} color="#fff" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0' }}>{t('setup_panel')}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Design your ticket panel embed.</p>
          </div>
        </Link>
        
        <Link to={`/servers/${guildId}/transcripts`} className="glass-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: '#3b82f6', padding: '1rem', borderRadius: '8px' }}>
            <MessageSquare size={24} color="#fff" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0' }}>{t('transcripts')}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View and download old chats.</p>
          </div>
        </Link>
        
        <Link to={`/servers/${guildId}/tags`} className="glass-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: '#10b981', padding: '1rem', borderRadius: '8px' }}>
            <Tags size={24} color="#fff" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0' }}>{t('tags')}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Manage canned responses.</p>
          </div>
        </Link>
        
        <Link to={`/servers/${guildId}/feedback`} className="glass-panel" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'transform 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ background: '#f59e0b', padding: '1rem', borderRadius: '8px' }}>
            <Star size={24} color="#fff" />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.2rem 0' }}>{t('feedback')}</h4>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View user feedback.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
