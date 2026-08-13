import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, RefreshCw, Download, Sparkles } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

const MissingDividendsModal = ({ onClose, onImportSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [items, setItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchMissing = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dividends/missing');
      const json = await res.json();
      setData(json);
      const list = json.missingDividends || [];
      setItems(list);
      // Select all by default
      setSelectedIds(new Set(list.map(i => i.id)));
    } catch (e) {
      console.error('Error fetching missing dividends:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissing();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleTaxChange = (id, taxPct) => {
    const val = parseFloat(taxPct) || 0;
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const gross = item.gross_amount;
        const estTax = Math.round(gross * (val / 100) * 100) / 100;
        const estNet = Math.round((gross - estTax) * 100) / 100;
        return {
          ...item,
          default_tax_pct: val,
          estimated_tax: estTax,
          estimated_net: estNet
        };
      }
      return item;
    }));
  };

  const handleEventTypeChange = (id, type) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, event_type: type } : item));
  };

  const handleImport = async () => {
    const selectedItems = items.filter(i => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    setImporting(true);
    try {
      const res = await fetch('/api/dividends/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMessage(`Successfully imported ${json.importedCount} dividend transactions!`);
        setTimeout(() => {
          if (onImportSuccess) onImportSuccess();
          onClose();
        }, 1500);
      } else {
        alert(`Failed to import dividends: ${json.error}`);
      }
    } catch (e) {
      console.error('Import error:', e);
      alert(`Error importing dividends: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = selectedIds.size;
  const totalEstNet = items
    .filter(i => selectedIds.has(i.id))
    .reduce((sum, i) => sum + (i.estimated_net || 0), 0);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '850px', width: '90%' }}>
        <div className="flex items-center justify-between pb-4 border-b border-glass mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-accent" size={24} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Auto-Detect Missing Dividends</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Cross-references corporate ex-dates against your holdings timeline to find unlogged payouts.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {successMessage ? (
          <div className="p-8 text-center flex-col items-center gap-3">
            <CheckCircle2 size={48} className="text-success" />
            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{successMessage}</h3>
          </div>
        ) : loading ? (
          <div className="p-8 text-center flex-col items-center gap-3">
            <RefreshCw size={32} className="animate-spin text-accent" style={{ animation: 'spin 1s linear infinite' }} />
            <p>Scanning corporate distribution history across your active portfolio holdings...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center flex-col items-center gap-3">
            <CheckCircle2 size={40} className="text-success" />
            <h3>No Missing Dividends Detected!</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              All historical corporate dividends since your purchase dates appear to be logged in your transaction history.
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4 bg-tertiary p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  checked={selectedCount === items.length} 
                  onChange={toggleSelectAll} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  Selected {selectedCount} of {items.length} detected events
                </span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600 }} className="text-success">
                Est. Total Payout: {formatCurrency(totalEstNet)}
              </div>
            </div>

            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
              <table className="data-table tabular-nums">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}></th>
                    <th>Date</th>
                    <th>Stock</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Shares Held</th>
                    <th style={{ textAlign: 'right' }}>Div / Share</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>Tax %</th>
                    <th style={{ textAlign: 'right' }}>Net Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} style={{ opacity: selectedIds.has(item.id) ? 1 : 0.6 }}>
                      <td>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(item.id)} 
                          onChange={() => toggleSelect(item.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                      <td style={{ fontSize: '13px' }}>{item.payment_date}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{item.ticker}</span>
                      </td>
                      <td>
                        <select 
                          className="form-input" 
                          style={{ padding: '2px 6px', fontSize: '12px' }}
                          value={item.event_type}
                          onChange={(e) => handleEventTypeChange(item.id, e.target.value)}
                        >
                          <option value="DIVIDEND">Cash Div</option>
                          <option value="STOCK_AS_DIVIDEND">Scrip Stock</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatNumber(item.shares_held, 2)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.dividend_per_share, item.currency)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.gross_amount, item.currency)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <input 
                          type="number" 
                          className="form-input" 
                          style={{ width: '60px', padding: '2px 4px', textAlign: 'center', fontSize: '12px' }}
                          value={item.default_tax_pct}
                          onChange={(e) => handleTaxChange(item.id, e.target.value)}
                          min="0"
                          max="100"
                        />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="text-success">
                        {formatCurrency(item.estimated_net, item.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-glass">
              <button className="btn btn-secondary" onClick={onClose} disabled={importing}>
                Cancel
              </button>
              <button 
                className="btn btn-primary flex items-center gap-2" 
                onClick={handleImport} 
                disabled={selectedCount === 0 || importing}
              >
                <Download size={18} />
                <span>{importing ? 'Importing...' : `Import Selected Dividends (${selectedCount})`}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MissingDividendsModal;
