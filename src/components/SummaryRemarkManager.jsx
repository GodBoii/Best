'use client';

import React, { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import '../styles/other-duties.css';

export default function SummaryRemarkManager() {
  const [remarkDate, setRemarkDate] = useState('');
  const [dayType, setDayType] = useState('MON_SAT');
  const [remarkText, setRemarkText] = useState('');
  const [existingRemarks, setExistingRemarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setRemarkDate(today);
    fetchExistingRemarks();
  }, []);

  const fetchExistingRemarks = async () => {
    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { data, error } = await client
        .from('summary_report_remarks')
        .select('*')
        .order('remark_date', { ascending: false });

      if (error) throw error;
      setExistingRemarks(data || []);
    } catch (error) {
      console.error('Error fetching remarks:', error);
      alert('Error loading remarks: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveRemark = async () => {
    if (!remarkDate || !remarkText.trim()) {
      alert('Please enter both date and remark text');
      return;
    }

    setIsSaving(true);
    try {
      const client = storageManager.getClient();

      const remarkData = {
        remark_date: remarkDate,
        day_type: dayType,
        remark_text: remarkText.trim(),
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        // Update existing remark
        const { error } = await client
          .from('summary_report_remarks')
          .update(remarkData)
          .eq('id', editingId);

        if (error) throw error;
        alert('Remark updated successfully');
      } else {
        // TEMPORAL LOGIC: Check if remark already exists for this EXACT date and day type
        // Multiple remarks can exist for the same day type, but on different dates
        // The system will use the latest remark on or before the report date
        const { data: existing } = await client
          .from('summary_report_remarks')
          .select('id')
          .eq('remark_date', remarkDate)
          .eq('day_type', dayType)
          .single();

        if (existing) {
          alert('A remark already exists for this exact date and day type. This will create a new effective date. Please delete the existing entry first if you want to replace it.');
          setIsSaving(false);
          return;
        }

        // Insert new remark (temporal: effective from this date onwards)
        const { error } = await client
          .from('summary_report_remarks')
          .insert([remarkData]);

        if (error) throw error;
        alert('Remark saved successfully. This remark will be effective from ' + remarkDate + ' onwards for ' + (dayType === 'MON_SAT' ? 'Monday-Saturday' : 'Sunday') + ' reports.');
      }

      // Reset form
      setRemarkText('');
      setEditingId(null);
      const today = new Date().toISOString().split('T')[0];
      setRemarkDate(today);
      setDayType('MON_SAT');

      // Refresh list
      await fetchExistingRemarks();
    } catch (error) {
      console.error('Error saving remark:', error);
      alert('Error saving remark: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRemark = (remark) => {
    setEditingId(remark.id);
    setRemarkDate(remark.remark_date);
    setDayType(remark.day_type);
    setRemarkText(remark.remark_text);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setRemarkText('');
    const today = new Date().toISOString().split('T')[0];
    setRemarkDate(today);
    setDayType('MON_SAT');
  };

  const handleDeleteRemark = async (remarkId) => {
    if (!confirm('Are you sure you want to delete this remark?')) return;

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { error } = await client
        .from('summary_report_remarks')
        .delete()
        .eq('id', remarkId);

      if (error) throw error;
      alert('Remark deleted successfully');
      await fetchExistingRemarks();
    } catch (error) {
      console.error('Error deleting remark:', error);
      alert('Error deleting remark: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="other-duties-container">
      <div className="other-duties-header">
        <h2>Remark for Summary Report</h2>
        <p className="info-text">Add remarks that will appear on summary reports (uses temporal logic - effective from date onwards)</p>
      </div>

      <div className="other-duties-form">
        <div className="form-section">
          <h3>{editingId ? 'Edit Remark' : 'Add New Remark'}</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Date: <span className="required">*</span></label>
              <input
                type="date"
                value={remarkDate}
                onChange={(e) => setRemarkDate(e.target.value)}
                className="form-input"
                disabled={isLoading || isSaving}
              />
            </div>

            <div className="form-group">
              <label>Day Type: <span className="required">*</span></label>
              <select
                value={dayType}
                onChange={(e) => setDayType(e.target.value)}
                className="form-select"
                disabled={isLoading || isSaving}
              >
                <option value="MON_SAT">Monday to Saturday</option>
                <option value="SUNDAY">Sunday Only</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Remark: <span className="required">*</span></label>
            <textarea
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
              className="form-textarea"
              rows="4"
              placeholder="Enter remark text that will appear on the summary report..."
              disabled={isLoading || isSaving}
            />
          </div>

          <div className="form-actions">
            <button
              onClick={handleSaveRemark}
              className="btn-save-entry"
              disabled={isSaving || !remarkText.trim()}
            >
              {isSaving ? 'Saving...' : editingId ? 'Update Remark' : 'Save Remark'}
            </button>
            {editingId && (
              <button
                onClick={handleCancelEdit}
                className="btn-cancel"
                disabled={isSaving}
                style={{ marginLeft: '10px', backgroundColor: '#6c757d' }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>

        {/* Existing Remarks List */}
        {existingRemarks.length > 0 && (
          <div className="form-section">
            <h3>Existing Remarks (Temporal History)</h3>
            <p className="info-text-small">
              Remarks are effective from their date onwards. Summary reports will use the latest remark on or before the report date.
            </p>
            <div className="existing-entries-list">
              {existingRemarks.map((remark) => (
                <div key={remark.id} className="entry-card">
                  <div className="entry-header">
                    <h4>
                      {new Date(remark.remark_date).toLocaleDateString('en-GB')} - {' '}
                      {remark.day_type === 'MON_SAT' ? 'Mon-Sat' : 'Sunday'}
                    </h4>
                    <div>
                      <button
                        onClick={() => handleEditRemark(remark)}
                        className="btn-edit-entry"
                        disabled={isLoading}
                        style={{ marginRight: '10px', backgroundColor: '#007bff' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRemark(remark.id)}
                        className="btn-delete-entry"
                        disabled={isLoading}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="entry-content">
                    <div className="entry-effective-date">
                      <strong>Effective From:</strong> {new Date(remark.remark_date).toLocaleDateString('en-GB')}
                    </div>
                    <div className="entry-remark">
                      <strong>Remark:</strong> {remark.remark_text}
                    </div>
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
