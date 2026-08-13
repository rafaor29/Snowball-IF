import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught runtime error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div className="glass-card flex-col items-center" style={{ maxWidth: '540px', width: '100%', padding: '36px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-red)',
              marginBottom: '20px'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
              Something went wrong
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
              An error occurred while loading this section.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px 16px',
                width: '100%',
                textAlign: 'left',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: '#f87171',
                marginBottom: '24px',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button 
                className="btn btn-primary" 
                onClick={() => window.location.reload()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </button>

              <a 
                href="/" 
                className="btn btn-outline" 
                onClick={this.handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Home size={16} />
                <span>Dashboard</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
