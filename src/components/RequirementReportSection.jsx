'use client';

import React, { useState, useEffect, useRef } from 'react';
import storageManager from '../lib/storage/storageManager';
import RequirementReportDisplay from './RequirementReportDisplay';
import { calculateRequirementStats, formatRequirementStats, extractDutiesForType } from '../utils/requirementCalculations';
import { fetchOtherDutiesForReport } from '../lib/otherDutiesHelper';

export default function RequirementReportSection() {
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [reportDate, setReportDate] = useState(getCurrentDate());
  const [loading, setLoading] = useState(false);
  const [driverReportData, setDriverReportData] = useState(null);
  const [conductorReportData, setConductorReportData] = useState(null);
  const driverReportRef = useRef(null);
  const conductorReportRef = useRef(null);

  const generateRequirementReport = async () => {
    if (!reportDate) {
      alert('Please select a date');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 Generating requirement reports for date:', reportDate);

      // 1. Fetch all depots (sorted by display_order)
      const { data: depots, error: depotsError } = await storageManager
        .from('depots')
        .select('*')
        .order('display_order', { ascending: true })
        .order('name', { ascending: true });

      if (depotsError) throw new Error('Error fetching depots: ' + depotsError.message);
      console.log('📊 Depots fetched:', depots?.length);

      // 2. Fetch all schedules up to the selected date
      const { data: allSchedules, error: schedulesError } = await storageManager
        .from('schedules')
        .select('id, depot_id, schedule_date')
        .lte('schedule_date', reportDate)
        .order('schedule_date', { ascending: false });

      if (schedulesError) throw new Error('Error fetching schedules: ' + schedulesError.message);

      if (!allSchedules || allSchedules.length === 0) {
        alert('No schedule data found for any depot on or before the selected date');
        setLoading(false);
        return;
      }

      // Get the latest schedule for each depot
      const schedulesByDepot = new Map();
      allSchedules.forEach(schedule => {
        if (!schedulesByDepot.has(schedule.depot_id)) {
          schedulesByDepot.set(schedule.depot_id, schedule);
        }
      });

      const schedules = Array.from(schedulesByDepot.values());
      console.log('📅 Latest schedules per depot:', schedules.length);

      // 3. Fetch all schedule entries for these schedules
      const scheduleIds = schedules.map(s => s.id);
      const { data: allEntries, error: entriesError } = await storageManager
        .from('schedule_entries')
        .select('*');

      if (entriesError) throw new Error('Error fetching schedule entries: ' + entriesError.message);

      // Filter entries by schedule IDs and exclude deleted entries
      const filteredEntries = allEntries.filter(e =>
        scheduleIds.includes(e.schedule_id) && !e.is_deleted
      );
      console.log('📋 Filtered entries:', filteredEntries.length);

      // 4. Process each depot
      const driverDepotData = [];
      const conductorDepotData = [];

      for (const depot of depots) {
        const depotSchedule = schedules.find(s => s.depot_id === depot.id);

        if (!depotSchedule) {
          console.log(`⚠️ No schedule for depot: ${depot.name}`);
          // Add empty data
          driverDepotData.push({
            name: depot.name,
            stats: formatRequirementStats(calculateRequirementStats({
              mon_sat: 0,
              sun: 0,
              non_platform: 0,
              others: 0
            }))
          });
          conductorDepotData.push({
            name: depot.name,
            stats: formatRequirementStats(calculateRequirementStats({
              mon_sat: 0,
              sun: 0,
              non_platform: 0,
              others: 0
            }))
          });
          continue;
        }

        // Get entries for this depot
        const depotEntries = filteredEntries.filter(e => e.schedule_id === depotSchedule.id);

        // Aggregate duty allocations
        let driverMonSat = 0;
        let driverSun = 0;
        let conductorMonSat = 0;
        let conductorSun = 0;

        depotEntries.forEach(entry => {
          const parseValue = (val) => {
            if (val === '-' || val === null || val === undefined || val === '') return 0;
            return parseInt(val) || 0;
          };

          driverMonSat += parseValue(entry.duties_driver_ms);
          driverSun += parseValue(entry.duties_driver_sun);
          conductorMonSat += parseValue(entry.duties_cond_ms);
          conductorSun += parseValue(entry.duties_cond_sun);
        });

        // Fetch other duties for this depot
        const otherDutiesData = await fetchOtherDutiesForReport(depot.id, reportDate);

        // Extract non-platform and other duties
        const driverDuties = extractDutiesForType(otherDutiesData, 'driver');
        const conductorDuties = extractDutiesForType(otherDutiesData, 'conductor');

        // Calculate driver stats
        const driverStats = calculateRequirementStats({
          mon_sat: driverMonSat,
          sun: driverSun,
          non_platform: driverDuties.nonPlatform,
          others: driverDuties.others
        });

        // Calculate conductor stats
        const conductorStats = calculateRequirementStats({
          mon_sat: conductorMonSat,
          sun: conductorSun,
          non_platform: conductorDuties.nonPlatform,
          others: conductorDuties.others
        });

        driverDepotData.push({
          name: depot.name,
          stats: formatRequirementStats(driverStats)
        });

        conductorDepotData.push({
          name: depot.name,
          stats: formatRequirementStats(conductorStats)
        });

        console.log(`✅ Processed ${depot.name}:`, {
          driver: { monSat: driverMonSat, sun: driverSun },
          conductor: { monSat: conductorMonSat, sun: conductorSun }
        });
      }

      // 5. Calculate totals
      const calculateTotals = (depotData) => {
        const totals = {
          monSat: 0,
          sun: 0,
          avgDuty: 0,
          nonPlatform: 0,
          total: 0,
          wOff: 0,
          pl: 0,
          cl: 0,
          sl: 0,
          totalLeaves: 0,
          others: 0,
          grandTotal: 0
        };

        depotData.forEach(depot => {
          Object.keys(totals).forEach(key => {
            totals[key] += depot.stats[key] || 0;
          });
        });

        return totals;
      };

      const driverTotals = calculateTotals(driverDepotData);
      const conductorTotals = calculateTotals(conductorDepotData);

      // 6. Set report data
      setDriverReportData({
        effectiveDate: reportDate,
        depots: driverDepotData,
        totals: driverTotals
      });

      setConductorReportData({
        effectiveDate: reportDate,
        depots: conductorDepotData,
        totals: conductorTotals
      });

      console.log('✅ Requirement reports generated successfully');
    } catch (error) {
      console.error('Error generating requirement reports:', error);
      alert('Error generating requirement reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReports = async () => {
    if (!driverReportData || !conductorReportData) {
      alert('Please generate reports first');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('times');

      // Generate Driver Report (Page 1)
      generateRequirementPDF(doc, driverReportData, 'DRIVERS', true);

      // Add new page for Conductor Report
      doc.addPage();

      // Generate Conductor Report (Page 2)
      generateRequirementPDF(doc, conductorReportData, 'CONDUCTORS', false);

      // Open in new tab for printing
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const handleDownloadReports = async () => {
    if (!driverReportData || !conductorReportData) {
      alert('Please generate reports first');
      return;
    }

    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      doc.setFont('times');

      // Generate Driver Report (Page 1)
      generateRequirementPDF(doc, driverReportData, 'DRIVERS', true);

      // Add new page for Conductor Report
      doc.addPage();

      // Generate Conductor Report (Page 2)
      generateRequirementPDF(doc, conductorReportData, 'CONDUCTORS', false);

      // Download
      const formattedDate = new Date(reportDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');
      doc.save(`Requirement-Report-${formattedDate}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const generateRequirementPDF = (doc, reportData, title, isFirstPage) => {
    const formattedDate = new Date(reportData.effectiveDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Add title
    doc.setFontSize(11);
    doc.setFont('times', 'bold');
    const headerText = `Physical Requirement of ${title} From :- ${formattedDate}`;
    const pageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(headerText);
    const xPosition = (pageWidth - textWidth) / 2;
    doc.text(headerText, xPosition, 20);

    // Prepare table data
    const tableData = reportData.depots.map(depot => [
      depot.name,
      depot.stats.monSat,
      depot.stats.sun,
      depot.stats.avgDuty,
      depot.stats.nonPlatform,
      depot.stats.total,
      depot.stats.wOff,
      depot.stats.pl,
      depot.stats.cl,
      depot.stats.sl,
      depot.stats.totalLeaves,
      depot.stats.others,
      depot.stats.grandTotal
    ]);

    // Add total row
    tableData.push([
      'Total :-',
      reportData.totals.monSat,
      reportData.totals.sun,
      reportData.totals.avgDuty,
      reportData.totals.nonPlatform,
      reportData.totals.total,
      reportData.totals.wOff,
      reportData.totals.pl,
      reportData.totals.cl,
      reportData.totals.sl,
      reportData.totals.totalLeaves,
      reportData.totals.others,
      reportData.totals.grandTotal
    ]);

    // Calculate table width and center position
    const depotWidth = 26;
    const monSatWidth = 22;
    const otherColWidth = 14;
    const totalTableWidth = depotWidth + monSatWidth + (otherColWidth * 11);
    const tableStartX = (doc.internal.pageSize.getWidth() - totalTableWidth) / 2;

    // Generate table
    doc.autoTable({
      startY: 23,
      margin: { left: tableStartX },
      head: [
        [
          { content: 'Depot', rowSpan: 2 },
          { content: 'Mon - Sat', rowSpan: 2 },
          { content: 'Sun', rowSpan: 2 },
          { content: 'Avg\nDuty', rowSpan: 2 },
          { content: 'Non PF.\nDuty', rowSpan: 2 },
          { content: 'Total', rowSpan: 2 },
          { content: 'Leave Reserve', colSpan: 4 },
          { content: 'Total', rowSpan: 2 },
          { content: 'Other', rowSpan: 2 },
          { content: 'Grand\nTotal', rowSpan: 2 }
        ],
        [
          { content: 'W/Off\n20%' },
          { content: 'PL\n10%' },
          { content: 'CL\n4%' },
          { content: 'SL\n4%' }
        ]
      ],
      body: tableData,
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 11,
        cellPadding: 0.5,
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        minCellHeight: 5
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [0, 0, 0],
        cellPadding: 0.5,
        minCellHeight: 6
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: depotWidth },
        1: { cellWidth: monSatWidth },
        2: { cellWidth: otherColWidth },
        3: { cellWidth: otherColWidth },
        4: { cellWidth: otherColWidth },
        5: { cellWidth: otherColWidth },
        6: { cellWidth: otherColWidth },
        7: { cellWidth: otherColWidth },
        8: { cellWidth: otherColWidth },
        9: { cellWidth: otherColWidth },
        10: { cellWidth: otherColWidth },
        11: { cellWidth: otherColWidth },
        12: { cellWidth: otherColWidth }
      },
      didParseCell: function (data) {
        // Make total row bold without background and with bold borders
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [255, 255, 255];
          data.cell.styles.lineWidth = { top: 0.5, bottom: 0.5, left: 0.1, right: 0.1 };
          data.cell.styles.lineColor = { top: [0, 0, 0], bottom: [0, 0, 0], left: [221, 221, 221], right: [221, 221, 221] };
        }
      }
    });
  };

  return (
    <div className="requirement-report-container">
      <div className="report-form-section">
        <h2>Generate Physical Requirement Report</h2>

        <div className="report-inputs">
          <div className="form-group">
            <label htmlFor="requirement-report-date">Select Date:</label>
            <input
              id="requirement-report-date"
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="report-date-input"
            />
          </div>

          <button
            onClick={generateRequirementReport}
            disabled={loading || !reportDate}
            className="btn-generate-report"
          >
            {loading ? 'Generating...' : 'Generate Reports'}
          </button>
        </div>
      </div>

      {driverReportData && conductorReportData && (
        <div className="requirement-reports-preview">
          <div className="requirement-reports-actions">
            <button
              onClick={handleDownloadReports}
              disabled={loading}
              className="btn-download-all"
            >
              📄 Download PDF
            </button>
            <button
              onClick={handlePrintReports}
              disabled={loading}
              className="btn-print-all"
            >
              🖨️ Print Reports
            </button>
          </div>

          <div ref={driverReportRef}>
            <RequirementReportDisplay reportData={driverReportData} type="driver" />
          </div>

          <div style={{ marginTop: '20px' }} ref={conductorReportRef}>
            <RequirementReportDisplay reportData={conductorReportData} type="conductor" />
          </div>
        </div>
      )}
    </div>
  );
}
