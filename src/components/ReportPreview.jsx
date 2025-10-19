'use client';

import React, { useState } from 'react';
import { generateReportPDF } from '../services/reportGenerator';

export default function ReportPreview({ reportData }) {
  const [generating, setGenerating] = useState(false);

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

  // Group entries by category and operator
  // For BEST: group by bus_type (no operator)
  // For WET_LEASE: group by operator (all bus types under same operator go together)
  const groupedEntries = reportData.entries.reduce((acc, entry) => {
    const category = entry.bus_types?.category || 'BEST';
    const busTypeId = entry.bus_types?.id || 'unknown';
    const operatorId = entry.operator_id;

    let groupKey;
    // If entry has an operator_id, it's WET_LEASE regardless of category field
    if (operatorId) {
      // WET_LEASE entries: group by operator ONLY (not by bus_type)
      groupKey = `WL_${operatorId}`;
    } else {
      // BEST entries: group by bus_type
      groupKey = `BEST_${busTypeId}`;
    }

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

  // Sort groups: BEST categories first, then WET_LEASE
  const sortedGroups = Object.entries(groupedEntries).sort((a, b) => {
    return a[1].sortOrder - b[1].sortOrder;
  });

  // Calculate totals for a group
  const calculateGroupTotals = (entries) => {
    return entries.reduce((totals, entry) => {
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
                <th rowSpan="2">Route</th>
                <th rowSpan="2">Bus Type</th>
                <th rowSpan="2">Code No.</th>
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

                // Build category name
                let categoryName;
                if (category === 'BEST') {
                  categoryName = busType?.name || 'Unknown Bus Type';
                } else {
                  // For WET_LEASE, collect all unique bus type names in this group
                  const busTypeNames = [...new Set(entries.map(e => e.bus_types?.name))].filter(Boolean).join(', ');

                  // Try to get operator name from the group or from any entry in the group
                  let operatorName = operator?.name;
                  if (!operatorName) {
                    // Fallback: find operator name from entries
                    const entryWithOperator = entries.find(e => e.operators?.name);
                    operatorName = entryWithOperator?.operators?.name || 'Unknown Operator';
                  }

                  // Format: "Operator Name - Bus Type Names"
                  categoryName = `${operatorName} - ${busTypeNames || 'Unknown Bus Type'}`;
                }

                return (
                  <React.Fragment key={groupKey}>
                    <tr className="category-header">
                      <td colSpan="13">{categoryName}</td>
                    </tr>
                    {entries.map((entry, idx) => (
                      <tr key={idx}>
                        <td>{entry.routes?.name || '-'}</td>
                        <td>{entry.bus_types?.short_name || ''}</td>
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
                    <tr className="total-row">
                      <td colSpan="3">Total :-</td>
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
