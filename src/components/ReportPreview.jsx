'use client';

import React, { useState, useEffect } from 'react';
import { generateReportPDF } from '../services/reportGenerator';
import { fetchOtherDutiesForReport, formatOtherDutiesForReport } from '../lib/otherDutiesHelper';

/**
 * ReportPreview Component
 * Displays a preview of the bus schedule report in the browser
 * and provides buttons to download or print the PDF version
 * 
 * @param {Object} reportData - Contains depot, date, and entries for the report
 */
export default function ReportPreview({ reportData }) {
  const [generating, setGenerating] = useState(false);
  const [otherDutiesData, setOtherDutiesData] = useState([]);
  const [otherDutiesLoading, setOtherDutiesLoading] = useState(true);

  // Fetch Other Duties data when report data changes
  useEffect(() => {
    const loadOtherDuties = async () => {
      if (!reportData || !reportData.date) {
        setOtherDutiesData([]);
        setOtherDutiesLoading(false);
        return;
      }

      setOtherDutiesLoading(true);
      try {
        let depotId = reportData.depot_id;

        // If depot_id is not provided, look it up by name
        if (!depotId && reportData.depot) {
          const storageManager = (await import('../lib/storage/storageManager')).default;
          const client = storageManager.getClient();

          const { data: depots } = await client
            .from('depots')
            .select('id')
            .eq('name', reportData.depot)
            .single();

          if (depots && depots.id) {
            depotId = depots.id;
          }
        }

        if (depotId) {
          const duties = await fetchOtherDutiesForReport(depotId, reportData.date);
          setOtherDutiesData(duties);
        } else {
          setOtherDutiesData([]);
        }
      } catch (error) {
        console.error('Error loading other duties:', error);
        setOtherDutiesData([]);
      } finally {
        setOtherDutiesLoading(false);
      }
    };

    loadOtherDuties();
  }, [reportData]);

  /**
   * Handle PDF download
   * Generates and downloads the PDF file to the user's device
   */
  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      console.log('Starting PDF download...', reportData);
      await generateReportPDF(reportData, false);
      console.log('PDF download completed');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Error downloading PDF. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Handle PDF print preview
   * Opens the PDF in a new browser tab for preview/printing
   */
  const handlePrintPreview = async () => {
    setGenerating(true);
    try {
      console.log('Starting PDF preview...', reportData);
      await generateReportPDF(reportData, true);
      console.log('PDF preview completed');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      alert('Error previewing PDF. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Group entries by category, operator, and bus type
   * - BEST entries: grouped by bus_type only (no operator)
   * - WET_LEASE entries: grouped by BOTH operator AND bus_type (each combination gets its own section)
   * This creates separate sections for each unique combination
   */
  const groupedEntries = reportData.entries.reduce((acc, entry) => {
    const category = entry.bus_types?.category || 'BEST';
    const busTypeId = entry.bus_types?.id || 'unknown';
    const operatorId = entry.operator_id;

    let groupKey;
    // If entry has an operator_id, it's a WET_LEASE entry
    if (operatorId) {
      // WET_LEASE entries: group by BOTH operator AND bus_type
      groupKey = `WL_${operatorId}_${busTypeId}`;
    } else {
      // BEST entries: group by bus_type only
      groupKey = `BEST_${busTypeId}`;
    }

    // Create new group if it doesn't exist
    if (!acc[groupKey]) {
      acc[groupKey] = {
        category: operatorId ? 'WET_LEASE' : 'BEST',
        operator: entry.operators,
        operatorId: operatorId,
        busType: entry.bus_types,
        entries: [],
        sortOrder: operatorId ? 1000 : (entry.bus_types?.display_order || 0)
      };
    } else {
      // If operator is null in the group but this entry has operator data, update it
      if (!acc[groupKey].operator && entry.operators) {
        acc[groupKey].operator = entry.operators;
      }
    }
    acc[groupKey].entries.push(entry);
    return acc;
  }, {});

  /**
   * Sort groups in the following order:
   * 1. BEST categories first (sorted by display_order)
   * 2. WET_LEASE categories (sorted alphabetically by operator name, then by bus type name)
   * 3. Special case: "BEST" operator name comes first among WET_LEASE entries
   */
  const sortedGroups = Object.entries(groupedEntries).sort((a, b) => {
    const groupA = a[1];
    const groupB = b[1];

    // BEST category entries (no operator) come before WET_LEASE
    if (groupA.category === 'BEST' && groupB.category !== 'BEST') return -1;
    if (groupA.category !== 'BEST' && groupB.category === 'BEST') return 1;

    // Both BEST category: sort by display_order
    if (groupA.category === 'BEST' && groupB.category === 'BEST') {
      return (groupA.busType?.display_order || 0) - (groupB.busType?.display_order || 0);
    }

    // Both WET_LEASE: special handling for "BEST" operator name
    const operatorA = groupA.operator?.name || '';
    const operatorB = groupB.operator?.name || '';

    // If operator A is "BEST", it comes first
    if (operatorA === 'BEST' && operatorB !== 'BEST') return -1;
    if (operatorA !== 'BEST' && operatorB === 'BEST') return 1;

    // Both are "BEST" operator OR both are other operators: sort by operator name
    const operatorCompare = operatorA.localeCompare(operatorB);

    if (operatorCompare !== 0) return operatorCompare;

    // Same operator: sort by bus type name
    const busTypeA = groupA.busType?.name || '';
    const busTypeB = groupB.busType?.name || '';
    return busTypeA.localeCompare(busTypeB);
  });

  /**
   * Merge entries with the same route into a single entry
   * Combines Mon-Sat and Sunday data from separate entries
   * Then sorts by route code in ascending numeric order
   */
  const mergeEntriesByRoute = (entries) => {
    const routeMap = new Map();

    entries.forEach(entry => {
      const routeId = entry.route_id;

      if (!routeMap.has(routeId)) {
        // First entry for this route - initialize with current entry
        routeMap.set(routeId, { ...entry });
      } else {
        // Route already exists - merge the data
        const existing = routeMap.get(routeId);

        // Helper to merge values - prefer non-dash values
        const mergeValue = (existingVal, newVal) => {
          const isDash = (val) => val === '-' || val === null || val === undefined || val === '';

          // If existing is dash/empty, use new value
          if (isDash(existingVal)) return newVal;
          // If new is dash/empty, keep existing
          if (isDash(newVal)) return existingVal;
          // Both have values - prefer the non-zero one, or sum them
          const existingNum = parseInt(existingVal) || 0;
          const newNum = parseInt(newVal) || 0;
          return Math.max(existingNum, newNum).toString();
        };

        // Merge all schedule and duty fields
        existing.mon_sat_am = mergeValue(existing.mon_sat_am, entry.mon_sat_am);
        existing.mon_sat_noon = mergeValue(existing.mon_sat_noon, entry.mon_sat_noon);
        existing.mon_sat_pm = mergeValue(existing.mon_sat_pm, entry.mon_sat_pm);
        existing.sun_am = mergeValue(existing.sun_am, entry.sun_am);
        existing.sun_noon = mergeValue(existing.sun_noon, entry.sun_noon);
        existing.sun_pm = mergeValue(existing.sun_pm, entry.sun_pm);
        existing.duties_driver_ms = mergeValue(existing.duties_driver_ms, entry.duties_driver_ms);
        existing.duties_cond_ms = mergeValue(existing.duties_cond_ms, entry.duties_cond_ms);
        existing.duties_driver_sun = mergeValue(existing.duties_driver_sun, entry.duties_driver_sun);
        existing.duties_cond_sun = mergeValue(existing.duties_cond_sun, entry.duties_cond_sun);

        routeMap.set(routeId, existing);
      }
    });

    // Convert to array and sort by route code (numeric ascending order)
    const mergedEntries = Array.from(routeMap.values());

    mergedEntries.sort((a, b) => {
      const codeA = a.routes?.code;
      const codeB = b.routes?.code;

      // Handle missing codes - put them at the end
      if (!codeA && !codeB) return 0;
      if (!codeA) return 1;
      if (!codeB) return -1;

      // Parse codes as integers for numeric comparison
      const numA = parseInt(codeA, 10);
      const numB = parseInt(codeB, 10);

      // Handle invalid numbers
      if (isNaN(numA) && isNaN(numB)) return 0;
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;

      // Numeric comparison (ascending order)
      return numA - numB;
    });

    return mergedEntries;
  };

  /**
   * Calculate totals for a group of entries
   * Sums up all schedule positions and duty allocations
   */
  const calculateGroupTotals = (entries) => {
    return entries.reduce((totals, entry) => {
      // Helper to parse values for calculation
      const parseValue = (val) => {
        if (val === '-' || val === null || val === undefined || val === '') return 0;
        return parseInt(val) || 0;
      };

      return {
        mon_sat_am: totals.mon_sat_am + parseValue(entry.mon_sat_am),
        mon_sat_noon: totals.mon_sat_noon + parseValue(entry.mon_sat_noon),
        mon_sat_pm: totals.mon_sat_pm + parseValue(entry.mon_sat_pm),
        sun_am: totals.sun_am + parseValue(entry.sun_am),
        sun_noon: totals.sun_noon + parseValue(entry.sun_noon),
        sun_pm: totals.sun_pm + parseValue(entry.sun_pm),
        duties_driver_ms: totals.duties_driver_ms + parseValue(entry.duties_driver_ms),
        duties_cond_ms: totals.duties_cond_ms + parseValue(entry.duties_cond_ms),
        duties_driver_sun: totals.duties_driver_sun + parseValue(entry.duties_driver_sun),
        duties_cond_sun: totals.duties_cond_sun + parseValue(entry.duties_cond_sun)
      };
    }, {
      mon_sat_am: 0, mon_sat_noon: 0, mon_sat_pm: 0,
      sun_am: 0, sun_noon: 0, sun_pm: 0,
      duties_driver_ms: 0, duties_cond_ms: 0,
      duties_driver_sun: 0, duties_cond_sun: 0
    });
  };

  /**
   * Format values for display
   * Converts null, undefined, or empty strings to '-'
   */
  const formatValue = (val) => {
    if (val === '-' || val === null || val === undefined || val === '') return '-';
    return val;
  };

  return (
    <div className="report-preview-container">
      <div className="report-preview-header">
        <h2>Report Preview</h2>
        <div className="report-actions">
          <button
            onClick={handlePrintPreview}
            className="btn-preview"
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Print Preview'}
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn-download"
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      <div className="report-preview-content">
        <div className="report-header-info">
          <h3>{reportData.depot} Depot w.e.f.:- {new Date(reportData.date).toLocaleDateString('en-GB')}</h3>
          {reportData.actualDataDate && reportData.actualDataDate !== reportData.date && (
            <p className="data-date-notice">
              Note: Using data from {new Date(reportData.actualDataDate).toLocaleDateString('en-GB')} (most recent available)
            </p>
          )}
        </div>

        <div className="report-table-wrapper">
          <table className="report-table">
            <thead>
              <tr>
                <th rowSpan="3">Route</th>
                <th rowSpan="3">Code No.</th>
                <th colSpan="6">Schedule Turnout Position</th>
                <th colSpan="4">Allocation of Duties</th>
              </tr>
              <tr>
                <th colSpan="3">Mon To Sat</th>
                <th colSpan="3">Sunday</th>
                <th colSpan="2">DRIVERS</th>
                <th colSpan="2">CONDUCTORS</th>
              </tr>
              <tr>
                <th>AM</th>
                <th>NOON</th>
                <th>PM</th>
                <th>AM</th>
                <th>NOON</th>
                <th>PM</th>
                <th>Mon To Sat</th>
                <th>Sunday</th>
                <th>Mon To Sat</th>
                <th>Sunday</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map(([groupKey, group]) => {
                const { category, operator, busType, entries } = group;

                // Merge entries with the same route before displaying
                const mergedEntries = mergeEntriesByRoute(entries);
                const totals = calculateGroupTotals(mergedEntries);

                /**
                 * Build category name for the section header
                 * - BEST: Shows only bus type name (e.g., "AC")
                 * - WET_LEASE: Shows "Operator Name - Bus Type Name" (e.g., "TMT - AC")
                 */
                let categoryName;
                if (category === 'BEST') {
                  categoryName = busType?.name || 'Unknown Bus Type';
                } else {
                  // For WET_LEASE, show bus type and operator
                  const busTypeName = busType?.name || 'Unknown Bus Type';

                  // Try to get operator name from the group or from any entry in the group
                  let operatorName = operator?.name;
                  if (!operatorName) {
                    // Fallback: find operator name from entries
                    const entryWithOperator = entries.find(e => e.operators?.name);
                    operatorName = entryWithOperator?.operators?.name || 'Unknown Operator';
                  }

                  // Format: "Operator Name - Bus Type Name"
                  categoryName = `${operatorName} - ${busTypeName}`;
                }

                return (
                  <React.Fragment key={groupKey}>
                    {/* Category header row */}
                    <tr className="category-header">
                      <td colSpan="12">{categoryName}</td>
                    </tr>
                    {/* Data rows for each entry in this group */}
                    {mergedEntries.map((entry, idx) => (
                      <tr key={idx}>
                        <td>{entry.routes?.name || '-'}</td>
                        <td>{entry.routes?.code || '-'}</td>
                        <td>{formatValue(entry.mon_sat_am)}</td>
                        <td>{formatValue(entry.mon_sat_noon)}</td>
                        <td>{formatValue(entry.mon_sat_pm)}</td>
                        <td>{formatValue(entry.sun_am)}</td>
                        <td>{formatValue(entry.sun_noon)}</td>
                        <td>{formatValue(entry.sun_pm)}</td>
                        <td>{formatValue(entry.duties_driver_ms)}</td>
                        <td>{formatValue(entry.duties_driver_sun)}</td>
                        <td>{formatValue(entry.duties_cond_ms)}</td>
                        <td>{formatValue(entry.duties_cond_sun)}</td>
                      </tr>
                    ))}
                    {/* Total row for this group */}
                    <tr className="total-row">
                      <td colSpan="2">Total :-</td>
                      <td>{totals.mon_sat_am || 0}</td>
                      <td>{totals.mon_sat_noon || 0}</td>
                      <td>{totals.mon_sat_pm || 0}</td>
                      <td>{totals.sun_am || 0}</td>
                      <td>{totals.sun_noon || 0}</td>
                      <td>{totals.sun_pm || 0}</td>
                      <td>{totals.duties_driver_ms || 0}</td>
                      <td>{totals.duties_driver_sun || 0}</td>
                      <td>{totals.duties_cond_ms || 0}</td>
                      <td>{totals.duties_cond_sun || 0}</td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Other Duties (left) and Summary Box (right) */}
        <div className="report-bottom-section">
          {/* Other Duties Section - Left Side */}
          <div className="other-duties-section">
            {!otherDutiesLoading && otherDutiesData.length > 0 && (
              <div className="other-duties-list">
                {formatOtherDutiesForReport(otherDutiesData).map((line, index) => (
                  <div key={index} className="other-duty-line">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary Statistics Box - Right Side */}
          <div className="summary-box-section">
            {(() => {
              // Calculate grand totals from all groups
              const grandTotal = sortedGroups.reduce((acc, [, group]) => {
                const mergedEntries = mergeEntriesByRoute(group.entries);
                const totals = calculateGroupTotals(mergedEntries);
                return {
                  duties_driver_ms: acc.duties_driver_ms + totals.duties_driver_ms,
                  duties_driver_sun: acc.duties_driver_sun + totals.duties_driver_sun,
                  duties_cond_ms: acc.duties_cond_ms + totals.duties_cond_ms,
                  duties_cond_sun: acc.duties_cond_sun + totals.duties_cond_sun
                };
              }, {
                duties_driver_ms: 0,
                duties_driver_sun: 0,
                duties_cond_ms: 0,
                duties_cond_sun: 0
              });

              // Calculate summary statistics
              const calculateSummary = () => {
                // Calculate averages
                const driverAvg = ((grandTotal.duties_driver_ms * 6) + grandTotal.duties_driver_sun) / 7;
                const conductorAvg = ((grandTotal.duties_cond_ms * 6) + grandTotal.duties_cond_sun) / 7;

                // Extract platform duties from other duties data
                const extractPlatformDuties = () => {
                  const categories = {
                    nonPlatformDriver: 0,
                    nonPlatformConductor: 0,
                    otherDutiesDriver: 0,
                    otherDutiesConductor: 0
                  };

                  if (!otherDutiesData || otherDutiesData.length === 0) {
                    return categories;
                  }

                  const normalizeText = (text) => {
                    if (!text) return '';
                    return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
                  };

                  const categorizePlatform = (platformName) => {
                    const normalized = normalizeText(platformName);
                    if (normalized.includes('non') && normalized.includes('platform') && normalized.includes('driver')) {
                      return 'nonPlatformDriver';
                    }
                    if (normalized.includes('non') && normalized.includes('platform') && normalized.includes('conductor')) {
                      return 'nonPlatformConductor';
                    }
                    if (normalized.includes('other') && (normalized.includes('duties') || normalized.includes('duty')) && normalized.includes('driver')) {
                      return 'otherDutiesDriver';
                    }
                    if (normalized.includes('other') && (normalized.includes('duties') || normalized.includes('duty')) && normalized.includes('conductor')) {
                      return 'otherDutiesConductor';
                    }
                    return null;
                  };

                  otherDutiesData.forEach(entry => {
                    const category = categorizePlatform(entry.platformName);
                    if (category && categories.hasOwnProperty(category)) {
                      categories[category] += entry.totalValue || 0;
                    }
                  });

                  return categories;
                };

                const platformDuties = extractPlatformDuties();

                // Calculate leave reserve
                const driverLeaveReserve = (driverAvg + platformDuties.nonPlatformDriver) * 0.36;
                const conductorLeaveReserve = (conductorAvg + platformDuties.nonPlatformConductor) * 0.36;

                // Calculate grand totals
                const driverGrandTotal = driverAvg + platformDuties.nonPlatformDriver + driverLeaveReserve + platformDuties.otherDutiesDriver;
                const conductorGrandTotal = conductorAvg + platformDuties.nonPlatformConductor + conductorLeaveReserve + platformDuties.otherDutiesConductor;

                return {
                  driver: {
                    average: Math.round(driverAvg),
                    nonPlatform: platformDuties.nonPlatformDriver,
                    leaveReserve: Math.round(driverLeaveReserve),
                    others: platformDuties.otherDutiesDriver,
                    grandTotal: Math.round(driverGrandTotal)
                  },
                  conductor: {
                    average: Math.round(conductorAvg),
                    nonPlatform: platformDuties.nonPlatformConductor,
                    leaveReserve: Math.round(conductorLeaveReserve),
                    others: platformDuties.otherDutiesConductor,
                    grandTotal: Math.round(conductorGrandTotal)
                  }
                };
              };

              const summary = calculateSummary();

              return (
                <table className="summary-table">
                  <tbody>
                    <tr>
                      <td className="summary-label">AVERAGE :-</td>
                      <td>{summary.driver.average}</td>
                      <td>{summary.conductor.average}</td>
                    </tr>
                    <tr>
                      <td className="summary-label">Non Platform Duties :-</td>
                      <td>{summary.driver.nonPlatform}</td>
                      <td>{summary.conductor.nonPlatform}</td>
                    </tr>
                    <tr>
                      <td className="summary-label">Leave Reserve :-</td>
                      <td>{summary.driver.leaveReserve}</td>
                      <td>{summary.conductor.leaveReserve}</td>
                    </tr>
                    <tr>
                      <td className="summary-label">Others :-</td>
                      <td>{summary.driver.others}</td>
                      <td>{summary.conductor.others}</td>
                    </tr>
                    <tr className="summary-grand-total">
                      <td className="summary-label">Grand Total :-</td>
                      <td>{summary.driver.grandTotal}</td>
                      <td>{summary.conductor.grandTotal}</td>
                    </tr>
                  </tbody>
                </table>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}