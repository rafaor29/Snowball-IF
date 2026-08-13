import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import DataTable from '../components/DataTable';
import MissingDividendsModal from '../components/MissingDividendsModal';
import CompanyDividendsModal from '../components/CompanyDividendsModal';
import { formatCurrency, formatPercent, formatNumber, getColorClass } from '../utils/formatters';
import { Plus, RefreshCw, Search, Sparkles } from 'lucide-react';

const ELIGIBLE_SECTORS = [
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

const SectorCell = ({ value, row, onUpdate }) => {
  const [saving, setSaving] = useState(false);

  const currentSector = value || '';
  const isStandard = ELIGIBLE_SECTORS.includes(currentSector);

  const handleSelectChange = async (e) => {
    e.stopPropagation();
    let selected = e.target.value;
    if (selected === 'CUSTOM') {
      const custom = window.prompt(`Enter custom category for ${row.ticker}:`, currentSector !== 'Unknown' ? currentSector : '');
      if (!custom || !custom.trim()) return;
      selected = custom.trim();
    }
    if (selected === currentSector) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/portfolio/holdings/${encodeURIComponent(row.ticker)}/sector`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sector: selected })
      });
      if (res.ok && onUpdate) {
        onUpdate();
      }
    } catch (err) {
      console.error('Failed to update sector:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: 'inline-block' }}>
      <select 
        value={isStandard ? currentSector : (currentSector && currentSector !== 'Unknown' ? currentSector : '')} 
        onChange={handleSelectChange}
        disabled={saving}
        className="form-select"
        style={{ 
          fontSize: '11px', 
          padding: '4px 8px', 
          height: 'auto',
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 500
        }}
      >
        <option value="" disabled>-- Select Sector --</option>
        {!isStandard && currentSector && currentSector !== 'Unknown' && (
          <option value={currentSector}>{currentSector}</option>
        )}
        {ELIGIBLE_SECTORS.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
        <option value="CUSTOM">+ Custom Sector...</option>
      </select>
    </div>
  );
};

const Holdings = ({ onAddTransaction }) => {
  const { data: holdingsRes, loading, refetch } = useApi('/api/portfolio/holdings');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [selectedCompanyTicker, setSelectedCompanyTicker] = useState(null);
  const [refreshingPrices, setRefreshingPrices] = useState(false);

  const handleRefreshPrices = async () => {
    setRefreshingPrices(true);
    try {
      await fetch('/api/portfolio/refresh-prices', { method: 'POST' });
      await refetch();
    } catch (err) {
      console.error('Failed to refresh prices:', err);
    } finally {
      setRefreshingPrices(false);
    }
  };

  const holdingsList = holdingsRes?.holdings || [];

  const filteredHoldings = holdingsList.filter(h => 
    h.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (h.name && h.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (h.sector && h.sector.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const columns = [
    {
      key: 'ticker',
      label: 'Stock',
      format: (val, row) => (
        <div className="flex items-center gap-2" style={{ cursor: 'pointer' }} onClick={() => setSelectedCompanyTicker(row.ticker)}>
          <div>
            <div style={{ fontWeight: 600 }} className="text-accent-hover">{val}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.name || 'Unknown'}</div>
          </div>
          <span className="tag" style={{ fontSize: '10px' }}>{row.currency}</span>
        </div>
      )
    },
    {
      key: 'sector',
      label: 'Sector',
      format: (val, row) => (
        <SectorCell value={val} row={row} onUpdate={refetch} />
      )
    },
    {
      key: 'shares_held',
      label: 'Shares',
      align: 'right',
      format: (val) => formatNumber(val, 2)
    },
    {
      key: 'cost_basis_per_share',
      label: 'Avg Cost',
      align: 'right',
      format: (val, row) => formatCurrency(val, row.currency)
    },
    {
      key: 'cost_basis_eur',
      label: 'Cost Basis (€)',
      align: 'right',
      format: (val) => formatCurrency(val)
    },
    {
      key: 'current_price',
      label: 'Price',
      align: 'right',
      format: (val, row) => (
        <div>
          <div>{val > 0 ? formatCurrency(val, row.currency) : '-'}</div>
          {row.price_change_pct_1d !== undefined && row.price_change_pct_1d !== null && (
            <div className={getColorClass(row.price_change_pct_1d)} style={{ fontSize: '12px' }}>
              {formatPercent(row.price_change_pct_1d)}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'current_value_eur',
      label: 'Value (€)',
      align: 'right',
      format: (val) => <div style={{ fontWeight: 600 }}>{val > 0 ? formatCurrency(val) : '-'}</div>
    },
    {
      key: 'dividends_received_eur',
      label: 'Dividends Rec. (€)',
      align: 'right',
      format: (val, row) => (
        <button 
          className="btn-link" 
          onClick={(e) => { e.stopPropagation(); setSelectedCompanyTicker(row.ticker); }}
          title="Total net cash dividends collected to date for this holding (click to view payout history)"
          style={{ color: val > 0 ? 'var(--text-success)' : 'var(--text-secondary)', fontWeight: val > 0 ? 500 : 400 }}
        >
          {val > 0 ? formatCurrency(val) : '-'}
        </button>
      )
    },
    {
      key: 'dividend_yield',
      label: 'Yield %',
      align: 'right',
      format: (val) => val > 0 ? formatPercent(val) : '-'
    },
    {
      key: 'total_profit_eur',
      label: 'Profit (€)',
      align: 'right',
      format: (val, row) => (
        <div>
          <div className={getColorClass(val)} style={{ fontWeight: 600 }}>{formatCurrency(val)}</div>
          <div className={getColorClass(row.total_profit_pct)} style={{ fontSize: '12px' }}>
            {formatPercent(row.total_profit_pct)}
          </div>
        </div>
      )
    },
    {
      key: 'irr',
      label: 'IRR %',
      align: 'right',
      format: (val) => val !== null && val !== undefined ? <span className={getColorClass(val)}>{formatPercent(val)}</span> : '-'
    },
    {
      key: 'portfolio_share_pct',
      label: 'Weight %',
      align: 'right',
      format: (val) => (
        <div className="flex-col items-end">
          <div>{formatPercent(val)}</div>
          <div className="progress-bar-container mt-1" style={{ width: '60px' }}>
            <div className="progress-bar-fill" style={{ width: `${Math.min(val || 0, 100)}%` }}></div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Holdings</h1>
          <p className="page-subtitle">Portfolio composition, current market value, and dividend performance (Dividends Rec. = Total net cash dividends collected to date)</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn btn-secondary flex items-center gap-2" 
            onClick={handleRefreshPrices}
            disabled={refreshingPrices}
            title="Fetch live market prices for all portfolio holdings"
          >
            <RefreshCw size={18} className={refreshingPrices ? "animate-spin text-accent" : "text-accent"} />
            <span>{refreshingPrices ? "Updating Prices..." : "Update Prices"}</span>
          </button>
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setShowMissingModal(true)}>
            <Sparkles size={18} className="text-accent" />
            <span>Detect Missing Dividends</span>
          </button>
          <button className="btn btn-primary" onClick={onAddTransaction}>
            <Plus size={18} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      <div className="mb-6 relative" style={{ width: '300px' }}>
        <div className="absolute left-3 top-1/2" style={{ transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
          <Search size={18} />
        </div>
        <input 
          type="text" 
          placeholder="Search by ticker or name..." 
          className="form-input"
          style={{ paddingLeft: '36px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <DataTable 
        columns={columns} 
        data={filteredHoldings} 
        loading={loading}
        onRowClick={(row) => setSelectedCompanyTicker(row.ticker)}
        emptyMessage={searchTerm ? "No holdings found matching your search." : "No holdings to display. Add your first transaction."}
      />

      {showMissingModal && (
        <MissingDividendsModal 
          onClose={() => setShowMissingModal(false)}
          onImportSuccess={() => refetch()}
        />
      )}

      {selectedCompanyTicker && (
        <CompanyDividendsModal 
          ticker={selectedCompanyTicker}
          onClose={() => setSelectedCompanyTicker(null)}
        />
      )}
    </div>
  );
};

export default Holdings;

