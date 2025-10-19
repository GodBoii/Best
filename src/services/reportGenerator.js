export const generateReportPDF = async (reportData, preview = false) => {
  try {
    // Validate reportData
    if (!reportData || !reportData.depot || !reportData.date || !reportData.entries) {
      throw new Error('Invalid report data');
    }

    if (reportData.entries.length === 0) {
      throw new Error('No entries to generate report');
    }

    // Dynamic import for client-side only
    const { default: jsPDF } = await import('jspdf');
    
    // Import autoTable plugin - this extends jsPDF prototype
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

  // Set font
  doc.setFont('helvetica');
  
  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const formattedDate = new Date(reportData.date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  doc.text(`${reportData.depot} Depot  w.e.f.:- ${formattedDate}`, 14, 15);

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
        operator: entry.operators, // This should be the joined operator data
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

  // Sort groups: BEST categories first, then WET_LEASE
  const sortedGroups = Object.entries(groupedEntries).sort((a, b) => {
    return a[1].sortOrder - b[1].sortOrder;
  });

  console.log('\n=== SORTED GROUPS ===');
  sortedGroups.forEach(([key, group]) => {
    console.log(`${key}: ${group.category} - ${group.operator?.name || 'NO OPERATOR'} - ${group.busType?.name}`);
  });

  // Helper function to parse values
  const parseValue = (val) => {
    if (val === '-' || val === null || val === undefined || val === '') return 0;
    return parseInt(val) || 0;
  };

  const formatValue = (val) => {
    if (val === '-' || val === null || val === undefined || val === '') return '-';
    return val.toString();
  };

  // Calculate totals for a group
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

  let startY = 25;
  let bestTotal = {
    mon_sat_am: 0, mon_sat_noon: 0, mon_sat_pm: 0,
    sun_am: 0, sun_noon: 0, sun_pm: 0,
    duties_driver_ms: 0, duties_cond_ms: 0,
    duties_driver_sun: 0, duties_cond_sun: 0
  };
  let grandTotal = {
    mon_sat_am: 0, mon_sat_noon: 0, mon_sat_pm: 0,
    sun_am: 0, sun_noon: 0, sun_pm: 0,
    duties_driver_ms: 0, duties_cond_ms: 0,
    duties_driver_sun: 0, duties_cond_sun: 0
  };

  // Process each group
  sortedGroups.forEach(([, group]) => {
    const { category, operator, busType, entries } = group;
    
    // Category header
    let categoryTitle = '';
    if (category === 'BEST') {
      categoryTitle = busType?.name || 'Unknown Bus Type';
    } else if (category === 'WET_LEASE') {
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
      categoryTitle = `${operatorName} - ${busTypeNames || 'Unknown Bus Type'}`;
    }

    // Prepare table data
    const tableData = entries.map(entry => [
      entry.routes?.name || '-',
      entry.bus_types?.short_name || '',
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

    // Calculate group totals
    const totals = calculateGroupTotals(entries);

    // Add to grand total
    Object.keys(grandTotal).forEach(key => {
      grandTotal[key] += totals[key];
    });

    // Add to BEST total if applicable
    if (category === 'BEST') {
      Object.keys(bestTotal).forEach(key => {
        bestTotal[key] += totals[key];
      });
    }

    // Add total row
    tableData.push([
      'Total :-', '', '',
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

    // Generate table
    doc.autoTable({
      startY: startY,
      head: [
        [
          { content: categoryTitle, colSpan: 13, styles: { halign: 'left', fontStyle: 'bold', fillColor: [240, 240, 240] } }
        ],
        [
          { content: 'Route', rowSpan: 2 },
          { content: 'Bus Type', rowSpan: 2 },
          { content: 'Code No.', rowSpan: 2 },
          { content: 'Schedule Turnout Position', colSpan: 6 },
          { content: 'Allocation of Duties', colSpan: 4 }
        ],
        [
          { content: 'Mon To Sat', colSpan: 3 },
          { content: 'Sunday', colSpan: 3 },
          { content: 'DRIVERS', colSpan: 2 },
          { content: 'CONDUCTORS', colSpan: 2 }
        ],
        ['', '', '', 'AM', 'NOON', 'PM', 'AM', 'NOON', 'PM', 'Mon To Sat', 'Sunday', 'Mon To Sat', 'Sunday']
      ],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle'
      },
      bodyStyles: {
        textColor: [0, 0, 0],
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 15 },
        3: { halign: 'center', cellWidth: 12 },
        4: { halign: 'center', cellWidth: 12 },
        5: { halign: 'center', cellWidth: 12 },
        6: { halign: 'center', cellWidth: 12 },
        7: { halign: 'center', cellWidth: 12 },
        8: { halign: 'center', cellWidth: 12 },
        9: { halign: 'center', cellWidth: 18 },
        10: { halign: 'center', cellWidth: 18 },
        11: { halign: 'center', cellWidth: 18 },
        12: { halign: 'center', cellWidth: 18 }
      },
      didParseCell: function(data) {
        // Style total row
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    startY = doc.lastAutoTable.finalY + 5;
  });

  // Add BEST Total if there are BEST entries
  const hasBestEntries = sortedGroups.some(([, g]) => g.category === 'BEST');
  if (hasBestEntries) {
    doc.autoTable({
      startY: startY,
      body: [[
        'BEST Total :-', '', '',
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
        fontSize: 8,
        cellPadding: 1,
        fontStyle: 'bold',
        fillColor: [220, 220, 220]
      },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 15 },
        2: { cellWidth: 15 },
        3: { cellWidth: 12 },
        4: { cellWidth: 12 },
        5: { cellWidth: 12 },
        6: { cellWidth: 12 },
        7: { cellWidth: 12 },
        8: { cellWidth: 12 },
        9: { cellWidth: 18 },
        10: { cellWidth: 18 },
        11: { cellWidth: 18 },
        12: { cellWidth: 18 }
      }
    });
    startY = doc.lastAutoTable.finalY + 5;
  }

  // Add Grand Total
  doc.autoTable({
    startY: startY,
    body: [[
      'Grand Total :-', '', '',
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
      fontSize: 9,
      cellPadding: 1.5,
      fontStyle: 'bold',
      fillColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 15 },
      2: { cellWidth: 15 },
      3: { cellWidth: 12 },
      4: { cellWidth: 12 },
      5: { cellWidth: 12 },
      6: { cellWidth: 12 },
      7: { cellWidth: 12 },
      8: { cellWidth: 12 },
      9: { cellWidth: 18 },
      10: { cellWidth: 18 },
      11: { cellWidth: 18 },
      12: { cellWidth: 18 }
    }
  });

    // Save or preview
    if (preview) {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      // Clean filename - remove special characters
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
