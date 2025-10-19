'use client';

import SimpleForm from '../components/SimpleForm';
import '../styles/globals.css';

export default function Home() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bus Schedule Management System</h1>
      </header>

      <main className="app-main">
        <SimpleForm />
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
