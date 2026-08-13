import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, Layers, ExternalLink } from 'lucide-react';
import { formatCurrency, formatNumber } from '../utils/formatters';

const CompanyDividendsModal = ({ ticker, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('logged');

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    fetch(`/api/dividends/company/${encodeURIComponent(ticker)}`)
      .then(res => res.json())
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(e => {
        console.error('Error fetching company dividend details:', e);
        setLoading(false);
      });
  }, [ticker]);

  const logged = data?.logged || [];
  const corporate = data?.corporate || [];

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '800px', width: '90%' }}>
        <div className="flex items-center justify-between pb-4 border-b border-glass mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-accent-subtle text-accent" style={{ backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '50%' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600 }}>{ticker} — Dividend & Scrip History</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Detailed log of received dividends and official corporate distribution events
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="skeleton" style={{ height: '120px', marginBottom: '16px' }}></div>
            <div className="skeleton" style={{ height: '200px' }}></div>
          </div>
        ) : (
          <div>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-4">
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Cash Received</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }} className="text-success">
                  {formatCurrency(data?.totalCash || 0)}
                </div>
              </div>
              <div className="glass-card p-4">
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Scrip Shares Received</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                  {formatNumber(data?.totalScripShares || 0, 0)} <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>shares</span>
                </div>
              </div>
              <div className="glass-card p-4">
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Logged Payout Events</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                  {logged.length}
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-glass mb-4">
              <button 
                className={`pb-2 px-1 text-sm font-medium ${activeTab === 'logged' ? 'border-b-2 border-accent text-accent' : 'text-secondary'}`}
                style={{ borderBottom: activeTab === 'logged' ? '2px solid var(--accent-primary)' : 'none', color: activeTab === 'logged' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                onClick={() => setActiveTab('logged')}
              >
                Logged Portfolio Dividends ({logged.length})
              </button>
              <button 
                className={`pb-2 px-1 text-sm font-medium ${activeTab === 'corporate' ? 'border-b-2 border-accent text-accent' : 'text-secondary'}`}
                style={{ borderBottom: activeTab === 'corporate' ? '2px solid var(--accent-primary)' : 'none', color: activeTab === 'corporate' ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                onClick={() => setActiveTab('corporate')}
              >
                Official Corporate History ({corporate.length})
              </button>
            </div>

            {activeTab === 'logged' ? (
              logged.length === 0 ? (
                <div className="p-6 text-center text-muted">
                  No dividend transactions recorded yet for {ticker}.
                </div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="data-table tabular-nums">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'right' }}>Shares Eligible</th>
                        <th style={{ textAlign: 'right' }}>Payout / Share</th>
                        <th style={{ textAlign: 'right' }}>Fee / Tax</th>
                        <th style={{ textAlign: 'right' }}>Net Payout</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logged.map((t) => {
                        const isScrip = t.event_type === 'STOCK_AS_DIVIDEND';
                        const netAmount = (t.quantity * t.price) - (t.fee_tax || 0);
                        return (
                          <tr key={t.id}>
                            <td style={{ fontSize: '13px' }}>{t.date}</td>
                            <td>
                              <span className="tag" style={{ 
                                backgroundColor: isScrip ? 'rgba(16, 185, 129, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                color: isScrip ? '#10b981' : '#6366f1',
                                fontSize: '11px' 
                              }}>
                                {isScrip ? 'Scrip Stock' : 'Cash Dividend'}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{formatNumber(t.quantity, 2)}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(t.price, t.currency)}</td>
                            <td style={{ textAlign: 'right' }}>{t.fee_tax > 0 ? formatCurrency(t.fee_tax, t.currency) : '-'}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }} className={isScrip ? '' : 'text-success'}>
                              {isScrip ? `${t.quantity} new shares` : formatCurrency(netAmount, t.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              corporate.length === 0 ? (
                <div className="p-6 text-center text-muted">
                  No corporate distribution records found for symbol {ticker}.
                </div>
              ) : (
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  <table className="data-table tabular-nums">
                    <thead>
                      <tr>
                        <th>Ex-Date</th>
                        <th>Payment Date</th>
                        <th style={{ textAlign: 'right' }}>Amount / Share</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corporate.map((c, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: '13px' }}>{c.exDate || '-'}</td>
                          <td style={{ fontSize: '13px' }}>{c.paymentDate || '-'}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(c.amount, c.currency)}</td>
                          <td>
                            <span className="tag" style={{ fontSize: '10px' }}>{c.source}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        )}

        <div className="flex justify-end mt-6 pt-4 border-t border-glass">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyDividendsModal;
