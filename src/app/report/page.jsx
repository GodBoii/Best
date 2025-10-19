'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import storageManager from '../../lib/storage/storageManager';
import ReportPreview from '../../components/ReportPreview';
import StorageToggle from '../../components/StorageToggle';
import '../../styles/globals.css';

export default function ReportPage() {
  const [depots, setDepots] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

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

  const handleGenerateReport = async () => {
    if (!selectedDepot || !reportDate) {
      alert('Please select both depot and date');
      return;
    }

    setLoading(true);
    try {
      // Fetch the most recent schedule for the selected depot on or before the selected date
      // This implements "latest-as-of" logic: if no exact match, use the most recent data
      const { data: schedules, error: scheduleError } = await storageManager
        .from('schedules')
        .select('id, schedule_date')
        .eq('depot_id', selectedDepot)
        .lte('schedule_date', reportDate)  // Less than or equal to selected date
        .order('schedule_date', { ascending: false })  // Most recent first
        .limit(1);

      if (scheduleError) {
        throw scheduleError;
      }

      if (!schedules || schedules.length === 0) {
        alert('No schedule data found for the selected depot on or before the selected date');
        setLoading(false);
        return;
      }

      const schedule = schedules[0];

      // Fetch all schedule entries with related data
      const { data: entries, error: entriesError } = await storageManager
        .from('schedule_entries')
        .select(`
          *,
          routes (name, code),
          bus_types (id, name, short_name, category, display_order),
          operators (id, name, short_code)
        `)
        .eq('schedule_id', schedule.id)
        .order('created_at', { ascending: true });

      if (entriesError) throw entriesError;

      // Get depot name
      const depot = depots.find(d => d.id === selectedDepot);

      console.log('=== FETCHED ENTRIES ===');
      console.log('Total entries:', entries?.length);
      console.log('Sample entry structure:', entries?.[0]);
      
      const withOperators = entries?.filter(e => e.operator_id);
      const withoutOperators = entries?.filter(e => !e.operator_id);
      
      console.log('\n=== ENTRIES WITH OPERATORS (WET_LEASE) ===');
      console.log('Count:', withOperators?.length);
      withOperators?.forEach(e => {
        console.log({
          route: e.routes?.name,
          busType: e.bus_types?.name,
          busTypeCategory: e.bus_types?.category,
          operatorId: e.operator_id,
          operatorData: e.operators
        });
      });
      
      console.log('\n=== ENTRIES WITHOUT OPERATORS (BEST) ===');
      console.log('Count:', withoutOperators?.length);
      withoutOperators?.forEach(e => {
        console.log({
          route: e.routes?.name,
          busType: e.bus_types?.name,
          busTypeCategory: e.bus_types?.category,
          operatorId: e.operator_id
        });
      });

      setReportData({
        depot: depot.name,
        date: reportDate,
        actualDataDate: schedule.schedule_date,  // The actual date of the data being used
        entries: entries || []
      });

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Bus Schedule Report Generator</h1>
        <StorageToggle />
      </header>

      <nav className="app-nav">
        <Link href="/">
          <button>Schedule Entry</button>
        </Link>
        <Link href="/report">
          <button className="active">Generate Report</button>
        </Link>
      </nav>

      <main className="app-main">
        <div className="report-generator-container">
          <div className="report-form-section">
            <h2>Generate Schedule Report</h2>

            <div className="report-inputs">
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
                disabled={loading || !selectedDepot || !reportDate}
                className="btn-generate-report"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {reportData && (
            <ReportPreview reportData={reportData} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>Bus Schedule Management System © 2025</p>
      </footer>
    </div>
  );
}
