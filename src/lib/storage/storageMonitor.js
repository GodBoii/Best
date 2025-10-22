/**
 * Storage Monitor for Health Checks and Diagnostics
 * Monitors IndexedDB health, quota, and data integrity
 */

import storageManager from './storageManager';

class StorageMonitor {
  constructor() {
    this.healthCheckInterval = null;
  }

  /**
   * Get comprehensive storage information
   */
  async getStorageHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      browser: this.getBrowserInfo(),
      storage: await this.getStorageInfo(),
      database: await this.getDatabaseInfo(),
      backup: this.getBackupInfo(),
      overall: 'unknown'
    };

    // Calculate overall health status
    health.overall = this.calculateOverallHealth(health);

    return health;
  }

  /**
   * Get browser information
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (ua.indexOf('Chrome') > -1 && ua.indexOf('Edg') === -1) {
      browserName = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.indexOf('Edg') > -1) {
      browserName = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.indexOf('Firefox') > -1) {
      browserName = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      browserVersion = match ? match[1] : 'Unknown';
    } else if (ua.indexOf('Safari') > -1) {
      browserName = 'Safari';
    }

    return {
      name: browserName,
      version: browserVersion,
      userAgent: ua,
      recommended: browserName === 'Chrome' || browserName === 'Edge'
    };
  }

  /**
   * Get storage quota and usage information
   */
  async getStorageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return {
        supported: false,
        message: 'Storage API not supported'
      };
    }

    const estimate = await navigator.storage.estimate();
    const isPersisted = await navigator.storage.persisted();

    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? (usage / quota * 100) : 0;

    let quotaStatus = 'healthy';
    let quotaMessage = 'Storage usage is healthy';

    if (percentUsed > 90) {
      quotaStatus = 'critical';
      quotaMessage = 'Storage almost full - archive old data urgently';
    } else if (percentUsed > 75) {
      quotaStatus = 'warning';
      quotaMessage = 'Storage filling up - consider archiving old data';
    } else if (percentUsed > 50) {
      quotaStatus = 'caution';
      quotaMessage = 'Storage usage moderate';
    }

    return {
      supported: true,
      usage: usage,
      quota: quota,
      usageMB: (usage / 1024 / 1024).toFixed(2),
      quotaMB: (quota / 1024 / 1024).toFixed(2),
      percentUsed: percentUsed.toFixed(2),
      isPersisted: isPersisted,
      persistenceStatus: isPersisted ? 'granted' : 'not_granted',
      quotaStatus: quotaStatus,
      quotaMessage: quotaMessage,
      available: quota - usage,
      availableMB: ((quota - usage) / 1024 / 1024).toFixed(2)
    };
  }

  /**
   * Get database statistics
   */
  async getDatabaseInfo() {
    try {
      const tables = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries', 'fleet_entries'];
      const counts = {};
      let totalRecords = 0;

      for (const table of tables) {
        try {
          const { data } = await storageManager.from(table).select('*');
          const count = data ? data.length : 0;
          counts[table] = count;
          totalRecords += count;
        } catch (error) {
          counts[table] = 'error';
        }
      }

      // Check database integrity
      const integrity = await storageManager.indexedDBAdapter.verifyIntegrity();

      return {
        accessible: true,
        tables: counts,
        totalRecords: totalRecords,
        integrity: integrity,
        status: integrity.isValid ? 'healthy' : 'corrupted'
      };
    } catch (error) {
      return {
        accessible: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Get backup information
   */
  getBackupInfo() {
    const lastBackup = localStorage.getItem('last_backup_date');
    const lastAutoBackup = localStorage.getItem('last_auto_backup');
    const emergencyBackup = localStorage.getItem('emergency_backup_date');

    if (!lastBackup) {
      return {
        status: 'never',
        message: 'No backup found - create backup immediately',
        lastBackup: null,
        daysAgo: null
      };
    }

    const lastBackupDate = new Date(lastBackup);
    const today = new Date();
    const diffTime = Math.abs(today - lastBackupDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let status = 'good';
    let message = 'Backup is current';

    if (diffDays === 0) {
      status = 'excellent';
      message = 'Backed up today';
    } else if (diffDays <= 1) {
      status = 'good';
      message = 'Backed up recently';
    } else if (diffDays <= 7) {
      status = 'warning';
      message = `Last backup ${diffDays} days ago`;
    } else {
      status = 'critical';
      message = `Last backup ${diffDays} days ago - URGENT`;
    }

    return {
      status: status,
      message: message,
      lastBackup: lastBackup,
      lastAutoBackup: lastAutoBackup ? new Date(parseInt(lastAutoBackup)).toLocaleString() : null,
      emergencyBackup: emergencyBackup,
      daysAgo: diffDays
    };
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth(health) {
    const issues = [];
    let overallStatus = 'healthy';

    // Check storage persistence
    if (health.storage.supported && !health.storage.isPersisted) {
      issues.push('Storage not persistent - bookmark this page');
      overallStatus = 'warning';
    }

    // Check storage quota
    if (health.storage.quotaStatus === 'critical') {
      issues.push('Storage almost full');
      overallStatus = 'critical';
    } else if (health.storage.quotaStatus === 'warning') {
      issues.push('Storage filling up');
      if (overallStatus === 'healthy') overallStatus = 'warning';
    }

    // Check database
    if (!health.database.accessible) {
      issues.push('Database not accessible');
      overallStatus = 'critical';
    } else if (health.database.status === 'corrupted') {
      issues.push('Database integrity issues');
      overallStatus = 'critical';
    }

    // Check backup
    if (health.backup.status === 'never') {
      issues.push('No backup found');
      overallStatus = 'critical';
    } else if (health.backup.status === 'critical') {
      issues.push('Backup outdated');
      if (overallStatus !== 'critical') overallStatus = 'warning';
    }

    // Check browser
    if (!health.browser.recommended) {
      issues.push('Browser not recommended - use Chrome or Edge');
      if (overallStatus === 'healthy') overallStatus = 'caution';
    }

    return {
      status: overallStatus,
      issues: issues,
      message: issues.length > 0 ? issues.join('; ') : 'All systems healthy'
    };
  }

  /**
   * Perform startup health check
   */
  async performStartupCheck() {
    console.log('🔍 Running startup health check...');

    try {
      // Check if database is accessible
      const { data, error } = await storageManager.from('depots').select('*');
      if (error) {
        console.error('❌ Database error:', error);
        return {
          success: false,
          error: 'Database not accessible',
          action: 'restore_from_backup'
        };
      }
      console.log('✅ Database accessible');

      // Check persistence
      if (navigator.storage && navigator.storage.persisted) {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          console.warn('⚠️ Storage not persistent - bookmark this page for better data protection');
        } else {
          console.log('✅ Storage is persistent');
        }
      }

      // Check storage quota
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const percentUsed = (estimate.usage / estimate.quota) * 100;
        if (percentUsed > 80) {
          console.warn(`⚠️ Storage ${percentUsed.toFixed(1)}% full - consider archiving old data`);
        } else {
          console.log(`✅ Storage usage: ${percentUsed.toFixed(1)}%`);
        }
      }

      // Check backup status
      const lastBackup = localStorage.getItem('last_backup_date');
      if (!lastBackup) {
        console.warn('⚠️ No backup found - export backup today');
      } else {
        const backupDate = new Date(lastBackup);
        const daysAgo = Math.floor((Date.now() - backupDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo > 7) {
          console.warn(`⚠️ Last backup was ${daysAgo} days ago`);
        } else {
          console.log(`✅ Last backup: ${lastBackup}`);
        }
      }

      console.log('✅ Startup health check complete');
      return { success: true };

    } catch (error) {
      console.error('❌ Startup health check failed:', error);
      return {
        success: false,
        error: error.message,
        action: 'contact_support'
      };
    }
  }

  /**
   * Check if data was recently cleared
   */
  async detectDataLoss() {
    const lastSession = localStorage.getItem('last_session');
    
    if (!lastSession) {
      // First time user
      localStorage.setItem('last_session', Date.now().toString());
      return { dataLoss: false, firstTime: true };
    }

    // Check if IndexedDB is empty but localStorage has session data
    try {
      const { data } = await storageManager.from('depots').select('*');
      const hasData = data && data.length > 0;

      if (!hasData) {
        // IndexedDB is empty - possible data loss
        const lastBackup = localStorage.getItem('last_backup_date');
        return {
          dataLoss: true,
          lastSession: new Date(parseInt(lastSession)).toLocaleString(),
          lastBackup: lastBackup,
          action: 'restore_from_backup'
        };
      }

      // Update session timestamp
      localStorage.setItem('last_session', Date.now().toString());
      return { dataLoss: false };

    } catch (error) {
      return {
        dataLoss: true,
        error: error.message,
        action: 'restore_from_backup'
      };
    }
  }

  /**
   * Start periodic health monitoring
   */
  startMonitoring(intervalMinutes = 60) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Check every hour by default
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.getStorageHealth();
      
      if (health.overall.status === 'critical') {
        console.error('🚨 CRITICAL: Storage health issues detected:', health.overall.message);
        this.showAlert('critical', 'Storage Issue', health.overall.message);
      } else if (health.overall.status === 'warning') {
        console.warn('⚠️ WARNING: Storage health issues:', health.overall.message);
      }
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Storage monitoring started (checking every ${intervalMinutes} minutes)`);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('Storage monitoring stopped');
    }
  }

  /**
   * Show alert to user
   */
  showAlert(level, title, message) {
    // This will be handled by the UI component
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storageAlert', {
        detail: { level, title, message }
      }));
    }
  }
}

// Create singleton instance
const storageMonitor = new StorageMonitor();

export default storageMonitor;
