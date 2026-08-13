import { useState } from 'react';
import { X } from 'lucide-react';

const CATEGORIES = [
  'Technology',
  'Financials',
  'Insurance',
  'Healthcare',
  'Consumer Staples',
  'Consumer Discretionary',
  'Energy',
  'Industrials',
  'Utilities',
  'Real Estate',
  'Communication Services',
  'Materials'
];

const TransactionModal = ({ onClose, onSave, transaction = null }) => {
  const [formData, setFormData] = useState({
    event_type: transaction?.event_type || 'BUY',
    ticker: transaction?.ticker || '',
    date: transaction?.date || new Date().toISOString().split('T')[0],
    quantity: transaction?.quantity || '',
    price: transaction?.price || '',
    currency: transaction?.currency || 'EUR',
    exchange: transaction?.exchange || 'MC',
    fees: transaction?.fees || 0,
    sector: transaction?.sector || '',
    notes: transaction?.notes || ''
  });

  const [isCustomSector, setIsCustomSector] = useState(
    Boolean(transaction?.sector && !CATEGORIES.includes(transaction.sector))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const url = transaction 
        ? `/api/transactions/${transaction.id}`
        : '/api/transactions';
        
      const response = await fetch(url, {
        method: transaction ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
          fees: Number(formData.fees)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save transaction');
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        <div className="flex justify-between items-center mb-6">
          <h2 className="page-title" style={{ fontSize: '20px' }}>
            {transaction ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button className="btn" onClick={onClose} style={{ padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {error && <div className="mb-4 text-center profit-negative">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group mb-6">
            <div className="flex gap-2 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
              {['BUY', 'SELL', 'DIVIDEND'].map(type => (
                <button
                  key={type}
                  type="button"
                  className="btn"
                  style={{ 
                    flex: 1, 
                    backgroundColor: formData.event_type === type ? 'var(--accent-blue)' : 'transparent',
                    color: formData.event_type === type ? '#fff' : 'var(--text-secondary)'
                  }}
                  onClick={() => setFormData(prev => ({ ...prev, event_type: type }))}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ticker</label>
              <input 
                type="text" 
                name="ticker" 
                value={formData.ticker} 
                onChange={handleChange}
                className="form-input" 
                required 
                placeholder="e.g. AAPL"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input 
                type="date" 
                name="date" 
                value={formData.date} 
                onChange={handleChange}
                className="form-input" 
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input 
                type="number" 
                step="any"
                name="quantity" 
                value={formData.quantity} 
                onChange={handleChange}
                className="form-input" 
                required 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Price per share</label>
              <input 
                type="number" 
                step="any"
                name="price" 
                value={formData.price} 
                onChange={handleChange}
                className="form-input" 
                required 
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange} className="form-select">
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Exchange</label>
              <select name="exchange" value={formData.exchange} onChange={handleChange} className="form-select">
                <option value="MC">MC</option>
                <option value="NYSE">NYSE</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="LSE">LSE</option>
                <option value="F">F</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fees / Tax</label>
              <input 
                type="number" 
                step="any"
                name="fees" 
                value={formData.fees} 
                onChange={handleChange}
                className="form-input" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sector / Category</label>
              {!isCustomSector ? (
                <select 
                  name="sector" 
                  value={formData.sector} 
                  onChange={(e) => {
                    if (e.target.value === 'CUSTOM') {
                      setIsCustomSector(true);
                      setFormData(prev => ({ ...prev, sector: '' }));
                    } else {
                      setIsCustomSector(false);
                      handleChange(e);
                    }
                  }} 
                  className="form-select"
                >
                  <option value="">-- Select Category --</option>
                  {['Technology', 'Financials', 'Insurance', 'Healthcare', 'Consumer Staples', 'Consumer Discretionary', 'Energy', 'Industrials', 'Utilities', 'Real Estate', 'Communication Services', 'Materials'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="CUSTOM">+ Custom Category...</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    name="sector" 
                    value={formData.sector} 
                    onChange={handleChange}
                    className="form-input" 
                    placeholder="Enter custom category..."
                    autoFocus
                  />
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    style={{ padding: '4px 8px', fontSize: '12px' }}
                    onClick={() => setIsCustomSector(false)}
                  >
                    List
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group mb-6">
            <label className="form-label">Notes</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleChange}
              className="form-textarea" 
            />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
