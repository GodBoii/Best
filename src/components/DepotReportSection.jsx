'use client';

import React, { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import ReportPreview from './ReportPreview';
import { generateReportPDF } from '../services/reportGenerator';

export default function DepotReportSection() {
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [depots, setDepots] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('');
  const [reportDate, setReportDate] = useState(getCurrentDate());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState('single');
  const [allReportsData, setAllReportsData] = useState([]);

  useEffect(() => {
    fetchDepots();
  }, []);

  const fetchDepots = async () => {
    const { data, error } = await storageManager
      .from('depots')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching depots:', error);
    } else {
      setDepots(data || []);
    }
  };

  const renderReportTableBody = (reportData) => {
    const groupedEntries = reportData.entries.reduce((acc, entry) => {
      const category = entry.bus_types?.category || 'BEST';
      const busTypeId = entry.bus_types?.id || 'unknown';
      const operatorId = entry.operator_id;

      let groupKey;
      if (operatorId) {
        groupKey = `WL_${operatorId}_${busTypeId}`;
      } else {
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
        if (!acc[groupKey].operator && entry.operators) {
          acc[groupKey].operator = entry.operators;
        }
      }
      acc[groupKey].entries.push(entry);
      return acc;
    }, {});

    const sortedGroups = Object.entries(groupedEntries).sort((a, b) => {
      const groupA = a[1];
      const groupB = b[1];

      if (groupA.category === 'BEST' && groupB.category !== 'BEST') return -1;
      if (groupA.category !== 'BEST' && groupB.category === 'BEST') return 1;

      if (groupA.category === 'BEST' && groupB.category === 'BEST') {
        return (groupA.busType?.display_order || 0) - (groupB.busType?.display_order || 0);
      }

      const operatorA = groupA.operator?.name || '';
      const operatorB = groupB.operator?.name || '';

      if (operatorA === 'BEST' && operatorB !== 'BEST') return -1;
      if (operatorA !== 'BEST' && operatorB === 'BEST') return 1;

      const operatorCompare = operatorA.localeCompare(operatorB);

      if (operatorCompare !== 0) return operatorCompare;

      const busTypeA = groupA.busType?.name || '';
      const busTypeB = groupB.busType?.name || '';
      return busTypeA.localeCompare(busTypeB);
    });

    const mergeEntriesByRoute = (entries) => {
      const routeMap = new Map();
      entries.forEach(entry => {
        const routeId = entry.route_id;
        if (!routeMap.has(routeId)) {
          routeMap.set(routeId, { ...entry });
        } else {
          const existing = routeMap.get(routeId);
          const mergeValue = (existingVal, newVal) => {
            const isDash = (val) => val === '-' || val === null || val === undefined || val === '';
            if (isDash(existingVal)) return newVal;
            if (isDash(newVal)) return existingVal;
            const existingNum = parseInt(existingVal) || 0;
            const newNum = parseInt(newVal) || 0;
            return Math.max(existingNum, newNum).toString();
          };
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
      
      const mergedEntries = Array.from(routeMap.values());
      
      mergedEntries.sort((a, b) => {
        const codeA = a.routes?.code;
        const codeB = b.routes?.code;
        
        if (!codeA && !codeB) return 0;
        if (!codeA) return 1;
        if (!codeB) return -1;
        
        const numA = parseInt(codeA, 10);
        const numB = parseInt(codeB, 10);
        
        if (isNaN(numA) && isNaN(numB)) return 0;
        if (isNaN(numA)) return 1;
        if (isNaN(numB)) return -1;
        
        return numA - numB;
      });
      
      return mergedEntries;
    };

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

    return sortedGroups.map(([groupKey, group]) => {
      const { category, operator, busType, entries } = group;
      const mergedEntries = mergeEntriesByRoute(entries);
      const totals = calculateGroupTotals(mergedEntries);

      let categoryName;
      if (category === 'BEST') {
        categoryName = busType?.name || 'Unknown Bus Type';
      } else {
        const busTypeName = busType?.name || 'Unknown Bus Type';
        let operatorName = operator?.name;
        if (!operatorName) {
          const entryWithOperator = entries.find(e => e.operators?.name);
          operatorName = entryWithOperator?.operators?.name || 'Unknown Operator';
        }
        categoryName = `${operatorName} - ${busTypeName}`;
      }

      return (
        <React.Fragment key={groupKey}>
          <tr className="category-header">
            <td colSpan="12">{categoryName}</td>
          </tr>
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
    });
  };

  const generateSingleDepotReport = async (depotId, date) => {
    console.log('🔍 Generating report for:', { depot: depotId, date: date });

    const { data: schedules, error: scheduleError } = await storageManager
      .from('schedules')
      .select('id, schedule_date')
      .eq('depot_id', depotId)
      .lte('schedule_date', date);

    if (scheduleError) throw scheduleError;

    if (!schedules || schedules.length === 0) {
      console.log(`⚠️ No schedule data found for depot ${depotId}`);
      return null;
    }

    console.log(`📅 Found ${schedules.length} schedules up to ${date}`);

    const scheduleIds = schedules.map(s => s.id);

    const { data: allEntries, error: entriesError } = await storageManager
      .from('schedule_entries')
      .select(`
          *,
          routes (name, code),
          bus_types (id, name, short_name, category, display_order),
          operators (id, name, short_code)
        `)
      .in('schedule_id', scheduleIds);

    if (entriesError) throw entriesError;

    console.log(`📋 Found ${allEntries?.length || 0} total entries across all schedules`);

    const routeMap = new Map();

    for (const entry of (allEntries || [])) {
      const key = `${entry.route_id}_${entry.operator_id || 'null'}_${entry.bus_type_id}`;

      if (entry.is_deleted && entry.deleted_at) {
        const deletedDate = new Date(entry.deleted_at);
        const selectedDate = new Date(date);

        if (deletedDate <= selectedDate) {
          routeMap.set(key, { deleted: true });
          console.log(`🗑️ Route ${entry.routes?.name} marked as deleted on ${entry.deleted_at}`);
          continue;
        }
      }

      const existing = routeMap.get(key);

      if (existing?.deleted) {
        console.log(`⏭️ Skipping ${entry.routes?.name} - already deleted`);
        continue;
      }

      const entryTimestamp = entry.modified_at || entry.created_at;
      const existingTimestamp = existing ? (existing.modified_at || existing.created_at) : null;

      if (!existing || (entryTimestamp && existingTimestamp && new Date(entryTimestamp) > new Date(existingTimestamp))) {
        routeMap.set(key, entry);
        console.log(`✅ Using ${entry.routes?.name} from ${entryTimestamp}`);
      } else {
        console.log(`⏭️ Skipping older version of ${entry.routes?.name}`);
      }
    }

    const activeEntries = Array.from(routeMap.values())
      .filter(entry => !entry.deleted);

    console.log(`✨ Final active entries: ${activeEntries.length}`);

    const depot = depots.find(d => d.id === depotId);

    return {
      depot: depot.name,
      depot_id: depotId,
      date: date,
      actualDataDate: date,
      entries: activeEntries
    };
  };

  const handleDownloadAllReports = async () => {
    if (allReportsData.length === 0) return;

    setLoading(true);
    try {
      await generateCombinedPDF(allReportsData, false);
    } catch (error) {
      console.error('Error generating combined PDF:', error);
      alert('Error generating combined PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintAllReports = async () => {
    if (allReportsData.length === 0) return;

    setLoading(true);
    try {
      await generateCombinedPDF(allReportsData, true);
    } catch (error) {
      console.error('Error generating combined PDF:', error);
      alert('Error generating combined PDF: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCombinedPDF = async (reportsData, preview = false) => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('times');

    for (let i = 0; i < reportsData.length; i++) {
      const reportData = reportsData[i];

      if (i > 0) {
        doc.addPage();
      }

      await generateReportPDF(reportData, false, doc, i === 0);
    }

    if (preview) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      const formattedDate = new Date(reportDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      doc.save(`All-Depots-Report-${formattedDate}.pdf`);
    }
  };

  const handleGenerateReport = async () => {
    if (reportType === 'single') {
      if (!selectedDepot || !reportDate) {
        alert('Please select both depot and date');
        return;
      }

      setLoading(true);
      setAllReportsData([]);
      try {
        const data = await generateSingleDepotReport(selectedDepot, reportDate);
        if (data) {
          setReportData(data);
        } else {
          alert('No schedule data found for the selected depot on or before the selected date');
        }
      } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report: ' + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      if (!reportDate) {
        alert('Please select a date');
        return;
      }

      setLoading(true);
      setReportData(null);
      try {
        console.log('🔍 Generating reports for all depots on:', reportDate);

        const allReports = [];
        for (const depot of depots) {
          console.log(`\n📊 Processing depot: ${depot.name}`);
          const data = await generateSingleDepotReport(depot.id, reportDate);
          if (data && data.entries.length > 0) {
            allReports.push(data);
          } else {
            console.log(`⚠️ Skipping ${depot.name} - no data available`);
          }
        }

        if (allReports.length === 0) {
          alert('No schedule data found for any depot on or before the selected date');
        } else {
          console.log(`✅ Generated ${allReports.length} reports`);
          setAllReportsData(allReports);
        }
      } catch (error) {
        console.error('Error generating reports:', error);
        alert('Error generating reports: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="report-generator-container">
      <div className="report-form-section">
        <h2>Generate Depot Schedule Report</h2>

        <div className="report-inputs">
          <div className="form-group">
            <label htmlFor="report-type">Report Type:</label>
            <select
              id="report-type"
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setReportData(null);
                setAllReportsData([]);
              }}
              className="report-select"
            >
              <option value="single">Single Depot Report</option>
              <option value="all">All Depots Report</option>
            </select>
          </div>

          {reportType === 'single' && (
            <div className="form-group">
              <label htmlFor="depot-select">Select Depot:</label>
              <select
                id="depot-select"
                value={selectedDepot}
                onChange={(e) => setSelectedDepot(e.target.value)}
                className="report-select"
              >
                <option value="">-- Select Depot --</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>
                    {depot.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="report-date">Select Date:</label>
            <input
              id="report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="report-date-input"
            />
          </div>

          <button
            onClick={handleGenerateReport}
            disabled={loading || (reportType === 'single' && !selectedDepot) || !reportDate}
            className="btn-generate-report"
          >
            {loading ? 'Generating...' : reportType === 'all' ? 'Generate All Reports' : 'Generate Report'}
          </button>
        </div>
      </div>

      {reportData && (
        <ReportPreview reportData={reportData} />
      )}

      {allReportsData.length > 0 && (
        <div className="all-reports-container">
          <div className="all-reports-header">
            <h2>All Depot Reports ({allReportsData.length} depots)</h2>
            <p className="report-info">Generated for date: {reportDate}</p>
            <div className="all-reports-actions">
              <button
                onClick={handleDownloadAllReports}
                disabled={loading}
                className="btn-download-all"
              >
                📄 Download Combined PDF
              </button>
              <button
                onClick={handlePrintAllReports}
                disabled={loading}
                className="btn-print-all"
              >
                🖨️ Print All Reports
              </button>
            </div>
          </div>
          <div className="all-reports-preview">
            {allReportsData.map((report, index) => (
              <div key={index} className="single-report-wrapper">
                <div className="report-preview-content">
                  <div className="report-header-info">
                    <h3>{report.depot} Depot w.e.f.:- {new Date(report.date).toLocaleDateString('en-GB')}</h3>
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
                        {renderReportTableBody(report)}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
