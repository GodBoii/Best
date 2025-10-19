'use client';

import { useState } from 'react';
import Link from 'next/link';
import SimpleForm from '../components/SimpleForm';
import SimpleFormMulti from '../components/SimpleFormMulti';
import StorageToggle from '../components/StorageToggle';
import '../styles/globals.css';

export default function Home() {
  const [isMultiMode, setIsMultiMode] = useState(true);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bus Schedule Management System</h1>
        <StorageToggle />
      </header>

      <nav className="app-nav">
        <Link href="/">
          <button className="active">Schedule Entry</button>
        </Link>
        <Link href="/report">
          <button>Depot Report</button>
        </Link>
        <Link href="/summary">
          <button>Summary Report</button>
        </Link>
      </nav>

      {/* Mode Toggle */}
      <div className="mode-toggle-container">
        <button
          onClick={() => setIsMultiMode(false)}
          className={`mode-toggle-btn ${!isMultiMode ? 'active' : ''}`}
        >
          Single Entry Mode
        </button>
        <button
          onClick={() => setIsMultiMode(true)}
          className={`mode-toggle-btn ${isMultiMode ? 'active' : ''}`}
        >
          Multi-Input Mode
        </button>
      </div>

      <main className="app-main">
        {isMultiMode ? <SimpleFormMulti /> : <SimpleForm />}
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}