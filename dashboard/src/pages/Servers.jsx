import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Server, Settings } from 'lucide-react';

export default function Servers() {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/guilds', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGuilds(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="text-center mt-8">Loading servers...</div>;

  return (
    <div className="animate-fade-in">
      <h1 style={{ marginBottom: '1rem' }}>Select a Server</h1>
      <p style={{ color: 'var(--text-secondary)' }}>You can only manage servers where you have Administrator permissions.</p>

      <div className="server-grid">
        {guilds.map(guild => (
          <Link to={`/servers/${guild.id}`} key={guild.id} className="glass-panel server-card">
            <div className="server-icon">
              {guild.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt={guild.name} />
              ) : (
                guild.name.charAt(0)
              )}
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{guild.name}</h3>
            {!guild.botInGuild && (
              <span style={{ fontSize: '0.8rem', color: 'var(--danger)', display: 'block', marginTop: '0.5rem' }}>
                Bot is not in this server
              </span>
            )}
            <div className="btn mt-4" style={{ width: '100%' }}>
              <Settings size={16} /> Manage
            </div>
          </Link>
        ))}
      </div>
      
      {guilds.length === 0 && (
        <div className="glass-panel text-center mt-8">
          <Server size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
          <h3>No Servers Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>You don't have Administrator permissions in any Discord server.</p>
        </div>
      )}
    </div>
  );
}
