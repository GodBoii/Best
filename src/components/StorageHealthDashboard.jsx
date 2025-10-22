'use client';

import { useState, useEffect } from 'react';
import storageMonitor from '../lib/storage/storageMonitor';
import backupManager from '../lib/storage/backupManager';
import storageManager from '../lib/storage/storageManager';

export default function StorageHealthDashboard() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    setLoading(true);
    try {
      const healthData = await storageMonitor.getStorageHealth();
      setHealth(healthData);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const result = await backupManager.performManualBackup();
      if (result.success) {
        alert('✅ Backup exported successfully to Downloads folder!');
        await loadHealthData();
      } else {
        alert('❌ Export failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Export error: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (confirm('⚠️ Import backup? This will replace all current data. Make sure you have a recent backup first!')) {
        setIsImporting(true);
        try {
          await storageManager.importLocalData(file);
          alert('✅ Backup imported successfully!');
          window.location.reload();
        } catch (error) {
          alert('❌ Import failed: ' + error.message);
        } finally {
          setIsImporting(false);
        }
      }
    };

    input.click();
  };

  const handleRequestPersistence = async () => {
    if (!navigator.storage || !navigator.storage.persist) {
      alert('❌ Persistent storage not supported by this browser');
      return;
    }

    const granted = await navigator.storage.persist();
    if (granted) {
      alert('✅ Persistent storage granted! Your data is now better protected.');
      await loadHealthData();
    } else {
      alert('⚠️ Persistent storage not granted.\n\nTo improve data protection:\n1. Bookmark this page (Ctrl+D)\n2. Visit daily for a few days\n3. Chrome will automatically grant persistence');
    }
  };

  if (loading) {
    return (
      <div className="health-dashboard loading">
        <p>Loading storage health...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="health-dashboard error">
        <p>❌ Unable to load storage health information</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
      case 'good':
        return '#28a745';
      case 'caution':
      case 'warning':
        return '#ffc107';
      case 'critical':
      case 'error':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
      case 'good':
        return '✅';
      case 'caution':
      case 'warning':
        return '⚠️';
      case 'critical':
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="health-dashboard">
      <div className="dashboard-header">
        <h2>Storage Health Dashboard</h2>
        <button onClick={loadHealthData} className="btn-refresh">
          🔄 Refresh
        </button>
      </div>

      {/* Overall Status */}
      <div 
        className="status-card overall-status"
        style={{ borderLeftColor: getStatusColor(health.overall.status) }}
      >
        <div className="status-icon">{getStatusIcon(health.overall.status)}</div>
        <div className="status-content">
          <h3>Overall Status: {health.overall.status.toUpperCase()}</h3>
          <p>{health.overall.message}</p>
        </div>
      </div>

      {/* Browser Info */}
      <div className="info-section">
        <h3>Browser Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Browser:</span>
            <span className="info-value">
              {health.browser.name} {health.browser.version}
              {health.browser.recommended ? ' ✅' : ' ⚠️'}
            </span>
          </div>
          {!health.browser.recommended && (
            <div className="info-warning">
              ⚠️ For best results, use Chrome or Edge browser
            </div>
          )}
        </div>
      </div>

      {/* Storage Info */}
      <div className="info-section">
        <h3>Storage Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Persistent Storage:</span>
            <span className="info-value">
              {health.storage.isPersisted ? '✅ Yes' : '⚠️ No'}
            </span>
          </div>
          {!health.storage.isPersisted && (
            <div className="info-action">
              <button onClick={handleRequestPersistence} className="btn-action">
                🔒 Request Persistent Storage
              </button>
              <p className="help-text">
                Bookmark this page (Ctrl+D) to help Chrome grant persistent storage
              </p>
            </div>
          )}
          <div className="info-item">
            <span className="info-label">Used Space:</span>
            <span className="info-value">{health.storage.usageMB} MB</span>
          </div>
          <div className="info-item">
            <span className="info-label">Available Space:</span>
            <span className="info-value">{health.storage.quotaMB} MB</span>
          </div>
          <div className="info-item">
            <span className="info-label">Usage:</span>
            <span className="info-value">
              {health.storage.percentUsed}%
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${health.storage.percentUsed}%`,
                    backgroundColor: getStatusColor(health.storage.quotaStatus)
                  }}
                />
              </div>
            </span>
          </div>
          {health.storage.quotaStatus !== 'healthy' && (
            <div className="info-warning">
              {health.storage.quotaMessage}
            </div>
          )}
        </div>
      </div>

      {/* Database Info */}
      <div className="info-section">
        <h3>Database Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">
              {health.database.accessible ? '✅ Accessible' : '❌ Not Accessible'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Total Records:</span>
            <span className="info-value">{health.database.totalRecords || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Integrity:</span>
            <span className="info-value">
              {health.database.integrity?.isValid ? '✅ Valid' : '❌ Issues Found'}
            </span>
          </div>
        </div>
        
        {health.database.tables && (
          <details className="table-details">
            <summary>View Table Statistics</summary>
            <div className="table-stats">
              {Object.entries(health.database.tables).map(([table, count]) => (
                <div key={table} className="table-stat">
                  <span>{table}:</span>
                  <span>{count} records</span>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Backup Info */}
      <div className="info-section">
        <h3>Backup Status</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span 
              className="info-value"
              style={{ color: getStatusColor(health.backup.status) }}
            >
              {getStatusIcon(health.backup.status)} {health.backup.message}
            </span>
          </div>
          {health.backup.lastBackup && (
            <>
              <div className="info-item">
                <span className="info-label">Last Backup:</span>
                <span className="info-value">{health.backup.lastBackup}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Days Ago:</span>
                <span className="info-value">{health.backup.daysAgo}</span>
              </div>
            </>
          )}
        </div>

        <div className="backup-actions">
          <button 
            onClick={handleExportBackup}
            disabled={isExporting}
            className="btn-backup"
          >
            {isExporting ? '⏳ Exporting...' : '📥 Export Backup'}
          </button>
          <button 
            onClick={handleImportBackup}
            disabled={isImporting}
            className="btn-restore"
          >
            {isImporting ? '⏳ Importing...' : '📤 Import Backup'}
          </button>
        </div>
      </div>

      {/* Recommendations */}
      {health.overall.issues && health.overall.issues.length > 0 && (
        <div className="recommendations">
          <h3>⚠️ Recommendations</h3>
          <ul>
            {health.overall.issues.map((issue, index) => (
              <li key={index}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <style jsx>{`
        .health-dashboard {
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .health-dashboard.loading,
        .health-dashboard.error {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .dashboard-header h2 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }

        .btn-refresh {
          background: white;
          border: 2px solid #007bff;
          color: #007bff;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-refresh:hover {
          background: #007bff;
          color: white;
        }

        .status-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #ccc;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }

        .status-icon {
          font-size: 48px;
          line-height: 1;
        }

        .status-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #333;
        }

        .status-content p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .info-section {
          background: white;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .info-section h3 {
          margin: 0 0 16px 0;
          font-size: 16px;
          color: #333;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 8px;
        }

        .info-grid {
          display: grid;
          gap: 12px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .info-label {
          font-weight: 600;
          color: #666;
          font-size: 14px;
        }

        .info-value {
          color: #333;
          font-size: 14px;
          text-align: right;
          flex: 1;
          margin-left: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          margin-top: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .info-warning {
          background: #fff3cd;
          border-left: 3px solid #ffc107;
          padding: 12px;
          border-radius: 4px;
          color: #856404;
          font-size: 13px;
          margin-top: 8px;
        }

        .info-action {
          margin-top: 12px;
        }

        .btn-action {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: #0056b3;
        }

        .help-text {
          margin: 8px 0 0 0;
          font-size: 12px;
          color: #666;
          font-style: italic;
        }

        .table-details {
          margin-top: 12px;
          cursor: pointer;
        }

        .table-details summary {
          font-size: 13px;
          color: #007bff;
          padding: 8px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .table-details summary:hover {
          background: #e9ecef;
        }

        .table-stats {
          margin-top: 8px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .table-stat {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 13px;
          color: #666;
        }

        .backup-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
        }

        .btn-backup,
        .btn-restore {
          flex: 1;
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-backup {
          background: #28a745;
          color: white;
        }

        .btn-backup:hover:not(:disabled) {
          background: #218838;
        }

        .btn-restore {
          background: #17a2b8;
          color: white;
        }

        .btn-restore:hover:not(:disabled) {
          background: #138496;
        }

        .btn-backup:disabled,
        .btn-restore:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .recommendations {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 16px;
          border-radius: 4px;
        }

        .recommendations h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: #856404;
        }

        .recommendations ul {
          margin: 0;
          padding-left: 20px;
        }

        .recommendations li {
          color: #856404;
          font-size: 14px;
          margin-bottom: 8px;
        }

        @media (max-width: 768px) {
          .health-dashboard {
            padding: 12px;
          }

          .dashboard-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .backup-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
