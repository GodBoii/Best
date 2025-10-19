'use client';

import Link from 'next/link';
import SimpleForm from '../components/SimpleForm';
import '../styles/globals.css';

export default function Home() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bus Schedule Management System</h1>
      </header>

      <nav className="app-nav">
        <Link href="/">
          <button className="active">Schedule Entry</button>
        </Link>
        <Link href="/report">
          <button>Generate Report</button>
        </Link>
      </nav>

      <main className="app-main">
        <SimpleForm />
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
