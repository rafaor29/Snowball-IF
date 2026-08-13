import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatters';
import { Coins, TrendingUp, Calendar, Search, CheckCircle2 } from 'lucide-react';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const Dividends = () => {
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [viewMode, setViewMode] = useState('matrix'); // 'matrix', 'growth', 'missing'
  const [injecting, setInjecting] = useState(false);
  const [injectMessage, setInjectMessage] = useState(null);

  const { data: breakdownData, loading: breakdownLoading, refetch: refetchBreakdown } = useApi('/api/dividends/breakdown');
  const { data: yoyData, loading: yoyLoading } = useApi('/api/portfolio/yoy-performance');
  const { data: missingData, loading: missingLoading, refetch: refetchMissing } = useApi(viewMode === 'missing' ? '/api/dividends/missing' : null);

  const loading = breakdownLoading || yoyLoading;

  const years = breakdownData?.years || [];
  const totalsByYear = breakdownData?.totalsByYear || {};
  const byYearMonth = breakdownData?.byYearMonth || {};
  const byYearTickerMonth = breakdownData?.byYearTickerMonth || {};
  const overallTotalEur = breakdownData?.overallTotalEur || 0;
  const yoyDividendGrowthPct = breakdownData?.yoyDividendGrowthPct || 0;

  const activeYear = selectedYear === 'ALL' ? (years.length > 0 ? years[years.length - 1] : new Date().getFullYear().toString()) : selectedYear;

  // Tickers list for active year
  const tickersForYear = useMemo(() => {
    if (!byYearTickerMonth[activeYear]) return [];
    return Object.values(byYearTickerMonth[activeYear]).sort((a, b) => b.total - a.total);
  }, [byYearTickerMonth, activeYear]);

  // Monthly totals array for active year (1-12)
  const monthlyTotalsForYear = useMemo(() => {
    if (!byYearMonth[activeYear]) return MONTH_NAMES.map((m) => ({ month: m, amount: 0 }));
    return MONTH_NAMES.map((m, idx) => ({
      month: m,
      amount: byYearMonth[activeYear][idx + 1] || 0
    }));
  }, [byYearMonth, activeYear]);

  // Inject approved missing dividends
  const handleInjectDividends = async (itemsToInject) => {
    if (!itemsToInject || itemsToInject.length === 0) return;
    setInjecting(true);
    setInjectMessage(null);
    try {
      const res = await fetch('/api/dividends/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToInject })
      });
      const data = await res.json();
      if (res.ok) {
        setInjectMessage(`Successfully injected ${data.importedCount} dividend transaction(s).`);
        refetchBreakdown();
        refetchMissing();
      } else {
        setInjectMessage(`Error: ${data.error}`);
      }
    } catch (e) {
      setInjectMessage(`Error injecting dividends: ${e.message}`);
    } finally {
      setInjecting(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card" style={{ padding: '12px', minWidth: '180px' }}>
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
          <h1 className="page-title flex items-center gap-2">
            <Coins style={{ color: '#3b82f6' }} /> Dividends & Income Analytics
          </h1>
          <p className="page-subtitle">Track received dividends by month, year, and holding period window</p>
        </div>

        <div className="flex gap-2 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
          <button
            className={`btn ${viewMode === 'matrix' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('matrix')}
          >
            <Calendar size={16} /> Monthly Matrix
          </button>
          <button
            className={`btn ${viewMode === 'growth' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('growth')}
          >
            <TrendingUp size={16} /> YoY Capital vs Income
          </button>
          <button
            className={`btn ${viewMode === 'missing' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('missing')}
          >
            <Search size={16} /> Missing Audit
          </button>
        </div>
      </div>

      {/* Top Summary Metrics */}
      <div className="grid mb-6" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        <div className="glass-card">
          <div className="text-secondary text-sm mb-1 flex items-center gap-1">
            <Coins size={16} /> All-Time Dividends
          </div>
          <div className="tabular-nums text-2xl font-bold" style={{ color: '#10b981' }}>
            {formatCurrency(overallTotalEur)}
          </div>
          <p className="text-muted text-xs mt-1">Verified payouts on holding dates</p>
        </div>

        <div className="glass-card">
          <div className="text-secondary text-sm mb-1">{activeYear} Dividends</div>
          <div className="tabular-nums text-2xl font-bold text-primary">
            {formatCurrency(totalsByYear[activeYear] || 0)}
          </div>
          <p className="text-secondary text-xs mt-1 flex items-center gap-1">
            YoY Growth: 
            <span className={yoyDividendGrowthPct >= 0 ? 'profit-positive' : 'profit-negative'}>
              {yoyDividendGrowthPct >= 0 ? '+' : ''}{yoyDividendGrowthPct}%
            </span>
          </p>
        </div>

        <div className="glass-card">
          <div className="text-secondary text-sm mb-1">Avg. Monthly Yield ({activeYear})</div>
          <div className="tabular-nums text-2xl font-bold">
            {formatCurrency((totalsByYear[activeYear] || 0) / 12)}
          </div>
          <p className="text-muted text-xs mt-1">Passive income per month</p>
        </div>

        <div className="glass-card">
          <div className="text-secondary text-sm mb-1">Portfolio YoY Growth</div>
          {yoyData?.yoyList && yoyData.yoyList.length > 0 ? (
            (() => {
              const latest = yoyData.yoyList[yoyData.yoyList.length - 1];
              return (
                <div>
                  <div className="tabular-nums text-2xl font-bold">
                    <span className={latest.capitalGrowthPct >= 0 ? 'profit-positive' : 'profit-negative'}>
                      {formatPercent(latest.capitalGrowthPct)}
                    </span>
                  </div>
                  <p className="text-secondary text-xs mt-1">
                    Pure capital appreciation (excl. div)
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="tabular-nums text-2xl font-bold text-muted">0.00%</div>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: MONTHLY MATRIX */}
      {viewMode === 'matrix' && (
        <>
          <div className="glass-card mb-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Select Year:</span>
              <div className="flex gap-2 p-1" style={{ backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--border-radius-sm)' }}>
                {years.map(yr => (
                  <button
                    key={yr}
                    className={`btn ${activeYear === yr ? 'btn-primary' : ''}`}
                    onClick={() => setSelectedYear(yr)}
                    style={{ padding: '4px 12px', fontSize: '13px' }}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-secondary">
              Holding rule: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Only counts dividends when shares were held</span>
            </div>
          </div>

          {/* Stacked Chart for Monthly Breakdown */}
          <div className="glass-card mb-6" style={{ height: '320px' }}>
            <h3 className="section-title mb-4">Monthly Dividend Income ({activeYear})</h3>
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="spinner"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="80%">
                <BarChart data={monthlyTotalsForYear} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `€${v}`} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" name="Dividend Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Matrix Table */}
          <div className="glass-card mb-6 overflow-x-auto">
            <h3 className="section-title mb-4">{activeYear} Dividend Payout Matrix by Stock</h3>
            
            {tickersForYear.length === 0 ? (
              <div className="empty-state py-8">
                <p>No dividend payouts recorded for {activeYear}.</p>
              </div>
            ) : (
              <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', minWidth: '160px' }}>Company</th>
                    {MONTH_NAMES.map(m => (
                      <th key={m} style={{ textAlign: 'right', padding: '8px 6px' }}>{m}</th>
                    ))}
                    <th style={{ textAlign: 'right', fontWeight: 700, minWidth: '90px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {tickersForYear.map(row => (
                    <tr key={row.ticker}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.ticker}</div>
                        <div className="text-muted text-xs truncate" style={{ maxWidth: '160px' }}>{row.name}</div>
                      </td>
                      {MONTH_NAMES.map((_, idx) => {
                        const val = row[idx + 1] || 0;
                        return (
                          <td 
                            key={idx} 
                            style={{ 
                              textAlign: 'right', 
                              padding: '8px 6px',
                              backgroundColor: val > 0 ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                              color: val > 0 ? '#60a5fa' : 'var(--text-muted)',
                              fontWeight: val > 0 ? 600 : 400
                            }}
                            className="tabular-nums"
                          >
                            {val > 0 ? `€${formatNumber(val)}` : '-'}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#10b981' }} className="tabular-nums">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-subtle)', fontWeight: 700 }}>
                    <td>Total Monthly</td>
                    {MONTH_NAMES.map((_, idx) => {
                      const mTotal = byYearMonth[activeYear] ? (byYearMonth[activeYear][idx + 1] || 0) : 0;
                      return (
                        <td key={idx} style={{ textAlign: 'right', padding: '8px 6px', color: mTotal > 0 ? '#3b82f6' : 'var(--text-muted)' }} className="tabular-nums">
                          {mTotal > 0 ? `€${formatNumber(mTotal)}` : '-'}
                        </td>
                      );
                    })}
                    <td style={{ textAlign: 'right', color: '#10b981', fontSize: '14px' }} className="tabular-nums">
                      {formatCurrency(totalsByYear[activeYear] || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      )}

      {/* VIEW MODE 2: YOY CAPITAL GROWTH VS DIVIDEND YIELD */}
      {viewMode === 'growth' && (
        <div className="glass-card mb-6">
          <h3 className="section-title mb-2">Year-over-Year Capital Growth vs Dividend Yield</h3>
          <p className="text-secondary text-sm mb-6">
            Compare annual pure stock price appreciation against dividend cash yield. Total Return = Capital Growth + Dividend Yield.
          </p>

          {yoyLoading ? (
            <div className="flex justify-center items-center h-48">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="mb-8" style={{ height: '340px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yoyData?.yoyList || []} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="year" tick={{ fill: 'var(--text-muted)' }} />
                    <YAxis tickFormatter={(v) => `${v}%`} tick={{ fill: 'var(--text-muted)' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="capitalGrowthPct" name="Capital Growth % (Excl. Divs)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="dividendYieldPct" name="Dividend Yield %" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="totalReturnPct" name="Total Return %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <table className="table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Year</th>
                    <th style={{ textAlign: 'right' }}>Start Value</th>
                    <th style={{ textAlign: 'right' }}>End Value</th>
                    <th style={{ textAlign: 'right' }}>Net Deposits</th>
                    <th style={{ textAlign: 'right' }}>Capital Growth (€)</th>
                    <th style={{ textAlign: 'right' }}>Capital Growth (%)</th>
                    <th style={{ textAlign: 'right' }}>Dividends (€)</th>
                    <th style={{ textAlign: 'right' }}>Dividend Yield (%)</th>
                    <th style={{ textAlign: 'right' }}>Total Return (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(yoyData?.yoyList || []).map(r => (
                    <tr key={r.year}>
                      <td style={{ fontWeight: 600 }}>{r.year}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatCurrency(r.startValue)}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatCurrency(r.endValue)}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatCurrency(r.netContributions)}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">
                        <span className={r.capitalGrowthEur >= 0 ? 'profit-positive' : 'profit-negative'}>
                          {formatCurrency(r.capitalGrowthEur)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }} className="tabular-nums">
                        <span className={r.capitalGrowthPct >= 0 ? 'profit-positive' : 'profit-negative'}>
                          {formatPercent(r.capitalGrowthPct)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }} className="tabular-nums">
                        {formatCurrency(r.dividendsEarned)}
                      </td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }} className="tabular-nums">
                        {formatPercent(r.dividendYieldPct)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="tabular-nums">
                        <span className={r.totalReturnPct >= 0 ? 'profit-positive' : 'profit-negative'}>
                          {formatPercent(r.totalReturnPct)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* VIEW MODE 3: MISSING DIVIDENDS AUDIT */}
      {viewMode === 'missing' && (
        <div className="glass-card mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="section-title flex items-center gap-2">
                <Search size={18} /> Missing Dividends Scanner
              </h3>
              <p className="text-secondary text-sm">
                Scans public corporate events against your exact holding dates and transaction logs.
              </p>
            </div>
            {missingData?.missingDividends?.length > 0 && (
              <button 
                className="btn btn-primary" 
                onClick={() => handleInjectDividends(missingData.missingDividends)}
                disabled={injecting}
              >
                {injecting ? 'Injecting...' : `Approve & Inject All (${missingData.missingDividends.length})`}
              </button>
            )}
          </div>

          {injectMessage && (
            <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
              <CheckCircle2 size={18} /> {injectMessage}
            </div>
          )}

          {missingLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="spinner"></div>
              <span className="ml-3 text-secondary">Scanning corporate distribution history...</span>
            </div>
          ) : missingData?.missingDividends?.length === 0 ? (
            <div className="empty-state py-8">
              <CheckCircle2 size={36} style={{ color: '#10b981', marginBottom: '8px' }} />
              <p className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>All Dividends Up to Date!</p>
              <p className="text-secondary text-sm">No missing dividend distributions detected for your active holding periods.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table" style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Payment / Ex-Date</th>
                    <th style={{ textAlign: 'right' }}>Shares Held</th>
                    <th style={{ textAlign: 'right' }}>Per Share</th>
                    <th style={{ textAlign: 'right' }}>Gross Amount</th>
                    <th style={{ textAlign: 'right' }}>Est. Tax</th>
                    <th style={{ textAlign: 'right' }}>Est. Net</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(missingData?.missingDividends || []).map((item) => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.ticker}</td>
                      <td>{item.payment_date || item.ex_date}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{formatNumber(item.shares_held, 2)}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{item.currency} {formatNumber(item.dividend_per_share, 4)}</td>
                      <td style={{ textAlign: 'right' }} className="tabular-nums">{item.currency} {formatNumber(item.gross_amount)}</td>
                      <td style={{ textAlign: 'right', color: '#f87171' }} className="tabular-nums">{item.currency} {formatNumber(item.estimated_tax)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }} className="tabular-nums">{item.currency} {formatNumber(item.estimated_net)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-outline" 
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => handleInjectDividends([item])}
                          disabled={injecting}
                        >
                          Inject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dividends;
