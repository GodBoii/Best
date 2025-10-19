'use client';

import { useState, useEffect } from 'react';
import MultiInputWrapper from './MultiInputWrapper';

export default function ScheduleTypeSectionMulti({ scheduleTypes = [], onScheduleTypesChange }) {
  // Current input state (for adding new schedule type)
  const [selectedMainType, setSelectedMainType] = useState(null);
  const [busesAM, setBusesAM] = useState('');
  const [busesNoon, setBusesNoon] = useState('');
  const [busesPM, setBusesPM] = useState('');
  const [dutiesDrivers, setDutiesDrivers] = useState('');
  const [dutiesConductors, setDutiesConductors] = useState('');
  const [conductorManuallyEdited, setConductorManuallyEdited] = useState(false);

  const handleMainTypeSelect = (type) => {
    setSelectedMainType(type);
  };

  const handleNumberInput = (value, setter) => {
    if (value === '' || (/^\d{1,2}$/.test(value) && parseInt(value) >= 0)) {
      setter(value);
    }
  };

  const handleDriversChange = (value) => {
    handleNumberInput(value, setDutiesDrivers);
    if (!conductorManuallyEdited) {
      setDutiesConductors(value);
    }
  };

  const handleConductorsChange = (value) => {
    handleNumberInput(value, setDutiesConductors);
    setConductorManuallyEdited(true);
  };

  const handleAddScheduleType = () => {
    if (!selectedMainType) {
      alert('Please select a schedule type (Mon to Sat or Sunday)');
      return;
    }

    const newScheduleType = {
      mainType: selectedMainType,
      buses: {
        am: busesAM || '0',
        noon: busesNoon || '0',
        pm: busesPM || '0'
      },
      duties: {
        drivers: dutiesDrivers || '0',
        conductors: dutiesConductors || '0'
      }
    };

    onScheduleTypesChange([...scheduleTypes, newScheduleType]);

    // Reset inputs
    setSelectedMainType(null);
    setBusesAM('');
    setBusesNoon('');
    setBusesPM('');
    setDutiesDrivers('');
    setDutiesConductors('');
    setConductorManuallyEdited(false);
  };

  const handleRemove = (index) => {
    onScheduleTypesChange(scheduleTypes.filter((_, i) => i !== index));
  };

  const renderScheduleTypeItem = (item) => {
    return (
      <div className="schedule-type-display">
        <span className="schedule-type-main">
          <strong>{item.mainType}</strong>
        </span>
        <span className="schedule-type-details">
          Buses: {item.buses.am}/{item.buses.noon}/{item.buses.pm} | 
          Duties: D:{item.duties.drivers} C:{item.duties.conductors}
        </span>
      </div>
    );
  };

  return (
    <MultiInputWrapper
      title="Schedule Type"
      sectionNumber="6"
      items={scheduleTypes}
      onRemove={handleRemove}
      renderItem={renderScheduleTypeItem}
    >
      <div className="schedule-type-container">
        {/* Main Type Selection */}
        <div className="schedule-main-types">
          <label className="schedule-type-label">Select Schedule Type: <span className="required">*</span></label>
          <div className="schedule-type-buttons">
            <button
              type="button"
              onClick={() => handleMainTypeSelect('Mon to Sat')}
              className={`schedule-type-btn ${selectedMainType === 'Mon to Sat' ? 'active' : ''}`}
            >
              Mon to Sat
            </button>
            <button
              type="button"
              onClick={() => handleMainTypeSelect('Sunday')}
              className={`schedule-type-btn ${selectedMainType === 'Sunday' ? 'active' : ''}`}
            >
              Sunday
            </button>
          </div>
        </div>

        {/* Buses and Duties Inputs */}
        {selectedMainType && (
          <div className="schedule-inputs-container">
            {/* Buses Section */}
            <div className="schedule-input-group">
              <label className="schedule-input-label">Buses (AM, NOON, PM):</label>
              <div className="schedule-input-row">
                <div className="schedule-input-field">
                  <label className="schedule-field-label">AM</label>
                  <input
                    type="text"
                    value={busesAM}
                    onChange={(e) => handleNumberInput(e.target.value, setBusesAM)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">NOON</label>
                  <input
                    type="text"
                    value={busesNoon}
                    onChange={(e) => handleNumberInput(e.target.value, setBusesNoon)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">PM</label>
                  <input
                    type="text"
                    value={busesPM}
                    onChange={(e) => handleNumberInput(e.target.value, setBusesPM)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
              </div>
            </div>

            {/* Duties Section */}
            <div className="schedule-input-group">
              <label className="schedule-input-label">Duties:</label>
              <div className="schedule-input-row">
                <div className="schedule-input-field">
                  <label className="schedule-field-label">Drivers</label>
                  <input
                    type="text"
                    value={dutiesDrivers}
                    onChange={(e) => handleDriversChange(e.target.value)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">Conductors</label>
                  <input
                    type="text"
                    value={dutiesConductors}
                    onChange={(e) => handleConductorsChange(e.target.value)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
              </div>
            </div>

            {/* Add Button */}
            <div className="schedule-add-button-container">
              <button
                type="button"
                onClick={handleAddScheduleType}
                className="btn-add-multi"
              >
                + Add This Schedule Type
              </button>
            </div>
          </div>
        )}
      </div>
    </MultiInputWrapper>
  );
}
