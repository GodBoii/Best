'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SimpleForm from '../components/SimpleForm';
import SimpleFormMulti from '../components/SimpleFormMulti';
import StorageToggle from '../components/StorageToggle';
import BackupReminder from '../components/BackupReminder';
import storageMonitor from '../lib/storage/storageMonitor';
import backupManager from '../lib/storage/backupManager';
import '../styles/globals.css';

export default function Home() {
  const [isMultiMode, setIsMultiMode] = useState(true);
  const [showDataLossWarning, setShowDataLossWarning] = useState(false);

  useEffect(() => {
    // Run startup checks
    initializeApp();
  }, []);

  const initializeApp = async () => {
    // Perform startup health check
    const healthCheck = await storageMonitor.performStartupCheck();
    
    if (!healthCheck.success) {
      console.error('Startup health check failed:', healthCheck);
    }

    // Check for data loss
    const dataLossCheck = await storageMonitor.detectDataLoss();
    if (dataLossCheck.dataLoss) {
      setShowDataLossWarning(true);
      alert(`⚠️ WARNING: Data may have been lost!\n\nLast session: ${dataLossCheck.lastSession}\nLast backup: ${dataLossCheck.lastBackup || 'None'}\n\nPlease restore from your backup file.`);
    }

    // Perform auto-backup if needed
    const autoBackupResult = await backupManager.performAutoBackup();
    if (autoBackupResult.success) {
      console.log('✅ Auto-backup completed');
      showToast('✅ Daily backup saved to Downloads');
    }

    // Start monitoring (check every hour)
    storageMonitor.startMonitoring(60);
  };

  const showToast = (message) => {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  return (
    <div className="app-container">
      <BackupReminder />
      
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
        <Link href="/fleet">
          <button>FLEET Schedule</button>
        </Link>
        <Link href="/settings">
          <button>⚙️ Settings</button>
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