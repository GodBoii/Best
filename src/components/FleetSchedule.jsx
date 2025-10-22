'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import DatabaseVersionChecker from './DatabaseVersionChecker';
import DataBackupUtility from './DataBackupUtility';
import '../styles/fleet.css';

export default function FleetSchedule() {
  const [depots, setDepots] = useState([]);
  const [operators, setOperators] = useState([]);
  const [busTypes, setBusTypes] = useState([]);

  const [selectedDepot, setSelectedDepot] = useState('');
  const [depotNumber, setDepotNumber] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [selectedBusType, setSelectedBusType] = useState('');
  const [fleet, setFleet] = useState('');

  const [fleetEntries, setFleetEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (selectedDepot && selectedDate) {
      fetchFleetEntries();
    }
  }, [selectedDepot, selectedDate]);

  const fetchData = async () => {
    try {
      const client = storageManager.getClient();

      const [depotsRes, operatorsRes, busTypesRes] = await Promise.all([
        client.from('depots').select('*').order('name'),
        client.from('operators').select('*').order('name'),
        client.from('bus_types').select('*').order('name')
      ]);

      if (depotsRes.data) setDepots(depotsRes.data);
      if (operatorsRes.data) setOperators(operatorsRes.data);
      if (busTypesRes.data) setBusTypes(busTypesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error loading data: ' + error.message);
    }
  };

  const fetchFleetEntries = async () => {
    try {
      const client = storageManager.getClient();
      const { data, error } = await client
        .from('fleet_entries')
        .select(`
          *,
          depots (id, name, display_order),
          operators (id, name, short_code),
          bus_types (id, name, short_name)
        `)
        .eq('depot_id', selectedDepot)
        .eq('schedule_date', selectedDate)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching fleet entries:', error);
        setFleetEntries([]);
        return;
      }

      if (!data || data.length === 0) {
        setFleetEntries([]);
        return;
      }

      const entries = data.map(entry => ({
        id: entry.id,
        depot: entry.depots || { id: entry.depot_id, name: 'Unknown', display_order: 0 },
        depotNumber: entry.depots?.display_order || '',
        date: entry.schedule_date,
        operator: entry.operators || { id: entry.operator_id, name: 'Unknown' },
        busType: entry.bus_types || { id: entry.bus_type_id, name: 'Unknown' },
        fleet: entry.fleet_number
      }));

      setFleetEntries(entries);
    } catch (error) {
      console.error('Error fetching fleet entries:', error);
      setFleetEntries([]);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedDepot || !selectedDate || !selectedOperator || !selectedBusType || !fleet) {
      alert('Please fill in all required fields');
      return;
    }

    const fleetNum = parseInt(fleet);
    if (isNaN(fleetNum) || fleetNum < 0 || fleetNum > 9999) {
      alert('Fleet must be a number between 0 and 9999');
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();

      // Save to database
      const { data, error } = await client
        .from('fleet_entries')
        .insert([{
          depot_id: selectedDepot,
          schedule_date: selectedDate,
          operator_id: selectedOperator,
          bus_type_id: selectedBusType,
          fleet_number: fleetNum
        }])
        .select(`
          *,
          depots (id, name, display_order),
          operators (id, name, short_code),
          bus_types (id, name, short_name)
        `)
        .single();

      if (error) throw error;

      // Add to local state with fallback values
      const newEntry = {
        id: data.id,
        depot: data.depots || { id: data.depot_id, name: depots.find(d => d.id === selectedDepot)?.name || 'Unknown', display_order: 0 },
        depotNumber: data.depots?.display_order || depotNumber || '',
        date: data.schedule_date,
        operator: data.operators || { id: data.operator_id, name: operators.find(o => o.id === selectedOperator)?.name || 'Unknown' },
        busType: data.bus_types || { id: data.bus_type_id, name: busTypes.find(bt => bt.id === selectedBusType)?.name || 'Unknown' },
        fleet: data.fleet_number
      };

      setFleetEntries([...fleetEntries, newEntry]);

      // Reset form
      setFleet('');
      alert('Fleet entry added successfully');
    } catch (error) {
      console.error('Error adding fleet entry:', error);
      alert('Error adding fleet entry: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEntry = async (id) => {
    if (!confirm('Are you sure you want to remove this fleet entry?')) return;

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { error } = await client
        .from('fleet_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setFleetEntries(fleetEntries.filter(entry => entry.id !== id));
      alert('Fleet entry removed successfully');
    } catch (error) {
      console.error('Error removing fleet entry:', error);
      alert('Error removing fleet entry: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDepotNumber = async () => {
    if (!selectedDepot || !depotNumber) {
      alert('Please select a depot and enter a depot number');
      return;
    }

    const depotNum = parseInt(depotNumber);
    if (isNaN(depotNum) || depotNum < 0) {
      alert('Depot number must be a positive number');
      return;
    }

    setIsLoading(true);
    try {
      const client = storageManager.getClient();
      const { error } = await client
        .from('depots')
        .update({ display_order: depotNum })
        .eq('id', selectedDepot);

      if (error) throw error;

      alert('Depot number saved successfully');
      await fetchData();
    } catch (error) {
      console.error('Error saving depot number:', error);
      alert('Error saving depot number: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedDepotData = depots.find(d => d.id === selectedDepot);

  return (
    <>
      <DatabaseVersionChecker />
      <div className="fleet-schedule-container">
        <div className="fleet-header">
          <h2>FLEET Schedule Management</h2>
        </div>

        <div className="fleet-form">
          <div className="form-section">
            <h3>1. Depot Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Depot Name: <span className="required">*</span></label>
                <select
                  value={selectedDepot}
                  onChange={(e) => {
                    setSelectedDepot(e.target.value);
                    const depot = depots.find(d => d.id === e.target.value);
                    setDepotNumber(depot?.display_order?.toString() || '');
                  }}
                  className="form-select"
                >
                  <option value="">Select Depot</option>
                  {depots.map(depot => (
                    <option key={depot.id} value={depot.id}>
                      {depot.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Depot Serial Number (for Summary Report):
                  <span className="info-text"> (Position in report)</span>
                </label>
                <div className="depot-number-group">
                  <input
                    type="number"
                    value={depotNumber}
                    onChange={(e) => setDepotNumber(e.target.value)}
                    placeholder={selectedDepotData?.display_order ? `Current: ${selectedDepotData.display_order}` : "Enter serial number"}
                    className="form-input"
                    min="0"
                    disabled={!selectedDepot}
                  />
                  <button
                    onClick={handleSaveDepotNumber}
                    disabled={isLoading || !selectedDepot || !depotNumber}
                    className="btn-save-depot-num"
                    title={selectedDepotData?.display_order ? "Update serial number" : "Save serial number"}
                  >
                    {isLoading ? 'Saving...' : (selectedDepotData?.display_order ? 'Update' : 'Save')}
                  </button>
                </div>
                {selectedDepotData?.display_order > 0 && (
                  <span className="current-value">
                    ✓ Current serial number: {selectedDepotData.display_order}
                  </span>
                )}
                {!selectedDepotData?.display_order && selectedDepot && (
                  <span className="info-text-small">
                    No serial number set for this depot
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>2. Schedule Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Date: <span className="required">*</span></label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Operator: <span className="required">*</span></label>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Operator</option>
                  {operators.map(operator => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Bus Type: <span className="required">*</span></label>
                <select
                  value={selectedBusType}
                  onChange={(e) => setSelectedBusType(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select Bus Type</option>
                  {busTypes.map(busType => (
                    <option key={busType.id} value={busType.id}>
                      {busType.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>
                  Fleet: <span className="required">*</span>
                  <span className="info-text"> (Max 4 digits)</span>
                </label>
                <input
                  type="number"
                  value={fleet}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (parseInt(val) >= 0 && parseInt(val) <= 9999)) {
                      setFleet(val);
                    }
                  }}
                  placeholder="0-9999"
                  className="form-input"
                  min="0"
                  max="9999"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                onClick={handleAddEntry}
                className="btn-add-entry"
                disabled={!selectedDepot || !selectedDate || !selectedOperator || !selectedBusType || !fleet}
              >
                + Add Fleet Entry
              </button>
            </div>
          </div>

          {fleetEntries.length > 0 && (
            <div className="form-section">
              <h3>Fleet Entries ({fleetEntries.length})</h3>
              <div className="fleet-entries-list">
                <table className="fleet-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Depot</th>
                      <th>Depot No.</th>
                      <th>Date</th>
                      <th>Operator</th>
                      <th>Bus Type</th>
                      <th>Fleet</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fleetEntries.map((entry, index) => (
                      <tr key={entry.id}>
                        <td>{index + 1}</td>
                        <td>{entry.depot.name}</td>
                        <td>{entry.depotNumber || '-'}</td>
                        <td>{entry.date}</td>
                        <td>{entry.operator.name}</td>
                        <td>{entry.busType.name}</td>
                        <td>{entry.fleet}</td>
                        <td>
                          <button
                            onClick={() => handleRemoveEntry(entry.id)}
                            className="btn-remove"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Data Backup Utility */}
          <DataBackupUtility />
        </div>
      </div>
    </>
  );
}
