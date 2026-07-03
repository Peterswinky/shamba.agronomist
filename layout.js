'use client';
import { useState } from 'react';
import { api } from '../lib/api';

export default function DiseaseChecker() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [targetType, setTargetType] = useState('leaf');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  async function submit() {
    if (!file) return setError('Please select or capture a photo first');
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('targetType', targetType);
      const r = await api.diseaseCheck(formData);
      setResult(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 560, margin: '40px auto', padding: 24 }}>
      <h1 style={{ color: '#2e6b34' }}>🔬 Disease Checker</h1>
      <p style={{ color: '#666' }}>Take or upload a photo of a leaf or soil sample.</p>

      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {['leaf', 'soil'].map((t) => (
          <button key={t} onClick={() => setTargetType(t)}
            style={{ padding: '8px 16px', borderRadius: 20, border: '1px solid #2e6b34',
              background: targetType === t ? '#2e6b34' : '#fff', color: targetType === t ? '#fff' : '#2e6b34', cursor: 'pointer' }}>
            {t === 'leaf' ? 'Leaf' : 'Soil'}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', padding: 20, borderRadius: 12 }}>
        <input type="file" accept="image/*" capture="environment" onChange={onFileChange} />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="preview" style={{ width: '100%', marginTop: 12, borderRadius: 8, maxHeight: 300, objectFit: 'cover' }} />
        )}
        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        <button onClick={submit} disabled={loading}
          style={{ marginTop: 12, padding: 12, width: '100%', borderRadius: 8, border: 'none', background: '#2e6b34', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {loading ? 'Analyzing…' : 'Analyze Photo'}
        </button>
      </div>

      {result && (
        <div style={{ background: '#fff', padding: 16, borderRadius: 10, marginTop: 16 }}>
          <h3 style={{ color: '#2e6b34', margin: '0 0 6px' }}>{result.diagnosis}</h3>
          <p style={{ margin: 0, color: '#888', fontSize: 13 }}>Confidence: {(result.confidence * 100).toFixed(0)}%</p>
          <p style={{ marginTop: 10 }}>{result.advice}</p>
        </div>
      )}
    </div>
  );
}
