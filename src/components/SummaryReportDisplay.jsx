'use client';

import React from 'react';
import { formatRemarkForDisplay } from '../lib/summaryRemarkHelper';

export default function SummaryReportDisplay({ reportData, remarkText, reportRef }) {
    if (!reportData) return null;

    return (
        <div className="summary-content" ref={reportRef}>
            <div className="report-title">
                <h3>SUMMARY OF SERVICE ALLOCATION OF ALL DEPOTS</h3>
                <p className="combined-date-type">
                    {reportData.dayType === 'MON_SAT' ? 'MONDAY TO SATURDAY' : 'ONLY SUNDAY'}  W. E. F.:- {reportData.effectiveDate}
                </p>
            </div>

            <div className="table-wrapper">
                <table className="summary-table">
                    <thead>
                        <tr className="header-row-1">
                            <th rowSpan="3" className="depot-header">Depot</th>
                            <th
                                colSpan={reportData.bestBusTypes.length + reportData.wetLeaseOperators.length + 1}
                                className="period-header"
                            >
                                FLEET CATEGORY
                            </th>
                            {['MORNING', 'NOON', 'EVENING'].map((period) => (
                                <th
                                    key={period}
                                    colSpan={reportData.bestBusTypes.length + reportData.wetLeaseOperators.length + 1}
                                    className="period-header"
                                >
                                    {period}
                                </th>
                            ))}
                        </tr>

                        <tr className="header-row-2">
                            <th
                                colSpan={reportData.bestBusTypes.length + 1}
                                className="best-header"
                            >
                                BEST
                            </th>
                            <th
                                colSpan={reportData.wetLeaseOperators.length}
                                className="wetlease-header"
                            >
                                Wet Lease
                            </th>

                            {['MORNING', 'NOON', 'EVENING'].map((period) => (
                                <React.Fragment key={`header2-${period}`}>
                                    <th
                                        colSpan={reportData.bestBusTypes.length}
                                        className="best-header"
                                    >
                                        BEST
                                    </th>
                                    <th
                                        colSpan={reportData.wetLeaseOperators.length}
                                        className="wetlease-header"
                                    >
                                        Wet Lease
                                    </th>
                                    <th
                                        rowSpan="2"
                                        className="grand-total-header"
                                    >
                                        <div className="grand-total-text">
                                            <div className="gr-text">GR</div>
                                            <div className="tot-text">TOT</div>
                                        </div>
                                    </th>
                                </React.Fragment>
                            ))}
                        </tr>

                        <tr className="header-row-3">
                            {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                <th key={`fleet-best-${bt.code}`} className="bustype-header">
                                    {bt.code}
                                </th>
                            ))}
                            <th key="fleet-best-total" className="total-header">TOT</th>
                            {reportData.wetLeaseOperators.map(code => (
                                <th key={`fleet-wl-${code}`} className="operator-header">
                                    {code}
                                </th>
                            ))}

                            {['MORNING', 'NOON', 'EVENING'].map((period) => (
                                <React.Fragment key={`header3-${period}`}>
                                    {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                        <th key={`${period}-best-${bt.code}`} className="bustype-header">
                                            {bt.code}
                                        </th>
                                    ))}
                                    {reportData.wetLeaseOperators.map(code => (
                                        <th key={`${period}-wl-${code}`} className="operator-header">
                                            {code}
                                        </th>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {reportData.depots.map((depot) => (
                            <tr key={depot.name} className="data-row">
                                <td className="depot-cell">{depot.name}</td>

                                {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                    <td key={`${depot.name}-fleet-best-${bt.code}`} className="data-cell">
                                        {depot.fleetCategory.best[bt.code] || ''}
                                    </td>
                                ))}
                                <td className="total-cell">{depot.fleetCategory.best.total || ''}</td>
                                {reportData.wetLeaseOperators.map(code => (
                                    <td key={`${depot.name}-fleet-wl-${code}`} className="data-cell">
                                        {depot.fleetCategory.wetLease[code] || ''}
                                    </td>
                                ))}

                                {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                    <td key={`${depot.name}-morning-best-${bt.code}`} className="data-cell">
                                        {depot.morning.best[bt.code] || ''}
                                    </td>
                                ))}
                                {reportData.wetLeaseOperators.map(code => (
                                    <td key={`${depot.name}-morning-wl-${code}`} className="data-cell">
                                        {depot.morning.wetLease[code] || ''}
                                    </td>
                                ))}
                                <td className="grand-total-cell">{(depot.morning.best.total + depot.morning.wetLease.total) || ''}</td>

                                {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                    <td key={`${depot.name}-noon-best-${bt.code}`} className="data-cell">
                                        {depot.noon.best[bt.code] || ''}
                                    </td>
                                ))}
                                {reportData.wetLeaseOperators.map(code => (
                                    <td key={`${depot.name}-noon-wl-${code}`} className="data-cell">
                                        {depot.noon.wetLease[code] || ''}
                                    </td>
                                ))}
                                <td className="grand-total-cell">{(depot.noon.best.total + depot.noon.wetLease.total) || ''}</td>

                                {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                    <td key={`${depot.name}-evening-best-${bt.code}`} className="data-cell">
                                        {depot.evening.best[bt.code] || ''}
                                    </td>
                                ))}
                                {reportData.wetLeaseOperators.map(code => (
                                    <td key={`${depot.name}-evening-wl-${code}`} className="data-cell">
                                        {depot.evening.wetLease[code] || ''}
                                    </td>
                                ))}
                                <td className="grand-total-cell">{(depot.evening.best.total + depot.evening.wetLease.total) || ''}</td>
                            </tr>
                        ))}

                        <tr className="total-row">
                            <td className="depot-cell">Total :-</td>

                            {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                <td key={`total-fleet-best-${bt.code}`} className="grand-total-cell">
                                    {reportData.totals.fleetCategory.best[bt.code] || ''}
                                </td>
                            ))}
                            <td className="grand-total-cell">{reportData.totals.fleetCategory.best.total || ''}</td>
                            {reportData.wetLeaseOperators.map(code => (
                                <td key={`total-fleet-wl-${code}`} className="grand-total-cell">
                                    {reportData.totals.fleetCategory.wetLease[code] || ''}
                                </td>
                            ))}

                            {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                <td key={`total-morning-best-${bt.code}`} className="grand-total-cell">
                                    {reportData.totals.morning.best[bt.code] || ''}
                                </td>
                            ))}
                            {reportData.wetLeaseOperators.map(code => (
                                <td key={`total-morning-wl-${code}`} className="grand-total-cell">
                                    {reportData.totals.morning.wetLease[code] || ''}
                                </td>
                            ))}
                            <td className="grand-total-cell">{(reportData.totals.morning.best.total + reportData.totals.morning.wetLease.total) || ''}</td>

                            {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                <td key={`total-noon-best-${bt.code}`} className="grand-total-cell">
                                    {reportData.totals.noon.best[bt.code] || ''}
                                </td>
                            ))}
                            {reportData.wetLeaseOperators.map(code => (
                                <td key={`total-noon-wl-${code}`} className="grand-total-cell">
                                    {reportData.totals.noon.wetLease[code] || ''}
                                </td>
                            ))}
                            <td className="grand-total-cell">{(reportData.totals.noon.best.total + reportData.totals.noon.wetLease.total) || ''}</td>

                            {reportData.bestBusTypes && reportData.bestBusTypes.map(bt => (
                                <td key={`total-evening-best-${bt.code}`} className="grand-total-cell">
                                    {reportData.totals.evening.best[bt.code] || ''}
                                </td>
                            ))}
                            {reportData.wetLeaseOperators.map(code => (
                                <td key={`total-evening-wl-${code}`} className="grand-total-cell">
                                    {reportData.totals.evening.wetLease[code] || ''}
                                </td>
                            ))}
                            <td className="grand-total-cell">{(reportData.totals.evening.best.total + reportData.totals.evening.wetLease.total) || ''}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="report-note-section">
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

            <div className="summary-bottom-container">
                <div className="summary-tables-section">
                    <div className="summary-table-box">
                        <h4 className="summary-table-title">Total Fleet</h4>
                        <table className="summary-totals-table">
                            <tbody>
                                <tr>
                                    <td className="summary-label">BEST</td>
                                    <td className="summary-label">W.L.</td>
                                    <td className="summary-label">TOTAL</td>
                                </tr>
                                <tr>
                                    <td className="summary-value">{reportData.totals.fleetCategory.best.total}</td>
                                    <td className="summary-value">{reportData.totals.fleetCategory.wetLease.total}</td>
                                    <td className="summary-value">{reportData.totals.fleetCategory.best.total + reportData.totals.fleetCategory.wetLease.total}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="summary-table-box">
                        <h4 className="summary-table-title">Total T/out (AM)</h4>
                        <table className="summary-totals-table">
                            <tbody>
                                <tr>
                                    <td className="summary-label">BEST</td>
                                    <td className="summary-label">W.L.</td>
                                    <td className="summary-label">TOTAL</td>
                                </tr>
                                <tr>
                                    <td className="summary-value">{reportData.totals.morning.best.total}</td>
                                    <td className="summary-value">{reportData.totals.morning.wetLease.total}</td>
                                    <td className="summary-value">{reportData.totals.morning.best.total + reportData.totals.morning.wetLease.total}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {reportData.dayType === 'SUNDAY' && (
                        <div className="summary-table-box">
                            <h4 className="summary-table-title">Total T/out (PM)</h4>
                            <table className="summary-totals-table">
                                <tbody>
                                    <tr>
                                        <td className="summary-label">BEST</td>
                                        <td className="summary-label">W.L.</td>
                                        <td className="summary-label">TOTAL</td>
                                    </tr>
                                    <tr>
                                        <td className="summary-value">{reportData.totals.evening.best.total}</td>
                                        <td className="summary-value">{reportData.totals.evening.wetLease.total}</td>
                                        <td className="summary-value">{reportData.totals.evening.best.total + reportData.totals.evening.wetLease.total}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {remarkText && (
                    <div className="summary-remark-box">
                        <p className="summary-remark-text">{formatRemarkForDisplay(remarkText)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
