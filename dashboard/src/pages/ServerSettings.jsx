import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ServerSettings() {
  const { guildId } = useParams();
  const [settings, setSettings] = useState({
    locale: 'en',
    embed_footer: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/guild/${guildId}/settings`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.guild) {
          setSettings(prev => ({ ...prev, ...data.guild }));
        }
      });
  }, [guildId]);

  const saveSettings = async () => {
    setSaving(true);
    const res = await fetch(`/api/guild/${guildId}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      credentials: 'include'
    });
    setSaving(false);
    
    if (res.ok) {
      toast.success('Server settings saved!');
    } else {
      toast.error('Failed to save settings.');
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to={`/servers/${guildId}`} style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><SettingsIcon size={28} /> Server Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure global settings that apply to your entire server.</p>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="input-group">
            <label>Bot Language</label>
            <select className="input" value={settings.locale} onChange={e => setSettings({...settings, locale: e.target.value})}>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
            <small style={{ color: 'var(--text-secondary)' }}>The language used for bot responses and messages.</small>
          </div>

          <div className="input-group">
            <label>Embed Footer Text</label>
            <input type="text" className="input" value={settings.embed_footer || ''} onChange={e => setSettings({...settings, embed_footer: e.target.value})} placeholder="e.g. Acme Support Team" />
            <small style={{ color: 'var(--text-secondary)' }}>This footer will be appended to embeds sent by the bot (like the panel).</small>
          </div>

        </div>

        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn primary" onClick={saveSettings} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
