/**
 * Helpers shared across depot and requirement reports for temporal schedule data.
 */

const DASH_VALUES = new Set(['-', null, undefined, '']);

const parseDutyValue = (value) => {
  if (DASH_VALUES.has(value)) return 0;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const buildEntryKey = (entry = {}) => {
  const routeId = entry.route_id || 'null';
  const operatorId = entry.operator_id || 'null';
  const busTypeId = entry.bus_type_id || 'null';
  return `${routeId}_${operatorId}_${busTypeId}`;
};

const toTimestamp = (entry = {}) => {
  const timestampSource = entry.modified_at || entry.created_at;
  return timestampSource ? new Date(timestampSource).getTime() : 0;
};

const isDeletedEffective = (entry = {}, reportDate) => {
  if (!entry.is_deleted || !entry.deleted_at) return false;
  const deletedAt = new Date(entry.deleted_at).getTime();
  const cutoff = new Date(reportDate).getTime();
  return deletedAt <= cutoff;
};

/**
 * Collapse multiple schedule entries for the same route/operator/bus type into the latest (non-deleted) one.
 */
export const mergeTemporalEntries = (entries = [], reportDate) => {
  const routeMap = new Map();

  entries.forEach(entry => {
    const key = buildEntryKey(entry);
    const entryTimestamp = toTimestamp(entry);

    if (isDeletedEffective(entry, reportDate)) {
      routeMap.set(key, { deleted: true, timestamp: entryTimestamp });
      return;
    }

    const existing = routeMap.get(key);

    if (existing?.deleted) {
      // Once a route is marked deleted as of the selected date, ignore later entries
      return;
    }

    if (!existing || entryTimestamp > existing.timestamp) {
      routeMap.set(key, { entry, timestamp: entryTimestamp, deleted: false });
    }
  });

  return Array.from(routeMap.values())
    .filter(value => value && !value.deleted && value.entry)
    .map(value => value.entry);
};

/**
 * Sum the driver and conductor duty totals from a list of schedule entries.
 */
export const calculateDutyTotalsFromEntries = (entries = []) => {
  return entries.reduce((totals, entry) => {
    totals.duties_driver_ms += parseDutyValue(entry.duties_driver_ms);
    totals.duties_driver_sun += parseDutyValue(entry.duties_driver_sun);
    totals.duties_cond_ms += parseDutyValue(entry.duties_cond_ms);
    totals.duties_cond_sun += parseDutyValue(entry.duties_cond_sun);
    return totals;
  }, {
    duties_driver_ms: 0,
    duties_driver_sun: 0,
    duties_cond_ms: 0,
    duties_cond_sun: 0
  });
};
