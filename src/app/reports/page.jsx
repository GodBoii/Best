'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import StorageToggle from '../../components/StorageToggle';
import DepotReportSection from '../../components/DepotReportSection';
import SummaryReportSection from '../../components/SummaryReportSection';
import '../../styles/globals.css';

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('depot');

  useEffect(() => {
    // Check if tab parameter is in URL
    const tab = searchParams.get('tab');
    if (tab === 'summary') {
      setActiveTab('summary');
    }
  }, [searchParams]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bus Schedule Management System</h1>
        <StorageToggle />
      </header>

      <nav className="app-nav">
        <Link href="/">
          <button>Schedule Entry</button>
        </Link>
        <Link href="/modifications">
          <button>Schedule Modifications</button>
        </Link>
        <Link href="/reports">
          <button className="active">Reports</button>
        </Link>
        <Link href="/fleet">
          <button>FLEET Schedule</button>
        </Link>
        <Link href="/other-duties">
          <button>Other Duties</button>
        </Link>
        <Link href="/settings">
          <button>⚙️ Settings</button>
        </Link>
      </nav>

      <main className="app-main">
        <div className="reports-container">
          <div className="reports-tabs">
            <button
              className={`tab-button ${activeTab === 'depot' ? 'active' : ''}`}
              onClick={() => setActiveTab('depot')}
            >
              Depot Report
            </button>
            <button
              className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              Summary Report
            </button>
          </div>

          <div className="reports-content">
            {activeTab === 'depot' && <DepotReportSection />}
            {activeTab === 'summary' && <SummaryReportSection />}
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
