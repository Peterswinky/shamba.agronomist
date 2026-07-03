'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '../lib/api';

const ACTION_LABELS = {
  SOIL_CHECK: { icon: '🌱', label: 'Soil Advice Requested' },
  DISEASE_CHECK: { icon: '🔬', label: 'Disease Check Performed' },
  LISTING_CREATED: { icon: '🛒', label: 'Listing Created' },
  INQUIRY_SENT: { icon: '📩', label: 'Inquiry Sent' },
  LOGIN: { icon: '🔑', label: 'Logged In' },
  REGISTER: { icon: '✅', label: 'Account Created' },
  PAYMENT_COMPLETED: { icon: '🚀', label: 'Listing Boost Paid' },
};

export default function History() {
  const router = useRouter();
  const [user, setUserState] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/'); return; }
    setUserState(u);
    api.history()
      .then((r) => setHistory(r.history))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
      <Link href="/dashboard" style={{ color: '#2e6b34', fontSize: 14 }}>&larr; Dashboard</Link>
      <h1 style={{ color: '#2e6b34', margin: '4px 0 20px' }}>📜 Activity History</h1>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {loading && <p>Loading…</p>}
      {!loading && history.length === 0 && <p style={{ color: '#666' }}>No activity yet.</p>}

      {history.map((h) => {
        const meta = ACTION_LABELS[h.action] || { icon: '•', label: h.action };
        return (
          <div key={h.id} style={{ background: '#fff', padding: 14, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22 }}>{meta.icon}</span>
            <div>
              <strong>{meta.label}</strong>
              <p style={{ margin: '2px 0', color: '#666', fontSize: 13 }}>
                {new Date(h.createdAt).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              {h.metadata && (
                <pre style={{ margin: 0, fontSize: 12, color: '#888', whiteSpace: 'pre-wrap' }}>
                  {Object.entries(h.metadata).map(([k, v]) => `${k}: ${v}`).join('  ')}
                </pre>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
