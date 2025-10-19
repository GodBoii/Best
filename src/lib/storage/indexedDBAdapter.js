/**
 * IndexedDB Adapter for Local Storage
 * Provides a Supabase-like API for local browser storage
 */

const DB_NAME = 'BusScheduleDB';
const DB_VERSION = 1;

class IndexedDBAdapter {
  constructor() {
    this.db = null;
    this.initPromise = this.initDB();
    this.requestPersistentStorage(); // Request unlimited storage
  }

  /**
   * Request persistent storage to avoid automatic eviction
   * This allows storing large amounts of data without browser clearing it
   */
  async requestPersistentStorage() {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`Persistent storage granted: ${isPersisted}`);
      
      // Check current storage estimate
      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const percentUsed = (estimate.usage / estimate.quota * 100).toFixed(2);
        console.log(`Storage used: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Storage quota: ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
        console.log(`Percent used: ${percentUsed}%`);
      }
    }
  }

  /**
   * Get current storage usage statistics
   */
  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageMB: (estimate.usage / 1024 / 1024).toFixed(2),
        quotaMB: (estimate.quota / 1024 / 1024).toFixed(2),
        percentUsed: (estimate.usage / estimate.quota * 100).toFixed(2),
        isPersisted: navigator.storage.persisted ? await navigator.storage.persisted() : false
      };
    }
    return null;
  }

  /**
   * Initialize IndexedDB with schema matching Supabase
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores (tables)
        if (!db.objectStoreNames.contains('depots')) {
          const depotStore = db.createObjectStore('depots', { keyPath: 'id' });
          depotStore.createIndex('name', 'name', { unique: true });
        }

        if (!db.objectStoreNames.contains('operators')) {
          const operatorStore = db.createObjectStore('operators', { keyPath: 'id' });
          operatorStore.createIndex('name', 'name', { unique: true });
          operatorStore.createIndex('short_code', 'short_code', { unique: true });
        }

        if (!db.objectStoreNames.contains('bus_types')) {
          const busTypeStore = db.createObjectStore('bus_types', { keyPath: 'id' });
          busTypeStore.createIndex('name', 'name', { unique: true });
          busTypeStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('routes')) {
          const routeStore = db.createObjectStore('routes', { keyPath: 'id' });
          routeStore.createIndex('name', 'name', { unique: true });
          routeStore.createIndex('code', 'code', { unique: true });
        }

        if (!db.objectStoreNames.contains('schedules')) {
          const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id' });
          scheduleStore.createIndex('depot_date', ['depot_id', 'schedule_date'], { unique: true });
        }

        if (!db.objectStoreNames.contains('schedule_entries')) {
          const entryStore = db.createObjectStore('schedule_entries', { keyPath: 'id' });
          entryStore.createIndex('schedule_id', 'schedule_id', { unique: false });
        }
      };
    });
  }

  /**
   * Generate UUID (mimics Supabase uuid_generate_v4)
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generic SELECT operation
   */
  select(storeName) {
    const self = this;
    
    const selectObj = {
      eq: (field, value) => self._selectWithFilter(storeName, field, value, 'eq'),
      lte: (field, value) => self._selectWithFilter(storeName, field, value, 'lte'),
      gte: (field, value) => self._selectWithFilter(storeName, field, value, 'gte'),
      lt: (field, value) => self._selectWithFilter(storeName, field, value, 'lt'),
      gt: (field, value) => self._selectWithFilter(storeName, field, value, 'gt'),
      order: (field, options = {}) => self._selectWithOrder(storeName, field, options),
      single: async () => {
        await self.initPromise;
        const result = await self._selectAll(storeName);
        if (result.data && result.data.length > 0) {
          return { data: result.data[0], error: null };
        }
        return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
      },
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectAll(storeName))
          .then(resolve, reject);
      }
    };
    
    return selectObj;
  }

  async _selectAll(storeName) {
    await this.initPromise;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve({ data: request.result, error: null });
      };
      request.onerror = () => {
        reject({ data: null, error: request.error });
      };
    });
  }

  _selectWithFilter(storeName, field, value, operator = 'eq') {
    const self = this;

    const chainable = {
      eq: (field2, value2) => self._selectWithMultipleFilters(storeName, { [field]: value, [field2]: value2 }),
      lte: (field2, value2) => self._selectWithCompoundFilters(storeName, [
        { field, value, operator },
        { field: field2, value: value2, operator: 'lte' }
      ]),
      order: (orderField, options) => self._selectWithFilterAndOrder(storeName, field, value, operator, orderField, options),
      limit: (count) => self._selectWithFilterAndLimit(storeName, field, value, operator, count),
      single: () => {
        return self.initPromise.then(async () => {
          const result = await self._selectWithFilterExecute(storeName, field, value, operator);
          if (result.data && result.data.length > 0) {
            return { data: result.data[0], error: null };
          }
          return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
        });
      },
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithFilterExecute(storeName, field, value, operator))
          .then(resolve, reject);
      }
    };

    return chainable;
  }

  async _selectWithFilterExecute(storeName, field, value, operator = 'eq') {
    await this.initPromise;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let filtered;
        switch (operator) {
          case 'lte':
            filtered = request.result.filter(item => item[field] <= value);
            break;
          case 'gte':
            filtered = request.result.filter(item => item[field] >= value);
            break;
          case 'lt':
            filtered = request.result.filter(item => item[field] < value);
            break;
          case 'gt':
            filtered = request.result.filter(item => item[field] > value);
            break;
          case 'eq':
          default:
            filtered = request.result.filter(item => item[field] === value);
            break;
        }
        resolve({ data: filtered, error: null });
      };
      request.onerror = () => {
        resolve({ data: null, error: request.error });
      };
    });
  }

  _selectWithCompoundFilters(storeName, filterArray) {
    const self = this;

    return {
      order: (orderField, options) => self._selectWithCompoundFiltersAndOrder(storeName, filterArray, orderField, options),
      limit: (count) => self._selectWithCompoundFiltersAndLimit(storeName, filterArray, count),
      single: () => {
        return self.initPromise.then(async () => {
          const result = await self._selectWithCompoundFiltersExecute(storeName, filterArray);
          if (result.data && result.data.length > 0) {
            return { data: result.data[0], error: null };
          }
          return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
        });
      },
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithCompoundFiltersExecute(storeName, filterArray))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithCompoundFiltersExecute(storeName, filterArray) {
    await this.initPromise;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const filtered = request.result.filter(item => {
          return filterArray.every(filter => {
            const { field, value, operator } = filter;
            switch (operator) {
              case 'lte':
                return item[field] <= value;
              case 'gte':
                return item[field] >= value;
              case 'lt':
                return item[field] < value;
              case 'gt':
                return item[field] > value;
              case 'eq':
              default:
                return item[field] === value;
            }
          });
        });
        resolve({ data: filtered, error: null });
      };
      request.onerror = () => {
        resolve({ data: null, error: request.error });
      };
    });
  }

  _selectWithCompoundFiltersAndOrder(storeName, filterArray, orderField, orderOptions) {
    const self = this;

    return {
      limit: (count) => self.initPromise.then(() => self._selectWithCompoundFiltersOrderAndLimit(storeName, filterArray, orderField, orderOptions, count)),
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithCompoundFiltersOrderExecute(storeName, filterArray, orderField, orderOptions))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithCompoundFiltersOrderExecute(storeName, filterArray, orderField, orderOptions) {
    const result = await this._selectWithCompoundFiltersExecute(storeName, filterArray);
    
    if (result.data) {
      result.data.sort((a, b) => {
        if (orderOptions.ascending === false) {
          return b[orderField] > a[orderField] ? 1 : -1;
        }
        return a[orderField] > b[orderField] ? 1 : -1;
      });
    }
    
    return result;
  }

  async _selectWithCompoundFiltersOrderAndLimit(storeName, filterArray, orderField, orderOptions, limit) {
    const result = await this._selectWithCompoundFiltersOrderExecute(storeName, filterArray, orderField, orderOptions);
    
    if (result.data && result.data.length > limit) {
      result.data = result.data.slice(0, limit);
    }
    
    return result;
  }

  _selectWithFilterAndOrder(storeName, field, value, operator, orderField, orderOptions) {
    const self = this;

    return {
      limit: (count) => self.initPromise.then(() => self._selectWithFilterOrderAndLimit(storeName, field, value, operator, orderField, orderOptions, count)),
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithFilterOrderExecute(storeName, field, value, operator, orderField, orderOptions))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithFilterOrderExecute(storeName, field, value, operator, orderField, orderOptions) {
    const result = await this._selectWithFilterExecute(storeName, field, value, operator);
    
    if (result.data) {
      result.data.sort((a, b) => {
        if (orderOptions.ascending === false) {
          return b[orderField] > a[orderField] ? 1 : -1;
        }
        return a[orderField] > b[orderField] ? 1 : -1;
      });
    }
    
    return result;
  }

  async _selectWithFilterOrderAndLimit(storeName, field, value, operator, orderField, orderOptions, limit) {
    const result = await this._selectWithFilterOrderExecute(storeName, field, value, operator, orderField, orderOptions);
    
    if (result.data && result.data.length > limit) {
      result.data = result.data.slice(0, limit);
    }
    
    return result;
  }

  _selectWithFilterAndLimit(storeName, field, value, operator, limit) {
    const self = this;

    return {
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithFilterLimitExecute(storeName, field, value, operator, limit))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithFilterLimitExecute(storeName, field, value, operator, limit) {
    const result = await this._selectWithFilterExecute(storeName, field, value, operator);
    
    if (result.data && result.data.length > limit) {
      result.data = result.data.slice(0, limit);
    }
    
    return result;
  }

  _selectWithMultipleFilters(storeName, filters) {
    const self = this;

    return {
      single: () => {
        return self.initPromise.then(async () => {
          const result = await self._selectWithMultipleFiltersExecute(storeName, filters);
          if (result.data && result.data.length > 0) {
            return { data: result.data[0], error: null };
          }
          return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
        });
      },
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithMultipleFiltersExecute(storeName, filters))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithMultipleFiltersExecute(storeName, filters) {
    await this.initPromise;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const filtered = request.result.filter(item => {
          return Object.keys(filters).every(key => item[key] === filters[key]);
        });
        resolve({ data: filtered, error: null });
      };
      request.onerror = () => {
        resolve({ data: null, error: request.error });
      };
    });
  }

  async _selectWithOrder(storeName, field, options) {
    await this.initPromise;

    const promise = new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let data = request.result;
        
        // Sort data
        data.sort((a, b) => {
          if (options.ascending === false) {
            return b[field] > a[field] ? 1 : -1;
          }
          return a[field] > b[field] ? 1 : -1;
        });

        resolve({ data, error: null });
      };
      request.onerror = () => {
        resolve({ data: null, error: request.error });
      };
    });

    // Return promise with then method for chaining
    return promise;
  }

  /**
   * Generic INSERT operation
   */
  insert(storeName, records) {
    const self = this;
    
    return {
      select: () => ({
        single: () => self.initPromise.then(() => self._insertExecute(storeName, records, true)),
        then: (resolve, reject) => self.initPromise.then(() => self._insertExecute(storeName, records)).then(resolve, reject)
      }),
      then: (resolve, reject) => self.initPromise.then(() => self._insertExecute(storeName, records)).then(resolve, reject)
    };
  }

  async _insertExecute(storeName, records, single = false) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const recordsArray = Array.isArray(records) ? records : [records];
      const results = [];
      let errorOccurred = false;

      recordsArray.forEach(record => {
        // Add UUID and timestamp if not present
        if (!record.id) {
          record.id = this.generateUUID();
        }
        if (!record.created_at) {
          record.created_at = new Date().toISOString();
        }

        // Use put instead of add to allow overwriting existing records
        const request = store.put(record);
        request.onsuccess = () => {
          results.push(record);
        };
        request.onerror = () => {
          errorOccurred = true;
        };
      });

      transaction.oncomplete = () => {
        if (errorOccurred) {
          reject({ data: null, error: new Error('Insert operation failed') });
        } else if (single && results.length > 0) {
          resolve({ data: results[0], error: null });
        } else {
          resolve({ data: results, error: null });
        }
      };

      transaction.onerror = () => {
        reject({ data: null, error: transaction.error });
      };
    });
  }

  /**
   * Generic UPDATE operation
   */
  update(storeName, updates) {
    const self = this;
    
    return {
      eq: (field, value) => self.initPromise.then(() => self._updateWithFilter(storeName, updates, field, value))
    };
  }

  async _updateWithFilter(storeName, updates, field, value) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const records = getAllRequest.result.filter(item => item[field] === value);
        
        if (records.length === 0) {
          resolve({ data: [], error: null });
          return;
        }

        records.forEach(record => {
          const updated = { ...record, ...updates };
          store.put(updated);
        });

        transaction.oncomplete = () => {
          resolve({ data: records, error: null });
        };
      };

      transaction.onerror = () => {
        reject({ data: null, error: transaction.error });
      };
    });
  }

  /**
   * Generic DELETE operation
   */
  delete(storeName) {
    const self = this;
    
    return {
      eq: (field, value) => self.initPromise.then(() => self._deleteWithFilter(storeName, field, value))
    };
  }

  async _deleteWithFilter(storeName, field, value) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const records = getAllRequest.result.filter(item => item[field] === value);
        
        records.forEach(record => {
          store.delete(record.id);
        });

        transaction.oncomplete = () => {
          resolve({ data: records, error: null });
        };
      };

      transaction.onerror = () => {
        reject({ data: null, error: transaction.error });
      };
    });
  }

  /**
   * Supabase-like API: from() method
   */
  from(storeName) {
    return {
      select: (fields = '*') => {
        if (fields === '*' || !fields) {
          return this.select(storeName);
        }
        // For joined queries, we'll handle them specially
        if (fields.includes('(')) {
          return this._selectWithJoins(storeName, fields);
        }
        return this.select(storeName);
      },
      insert: (records) => this.insert(storeName, records),
      update: (updates) => this.update(storeName, updates),
      delete: () => this.delete(storeName)
    };
  }

  /**
   * Handle SELECT with JOINs (for schedule_entries with related data)
   */
  _selectWithJoins(storeName, fields) {
    const self = this;

    return {
      eq: (field, value) => self._selectWithJoinsAndFilter(storeName, fields, field, value),
      order: (field, options) => self.initPromise.then(() => self._selectWithJoinsAndOrder(storeName, fields, field, options))
    };
  }

  _selectWithJoinsAndFilter(storeName, fields, filterField, filterValue) {
    const self = this;

    return {
      order: (field, options) => self.initPromise.then(() => self._selectWithJoinsFilterAndOrder(storeName, fields, filterField, filterValue, field, options))
    };
  }

  async _selectWithJoinsFilterAndOrder(storeName, fields, filterField, filterValue, orderField, orderOptions) {
    await this.initPromise;

    return new Promise(async (resolve) => {
      // Get main records
      const mainResult = await this._selectWithFilterExecute(storeName, filterField, filterValue);
      
      if (!mainResult.data || mainResult.data.length === 0) {
        resolve({ data: [], error: null });
        return;
      }

      // Parse join fields
      const joinMatches = fields.matchAll(/(\w+)\s*\([^)]+\)/g);
      const joins = Array.from(joinMatches).map(match => match[1]);

      // Fetch related data
      const enrichedData = await Promise.all(mainResult.data.map(async (entry) => {
        const enriched = { ...entry };

        for (const joinTable of joins) {
          const foreignKey = `${joinTable.slice(0, -1)}_id`; // e.g., routes -> route_id
          if (entry[foreignKey]) {
            const relatedResult = await this._selectWithFilterExecute(joinTable, 'id', entry[foreignKey]);
            enriched[joinTable] = relatedResult.data && relatedResult.data.length > 0 ? relatedResult.data[0] : null;
          }
        }

        return enriched;
      }));

      // Sort if needed
      if (orderField) {
        enrichedData.sort((a, b) => {
          if (orderOptions.ascending === false) {
            return b[orderField] > a[orderField] ? 1 : -1;
          }
          return a[orderField] > b[orderField] ? 1 : -1;
        });
      }

      resolve({ data: enrichedData, error: null });
    });
  }

  async _selectWithJoinsAndOrder(storeName, fields, orderField, orderOptions) {
    await this.initPromise;

    return new Promise(async (resolve) => {
      // Get all records
      const mainResult = await this._selectAll(storeName);
      
      if (!mainResult.data || mainResult.data.length === 0) {
        resolve({ data: [], error: null });
        return;
      }

      // Parse join fields
      const joinMatches = fields.matchAll(/(\w+)\s*\([^)]+\)/g);
      const joins = Array.from(joinMatches).map(match => match[1]);

      // Fetch related data
      const enrichedData = await Promise.all(mainResult.data.map(async (entry) => {
        const enriched = { ...entry };

        for (const joinTable of joins) {
          const foreignKey = `${joinTable.slice(0, -1)}_id`;
          if (entry[foreignKey]) {
            const relatedResult = await this._selectWithFilterExecute(joinTable, 'id', entry[foreignKey]);
            enriched[joinTable] = relatedResult.data && relatedResult.data.length > 0 ? relatedResult.data[0] : null;
          }
        }

        return enriched;
      }));

      // Sort
      enrichedData.sort((a, b) => {
        if (orderOptions.ascending === false) {
          return b[orderField] > a[orderField] ? 1 : -1;
        }
        return a[orderField] > b[orderField] ? 1 : -1;
      });

      resolve({ data: enrichedData, error: null });
    });
  }

  /**
   * Export all data as JSON
   */
  async exportData() {
    await this.initPromise;

    const stores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries'];
    const exportData = {};

    for (const storeName of stores) {
      const result = await this._selectAll(storeName);
      exportData[storeName] = result.data || [];
    }

    return exportData;
  }

  /**
   * Import data from JSON
   */
  async importData(data) {
    await this.initPromise;

    const stores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries'];

    for (const storeName of stores) {
      if (data[storeName] && Array.isArray(data[storeName])) {
        // Clear existing data
        await this._clearStore(storeName);
        
        // Insert new data in batches to avoid transaction timeout
        const batchSize = 100;
        for (let i = 0; i < data[storeName].length; i += batchSize) {
          const batch = data[storeName].slice(i, i + batchSize);
          try {
            await this._insertExecute(storeName, batch);
          } catch (error) {
            console.error(`Error importing batch for ${storeName}:`, error);
            throw error;
          }
        }
      }
    }
  }

  async _clearStore(storeName) {
    await this.initPromise;

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export default IndexedDBAdapter;
