'use client';

import React, { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';

export default function PlatformDutyMasterManager() {
  const [duties, setDuties] = useState([]);
  const [newDutyName, setNewDutyName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingOrder, setEditingOrder] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchDuties();
  }, []);

  const fetchDuties = async () => {
    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { data, error } = await client
        .from('platform_duty_master')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setDuties(data || []);
    } catch (error) {
      console.error('Error fetching duties:', error);
      alert('Error loading duties: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newDutyName.trim()) {
      alert('Please enter a duty name');
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      
      // Get max display_order
      const maxOrder = duties.length > 0 
        ? Math.max(...duties.map(d => d.display_order || 0))
        : 0;

      const { error } = await client
        .from('platform_duty_master')
        .insert([{
          name: newDutyName.trim(),
          display_order: maxOrder + 1
        }]);

      if (error) throw error;

      setNewDutyName('');
      await fetchDuties();
      alert('Duty added successfully');
    } catch (error) {
      console.error('Error adding duty:', error);
      alert('Error adding duty: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (duty) => {
    setEditingId(duty.id);
    setEditingName(duty.name);
    setEditingOrder(duty.display_order?.toString() || '0');
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      alert('Duty name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { error } = await client
        .from('platform_duty_master')
        .update({
          name: editingName.trim(),
          display_order: parseInt(editingOrder) || 0
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditingName('');
      setEditingOrder('');
      await fetchDuties();
      alert('Duty updated successfully');
    } catch (error) {
      console.error('Error updating duty:', error);
      alert('Error updating duty: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingOrder('');
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated entries.`)) {
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { error } = await client
        .from('platform_duty_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchDuties();
      alert('Duty deleted successfully');
    } catch (error) {
      console.error('Error deleting duty:', error);
      alert('Error deleting duty: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="master-manager-section">
      <h3>Platform Duty Types</h3>
      <p className="info-text-small">
        Manage duty types (e.g., "Staff Car", "CNG", "Washing", "Refr.Course")
      </p>

      {/* Add New Duty */}
      <div className="add-item-form">
        <input
          type="text"
          value={newDutyName}
          onChange={(e) => setNewDutyName(e.target.value)}
          placeholder="Enter duty name..."
          className="form-input"
          disabled={isLoading}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="btn-add"
          disabled={isLoading || !newDutyName.trim()}
        >
          + Add Duty
        </button>
      </div>

      {/* Duties List */}
      {duties.length === 0 ? (
        <p className="no-items-message">No duties defined yet. Add one above.</p>
      ) : (
        <div className="items-list">
          <table className="master-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Duty Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {duties.map((duty) => (
                <tr key={duty.id}>
                  {editingId === duty.id ? (
                    <>
                      <td>
                        <input
                          type="number"
                          value={editingOrder}
                          onChange={(e) => setEditingOrder(e.target.value)}
                          className="form-input-small"
                          min="0"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="form-input"
                        />
                      </td>
                      <td>
                        <button
                          onClick={handleSaveEdit}
                          className="btn-save-small"
                          disabled={isLoading}
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-cancel-small"
                          disabled={isLoading}
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{duty.display_order || 0}</td>
                      <td>{duty.name}</td>
                      <td>
                        <button
                          onClick={() => handleEdit(duty)}
                          className="btn-edit-small"
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(duty.id, duty.name)}
                          className="btn-delete-small"
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
