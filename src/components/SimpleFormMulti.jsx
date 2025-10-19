'use client';

import { useState } from 'react';
import storageManager from '../lib/storage/storageManager';
import DepotSection from './DepotSection';
import OperatorSectionMulti from './OperatorSectionMulti';
import BusTypeSectionMulti from './BusTypeSectionMulti';
import RouteSectionMulti from './RouteSectionMulti';
import ScheduleTypeSectionMulti from './ScheduleTypeSectionMulti';

export default function SimpleFormMulti() {
  // Single fields
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  
  // Multi fields (arrays)
  const [operators, setOperators] = useState([]);
  const [busTypes, setBusTypes] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [scheduleTypes, setScheduleTypes] = useState([]);
  
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!selectedDepot) return 'Please select a depot';
    if (!scheduleDate) return 'Please select a date';
    if (operators.length === 0) return 'Please add at least one operator';
    if (busTypes.length === 0) return 'Please add at least one bus type';
    if (routes.length === 0) return 'Please add at least one route';
    if (scheduleTypes.length === 0) return 'Please add at least one schedule type';
    return null;
  };

  const formatScheduleTypeData = (scheduleType) => {
    const formatValue = (value) => {
      return (value === '' || value === null || value === undefined) ? '-' : value;
    };

    const isMonSat = scheduleType.mainType === 'Mon to Sat';

    return {
      mon_sat_am: isMonSat ? formatValue(scheduleType.buses.am) : '-',
      mon_sat_noon: isMonSat ? formatValue(scheduleType.buses.noon) : '-',
      mon_sat_pm: isMonSat ? formatValue(scheduleType.buses.pm) : '-',
      duties_driver_ms: isMonSat ? formatValue(scheduleType.duties.drivers) : '-',
      duties_cond_ms: isMonSat ? formatValue(scheduleType.duties.conductors) : '-',
      sun_am: !isMonSat ? formatValue(scheduleType.buses.am) : '-',
      sun_noon: !isMonSat ? formatValue(scheduleType.buses.noon) : '-',
      sun_pm: !isMonSat ? formatValue(scheduleType.buses.pm) : '-',
      duties_driver_sun: !isMonSat ? formatValue(scheduleType.duties.drivers) : '-',
      duties_cond_sun: !isMonSat ? formatValue(scheduleType.duties.conductors) : '-'
    };
  };

  const generateEntries = (scheduleId) => {
    const entries = [];

    // Generate Cartesian product of all multi-input fields
    operators.forEach(operator => {
      busTypes.forEach(busType => {
        routes.forEach(route => {
          scheduleTypes.forEach(scheduleType => {
            entries.push({
              schedule_id: scheduleId,
              operator_id: operator.id,
              bus_type_id: busType.id,
              route_id: route.id,
              ...formatScheduleTypeData(scheduleType)
            });
          });
        });
      });
    });

    return entries;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    // Calculate total entries
    const totalEntries = operators.length * busTypes.length * routes.length * scheduleTypes.length;

    // Warn for large batches
    if (totalEntries > 50) {
      if (!confirm(`This will create ${totalEntries} schedule entries. Do you want to continue?`)) {
        return;
      }
    }

    setLoading(true);

    try {
      // Check if schedule exists for this depot and date
      const { data: existingSchedule, error: scheduleCheckError } = await storageManager
        .from('schedules')
        .select('id')
        .eq('depot_id', selectedDepot.id)
        .eq('schedule_date', scheduleDate)
        .single();

      let scheduleId;

      if (scheduleCheckError && scheduleCheckError.code !== 'PGRST116') {
        throw scheduleCheckError;
      }

      if (existingSchedule) {
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

      // Generate all entry combinations
      const entries = generateEntries(scheduleId);

      // Batch insert with chunking for large datasets
      const CHUNK_SIZE = 50;
      for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = entries.slice(i, i + CHUNK_SIZE);
        const { error: entryError } = await storageManager
          .from('schedule_entries')
          .insert(chunk);

        if (entryError) throw entryError;
      }

      alert(`Successfully created ${totalEntries} schedule entries!`);
      
      // Reset form (keep depot and date for convenience)
      setOperators([]);
      setBusTypes([]);
      setRoutes([]);
      setScheduleTypes([]);

    } catch (error) {
      console.error('Error saving schedule entries:', error);
      alert('Error saving schedule entries: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotalEntries = () => {
    return operators.length * busTypes.length * routes.length * scheduleTypes.length;
  };

  return (
    <div className="simple-form-container">
      <h2>Schedule Entry Form (Multi-Input Mode)</h2>
      <p className="form-description">
        Add multiple operators, bus types, routes, and schedule types. 
        The system will automatically create all combinations.
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

        {/* Operator Section (Multi) */}
        <OperatorSectionMulti 
          operators={operators}
          onOperatorsChange={setOperators}
        />

        {/* Bus Type Section (Multi) */}
        <BusTypeSectionMulti 
          busTypes={busTypes}
          onBusTypesChange={setBusTypes}
        />

        {/* Route Section (Multi) */}
        <RouteSectionMulti 
          routes={routes}
          onRoutesChange={setRoutes}
        />

        {/* Schedule Type Section (Multi) */}
        <ScheduleTypeSectionMulti 
          scheduleTypes={scheduleTypes}
          onScheduleTypesChange={setScheduleTypes}
        />

        {/* Entry Counter */}
        {getTotalEntries() > 0 && (
          <div className="entry-counter">
            <div className="counter-content">
              <span className="counter-label">Total Entries to Create:</span>
              <span className="counter-value">{getTotalEntries()}</span>
            </div>
            <div className="counter-breakdown">
              {operators.length} operator(s) × {busTypes.length} bus type(s) × {routes.length} route(s) × {scheduleTypes.length} schedule type(s)
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={loading || getTotalEntries() === 0}
            className="btn-submit"
          >
            {loading ? 'Submitting...' : `Submit (Create ${getTotalEntries()} Entries)`}
          </button>
        </div>
      </form>
    </div>
  );
}
