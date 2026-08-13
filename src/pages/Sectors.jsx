import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  PieChart, 
  Pie, 
  Treemap 
} from 'recharts';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import { 
  ChevronDown, 
  ChevronRight, 
  Briefcase, 
  BarChart2, 
  PieChart as PieIcon, 
  LayoutGrid, 
  TrendingUp, 
  DollarSign, 
  Percent 
} from 'lucide-react';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#14b8a6', 
  '#f97316', '#a855f7'
];

const getPerformanceColor = (perf) => {
  const val = Number(perf) || 0;
  if (val >= 25) return '#059669';
  if (val >= 10) return '#10b981';
  if (val > 0) return '#34d399';
  if (val === 0) return '#6b7280';
  if (val > -10) return '#f87171';
  if (val > -25) return '#ef4444';
  return '#dc2626';
};

const CustomizedTreemapContent = (props) => {
  const { x, y, width, height, name, value, performance, colorMode, index } = props;
  
  if (width < 35 || height < 30) return null;

  const bgColor = colorMode === 'performance' 
    ? getPerformanceColor(performance) 
    : COLORS[index % COLORS.length];

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        style={{
          fill: bgColor,
          stroke: 'var(--bg-primary)',
          strokeWidth: 2,
          strokeOpacity: 0.8,
          opacity: 0.9,
          cursor: 'pointer'
        }}
      />
      {width > 65 && height > 40 && (
        <>
          <text 
            x={x + width / 2} 
            y={y + height / 2 - (height > 55 ? 8 : 0)} 
            textAnchor="middle" 
            fill="#fff" 
            fontSize={Math.min(14, Math.max(11, width / 8))} 
            fontWeight={600}
          >
            {name}
          </text>
          {height > 55 && (
            <text 
              x={x + width / 2} 
              y={y + height / 2 + 12} 
              textAnchor="middle" 
              fill="rgba(255,255,255,0.9)" 
              fontSize={12}
            >
              {colorMode === 'performance' ? formatPercent(performance) : formatCurrency(value)}
            </text>
          )}
        </>
      )}
    </g>
  );
};

