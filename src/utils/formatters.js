export const formatCurrency = (value, currency = 'EUR') => {
  if (value === null || value === undefined) return '-';
  
  const currUpper = (currency || 'EUR').toUpperCase();
  
  if (currUpper === 'GBX' || currUpper === 'GBP') {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' GBX';
  }

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currUpper,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return formatter.format(value);
  } catch (e) {
    return `${currUpper} ${Number(value).toFixed(2)}`;
  }
};

export const formatPercent = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  
  const formatted = Number(value).toFixed(decimals) + '%';
  return value > 0 ? `+${formatted}` : formatted;
};

export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  });
};

export const getColorClass = (value) => {
  if (value === null || value === undefined) return '';
  return value >= 0 ? 'profit-positive' : 'profit-negative';
};

export const getSmaSignalColor = (deviation) => {
  if (deviation === null || deviation === undefined) return 'transparent';
  if (deviation >= 0) return 'var(--accent-green)'; // Above SMA
  
  // Below SMA - gradient from yellow to red based on severity
  if (deviation > -2) return '#facc15'; // Yellow
  if (deviation > -5) return '#fb923c'; // Orange
  if (deviation > -10) return '#f87171'; // Light Red
  return '#ef4444'; // Red
};
