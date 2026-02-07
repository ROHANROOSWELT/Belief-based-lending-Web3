import React, { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import { Moon, Sun } from 'lucide-react';
import Dashboard from './components/Dashboard';
import RiskView from './components/RiskView';
import DocsView from './components/DocsView';

const Marketplace = React.lazy(() => import('./components/Marketplace'));
const ActivityPage = React.lazy(() => import('./components/ActivityPage'));

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('bbl-theme') || 'dark';
  });

  const [currentView, setCurrentView] = useState('dashboard');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('bbl-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'borrow': return <Suspense fallback={<div>Loading...</div>}><Marketplace /></Suspense>;
      case 'risk': return <RiskView />;
      case 'activity': return <Suspense fallback={<div>Loading...</div>}><ActivityPage /></Suspense>;
      case 'docs': return <DocsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <>
      <div className="background-layer">
        <div className="wave-shape"></div>
      </div>

      <div className="app-container">
        <nav className="top-nav">
          <div className="logo-section" onClick={() => setCurrentView('dashboard')} style={{ cursor: 'pointer' }}>
            <span className="logo-mark">BBL</span>
            <span className="protocol-name">Belief-Based Lending</span>
          </div>

          <div className="nav-links">
            <button
              className={currentView === 'dashboard' ? 'active' : ''}
              onClick={() => setCurrentView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={currentView === 'borrow' ? 'active' : ''}
              onClick={() => setCurrentView('borrow')}
            >
              Borrow
            </button>
            <button
              className={currentView === 'risk' ? 'active' : ''}
              onClick={() => setCurrentView('risk')}
            >
              Risk
            </button>
            <button
              className={currentView === 'docs' ? 'active' : ''}
              onClick={() => setCurrentView('docs')}
            >
              Docs
            </button>
            <button
              className={currentView === 'activity' ? 'active' : ''}
              onClick={() => setCurrentView('activity')}
            >
              Activity
            </button>
          </div>

          <div className="nav-actions">
            <div className="theme-toggle">
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                {theme === 'dark' ?
                  <Sun className="sun-icon" size={20} color="var(--text-secondary)" /> :
                  <Moon className="moon-icon" size={20} color="var(--text-secondary)" />
                }
              </button>
            </div>
            <div className="wallet-wrapper">
              <ConnectButton />
            </div>
          </div>
        </nav>

        <main className="dashboard-grid-container">
          {renderView()}
        </main>
      </div>

      <style>{`
        .nav-links button {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1rem;
            font-weight: 500;
            padding: 8px 16px;
            cursor: pointer;
            transition: color 0.2s ease;
        }
        .nav-links button.active {
            color: var(--text-primary);
            position: relative;
        }
        .nav-links button.active::after {
            content: '';
            position: absolute;
            bottom: -22px;
            left: 0;
            width: 100%;
            height: 2px;
            background: var(--accent-primary);
        }
        .nav-links button:hover {
            color: var(--text-primary);
        }
      `}</style>
    </>
  );
}

export default App;
