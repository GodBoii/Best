'use client';

import { useState } from 'react';
import storageManager from '../lib/storage/storageManager';
import DepotSection from './DepotSection';
import OperatorSection from './OperatorSection';
import ScheduleTypeSection from './ScheduleTypeSection';
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
  const [selectedScheduleType, setSelectedScheduleType] = useState(null);
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

    if (!selectedScheduleType) {
      alert('Please enter schedule data');
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
      // Helper function to convert empty/null values to dash
      const formatValue = (value) => {
        return (value === '' || value === null || value === undefined) ? '-' : value;
      };

      // Prepare schedule entry data with both Mon-Sat and Sunday values
      const scheduleEntryData = {
        route_id: selectedRoute.id,
        bus_type_id: selectedBusType.id,
        operator_id: selectedOperator.id,
        // Mon-Sat columns
        mon_sat_am: formatValue(selectedScheduleType.monSat.buses.am),
        mon_sat_noon: formatValue(selectedScheduleType.monSat.buses.noon),
        mon_sat_pm: formatValue(selectedScheduleType.monSat.buses.pm),
        duties_driver_ms: formatValue(selectedScheduleType.monSat.duties.drivers),
        duties_cond_ms: formatValue(selectedScheduleType.monSat.duties.conductors),
        // Sunday columns
        sun_am: formatValue(selectedScheduleType.sunday.buses.am),
        sun_noon: formatValue(selectedScheduleType.sunday.buses.noon),
        sun_pm: formatValue(selectedScheduleType.sunday.buses.pm),
        duties_driver_sun: formatValue(selectedScheduleType.sunday.duties.drivers),
        duties_cond_sun: formatValue(selectedScheduleType.sunday.duties.conductors)
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

        {/* Schedule Type Section */}
        <ScheduleTypeSection 
          onScheduleTypeSelect={setSelectedScheduleType}
          selectedScheduleType={selectedScheduleType}
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
