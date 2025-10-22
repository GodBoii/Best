'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import storageManager from '../../lib/storage/storageManager';
import ReportPreview from '../../components/ReportPreview';
import StorageToggle from '../../components/StorageToggle';
import '../../styles/globals.css';

export default function ReportPage() {
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [depots, setDepots] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('');
  const [reportDate, setReportDate] = useState(getCurrentDate());
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
      console.log('🔍 Generating report for:', { depot: selectedDepot, date: reportDate });

      // STEP 1: Get ALL schedules for this depot up to the selected date
      const { data: schedules, error: scheduleError } = await storageManager
        .from('schedules')
        .select('id, schedule_date')
        .eq('depot_id', selectedDepot)
        .lte('schedule_date', reportDate);

      if (scheduleError) {
        throw scheduleError;
      }

      if (!schedules || schedules.length === 0) {
        alert('No schedule data found for the selected depot on or before the selected date');
        setLoading(false);
        return;
      }

      console.log(`📅 Found ${schedules.length} schedules up to ${reportDate}`);

      // STEP 2: Get schedule IDs
      const scheduleIds = schedules.map(s => s.id);

      // STEP 3: Fetch ALL entries from ALL those schedules with related data
      const { data: allEntries, error: entriesError } = await storageManager
        .from('schedule_entries')
        .select(`
          *,
          routes (name, code),
          bus_types (id, name, short_name, category, display_order),
          operators (id, name, short_code)
        `)
        .in('schedule_id', scheduleIds);

      if (entriesError) throw entriesError;

      console.log(`📋 Found ${allEntries?.length || 0} total entries across all schedules`);

      // STEP 4: Deduplicate entries - keep only the latest version of each route
      // Group by: (route_id, operator_id, bus_type_id)
      const routeMap = new Map();

      for (const entry of (allEntries || [])) {
        // Create unique key for this route combination
        const key = `${entry.route_id}_${entry.operator_id || 'null'}_${entry.bus_type_id}`;
        
        // Check if this entry is deleted on or before report date
        if (entry.is_deleted && entry.deleted_at) {
          const deletedDate = new Date(entry.deleted_at);
          const selectedDate = new Date(reportDate);
          
          if (deletedDate <= selectedDate) {
            // Mark as deleted in the map
            routeMap.set(key, { deleted: true });
            console.log(`🗑️ Route ${entry.routes?.name} marked as deleted on ${entry.deleted_at}`);
            continue;
          }
        }
        
        // Get existing entry for this route
        const existing = routeMap.get(key);
        
        // Skip if already marked as deleted
        if (existing?.deleted) {
          console.log(`⏭️ Skipping ${entry.routes?.name} - already deleted`);
          continue;
        }
        
        // Determine the timestamp to use for comparison
        const entryTimestamp = entry.modified_at || entry.created_at;
        const existingTimestamp = existing ? (existing.modified_at || existing.created_at) : null;
        
        // If no existing entry, or this entry is newer, use it
        if (!existing || (entryTimestamp && existingTimestamp && new Date(entryTimestamp) > new Date(existingTimestamp))) {
          routeMap.set(key, entry);
          console.log(`✅ Using ${entry.routes?.name} from ${entryTimestamp}`);
        } else {
          console.log(`⏭️ Skipping older version of ${entry.routes?.name}`);
        }
      }

      // STEP 5: Filter out deleted entries and convert to array
      const activeEntries = Array.from(routeMap.values())
        .filter(entry => !entry.deleted);

      console.log(`✨ Final active entries: ${activeEntries.length}`);

      // Get depot name
      const depot = depots.find(d => d.id === selectedDepot);

      console.log('=== REPORT SUMMARY ===');
      console.log('Total schedules processed:', schedules.length);
      console.log('Total entries found:', allEntries?.length);
      console.log('Active entries after deduplication:', activeEntries.length);
      
      const withOperators = activeEntries.filter(e => e.operator_id);
      const withoutOperators = activeEntries.filter(e => !e.operator_id);
      
      console.log('Entries with operators (WET_LEASE):', withOperators.length);
      console.log('Entries without operators (BEST):', withoutOperators.length);

      setReportData({
        depot: depot.name,
        date: reportDate,
        actualDataDate: reportDate, // Using selected date since we're aggregating
        entries: activeEntries
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
          <button className="active">Depot Report</button>
        </Link>
        <Link href="/summary">
          <button>Summary Report</button>
        </Link>
        <Link href="/fleet">
          <button>FLEET Schedule</button>
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
