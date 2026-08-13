import { useState, useMemo, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import MissingDividendsModal from '../components/MissingDividendsModal';
import { DollarSign, TrendingUp, Coins, Briefcase, Sparkles, ArrowRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatCurrency, formatNumber, formatDateShort } from '../utils/formatters';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f43f5e', '#84cc16'];

const Dashboard = () => {
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useApi('/api/portfolio/summary');
  const { data: holdingsRes, loading: holdingsLoading, refetch: refetchHoldings } = useApi('/api/portfolio/holdings');
  const { data: historyRes, loading: historyLoading } = useApi('/api/portfolio/history?range=1Y');
  const { data: sectorsRes, loading: sectorsLoading } = useApi('/api/portfolio/sectors');
  const { data: transactions, loading: txLoading, refetch: refetchTx } = useApi('/api/transactions?limit=10');

  const [missingData, setMissingData] = useState(null);
  const [showMissingModal, setShowMissingModal] = useState(false);

  useEffect(() => {
    fetch('/api/dividends/missing')
      .then(res => res.json())
      .then(data => setMissingData(data))
      .catch(e => console.error('Error fetching missing dividends:', e));
  }, []);

  const isLoading = summaryLoading || holdingsLoading || historyLoading || sectorsLoading || txLoading;

  const holdings = holdingsRes?.holdings || [];
  const sectors = sectorsRes?.sectors || [];
  const history = Array.isArray(historyRes) ? historyRes : [];

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history
      .filter(point => point && point.date && !isNaN(Number(point.value)))
      .map(point => ({
        date: formatDateShort(point.date),
        value: Number(point.value)
      }));
  }, [history]);

  const sectorData = useMemo(() => {
    if (!sectors || sectors.length === 0) return [];
    return sectors
      .filter(s => s && s.sector && !isNaN(Number(s.total_value)) && Number(s.total_value) > 0)
      .map(s => ({
        name: s.sector,
        value: Number(s.total_value)
      })).sort((a, b) => b.value - a.value);
  }, [sectors]);

  const handleRefreshAll = () => {
    refetchSummary();
    refetchHoldings();
    refetchTx();
    fetch('/api/dividends/missing')
      .then(res => res.json())
      .then(data => setMissingData(data));
  };

  const missingCount = missingData?.missingCount || 0;
  const missingNetSum = (missingData?.missingDividends || []).reduce((s, i) => s + (i.estimated_net || 0), 0);

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Portfolio Overview</p>
        </div>
      </div>

      {missingCount > 0 && (
        <div 
          className="glass-card mb-6 p-4 flex items-center justify-between"
          style={{ 
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.3)'
          }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-accent text-white" style={{ backgroundColor: '#6366f1', borderRadius: '50%', padding: '6px' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>
                {missingCount} Unlogged Corporate Dividends Detected (~{formatCurrency(missingNetSum)})
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Matching your active position holding dates against official distribution timelines.
              </div>
            </div>
          </div>
          <button 
            className="btn btn-primary flex items-center gap-2"
            onClick={() => setShowMissingModal(true)}
          >
            <span>Review & Import</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      <div className="metric-cards-grid">
        <MetricCard 
          title="Total Value (€)" 
          value={formatNumber(summary?.total_value)} 
          change={summary?.daily_change} 
          changePercent={summary?.daily_change_pct} 
          icon={<DollarSign size={24} />} 
          prefix="€" 
          loading={isLoading} 
        />
        <MetricCard 
          title="Total Profit (€)" 
          value={formatNumber(summary?.total_profit)} 
          changePercent={summary?.total_profit_pct} 
          icon={<TrendingUp size={24} />} 
          prefix="€" 
          suffix=""
          loading={isLoading} 
        />
        <MetricCard 
          title="Dividends Received (€)" 
          value={formatNumber(summary?.total_dividends)} 
          icon={<Coins size={24} />} 
          prefix="€" 
          loading={isLoading} 
        />
        <MetricCard 
          title="Holdings Count" 
          value={summary?.num_holdings || holdings.length || 0} 
          icon={<Briefcase size={24} />} 
          loading={isLoading} 
        />
      </div>

      <div className="charts-grid">
        <div className="glass-card flex-col">
          <h3 className="section-title">Portfolio Value</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
          ) : chartData.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                    tickFormatter={(val) => `€${formatNumber(val, 0)}`}
                    domain={['auto', 'auto']}
                  />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value) => [`€${formatNumber(value)}`, 'Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
             <div className="empty-state" style={{ height: '300px', padding: 0 }}>
               <p>No historical data available</p>
             </div>
          )}
        </div>

        <div className="glass-card flex-col">
          <h3 className="section-title">Allocation by Sector</h3>
          {isLoading ? (
            <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
          ) : sectorData.length > 0 ? (
            <div style={{ height: '300px', width: '100%', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>€{formatNumber(summary?.total_value, 0)}</div>
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `€${formatNumber(value)}`}
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ height: '300px', padding: 0 }}>
               <p>No sector data available</p>
            </div>
          )}
        </div>
      </div>

      <div className="glass-card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="section-title" style={{ margin: 0 }}>Recent Transactions</h3>
        </div>
        
        <table className="data-table tabular-nums">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Ticker</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th style={{ textAlign: 'right' }}>Price</th>
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
               [1,2,3].map(i => (
                 <tr key={i}>
                   <td colSpan={6}><div className="skeleton" style={{ height: '24px' }}></div></td>
                 </tr>
               ))
            ) : transactions && transactions.length > 0 ? (
              transactions.map((tx, i) => (
                <tr key={i}>
                  <td>{formatDateShort(tx.date)}</td>
                  <td>
                    <span className={`badge badge-${tx.event_type === 'BUY' ? 'green' : tx.event_type === 'SELL' ? 'red' : 'blue'}`}>
                      {tx.event_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{tx.ticker}</td>
                  <td style={{ textAlign: 'right' }}>{formatNumber(tx.quantity, 4)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(tx.price, tx.currency)}</td>
                  <td style={{ textAlign: 'right' }}>{formatCurrency(tx.quantity * tx.price, tx.currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                  No recent transactions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showMissingModal && (
        <MissingDividendsModal 
          onClose={() => setShowMissingModal(false)}
          onImportSuccess={handleRefreshAll}
        />
      )}
    </div>
  );
};

export default Dashboard;
