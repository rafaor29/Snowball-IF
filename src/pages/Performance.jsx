import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPercent, formatDateShort, formatNumber } from '../utils/formatters';

const Performance = () => {
  const [range, setRange] = useState('1Y'); // 1M, 3M, 6M, YTD, 1Y, ALL
  const [showSpy, setShowSpy] = useState(true);
  const [showUrth, setShowUrth] = useState(false);

  const { data: historyRes, loading: historyLoading } = useApi(`/api/portfolio/history?range=${range}`);
  const { data: spyRes, loading: spyLoading } = useApi(showSpy ? `/api/portfolio/benchmark?symbol=SPY&range=${range}` : null);
  const { data: urthRes, loading: urthLoading } = useApi(showUrth ? `/api/portfolio/benchmark?symbol=URTH&range=${range}` : null);

  const loading = historyLoading || (showSpy && spyLoading) || (showUrth && urthLoading);

  const history = Array.isArray(historyRes) ? historyRes : [];
  const spyData = spyRes?.history || (Array.isArray(spyRes) ? spyRes : []);
  const urthData = urthRes?.history || (Array.isArray(urthRes) ? urthRes : []);

  const getNearestBenchmarkValue = (benchmarkList, targetDate) => {
    if (!benchmarkList || benchmarkList.length === 0) return null;
    let val = null;
    for (let i = 0; i < benchmarkList.length; i++) {
      if (benchmarkList[i].date <= targetDate) {
        val = benchmarkList[i].value;
      } else {
        break;
      }
    }
    return val;
  };

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    
    const sortedSpy = spyData && spyData.length > 0 ? [...spyData].sort((a, b) => a.date.localeCompare(b.date)) : [];
    const sortedUrth = urthData && urthData.length > 0 ? [...urthData].sort((a, b) => a.date.localeCompare(b.date)) : [];

    return history.map(point => ({
      date: point.date,
      dateFormatted: formatDateShort(point.date),
      portfolio: point.value,
      spy: showSpy ? getNearestBenchmarkValue(sortedSpy, point.date) : null,
      urth: showUrth ? getNearestBenchmarkValue(sortedUrth, point.date) : null
    }));
  }, [history, spyData, urthData, showSpy, showUrth]);

  const calculateReturn = (dataKey) => {
    if (!chartData || chartData.length < 2) return 0;
    
    // Find first non-null value
    let startValue = null;
    for (let i = 0; i < chartData.length; i++) {
      if (chartData[i][dataKey] !== null && chartData[i][dataKey] !== undefined) {
        startValue = chartData[i][dataKey];
        break;
      }
    }
    
    const endValue = chartData[chartData.length - 1][dataKey];
    
    if (!startValue || !endValue) return 0;
    
    return ((endValue - startValue) / startValue) * 100;
  };

  const portReturn = (showSpy && spyRes?.portfolioReturn !== undefined)
    ? spyRes.portfolioReturn
    : ((showUrth && urthRes?.portfolioReturn !== undefined)
      ? urthRes.portfolioReturn
      : calculateReturn('portfolio'));

  const spyReturn = (showSpy && spyRes?.benchmarkReturn !== undefined) ? spyRes.benchmarkReturn : calculateReturn('spy');
  const urthReturn = (showUrth && urthRes?.benchmarkReturn !== undefined) ? urthRes.benchmarkReturn : calculateReturn('urth');

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card" style={{ padding: '12px', minWidth: '200px' }}>
          <p style={{ fontWeight: 600, marginBottom: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex justify-between items-center mb-1 tabular-nums" style={{ color: entry.color }}>
              <span>{entry.name}:</span>
              <span style={{ fontWeight: 500 }}>€{formatNumber(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance</h1>
          <p className="page-subtitle">Portfolio value vs market benchmarks</p>
        </div>
      </div>

      <div className="glass-card mb-6 flex justify-between items-center">
        <div className="flex gap-2 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
          {['1M', '3M', '6M', 'YTD', '1Y', 'ALL'].map(r => (
            <button
              key={r}
              className={`btn ${range === r ? 'btn-primary' : ''}`}
              onClick={() => setRange(r)}
              style={{ padding: '6px 12px' }}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showSpy} 
              onChange={(e) => setShowSpy(e.target.checked)}
              style={{ accentColor: '#f59e0b' }}
            />
            <span style={{ color: showSpy ? '#f59e0b' : 'var(--text-secondary)' }}>S&P 500 (SPY)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={showUrth} 
              onChange={(e) => setShowUrth(e.target.checked)}
              style={{ accentColor: '#8b5cf6' }}
            />
            <span style={{ color: showUrth ? '#8b5cf6' : 'var(--text-secondary)' }}>MSCI World (URTH)</span>
          </label>
        </div>
      </div>

      <div className="glass-card mb-6" style={{ height: '500px', position: 'relative' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-card z-10" style={{ backgroundColor: 'rgba(17, 24, 39, 0.5)', borderRadius: 'var(--border-radius)' }}>
            <div className="spinner"></div>
          </div>
        )}
        
        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                tickFormatter={(val) => `€${formatNumber(val, 0)}`}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} />
              
              <Area 
                type="monotone" 
                dataKey="portfolio" 
                name="Portfolio" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fill="url(#colorPortfolio)" 
              />
              
              {showSpy && (
                <Line 
                  type="monotone" 
                  dataKey="spy" 
                  name="S&P 500" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
              
              {showUrth && (
                <Line 
                  type="monotone" 
                  dataKey="urth" 
                  name="MSCI World" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : !loading && (
          <div className="empty-state" style={{ height: '100%' }}>
            <p>No performance data available for this period.</p>
          </div>
        )}
      </div>

      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        <div className="glass-card">
          <h3 className="section-title mb-2">Portfolio Return</h3>
          <div className="tabular-nums text-2xl font-bold mb-1">
            <span className={portReturn >= 0 ? 'profit-positive' : 'profit-negative'}>
              {formatPercent(portReturn)}
            </span>
          </div>
          <p className="text-secondary text-sm">For selected period</p>
        </div>
        
        {showSpy && (
          <div className="glass-card">
            <h3 className="section-title mb-2">S&P 500 Return</h3>
            <div className="tabular-nums text-2xl font-bold mb-1">
              <span className={spyReturn >= 0 ? 'profit-positive' : 'profit-negative'}>
                {formatPercent(spyReturn)}
              </span>
            </div>
            <p className="text-secondary text-sm">
              Alpha: <span className={portReturn - spyReturn >= 0 ? 'profit-positive' : 'profit-negative'}>
                {formatPercent(portReturn - spyReturn)}
              </span>
            </p>
          </div>
        )}
        
        {showUrth && (
          <div className="glass-card">
            <h3 className="section-title mb-2">MSCI World Return</h3>
            <div className="tabular-nums text-2xl font-bold mb-1">
              <span className={urthReturn >= 0 ? 'profit-positive' : 'profit-negative'}>
                {formatPercent(urthReturn)}
              </span>
            </div>
            <p className="text-secondary text-sm">
              Alpha: <span className={portReturn - urthReturn >= 0 ? 'profit-positive' : 'profit-negative'}>
                {formatPercent(portReturn - urthReturn)}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Performance;
