'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import StorageToggle from '../../components/StorageToggle';
import ReportsContent from '../../components/ReportsContent';
import '../../styles/globals.css';

export default function ReportsPage() {
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
        <Suspense fallback={
          <div className="reports-container">
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p>Loading reports...</p>
            </div>
          </div>
        }>
          <ReportsContent />
        </Suspense>
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
