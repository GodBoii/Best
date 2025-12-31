'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';

export default function StorageToggle() {
  const [storageInfo, setStorageInfo] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      const info = await storageManager.getStorageInfo();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const handleExportData = async () => {
    setIsBusy(true);
    try {
      await storageManager.exportLocalData();
      alert('Data exported successfully!');
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data: ' + error.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleImportData = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (confirm('Import data? This will replace all existing local data.')) {
        setIsBusy(true);
        try {
          await storageManager.importLocalData(file);
          alert('Data imported successfully!');
          window.location.reload();
        } catch (error) {
          console.error('Error importing data:', error);
          alert('Error importing data: ' + error.message);
        } finally {
          setIsBusy(false);
        }
      }
    };

    input.click();
  };

  const handleClearData = async () => {
    if (!confirm('Clear all local data? This action cannot be undone.')) {
      return;
    }

    setIsBusy(true);
    try {
      await storageManager.clearLocalData();
      alert('All local data cleared.');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data: ' + error.message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="storage-toggle-container">
      <div className="storage-toggle-main">
        <div className="storage-status">
          <span className="storage-label">Storage:</span>
          <span className="storage-mode local">💾 Local (IndexedDB)</span>
        </div>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="btn-menu"
          title="Storage Options"
        >
          ⚙️
        </button>
      </div>

      {showMenu && (
        <div className="storage-menu">
          <div className="storage-menu-header">
            <h4>Storage Options</h4>
            <button onClick={() => setShowMenu(false)} className="btn-close">✕</button>
          </div>

          {storageInfo && (
            <div className="storage-info">
              <p><strong>Storage Used:</strong> {storageInfo.usageMB} MB</p>
              <p><strong>Storage Quota:</strong> {storageInfo.quotaMB} MB</p>
              <p><strong>Usage:</strong> {storageInfo.percentUsed}%</p>
            </div>
          )}

          <div className="storage-actions">
            <button onClick={handleExportData} disabled={isBusy} className="btn-action">
              📥 Export Data
            </button>
            <button onClick={handleImportData} disabled={isBusy} className="btn-action">
              📤 Import Data
            </button>
            <button onClick={handleClearData} disabled={isBusy} className="btn-action danger">
              🧹 Clear Local Data
            </button>
          </div>

          <div className="storage-help">
            <p className="help-text">
              💾 All application data is stored locally in your browser.
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .storage-toggle-container {
          position: relative;
        }

        .storage-toggle-main {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 8px;
          border: 1px solid #ddd;
        }

        .storage-status {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .storage-label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }

        .storage-mode {
          font-size: 14px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .storage-mode.local {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .btn-menu {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.2s;
        }

        .btn-menu:hover {
          background: #f0f0f0;
          transform: scale(1.05);
        }

        .storage-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          padding: 16px;
          min-width: 300px;
          z-index: 1000;
        }

        .storage-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #eee;
        }

        .storage-menu-header h4 {
          margin: 0;
          font-size: 16px;
          color: #333;
        }

        .btn-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 24px;
          height: 24px;
        }

        .btn-close:hover {
          color: #333;
        }

        .storage-info {
          background: #f9f9f9;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        .storage-info p {
          margin: 6px 0;
          font-size: 13px;
          color: #555;
        }

        .storage-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .btn-action {
          background: white;
          border: 1px solid #ddd;
          border-radius: 6px;
          padding: 10px 14px;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
          transition: all 0.2s;
        }

        .btn-action:hover {
          background: #f5f5f5;
          border-color: #999;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-action.danger {
          border-color: #f5c6cb;
          color: #c82333;
        }

        .btn-action.danger:hover {
          background: #f8d7da;
          border-color: #c82333;
        }

        .storage-help {
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .help-text {
          margin: 0;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
