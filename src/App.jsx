import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Holdings from './pages/Holdings';
import Transactions from './pages/Transactions';
import Sectors from './pages/Sectors';
import Dividends from './pages/Dividends';
import FindTheDip from './pages/FindTheDip';
import Performance from './pages/Performance';
import { useState } from 'react';
import TransactionModal from './components/TransactionModal';
import ImportModal from './components/ImportModal';
import ExportModal from './components/ExportModal';
import SettingsModal from './components/SettingsModal';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  
  const handleDataChange = () => setRefreshKey(prev => prev + 1);

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar 
          onAddTransaction={() => setShowTransactionModal(true)}
          onExportData={() => setShowExportModal(true)}
          onImportCsv={() => setShowImportModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
        />
        <main className="main-content">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard key={refreshKey} />} />
              <Route path="/holdings" element={<Holdings key={refreshKey} onAddTransaction={() => setShowTransactionModal(true)} />} />
              <Route path="/transactions" element={<Transactions key={refreshKey} onDataChange={handleDataChange} />} />
              <Route path="/sectors" element={<Sectors key={refreshKey} />} />
              <Route path="/dividends" element={<Dividends key={refreshKey} />} />
              <Route path="/find-the-dip" element={<FindTheDip key={refreshKey} />} />
              <Route path="/find-the-deep" element={<Navigate to="/find-the-dip" replace />} />
              <Route path="/performance" element={<Performance key={refreshKey} />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
      
      {showTransactionModal && (
        <TransactionModal 
          onClose={() => setShowTransactionModal(false)} 
          onSave={() => { setShowTransactionModal(false); handleDataChange(); }}
        />
      )}
      {showExportModal && (
        <ExportModal 
          onClose={() => setShowExportModal(false)} 
        />
      )}
      {showImportModal && (
        <ImportModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={() => { setShowImportModal(false); handleDataChange(); }}
        />
      )}
      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)} 
          onSave={() => { setShowSettingsModal(false); handleDataChange(); }}
        />
      )}
    </BrowserRouter>
  );
}

export default App;
