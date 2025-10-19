/**
 * Generates a PDF report for bus schedules
 * @param {Object} reportData - The report data containing depot, date, and entries
 * @param {boolean} preview - If true, opens PDF in new tab; if false, downloads the file
 */
export const generateReportPDF = async (reportData, preview = false) => {
  try {
    // Validate that all required report data is present
    if (!reportData || !reportData.depot || !reportData.date || !reportData.entries) {
      throw new Error('Invalid report data');
    }

    if (reportData.entries.length === 0) {
      throw new Error('No entries to generate report');
    }

    // Dynamic import for client-side only (Next.js optimization)
    const { default: jsPDF } = await import('jspdf');

    // Import autoTable plugin - this extends jsPDF prototype for table generation
    await import('jspdf-autotable');

    // Initialize PDF document in landscape orientation for wide tables
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Set default font to Times New Roman
    doc.setFont('times');

    // Add report header with depot name and date (centered)
    doc.setFontSize(14);
    doc.setFont('times', 'bold');
    const formattedDate = new Date(reportData.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const headerText = `${reportData.depot} Depot  w.e.f.:- ${formattedDate}`;
    const headerPageWidth = doc.internal.pageSize.getWidth();
    const textWidth = doc.getTextWidth(headerText);
    const xPosition = (headerPageWidth - textWidth) / 2;
    doc.text(headerText, xPosition, 15);

    // Define consistent margins and column widths
    // Fixed column widths for consistent alignment across all tables
    // Total: 30 + 18 + (6×14) + (4×24) = 30 + 18 + 84 + 96 = 228mm
    const columnWidths = {
      0: 30,  // Route
      1: 18,  // Code No.
      2: 14,  // AM (Mon-Sat)
      3: 14,  // NOON (Mon-Sat)
      4: 14,  // PM (Mon-Sat)
      5: 14,  // AM (Sunday)
      6: 14,  // NOON (Sunday)
      7: 14,  // PM (Sunday)
      8: 24,  // Drivers Mon-Sat
      9: 24,  // Drivers Sunday
      10: 24, // Conductors Mon-Sat
      11: 24  // Conductors Sunday
    };

    // Calculate margins to center the table
    // A4 landscape width = 297mm, table width = 228mm
    // Remaining space = 297 - 228 = 69mm, so 34.5mm on each side
    const tableWidth = 228;
    const pageWidth = 297;
    const leftMargin = (pageWidth - tableWidth) / 2;
    const rightMargin = (pageWidth - tableWidth) / 2;

    // Add unified column headers at the top (only once)
    // Using body instead of head to ensure consistent width calculation with data tables
    doc.autoTable({
      startY: 22,
      margin: { left: leftMargin, right: rightMargin },
      body: [
        [
          { content: 'Route', rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', font: 'times' } },
          { content: 'Code No.', rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', font: 'times' } },
          { content: 'Schedule Turnout Position', colSpan: 6, styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'Allocation of Duties', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } }
        ],
        [
          { content: 'Mon To Sat', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'Sunday', colSpan: 3, styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'DRIVERS', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'CONDUCTORS', colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } }
        ],
        [
          { content: 'AM', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'NOON', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 10 } },
          { content: 'PM', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'AM', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'NOON', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 10 } },
          { content: 'PM', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'Mon To Sat', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'Sunday', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'Mon To Sat', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } },
          { content: 'Sunday', styles: { halign: 'center', fontStyle: 'bold', font: 'times', fontSize: 12 } }
        ]
      ],
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 10,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: columnWidths[0] },
        1: { halign: 'center', cellWidth: columnWidths[1] },
        2: { halign: 'center', cellWidth: columnWidths[2], fontSize: 12 },
        3: { halign: 'center', cellWidth: columnWidths[3], fontSize: 12 },
        4: { halign: 'center', cellWidth: columnWidths[4], fontSize: 12 },
        5: { halign: 'center', cellWidth: columnWidths[5], fontSize: 12 },
        6: { halign: 'center', cellWidth: columnWidths[6], fontSize: 12 },
        7: { halign: 'center', cellWidth: columnWidths[7], fontSize: 12 },
        8: { halign: 'center', cellWidth: columnWidths[8], fontSize: 12 },
        9: { halign: 'center', cellWidth: columnWidths[9], fontSize: 12 },
        10: { halign: 'center', cellWidth: columnWidths[10], fontSize: 12 },
        11: { halign: 'center', cellWidth: columnWidths[11], fontSize: 12 }
      }
    });

    /**
     * Group entries by category, operator, and bus type
     * - BEST entries: grouped by bus_type only (no operator)
     * - WET_LEASE entries: grouped by BOTH operator AND bus_type (each combination gets its own section)
     * This creates separate tables for each unique combination
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
          operator: entry.operators, // Joined operator data from database
          operatorId: operatorId, // Store the ID as backup
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

    console.log('\n=== GROUPED ENTRIES ===');
    Object.entries(groupedEntries).forEach(([key, group]) => {
      console.log(`\nGroup Key: ${key}`);
      console.log('Category:', group.category);
      console.log('Bus Type:', group.busType?.name);
      console.log('Operator:', group.operator);
      console.log('Entry count:', group.entries.length);
      console.log('First entry operator_id:', group.entries[0]?.operator_id);
      console.log('First entry operators object:', group.entries[0]?.operators);
    });

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

    console.log('\n=== SORTED GROUPS ===');
    sortedGroups.forEach(([key, group]) => {
      console.log(`${key}: ${group.category} - ${group.operator?.name || 'NO OPERATOR'} - ${group.busType?.name}`);
    });

    /**
     * Helper function to parse values for calculation
     * Converts '-', null, undefined, or empty strings to 0
     */
    const parseValue = (val) => {
      if (val === '-' || val === null || val === undefined || val === '') return 0;
      return parseInt(val) || 0;
    };

    /**
     * Helper function to format values for display
     * Converts null, undefined, or empty strings to '-'
     */
    const formatValue = (val) => {
      if (val === '-' || val === null || val === undefined || val === '') return '-';
      return val.toString();
    };

    /**
     * Calculate totals for a group of entries
     * Sums up all schedule positions and duty allocations
     */
    const calculateGroupTotals = (entries) => {
      return entries.reduce((totals, entry) => ({
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
      }), {
        mon_sat_am: 0, mon_sat_noon: 0, mon_sat_pm: 0,
        sun_am: 0, sun_noon: 0, sun_pm: 0,
        duties_driver_ms: 0, duties_cond_ms: 0,
        duties_driver_sun: 0, duties_cond_sun: 0
      });
    };

    // Track Y position for next table
    let startY = doc.lastAutoTable.finalY;

    // Initialize BEST total accumulator (for all BEST category entries)
    let bestTotal = {
      mon_sat_am: 0, mon_sat_noon: 0, mon_sat_pm: 0,
      sun_am: 0, sun_noon: 0, sun_pm: 0,
      duties_driver_ms: 0, duties_cond_ms: 0,
      duties_driver_sun: 0, duties_cond_sun: 0
    };

    // Initialize grand total accumulator (for all entries)
    let grandTotal = {
      mon_sat_am: 0, mon_sat_noon: 0, mon_sat_pm: 0,
      sun_am: 0, sun_noon: 0, sun_pm: 0,
      duties_driver_ms: 0, duties_cond_ms: 0,
      duties_driver_sun: 0, duties_cond_sun: 0
    };

    // Process each group and generate its table
    sortedGroups.forEach(([, group]) => {
      const { category, operator, busType, entries } = group;

      /**
       * Build category title for the table header
       * - BEST: Shows only bus type name (e.g., "AC")
       * - WET_LEASE: Shows "Operator Name - Bus Type Name" (e.g., "TMT - AC")
       */
      let categoryTitle = '';
      if (category === 'BEST') {
        categoryTitle = busType?.name || 'Unknown Bus Type';
      } else if (category === 'WET_LEASE') {
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
        categoryTitle = `${operatorName} - ${busTypeName}`;
      }

      // Prepare table data - map each entry to a row
      const tableData = entries.map(entry => [
        entry.routes?.name || '-',
        entry.routes?.code || '-',
        formatValue(entry.mon_sat_am),
        formatValue(entry.mon_sat_noon),
        formatValue(entry.mon_sat_pm),
        formatValue(entry.sun_am),
        formatValue(entry.sun_noon),
        formatValue(entry.sun_pm),
        formatValue(entry.duties_driver_ms),
        formatValue(entry.duties_driver_sun),
        formatValue(entry.duties_cond_ms),
        formatValue(entry.duties_cond_sun)
      ]);

      // Calculate totals for this group
      const totals = calculateGroupTotals(entries);

      // Add this group's totals to the grand total
      Object.keys(grandTotal).forEach(key => {
        grandTotal[key] += totals[key];
      });

      // Add this group's totals to BEST total if it's a BEST category
      if (category === 'BEST') {
        Object.keys(bestTotal).forEach(key => {
          bestTotal[key] += totals[key];
        });
      }

      // Add category title as first row (spans all columns)
      tableData.unshift([
        { content: categoryTitle, colSpan: 12, styles: { halign: 'left', fontStyle: 'bold', fillColor: [255, 255, 255] } }
      ]);

      // Add total row at the end of this group's table
      tableData.push([
        'Total :-', '',
        totals.mon_sat_am || 0,
        totals.mon_sat_noon || 0,
        totals.mon_sat_pm || 0,
        totals.sun_am || 0,
        totals.sun_noon || 0,
        totals.sun_pm || 0,
        totals.duties_driver_ms || 0,
        totals.duties_driver_sun || 0,
        totals.duties_cond_ms || 0,
        totals.duties_cond_sun || 0
      ]);

      // Determine font size based on category
      // WET_LEASE (operator-bus type) tables get larger font for better readability
      const tableFontSize = category === 'WET_LEASE' ? 12 : 8;

      // Generate table for this group (without repeating column headers)
      doc.autoTable({
        startY: startY,
        margin: { left: leftMargin, right: rightMargin },
        body: tableData,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: tableFontSize,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.1
        },
        headStyles: {
          font: 'times',
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle'
        },
        bodyStyles: {
          font: 'times',
          textColor: [0, 0, 0],
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: columnWidths[0] },
          1: { halign: 'center', cellWidth: columnWidths[1] },
          2: { halign: 'center', cellWidth: columnWidths[2] },
          3: { halign: 'center', cellWidth: columnWidths[3], fontSize: 10 }, // NOON (Mon-Sat)
          4: { halign: 'center', cellWidth: columnWidths[4] },
          5: { halign: 'center', cellWidth: columnWidths[5] },
          6: { halign: 'center', cellWidth: columnWidths[6], fontSize: 10 }, // NOON (Sunday)
          7: { halign: 'center', cellWidth: columnWidths[7] },
          8: { halign: 'center', cellWidth: columnWidths[8] },
          9: { halign: 'center', cellWidth: columnWidths[9] },
          10: { halign: 'center', cellWidth: columnWidths[10] },
          11: { halign: 'center', cellWidth: columnWidths[11] }
        },
        didParseCell: function (data) {
          // CRITICAL: Preserve the fontSize for all cells
          data.cell.styles.font = 'times';

          // Apply specific font size to NOON columns (columns 3 and 6)
          if (data.column.index === 3 || data.column.index === 6) {
            data.cell.styles.fontSize = 10;
          } else {
            data.cell.styles.fontSize = tableFontSize;
          }

          // Style category title row (first row) - white background, bold, left-aligned
          if (data.row.index === 0) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 255, 255];
            data.cell.styles.halign = 'left';
          }
          // Style total row (last row) - white background, bold
          if (data.row.index === tableData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [255, 255, 255];
          }
        }
      });

      // Update Y position for next table (add small gap between tables)
      startY = doc.lastAutoTable.finalY + 1;
    });

    // Add BEST Total row if there are any BEST category entries
    const hasBestEntries = sortedGroups.some(([, g]) => g.category === 'BEST');
    if (hasBestEntries) {
      doc.autoTable({
        startY: startY,
        margin: { left: leftMargin, right: rightMargin },
        body: [[
          'BEST Total :-', '',
          bestTotal.mon_sat_am || 0,
          bestTotal.mon_sat_noon || 0,
          bestTotal.mon_sat_pm || 0,
          bestTotal.sun_am || 0,
          bestTotal.sun_noon || 0,
          bestTotal.sun_pm || 0,
          bestTotal.duties_driver_ms || 0,
          bestTotal.duties_driver_sun || 0,
          bestTotal.duties_cond_ms || 0,
          bestTotal.duties_cond_sun || 0
        ]],
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 12,
          cellPadding: 1.5,
          fontStyle: 'bold',
          fillColor: [255, 255, 255],
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: columnWidths[0], halign: 'center' },
          1: { cellWidth: columnWidths[1], halign: 'center' },
          2: { cellWidth: columnWidths[2], halign: 'center' },
          3: { cellWidth: columnWidths[3], halign: 'center' },
          4: { cellWidth: columnWidths[4], halign: 'center' },
          5: { cellWidth: columnWidths[5], halign: 'center' },
          6: { cellWidth: columnWidths[6], halign: 'center' },
          7: { cellWidth: columnWidths[7], halign: 'center' },
          8: { cellWidth: columnWidths[8], halign: 'center' },
          9: { cellWidth: columnWidths[9], halign: 'center' },
          10: { cellWidth: columnWidths[10], halign: 'center' },
          11: { cellWidth: columnWidths[11], halign: 'center' }
        }
      });
      startY = doc.lastAutoTable.finalY + 2;
    }

    // Add Grand Total row (sum of all entries - BEST and WET_LEASE)
    doc.autoTable({
      startY: startY,
      margin: { left: leftMargin, right: rightMargin },
      body: [[
        'Grand Total', '',
        grandTotal.mon_sat_am || 0,
        grandTotal.mon_sat_noon || 0,
        grandTotal.mon_sat_pm || 0,
        grandTotal.sun_am || 0,
        grandTotal.sun_noon || 0,
        grandTotal.sun_pm || 0,
        grandTotal.duties_driver_ms || 0,
        grandTotal.duties_driver_sun || 0,
        grandTotal.duties_cond_ms || 0,
        grandTotal.duties_cond_sun || 0
      ]],
      theme: 'grid',
      styles: {
        font: 'times',
        fontSize: 14,
        cellPadding: 1.5,
        fontStyle: 'bold',
        fillColor: [255, 255, 255],
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.3
      },
      columnStyles: {
        0: { cellWidth: columnWidths[0], halign: 'center' },
        1: { cellWidth: columnWidths[1], halign: 'center' },
        2: { cellWidth: columnWidths[2], halign: 'center' },
        3: { cellWidth: columnWidths[3], halign: 'center' },
        4: { cellWidth: columnWidths[4], halign: 'center' },
        5: { cellWidth: columnWidths[5], halign: 'center' },
        6: { cellWidth: columnWidths[6], halign: 'center' },
        7: { cellWidth: columnWidths[7], halign: 'center' },
        8: { cellWidth: columnWidths[8], halign: 'center' },
        9: { cellWidth: columnWidths[9], halign: 'center' },
        10: { cellWidth: columnWidths[10], halign: 'center' },
        11: { cellWidth: columnWidths[11], halign: 'center' }
      }
    });

    // Save or preview the PDF
    if (preview) {
      // Preview mode: open PDF in new browser tab
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      // Download mode: save PDF file with formatted filename
      const cleanDepotName = reportData.depot.replace(/[^a-zA-Z0-9]/g, '-');
      const cleanDate = formattedDate.replace(/\//g, '-');
      doc.save(`Schedule-Report-${cleanDepotName}-${cleanDate}.pdf`);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Error generating PDF: ' + error.message);
    throw error;
  }
};
