import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Save, Send, Plus, Trash, ArrowRight, ArrowLeft, CheckCircle, HelpCircle, Users, Layout as LayoutIcon, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboard } from '../DashboardContext';

export default function Settings() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const { t } = useDashboard();
  
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState({}); // mapped by category_id
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', emoji: '❓', button_color: '1', ticket_message: 'Please wait for a staff member to assist you.' });
  
  const [settings, setSettings] = useState({
    panel_channel_id: '',
    embed_color: '#5865F2',
    embed_logo: '',
    embed_title: 'Support Tickets',
    embed_description: 'Please select a category below to open a support ticket.',
    moderator_roles: [],
    enable_feedback: 1,
    panel_type: 'dropdown'
  });

  const [emojis, setEmojis] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [rolesData, channelsData, settingsData, emojisData] = await Promise.all([
          fetch(`/api/guild/${guildId}/roles`, { credentials: 'include' }).then(r => r.json()),
          fetch(`/api/guild/${guildId}/channels`, { credentials: 'include' }).then(r => r.json()),
          fetch(`/api/guild/${guildId}/settings`, { credentials: 'include' }).then(r => r.json()),
          fetch(`/api/guild/${guildId}/emojis`, { credentials: 'include' }).then(r => r.json())
        ]);

        if (Array.isArray(channelsData)) setChannels(channelsData);
        if (Array.isArray(rolesData)) setRoles(rolesData);
        if (Array.isArray(emojisData)) setEmojis(emojisData);

        if (settingsData.guild) {
          let modRoles = [];
          try {
            modRoles = JSON.parse(settingsData.guild.moderator_roles || '[]');
          } catch(e) {}
          
          setSettings({
            panel_channel_id: settingsData.guild.panel_channel_id || '',
            embed_color: settingsData.guild.embed_color || '#5865F2',
            embed_logo: settingsData.guild.embed_logo || '',
            embed_title: settingsData.guild.embed_title || 'Support Tickets',
            embed_description: settingsData.guild.embed_description || 'Click below to open a ticket.',
            moderator_roles: modRoles,
            enable_feedback: settingsData.guild.enable_feedback ?? 1,
            panel_type: settingsData.guild.panel_type || 'dropdown'
          });
        }
        
        if (Array.isArray(settingsData.categories)) {
          setCategories(settingsData.categories);
          // Fetch questions for each category
          const qs = {};
          for (const cat of settingsData.categories) {
            const qRes = await fetch(`/api/guild/${guildId}/categories/${cat.id}/questions`, { credentials: 'include' });
            qs[cat.id] = await qRes.json();
          }
          setQuestions(qs);
        }
        setLoading(false);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load configuration');
        setLoading(false);
      }
    }
    loadData();
  }, [guildId]);

  const saveSettings = async () => {
    try {
      await fetch(`/api/guild/${guildId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      toast.success('Progress saved!');
    } catch(e) {
      toast.error('Failed to save settings');
    }
  };

  const handleNext = async () => {
    if (step === 1 && !settings.panel_channel_id) {
      toast.error('Please select a panel channel!');
      return;
    }
    await saveSettings();
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const handleSendPanel = async () => {
    const res = await fetch(`/api/guild/${guildId}/panel`, {
      method: 'POST',
      credentials: 'include'
    });
    const result = await res.json();
    if (result.success) {
      toast.success('Panel deployed to Discord!');
      navigate(`/servers/${guildId}`);
    } else {
      toast.error(result.error || 'Failed to send panel');
    }
  };

  // --- Handlers for specific steps ---

  const addCategory = async (e) => {
    e.preventDefault();
    
    if (editingCategory) {
      const res = await fetch(`/api/guild/${guildId}/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(categoryForm)
      });
      const result = await res.json();
      if (result.success) {
        setCategories(categories.map(c => c.id === editingCategory.id ? { ...c, ...categoryForm } : c));
        setEditingCategory(null);
        setCategoryForm({ name: '', emoji: '❓', button_color: '1', ticket_message: 'Please wait for a staff member to assist you.' });
        toast.success('Category updated');
      }
    } else {
      const res = await fetch(`/api/guild/${guildId}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(categoryForm)
      });
      const result = await res.json();
      if (result.id) { // Fix: checking result.id instead of success since api returns {id: ...}
        setCategories([...categories, { ...categoryForm, id: result.id }]);
        setQuestions({...questions, [result.id]: []});
        setCategoryForm({ name: '', emoji: '❓', button_color: '1', ticket_message: 'Please wait for a staff member to assist you.' });
        toast.success('Category added');
      }
    }
  };

  const deleteCategory = async (id) => {
    await fetch(`/api/guild/${guildId}/categories/${id}`, { method: 'DELETE', credentials: 'include' });
    setCategories(categories.filter(c => c.id !== id));
  };

  const addQuestion = async (categoryId, e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    if (questions[categoryId]?.length >= 5) {
      return toast.error('Max 5 questions per category allowed by Discord!');
    }

    const res = await fetch(`/api/guild/${guildId}/categories/${categoryId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      const qs = [...(questions[categoryId] || []), { ...data, id: result.id, required: data.required === 'on' ? 1 : 0 }];
      setQuestions({...questions, [categoryId]: qs});
      e.target.reset();
    }
  };

  const deleteQuestion = async (categoryId, id) => {
    await fetch(`/api/guild/${guildId}/categories/${categoryId}/questions/${id}`, { method: 'DELETE', credentials: 'include' });
    const qs = questions[categoryId].filter(q => q.id !== id);
    setQuestions({...questions, [categoryId]: qs});
  };

  if (loading) return <div className="text-center mt-8">Loading setup wizard...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div>
          <Link to={`/servers/${guildId}`} style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
          <h1 style={{ margin: 0 }}>{t('setup_panel')}</h1>
        </div>
        <div style={{ color: 'var(--text-secondary)' }}>
          Step {step} of {totalSteps}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '10px', height: '8px', marginBottom: '2rem', overflow: 'hidden' }}>
        <div style={{ 
          background: 'var(--primary)', 
          height: '100%', 
          width: `${(step / totalSteps) * 100}%`,
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
        }} />
      </div>

      <div className="glass-panel" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
        
        {/* STEP 1: GENERAL & DESIGN */}
        {step === 1 && (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutIcon size={20}/> {t('general')}</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Configure where the panel will be sent and how it looks.</p>
                
                <div className="input-group">
                  <label>{t('panel_layout')}</label>
                  <select 
                    className="select" 
                    value={settings.panel_type} 
                    onChange={e => setSettings({...settings, panel_type: e.target.value})}
                  >
                    <option value="dropdown">{t('dropdown')}</option>
                    <option value="buttons">{t('buttons')}</option>
                  </select>
                </div>
                
                <div className="input-group">
                  <label>Panel Channel <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <select 
                    className="select" 
                    value={settings.panel_channel_id} 
                    onChange={e => setSettings({...settings, panel_channel_id: e.target.value})}
                    style={{ borderColor: !settings.panel_channel_id ? 'var(--danger)' : 'var(--success)' }}
                  >
                    <option value="">Select a channel...</option>
                    {channels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                  </select>
                </div>
                
                <div className="input-group">
                  <label>Embed Title</label>
                  <input type="text" className="input" value={settings.embed_title} onChange={e => setSettings({...settings, embed_title: e.target.value})} />
                </div>
                
                <div className="input-group">
                  <label>Embed Description</label>
                  <textarea className="input" value={settings.embed_description} onChange={e => setSettings({...settings, embed_description: e.target.value})} rows="3"></textarea>
                </div>

                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="input-group" style={{ flex: '1 1 200px' }}>
                    <label>Embed Color</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input type="color" style={{ height: '42px', width: '50px', padding: 0, border: 'none', borderRadius: '8px', cursor: 'pointer' }} value={settings.embed_color} onChange={e => setSettings({...settings, embed_color: e.target.value})} />
                      <input type="text" className="input" value={settings.embed_color} onChange={e => setSettings({...settings, embed_color: e.target.value})} style={{ flex: 1 }} />
                    </div>
                  </div>
                  <div className="input-group" style={{ flex: '1 1 200px' }}>
                    <label>Thumbnail Logo URL</label>
                    <input type="text" className="input" placeholder="https://" value={settings.embed_logo} onChange={e => setSettings({...settings, embed_logo: e.target.value})} />
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0 }}>
                    <input 
                      type="checkbox" 
                      checked={settings.enable_feedback === 1}
                      onChange={e => setSettings({...settings, enable_feedback: e.target.checked ? 1 : 0})}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong>Enable Close with Feedback Button</strong>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Show a button in tickets allowing users to close them and leave feedback.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* LIVE DISCORD PREVIEW */}
              <div style={{ flex: 1, minWidth: '300px', background: '#313338', borderRadius: '8px', padding: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#b5bac1', fontSize: '0.8rem', textTransform: 'uppercase' }}>Live Discord Preview</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="bot" style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: '#f2f3f5', fontWeight: '500' }}>Support Bot</span>
                      <span style={{ background: '#5865F2', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '3px' }}>APP</span>
                      <span style={{ color: '#949ba4', fontSize: '0.75rem' }}>Today at 12:00 PM</span>
                    </div>
                    <div style={{ 
                      background: '#2b2d31', 
                      borderRadius: '4px', 
                      borderLeft: `4px solid ${settings.embed_color}`,
                      padding: '1rem',
                      marginTop: '0.5rem',
                      width: '100%',
                      maxWidth: '400px',
                      overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{ flex: 1, wordBreak: 'break-word' }}>
                          <strong style={{ color: '#f2f3f5', display: 'block', marginBottom: '0.5rem' }}>{settings.embed_title || 'Title'}</strong>
                          <span style={{ color: '#dbdee1', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{settings.embed_description || 'Description'}</span>
                        </div>
                        {settings.embed_logo && (
                          <img src={settings.embed_logo} alt="thumb" style={{ width: '80px', height: '80px', borderRadius: '4px', objectFit: 'contain', flexShrink: 0 }} />
                        )}
                      </div>
                      
                      {settings.embed_footer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#949ba4', fontSize: '0.75rem', wordBreak: 'break-word' }}>
                          <span>{settings.embed_footer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MODERATION ROLES */}
        {step === 2 && (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20}/> Moderation Roles</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Select which roles can view and manage support tickets. These roles will be automatically added to all new ticket channels.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {roles.map(role => (
                <label key={role.id} style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.75rem', 
                  background: settings.moderator_roles.includes(role.id) ? 'rgba(88, 101, 242, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${settings.moderator_roles.includes(role.id) ? '#5865F2' : 'transparent'}`,
                  padding: '1rem', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                }}>
                  <input 
                    type="checkbox" 
                    checked={settings.moderator_roles.includes(role.id)}
                    onChange={(e) => {
                      const newRoles = e.target.checked 
                        ? [...settings.moderator_roles, role.id]
                        : settings.moderator_roles.filter(id => id !== role.id);
                      setSettings({...settings, moderator_roles: newRoles});
                    }}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5' }} />
                    <span style={{ fontWeight: 500 }}>{role.name}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: CATEGORIES */}
        {step === 3 && (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LayoutIcon size={20}/> {t('categories')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Add options that users can select from the panel dropdown.</p>
            
            <form onSubmit={addCategory} className="flex gap-4 items-center" style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" name="name" className="input" required placeholder="e.g. General Support" value={categoryForm.name} onChange={e => setCategoryForm({...categoryForm, name: e.target.value})} />
              </div>
              <div style={{ width: '150px' }}>
                <label>Emoji</label>
                <select name="emoji" className="select" value={categoryForm.emoji} onChange={e => setCategoryForm({...categoryForm, emoji: e.target.value})}>
                  <optgroup label="Standard Emojis">
                    <option value="❓">❓ Question</option>
                    <option value="💬">💬 Chat</option>
                    <option value="🎫">🎫 Ticket</option>
                    <option value="🔧">🔧 Wrench</option>
                    <option value="⚠️">⚠️ Warning</option>
                    <option value="🛡️">🛡️ Shield</option>
                    <option value="💡">💡 Idea</option>
                    <option value="🎮">🎮 Game</option>
                    <option value="🛒">🛒 Cart</option>
                    <option value="💰">💰 Money</option>
                    <option value="📝">📝 Note</option>
                  </optgroup>
                  {emojis.length > 0 && (
                    <optgroup label="Server Emojis">
                      {emojis.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {settings.panel_type === 'buttons' && (
                <div style={{ width: '150px' }}>
                  <label>{t('button_color')}</label>
                  <select name="button_color" className="select" value={categoryForm.button_color} onChange={e => setCategoryForm({...categoryForm, button_color: e.target.value})}>
                    <option value="1">Primary (Blue)</option>
                    <option value="2">Secondary (Grey)</option>
                    <option value="3">Success (Green)</option>
                    <option value="4">Danger (Red)</option>
                  </select>
                </div>
              )}
              
              <div style={{ flex: '1 1 100%' }}>
                <label>{t('ticket_msg')}</label>
                <textarea name="ticket_message" className="input" placeholder="Welcome {user}! How can we help?" rows="2" value={categoryForm.ticket_message} onChange={e => setCategoryForm({...categoryForm, ticket_message: e.target.value})}></textarea>
              </div>

              <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                <button type="submit" className="btn"><Plus size={18}/> {editingCategory ? 'Update Category' : t('add_category')}</button>
                {editingCategory && (
                  <button type="button" className="btn secondary" onClick={() => {
                    setEditingCategory(null);
                    setCategoryForm({ name: '', emoji: '❓', button_color: '1', ticket_message: 'Please wait for a staff member to assist you.' });
                  }}>Cancel</button>
                )}
              </div>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {categories.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {c.emoji.match(/^\d+$/) 
                      ? <img src={`https://cdn.discordapp.com/emojis/${c.emoji}.webp?size=32`} alt="emoji" style={{ width: '24px', height: '24px' }} />
                      : <span style={{ fontSize: '1.5rem' }}>{c.emoji}</span>
                    }
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <strong style={{ fontSize: '1.1rem' }}>{c.name}</strong>
                      {settings.panel_type === 'buttons' && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Color: {c.button_color === '1' ? 'Primary' : c.button_color === '2' ? 'Secondary' : c.button_color === '3' ? 'Success' : 'Danger'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn secondary" style={{ padding: '0.5rem' }} onClick={() => {
                      setEditingCategory(c);
                      setCategoryForm({ name: c.name, emoji: c.emoji || '❓', button_color: c.button_color || '1', ticket_message: c.ticket_message || 'Please wait for a staff member to assist you.' });
                    }}>Edit</button>
                    <button className="btn danger" style={{ padding: '0.5rem' }} onClick={() => deleteCategory(c.id)}><Trash size={16}/></button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="text-center" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>No categories added. Add at least one!</div>}
            </div>
          </div>
        )}

        {/* STEP 4: QUESTIONS / MODALS */}
        {step === 4 && (
          <div className="animate-fade-in" style={{ flex: 1 }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HelpCircle size={20}/> {t('modals')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Configure up to 5 questions per category that users must answer to open a ticket. If you add 0 questions, the ticket will open immediately without a dialog.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginTop: '2rem' }}>
              {categories.map(c => (
                <div key={c.id} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                    {c.emoji} {c.name}
                  </div>
                  <div style={{ padding: '1rem' }}>
                    
                    {/* Add Question Form */}
                    {questions[c.id]?.length < 5 ? (
                      <form onSubmit={(e) => addQuestion(c.id, e)} style={{ display: 'flex', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 2 }}>
                          <label style={{ fontSize: '0.8rem' }}>Question Label</label>
                          <input type="text" name="label" className="input" required placeholder="What is your issue?" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.8rem' }}>Type</label>
                          <select name="style" className="select">
                            <option value="1">Short Text</option>
                            <option value="2">Paragraph</option>
                          </select>
                        </div>
                        <div style={{ paddingBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <input type="checkbox" name="required" defaultChecked style={{ accentColor: 'var(--primary)' }}/> Req.
                        </div>
                        <button type="submit" className="btn" style={{ padding: '0.5rem' }}><Plus size={18}/></button>
                      </form>
                    ) : (
                      <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>Max 5 questions reached.</div>
                    )}

                    {/* List Questions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {questions[c.id]?.map((q, i) => (
                        <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '4px', borderLeft: '2px solid var(--primary)' }}>
                          <div>
                            <span style={{ opacity: 0.5, marginRight: '0.5rem' }}>{i + 1}.</span>
                            <strong>{q.label}</strong>
                            <span style={{ fontSize: '0.75rem', marginLeft: '1rem', opacity: 0.7, background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: '4px' }}>
                              {q.style == 1 ? 'Short' : 'Paragraph'} {q.required ? '(Req)' : ''}
                            </span>
                          </div>
                          <button className="btn danger" style={{ padding: '0.3rem' }} onClick={() => deleteQuestion(c.id, q.id)}><Trash size={14}/></button>
                        </div>
                      ))}
                    </div>

                  </div>
                </div>
              ))}
              {categories.length === 0 && <div className="text-center" style={{ color: 'var(--danger)' }}>Go back and add a category first!</div>}
            </div>
          </div>
        )}

        {/* STEP 5: DEPLOY */}
        {step === 5 && (
          <div className="animate-fade-in text-center" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={64} color="var(--success)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>All Set!</h2>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', fontSize: '1.1rem', marginBottom: '2rem' }}>
              Your ticket panel is ready. Review the summary below, then deploy the panel to your Discord server.
            </p>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '600px', textAlign: 'left', marginBottom: '3rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Target Channel</span>
                  <div style={{ fontWeight: 'bold' }}>{channels.find(c => c.id === settings.panel_channel_id)?.name || 'Not set'}</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Categories</span>
                  <div style={{ fontWeight: 'bold' }}>{categories.length} configured</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Moderation Roles</span>
                  <div style={{ fontWeight: 'bold' }}>{settings.moderator_roles.length} selected</div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Language</span>
                  <div style={{ fontWeight: 'bold' }}>{settings.locale === 'de' ? 'German' : 'English'}</div>
                </div>
              </div>
            </div>
            
            <button className="btn success hover-pulse" style={{ padding: '1rem 3rem', fontSize: '1.2rem', gap: '1rem' }} onClick={handleSendPanel}>
              <Send size={24} /> Deploy Panel Now
            </button>
          </div>
        )}

        {/* WIZARD NAVIGATION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            className="btn" 
            style={{ background: 'rgba(255,255,255,0.1)', visibility: step === 1 ? 'hidden' : 'visible' }} 
            onClick={() => setStep(s => Math.max(s - 1, 1))}
          >
            <ArrowLeft size={18}/> Back
          </button>
          
          {step < totalSteps && (
            <button className="btn primary" onClick={handleNext}>
              Next Step <ArrowRight size={18}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
