'use client';

import { useState, useEffect } from 'react';

export default function ScheduleTypeSection({ onScheduleTypeSelect, selectedScheduleType }) {
  // Mon-Sat inputs
  const [monSatBusesAM, setMonSatBusesAM] = useState(selectedScheduleType?.monSat?.buses?.am || '');
  const [monSatBusesNoon, setMonSatBusesNoon] = useState(selectedScheduleType?.monSat?.buses?.noon || '');
  const [monSatBusesPM, setMonSatBusesPM] = useState(selectedScheduleType?.monSat?.buses?.pm || '');
  const [monSatDutiesDrivers, setMonSatDutiesDrivers] = useState(selectedScheduleType?.monSat?.duties?.drivers || '');
  const [monSatDutiesConductors, setMonSatDutiesConductors] = useState(selectedScheduleType?.monSat?.duties?.conductors || '');
  const [monSatConductorManuallyEdited, setMonSatConductorManuallyEdited] = useState(false);

  // Sunday inputs
  const [sundayBusesAM, setSundayBusesAM] = useState(selectedScheduleType?.sunday?.buses?.am || '');
  const [sundayBusesNoon, setSundayBusesNoon] = useState(selectedScheduleType?.sunday?.buses?.noon || '');
  const [sundayBusesPM, setSundayBusesPM] = useState(selectedScheduleType?.sunday?.buses?.pm || '');
  const [sundayDutiesDrivers, setSundayDutiesDrivers] = useState(selectedScheduleType?.sunday?.duties?.drivers || '');
  const [sundayDutiesConductors, setSundayDutiesConductors] = useState(selectedScheduleType?.sunday?.duties?.conductors || '');
  const [sundayConductorManuallyEdited, setSundayConductorManuallyEdited] = useState(false);

  useEffect(() => {
    const scheduleData = {
      monSat: {
        buses: {
          am: monSatBusesAM,
          noon: monSatBusesNoon,
          pm: monSatBusesPM
        },
        duties: {
          drivers: monSatDutiesDrivers,
          conductors: monSatDutiesConductors
        }
      },
      sunday: {
        buses: {
          am: sundayBusesAM,
          noon: sundayBusesNoon,
          pm: sundayBusesPM
        },
        duties: {
          drivers: sundayDutiesDrivers,
          conductors: sundayDutiesConductors
        }
      }
    };
    onScheduleTypeSelect(scheduleData);
  }, [
    monSatBusesAM, monSatBusesNoon, monSatBusesPM, monSatDutiesDrivers, monSatDutiesConductors,
    sundayBusesAM, sundayBusesNoon, sundayBusesPM, sundayDutiesDrivers, sundayDutiesConductors
  ]);

  const handleNumberInput = (value, setter) => {
    // Only allow numbers and max 2 digits
    if (value === '' || (/^\d{1,2}$/.test(value) && parseInt(value) >= 0)) {
      setter(value);
    }
  };

  const handleMonSatDriversChange = (value) => {
    handleNumberInput(value, setMonSatDutiesDrivers);
    // Auto-copy to conductors if not manually edited
    if (!monSatConductorManuallyEdited) {
      setMonSatDutiesConductors(value);
    }
  };

  const handleMonSatConductorsChange = (value) => {
    handleNumberInput(value, setMonSatDutiesConductors);
    // Mark as manually edited
    setMonSatConductorManuallyEdited(true);
  };

  const handleSundayDriversChange = (value) => {
    handleNumberInput(value, setSundayDutiesDrivers);
    // Auto-copy to conductors if not manually edited
    if (!sundayConductorManuallyEdited) {
      setSundayDutiesConductors(value);
    }
  };

  const handleSundayConductorsChange = (value) => {
    handleNumberInput(value, setSundayDutiesConductors);
    // Mark as manually edited
    setSundayConductorManuallyEdited(true);
  };

  return (
    <div className="form-section">
      <h3>4. Schedule Type</h3>
      <p className="form-description" style={{ marginBottom: '15px', color: '#666' }}>
        Enter schedule data for both Mon-Sat and Sunday. Leave fields empty or 0 if not applicable.
      </p>

      <div className="schedule-type-container">
        {/* Mon-Sat Section */}
        <div className="schedule-section-card">
          <div className="schedule-section-header">
            <span className="schedule-icon">📅</span>
            <h4>Monday to Saturday</h4>
          </div>

          <div className="schedule-inputs-container">
            {/* Buses Section */}
            <div className="schedule-input-group">
              <label className="schedule-input-label">Buses (AM, NOON, PM):</label>
              <div className="schedule-input-row">
                <div className="schedule-input-field">
                  <label className="schedule-field-label">AM</label>
                  <input
                    type="text"
                    value={monSatBusesAM}
                    onChange={(e) => handleNumberInput(e.target.value, setMonSatBusesAM)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">NOON</label>
                  <input
                    type="text"
                    value={monSatBusesNoon}
                    onChange={(e) => handleNumberInput(e.target.value, setMonSatBusesNoon)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">PM</label>
                  <input
                    type="text"
                    value={monSatBusesPM}
                    onChange={(e) => handleNumberInput(e.target.value, setMonSatBusesPM)}
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
                    value={monSatDutiesDrivers}
                    onChange={(e) => handleMonSatDriversChange(e.target.value)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">Conductors</label>
                  <input
                    type="text"
                    value={monSatDutiesConductors}
                    onChange={(e) => handleMonSatConductorsChange(e.target.value)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sunday Section */}
        <div className="schedule-section-card">
          <div className="schedule-section-header">
            <span className="schedule-icon">☀️</span>
            <h4>Sunday</h4>
          </div>

          <div className="schedule-inputs-container">
            {/* Buses Section */}
            <div className="schedule-input-group">
              <label className="schedule-input-label">Buses (AM, NOON, PM):</label>
              <div className="schedule-input-row">
                <div className="schedule-input-field">
                  <label className="schedule-field-label">AM</label>
                  <input
                    type="text"
                    value={sundayBusesAM}
                    onChange={(e) => handleNumberInput(e.target.value, setSundayBusesAM)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">NOON</label>
                  <input
                    type="text"
                    value={sundayBusesNoon}
                    onChange={(e) => handleNumberInput(e.target.value, setSundayBusesNoon)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">PM</label>
                  <input
                    type="text"
                    value={sundayBusesPM}
                    onChange={(e) => handleNumberInput(e.target.value, setSundayBusesPM)}
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
                    value={sundayDutiesDrivers}
                    onChange={(e) => handleSundayDriversChange(e.target.value)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
                <div className="schedule-input-field">
                  <label className="schedule-field-label">Conductors</label>
                  <input
                    type="text"
                    value={sundayDutiesConductors}
                    onChange={(e) => handleSundayConductorsChange(e.target.value)}
                    placeholder="0"
                    maxLength={2}
                    className="schedule-number-input"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
