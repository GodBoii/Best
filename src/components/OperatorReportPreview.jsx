'use client';

import React, { useState } from 'react';
import { generateOperatorReportExcel } from '../services/operatorReportGenerator';

/**
 * OperatorReportPreview Component
 * Displays a preview of the Excel-style operator report
 * Routes are sorted by code (ascending) with calculated serial numbers
 * Includes Operator column after Depot
 */
export default function OperatorReportPreview({ reportData }) {
    const [generating, setGenerating] = useState(false);

    /**
     * Handle Excel download
     */
    const handleDownloadExcel = async () => {
        setGenerating(true);
        try {
            await generateOperatorReportExcel(reportData);
        } catch (error) {
            console.error('Error downloading Excel:', error);
            alert('Error downloading Excel file. Check console for details.');
        } finally {
            setGenerating(false);
        }
    };

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
    const sortedEntries = [...(reportData.entries || [])].sort((a, b) => {
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

    return (
        <div className="format-report-preview-container">
            <div className="report-preview-header">
                <h2>Operator Report Preview</h2>
                <div className="report-actions">
                    <button
                        onClick={handleDownloadExcel}
                        className="btn-download"
                        disabled={generating}
                    >
                        {generating ? 'Generating...' : '📊 Download Excel (.xlsx)'}
                    </button>
                </div>
            </div>

            <div className="format-report-preview-content">
                <div className="report-header-info">
                    <h3>BEST Updated on {reportData.updateDate || new Date().toLocaleDateString('en-GB').replace(/\//g, '.')}</h3>
                    <p className="report-info">Operator: {reportData.operator} | Total Routes: {sortedEntries.length}</p>
                </div>

                <div className="format-report-table-wrapper">
                    <table className="format-report-table">
                        <thead>
                            <tr>
                                <th rowSpan="2">Sr.<br />No.</th>
                                <th rowSpan="2">Route</th>
                                <th rowSpan="2">Code</th>
                                <th rowSpan="2">Depot</th>
                                <th rowSpan="2">Operator</th>
                                <th colSpan="2">Destination</th>
                                <th rowSpan="2">Route<br />Span</th>
                                <th colSpan="3">Mon To Sat</th>
                                <th colSpan="3">Sunday</th>
                                <th rowSpan="2">Line<br />Notice</th>
                                <th rowSpan="2">Date</th>
                                <th rowSpan="2">Remark</th>
                            </tr>
                            <tr>
                                <th>From</th>
                                <th>To</th>
                                <th>AM</th>
                                <th>NOON</th>
                                <th>PM</th>
                                <th>AM</th>
                                <th>NOON</th>
                                <th>PM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedEntries.map((entry, index) => {
                                const routeName = entry.routes?.name || entry.routeName || '-';
                                const routeCode = entry.routes?.code || entry.code || '-';
                                const depotShort = entry.depots?.short_code || entry.depot || '-';
                                const operatorName = entry.operatorName || entry.operators?.name || 'BEST';

                                return (
                                    <tr key={entry.id || index}>
                                        <td className="center">{index + 1}</td>
                                        <td>{routeName}</td>
                                        <td className="center">{routeCode}</td>
                                        <td className="center">{depotShort}</td>
                                        <td className="center">{operatorName}</td>
                                        <td className="empty-cell"></td>
                                        <td className="empty-cell"></td>
                                        <td className="empty-cell"></td>
                                        <td className="center">{formatValue(entry.mon_sat_am)}</td>
                                        <td className="center">{formatValue(entry.mon_sat_noon)}</td>
                                        <td className="center">{formatValue(entry.mon_sat_pm)}</td>
                                        <td className="center">{formatValue(entry.sun_am)}</td>
                                        <td className="center">{formatValue(entry.sun_noon)}</td>
                                        <td className="center">{formatValue(entry.sun_pm)}</td>
                                        <td className="empty-cell"></td>
                                        <td className="empty-cell"></td>
                                        <td className="empty-cell"></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
