'use client';

import React, { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';

export default function PlatformMasterManager() {
  const [platforms, setPlatforms] = useState([]);
  const [newPlatformName, setNewPlatformName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [editingOrder, setEditingOrder] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const fetchPlatforms = async () => {
    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { data, error } = await client
        .from('platform_master')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (error) {
      console.error('Error fetching platforms:', error);
      alert('Error loading platforms: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newPlatformName.trim()) {
      alert('Please enter a platform name');
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      
      // Get max display_order
      const maxOrder = platforms.length > 0 
        ? Math.max(...platforms.map(p => p.display_order || 0))
        : 0;

      const { error } = await client
        .from('platform_master')
        .insert([{
          name: newPlatformName.trim(),
          display_order: maxOrder + 1
        }]);

      if (error) throw error;

      setNewPlatformName('');
      await fetchPlatforms();
      alert('Platform added successfully');
    } catch (error) {
      console.error('Error adding platform:', error);
      alert('Error adding platform: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (platform) => {
    setEditingId(platform.id);
    setEditingName(platform.name);
    setEditingOrder(platform.display_order?.toString() || '0');
  };

  const handleSaveEdit = async () => {
    if (!editingName.trim()) {
      alert('Platform name cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { error } = await client
        .from('platform_master')
        .update({
          name: editingName.trim(),
          display_order: parseInt(editingOrder) || 0
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditingName('');
      setEditingOrder('');
      await fetchPlatforms();
      alert('Platform updated successfully');
    } catch (error) {
      console.error('Error updating platform:', error);
      alert('Error updating platform: ' + error.message);
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
        .from('platform_master')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchPlatforms();
      alert('Platform deleted successfully');
    } catch (error) {
      console.error('Error deleting platform:', error);
      alert('Error deleting platform: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="master-manager-section">
      <h3>Platform Categories</h3>
      <p className="info-text-small">
        Manage platform categories (e.g., "Non Platform (Driver)", "Other Duties (Driver)")
      </p>

      {/* Add New Platform */}
      <div className="add-item-form">
        <input
          type="text"
          value={newPlatformName}
          onChange={(e) => setNewPlatformName(e.target.value)}
          placeholder="Enter platform name..."
          className="form-input"
          disabled={isLoading}
          onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="btn-add"
          disabled={isLoading || !newPlatformName.trim()}
        >
          + Add Platform
        </button>
      </div>

      {/* Platform List */}
      {platforms.length === 0 ? (
        <p className="no-items-message">No platforms defined yet. Add one above.</p>
      ) : (
        <div className="items-list">
          <table className="master-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Platform Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {platforms.map((platform) => (
                <tr key={platform.id}>
                  {editingId === platform.id ? (
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
                      <td>{platform.display_order || 0}</td>
                      <td>{platform.name}</td>
                      <td>
                        <button
                          onClick={() => handleEdit(platform)}
                          className="btn-edit-small"
                          disabled={isLoading}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(platform.id, platform.name)}
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
