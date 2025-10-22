'use client';

import { useState } from 'react';
import storageManager from '../lib/storage/storageManager';

export default function DataBackupUtility() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');

  const handleExport = async () => {
    setIsExporting(true);
    setMessage('Exporting data...');

    try {
      const adapter = storageManager.getClient();
      
      // Check if we're in local storage mode
      if (storageManager.getMode() !== 'local') {
        alert('Data backup is only available in Local Storage mode');
        setIsExporting(false);
        setMessage('');
        return;
      }

      // Export all data
      const exportData = await adapter.exportData();
      
      // Create JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      // Create download link
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bus-schedule-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage('✓ Data exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('✗ Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!confirm('This will replace all current data with the backup. Are you sure?')) {
      event.target.value = '';
      return;
    }

    setIsImporting(true);
    setMessage('Importing data...');

    try {
      const adapter = storageManager.getClient();
      
      // Check if we're in local storage mode
      if (storageManager.getMode() !== 'local') {
        alert('Data restore is only available in Local Storage mode');
        setIsImporting(false);
        setMessage('');
        event.target.value = '';
        return;
      }

      // Read file
      const text = await file.text();
      const importData = JSON.parse(text);

      // Import data
      const stats = await adapter.importData(importData);
      
      setMessage(`✓ Data imported successfully! ${JSON.stringify(stats)}`);
      
      // Refresh page after successful import
      setTimeout(() => {
        alert('Data imported successfully! The page will now refresh.');
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Import error:', error);
      setMessage('✗ Import failed: ' + error.message);
      setIsImporting(false);
    }
    
    event.target.value = '';
  };

  return (
    <div style={{
      padding: '15px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginTop: '20px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#2c3e50' }}>
        📦 Data Backup & Restore
      </h4>
      <p style={{ margin: '0 0 15px 0', fontSize: '13px', color: '#7f8c8d' }}>
        Backup your data regularly to prevent data loss. Only works in Local Storage mode.
      </p>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleExport}
          disabled={isExporting || isImporting}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isExporting || isImporting ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: isExporting || isImporting ? 0.6 : 1
          }}
        >
          {isExporting ? '⏳ Exporting...' : '💾 Export Backup'}
        </button>

        <label style={{
          padding: '8px 16px',
          backgroundColor: '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isExporting || isImporting ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: isExporting || isImporting ? 0.6 : 1,
          display: 'inline-block'
        }}>
          {isImporting ? '⏳ Importing...' : '📂 Import Backup'}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={isExporting || isImporting}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {message && (
        <div style={{
          marginTop: '10px',
          padding: '8px 12px',
          backgroundColor: message.startsWith('✓') ? '#d4edda' : '#f8d7da',
          color: message.startsWith('✓') ? '#155724' : '#721c24',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
