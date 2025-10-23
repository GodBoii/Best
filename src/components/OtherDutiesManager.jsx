'use client';

import React, { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import '../styles/other-duties.css';

export default function OtherDutiesManager() {
  // State for dropdowns
  const [depots, setDepots] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [platformDuties, setPlatformDuties] = useState([]);

  // State for form inputs
  const [selectedDepot, setSelectedDepot] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [remark, setRemark] = useState('');

  // State for duty assignments
  const [dutyAssignments, setDutyAssignments] = useState([]);

  // State for existing entries
  const [existingEntries, setExistingEntries] = useState([]);

  // State for loading
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMasterData();
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (selectedDepot && selectedDate) {
      fetchExistingEntries();
    }
  }, [selectedDepot, selectedDate]);

  const fetchMasterData = async () => {
    setIsLoading(true);
    try {
      const client = storageManager.getClient();

      const [depotsRes, platformsRes, dutiesRes] = await Promise.all([
        client.from('depots').select('*').order('name'),
        client.from('platform_master').select('*').order('display_order'),
        client.from('platform_duty_master').select('*').order('display_order')
      ]);

      if (depotsRes.data) setDepots(depotsRes.data);
      if (platformsRes.data) setPlatforms(platformsRes.data);
      if (dutiesRes.data) setPlatformDuties(dutiesRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExistingEntries = async () => {
    try {
      const client = storageManager.getClient();

      // Fetch entries for this depot on or before the selected date (temporal system)
      const { data: entries, error } = await client
        .from('other_duties_entries')
        .select('*')
        .eq('depot_id', selectedDepot)
        .lte('duty_date', selectedDate)
        .order('duty_date', { ascending: false });

      if (error) throw error;

      if (!entries || entries.length === 0) {
        setExistingEntries([]);
        return;
      }

      // Fetch items for each entry
      const entryIds = entries.map(e => e.id);
      const { data: items, error: itemsError } = await client
        .from('other_duties_items')
        .select('*')
        .in('other_duties_entry_id', entryIds);

      if (itemsError) throw itemsError;

      // Group entries by platform - keep only the latest entry for each platform
      const latestEntriesByPlatform = new Map();
      
      entries.forEach(entry => {
        const platformId = entry.platform_id;
        if (!latestEntriesByPlatform.has(platformId)) {
          latestEntriesByPlatform.set(platformId, entry);
        }
      });

      // Combine entries with their items
      const enrichedEntries = Array.from(latestEntriesByPlatform.values()).map(entry => {
        const entryItems = (items || []).filter(item => item.other_duties_entry_id === entry.id);
        const platform = platforms.find(p => p.id === entry.platform_id);
        
        // Get duty details for each item
        const duties = entryItems.map(item => {
          const duty = platformDuties.find(d => d.id === item.platform_duty_id);
          return {
            id: item.id,
            dutyId: item.platform_duty_id,
            dutyName: duty?.name || 'Unknown',
            value: item.duty_value
          };
        });

        return {
          id: entry.id,
          platformId: entry.platform_id,
          platformName: platform?.name || 'Unknown',
          effectiveDate: entry.duty_date,
          remark: entry.remark,
          duties: duties,
          totalValue: duties.reduce((sum, d) => sum + d.value, 0)
        };
      });

      setExistingEntries(enrichedEntries);
    } catch (error) {
      console.error('Error fetching existing entries:', error);
      setExistingEntries([]);
    }
  };

  const handleAddDuty = () => {
    setDutyAssignments([...dutyAssignments, { dutyId: '', value: 0 }]);
  };

  const handleRemoveDuty = (index) => {
    const updated = dutyAssignments.filter((_, i) => i !== index);
    setDutyAssignments(updated);
  };

  const handleDutyChange = (index, field, value) => {
    const updated = [...dutyAssignments];
    updated[index][field] = value;
    setDutyAssignments(updated);
  };

  const handleSaveEntry = async () => {
    if (!selectedDepot || !selectedDate || !selectedPlatform) {
      alert('Please select depot, date, and platform');
      return;
    }

    if (dutyAssignments.length === 0) {
      alert('Please add at least one duty assignment');
      return;
    }

    // Validate duty assignments
    for (const assignment of dutyAssignments) {
      if (!assignment.dutyId) {
        alert('Please select a duty for all assignments');
        return;
      }
      if (assignment.value < 0) {
        alert('Duty values must be non-negative');
        return;
      }
    }

    setIsSaving(true);
    try {
      const client = storageManager.getClient();

      // Check if entry already exists for this platform on this exact date
      const { data: existing } = await client
        .from('other_duties_entries')
        .select('id')
        .eq('depot_id', selectedDepot)
        .eq('duty_date', selectedDate)
        .eq('platform_id', selectedPlatform)
        .single();

      if (existing) {
        alert('An entry already exists for this platform on this exact date. This will update the effective date. Please delete the existing entry first if you want to replace it.');
        setIsSaving(false);
        return;
      }

      // Create entry
      const { data: entry, error: entryError } = await client
        .from('other_duties_entries')
        .insert([{
          depot_id: selectedDepot,
          duty_date: selectedDate,
          platform_id: selectedPlatform,
          remark: remark || null
        }])
        .select()
        .single();

      if (entryError) throw entryError;

      // Create items
      const items = dutyAssignments.map(assignment => ({
        other_duties_entry_id: entry.id,
        platform_duty_id: assignment.dutyId,
        duty_value: parseInt(assignment.value) || 0
      }));

      const { error: itemsError } = await client
        .from('other_duties_items')
        .insert(items);

      if (itemsError) throw itemsError;

      alert('Entry saved successfully');
      
      // Reset form
      setSelectedPlatform('');
      setRemark('');
      setDutyAssignments([]);
      
      // Refresh existing entries
      await fetchExistingEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving entry: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;

    setIsLoading(true);
    try {
      const client = storageManager.getClient();

      // Delete items first (cascade should handle this, but being explicit)
      await client
        .from('other_duties_items')
        .delete()
        .eq('other_duties_entry_id', entryId);

      // Delete entry
      const { error } = await client
        .from('other_duties_entries')
        .delete()
        .eq('id', entryId);

      if (error) throw error;

      alert('Entry deleted successfully');
      await fetchExistingEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      alert('Error deleting entry: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="other-duties-container">
      <div className="other-duties-header">
        <h2>Other Duties Management</h2>
        <p className="info-text">Manage platform duties for depot reports</p>
      </div>

      <div className="other-duties-form">
        {/* Section 1: Depot and Date Selection */}
        <div className="form-section">
          <h3>1. Select Depot and Date</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Depot: <span className="required">*</span></label>
              <select
                value={selectedDepot}
                onChange={(e) => setSelectedDepot(e.target.value)}
                className="form-select"
                disabled={isLoading}
              >
                <option value="">Select Depot</option>
                {depots.map(depot => (
                  <option key={depot.id} value={depot.id}>
                    {depot.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date: <span className="required">*</span></label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-input"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Platform Selection */}
        {selectedDepot && selectedDate && (
          <div className="form-section">
            <h3>2. Add New Entry</h3>
            <div className="form-group">
              <label>Platform: <span className="required">*</span></label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="form-select"
              >
                <option value="">Select Platform</option>
                {platforms.map(platform => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section 3: Platform Duties */}
            {selectedPlatform && (
              <>
                <div className="duties-section">
                  <div className="duties-header">
                    <h4>Platform Duties</h4>
                    <button
                      onClick={handleAddDuty}
                      className="btn-add-duty"
                      type="button"
                    >
                      + Add Duty
                    </button>
                  </div>

                  {dutyAssignments.length === 0 ? (
                    <p className="no-duties-message">No duties added. Click "Add Duty" to start.</p>
                  ) : (
                    <div className="duties-list">
                      {dutyAssignments.map((assignment, index) => (
                        <div key={index} className="duty-item">
                          <div className="duty-select-group">
                            <label>Duty:</label>
                            <select
                              value={assignment.dutyId}
                              onChange={(e) => handleDutyChange(index, 'dutyId', e.target.value)}
                              className="form-select-small"
                            >
                              <option value="">Select Duty</option>
                              {platformDuties.map(duty => (
                                <option key={duty.id} value={duty.id}>
                                  {duty.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="duty-value-group">
                            <label>Value:</label>
                            <input
                              type="number"
                              value={assignment.value}
                              onChange={(e) => handleDutyChange(index, 'value', e.target.value)}
                              className="form-input-small"
                              min="0"
                              placeholder="0"
                            />
                          </div>

                          <button
                            onClick={() => handleRemoveDuty(index)}
                            className="btn-remove-duty"
                            type="button"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Remark */}
                <div className="form-group">
                  <label>Remark (Optional):</label>
                  <textarea
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="form-textarea"
                    rows="3"
                    placeholder="Enter any remarks or notes..."
                  />
                </div>

                <div className="form-actions">
                  <button
                    onClick={handleSaveEntry}
                    className="btn-save-entry"
                    disabled={isSaving || dutyAssignments.length === 0}
                  >
                    {isSaving ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Section 5: Existing Entries */}
        {selectedDepot && selectedDate && existingEntries.length > 0 && (
          <div className="form-section">
            <h3>3. Current Entries (Effective on {selectedDate})</h3>
            <p className="info-text-small">
              Showing the latest entry for each platform on or before {selectedDate}. 
              These entries will be used in reports from their effective date onwards until updated.
            </p>
            <div className="existing-entries-list">
              {existingEntries.map((entry) => (
                <div key={entry.id} className="entry-card">
                  <div className="entry-header">
                    <h4>{entry.platformName}</h4>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="btn-delete-entry"
                      disabled={isLoading}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="entry-content">
                    <div className="entry-effective-date">
                      <strong>Effective From:</strong> {new Date(entry.effectiveDate).toLocaleDateString('en-GB')}
                      {entry.effectiveDate !== selectedDate && (
                        <span className="historical-badge">Historical</span>
                      )}
                    </div>
                    <div className="entry-total">
                      <strong>Total:</strong> {entry.totalValue}
                    </div>
                    <div className="entry-duties">
                      <strong>Duties:</strong>
                      <ul>
                        {entry.duties.map((duty, idx) => (
                          <li key={idx}>
                            {duty.dutyName} = {duty.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {entry.remark && (
                      <div className="entry-remark">
                        <strong>Remark:</strong> {entry.remark}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
