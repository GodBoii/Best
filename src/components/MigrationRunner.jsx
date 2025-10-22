'use client';

import { useEffect, useState } from 'react';
import storageManager from '../lib/storage/storageManager';
import { checkMigrationStatus, runAllMigrations } from '../lib/storage/migrations';

/**
 * MigrationRunner Component
 * Automatically checks and runs database migrations when needed
 * Only runs for local storage mode
 */
export default function MigrationRunner() {
  const [migrationStatus, setMigrationStatus] = useState('checking');
  const [migrationResult, setMigrationResult] = useState(null);

  useEffect(() => {
    checkAndRunMigrations();
  }, []);

  const checkAndRunMigrations = async () => {
    // Only run migrations for local storage
    const mode = storageManager.getMode();
    if (mode !== 'local') {
      setMigrationStatus('skipped');
      return;
    }

    try {
      console.log('🔍 Checking migration status...');
      const status = await checkMigrationStatus(storageManager);

      if (status.needsMigration) {
        console.log('⚠️ Migrations needed, running...');
        setMigrationStatus('running');
        
        const results = await runAllMigrations(storageManager);
        
        setMigrationResult(results);
        setMigrationStatus('completed');
        
        console.log('✅ Migrations completed:', results);
      } else {
        console.log('✅ No migrations needed');
        setMigrationStatus('up-to-date');
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      setMigrationStatus('error');
      setMigrationResult({ error: error.message });
    }
  };

  // Don't render anything - this is a background process
  // You can optionally show a toast/notification here
  if (migrationStatus === 'running') {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#4CAF50',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        zIndex: 9999,
        fontSize: '14px'
      }}>
        🔄 Running database migrations...
      </div>
    );
  }

  if (migrationStatus === 'completed' && migrationResult) {
    const totalMigrated = migrationResult.reduce((sum, r) => sum + (r.migrated || 0), 0);
    
    if (totalMigrated > 0) {
      return (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#4CAF50',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 9999,
          fontSize: '14px',
          animation: 'fadeOut 3s forwards',
          animationDelay: '2s'
        }}>
          ✅ Database updated: {totalMigrated} entries migrated
        </div>
      );
    }
  }

  return null;
}
