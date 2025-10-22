'use client';

import Link from 'next/link';
import FleetSchedule from '../../components/FleetSchedule';
import StorageToggle from '../../components/StorageToggle';
import '../../styles/globals.css';

export default function FleetPage() {
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
        <Link href="/report">
          <button>Depot Report</button>
        </Link>
        <Link href="/summary">
          <button>Summary Report</button>
        </Link>
        <Link href="/fleet">
          <button className="active">FLEET Schedule</button>
        </Link>
      </nav>

      <main className="app-main">
        <FleetSchedule />
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