const CustomChartTooltip = ({ active, payload, metric }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass-card" style={{ padding: '12px', minWidth: '190px', border: '1px solid var(--border-subtle)' }}>
        <p style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px', color: 'var(--text-primary)' }}>{data.name || data.sector}</p>
        <div style={{ display: 'grid', gap: '4px', fontSize: '13px' }} className="tabular-nums">
          <div className="flex justify-between gap-4 text-secondary">
            <span>Total Value:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(data.total_value || data.value)}</span>
          </div>
          <div className="flex justify-between gap-4 text-secondary">
            <span>Portfolio Weight:</span>
            <span>{formatPercent(data.weight)}</span>
          </div>
          <div className="flex justify-between gap-4 text-secondary">
            <span>Return:</span>
            <span className={(data.performance || 0) >= 0 ? 'profit-positive' : 'profit-negative'} style={{ fontWeight: 600 }}>
              {formatPercent(data.performance || 0)}
            </span>
          </div>
          {data.holdingsCount > 0 && (
            <div className="flex justify-between gap-4 text-secondary">
              <span>Holdings:</span>
              <span>{data.holdingsCount}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const SectorCard = ({ sector, index, expanded, onToggle }) => {
  const cardId = `sector-card-${sector.sector.replace(/\s+/g, '-').toLowerCase()}`;
  
  return (
    <div id={cardId} className="glass-card mb-4" style={{ padding: '0', overflow: 'hidden', transition: 'all 0.3s ease' }}>
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-glass" 
        onClick={onToggle}
        style={{ borderBottom: expanded ? '1px solid var(--border-subtle)' : 'none' }}
      >
        <div className="flex items-center gap-4">
          <div 
            style={{ 
              width: '12px', 
              height: '40px', 
              backgroundColor: COLORS[index % COLORS.length],
              borderRadius: '6px'
            }} 
          />
          <div>
            <h3 className="section-title" style={{ margin: 0 }}>{sector.sector}</h3>
            <p className="text-secondary" style={{ fontSize: '13px' }}>
              <Briefcase size={12} className="inline mr-1" />
              {sector.holdings?.length || 0} Holdings
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 tabular-nums text-right">
          <div>
            <p className="text-secondary" style={{ fontSize: '12px' }}>Total Value</p>
            <p style={{ fontWeight: 600 }}>{formatCurrency(sector.total_value)}</p>
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '12px' }}>Weight</p>
            <p>{formatPercent(sector.weight)}</p>
          </div>
          <div>
            <p className="text-secondary" style={{ fontSize: '12px' }}>Return</p>
            <p className={sector.performance >= 0 ? 'profit-positive' : 'profit-negative'} style={{ fontWeight: 600 }}>
              {formatPercent(sector.performance)}
            </p>
          </div>
          <div className="text-muted ml-2">
            {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </div>
      </div>
      
      {expanded && sector.holdings && (
        <div className="p-4" style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}>
          <table className="data-table tabular-nums">
            <thead>
              <tr>
                <th>Ticker</th>
                <th style={{ textAlign: 'right' }}>Weight in Sector</th>
                <th style={{ textAlign: 'right' }}>Value</th>
                <th style={{ textAlign: 'right' }}>Return</th>
              </tr>
            </thead>
            <tbody>
              {sector.holdings.sort((a,b) => b.current_value_eur - a.current_value_eur).map((h, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{h.ticker}</td>
                  <td style={{ textAlign: 'right' }}>{formatPercent(sector.total_value > 0 ? (h.current_value_eur / sector.total_value) * 100 : 0)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(h.current_value_eur)}</td>
                  <td style={{ textAlign: 'right' }} className={h.total_profit_pct >= 0 ? 'profit-positive' : 'profit-negative'}>
                    {formatPercent(h.total_profit_pct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Sectors = () => {
  const { data: sectorsRes, loading } = useApi('/api/portfolio/sectors');
  const sectors = sectorsRes?.sectors || [];
  
  const [viewMode, setViewMode] = useState('bar'); // 'bar' | 'donut' | 'treemap'
  const [metric, setMetric] = useState('value'); // 'value' | 'weight' | 'performance'
  const [colorMode, setColorMode] = useState('sector'); // 'sector' | 'performance'
  const [expandedSectors, setExpandedSectors] = useState({});

  const formattedData = useMemo(() => {
    return sectors
      .filter(s => s && s.sector && !isNaN(Number(s.total_value)) && Number(s.total_value) > 0)
      .map((s, idx) => ({
        name: s.sector,
        sector: s.sector,
        value: Number(s.total_value),
        weight: Number(s.weight || 0),
        performance: Number(s.performance || 0),
        holdingsCount: s.holdings?.length || 0,
        originalIndex: idx
      }));
  }, [sectors]);

  const sortedBarData = useMemo(() => {
    return [...formattedData].sort((a, b) => {
      if (metric === 'performance') return b.performance - a.performance;
      if (metric === 'weight') return b.weight - a.weight;
      return b.value - a.value;
    });
  }, [formattedData, metric]);

  const totalPortfolioValue = useMemo(() => {
    return formattedData.reduce((acc, curr) => acc + curr.value, 0);
  }, [formattedData]);

  const handleSectorClick = (sectorName) => {
    if (!sectorName) return;
    setExpandedSectors(prev => ({ ...prev, [sectorName]: true }));
    const cardId = `sector-card-${sectorName.replace(/\s+/g, '-').toLowerCase()}`;
    setTimeout(() => {
      const el = document.getElementById(cardId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const toggleSectorCard = (sectorName) => {
    setExpandedSectors(prev => ({ ...prev, [sectorName]: !prev[sectorName] }));
  };

  const getBarValue = (entry) => {
    if (metric === 'performance') return entry.performance;
    if (metric === 'weight') return entry.weight;
    return entry.value;
  };

  const formatMetricAxis = (val) => {
    if (metric === 'performance') return `${val}%`;
    if (metric === 'weight') return `${val}%`;
    return `€${formatNumber(val, 0)}`;
  };

  const barChartHeight = Math.max(350, sortedBarData.length * 45);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sectors</h1>
          <p className="page-subtitle">Portfolio Allocation & Performance by Business Sector</p>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: '420px', width: '100%', marginBottom: '32px' }}></div>
      ) : sectors.length > 0 ? (
        <>
          {/* Controls Bar */}
          <div className="glass-card mb-6 p-4 flex flex-wrap items-center justify-between gap-4">
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-secondary text-sm font-medium mr-1">View:</span>
              <div className="flex gap-1 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
                <button
                  className={`btn ${viewMode === 'bar' ? 'btn-primary' : ''} flex items-center gap-1.5`}
                  onClick={() => setViewMode('bar')}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  <BarChart2 size={16} />
                  <span>Ranked Bars</span>
                </button>
                <button
                  className={`btn ${viewMode === 'donut' ? 'btn-primary' : ''} flex items-center gap-1.5`}
                  onClick={() => setViewMode('donut')}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  <PieIcon size={16} />
                  <span>Donut Ring</span>
                </button>
                <button
                  className={`btn ${viewMode === 'treemap' ? 'btn-primary' : ''} flex items-center gap-1.5`}
                  onClick={() => setViewMode('treemap')}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  <LayoutGrid size={16} />
                  <span>Heatmap</span>
                </button>
              </div>
            </div>

            {/* Metric / Color Controls */}
            <div className="flex items-center gap-4 flex-wrap">
              {viewMode === 'bar' && (
                <div className="flex items-center gap-2">
                  <span className="text-secondary text-sm font-medium">Metric:</span>
                  <div className="flex gap-1 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
                    <button
                      className={`btn ${metric === 'value' ? 'btn-primary' : ''} flex items-center gap-1`}
                      onClick={() => setMetric('value')}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <DollarSign size={13} />
                      <span>Value (€)</span>
                    </button>
                    <button
                      className={`btn ${metric === 'weight' ? 'btn-primary' : ''} flex items-center gap-1`}
                      onClick={() => setMetric('weight')}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <Percent size={13} />
                      <span>Weight (%)</span>
                    </button>
                    <button
                      className={`btn ${metric === 'performance' ? 'btn-primary' : ''} flex items-center gap-1`}
                      onClick={() => setMetric('performance')}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <TrendingUp size={13} />
                      <span>Return (%)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Color Mode Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-secondary text-sm font-medium">Colors:</span>
                <div className="flex gap-1 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
                  <button
                    className={`btn ${colorMode === 'sector' ? 'btn-primary' : ''}`}
                    onClick={() => setColorMode('sector')}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    Sector Palette
                  </button>
                  <button
                    className={`btn ${colorMode === 'performance' ? 'btn-primary' : ''}`}
                    onClick={() => setColorMode('performance')}
                    style={{ padding: '4px 10px', fontSize: '12px' }}
                  >
                    Gain / Loss
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Visualization Container */}
          <div className="glass-card mb-8 p-6" style={{ minHeight: '400px' }}>
            {viewMode === 'bar' && (
              <div style={{ height: `${barChartHeight}px`, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={sortedBarData}
                    margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
                  >
                    <XAxis 
                      type="number" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                      tickFormatter={formatMetricAxis}
                      stroke="var(--border-subtle)"
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 500 }} 
                      width={140}
                      stroke="var(--border-subtle)"
                    />
                    <Tooltip content={<CustomChartTooltip metric={metric} />} />
                    <Bar 
                      dataKey={getBarValue} 
                      radius={[0, 6, 6, 0]}
                      onClick={(data) => handleSectorClick(data.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {sortedBarData.map((entry, idx) => {
                        const barColor = (colorMode === 'performance' || metric === 'performance')
                          ? getPerformanceColor(entry.performance)
                          : COLORS[entry.originalIndex % COLORS.length];
                        return <Cell key={`cell-${idx}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewMode === 'donut' && (
              <div style={{ height: '400px', width: '100%', position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  textAlign: 'center',
                  pointerEvents: 'none'
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Value</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '2px' }}>
                    {formatCurrency(totalPortfolioValue)}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formattedData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={140}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                      onClick={(data) => handleSectorClick(data.name)}
                      style={{ cursor: 'pointer' }}
                    >
                      {formattedData.map((entry, idx) => {
                        const sliceColor = colorMode === 'performance'
                          ? getPerformanceColor(entry.performance)
                          : COLORS[entry.originalIndex % COLORS.length];
                        return <Cell key={`cell-${idx}`} fill={sliceColor} />;
                      })}
                    </Pie>
                    <Tooltip content={<CustomChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {viewMode === 'treemap' && (
              <div style={{ height: '420px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={formattedData}
                    dataKey="value"
                    aspectRatio={4 / 3}
                    stroke="#fff"
                    content={<CustomizedTreemapContent colorMode={colorMode} />}
                    onClick={(node) => handleSectorClick(node.name)}
                  >
                    <Tooltip content={<CustomChartTooltip />} />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Detailed Sector Cards */}
          <div>
            <h3 className="section-title mb-4">Sector Breakdown</h3>
            {sectors.sort((a,b) => b.total_value - a.total_value).map((sector, idx) => (
              <SectorCard 
                key={sector.sector} 
                sector={sector} 
                index={idx}
                expanded={Boolean(expandedSectors[sector.sector])}
                onToggle={() => toggleSectorCard(sector.sector)}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state glass-card">
          <p>No sector data available.</p>
        </div>
      )}
    </div>
  );
};

export default Sectors;
