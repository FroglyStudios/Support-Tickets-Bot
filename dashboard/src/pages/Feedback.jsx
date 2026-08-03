import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Trash } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Feedback() {
  const { guildId } = useParams();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guild/${guildId}/feedback`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFeedback(data);
        setLoading(false);
      });
  }, [guildId]);

  const deleteFeedback = async (id) => {
    const res = await fetch(`/api/guild/${guildId}/feedback/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      setFeedback(feedback.filter(f => f.id !== id));
      toast.success('Feedback deleted');
    } else {
      toast.error('Failed to delete feedback');
    }
  };

  if (loading) return <div className="text-center mt-8">Loading feedback...</div>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link to={`/servers/${guildId}`} style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Dashboard</Link>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Star size={28}/> User Feedback</h1>
        <p style={{ color: 'var(--text-secondary)' }}>View ratings and comments left by users after their ticket was closed.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {feedback.map(f => (
          <div key={f.id} className="glass-panel" style={{ display: 'flex', gap: '1.5rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '80px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{f.stars}/5</div>
              <div style={{ display: 'flex', gap: '2px', color: '#f59e0b' }}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < f.stars ? '#f59e0b' : 'transparent'} stroke={i < f.stars ? '#f59e0b' : 'var(--text-secondary)'} />
                ))}
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                <strong>User:</strong> {f.user_id ? `<@${f.user_id}> (${f.user_id})` : 'Anonymous'} &bull; 
                <span style={{ marginLeft: '0.5rem' }}>{new Date(f.created_at).toLocaleString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'pre-wrap' }}>
                {f.comment || <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No comment provided.</span>}
              </p>
            </div>
            
            <div>
              <button className="btn danger" style={{ padding: '0.5rem' }} onClick={() => deleteFeedback(f.id)} title="Delete Feedback">
                <Trash size={18} />
              </button>
            </div>
          </div>
        ))}
        
        {feedback.length === 0 && (
          <div className="glass-panel text-center" style={{ padding: '4rem', color: 'var(--text-secondary)' }}>
            <Star size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            No feedback received yet.
          </div>
        )}
      </div>
    </div>
  );
}
