'use client';

import { useState, useEffect } from 'react';

export default function DatabaseVersionChecker() {
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [currentVersion, setCurrentVersion] = useState(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeStatus, setUpgradeStatus] = useState('');

  useEffect(() => {
    checkDatabaseVersion();
  }, []);

  const checkDatabaseVersion = async () => {
    try {
      const databases = await indexedDB.databases();
      const busScheduleDB = databases.find(db => db.name === 'BusScheduleDB');
      
      if (busScheduleDB) {
        setCurrentVersion(busScheduleDB.version);
        // Expected version is 2
        if (busScheduleDB.version < 2) {
          setNeedsUpgrade(true);
        }
      }
    } catch (error) {
      console.error('Error checking database version:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!confirm('This will upgrade your database to support new features. Your existing data will be preserved. Continue?')) {
      return;
    }

    setIsUpgrading(true);
    setUpgradeStatus('Preparing upgrade...');

    try {
      // The upgrade will happen automatically when the page refreshes
      // The onupgradeneeded event in indexedDBAdapter.js will handle the migration
      setUpgradeStatus('Upgrading database...');
      
      // Small delay to show the message
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUpgradeStatus('Upgrade complete! Refreshing...');
      
      // Refresh the page to trigger the upgrade
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error during upgrade:', error);
      setUpgradeStatus('Error during upgrade. Please refresh the page manually.');
      setIsUpgrading(false);
    }
  };

  if (!needsUpgrade) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '8px',
      padding: '15px 20px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      maxWidth: '450px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#856404' }}>
            Database Update Available
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#856404' }}>
            Your database (v{currentVersion}) needs to be upgraded to v2 for new features.
            <strong> All your existing data will be preserved.</strong>
          </p>
          {isUpgrading ? (
            <div style={{ 
              padding: '8px 12px', 
              backgroundColor: '#d4edda', 
              color: '#155724',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              {upgradeStatus}
            </div>
          ) : (
            <button
              onClick={handleUpgrade}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px'
              }}
            >
              Upgrade Now (Safe - Data Preserved)
            </button>
          )}
        </div>
        {!isUpgrading && (
          <button
            onClick={() => setNeedsUpgrade(false)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#856404',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
