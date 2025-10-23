'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SummaryReport from '../../components/SummaryReport';
import StorageToggle from '../../components/StorageToggle';
import '../../styles/globals.css';

export default function SummaryPage() {
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
          <button className="active">Summary Report</button>
        </Link>
        <Link href="/fleet">
          <button>FLEET Schedule</button>
        </Link>
        <Link href="/other-duties">
          <button>Other Duties</button>
        </Link>
      </nav>

      <main className="app-main">
        <SummaryReport />
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
