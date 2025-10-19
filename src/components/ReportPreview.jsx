'use client';

import React, { useState } from 'react';
import { generateReportPDF } from '../services/reportGenerator';

/**
 * ReportPreview Component
 * Displays a preview of the bus schedule report in the browser
 * and provides buttons to download or print the PDF version
 * 
 * @param {Object} reportData - Contains depot, date, and entries for the report
 */
export default function ReportPreview({ reportData }) {
  const [generating, setGenerating] = useState(false);

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
                const totals = calculateGroupTotals(entries);

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
                    {entries.map((entry, idx) => (
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
      </div>
    </div>
  );
}
