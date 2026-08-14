import { useState, useMemo } from 'react';
import { useApi } from '../hooks/useApi';
import MetricCard from '../components/MetricCard';
import TransactionModal from '../components/TransactionModal';
import { 
  ReceiptText, 
  Search, 
  Filter, 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatNumber, formatDateShort } from '../utils/formatters';

const formatExchangeLabel = (exchange) => {
  if (!exchange) return '-';
  const ex = exchange.trim().toUpperCase();
  if (ex === 'MC' || ex === 'IBEX' || ex === 'IBEX35' || ex === 'IBEX 35') return 'IBEX 35';
  if (ex === 'NYSE') return 'NYSE';
  if (ex === 'NASDAQ') return 'NASDAQ';
  if (ex === 'LSE' || ex === 'L') return 'LSE';
  if (ex === 'F' || ex === 'XETRA' || ex === 'DE') return 'XETRA';
  return exchange;
};

const Transactions = ({ onDataChange }) => {
  const { data: transactions, loading, refetch } = useApi('/api/transactions');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [exchangeFilter, setExchangeFilter] = useState('ALL');
  
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate unique exchanges for the filter dropdown
  const uniqueExchanges = useMemo(() => {
    if (!transactions) return [];
    const set = new Set();
    transactions.forEach(t => {
      if (t.exchange) {
        set.add(formatExchangeLabel(t.exchange));
      }
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Compute metrics
  const metrics = useMemo(() => {
    if (!transactions) return { totalCount: 0, buyCount: 0, buyTotal: 0, sellCount: 0, sellTotal: 0, totalFees: 0 };
    
    let buyCount = 0;
    let buyTotal = 0;
    let sellCount = 0;
    let sellTotal = 0;
    let totalFees = 0;

    transactions.forEach(t => {
      const price = t.price || 0;
      const qty = t.quantity || 0;
      const fees = t.fee_tax || 0;
      totalFees += fees;

      if (t.event_type === 'BUY') {
        buyCount++;
        buyTotal += price * qty;
      } else if (t.event_type === 'SELL') {
        sellCount++;
        sellTotal += price * qty;
      }
    });

    return {
      totalCount: transactions.length,
      buyCount,
      buyTotal,
      sellCount,
      sellTotal,
      totalFees
    };
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(t => {
      // Type Filter
      if (typeFilter !== 'ALL' && t.event_type !== typeFilter) {
        return false;
      }

      // Exchange Filter
      if (exchangeFilter !== 'ALL') {
        const formatted = formatExchangeLabel(t.exchange);
        if (formatted !== exchangeFilter) return false;
      }

      // Search Filter
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase().trim();
        const tickerMatch = t.ticker && t.ticker.toLowerCase().includes(q);
        const nameMatch = t.name && t.name.toLowerCase().includes(q);
        const exchangeMatch = t.exchange && t.exchange.toLowerCase().includes(q);
        const notesMatch = t.notes && t.notes.toLowerCase().includes(q);

        if (!tickerMatch && !nameMatch && !exchangeMatch && !notesMatch) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, searchTerm, typeFilter, exchangeFilter]);

  const handleDelete = async (id) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingId(null);
        refetch();
        if (onDataChange) onDataChange();
      }
    } catch (e) {
      console.error('Error deleting transaction:', e);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleModalSave = () => {
    setShowAddModal(false);
    setEditingTransaction(null);
    refetch();
    if (onDataChange) onDataChange();
  };

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <ReceiptText className="text-accent" size={30} style={{ color: 'var(--accent-blue)' }} />
            Transactions
          </h1>
          <p className="page-subtitle">Full record of all portfolio buys, sells, and dividends</p>
        </div>
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="metric-cards-grid">
        <MetricCard 
          title="Total Transactions" 
          value={metrics.totalCount} 
          icon={<ReceiptText size={24} />} 
          loading={loading} 
        />
        <MetricCard 
          title="Purchases (Buys)" 
          value={metrics.buyCount} 
          icon={<TrendingUp size={24} />} 
          prefix=""
          suffix={` ops (${formatCurrency(metrics.buyTotal)})`}
          loading={loading} 
        />
        <MetricCard 
          title="Sales (Sells)" 
          value={metrics.sellCount} 
          icon={<TrendingDown size={24} />} 
          prefix=""
          suffix={` ops (${formatCurrency(metrics.sellTotal)})`}
          loading={loading} 
        />
        <MetricCard 
          title="Total Fees & Taxes" 
          value={formatNumber(metrics.totalFees)} 
          icon={<Coins size={24} />} 
          prefix="€" 
          loading={loading} 
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-card mb-6 p-4">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="flex items-center gap-2 flex-1" style={{ minWidth: '240px' }}>
            <div className="relative flex-1">
              <Search 
                size={18} 
                style={{ 
                  position: 'absolute', 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search by Ticker, Name, Index or Notes..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                style={{ paddingLeft: '38px', height: '40px' }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Type:</span>
              <select 
                className="form-select" 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ width: '150px', height: '40px', padding: '6px 12px' }}
              >
                <option value="ALL">All Types</option>
                <option value="BUY">Purchase (BUY)</option>
                <option value="SELL">Sell (SELL)</option>
                <option value="DIVIDEND">Dividend</option>
                <option value="STOCK_AS_DIVIDEND">Stock Dividend</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Index:</span>
              <select 
                className="form-select" 
                value={exchangeFilter} 
                onChange={(e) => setExchangeFilter(e.target.value)}
                style={{ width: '150px', height: '40px', padding: '6px 12px' }}
              >
                <option value="ALL">All Indexes</option>
                {uniqueExchanges.map(ex => (
                  <option key={ex} value={ex}>{ex}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Data Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="data-table-container">
          <table className="data-table tabular-nums">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Ticker & Name</th>
                <th>Index / Exchange</th>
                <th style={{ textAlign: 'right' }}>Price / Share</th>
                <th style={{ textAlign: 'right' }}>Shares Amount</th>
                <th style={{ textAlign: 'right' }}>Taxes Paid</th>
                <th style={{ textAlign: 'right' }}>Total Value</th>
                <th style={{ textAlign: 'center', width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i}>
                    <td colSpan={9}>
                      <div className="skeleton" style={{ height: '30px', width: '100%' }}></div>
                    </td>
                  </tr>
                ))
              ) : filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx) => {
                  const isBuy = tx.event_type === 'BUY';
                  const isSell = tx.event_type === 'SELL';
                  const isDiv = tx.event_type === 'DIVIDEND';
                  const isStockDiv = tx.event_type === 'STOCK_AS_DIVIDEND';

                  const badgeClass = isBuy ? 'badge-green' : isSell ? 'badge-red' : isDiv ? 'badge-blue' : 'badge-purple';
                  const typeLabel = isBuy ? 'Purchase' : isSell ? 'Sell' : isDiv ? 'Dividend' : 'Stock Div';

                  const totalPrice = (tx.quantity || 0) * (tx.price || 0);

                  return (
                    <tr key={tx.id}>
                      {/* Date */}
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 500 }}>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} style={{ color: 'var(--text-muted)' }} />
                          <span>{formatDateShort(tx.date)}</span>
                        </div>
                      </td>

                      {/* Purchase/Sell (Type) */}
                      <td>
                        <span className={`badge ${badgeClass}`}>
                          {typeLabel}
                        </span>
                      </td>

                      {/* Ticker & Name */}
                      <td>
                        <div className="flex flex-col">
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px' }}>
                            {tx.ticker}
                          </span>
                          {tx.name && tx.name !== tx.ticker && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.name}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Index in which it was bought */}
                      <td>
                        <span className="tag" style={{ fontWeight: 500 }}>
                          {formatExchangeLabel(tx.exchange)}
                        </span>
                      </td>

                      {/* Price of share */}
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(tx.price, tx.currency)}
                      </td>

                      {/* Amount of shares */}
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {formatNumber(tx.quantity, 4)}
                      </td>

                      {/* Taxes Paid */}
                      <td style={{ textAlign: 'right', color: tx.fee_tax > 0 ? 'var(--accent-yellow)' : 'var(--text-muted)' }}>
                        {tx.fee_tax > 0 ? formatCurrency(tx.fee_tax, tx.fee_currency || tx.currency) : '-'}
                      </td>

                      {/* Total Value */}
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        {formatCurrency(totalPrice, tx.currency)}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '6px', borderRadius: '6px' }}
                            title="Edit Transaction"
                            onClick={() => setEditingTransaction(tx)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '6px', borderRadius: '6px', color: 'var(--accent-red)' }}
                            title="Delete Transaction"
                            onClick={() => setDeletingId(tx.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                    <div className="empty-state">
                      <ReceiptText size={40} style={{ opacity: 0.4, marginBottom: '12px' }} />
                      <p style={{ fontSize: '16px', fontWeight: 500 }}>No transactions found</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {searchTerm || typeFilter !== 'ALL' || exchangeFilter !== 'ALL'
                          ? 'Try matching different search or filter options.' 
                          : 'Click "Add Transaction" to start recording your investment portfolio transactions.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {(showAddModal || editingTransaction) && (
        <TransactionModal 
          transaction={editingTransaction}
          onClose={() => { setShowAddModal(false); setEditingTransaction(null); }}
          onSave={handleModalSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="modal-overlay" onClick={() => setDeletingId(null)}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h3 className="section-title mb-2">Delete Transaction?</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Are you sure you want to delete this transaction? This operation cannot be undone and will recalculate portfolio holdings.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                className="btn btn-outline" 
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleDelete(deletingId)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
