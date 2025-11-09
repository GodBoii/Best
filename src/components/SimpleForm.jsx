'use client';

import { useState } from 'react';
import storageManager from '../lib/storage/storageManager';
import DepotSection from './DepotSection';
import OperatorSection from './OperatorSection';
import BusTypeSection from './BusTypeSection';
import RouteSection from './RouteSection';

export default function SimpleForm() {
  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDepot, setSelectedDepot] = useState(null);
  const [scheduleDate, setScheduleDate] = useState(getCurrentDate());
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedBusType, setSelectedBusType] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDepot) {
      alert('Please select a depot');
      return;
    }

    if (!scheduleDate) {
      alert('Please select a date');
      return;
    }

    if (!selectedOperator) {
      alert('Please select an operator');
      return;
    }

    if (!selectedBusType) {
      alert('Please select a bus type');
      return;
    }

    if (!selectedRoute) {
      alert('Please select a route');
      return;
    }

    setLoading(true);

    try {
      // Prepare schedule entry data with default dash values
      // Schedule modifications will handle the actual schedule data
      const scheduleEntryData = {
        route_id: selectedRoute.id,
        bus_type_id: selectedBusType.id,
        operator_id: selectedOperator.id,
        // Default values - to be modified in Schedule Modifications
        mon_sat_am: '-',
        mon_sat_noon: '-',
        mon_sat_pm: '-',
        duties_driver_ms: '-',
        duties_cond_ms: '-',
        sun_am: '-',
        sun_noon: '-',
        sun_pm: '-',
        duties_driver_sun: '-',
        duties_cond_sun: '-'
      };

      // First, check if a schedule exists for this depot and date
      const { data: existingSchedule, error: scheduleCheckError } = await storageManager
        .from('schedules')
        .select('id')
        .eq('depot_id', selectedDepot.id)
        .eq('schedule_date', scheduleDate)
        .single();

      let scheduleId;

      if (scheduleCheckError && scheduleCheckError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if no schedule exists
        throw scheduleCheckError;
      }

      if (existingSchedule) {
        // Use existing schedule
        scheduleId = existingSchedule.id;
      } else {
        // Create new schedule
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

      // Now insert the schedule entry
      const currentTimestamp = new Date().toISOString();
      const { error: entryError } = await storageManager
        .from('schedule_entries')
        .insert([{
          schedule_id: scheduleId,
          ...scheduleEntryData,
          is_deleted: false,
          deleted_at: null,
          created_at: currentTimestamp,
          modified_at: currentTimestamp
        }]);

      if (entryError) throw entryError;

      alert('Schedule entry saved successfully!');

      // Keep form values for next entry - user can modify as needed

    } catch (error) {
      console.error('Error saving schedule entry:', error);
      alert('Error saving schedule entry: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="simple-form-container">
      <h2>Schedule Entry Form</h2>
      <p className="form-description" style={{ marginBottom: '20px', color: '#666' }}>
        Create a new schedule entry. Schedule data (buses and duties) will be added in Schedule Modifications.
      </p>

      <form onSubmit={handleSubmit} className="simple-form">
        {/* Depot Section */}
        <DepotSection
          onDepotSelect={setSelectedDepot}
          selectedDepot={selectedDepot}
        />

        {/* Date Section */}
        <div className="form-section">
          <h3>2. Date</h3>
          <input
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
            required
            className="date-input"
          />
        </div>

        {/* Operator Section */}
        <OperatorSection
          onOperatorSelect={setSelectedOperator}
          selectedOperator={selectedOperator}
        />

        {/* Bus Type Section */}
        <BusTypeSection
          onBusTypeSelect={setSelectedBusType}
          selectedBusType={selectedBusType}
        />

        {/* Route Section */}
        <RouteSection
          onRouteSelect={setSelectedRoute}
          selectedRoute={selectedRoute}
        />

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading}
            className="btn-submit"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}
