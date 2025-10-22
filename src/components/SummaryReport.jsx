'use client';

import React, { useState, useEffect, useRef } from 'react';
import storageManager from '../lib/storage/storageManager';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import '../styles/summary.css';

export default function SummaryReport() {
    const [effectiveDate, setEffectiveDate] = useState('');
    const [dayType, setDayType] = useState('MON_SAT');
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const reportRef = useRef(null);

    // Set default date to today
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setEffectiveDate(today);
    }, []);

    const generateReport = async () => {
        if (!effectiveDate) {
            alert('Please select a date');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await fetchSummaryData(effectiveDate, dayType);
            setReportData(data);
        } catch (err) {
            console.error('Error generating report:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchSummaryData = async (date, type) => {
        console.log('=== FETCHING SUMMARY DATA ===');
        console.log('Date:', date);
        console.log('Type:', type);

        const client = storageManager.getClient();
        console.log('Storage Mode:', storageManager.getMode());

        // 1. Fetch all depots (sorted by display_order, then by name)
        const { data: depots, error: depotsError } = await client
            .from('depots')
            .select('*')
            .order('display_order', { ascending: true })
            .order('name', { ascending: true });

        if (depotsError) throw new Error('Error fetching depots: ' + depotsError.message);
        console.log('Depots fetched:', depots?.length);

        // 2. Fetch all operators
        const { data: operators, error: operatorsError } = await client
            .from('operators')
            .select('*');

        if (operatorsError) throw new Error('Error fetching operators: ' + operatorsError.message);
        console.log('Operators fetched:', operators?.length, operators);

        // 3. Fetch all bus types
        const { data: busTypes, error: busTypesError } = await client
            .from('bus_types')
            .select('*');

        if (busTypesError) throw new Error('Error fetching bus types: ' + busTypesError.message);
        console.log('Bus Types fetched:', busTypes?.length, busTypes);

        // 4. Fetch schedules for the selected date
        const { data: schedules, error: schedulesError } = await client
            .from('schedules')
            .select('id, depot_id, schedule_date')
            .eq('schedule_date', date);

        if (schedulesError) throw new Error('Error fetching schedules: ' + schedulesError.message);
        console.log('Schedules fetched:', schedules?.length, schedules);

        if (!schedules || schedules.length === 0) {
            throw new Error('No schedule data found for the selected date');
        }

        // 5. Fetch all schedule entries for these schedules
        const scheduleIds = schedules.map(s => s.id);
        console.log('Schedule IDs:', scheduleIds);

        const { data: entries, error: entriesError } = await client
            .from('schedule_entries')
            .select('*');

        if (entriesError) throw new Error('Error fetching schedule entries: ' + entriesError.message);
        console.log('All Entries fetched:', entries?.length);

        // Filter entries by schedule IDs
        const filteredEntries = entries.filter(e => scheduleIds.includes(e.schedule_id));
        console.log('Filtered Entries:', filteredEntries.length);
        console.log('Sample Entry:', filteredEntries[0]);

        // 6. Separate BEST and Wet Lease operators
        const bestOperator = operators.find(op => op.name === 'BEST');
        const wetLeaseOperators = operators.filter(op => op.name !== 'BEST');
        console.log('BEST Operator:', bestOperator);
        console.log('Wet Lease Operators:', wetLeaseOperators);

        // 7. Get unique bus type codes (short names like AC, NON-AC, etc.)
        const busTypeCodes = [...new Set(busTypes.map(bt => bt.short_name || bt.name.substring(0, 2).toUpperCase()))].filter(Boolean).sort();
        console.log('Bus Type Codes:', busTypeCodes);

        // 8. Aggregate data by depot and time period
        const depotData = depots.map(depot => {
            console.log(`\n=== Processing Depot: ${depot.name} ===`);
            const depotSchedule = schedules.find(s => s.depot_id === depot.id);

            if (!depotSchedule) {
                console.log(`No schedule found for depot ${depot.name}`);
                return createEmptyDepotData(depot, busTypeCodes, wetLeaseOperators);
            }

            console.log(`Schedule found for ${depot.name}:`, depotSchedule.id);
            const depotEntries = filteredEntries.filter(e => e.schedule_id === depotSchedule.id);
            console.log(`Entries for ${depot.name}:`, depotEntries.length);

            return {
                name: depot.name,
                morning: aggregateTimePeriod(depotEntries, 'morning', busTypeCodes, bestOperator, wetLeaseOperators, busTypes, type),
                noon: aggregateTimePeriod(depotEntries, 'noon', busTypeCodes, bestOperator, wetLeaseOperators, busTypes, type),
                evening: aggregateTimePeriod(depotEntries, 'evening', busTypeCodes, bestOperator, wetLeaseOperators, busTypes, type)
            };
        });

        console.log('=== DEPOT DATA COMPLETE ===');
        console.log('Depot Data:', depotData);

        // 9. Calculate grand totals
        const totals = calculateGrandTotals(depotData, busTypeCodes, wetLeaseOperators);

        return {
            effectiveDate: date,
            dayType: type,
            depots: depotData,
            totals,
            busTypeCodes,
            wetLeaseOperators: wetLeaseOperators.map(op => op.short_code || op.name.substring(0, 2).toUpperCase()),
            operatorDetails: operators
        };
    };

    const createEmptyDepotData = (depot, busTypeCodes, wetLeaseOperators) => {
        const emptyPeriod = {
            best: {},
            wetLease: {},
            total: 0
        };

        busTypeCodes.forEach(code => {
            emptyPeriod.best[code] = 0;
        });
        emptyPeriod.best.total = 0;

        wetLeaseOperators.forEach(op => {
            const code = op.short_code || op.name.substring(0, 2).toUpperCase();
            emptyPeriod.wetLease[code] = 0;
        });
        emptyPeriod.wetLease.total = 0;

        return {
            name: depot.name,
            morning: JSON.parse(JSON.stringify(emptyPeriod)),
            noon: JSON.parse(JSON.stringify(emptyPeriod)),
            evening: JSON.parse(JSON.stringify(emptyPeriod))
        };
    };

    const aggregateTimePeriod = (entries, timePeriod, busTypeCodes, bestOperator, wetLeaseOperators, busTypes, dayType) => {
        console.log('=== AGGREGATING TIME PERIOD ===');
        console.log('Time Period:', timePeriod);
        console.log('Day Type:', dayType);
        console.log('Total Entries:', entries.length);

        const result = {
            best: {},
            wetLease: {},
            total: 0
        };

        // Initialize bus type counts
        busTypeCodes.forEach(code => {
            result.best[code] = 0;
        });

        // Initialize wet lease operator counts
        wetLeaseOperators.forEach(op => {
            const code = op.short_code || op.name.substring(0, 2).toUpperCase();
            result.wetLease[code] = 0;
        });

        // Determine which column to check based on day type and time period
        let columnName;
        if (dayType === 'MON_SAT') {
            if (timePeriod === 'morning') columnName = 'mon_sat_am';
            else if (timePeriod === 'noon') columnName = 'mon_sat_noon';
            else if (timePeriod === 'evening') columnName = 'mon_sat_pm';
        } else {
            if (timePeriod === 'morning') columnName = 'sun_am';
            else if (timePeriod === 'noon') columnName = 'sun_noon';
            else if (timePeriod === 'evening') columnName = 'sun_pm';
        }

        console.log('Column to check:', columnName);

        // Count buses based on the column value
        entries.forEach(entry => {
            const busCount = entry[columnName];
            
            // Skip if value is '-' or empty or 0
            if (!busCount || busCount === '-' || busCount === '0' || busCount === 0) {
                return;
            }

            const count = parseInt(busCount, 10);
            if (isNaN(count) || count <= 0) {
                return;
            }

            const busType = busTypes.find(bt => bt.id === entry.bus_type_id);
            const busTypeCode = busType ? (busType.short_name || busType.name.substring(0, 2).toUpperCase()) : 'XX';

            console.log('Processing Entry:', {
                id: entry.id,
                operator_id: entry.operator_id,
                bus_type_id: entry.bus_type_id,
                busTypeCode: busTypeCode,
                count: count,
                columnValue: busCount
            });

            // Check if BEST (operator_id is null or matches BEST operator)
            const isBEST = entry.operator_id === null ||
                entry.operator_id === bestOperator?.id ||
                entry.operator_id === undefined;

            if (isBEST) {
                // BEST bus
                if (!result.best[busTypeCode]) {
                    result.best[busTypeCode] = 0;
                }
                result.best[busTypeCode] += count;
                console.log(`  -> BEST ${busTypeCode}: +${count} = ${result.best[busTypeCode]}`);
            } else {
                // Wet Lease bus
                const operator = wetLeaseOperators.find(op => op.id === entry.operator_id);
                if (operator) {
                    const opCode = operator.short_code || operator.name.substring(0, 2).toUpperCase();
                    if (!result.wetLease[opCode]) {
                        result.wetLease[opCode] = 0;
                    }
                    result.wetLease[opCode] += count;
                    console.log(`  -> Wet Lease ${opCode}: +${count} = ${result.wetLease[opCode]}`);
                } else {
                    console.log(`  -> Operator not found for ID: ${entry.operator_id}`);
                    // If operator not found, treat as BEST
                    if (!result.best[busTypeCode]) {
                        result.best[busTypeCode] = 0;
                    }
                    result.best[busTypeCode] += count;
                    console.log(`  -> Defaulting to BEST ${busTypeCode}: +${count} = ${result.best[busTypeCode]}`);
                }
            }
        });

        // Calculate totals
        result.best.total = Object.keys(result.best)
            .filter(k => k !== 'total')
            .reduce((sum, k) => sum + result.best[k], 0);

        result.wetLease.total = Object.keys(result.wetLease)
            .filter(k => k !== 'total')
            .reduce((sum, k) => sum + result.wetLease[k], 0);

        result.total = result.best.total + result.wetLease.total;

        console.log('Final Result:', result);
        console.log('=== END AGGREGATION ===\n');

        return result;
    };

    const calculateGrandTotals = (depotData, busTypeCodes, wetLeaseOperators) => {
        const totals = {
            morning: { best: {}, wetLease: {}, total: 0 },
            noon: { best: {}, wetLease: {}, total: 0 },
            evening: { best: {}, wetLease: {}, total: 0 }
        };

        // Initialize
        ['morning', 'noon', 'evening'].forEach(period => {
            busTypeCodes.forEach(code => {
                totals[period].best[code] = 0;
            });
            totals[period].best.total = 0;

            wetLeaseOperators.forEach(op => {
                const code = op.short_code || op.name.substring(0, 2).toUpperCase();
                totals[period].wetLease[code] = 0;
            });
            totals[period].wetLease.total = 0;
        });

        // Sum up all depots
        depotData.forEach(depot => {
            ['morning', 'noon', 'evening'].forEach(period => {
                // BEST totals
                busTypeCodes.forEach(code => {
                    totals[period].best[code] += depot[period].best[code] || 0;
                });
                totals[period].best.total += depot[period].best.total || 0;

                // Wet Lease totals
                wetLeaseOperators.forEach(op => {
                    const code = op.short_code || op.name.substring(0, 2).toUpperCase();
                    totals[period].wetLease[code] += depot[period].wetLease[code] || 0;
                });
                totals[period].wetLease.total += depot[period].wetLease.total || 0;

                totals[period].total += depot[period].total || 0;
            });
        });

        return totals;
    };

    const exportToCSV = () => {
        if (!reportData) {
            alert('Please generate a report first');
            return;
        }

        // Create CSV content
        let csv = `SUMMARY OF SERVICE ALLOCATION OF ALL DEPOTS\n`;
        csv += `W. E. F. :- ${reportData.effectiveDate}\n`;
        csv += `${reportData.dayType === 'MON_SAT' ? 'MONDAY TO SATURDAY' : 'ONLY SUNDAY'}\n\n`;

        // Headers
        csv += 'Depot,';
        ['MORNING', 'NOON', 'EVENING'].forEach(period => {
            csv += `${period} - BEST,`.repeat(reportData.busTypeCodes.length);
            csv += 'BEST TOTAL,';
            csv += `${period} - Wet Lease,`.repeat(reportData.wetLeaseOperators.length);
            csv += 'Wet Lease TOTAL,';
        });
        csv += '\n';

        // Sub-headers
        csv += ',';
        ['MORNING', 'NOON', 'EVENING'].forEach(() => {
            reportData.busTypeCodes.forEach(code => csv += `${code},`);
            csv += 'TOTAL,';
            reportData.wetLeaseOperators.forEach(code => csv += `${code},`);
            csv += 'TOTAL,';
        });
        csv += '\n';

        // Data rows
        reportData.depots.forEach(depot => {
            csv += `${depot.name},`;
            ['morning', 'noon', 'evening'].forEach(period => {
                reportData.busTypeCodes.forEach(code => {
                    csv += `${depot[period].best[code] || 0},`;
                });
                csv += `${depot[period].best.total},`;
                reportData.wetLeaseOperators.forEach(code => {
                    csv += `${depot[period].wetLease[code] || 0},`;
                });
                csv += `${depot[period].wetLease.total},`;
            });
            csv += '\n';
        });

        // Total row
        csv += 'Total :-,';
        ['morning', 'noon', 'evening'].forEach(period => {
            reportData.busTypeCodes.forEach(code => {
                csv += `${reportData.totals[period].best[code] || 0},`;
            });
            csv += `${reportData.totals[period].best.total},`;
            reportData.wetLeaseOperators.forEach(code => {
                csv += `${reportData.totals[period].wetLease[code] || 0},`;
            });
            csv += `${reportData.totals[period].wetLease.total},`;
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `summary-report-${reportData.effectiveDate}-${reportData.dayType}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportToPDF = async () => {
        if (!reportData || !reportRef.current) {
            alert('Please generate a report first');
            return;
        }

        setIsGeneratingPDF(true);

        try {
            // Get the report content element
            const reportContent = reportRef.current;

            // Temporarily adjust styles for PDF capture
            const originalOverflow = reportContent.style.overflow;
            reportContent.style.overflow = 'visible';

            // Capture the content as canvas
            const canvas = await html2canvas(reportContent, {
                scale: 2, // Higher quality
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Restore original styles
            reportContent.style.overflow = originalOverflow;

            // A4 dimensions in landscape (mm)
            const pdfWidth = 297; // A4 landscape width
            const pdfHeight = 210; // A4 landscape height

            // Calculate dimensions to fit content
            const imgWidth = pdfWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Create PDF in landscape orientation
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            // If content is taller than one page, split into multiple pages
            let heightLeft = imgHeight;
            let position = 10; // Top margin

            // Add first page
            pdf.addImage(
                canvas.toDataURL('image/png'),
                'PNG',
                10, // Left margin
                position,
                imgWidth,
                imgHeight
            );

            heightLeft -= (pdfHeight - 20); // Subtract page height minus margins

            // Add additional pages if needed
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(
                    canvas.toDataURL('image/png'),
                    'PNG',
                    10,
                    position,
                    imgWidth,
                    imgHeight
                );
                heightLeft -= (pdfHeight - 20);
            }

            // Save the PDF
            const fileName = `summary-report-${reportData.effectiveDate}-${reportData.dayType}.pdf`;
            pdf.save(fileName);

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error generating PDF: ' + error.message);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handlePrintPreview = () => {
        if (!reportData) {
            alert('Please generate a report first');
            return;
        }

        // Use browser's native print dialog
        window.print();
    };

    return (
        <div className="summary-report-container">
            {isGeneratingPDF && (
                <div className="pdf-generating-overlay">
                    <div className="pdf-generating-message">
                        <div className="pdf-spinner"></div>
                        <h3>Generating PDF...</h3>
                        <p>Please wait while we create your report</p>
                    </div>
                </div>
            )}

            <div className="summary-header">
                <h2>Summary Report</h2>
                <div className="summary-controls">
                    <div className="control-group">
                        <label>Effective Date:</label>
                        <input
                            type="date"
                            value={effectiveDate}
                            onChange={(e) => setEffectiveDate(e.target.value)}
                            className="date-input"
                        />
                    </div>

                    <div className="control-group">
                        <label>Day Type:</label>
                        <select
                            value={dayType}
                            onChange={(e) => setDayType(e.target.value)}
                            className="day-type-select"
                        >
                            <option value="MON_SAT">Monday to Saturday</option>
                            <option value="SUNDAY">Sunday Only</option>
                        </select>
                    </div>

                    <button
                        onClick={generateReport}
                        disabled={isLoading}
                        className="btn-generate"
                    >
                        {isLoading ? 'Generating...' : 'Generate Report'}
                    </button>

                    {reportData && (
                        <>
                            <button
                                onClick={exportToPDF}
                                disabled={isGeneratingPDF}
                                className="btn-export btn-pdf"
                            >
                                {isGeneratingPDF ? '⏳ Generating PDF...' : '📄 Download PDF'}
                            </button>

                            <button
                                onClick={handlePrintPreview}
                                className="btn-export btn-print"
                            >
                                🖨️ Print Preview
                            </button>

                            <button
                                onClick={exportToCSV}
                                className="btn-export btn-csv"
                            >
                                📊 Export CSV
                            </button>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="error-message">
                    <p>❌ {error}</p>
                </div>
            )}

            {reportData && (
                <div className="summary-content" ref={reportRef}>
                    <div className="report-title">
                        <h3>SUMMARY OF SERVICE ALLOCATION OF ALL DEPOTS</h3>
                        <p className="effective-date">W. E. F. :- {reportData.effectiveDate}</p>
                        <p className="day-type">
                            {reportData.dayType === 'MON_SAT' ? 'MONDAY TO SATURDAY' : 'ONLY SUNDAY'}
                        </p>
                    </div>

                    <div className="table-wrapper">
                        <table className="summary-table">
                            <thead>
                                {/* Main header row */}
                                <tr className="header-row-1">
                                    <th rowSpan="3" className="depot-header">Depot</th>
                                    {['MORNING', 'NOON', 'EVENING'].map((period, idx) => (
                                        <th
                                            key={period}
                                            colSpan={reportData.busTypeCodes.length + reportData.wetLeaseOperators.length + 2}
                                            className="period-header"
                                        >
                                            {period}
                                        </th>
                                    ))}
                                </tr>

                                {/* Sub-header row (BEST / Wet Lease) */}
                                <tr className="header-row-2">
                                    {['MORNING', 'NOON', 'EVENING'].map((period, idx) => (
                                        <React.Fragment key={`header2-${period}`}>
                                            <th
                                                colSpan={reportData.busTypeCodes.length + 1}
                                                className="best-header"
                                            >
                                                BEST
                                            </th>
                                            <th
                                                colSpan={reportData.wetLeaseOperators.length + 1}
                                                className="wetlease-header"
                                            >
                                                Wet Lease
                                            </th>
                                        </React.Fragment>
                                    ))}
                                </tr>

                                {/* Bus type / Operator row */}
                                <tr className="header-row-3">
                                    {['MORNING', 'NOON', 'EVENING'].map((period, idx) => (
                                        <React.Fragment key={`header3-${period}`}>
                                            {/* BEST bus types */}
                                            {reportData.busTypeCodes.map(code => (
                                                <th key={`${period}-best-${code}`} className="bustype-header">
                                                    {code}
                                                </th>
                                            ))}
                                            <th key={`${period}-best-total`} className="total-header">TOTAL</th>

                                            {/* Wet Lease operators */}
                                            {reportData.wetLeaseOperators.map(code => (
                                                <th key={`${period}-wl-${code}`} className="operator-header">
                                                    {code}
                                                </th>
                                            ))}
                                            <th key={`${period}-wl-total`} className="total-header">TOTAL</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {reportData.depots.map((depot, idx) => (
                                    <tr key={depot.name} className="data-row">
                                        <td className="depot-cell">{depot.name}</td>

                                        {/* Morning data */}
                                        {reportData.busTypeCodes.map(code => (
                                            <td key={`${depot.name}-morning-best-${code}`} className="data-cell">
                                                {depot.morning.best[code] || 0}
                                            </td>
                                        ))}
                                        <td className="total-cell">{depot.morning.best.total}</td>
                                        {reportData.wetLeaseOperators.map(code => (
                                            <td key={`${depot.name}-morning-wl-${code}`} className="data-cell">
                                                {depot.morning.wetLease[code] || 0}
                                            </td>
                                        ))}
                                        <td className="total-cell">{depot.morning.wetLease.total}</td>

                                        {/* Noon data */}
                                        {reportData.busTypeCodes.map(code => (
                                            <td key={`${depot.name}-noon-best-${code}`} className="data-cell">
                                                {depot.noon.best[code] || 0}
                                            </td>
                                        ))}
                                        <td className="total-cell">{depot.noon.best.total}</td>
                                        {reportData.wetLeaseOperators.map(code => (
                                            <td key={`${depot.name}-noon-wl-${code}`} className="data-cell">
                                                {depot.noon.wetLease[code] || 0}
                                            </td>
                                        ))}
                                        <td className="total-cell">{depot.noon.wetLease.total}</td>

                                        {/* Evening data */}
                                        {reportData.busTypeCodes.map(code => (
                                            <td key={`${depot.name}-evening-best-${code}`} className="data-cell">
                                                {depot.evening.best[code] || 0}
                                            </td>
                                        ))}
                                        <td className="total-cell">{depot.evening.best.total}</td>
                                        {reportData.wetLeaseOperators.map(code => (
                                            <td key={`${depot.name}-evening-wl-${code}`} className="data-cell">
                                                {depot.evening.wetLease[code] || 0}
                                            </td>
                                        ))}
                                        <td className="total-cell">{depot.evening.wetLease.total}</td>
                                    </tr>
                                ))}

                                {/* Grand Total Row */}
                                <tr className="total-row">
                                    <td className="depot-cell">Total :-</td>

                                    {/* Morning totals */}
                                    {reportData.busTypeCodes.map(code => (
                                        <td key={`total-morning-best-${code}`} className="grand-total-cell">
                                            {reportData.totals.morning.best[code] || 0}
                                        </td>
                                    ))}
                                    <td className="grand-total-cell">{reportData.totals.morning.best.total}</td>
                                    {reportData.wetLeaseOperators.map(code => (
                                        <td key={`total-morning-wl-${code}`} className="grand-total-cell">
                                            {reportData.totals.morning.wetLease[code] || 0}
                                        </td>
                                    ))}
                                    <td className="grand-total-cell">{reportData.totals.morning.wetLease.total}</td>

                                    {/* Noon totals */}
                                    {reportData.busTypeCodes.map(code => (
                                        <td key={`total-noon-best-${code}`} className="grand-total-cell">
                                            {reportData.totals.noon.best[code] || 0}
                                        </td>
                                    ))}
                                    <td className="grand-total-cell">{reportData.totals.noon.best.total}</td>
                                    {reportData.wetLeaseOperators.map(code => (
                                        <td key={`total-noon-wl-${code}`} className="grand-total-cell">
                                            {reportData.totals.noon.wetLease[code] || 0}
                                        </td>
                                    ))}
                                    <td className="grand-total-cell">{reportData.totals.noon.wetLease.total}</td>

                                    {/* Evening totals */}
                                    {reportData.busTypeCodes.map(code => (
                                        <td key={`total-evening-best-${code}`} className="grand-total-cell">
                                            {reportData.totals.evening.best[code] || 0}
                                        </td>
                                    ))}
                                    <td className="grand-total-cell">{reportData.totals.evening.best.total}</td>
                                    {reportData.wetLeaseOperators.map(code => (
                                        <td key={`total-evening-wl-${code}`} className="grand-total-cell">
                                            {reportData.totals.evening.wetLease[code] || 0}
                                        </td>
                                    ))}
                                    <td className="grand-total-cell">{reportData.totals.evening.wetLease.total}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="report-footer">
                        <p className="note">
                            <strong>*Note:-</strong> Wet Lease Buses - All operators except BEST
                        </p>
                        {reportData.operatorDetails && (
                            <div className="operator-details">
                                {reportData.operatorDetails
                                    .filter(op => op.name !== 'BEST')
                                    .map(op => (
                                        <span key={op.id} className="operator-detail">
                                            {op.short_code || op.name.substring(0, 2).toUpperCase()} - {op.name}
                                        </span>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
