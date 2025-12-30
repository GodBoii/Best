/**
 * Operator Report Generator - Excel-style XLSX report
 * Generates an Excel file matching the Book1.xlsx structure
 * Routes are ordered by route code (ascending), with serial numbers calculated
 * Includes Operator column after Depot
 * Formatting: Bold headers, Red title, Borders
 */

import * as XLSX from 'xlsx-js-style';

/**
 * Generates an Excel report for operators
 * @param {Object} reportData - Contains title, date, and entries
 * @param {boolean} preview - If true, opens in new tab (not applicable for Excel, will download)
 */
export const generateOperatorReportExcel = async (reportData, preview = false) => {
  try {
    if (!reportData || !reportData.entries || reportData.entries.length === 0) {
      throw new Error('No entries to generate report');
    }

    /**
     * Format value for display
     */
    const formatValue = (val) => {
      if (val === null || val === undefined || val === '' || val === '-') return '-';
      return val.toString();
    };

    /**
     * Sort entries by route code (ascending numeric order)
     */
    const sortedEntries = [...reportData.entries].sort((a, b) => {
      const codeA = a.routes?.code || a.code || '';
      const codeB = b.routes?.code || b.code || '';

      if (!codeA && !codeB) return 0;
      if (!codeA) return 1;
      if (!codeB) return -1;

      const numA = parseInt(codeA, 10);
      const numB = parseInt(codeB, 10);

      if (isNaN(numA) && isNaN(numB)) return codeA.localeCompare(codeB);
      if (isNaN(numA)) return 1;
      if (isNaN(numB)) return -1;

      return numA - numB;
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();

    // --- STYLES ---
    const borderStyle = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    };

    const titleStyle = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "FF0000" } },
      alignment: { horizontal: "left", vertical: "center" }
    };

    const headerStyle = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: borderStyle
    };

    // Specifically for "Destination" header which spans columns
    const headerLeftStyle = {
      font: { name: "Calibri", sz: 11, bold: true, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" }, // Changed to center as per image
      border: borderStyle
    };

    const dataCenterStyle = {
      font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: borderStyle
    };

    const dataLeftStyle = {
      font: { name: "Calibri", sz: 11, color: { rgb: "000000" } },
      alignment: { horizontal: "left", vertical: "center" },
      border: borderStyle
    };

    // --- DATA PREPARATION ---
    const wsData = [];

    // Row 1: Title
    const titleText = `BEST Updated on  ${reportData.updateDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}`;
    wsData.push([titleText]);

    // Row 2: Header Row 1
    wsData.push([
      'Sr.', 'Route', 'Code', 'Depot', 'Operator', 'Destination', '', 'Route', 'Mon To Sat', '', '', 'Sunday', '', '', 'Line', 'Date', 'Remark'
    ]);

    // Row 3: Header Row 2
    wsData.push([
      'No.', '', '', '', '', 'From', 'To', 'Span', 'AM', 'NOON', 'PM', 'AM', 'NOON', 'PM', 'Notice', '', ''
    ]);

    // Data rows
    sortedEntries.forEach((entry, index) => {
      const routeName = entry.routes?.name || entry.routeName || '-';
      const routeCode = entry.routes?.code || entry.code || '-';
      const depotShort = entry.depots?.short_code || entry.depot || '-';
      const operatorName = entry.operatorName || entry.operators?.name || 'BEST';

      wsData.push([
        index + 1,                          // Sr. No.
        routeName,                          // Route
        routeCode,                          // Code
        depotShort,                         // Depot
        operatorName,                       // Operator
        '',                                 // Destination From (empty)
        '',                                 // Destination To (empty)
        '',                                 // Route Span (empty)
        formatValue(entry.mon_sat_am),      // Mon-Sat AM
        formatValue(entry.mon_sat_noon),    // Mon-Sat NOON
        formatValue(entry.mon_sat_pm),      // Mon-Sat PM
        formatValue(entry.sun_am),          // Sunday AM
        formatValue(entry.sun_noon),        // Sunday NOON
        formatValue(entry.sun_pm),          // Sunday PM
        '',                                 // Line Notice (empty)
        '',                                 // Date (empty)
        ''                                  // Remark (empty)
      ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // --- APPLY MERGES ---
    ws['!merges'] = [
      // Row 1: Title spans all columns (A1:Q1)
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },

      // Header Merges
      { s: { r: 1, c: 0 }, e: { r: 2, c: 0 } },   // Sr. No. (A2:A3)
      { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },   // Route (B2:B3)
      { s: { r: 1, c: 2 }, e: { r: 2, c: 2 } },   // Code (C2:C3)
      { s: { r: 1, c: 3 }, e: { r: 2, c: 3 } },   // Depot (D2:D3)
      { s: { r: 1, c: 4 }, e: { r: 2, c: 4 } },   // Operator (E2:E3)
      { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } },   // Destination (F2:G2)
      { s: { r: 1, c: 7 }, e: { r: 2, c: 7 } },   // Route Span (H2:H3)
      { s: { r: 1, c: 8 }, e: { r: 1, c: 10 } },  // Mon To Sat (I2:K2)
      { s: { r: 1, c: 11 }, e: { r: 1, c: 13 } }, // Sunday (L2:N2)
      { s: { r: 1, c: 14 }, e: { r: 2, c: 14 } }, // Line Notice (O2:O3)
      { s: { r: 1, c: 15 }, e: { r: 2, c: 15 } }, // Date (P2:P3)
      { s: { r: 1, c: 16 }, e: { r: 2, c: 16 } }  // Remark (Q2:Q3)
    ];

    // --- APPLY COLUMN WIDTHS ---
    ws['!cols'] = [
      { wch: 5 },   // Sr. No.
      { wch: 18 },  // Route
      { wch: 8 },   // Code
      { wch: 8 },   // Depot
      { wch: 12 },  // Operator
      { wch: 25 },  // Destination From
      { wch: 25 },  // Destination To
      { wch: 10 },  // Route Span
      { wch: 5 },   // Mon-Sat AM
      { wch: 5 },   // Mon-Sat NOON
      { wch: 5 },   // Mon-Sat PM
      { wch: 5 },   // Sunday AM
      { wch: 5 },   // Sunday NOON
      { wch: 5 },   // Sunday PM
      { wch: 12 },  // Line Notice
      { wch: 12 },  // Date
      { wch: 30 }   // Remark
    ];

    // --- APPLY STYLES TO CELLS ---
    const range = XLSX.utils.decode_range(ws['!ref']);

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' }; // Ensure empty cells exist for styling

        const cell = ws[cellRef];

        // 1. Title Row (Row 0)
        if (R === 0) {
          cell.s = titleStyle;
        }
        // 2. Header Rows (Rows 1 & 2)
        else if (R === 1 || R === 2) {
          cell.s = headerStyle;
        }
        // 3. Data Rows
        else {
          // Route Name (Column 1) left aligned
          if (C === 1) {
            cell.s = dataLeftStyle;
          }
          // Other columns center aligned
          else {
            cell.s = dataCenterStyle;
          }
        }
      }
    }

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Operator Report');

    // Generate filename
    const formattedDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');
    const operatorName = (reportData.operator || 'All').replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `BEST-Operator-Report-${operatorName}-${formattedDate}.xlsx`;

    // Write and download
    XLSX.writeFile(wb, filename);

    return { success: true };
  } catch (error) {
    console.error('Error generating operator report Excel:', error);
    throw error;
  }
};

export default generateOperatorReportExcel;
