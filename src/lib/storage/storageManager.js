/**
 * Storage Manager - Unified interface for online (Supabase) and local (IndexedDB) storage
 * Automatically routes operations based on user's storage preference
 */

import { supabase } from '../supabase';
import IndexedDBAdapter from './indexedDBAdapter';

class StorageManager {
  constructor() {
    this.mode = null;
    this.indexedDBAdapter = null;
    this.initializeMode();
  }

  /**
   * Initialize storage mode from localStorage
   */
  initializeMode() {
    // Check if running in browser
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('storageMode');
      this.mode = savedMode || 'online'; // Default to online
      
      // Initialize IndexedDB adapter if in local mode
      if (this.mode === 'local') {
        this.indexedDBAdapter = new IndexedDBAdapter();
      }
    } else {
      this.mode = 'online'; // Server-side rendering defaults to online
    }
  }

  /**
   * Get current storage mode
   */
  getMode() {
    return this.mode;
  }

  /**
   * Switch storage mode
   */
  async switchMode(newMode) {
    if (newMode !== 'online' && newMode !== 'local') {
      throw new Error('Invalid storage mode. Use "online" or "local"');
    }

    this.mode = newMode;
    localStorage.setItem('storageMode', newMode);

    // Initialize IndexedDB adapter if switching to local
    if (newMode === 'local' && !this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
      await this.indexedDBAdapter.initPromise; // Wait for initialization
    }

    // Trigger a page reload to refresh data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('storageModeChanged', { detail: { mode: newMode } }));
    }

    return newMode;
  }

  /**
   * Get the appropriate client based on current mode
   */
  getClient() {
    if (this.mode === 'local') {
      if (!this.indexedDBAdapter) {
        this.indexedDBAdapter = new IndexedDBAdapter();
      }
      return this.indexedDBAdapter;
    }
    return supabase;
  }

  /**
   * Supabase-compatible API: from() method
   */
  from(table) {
    return this.getClient().from(table);
  }

  /**
   * Export local data to JSON file
   */
  async exportLocalData() {
    if (this.mode !== 'local') {
      throw new Error('Can only export data in local storage mode');
    }

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
    if (this.mode !== 'local') {
      throw new Error('Can only import data in local storage mode');
    }

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
    if (this.mode !== 'local') {
      return { mode: 'online', message: 'Storage info only available in local mode' };
    }

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
    if (this.mode !== 'local') {
      throw new Error('Can only clear data in local storage mode');
    }

    if (!this.indexedDBAdapter) {
      this.indexedDBAdapter = new IndexedDBAdapter();
      await this.indexedDBAdapter.initPromise;
    }

    const stores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries'];
    
    for (const store of stores) {
      await this.indexedDBAdapter._clearStore(store);
    }

    return { success: true, message: 'All local data cleared' };
  }

  /**
   * Migrate data from Supabase to Local storage
   */
  async migrateFromSupabaseToLocal() {
    if (this.mode !== 'online') {
      throw new Error('Must be in online mode to migrate from Supabase');
    }

    // Fetch all data from Supabase
    const tables = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries'];
    const exportData = {};

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        throw new Error(`Error fetching ${table}: ${error.message}`);
      }
      exportData[table] = data || [];
    }

    // Switch to local mode
    await this.switchMode('local');

    // Import data to IndexedDB
    await this.indexedDBAdapter.importData(exportData);

    return { success: true, message: 'Data migrated to local storage', recordCount: Object.values(exportData).flat().length };
  }

  /**
   * Migrate data from Local storage to Supabase
   */
  async migrateFromLocalToSupabase() {
    if (this.mode !== 'local') {
      throw new Error('Must be in local mode to migrate from local storage');
    }

    // Export data from IndexedDB
    const exportData = await this.indexedDBAdapter.exportData();

    // Switch to online mode
    await this.switchMode('online');

    // Import data to Supabase
    const tables = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries'];
    
    for (const table of tables) {
      if (exportData[table] && exportData[table].length > 0) {
        // Clear existing data (optional - comment out if you want to merge)
        // await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Insert new data
        const { error } = await supabase.from(table).insert(exportData[table]);
        if (error) {
          console.error(`Error inserting ${table}:`, error);
          throw new Error(`Error migrating ${table}: ${error.message}`);
        }
      }
    }

    return { success: true, message: 'Data migrated to Supabase', recordCount: Object.values(exportData).flat().length };
  }
}

// Create singleton instance
const storageManager = new StorageManager();

export default storageManager;
