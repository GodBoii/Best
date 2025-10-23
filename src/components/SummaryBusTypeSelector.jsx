'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import '../styles/summary-bus-type-selector.css';

export default function SummaryBusTypeSelector() {
  const [busTypes, setBusTypes] = useState([]);
  const [bestSelection, setBestSelection] = useState([]);
  const [wetLeaseSelection, setWetLeaseSelection] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showBestDropdown, setShowBestDropdown] = useState(false);
  const [showWetLeaseDropdown, setShowWetLeaseDropdown] = useState(false);

  useEffect(() => {
    fetchBusTypes();
    loadSavedSelections();
  }, []);

  const fetchBusTypes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await storageManager
        .from('bus_types')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setBusTypes(data || []);
    } catch (error) {
      console.error('Error fetching bus types:', error);
      alert('Error loading bus types: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedSelections = async () => {
    try {
      const { data, error } = await storageManager
        .from('summary_settings')
        .select('*')
        .eq('setting_key', 'bus_type_selections')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading selections:', error);
        return;
      }

      if (data && data.setting_value) {
        const selections = JSON.parse(data.setting_value);
        setBestSelection(selections.best || []);
        setWetLeaseSelection(selections.wetLease || []);
      }
    } catch (error) {
      console.error('Error loading saved selections:', error);
    }
  };

  const handleBestToggle = (busTypeId) => {
    setBestSelection(prev => {
      if (prev.includes(busTypeId)) {
        return prev.filter(id => id !== busTypeId);
      } else {
        return [...prev, busTypeId];
      }
    });
  };

  const handleWetLeaseToggle = (busTypeId) => {
    setWetLeaseSelection(prev => {
      if (prev.includes(busTypeId)) {
        return prev.filter(id => id !== busTypeId);
      } else {
        return [...prev, busTypeId];
      }
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const selections = {
        best: bestSelection,
        wetLease: wetLeaseSelection
      };

      // Check if setting already exists
      const { data: existing, error: checkError } = await storageManager
        .from('summary_settings')
        .select('id')
        .eq('setting_key', 'bus_type_selections')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existing) {
        // Update existing
        const { error: updateError } = await storageManager
          .from('summary_settings')
          .update({
            setting_value: JSON.stringify(selections),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) throw updateError;
      } else {
        // Insert new
        const { error: insertError } = await storageManager
          .from('summary_settings')
          .insert([{
            setting_key: 'bus_type_selections',
            setting_value: JSON.stringify(selections),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);

        if (insertError) throw insertError;
      }

      alert('Bus type selections saved successfully!');
    } catch (error) {
      console.error('Error saving selections:', error);
      alert('Error saving selections: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectAllBest = () => {
    setBestSelection(busTypes.map(bt => bt.id));
  };

  const handleDeselectAllBest = () => {
    setBestSelection([]);
  };

  const handleSelectAllWetLease = () => {
    setWetLeaseSelection(busTypes.map(bt => bt.id));
  };

  const handleDeselectAllWetLease = () => {
    setWetLeaseSelection([]);
  };

  const getSelectedBusTypeNames = (selection) => {
    if (selection.length === 0) return 'None selected';
    if (selection.length === busTypes.length) return 'All bus types';
    
    const names = selection
      .map(id => {
        const bt = busTypes.find(b => b.id === id);
        return bt ? (bt.short_name || bt.name) : null;
      })
      .filter(Boolean)
      .join(', ');
    
    return names || 'None selected';
  };

  if (isLoading) {
    return (
      <div className="summary-bus-type-selector">
        <h3>📊 Summary Bus Type Selection</h3>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="summary-bus-type-selector">
      <div className="selector-header">
        <h3>📊 Summary Bus Type Selection</h3>
        <p className="selector-description">
          Select which bus types should appear in the BEST and Wet Lease sections of the Summary Report.
          If no selection is made, all bus types will be shown.
        </p>
      </div>

      <div className="selector-content">
        {/* BEST Section */}
        <div className="selector-section">
          <div className="section-header">
            <h4>BEST Bus Types</h4>
            <div className="quick-actions">
              <button
                type="button"
                onClick={handleSelectAllBest}
                className="btn-quick-action"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllBest}
                className="btn-quick-action"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="dropdown-container">
            <button
              type="button"
              className="dropdown-trigger"
              onClick={() => setShowBestDropdown(!showBestDropdown)}
            >
              <span className="selected-count">
                {bestSelection.length} of {busTypes.length} selected
              </span>
              <span className="dropdown-arrow">{showBestDropdown ? '▲' : '▼'}</span>
            </button>

            <div className="selected-preview">
              {getSelectedBusTypeNames(bestSelection)}
            </div>

            {showBestDropdown && (
              <div className="dropdown-menu">
                {busTypes.map(busType => (
                  <label key={busType.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={bestSelection.includes(busType.id)}
                      onChange={() => handleBestToggle(busType.id)}
                    />
                    <span className="bus-type-name">{busType.name}</span>
                    {busType.short_name && (
                      <span className="bus-type-code">({busType.short_name})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Wet Lease Section */}
        <div className="selector-section">
          <div className="section-header">
            <h4>Wet Lease Bus Types</h4>
            <div className="quick-actions">
              <button
                type="button"
                onClick={handleSelectAllWetLease}
                className="btn-quick-action"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleDeselectAllWetLease}
                className="btn-quick-action"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="dropdown-container">
            <button
              type="button"
              className="dropdown-trigger"
              onClick={() => setShowWetLeaseDropdown(!showWetLeaseDropdown)}
            >
              <span className="selected-count">
                {wetLeaseSelection.length} of {busTypes.length} selected
              </span>
              <span className="dropdown-arrow">{showWetLeaseDropdown ? '▲' : '▼'}</span>
            </button>

            <div className="selected-preview">
              {getSelectedBusTypeNames(wetLeaseSelection)}
            </div>

            {showWetLeaseDropdown && (
              <div className="dropdown-menu">
                {busTypes.map(busType => (
                  <label key={busType.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={wetLeaseSelection.includes(busType.id)}
                      onChange={() => handleWetLeaseToggle(busType.id)}
                    />
                    <span className="bus-type-name">{busType.name}</span>
                    {busType.short_name && (
                      <span className="bus-type-code">({busType.short_name})</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="selector-actions">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="btn-save-selections"
        >
          {isSaving ? 'Saving...' : '💾 Save Selections'}
        </button>
      </div>

      <div className="selector-info">
        <p className="info-note">
          <strong>Note:</strong> These selections only affect the Summary Report display.
          They do not modify the actual schedule data.
        </p>
      </div>
    </div>
  );
}
