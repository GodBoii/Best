'use client';

import React, { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import OperatorReportPreview from './OperatorReportPreview';

/**
 * OperatorReportSection Component
 * Generates an Excel-style operator report (matching Book1.xlsx structure)
 * Lists all routes sorted by route code (ascending) with serial numbers
 * Report is generated based on operator selection
 */
export default function OperatorReportSection() {
    const getCurrentDate = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [operators, setOperators] = useState([]);
    const [selectedOperator, setSelectedOperator] = useState('');
    const [reportDate, setReportDate] = useState(getCurrentDate());
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [reportType, setReportType] = useState('single');

    useEffect(() => {
        fetchOperators();
    }, []);

    const fetchOperators = async () => {
        const { data, error } = await storageManager
            .from('operators')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching operators:', error);
        } else {
            // Add "BEST" as the first option (for BEST-owned routes with no operator)
            const operatorsWithBest = [
                { id: 'BEST', name: 'BEST', short_code: 'BEST' },
                ...(data || [])
            ];
            setOperators(operatorsWithBest);
        }
    };

    /**
     * Generate report data for a single operator
     */
    const generateSingleOperatorReport = async (operatorId, date) => {
        console.log('🔍 Generating operator report for:', { operator: operatorId, date: date });

        // Fetch all schedules up to the selected date
        const { data: schedules, error: scheduleError } = await storageManager
            .from('schedules')
            .select('id, schedule_date, depot_id')
            .lte('schedule_date', date);

        if (scheduleError) throw scheduleError;

        if (!schedules || schedules.length === 0) {
            console.log('⚠️ No schedule data found');
            return null;
        }

        const scheduleIds = schedules.map(s => s.id);

        // Fetch all schedule entries with related data
        const { data: allEntries, error: entriesError } = await storageManager
            .from('schedule_entries')
            .select(`
        *,
        routes (id, name, code),
        bus_types (id, name, short_name, category, display_order),
        operators (id, name, short_code),
        depots (id, name, short_code)
      `)
            .in('schedule_id', scheduleIds);

        if (entriesError) throw entriesError;

        console.log(`📋 Found ${allEntries?.length || 0} total entries`);

        // Build temporal map - keep only the latest version of each route
        const routeMap = new Map();

        for (const entry of (allEntries || [])) {
            // Filter by operator
            const entryOperatorId = entry.operator_id || 'BEST';

            // Skip if not matching the selected operator
            if (operatorId !== 'all' && entryOperatorId !== operatorId) {
                continue;
            }

            const key = `${entry.route_id}_${entry.operator_id || 'null'}_${entry.bus_type_id}`;

            // Handle deleted entries
            if (entry.is_deleted && entry.deleted_at) {
                const deletedDate = new Date(entry.deleted_at);
                const selectedDate = new Date(date);

                if (deletedDate <= selectedDate) {
                    routeMap.set(key, { deleted: true });
                    continue;
                }
            }

            const existing = routeMap.get(key);

            if (existing?.deleted) {
                continue;
            }

            const entryTimestamp = entry.modified_at || entry.created_at;
            const existingTimestamp = existing ? (existing.modified_at || existing.created_at) : null;

            if (!existing || (entryTimestamp && existingTimestamp && new Date(entryTimestamp) > new Date(existingTimestamp))) {
                // Get depot info from schedules
                const schedule = schedules.find(s => s.id === entry.schedule_id);
                routeMap.set(key, {
                    ...entry,
                    schedule_depot_id: schedule?.depot_id
                });
            }
        }

        // Filter out deleted entries
        const activeEntries = Array.from(routeMap.values())
            .filter(entry => !entry.deleted);

        console.log(`✨ Final active entries for operator: ${activeEntries.length}`);

        if (activeEntries.length === 0) {
            return null;
        }

        // Fetch depot info for entries that need it
        const depotIds = [...new Set(activeEntries.map(e => e.schedule_depot_id).filter(Boolean))];
        let depotsMap = {};

        if (depotIds.length > 0) {
            const { data: depots } = await storageManager
                .from('depots')
                .select('id, name, short_code')
                .in('id', depotIds);

            if (depots) {
                depotsMap = depots.reduce((acc, d) => {
                    acc[d.id] = d;
                    return acc;
                }, {});
            }
        }

        // Add depot and operator info to each entry
        const enrichedEntries = activeEntries.map(entry => {
            const depot = entry.depots || depotsMap[entry.schedule_depot_id] || {};
            const operator = entry.operators || (operatorId === 'BEST' ? { name: 'BEST', short_code: 'BEST' } : {});

            return {
                ...entry,
                depot: depot.short_code || depot.name || '-',
                depots: depot,
                operatorName: operator.name || 'BEST',
                operatorShortCode: operator.short_code || 'BEST'
            };
        });

        const selectedOperatorData = operators.find(o => o.id === operatorId);

        return {
            updateDate: new Date(date).toLocaleDateString('en-GB').replace(/\//g, '.'),
            date: date,
            operator: selectedOperatorData?.name || 'Unknown',
            operator_id: operatorId,
            entries: enrichedEntries
        };
    };

    /**
     * Generate report for all operators combined
     */
    const generateAllOperatorsReport = async (date) => {
        console.log('🔍 Generating operator report for all operators on:', date);

        // Use 'all' to get all entries regardless of operator
        const data = await generateSingleOperatorReport('all', date);

        if (data) {
            return {
                ...data,
                operator: 'All Operators'
            };
        }

        return null;
    };

    /**
     * Handle report generation
     */
    const handleGenerateReport = async () => {
        if (reportType === 'single') {
            if (!selectedOperator || !reportDate) {
                alert('Please select both operator and date');
                return;
            }

            setLoading(true);
            try {
                const data = await generateSingleOperatorReport(selectedOperator, reportDate);
                if (data) {
                    setReportData(data);
                } else {
                    alert('No schedule data found for the selected operator on or before the selected date');
                }
            } catch (error) {
                console.error('Error generating report:', error);
                alert('Error generating report: ' + error.message);
            } finally {
                setLoading(false);
            }
        } else {
            // All operators report
            if (!reportDate) {
                alert('Please select a date');
                return;
            }

            setLoading(true);
            setReportData(null);
            try {
                const data = await generateAllOperatorsReport(reportDate);
                if (data) {
                    setReportData(data);
                } else {
                    alert('No schedule data found for any operator on or before the selected date');
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
                <h2>Generate Operator Report (Excel Style)</h2>
                <p className="report-description">
                    Generates a report matching the Excel book format with routes sorted by code.
                    Empty columns (Destination, Span, Line Notice, Date, Remark) are for manual entry after printing.
                </p>

                <div className="report-inputs">
                    <div className="form-group">
                        <label htmlFor="operator-report-type">Report Type:</label>
                        <select
                            id="operator-report-type"
                            value={reportType}
                            onChange={(e) => {
                                setReportType(e.target.value);
                                setReportData(null);
                            }}
                            className="report-select"
                        >
                            <option value="single">Single Operator</option>
                            <option value="all">All Operators Combined</option>
                        </select>
                    </div>

                    {reportType === 'single' && (
                        <div className="form-group">
                            <label htmlFor="operator-select">Select Operator:</label>
                            <select
                                id="operator-select"
                                value={selectedOperator}
                                onChange={(e) => setSelectedOperator(e.target.value)}
                                className="report-select"
                            >
                                <option value="">-- Select Operator --</option>
                                {operators.map(operator => (
                                    <option key={operator.id} value={operator.id}>
                                        {operator.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="operator-report-date">Select Date:</label>
                        <input
                            id="operator-report-date"
                            type="date"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="report-date-input"
                        />
                    </div>

                    <button
                        onClick={handleGenerateReport}
                        disabled={loading || (reportType === 'single' && !selectedOperator) || !reportDate}
                        className="btn-generate-report"
                    >
                        {loading ? 'Generating...' : 'Generate Operator Report'}
                    </button>
                </div>
            </div>

            {reportData && (
                <OperatorReportPreview reportData={reportData} />
            )}
        </div>
    );
}
