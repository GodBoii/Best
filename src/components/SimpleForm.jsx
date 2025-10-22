'use client';

import { useState } from 'react';
import storageManager from '../lib/storage/storageManager';
import DepotSection from './DepotSection';
import OperatorSection from './OperatorSection';
import ScheduleTypeSection from './ScheduleTypeSection';
import BusTypeSection from './BusTypeSection';
import RouteSection from './RouteSection';

export default function SimpleForm() {
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
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
      alert('Please select a schedule type');
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

      // Determine if it's Mon-Sat or Sunday schedule
      const isMonSat = selectedScheduleType.mainType === 'Mon to Sat';

      // Prepare schedule entry data based on schedule type
      const scheduleEntryData = {
        route_id: selectedRoute.id,
        bus_type_id: selectedBusType.id,
        operator_id: selectedOperator.id,
        // Mon-Sat columns
        mon_sat_am: isMonSat ? formatValue(selectedScheduleType.buses.am) : '-',
        mon_sat_noon: isMonSat ? formatValue(selectedScheduleType.buses.noon) : '-',
        mon_sat_pm: isMonSat ? formatValue(selectedScheduleType.buses.pm) : '-',
        duties_driver_ms: isMonSat ? formatValue(selectedScheduleType.duties.drivers) : '-',
        duties_cond_ms: isMonSat ? formatValue(selectedScheduleType.duties.conductors) : '-',
        // Sunday columns
        sun_am: !isMonSat ? formatValue(selectedScheduleType.buses.am) : '-',
        sun_noon: !isMonSat ? formatValue(selectedScheduleType.buses.noon) : '-',
        sun_pm: !isMonSat ? formatValue(selectedScheduleType.buses.pm) : '-',
        duties_driver_sun: !isMonSat ? formatValue(selectedScheduleType.duties.drivers) : '-',
        duties_cond_sun: !isMonSat ? formatValue(selectedScheduleType.duties.conductors) : '-'
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
      const { error: entryError } = await storageManager
        .from('schedule_entries')
        .insert([{
          schedule_id: scheduleId,
          ...scheduleEntryData
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
