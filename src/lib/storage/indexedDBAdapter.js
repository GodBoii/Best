/**
 * IndexedDB Adapter for Local Storage
 * Provides a Supabase-like API for local browser storage
 */

const DB_NAME = 'BusScheduleDB';
const DB_VERSION = 2;

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
        const transaction = event.target.transaction;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;

        console.log(`Database upgrade: v${oldVersion} → v${newVersion}`);

        // Create object stores (tables) if they don't exist
        // This preserves all existing data
        
        if (!db.objectStoreNames.contains('depots')) {
          const depotStore = db.createObjectStore('depots', { keyPath: 'id' });
          depotStore.createIndex('name', 'name', { unique: true });
          depotStore.createIndex('display_order', 'display_order', { unique: false });
          console.log('Created depots store');
        } else if (oldVersion < 2) {
          // Add display_order index to existing depots store
          const depotStore = transaction.objectStore('depots');
          if (!depotStore.indexNames.contains('display_order')) {
            depotStore.createIndex('display_order', 'display_order', { unique: false });
            console.log('Added display_order index to depots');
          }
        }

        if (!db.objectStoreNames.contains('operators')) {
          const operatorStore = db.createObjectStore('operators', { keyPath: 'id' });
          operatorStore.createIndex('name', 'name', { unique: true });
          operatorStore.createIndex('short_code', 'short_code', { unique: true });
          console.log('Created operators store');
        }

        if (!db.objectStoreNames.contains('bus_types')) {
          const busTypeStore = db.createObjectStore('bus_types', { keyPath: 'id' });
          busTypeStore.createIndex('name', 'name', { unique: true });
          busTypeStore.createIndex('category', 'category', { unique: false });
          console.log('Created bus_types store');
        }

        if (!db.objectStoreNames.contains('routes')) {
          const routeStore = db.createObjectStore('routes', { keyPath: 'id' });
          routeStore.createIndex('name', 'name', { unique: true });
          routeStore.createIndex('code', 'code', { unique: true });
          console.log('Created routes store');
        }

        if (!db.objectStoreNames.contains('schedules')) {
          const scheduleStore = db.createObjectStore('schedules', { keyPath: 'id' });
          scheduleStore.createIndex('depot_date', ['depot_id', 'schedule_date'], { unique: true });
          console.log('Created schedules store');
        }

        if (!db.objectStoreNames.contains('schedule_entries')) {
          const entryStore = db.createObjectStore('schedule_entries', { keyPath: 'id' });
          entryStore.createIndex('schedule_id', 'schedule_id', { unique: false });
          console.log('Created schedule_entries store');
        }

        // Add fleet_entries store in version 2
        if (!db.objectStoreNames.contains('fleet_entries')) {
          const fleetStore = db.createObjectStore('fleet_entries', { keyPath: 'id' });
          fleetStore.createIndex('depot_id', 'depot_id', { unique: false });
          fleetStore.createIndex('schedule_date', 'schedule_date', { unique: false });
          fleetStore.createIndex('depot_date', ['depot_id', 'schedule_date'], { unique: false });
          console.log('Created fleet_entries store');
        }

        console.log('Database upgrade complete - all data preserved');
      };
    });
  }

  /**
   * Generate UUID (mimics Supabase uuid_generate_v4)
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
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
    const filters = { [field]: { value, operator } };

    const chainable = {
      eq: (field2, value2) => self._selectWithMultipleFiltersChainable(storeName, { ...filters, [field2]: { value: value2, operator: 'eq' } }),
      lte: (field2, value2) => self._selectWithMultipleFiltersChainable(storeName, { ...filters, [field2]: { value: value2, operator: 'lte' } }),
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

  _selectWithMultipleFiltersChainable(storeName, filters) {
    const self = this;

    return {
      eq: (field, value) => self._selectWithMultipleFiltersChainable(storeName, { ...filters, [field]: { value, operator: 'eq' } }),
      order: (orderField, options) => self._selectWithMultipleFiltersAndOrder(storeName, filters, orderField, options),
      single: () => {
        return self.initPromise.then(async () => {
          const result = await self._selectWithMultipleFiltersAdvancedExecute(storeName, filters);
          if (result.data && result.data.length > 0) {
            return { data: result.data[0], error: null };
          }
          return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
        });
      },
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithMultipleFiltersAdvancedExecute(storeName, filters))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithMultipleFiltersAdvancedExecute(storeName, filters) {
    await this.initPromise;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const filtered = request.result.filter(item => {
          return Object.keys(filters).every(key => {
            const filter = filters[key];
            const itemValue = item[key];
            const filterValue = filter.value;
            const operator = filter.operator || 'eq';

            switch (operator) {
              case 'lte':
                return itemValue <= filterValue;
              case 'gte':
                return itemValue >= filterValue;
              case 'lt':
                return itemValue < filterValue;
              case 'gt':
                return itemValue > filterValue;
              case 'eq':
              default:
                return itemValue === filterValue;
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

  _selectWithMultipleFiltersAndOrder(storeName, filters, orderField, orderOptions) {
    const self = this;

    return {
      limit: (count) => self._selectWithMultipleFiltersOrderAndLimit(storeName, filters, orderField, orderOptions, count),
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithMultipleFiltersAndOrderExecute(storeName, filters, orderField, orderOptions))
          .then(resolve, reject);
      }
    };
  }

  _selectWithMultipleFiltersOrderAndLimit(storeName, filters, orderField, orderOptions, limit) {
    const self = this;

    return {
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithMultipleFiltersOrderAndLimitExecute(storeName, filters, orderField, orderOptions, limit))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithMultipleFiltersOrderAndLimitExecute(storeName, filters, orderField, orderOptions, limit) {
    const result = await this._selectWithMultipleFiltersAndOrderExecute(storeName, filters, orderField, orderOptions);

    if (result.data && result.data.length > limit) {
      result.data = result.data.slice(0, limit);
    }

    return result;
  }

  async _selectWithMultipleFiltersAndOrderExecute(storeName, filters, orderField, orderOptions) {
    const result = await this._selectWithMultipleFiltersAdvancedExecute(storeName, filters);

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

  _selectWithOrder(storeName, field, options) {
    const self = this;
    const orderFields = [{ field, options }];

    return {
      order: (field2, options2) => self._selectWithMultipleOrders(storeName, [...orderFields, { field: field2, options: options2 }]),
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithOrderExecute(storeName, orderFields))
          .then(resolve, reject);
      }
    };
  }

  _selectWithMultipleOrders(storeName, orderFields) {
    const self = this;

    return {
      order: (field, options) => self._selectWithMultipleOrders(storeName, [...orderFields, { field, options }]),
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithOrderExecute(storeName, orderFields))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithOrderExecute(storeName, orderFields) {
    await this.initPromise;

    return new Promise((resolve) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        let data = request.result;

        // Apply all sorts in order (multi-level sorting)
        data.sort((a, b) => {
          for (const { field, options = {} } of orderFields) {
            const aVal = a[field];
            const bVal = b[field];

            // Skip if values are equal, move to next sort field
            if (aVal === bVal) continue;

            // Handle null/undefined values
            if (aVal == null && bVal == null) continue;
            if (aVal == null) return options.ascending === false ? -1 : 1;
            if (bVal == null) return options.ascending === false ? 1 : -1;

            // Compare values
            if (options.ascending === false) {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          }
          return 0;
        });

        resolve({ data, error: null });
      };
      request.onerror = () => {
        resolve({ data: null, error: request.error });
      };
    });
  }

  /**
   * Generic INSERT operation
   */
  insert(storeName, records) {
    const self = this;

    return {
      select: (fields = '*') => {
        if (fields === '*' || !fields || !fields.includes('(')) {
          return {
            single: () => self.initPromise.then(() => self._insertExecute(storeName, records, true)),
            then: (resolve, reject) => self.initPromise.then(() => self._insertExecute(storeName, records)).then(resolve, reject)
          };
        }
        // Handle joins in insert().select()
        return {
          single: () => self.initPromise.then(() => self._insertWithJoinsExecute(storeName, records, fields, true)),
          then: (resolve, reject) => self.initPromise.then(() => self._insertWithJoinsExecute(storeName, records, fields)).then(resolve, reject)
        };
      },
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

  async _insertWithJoinsExecute(storeName, records, fields, single = false) {
    // First insert the records
    const insertResult = await this._insertExecute(storeName, records, single);

    if (insertResult.error || !insertResult.data) {
      return insertResult;
    }

    // Parse join fields
    const joinMatches = fields.matchAll(/(\w+)\s*\([^)]+\)/g);
    const joins = Array.from(joinMatches).map(match => match[1]);

    // Enrich with joined data
    const dataArray = Array.isArray(insertResult.data) ? insertResult.data : [insertResult.data];

    const enrichedData = await Promise.all(dataArray.map(async (entry) => {
      const enriched = { ...entry };

      for (const joinTable of joins) {
        // Handle different foreign key patterns
        let foreignKey;
        if (joinTable === 'depots') {
          foreignKey = 'depot_id';
        } else if (joinTable === 'operators') {
          foreignKey = 'operator_id';
        } else if (joinTable === 'bus_types') {
          foreignKey = 'bus_type_id';
        } else {
          foreignKey = `${joinTable.slice(0, -1)}_id`;
        }

        if (entry[foreignKey]) {
          const relatedResult = await this._selectWithFilterExecute(joinTable, 'id', entry[foreignKey]);
          enriched[joinTable] = relatedResult.data && relatedResult.data.length > 0 ? relatedResult.data[0] : null;
        }
      }

      return enriched;
    }));

    if (single) {
      return { data: enrichedData[0], error: null };
    }
    return { data: enrichedData, error: null };
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
      eq: (field, value) => self._selectWithJoinsAndFilter(storeName, fields, { [field]: { value, operator: 'eq' } }),
      order: (field, options) => self.initPromise.then(() => self._selectWithJoinsAndOrder(storeName, fields, field, options))
    };
  }

  _selectWithJoinsAndFilter(storeName, fields, filters) {
    const self = this;

    return {
      eq: (field, value) => self._selectWithJoinsAndFilter(storeName, fields, { ...filters, [field]: { value, operator: 'eq' } }),
      order: (field, options) => self.initPromise.then(() => self._selectWithJoinsFiltersAndOrder(storeName, fields, filters, field, options)),
      then: (resolve, reject) => {
        return self.initPromise
          .then(() => self._selectWithJoinsFiltersExecute(storeName, fields, filters))
          .then(resolve, reject);
      }
    };
  }

  async _selectWithJoinsFiltersExecute(storeName, fields, filters) {
    await this.initPromise;

    return new Promise(async (resolve) => {
      // Get main records with multiple filters
      const mainResult = await this._selectWithMultipleFiltersAdvancedExecute(storeName, filters);

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
          // Handle different foreign key patterns
          let foreignKey;
          if (joinTable === 'depots') {
            foreignKey = 'depot_id';
          } else if (joinTable === 'operators') {
            foreignKey = 'operator_id';
          } else if (joinTable === 'bus_types') {
            foreignKey = 'bus_type_id';
          } else {
            foreignKey = `${joinTable.slice(0, -1)}_id`; // e.g., routes -> route_id
          }

          if (entry[foreignKey]) {
            const relatedResult = await this._selectWithFilterExecute(joinTable, 'id', entry[foreignKey]);
            enriched[joinTable] = relatedResult.data && relatedResult.data.length > 0 ? relatedResult.data[0] : null;
          }
        }

        return enriched;
      }));

      resolve({ data: enrichedData, error: null });
    });
  }

  async _selectWithJoinsFiltersAndOrder(storeName, fields, filters, orderField, orderOptions) {
    const result = await this._selectWithJoinsFiltersExecute(storeName, fields, filters);

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
          // Handle different foreign key patterns
          let foreignKey;
          if (joinTable === 'depots') {
            foreignKey = 'depot_id';
          } else if (joinTable === 'operators') {
            foreignKey = 'operator_id';
          } else if (joinTable === 'bus_types') {
            foreignKey = 'bus_type_id';
          } else {
            foreignKey = `${joinTable.slice(0, -1)}_id`;
          }

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
   * Verify database integrity
   */
  async verifyIntegrity() {
    await this.initPromise;

    const requiredStores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries', 'fleet_entries'];
    const missingStores = [];
    const storeStats = {};

    for (const storeName of requiredStores) {
      if (!this.db.objectStoreNames.contains(storeName)) {
        missingStores.push(storeName);
      } else {
        const result = await this._selectAll(storeName);
        storeStats[storeName] = {
          count: result.data ? result.data.length : 0,
          exists: true
        };
      }
    }

    const isValid = missingStores.length === 0;

    return {
      isValid,
      version: this.db.version,
      missingStores,
      storeStats,
      message: isValid 
        ? 'Database integrity verified - all stores present' 
        : `Missing stores: ${missingStores.join(', ')}`
    };
  }

  /**
   * Export all data as JSON (for backup)
   */
  async exportData() {
    await this.initPromise;

    const stores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries', 'fleet_entries'];
    const exportData = {
      version: this.db.version,
      exportDate: new Date().toISOString(),
      data: {}
    };

    for (const storeName of stores) {
      if (this.db.objectStoreNames.contains(storeName)) {
        const result = await this._selectAll(storeName);
        exportData.data[storeName] = result.data || [];
      }
    }

    return exportData;
  }

  /**
   * Import data from JSON (supports both old and new format)
   */
  async importData(importData) {
    await this.initPromise;

    // Support both old format (direct data) and new format (with metadata)
    const data = importData.data || importData;
    const stores = ['depots', 'operators', 'bus_types', 'routes', 'schedules', 'schedule_entries', 'fleet_entries'];

    console.log('Starting data import...');
    const importStats = {};

    for (const storeName of stores) {
      if (data[storeName] && Array.isArray(data[storeName])) {
        console.log(`Importing ${data[storeName].length} records to ${storeName}...`);
        
        // Clear existing data
        await this._clearStore(storeName);

        // Insert new data in batches to avoid transaction timeout
        const batchSize = 100;
        let imported = 0;
        
        for (let i = 0; i < data[storeName].length; i += batchSize) {
          const batch = data[storeName].slice(i, i + batchSize);
          try {
            await this._insertExecute(storeName, batch);
            imported += batch.length;
          } catch (error) {
            console.error(`Error importing batch for ${storeName}:`, error);
            throw new Error(`Failed to import ${storeName}: ${error.message}`);
          }
        }
        
        importStats[storeName] = imported;
        console.log(`✓ Imported ${imported} records to ${storeName}`);
      }
    }

    console.log('Data import complete:', importStats);
    return importStats;
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
