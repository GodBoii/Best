'use client';

import React from 'react';
import Link from 'next/link';
import OtherDutiesManager from '../../components/OtherDutiesManager';
import PlatformMasterManager from '../../components/PlatformMasterManager';
import PlatformDutyMasterManager from '../../components/PlatformDutyMasterManager';
import StorageToggle from '../../components/StorageToggle';
import '../../styles/globals.css';
import '../../styles/other-duties.css';

export default function OtherDutiesPage() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Other Duties Management</h1>
        <StorageToggle />
      </header>

      <nav className="app-nav">
        <Link href="/">
          <button>Schedule Entry</button>
        </Link>
        <Link href="/report">
          <button>Depot Report</button>
        </Link>
        <Link href="/summary">
          <button>Summary Report</button>
        </Link>
        <Link href="/fleet">
          <button>FLEET Schedule</button>
        </Link>
        <Link href="/other-duties">
          <button className="active">Other Duties</button>
        </Link>
      </nav>

      <main className="app-main">
        {/* Master Data Management Section */}
        <div className="master-data-section" style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Master Data Configuration</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '20px' }}>
            <PlatformMasterManager />
            <PlatformDutyMasterManager />
          </div>
        </div>

        {/* Other Duties Entry Section */}
        <OtherDutiesManager />
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
