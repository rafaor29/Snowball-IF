import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import DataTable from '../components/DataTable';
import { formatCurrency, formatPercent, getSmaSignalColor } from '../utils/formatters';

const FindTheDip = () => {
  const { data: dipsRes, loading } = useApi('/api/portfolio/dips');
  const dips = Array.isArray(dipsRes) ? dipsRes : [];
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, BELOW_200, BELOW_50
  const [threshold, setThreshold] = useState(0);

  const getFilteredDips = () => {
    if (!dips || dips.length === 0) return [];
    
    return dips.filter(dip => {
      // Threshold filter
      const minDev = Math.min(
        dip.vs_10d ?? 0, 
        dip.vs_50d ?? 0, 
        dip.vs_100d ?? 0, 
        dip.vs_200d ?? 0
      );
      
      if (minDev > -threshold) return false;
      
      // Mode filter
      if (filterMode === 'BELOW_200' && (dip.vs_200d === null || dip.vs_200d >= 0)) return false;
      if (filterMode === 'BELOW_50' && (dip.vs_50d === null || dip.vs_50d >= 0)) return false;
      
      return true;
    });
  };

  const getSignalDots = (row) => {
    const counts = row.below_count !== undefined ? row.below_count : [row.vs_10d, row.vs_50d, row.vs_100d, row.vs_200d].filter(v => v !== null && v < 0).length;
    
    let color = 'var(--accent-green)';
    let label = 'Strong';
    
    if (counts === 4) { color = '#ef4444'; label = 'Deep Dip'; }
    else if (counts >= 2) { color = '#fb923c'; label = 'Warning'; }
    else if (counts === 1) { color = '#facc15'; label = 'Slight Dip'; }
    
    return (
      <div className="flex items-center gap-2">
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color }}></div>
        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
    );
  };

  const DeviationCell = ({ value }) => {
    if (value === null || value === undefined) return <span>-</span>;
    
    const color = getSmaSignalColor(value);
    return (
      <div 
        style={{ 
          color: value < 0 ? '#000' : 'var(--text-primary)',
          backgroundColor: value < 0 ? color : 'transparent',
          padding: '4px 8px',
          borderRadius: '4px',
          display: 'inline-block',
          fontWeight: value < 0 ? 600 : 400
        }}
      >
        {formatPercent(value)}
      </div>
    );
  };

  const columns = [
    {
      key: 'ticker',
      label: 'Stock',
      format: (val, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{val}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{row.name}</div>
        </div>
      )
    },
    {
      key: 'current_price',
      label: 'Price',
      align: 'right',
      format: (val, row) => formatCurrency(val, row.currency)
    },
    {
      key: 'sma_10',
      label: '10D SMA',
      align: 'right',
      format: (val, row) => val ? formatCurrency(val, row.currency) : '-'
    },
    {
      key: 'vs_10d',
      label: 'vs 10D',
      align: 'right',
      format: (val) => <DeviationCell value={val} />
    },
    {
      key: 'sma_50',
      label: '50D SMA',
      align: 'right',
      format: (val, row) => val ? formatCurrency(val, row.currency) : '-'
    },
    {
      key: 'vs_50d',
      label: 'vs 50D',
      align: 'right',
      format: (val) => <DeviationCell value={val} />
    },
    {
      key: 'sma_100',
      label: '100D SMA',
      align: 'right',
      format: (val, row) => val ? formatCurrency(val, row.currency) : '-'
    },
    {
      key: 'vs_100d',
      label: 'vs 100D',
      align: 'right',
      format: (val) => <DeviationCell value={val} />
    },
    {
      key: 'sma_200',
      label: '200D SMA',
      align: 'right',
      format: (val, row) => val ? formatCurrency(val, row.currency) : '-'
    },
    {
      key: 'vs_200d',
      label: 'vs 200D',
      align: 'right',
      format: (val) => <DeviationCell value={val} />
    },
    {
      key: 'signal',
      label: 'Signal',
      sortable: false,
      format: (_, row) => getSignalDots(row)
    }
  ];

  const filteredData = getFilteredDips();
  
  // Default sort by vs_200d
  filteredData.sort((a, b) => {
    if (a.vs_200d === null) return 1;
    if (b.vs_200d === null) return -1;
    return a.vs_200d - b.vs_200d;
  });

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Find the Dip</h1>
          <p className="page-subtitle">Portfolio holdings trading below their moving averages</p>
        </div>
      </div>

      <div className="glass-card mb-6 flex items-center justify-between">
        <div className="flex gap-2 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
          <button 
            className={`btn ${filterMode === 'ALL' ? 'btn-primary' : ''}`} 
            onClick={() => setFilterMode('ALL')}
            style={{ padding: '6px 12px' }}
          >
            All
          </button>
          <button 
            className={`btn ${filterMode === 'BELOW_50' ? 'btn-primary' : ''}`} 
            onClick={() => setFilterMode('BELOW_50')}
            style={{ padding: '6px 12px' }}
          >
            Below 50D
          </button>
          <button 
            className={`btn ${filterMode === 'BELOW_200' ? 'btn-primary' : ''}`} 
            onClick={() => setFilterMode('BELOW_200')}
            style={{ padding: '6px 12px' }}
          >
            Below 200D
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-secondary text-sm">Threshold %:</span>
          <input 
            type="number" 
            min="0" 
            max="100" 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="form-input"
            style={{ width: '80px', padding: '6px 10px' }}
          />
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={filteredData} 
        loading={loading}
        emptyMessage="No dips found matching your criteria."
      />
    </div>
  );
};

export default FindTheDip;
