'use client';

import { useState, useEffect } from 'react';

export default function ScheduleTypeSection({ onScheduleTypeSelect, selectedScheduleType }) {
  const [selectedMainType, setSelectedMainType] = useState(selectedScheduleType?.mainType || null);
  
  // Buses inputs - separate for AM, NOON, PM
  const [busesAM, setBusesAM] = useState(selectedScheduleType?.buses?.am || '');
  const [busesNoon, setBusesNoon] = useState(selectedScheduleType?.buses?.noon || '');
  const [busesPM, setBusesPM] = useState(selectedScheduleType?.buses?.pm || '');
  
  // Duties inputs
  const [dutiesDrivers, setDutiesDrivers] = useState(selectedScheduleType?.duties?.drivers || '');
  const [dutiesConductors, setDutiesConductors] = useState(selectedScheduleType?.duties?.conductors || '');
  const [conductorManuallyEdited, setConductorManuallyEdited] = useState(false);

  useEffect(() => {
    if (selectedMainType) {
      const scheduleData = {
        mainType: selectedMainType,
        buses: {
          am: busesAM,
          noon: busesNoon,
          pm: busesPM
        },
        duties: {
          drivers: dutiesDrivers,
          conductors: dutiesConductors
        }
      };
      onScheduleTypeSelect(scheduleData);
    }
  }, [selectedMainType, busesAM, busesNoon, busesPM, dutiesDrivers, dutiesConductors]);

  const handleMainTypeSelect = (type) => {
    setSelectedMainType(type);
  };

  const handleNumberInput = (value, setter) => {
    // Only allow numbers and max 2 digits
    if (value === '' || (/^\d{1,2}$/.test(value) && parseInt(value) >= 0)) {
      setter(value);
    }
  };

  const handleDriversChange = (value) => {
    handleNumberInput(value, setDutiesDrivers);
    // Auto-copy to conductors if not manually edited
    if (!conductorManuallyEdited) {
      setDutiesConductors(value);
    }
  };

  const handleConductorsChange = (value) => {
    handleNumberInput(value, setDutiesConductors);
    // Mark as manually edited
    setConductorManuallyEdited(true);
  };

  return (
    <div className="form-section">
      <h3>4. Schedule Type</h3>

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
          </div>
        )}

        {/* Selected Info */}
        {selectedScheduleType && selectedMainType && (
          <div className="selected-schedule-type-info">
            <span className="info-label">Selected:</span>
            <span className="info-value">
              {selectedMainType} - Buses: {busesAM || 0}/{busesNoon || 0}/{busesPM || 0} | Duties: Drivers:{dutiesDrivers || 0} Conductors:{dutiesConductors || 0}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
