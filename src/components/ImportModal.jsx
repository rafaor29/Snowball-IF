import { useState, useRef } from 'react';
import { Upload, X, CheckCircle, Database } from 'lucide-react';

const ImportModal = ({ onClose, onImportComplete }) => {
  const [file, setFile] = useState(null);
  const [mode, setMode] = useState('merge'); // 'merge' | 'replace'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const isJson = file && file.name.toLowerCase().endsWith('.json');
  const isCsv = file && file.name.toLowerCase().endsWith('.csv');

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const name = droppedFile.name.toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.json')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Please upload a .json backup or a .csv file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const name = selectedFile.name.toLowerCase();
      if (name.endsWith('.csv') || name.endsWith('.json')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a .json backup or a .csv file.');
      }
    }
  };

  const handleImport = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);

    try {
      if (isJson) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/portfolio/import-json?mode=${mode}`, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Import failed');
        }

        let msg = `Successfully imported ${result.importedCount} transactions.`;
        if (result.skippedCount > 0) {
          msg += ` (${result.skippedCount} duplicate${result.skippedCount > 1 ? 's' : ''} skipped)`;
        }
        setSuccess(msg);

      } else {
        // CSV import
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/transactions/import', {
          method: 'POST',
          body: formData,
        });
        
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'CSV Import failed');
        }
        
        setSuccess(`Successfully imported ${result.imported ?? result.count ?? 'all'} transactions.`);
      }

      setTimeout(() => {
        if (onImportComplete) onImportComplete();
      }, 1800);

    } catch (err) {
      setError(err.message || 'Error importing file');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content text-center" style={{ maxWidth: '500px' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="page-title" style={{ fontSize: '20px' }}>Import Portfolio & Transactions</h2>
          <button className="btn" onClick={onClose} style={{ padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="py-8">
            <CheckCircle size={48} className="profit-positive mx-auto mb-4" />
            <p className="text-primary font-medium">{success}</p>
          </div>
        ) : (
          <>
            <div 
              className="glass-card mb-4 flex-col items-center justify-center py-8 cursor-pointer"
              style={{ borderStyle: 'dashed', borderWidth: '2px' }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <Upload size={32} className="text-secondary mb-3" />
              {file ? (
                <div>
                  <p className="font-medium text-primary">{file.name}</p>
                  <p className="text-muted text-sm mt-1">
                    {(file.size / 1024).toFixed(2)} KB • {isJson ? 'JSON Portfolio Backup' : 'CSV Transactions'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-primary mb-1">Drag and drop your JSON backup or CSV here</p>
                  <p className="text-muted text-sm">Supports Snowball-IF JSON backups and DeGiro / generic CSVs</p>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv,.json" 
                style={{ display: 'none' }} 
              />
            </div>

            {isJson && (
              <div className="glass-card p-3 mb-4 text-left">
                <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Database size={14} /> Import Mode
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="merge" 
                      checked={mode === 'merge'} 
                      onChange={() => setMode('merge')} 
                    />
                    <div>
                      <span className="font-medium text-primary">Merge</span>
                      <span className="text-xs text-muted block">Skip existing duplicates</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input 
                      type="radio" 
                      name="importMode" 
                      value="replace" 
                      checked={mode === 'replace'} 
                      onChange={() => setMode('replace')} 
                    />
                    <div>
                      <span className="font-medium text-primary">Replace</span>
                      <span className="text-xs text-muted block">Overwrite current portfolio</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {error && <div className="mb-4 text-center profit-negative text-sm">{error}</div>}

            <div className="flex justify-end gap-2 mt-4">
              <button className="btn btn-outline" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleImport} 
                disabled={!file || loading}
              >
                {loading ? 'Importing...' : 'Import Data'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportModal;
