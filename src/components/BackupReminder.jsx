'use client';

import { useState, useEffect } from 'react';
import backupManager from '../lib/storage/backupManager';
import storageManager from '../lib/storage/storageManager';

export default function BackupReminder() {
  const [showReminder, setShowReminder] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    checkIfReminderNeeded();
  }, []);

  const checkIfReminderNeeded = async () => {
    const needsReminder = await backupManager.checkBackupReminder();
    const status = backupManager.getBackupStatus();
    
    setBackupStatus(status);
    setShowReminder(needsReminder);
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const result = await backupManager.performManualBackup();
      if (result.success) {
        alert('✅ Backup saved to Downloads folder successfully!');
        setShowReminder(false);
        setBackupStatus(backupManager.getBackupStatus());
      } else {
        alert('❌ Backup failed: ' + result.error);
      }
    } catch (error) {
      alert('❌ Backup error: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDismiss = () => {
    backupManager.dismissReminderForToday();
    setShowReminder(false);
  };

  if (!showReminder) {
    return null;
  }

  return (
    <div className="backup-reminder-overlay">
      <div className="backup-reminder-banner">
        <div className="reminder-icon">💾</div>
        <div className="reminder-content">
          <h3>Daily Backup Reminder</h3>
          <p>
            {backupStatus?.status === 'never' 
              ? 'No backup found. Create your first backup to protect your data.'
              : `Last backup: ${backupStatus?.lastBackupDate || 'Unknown'}. Create today's backup?`
            }
          </p>
          <div className="reminder-actions">
            <button 
              onClick={handleExportBackup} 
              disabled={isExporting}
              className="btn-backup-now"
            >
              {isExporting ? '⏳ Exporting...' : '📥 Export Backup Now'}
            </button>
            <button 
              onClick={handleDismiss}
              className="btn-dismiss"
            >
              Remind Me Tomorrow
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .backup-reminder-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          pointer-events: none;
        }

        .backup-reminder-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
          border-bottom: 3px solid #ffc107;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideDown 0.3s ease-out;
          pointer-events: auto;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .reminder-icon {
          font-size: 48px;
          line-height: 1;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .reminder-content {
          flex: 1;
        }

        .reminder-content h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          color: #856404;
          font-weight: 600;
        }

        .reminder-content p {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #856404;
          line-height: 1.5;
        }

        .reminder-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-backup-now {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-backup-now:hover:not(:disabled) {
          background: #218838;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .btn-backup-now:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-dismiss {
          background: white;
          color: #856404;
          border: 2px solid #ffc107;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-dismiss:hover {
          background: #ffc107;
          color: white;
        }

        @media (max-width: 768px) {
          .backup-reminder-banner {
            flex-direction: column;
            text-align: center;
          }

          .reminder-icon {
            font-size: 36px;
          }

          .reminder-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
