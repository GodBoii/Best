/**
 * Backup Manager for Single-User Local Storage
 * Handles automatic backups, reminders, and data safety
 */

import storageManager from './storageManager';

class BackupManager {
    constructor() {
        this.BACKUP_KEY = 'last_backup_date';
        this.AUTO_BACKUP_KEY = 'last_auto_backup';
        this.BACKUP_DISMISSED_KEY = 'backup_reminder_dismissed';
    }

    /**
     * Check if backup is needed and show reminder
     */
    async checkBackupReminder() {
        const lastBackup = localStorage.getItem(this.BACKUP_KEY);
        const dismissed = localStorage.getItem(this.BACKUP_DISMISSED_KEY);
        const today = new Date().toDateString();

        // Don't show if already dismissed today
        if (dismissed === today) {
            return false;
        }

        // Show reminder if no backup today
        if (lastBackup !== today) {
            return true;
        }

        return false;
    }

    /**
     * Perform automatic backup to Downloads folder
     */
    async performAutoBackup() {
        try {
            const lastAutoBackup = localStorage.getItem(this.AUTO_BACKUP_KEY);
            const now = Date.now();
            const oneDayAgo = now - (24 * 60 * 60 * 1000);

            // Only backup once per day
            if (lastAutoBackup && parseInt(lastAutoBackup) > oneDayAgo) {
                console.log('Auto-backup already done today');
                return { success: false, reason: 'already_done_today' };
            }

            // Export data
            await storageManager.exportLocalData();

            // Update last backup timestamp
            localStorage.setItem(this.AUTO_BACKUP_KEY, now.toString());
            localStorage.setItem(this.BACKUP_KEY, new Date().toDateString());

            console.log('✅ Auto-backup completed successfully');
            return { success: true, timestamp: now };
        } catch (error) {
            console.error('❌ Auto-backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Manual backup triggered by user
     */
    async performManualBackup() {
        try {
            await storageManager.exportLocalData();

            // Update last backup date
            const today = new Date().toDateString();
            localStorage.setItem(this.BACKUP_KEY, today);
            localStorage.setItem(this.AUTO_BACKUP_KEY, Date.now().toString());

            return { success: true };
        } catch (error) {
            console.error('Manual backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Dismiss backup reminder for today
     */
    dismissReminderForToday() {
        const today = new Date().toDateString();
        localStorage.setItem(this.BACKUP_DISMISSED_KEY, today);
    }

    /**
     * Get backup status information
     */
    getBackupStatus() {
        const lastBackup = localStorage.getItem(this.BACKUP_KEY);
        const lastAutoBackup = localStorage.getItem(this.AUTO_BACKUP_KEY);

        if (!lastBackup) {
            return {
                status: 'never',
                message: 'No backup found',
                daysAgo: null,
                needsBackup: true
            };
        }

        const lastBackupDate = new Date(lastBackup);
        const today = new Date();
        const diffTime = Math.abs(today - lastBackupDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        let status = 'good';
        let message = 'Backup is current';
        let needsBackup = false;

        if (diffDays === 0) {
            status = 'excellent';
            message = 'Backed up today';
        } else if (diffDays === 1) {
            status = 'good';
            message = 'Backed up yesterday';
            needsBackup = true;
        } else if (diffDays <= 7) {
            status = 'warning';
            message = `Last backup ${diffDays} days ago`;
            needsBackup = true;
        } else {
            status = 'critical';
            message = `Last backup ${diffDays} days ago - URGENT`;
            needsBackup = true;
        }

        return {
            status,
            message,
            daysAgo: diffDays,
            lastBackupDate: lastBackup,
            lastAutoBackup: lastAutoBackup ? new Date(parseInt(lastAutoBackup)).toLocaleString() : null,
            needsBackup
        };
    }

    /**
     * Create emergency backup to localStorage as fallback
     */
    async createEmergencyBackup() {
        try {
            const data = await storageManager.indexedDBAdapter.exportData();
            const compressed = JSON.stringify(data);

            // Try to store in localStorage (limited to ~5-10MB)
            try {
                localStorage.setItem('emergency_backup', compressed);
                localStorage.setItem('emergency_backup_date', new Date().toISOString());
                console.log('✅ Emergency backup created in localStorage');
                return { success: true, size: compressed.length };
            } catch (quotaError) {
                console.warn('⚠️ localStorage quota exceeded, emergency backup failed');
                return { success: false, reason: 'quota_exceeded' };
            }
        } catch (error) {
            console.error('Emergency backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Restore from emergency backup
     */
    async restoreFromEmergencyBackup() {
        try {
            const backup = localStorage.getItem('emergency_backup');
            if (!backup) {
                return { success: false, reason: 'no_backup_found' };
            }

            const data = JSON.parse(backup);
            await storageManager.indexedDBAdapter.importData(data);

            const backupDate = localStorage.getItem('emergency_backup_date');
            console.log(`✅ Restored from emergency backup (${backupDate})`);

            return { success: true, backupDate };
        } catch (error) {
            console.error('Emergency restore failed:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const backupManager = new BackupManager();

export default backupManager;
