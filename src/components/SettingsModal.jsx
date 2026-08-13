import { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle } from 'lucide-react';

const SettingsModal = ({ onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        setHasExistingKey(data.hasApiKey);
        if (data.apiKeyMasked) setMaskedKey(data.apiKeyMasked);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() })
      });
      const data = await res.json();
      if (data.status === 'saved') {
        setMessage({ type: 'success', text: 'API key saved successfully! Market data cache cleared.' });
        setTimeout(() => {
          if (onSave) onSave();
          onClose();
        }, 1200);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Key className="text-blue-500" size={24} />
            <h2 className="text-xl font-bold">API Settings</h2>
          </div>
          <button className="btn-outline" style={{ padding: '4px', border: 'none' }} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="form-group mb-4">
            <label className="form-label">
              Financial Modeling Prep (FMP) API Key
            </label>
            <p className="text-secondary text-xs mb-3">
              FMP provides live stock quotes, dividend histories, moving averages (SMAs), and sector classifications. Get a free key (250 req/day) at{' '}
              <a href="https://site.financialmodelingprep.com/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>
                financialmodelingprep.com
              </a>.
            </p>

            {hasExistingKey && !apiKey && (
              <div className="badge badge-green mb-3 flex items-center gap-1" style={{ display: 'inline-flex' }}>
                <Check size={12} /> Active Key Configured ({maskedKey})
              </div>
            )}

            <input
              type="password"
              className="form-input"
              placeholder={hasExistingKey ? "Enter new API key to replace current key..." : "Paste your FMP API key here..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required={!hasExistingKey}
            />
          </div>

          {message && (
            <div className={`p-3 mb-4 rounded flex items-center gap-2 text-sm ${message.type === 'success' ? 'badge-green' : 'badge-red'}`}>
              {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save API Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
