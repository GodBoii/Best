/**
 * Storage Manager - Unified interface for the browser-based IndexedDB storage.
 * Provides a Supabase-like API surface so the rest of the app can remain unchanged.
 */

import IndexedDBAdapter from './indexedDBAdapter';

class StorageManager {
  constructor() {
    this.indexedDBAdapter = null;
    this.initialize();
  }

  /**
   * Initialize the IndexedDB adapter when running in the browser.
   */
  initialize() {
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
    }
  }

  /**
   * Get current storage mode (always local)
   */
  getMode() {
    return 'local';
  }

  /**
   * Get the IndexedDB adapter client
   */
  getClient() {
    if (!this.indexedDBAdapter && typeof window !== 'undefined') {
      this.indexedDBAdapter = new IndexedDBAdapter();
    }
    return this.indexedDBAdapter;
  }

  /**
   * Supabase-compatible API: from() method
   */
  from(table) {
    const client = this.getClient();
    if (!client) {
      throw new Error('IndexedDB is not available in the current environment');
    }
    return client.from(table);
  }

  /**
   * Export local data to JSON file
   */
  async exportLocalData() {
    if (!this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
      await this.indexedDBAdapter.initPromise;
    }

    const data = await this.indexedDBAdapter.exportData();
    
    // Create downloadable JSON file
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `bus-schedule-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return data;
  }

  /**
   * Import data from JSON file to local storage
   */
  async importLocalData(file) {
    if (!this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
      await this.indexedDBAdapter.initPromise;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result);
          await this.indexedDBAdapter.importData(data);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  /**
   * Get storage statistics (only for local mode)
   */
  async getStorageInfo() {
    if (!this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
      await this.indexedDBAdapter.initPromise;
    }

    const info = await this.indexedDBAdapter.getStorageInfo();
    return { mode: 'local', ...info };
  }

  /**
   * Clear all local data (use with caution!)
   */
  async clearLocalData() {
    if (!this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
      await this.indexedDBAdapter.initPromise;
    }

    const stores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries', 'summary_settings', 'platform_master', 'platform_duty_master', 'other_duties_entries', 'other_duties_items', 'summary_report_remarks'];
    
    for (const store of stores) {
      await this.indexedDBAdapter._clearStore(store);
    }

    return { success: true, message: 'All local data cleared' };
  }

  /**
   * Migrate data helpers have been removed because Supabase is no longer used for persistence.
   * Keeping a placeholder to avoid accidental reintroduction of remote migrations.
   */
}

// Create singleton instance
const storageManager = new StorageManager();

export default storageManager;