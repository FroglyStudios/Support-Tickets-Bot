import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tags as TagsIcon, Plus, Trash } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Tags() {
  const { guildId } = useParams();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guild/${guildId}/tags`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTags(data);
        setLoading(false);
      });
  }, [guildId]);

  const addTag = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    
    const res = await fetch(`/api/guild/${guildId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      setTags([...tags, { id: result.id, name: data.name, content: data.content }]);
      e.target.reset();
      toast.success('Tag added');
    } else {
      toast.error(result.error || 'Failed to add tag');
    }
  };

  const deleteTag = async (id) => {
    const res = await fetch(`/api/guild/${guildId}/tags/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      setTags(tags.filter(t => t.id !== id));
      toast.success('Tag deleted');
    } else {
      toast.error('Failed to delete tag');
    }
  };

  if (loading) return <div className="text-center mt-8">Loading tags...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to={`/servers/${guildId}`} style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TagsIcon size={28}/> Canned Responses (Tags)</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Create predefined answers that your staff can quickly send in tickets using the <code>/tag</code> command.</p>
      </div>

      <div className="glass-panel">
        <form onSubmit={addTag} className="flex gap-4 items-end" style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>Tag Name (Command trigger)</label>
            <input type="text" name="name" className="input" required placeholder="e.g. welcome" />
          </div>
          <div style={{ flex: '2 1 300px' }}>
            <label>Response Content</label>
            <textarea name="content" className="input" required placeholder="Hello! How can we help you today?" rows="2" style={{ resize: 'vertical' }}></textarea>
          </div>
          <div>
            <button type="submit" className="btn primary" style={{ height: '42px' }}><Plus size={18}/> Add Tag</button>
          </div>
        </form>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {tags.map(t => (
            <div key={t.id} style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <code style={{ fontSize: '1.1rem', color: 'var(--primary)', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>/tag {t.name}</code>
                  <button className="btn danger" style={{ padding: '0.3rem' }} onClick={() => deleteTag(t.id)} title="Delete Tag"><Trash size={14}/></button>
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.content}</p>
              </div>
            </div>
          ))}
        </div>
        {tags.length === 0 && (
          <div className="text-center" style={{ color: 'var(--text-secondary)', padding: '3rem' }}>
            No tags configured yet. Create one above!
          </div>
        )}
      </div>
    </div>
  );
}
