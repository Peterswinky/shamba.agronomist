'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, getUser } from '../lib/api';

export default function Marketplace() {
  const router = useRouter();
  const [user, setUserState] = useState(null);
  const [listings, setListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [filters, setFilters] = useState({ crop: '', county: '' });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    cropName: '', quantityKg: '', pricePerKg: '', location: '', county: '', contactPhone: '',
  });

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push('/'); return; }
    setUserState(u);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadListings();
    if (user.role === 'FARMER') loadMine();
  }, [user]);

  async function loadListings() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.crop) params.set('crop', filters.crop);
      if (filters.county) params.set('county', filters.county);
      const q = params.toString();
      const r = await api.listings(q ? `?${q}` : '');
      setListings(r.listings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMine() {
    try {
      const r = await api.myListings();
      setMyListings(r.listings);
    } catch (err) {
      setError(err.message);
    }
  }

  function updateForm(k) {
    return (e) => setForm({ ...form, [k]: e.target.value });
  }

  async function submitListing(e) {
    e.preventDefault();
    setError('');
    try {
      await api.createListing({
        ...form,
        quantityKg: Number(form.quantityKg),
        pricePerKg: Number(form.pricePerKg),
      });
      setForm({ cropName: '', quantityKg: '', pricePerKg: '', location: '', county: '', contactPhone: '' });
      setShowForm(false);
      loadListings();
      loadMine();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markSold(id) {
    try {
      await api.updateListingStatus(id, 'SOLD');
      loadMine();
      loadListings();
    } catch (err) {
      setError(err.message);
    }
  }

  async function boostListing(id) {
    try {
      const r = await api.boostListing(id);
      alert(r.message || 'Payment prompt sent to your phone. Enter your M-Pesa PIN to complete.');
      loadMine();
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendInquiry(id) {
    try {
      await api.inquire(id, 'I am interested in this listing.');
      alert('Inquiry sent! The farmer will see your contact details.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/dashboard" style={{ color: '#2e6b34', fontSize: 14 }}>&larr; Dashboard</Link>
          <h1 style={{ color: '#2e6b34', margin: '4px 0' }}>🛒 Marketplace</h1>
        </div>
        {user.role === 'FARMER' && (
          <button onClick={() => setShowForm((s) => !s)} style={primaryBtn}>
            {showForm ? 'Cancel' : '+ New Listing'}
          </button>
        )}
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {user.role === 'FARMER' && showForm && (
        <form onSubmit={submitListing} style={card}>
          <h3 style={{ marginTop: 0, color: '#2e6b34' }}>List your produce</h3>
          <div style={grid2}>
            <input placeholder="Crop e.g. Maize" value={form.cropName} onChange={updateForm('cropName')} required style={inputStyle} />
            <input placeholder="Quantity (kg)" type="number" min="1" value={form.quantityKg} onChange={updateForm('quantityKg')} required style={inputStyle} />
            <input placeholder="Price per kg (KES)" type="number" min="1" value={form.pricePerKg} onChange={updateForm('pricePerKg')} required style={inputStyle} />
            <input placeholder="Contact phone" value={form.contactPhone} onChange={updateForm('contactPhone')} required style={inputStyle} />
            <input placeholder="Location (e.g. Ndeiya)" value={form.location} onChange={updateForm('location')} required style={inputStyle} />
            <input placeholder="County" value={form.county} onChange={updateForm('county')} required style={inputStyle} />
          </div>
          <button style={{ ...primaryBtn, marginTop: 10 }}>Publish Listing</button>
        </form>
      )}

      {user.role === 'FARMER' && myListings.length > 0 && (
        <>
          <h3 style={{ color: '#2e6b34', marginTop: 28 }}>My Listings</h3>
          {myListings.map((l) => {
            const isBoosted = l.boostedUntil && new Date(l.boostedUntil) > new Date();
            return (
              <div key={l.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{l.cropName} {isBoosted && <span title="Boosted">🚀</span>}</strong>
                  <span style={statusBadge(l.status)}>{l.status}</span>
                </div>
                <p style={meta}>{l.quantityKg} kg &middot; KES {l.pricePerKg}/kg &middot; {l.location}, {l.county}</p>
                {isBoosted && (
                  <p style={{ ...meta, color: '#2e6b34', fontWeight: 600 }}>
                    Boosted until {new Date(l.boostedUntil).toLocaleDateString('en-KE')}
                  </p>
                )}
                {l.inquiries?.length > 0 && (
                  <div style={{ background: '#f4f7f2', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#2e6b34' }}>
                      {l.inquiries.length} inquirie(s)
                    </p>
                    {l.inquiries.map((iq) => (
                      <p key={iq.id} style={{ margin: '4px 0', fontSize: 13 }}>
                        {iq.buyer.name} — {iq.buyer.phone}
                      </p>
                    ))}
                  </div>
                )}
                {l.status === 'ACTIVE' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => markSold(l.id)} style={smallBtn}>Mark as Sold</button>
                    {!isBoosted && (
                      <button onClick={() => boostListing(l.id)} style={{ ...smallBtn, background: '#e08e0b' }}>
                        🚀 Boost (KES 20)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <h3 style={{ color: '#2e6b34', marginTop: 28 }}>Browse Listings</h3>
      <div style={grid2}>
        <input placeholder="Filter by crop" value={filters.crop} onChange={(e) => setFilters({ ...filters, crop: e.target.value })} style={inputStyle} />
        <input placeholder="Filter by county" value={filters.county} onChange={(e) => setFilters({ ...filters, county: e.target.value })} style={inputStyle} />
      </div>
      <button onClick={loadListings} style={{ ...smallBtn, marginTop: 8 }}>Search</button>

      {loading ? (
        <p>Loading…</p>
      ) : listings.length === 0 ? (
        <p style={{ color: '#666' }}>No listings found.</p>
      ) : (
        listings.map((l) => (
          <div key={l.id} style={card}>
            <strong>{l.cropName}</strong>
            <p style={meta}>{l.quantityKg} kg available &middot; KES {l.pricePerKg}/kg</p>
            <p style={meta}>📍 {l.location}, {l.county}</p>
            <p style={meta}>Farmer: {l.farmer.name} &middot; {l.farmer.county}</p>
            {user.role === 'BUYER' && (
              <button onClick={() => sendInquiry(l.id)} style={smallBtn}>Contact Farmer</button>
            )}
          </div>
        ))
      )}
    </div>
  );
}

const card = { background: '#fff', padding: 16, borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 12 };
const grid2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 };
const inputStyle = { padding: 10, borderRadius: 8, border: '1px solid #ccc', fontSize: 15 };
const primaryBtn = { padding: '10px 16px', borderRadius: 8, border: 'none', background: '#2e6b34', color: '#fff', fontWeight: 600, cursor: 'pointer' };
const smallBtn = { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2e6b34', color: '#fff', fontSize: 13, cursor: 'pointer', marginTop: 8 };
const meta = { margin: '4px 0', color: '#666', fontSize: 14 };
const statusBadge = (status) => ({
  fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
  background: status === 'ACTIVE' ? '#e3f3e3' : '#eee',
  color: status === 'ACTIVE' ? '#2e6b34' : '#777',
});
