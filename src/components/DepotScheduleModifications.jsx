'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import DepotSection from './DepotSection';
import OperatorSection from './OperatorSection';
import BusTypeSection from './BusTypeSection';

export default function DepotScheduleModifications() {
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedBusType, setSelectedBusType] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState(null);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    mon_sat_am: '',
    mon_sat_noon: '',
    mon_sat_pm: '',
    sun_am: '',
    sun_noon: '',
    sun_pm: '',
    duties_driver_ms: '',
    duties_cond_ms: '',
    duties_driver_sun: '',
    duties_cond_sun: ''
  });

  const loadEntries = async () => {
    if (!selectedDepot || !scheduleDate || !selectedOperator || !selectedBusType) {
      console.log('❌ Missing required fields');
      return;
    }

    console.log('🔍 Loading entries with criteria:', {
      depot: selectedDepot.name,
      depot_id: selectedDepot.id,
      date: scheduleDate,
      operator: selectedOperator.name,
      operator_id: selectedOperator.id,
      busType: selectedBusType.name,
      bus_type_id: selectedBusType.id
    });

    setLoading(true);
    try {
      // Get ALL schedules for this depot up to the selected date
      console.log('📅 Fetching schedules up to selected date...');
      const { data: schedules, error: scheduleError } = await storageManager
        .from('schedules')
        .select('id, schedule_date')
        .eq('depot_id', selectedDepot.id)
        .lte('schedule_date', scheduleDate);

      console.log('Schedule query result:', { count: schedules?.length, scheduleError });

      if (scheduleError) {
        throw scheduleError;
      }

      if (!schedules || schedules.length === 0) {
        console.log('⚠️ No schedules found for this depot up to selected date');
        setEntries([]);
        return;
      }

      console.log(`✅ Found ${schedules.length} schedules`);

      // Get schedule IDs
      const scheduleIds = schedules.map(s => s.id);

      // Get all entries from ALL those schedules for this operator and bus type
      console.log('📋 Fetching schedule entries from all schedules...');
      const { data, error } = await storageManager
        .from('schedule_entries')
        .select(`
          *,
          routes (
            id,
            name,
            code
          )
        `)
        .in('schedule_id', scheduleIds)
        .eq('operator_id', selectedOperator.id)
        .eq('bus_type_id', selectedBusType.id);

      console.log('Entries query result:', { 
        count: data?.length, 
        error 
      });

      if (error) throw error;

      // Deduplicate entries - keep only the latest version of each route
      const routeMap = new Map();

      for (const entry of (data || [])) {
        const routeId = entry.route_id;
        
        // Check if this entry is deleted on or before selected date
        if (entry.is_deleted && entry.deleted_at) {
          const deletedDate = new Date(entry.deleted_at);
          const selectedDate = new Date(scheduleDate);
          
          if (deletedDate <= selectedDate) {
            // Mark as deleted
            routeMap.set(routeId, { deleted: true });
            console.log(`🗑️ Route ${entry.routes?.name} marked as deleted`);
            continue;
          }
        }
        
        // Get existing entry for this route
        const existing = routeMap.get(routeId);
        
        // Skip if already marked as deleted
        if (existing?.deleted) {
          console.log(`⏭️ Skipping ${entry.routes?.name} - already deleted`);
          continue;
        }
        
        // Determine timestamp
        const entryTimestamp = entry.modified_at || entry.created_at;
        const existingTimestamp = existing ? (existing.modified_at || existing.created_at) : null;
        
        // If no existing entry, or this entry is newer, use it
        if (!existing || (entryTimestamp && existingTimestamp && new Date(entryTimestamp) > new Date(existingTimestamp))) {
          routeMap.set(routeId, entry);
          console.log(`✅ Using ${entry.routes?.name} from ${entryTimestamp}`);
        }
      }

      // Filter out deleted entries and convert to array
      const activeEntries = Array.from(routeMap.values())
        .filter(entry => !entry.deleted);

      // Sort by date (most recent first)
      const sortedEntries = activeEntries.sort((a, b) => {
        const dateA = new Date(a.modified_at || a.created_at || 0);
        const dateB = new Date(b.modified_at || b.created_at || 0);
        return dateB - dateA;
      });

      console.log(`✅ Found ${sortedEntries.length} active entries after deduplication (${data?.length || 0} total)`);
      setEntries(sortedEntries);
    } catch (error) {
      console.error('❌ Error loading entries:', error);
      alert('Error loading entries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setEditForm({
      mon_sat_am: entry.mon_sat_am === '-' ? '0' : entry.mon_sat_am,
      mon_sat_noon: entry.mon_sat_noon === '-' ? '0' : entry.mon_sat_noon,
      mon_sat_pm: entry.mon_sat_pm === '-' ? '0' : entry.mon_sat_pm,
      sun_am: entry.sun_am === '-' ? '0' : entry.sun_am,
      sun_noon: entry.sun_noon === '-' ? '0' : entry.sun_noon,
      sun_pm: entry.sun_pm === '-' ? '0' : entry.sun_pm,
      duties_driver_ms: entry.duties_driver_ms === '-' ? '0' : entry.duties_driver_ms,
      duties_cond_ms: entry.duties_cond_ms === '-' ? '0' : entry.duties_cond_ms,
      duties_driver_sun: entry.duties_driver_sun === '-' ? '0' : entry.duties_driver_sun,
      duties_cond_sun: entry.duties_cond_sun === '-' ? '0' : entry.duties_cond_sun
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    console.log('💾 Saving entry changes...');
    console.log('Entry ID:', editingEntry.id);
    console.log('Form data:', editForm);

    setLoading(true);
    try {
      const formatValue = (value) => {
        const num = parseInt(value);
        return (isNaN(num) || num === 0) ? '-' : value;
      };

      // Create a NEW entry with the updated data (version control approach)
      // This preserves the old entry for historical tracking
      const currentTimestamp = new Date().toISOString();
      
      // First, get the schedule for the selected date
      let scheduleId;
      const { data: existingSchedule, error: scheduleCheckError } = await storageManager
        .from('schedules')
        .select('id')
        .eq('depot_id', selectedDepot.id)
        .eq('schedule_date', scheduleDate)
        .single();

      if (scheduleCheckError && scheduleCheckError.code !== 'PGRST116') {
        throw scheduleCheckError;
      }

      if (existingSchedule) {
        scheduleId = existingSchedule.id;
      } else {
        // Create new schedule for this date
        const { data: newSchedule, error: scheduleCreateError } = await storageManager
          .from('schedules')
          .insert([{
            depot_id: selectedDepot.id,
            schedule_date: scheduleDate
          }])
          .select()
          .single();

        if (scheduleCreateError) throw scheduleCreateError;
        scheduleId = newSchedule.id;
      }

      // Create new entry with updated values
      const newEntryData = {
        schedule_id: scheduleId,
        route_id: editingEntry.route_id,
        bus_type_id: editingEntry.bus_type_id,
        operator_id: editingEntry.operator_id,
        mon_sat_am: formatValue(editForm.mon_sat_am),
        mon_sat_noon: formatValue(editForm.mon_sat_noon),
        mon_sat_pm: formatValue(editForm.mon_sat_pm),
        sun_am: formatValue(editForm.sun_am),
        sun_noon: formatValue(editForm.sun_noon),
        sun_pm: formatValue(editForm.sun_pm),
        duties_driver_ms: formatValue(editForm.duties_driver_ms),
        duties_cond_ms: formatValue(editForm.duties_cond_ms),
        duties_driver_sun: formatValue(editForm.duties_driver_sun),
        duties_cond_sun: formatValue(editForm.duties_cond_sun),
        is_deleted: false,
        deleted_at: null,
        created_at: currentTimestamp,
        modified_at: currentTimestamp
      };

      console.log('New entry data:', newEntryData);

      const { error } = await storageManager
        .from('schedule_entries')
        .insert([newEntryData]);

      if (error) throw error;

      console.log('✅ New version of entry created successfully');
      alert('Entry updated successfully! A new version has been created.');
      setShowEditModal(false);
      setEditingEntry(null);
      loadEntries(); // Reload entries
    } catch (error) {
      console.error('❌ Error updating entry:', error);
      alert('Error updating entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (entry) => {
    setDeletingEntry(entry);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingEntry) return;

    console.log('🗑️ Deleting entry...');
    console.log('Entry ID:', deletingEntry.id);
    console.log('Deletion date:', scheduleDate);

    setLoading(true);
    try {
      const currentTimestamp = new Date().toISOString();
      
      // Create a deletion entry (version control approach)
      // First, get the schedule for the selected date
      let scheduleId;
      const { data: existingSchedule, error: scheduleCheckError } = await storageManager
        .from('schedules')
        .select('id')
        .eq('depot_id', selectedDepot.id)
        .eq('schedule_date', scheduleDate)
        .single();

      if (scheduleCheckError && scheduleCheckError.code !== 'PGRST116') {
        throw scheduleCheckError;
      }

      if (existingSchedule) {
        scheduleId = existingSchedule.id;
      } else {
        // Create new schedule for this date
        const { data: newSchedule, error: scheduleCreateError } = await storageManager
          .from('schedules')
          .insert([{
            depot_id: selectedDepot.id,
            schedule_date: scheduleDate
          }])
          .select()
          .single();

        if (scheduleCreateError) throw scheduleCreateError;
        scheduleId = newSchedule.id;
      }

      // Create a new entry marked as deleted
      const deleteEntryData = {
        schedule_id: scheduleId,
        route_id: deletingEntry.route_id,
        bus_type_id: deletingEntry.bus_type_id,
        operator_id: deletingEntry.operator_id,
        mon_sat_am: deletingEntry.mon_sat_am,
        mon_sat_noon: deletingEntry.mon_sat_noon,
        mon_sat_pm: deletingEntry.mon_sat_pm,
        sun_am: deletingEntry.sun_am,
        sun_noon: deletingEntry.sun_noon,
        sun_pm: deletingEntry.sun_pm,
        duties_driver_ms: deletingEntry.duties_driver_ms,
        duties_cond_ms: deletingEntry.duties_cond_ms,
        duties_driver_sun: deletingEntry.duties_driver_sun,
        duties_cond_sun: deletingEntry.duties_cond_sun,
        is_deleted: true,
        deleted_at: scheduleDate,
        created_at: currentTimestamp,
        modified_at: currentTimestamp
      };

      console.log('Delete entry data:', deleteEntryData);

      const { error } = await storageManager
        .from('schedule_entries')
        .insert([deleteEntryData]);

      if (error) throw error;

      console.log('✅ Deletion entry created successfully');
      alert('Entry deleted successfully! This will not appear in reports from this date onwards.');
      setShowDeleteModal(false);
      setDeletingEntry(null);
      loadEntries(); // Reload entries
    } catch (error) {
      console.error('❌ Error deleting entry:', error);
      alert('Error deleting entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modifications-container">
      <h2>Depot Schedule Modifications</h2>
      <p>View, edit, and delete existing schedule entries for a specific depot, date, operator, and bus type.</p>

      <div className="modifications-form">
        {/* Selection Form */}
        <div className="selection-panel">
          <h3>Select Criteria</h3>
          <div className="selection-grid">
            <DepotSection 
              onDepotSelect={setSelectedDepot}
              selectedDepot={selectedDepot}
            />

            <div className="form-section">
              <h3>Date</h3>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="date-input"
              />
            </div>

            <OperatorSection 
              onOperatorSelect={setSelectedOperator}
              selectedOperator={selectedOperator}
            />

            <BusTypeSection 
              onBusTypeSelect={setSelectedBusType}
              selectedBusType={selectedBusType}
            />
          </div>

          <button
            onClick={loadEntries}
            disabled={!selectedDepot || !scheduleDate || !selectedOperator || !selectedBusType || loading}
            className="btn-load"
          >
            {loading ? 'Loading...' : 'Load Entries'}
          </button>
        </div>

        {/* Entries Table */}
        {entries.length > 0 && (
          <div className="entries-table-container">
            <h3>Schedule Entries ({entries.length})</h3>
            <div className="entries-table-wrapper">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th rowSpan="2">Route</th>
                    <th rowSpan="2">Code</th>
                    <th rowSpan="2">Date</th>
                    <th colSpan="5">Mon-Sat Schedule</th>
                    <th colSpan="5">Sunday Schedule</th>
                    <th rowSpan="2">Actions</th>
                  </tr>
                  <tr>
                    <th>AM</th>
                    <th>NOON</th>
                    <th>PM</th>
                    <th>Drivers</th>
                    <th>Cond.</th>
                    <th>AM</th>
                    <th>NOON</th>
                    <th>PM</th>
                    <th>Drivers</th>
                    <th>Cond.</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const entryDate = entry.modified_at || entry.created_at;
                    const displayDate = entryDate ? new Date(entryDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    }) : '-';
                    const displayTime = entryDate ? new Date(entryDate).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : '';
                    
                    return (
                      <tr key={entry.id}>
                        <td>{entry.routes.name}</td>
                        <td>{entry.routes.code}</td>
                        <td className="date-cell" title={`${displayDate} ${displayTime}`}>
                          <div className="date-display">
                            <span className="date-value">{displayDate}</span>
                            {entry.modified_at && <span className="modified-badge">Modified</span>}
                          </div>
                        </td>
                        <td>{entry.mon_sat_am}</td>
                        <td>{entry.mon_sat_noon}</td>
                        <td>{entry.mon_sat_pm}</td>
                        <td>{entry.duties_driver_ms}</td>
                        <td>{entry.duties_cond_ms}</td>
                        <td>{entry.sun_am}</td>
                        <td>{entry.sun_noon}</td>
                        <td>{entry.sun_pm}</td>
                        <td>{entry.duties_driver_sun}</td>
                        <td>{entry.duties_cond_sun}</td>
                        <td className="actions-cell">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="btn-edit"
                            title="Edit this entry"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => handleDelete(entry)}
                            className="btn-delete"
                            title="Delete this entry"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {entries.length === 0 && selectedDepot && scheduleDate && selectedOperator && selectedBusType && !loading && (
          <div className="no-entries">
            <div className="no-entries-icon">📭</div>
            <h3>No Entries Found</h3>
            <p>No schedule entries found for:</p>
            <ul>
              <li><strong>Depot:</strong> {selectedDepot.name}</li>
              <li><strong>Date:</strong> {scheduleDate}</li>
              <li><strong>Operator:</strong> {selectedOperator.name}</li>
              <li><strong>Bus Type:</strong> {selectedBusType.name}</li>
            </ul>
            <p className="hint">💡 Try creating entries in the Schedule Entry Form first.</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingEntry && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Edit Schedule Entry</h3>
                <p className="modal-subtitle">
                  {editingEntry.routes.name} <span className="route-code">#{editingEntry.routes.code}</span>
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>

            <div className="edit-form-compact">
              <div className="schedule-card">
                <div className="schedule-card-header">
                  <span className="schedule-icon">📅</span>
                  <h4>Mon-Sat</h4>
                </div>
                <div className="schedule-inputs">
                  <div className="input-compact">
                    <label>AM</label>
                    <input type="number" value={editForm.mon_sat_am} 
                      onChange={(e) => setEditForm({...editForm, mon_sat_am: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>NOON</label>
                    <input type="number" value={editForm.mon_sat_noon} 
                      onChange={(e) => setEditForm({...editForm, mon_sat_noon: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>PM</label>
                    <input type="number" value={editForm.mon_sat_pm} 
                      onChange={(e) => setEditForm({...editForm, mon_sat_pm: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>Drivers</label>
                    <input type="number" value={editForm.duties_driver_ms} 
                      onChange={(e) => setEditForm({...editForm, duties_driver_ms: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>Cond.</label>
                    <input type="number" value={editForm.duties_cond_ms} 
                      onChange={(e) => setEditForm({...editForm, duties_cond_ms: e.target.value})} min="0" />
                  </div>
                </div>
              </div>

              <div className="schedule-card">
                <div className="schedule-card-header">
                  <span className="schedule-icon">☀️</span>
                  <h4>Sunday</h4>
                </div>
                <div className="schedule-inputs">
                  <div className="input-compact">
                    <label>AM</label>
                    <input type="number" value={editForm.sun_am} 
                      onChange={(e) => setEditForm({...editForm, sun_am: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>NOON</label>
                    <input type="number" value={editForm.sun_noon} 
                      onChange={(e) => setEditForm({...editForm, sun_noon: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>PM</label>
                    <input type="number" value={editForm.sun_pm} 
                      onChange={(e) => setEditForm({...editForm, sun_pm: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>Drivers</label>
                    <input type="number" value={editForm.duties_driver_sun} 
                      onChange={(e) => setEditForm({...editForm, duties_driver_sun: e.target.value})} min="0" />
                  </div>
                  <div className="input-compact">
                    <label>Cond.</label>
                    <input type="number" value={editForm.duties_cond_sun} 
                      onChange={(e) => setEditForm({...editForm, duties_cond_sun: e.target.value})} min="0" />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowEditModal(false)} className="btn-cancel" disabled={loading}>
                Cancel
              </button>
              <button onClick={handleSaveEdit} className="btn-save" disabled={loading}>
                {loading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingEntry && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>🗑️ Delete Entry?</h3>
                <p className="modal-subtitle">
                  {deletingEntry.routes.name} <span className="route-code">#{deletingEntry.routes.code}</span>
                </p>
              </div>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              <div className="warning-box">
                <div className="warning-icon">⚠️</div>
                <div>
                  <p className="warning-title">This action will mark this entry as deleted</p>
                  <p className="warning-desc">
                    Deletion date: <strong>{scheduleDate}</strong><br/>
                    The entry will not appear in reports from this date onwards.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn-cancel" disabled={loading}>
                Cancel
              </button>
              <button onClick={confirmDelete} className="btn-delete-confirm" disabled={loading}>
                {loading ? 'Deleting...' : '🗑️ Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
