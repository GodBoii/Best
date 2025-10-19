'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import ReportPreview from '../../components/ReportPreview';
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
    const { data, error } = await supabase
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
      // Fetch schedule for the selected depot and date
      const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .select('id')
        .eq('depot_id', selectedDepot)
        .eq('schedule_date', reportDate)
        .single();

      if (scheduleError) {
        if (scheduleError.code === 'PGRST116') {
          alert('No schedule found for the selected depot and date');
        } else {
          throw scheduleError;
        }
        setLoading(false);
        return;
      }

      // Fetch all schedule entries with related data
      const { data: entries, error: entriesError } = await supabase
        .from('schedule_entries')
        .select(`
          *,
          routes (name, code),
          bus_types (name, short_name, category),
          operators (name, short_code)
        `)
        .eq('schedule_id', schedule.id);

      if (entriesError) throw entriesError;

      // Get depot name
      const depot = depots.find(d => d.id === selectedDepot);

      setReportData({
        depot: depot.name,
        date: reportDate,
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
      </header>

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
