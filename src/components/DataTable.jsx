import React, { useState, useMemo, Fragment } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';

const DataTable = ({ 
  columns, 
  data = [], 
  onRowClick, 
  expandable = false, 
  expandedContent, 
  loading = false, 
  emptyMessage = "No data available" 
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      // Third click removes sorting
      key = null;
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const toggleRow = (index) => {
    if (!expandable) return;
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal === null || aVal === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  if (loading) {
    return (
      <div className="data-table-container glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, i) => <th key={i}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map((i) => (
              <tr key={i}>
                {columns.map((col, j) => (
                  <td key={j}><div className="skeleton" style={{ height: '20px', width: '100%' }}></div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-card empty-state">
        <Inbox size={48} />
        <h3>{emptyMessage}</h3>
      </div>
    );
  }

  return (
    <div className="data-table-container glass-card" style={{ padding: 0, overflow: 'hidden' }}>
      <table className="data-table tabular-nums">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th 
                key={i} 
                onClick={() => col.sortable !== false ? handleSort(col.key) : undefined}
                style={{ 
                  textAlign: col.align || 'left',
                  width: col.width || 'auto',
                  cursor: col.sortable !== false ? 'pointer' : 'default'
                }}
              >
                <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                  {col.label}
                  {col.sortable !== false && sortConfig.key === col.key && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <Fragment key={i}>
              <tr 
                onClick={() => {
                  if (expandable) toggleRow(i);
                  if (onRowClick) onRowClick(row);
                }}
                style={{ cursor: expandable || onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col, j) => (
                  <td key={j} style={{ textAlign: col.align || 'left' }}>
                    {col.format ? col.format(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
              {expandable && expandedRows.has(i) && (
                <tr className="expanded-row-content">
                  <td colSpan={columns.length} style={{ padding: 0, backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    {expandedContent(row)}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
