'use client';

import Link from 'next/link';
import StorageHealthDashboard from '../../components/StorageHealthDashboard';
import '../../styles/globals.css';

export default function SettingsPage() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Storage Settings & Health</h1>
      </header>

      <nav className="app-nav">
        <Link href="/">
          <button>Schedule Entry</button>
        </Link>
        <Link href="/modifications">
          <button>Schedule Modifications</button>
        </Link>
        <Link href="/reports">
          <button>Reports</button>
        </Link>
        <Link href="/fleet">
          <button>FLEET Schedule</button>
        </Link>
        <Link href="/other-duties">
          <button>Other Duties</button>
        </Link>
        <Link href="/settings">
          <button className="active">⚙️ Settings</button>
        </Link>
      </nav>

      <main className="app-main">
        <StorageHealthDashboard />
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
