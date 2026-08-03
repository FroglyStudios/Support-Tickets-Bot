import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Eye, FileText, Calendar, Clock, Download, Trash } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Transcripts() {
  const { guildId } = useParams();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guild/${guildId}/tickets`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTickets(data);
        setLoading(false);
      })
      .catch(err => {
        toast.error('Failed to load tickets');
        setLoading(false);
      });
  }, [guildId]);

  const openTranscript = async (ticket) => {
    setSelectedTicket(ticket);
    const res = await fetch(`/api/guild/${guildId}/tickets/${ticket.ticket_id}/transcript`, { credentials: 'include' });
    const data = await res.json();
    if (data.messages) {
      setTranscript(data.messages);
    } else {
      toast.error('Failed to load transcript');
    }
  };

  const deleteTranscript = async (ticketId) => {
    if (!window.confirm('Are you sure you want to delete this transcript?')) return;
    const res = await fetch(`/api/guild/${guildId}/tickets/${ticketId}/transcript`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (res.ok) {
      toast.success('Transcript deleted');
      setTickets(tickets.filter(t => t.ticket_id !== ticketId));
      if (selectedTicket?.ticket_id === ticketId) {
        setSelectedTicket(null);
        setTranscript(null);
      }
    } else {
      toast.error('Failed to delete transcript');
    }
  };

  const downloadTranscript = () => {
    if (!transcript || !selectedTicket) return;
    let content = `Transcript for Ticket #${selectedTicket.ticket_id}\nCategory: ${selectedTicket.category_name || 'None'}\nCreated: ${new Date(selectedTicket.created_at).toLocaleString()}\n\n`;
    transcript.forEach(msg => {
      content += `[${new Date(msg.created_at).toLocaleString()}] ${msg.author_username}${msg.is_bot ? ' [BOT]' : ''}: ${msg.content}\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${selectedTicket.ticket_id}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
        <div>
          <Link to="/servers" style={{ fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>&larr; Back to Servers</Link>
          <h1 style={{ margin: 0 }}>Ticket Transcripts</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div className="glass-panel" style={{ flex: 1, minWidth: '350px' }}>
          <h3>All Tickets</h3>
          {loading ? (
            <p>Loading tickets...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tickets.map(t => (
                <div 
                  key={t.ticket_id} 
                  style={{ 
                    padding: '1rem', 
                    background: selectedTicket?.ticket_id === t.ticket_id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', 
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onClick={() => openTranscript(t)}
                >
                  <div>
                    <strong style={{ display: 'block' }}>Ticket #{t.ticket_id}</strong>
                    <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                      {t.category_name || 'No Category'} &bull; {t.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}><Calendar size={12}/> {new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {tickets.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No tickets found for this server.</p>}
            </div>
          )}
        </div>

        {selectedTicket && transcript && (
          <div className="glass-panel" style={{ flex: 2 }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3>Transcript: Ticket #{selectedTicket.ticket_id}</h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', opacity: 0.8 }}>
                  <span><FileText size={14}/> {selectedTicket.category_name || 'No Category'}</span>
                  <span>User ID: <code>{selectedTicket.user_id}</code></span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={downloadTranscript}>
                  <Download size={14} /> Download
                </button>
                <button className="btn danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={() => deleteTranscript(selectedTicket.ticket_id)}>
                  <Trash size={14} /> Delete
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto', paddingRight: '1rem' }}>
              {transcript.map(msg => (
                <div key={msg.id} style={{ display: 'flex', gap: '1rem' }}>
                  <img 
                    src={msg.author_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                    alt="avatar" 
                    style={{ width: '40px', height: '40px', borderRadius: '50%' }} 
                  />
                  <div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <strong style={{ color: msg.is_bot ? 'var(--primary)' : 'inherit' }}>{msg.author_username}</strong>
                      {msg.is_bot === 1 && <span style={{ fontSize: '0.65rem', background: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Bot</span>}
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', borderTopLeftRadius: 0 }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {transcript.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No messages recorded for this ticket.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
