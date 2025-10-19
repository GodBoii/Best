'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import ModifyModal from './ModifyModal';

export default function DepotSection({ onDepotSelect, selectedDepot }) {
  const [depots, setDepots] = useState([]);
  const [depotInput, setDepotInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredDepots, setFilteredDepots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalDepotName, setModalDepotName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepots();
  }, []);

  useEffect(() => {
    // Filter depots based on input
    if (depotInput.trim()) {
      const filtered = depots.filter(depot =>
        depot.name.toLowerCase().includes(depotInput.toLowerCase())
      );
      setFilteredDepots(filtered);
    } else {
      setFilteredDepots(depots);
    }
  }, [depotInput, depots]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.depot-input-wrapper') && !event.target.closest('.depot-actions-unified')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleInputChange = (value) => {
    setDepotInput(value);
    setShowDropdown(true);
    if (selectedDepot && selectedDepot.name !== value) {
      onDepotSelect(null);
    }
  };

  const handleSelect = (depot) => {
    onDepotSelect(depot);
    setDepotInput(depot.name);
    setShowDropdown(false);
  };

  const handleAdd = async () => {
    if (!depotInput.trim()) {
      alert('Please enter a depot name');
      return;
    }

    const exists = depots.some(d => d.name.toLowerCase() === depotInput.trim().toLowerCase());
    if (exists) {
      alert('A depot with this name already exists');
      return;
    }

    setLoading(true);
    const { data, error } = await storageManager
      .from('depots')
      .insert([{ name: depotInput.trim() }])
      .select()
      .single();

    if (error) {
      alert('Error adding depot: ' + error.message);
    } else {
      await fetchDepots();
      onDepotSelect(data);
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleModify = () => {
    if (!selectedDepot) return;
    setModalDepotName(selectedDepot.name);
    setShowModal(true);
  };

  const handleSaveModification = async () => {
    if (!modalDepotName.trim()) {
      alert('Please enter a depot name');
      return;
    }

    if (modalDepotName.trim() === selectedDepot.name) {
      alert('No changes made');
      setShowModal(false);
      return;
    }

    const exists = depots.some(d => d.id !== selectedDepot.id && d.name.toLowerCase() === modalDepotName.trim().toLowerCase());
    if (exists) {
      alert('A depot with this name already exists');
      return;
    }

    setLoading(true);
    const { error } = await storageManager
      .from('depots')
      .update({ name: modalDepotName.trim() })
      .eq('id', selectedDepot.id);

    if (error) {
      alert('Error updating depot: ' + error.message);
    } else {
      await fetchDepots();
      setDepotInput(modalDepotName.trim());
      onDepotSelect({ ...selectedDepot, name: modalDepotName.trim() });
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedDepot) return;

    if (!confirm(`Are you sure you want to delete "${selectedDepot.name}"?`)) return;

    setLoading(true);
    const { error } = await storageManager
      .from('depots')
      .delete()
      .eq('id', selectedDepot.id);

    if (error) {
      alert('Error deleting depot: ' + error.message);
    } else {
      await fetchDepots();
      onDepotSelect(null);
      setDepotInput('');
    }
    setLoading(false);
  };

  return (
    <div className="form-section">
      <h3>1. Depot Name</h3>

      <div className="depot-unified-container">
        <div className="depot-input-wrapper">
          <input
            type="text"
            value={depotInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            placeholder="Type to search or add new depot"
            className="depot-unified-input"
            autoComplete="off"
          />

          {showDropdown && filteredDepots.length > 0 && (
            <div className="depot-dropdown">
              {filteredDepots.map(depot => (
                <div
                  key={depot.id}
                  className={`depot-dropdown-item ${selectedDepot?.id === depot.id ? 'selected' : ''}`}
                  onClick={() => handleSelect(depot)}
                >
                  {depot.name}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="depot-actions-unified">
          {selectedDepot ? (
            <>
              <button
                type="button"
                onClick={handleModify}
                disabled={loading}
                className="btn-modify"
                title="Modify selected depot"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="btn-delete"
                title="Delete selected depot"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !depotInput.trim()}
              className="btn-add-new"
              title="Add new depot"
            >
              Add New
            </button>
          )}
        </div>
      </div>

      {selectedDepot && (
        <div className="selected-depot-info">
          <span className="info-label">Selected:</span>
          <span className="info-value">{selectedDepot.name}</span>
        </div>
      )}

      <ModifyModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Modify Depot"
        fields={[
          {
            label: 'Depot Name:',
            value: modalDepotName,
            onChange: setModalDepotName,
            placeholder: 'Enter depot name'
          }
        ]}
        onSave={handleSaveModification}
        loading={loading}
      />
    </div>
  );
}
