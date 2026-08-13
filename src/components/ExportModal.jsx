import { useState } from 'react';
import { Download, X, FileJson, FileText } from 'lucide-react';

const ExportModal = ({ onClose }) => {
  const [format, setFormat] = useState('json');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    const url = `/api/portfolio/export?format=${format}`;
    
    // Create hidden anchor to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Download size={22} className="text-accent-blue" />
            <h2 className="page-title" style={{ fontSize: '20px', margin: 0 }}>Export Portfolio Backup</h2>
          </div>
          <button className="btn" onClick={onClose} style={{ padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        <p className="text-secondary text-sm mb-6">
          Export your complete portfolio data (transactions, notes, sectors, and settings) to import into another instance of Snowball-IF.
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <label 
            className={`glass-card p-4 flex items-center gap-3 cursor-pointer ${format === 'json' ? 'border-accent-blue' : ''}`}
            style={{ borderWidth: format === 'json' ? '2px' : '1px' }}
          >
            <input 
              type="radio" 
              name="exportFormat" 
              value="json" 
              checked={format === 'json'} 
              onChange={() => setFormat('json')}
            />
            <FileJson size={28} className="text-accent-blue" />
            <div>
              <div className="font-semibold text-primary">Full JSON Backup (.json)</div>
              <div className="text-xs text-muted">Complete snapshot including settings & metadata. Recommended for multi-device sync.</div>
            </div>
          </label>

          <label 
            className={`glass-card p-4 flex items-center gap-3 cursor-pointer ${format === 'csv' ? 'border-accent-blue' : ''}`}
            style={{ borderWidth: format === 'csv' ? '2px' : '1px' }}
          >
            <input 
              type="radio" 
              name="exportFormat" 
              value="csv" 
              checked={format === 'csv'} 
              onChange={() => setFormat('csv')}
            />
            <FileText size={28} className="text-accent-green" />
            <div>
              <div className="font-semibold text-primary">Transactions CSV (.csv)</div>
              <div className="text-xs text-muted">Standard CSV format suitable for opening in Excel or Google Sheets.</div>
            </div>
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn btn-outline" onClick={onClose} disabled={downloading}>
            Cancel
          </button>
          <button className="btn btn-primary flex items-center gap-2" onClick={handleDownload} disabled={downloading}>
            <Download size={16} />
            {downloading ? 'Exporting...' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
