import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

const MetricCard = ({ title, value, change, changePercent, icon, prefix = '', suffix = '', loading = false }) => {
  if (loading) {
    return (
      <div className="glass-card flex-col gap-4">
        <div className="skeleton" style={{ width: '40%', height: '20px' }}></div>
        <div className="skeleton" style={{ width: '80%', height: '36px' }}></div>
        <div className="skeleton" style={{ width: '60%', height: '16px' }}></div>
      </div>
    );
  }

  const isPositive = change >= 0;
  
  return (
    <div className="glass-card metric-card">
      <div className="flex items-center gap-2 mb-4">
        <div style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>
          {icon}
        </div>
        <span className="text-secondary" style={{ fontSize: '14px', fontWeight: 500 }}>
          {title}
        </span>
      </div>
      
      <div className="mb-2" style={{ fontSize: '28px', fontWeight: 700 }}>
        {prefix}{value}{suffix}
      </div>
      
      {change !== undefined && changePercent !== undefined && (
        <div className="flex items-center gap-1" style={{ fontSize: '13px' }}>
          <span className={`flex items-center ${isPositive ? 'profit-positive' : 'profit-negative'}`}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {prefix}{formatNumber(Math.abs(change))} ({formatNumber(Math.abs(changePercent))}%)
          </span>
          <span className="text-muted ml-1">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
