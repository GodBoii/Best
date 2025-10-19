'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ModifyModal from './ModifyModal';

export default function RouteSection({ onRouteSelect, selectedRoute }) {
  const [routes, setRoutes] = useState([]);
  const [routeNameInput, setRouteNameInput] = useState('');
  const [routeCodeInput, setRouteCodeInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalRouteName, setModalRouteName] = useState('');
  const [modalRouteCode, setModalRouteCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    // Filter routes based on input
    if (routeNameInput.trim()) {
      const filtered = routes.filter(route =>
        route.name.toLowerCase().includes(routeNameInput.toLowerCase()) ||
        (route.code && route.code.toString().includes(routeNameInput))
      );
      setFilteredRoutes(filtered);
    } else {
      setFilteredRoutes(routes);
    }
  }, [routeNameInput, routes]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.route-input-wrapper') && !event.target.closest('.route-actions-unified')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRoutes = async () => {
    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching routes:', error);
    } else {
      setRoutes(data || []);
    }
  };

  const handleNameInputChange = (value) => {
    setRouteNameInput(value);
    setShowDropdown(true);
    if (selectedRoute && selectedRoute.name !== value) {
      onRouteSelect(null);
      setRouteCodeInput('');
    }
  };

  const handleSelect = (route) => {
    onRouteSelect(route);
    setRouteNameInput(route.name);
    setRouteCodeInput(route.code ? route.code.toString() : '');
    setShowDropdown(false);
  };

  const handleAdd = async () => {
    if (!routeNameInput.trim()) {
      alert('Please enter a route name');
      return;
    }

    const exists = routes.some(r =>
      r.name.toLowerCase() === routeNameInput.trim().toLowerCase()
    );
    if (exists) {
      alert('A route with this name already exists');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('routes')
      .insert([{
        name: routeNameInput.trim(),
        code: routeCodeInput.trim() ? parseInt(routeCodeInput.trim()) : null
      }])
      .select()
      .single();

    if (error) {
      alert('Error adding route: ' + error.message);
    } else {
      await fetchRoutes();
      onRouteSelect(data);
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleModify = () => {
    if (!selectedRoute) return;
    setModalRouteName(selectedRoute.name);
    setModalRouteCode(selectedRoute.code ? selectedRoute.code.toString() : '');
    setShowModal(true);
  };

  const handleSaveModification = async () => {
    if (!modalRouteName.trim()) {
      alert('Please enter a route name');
      return;
    }

    if (modalRouteName.trim() === selectedRoute.name && modalRouteCode.trim() === (selectedRoute.code ? selectedRoute.code.toString() : '')) {
      alert('No changes made');
      setShowModal(false);
      return;
    }

    const exists = routes.some(r =>
      r.id !== selectedRoute.id &&
      r.name.toLowerCase() === modalRouteName.trim().toLowerCase()
    );
    if (exists) {
      alert('A route with this name already exists');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('routes')
      .update({
        name: modalRouteName.trim(),
        code: modalRouteCode.trim() ? parseInt(modalRouteCode.trim()) : null
      })
      .eq('id', selectedRoute.id);

    if (error) {
      alert('Error updating route: ' + error.message);
    } else {
      await fetchRoutes();
      setRouteNameInput(modalRouteName.trim());
      setRouteCodeInput(modalRouteCode.trim());
      onRouteSelect({
        ...selectedRoute,
        name: modalRouteName.trim(),
        code: modalRouteCode.trim() ? parseInt(modalRouteCode.trim()) : null
      });
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedRoute) return;

    if (!confirm(`Are you sure you want to delete "${selectedRoute.name}"?`)) return;

    setLoading(true);
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', selectedRoute.id);

    if (error) {
      alert('Error deleting route: ' + error.message);
    } else {
      await fetchRoutes();
      onRouteSelect(null);
      setRouteNameInput('');
      setRouteCodeInput('');
    }
    setLoading(false);
  };

  const handleCodeInput = (value) => {
    // Only allow numbers and max 4 digits
    if (value === '' || (/^\d{1,4}$/.test(value))) {
      setRouteCodeInput(value);
    }
  };

  return (
    <div className="form-section">
      <h3>6. Route</h3>

      <div className="route-unified-container">
        <div className="route-inputs-row">
          <div className="route-input-wrapper">
            <label>Route Name: <span className="required">*</span></label>
            <input
              type="text"
              value={routeNameInput}
              onChange={(e) => handleNameInputChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type to search or add new route"
              className="route-unified-input"
              autoComplete="off"
            />

            {showDropdown && filteredRoutes.length > 0 && (
              <div className="route-dropdown">
                {filteredRoutes.map(route => (
                  <div
                    key={route.id}
                    className={`route-dropdown-item ${selectedRoute?.id === route.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(route)}
                  >
                    <span className="route-name">{route.name}</span>
                    {route.code && <span className="route-code">({route.code})</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="route-code-wrapper">
            <label>Route Code:</label>
            <input
              type="text"
              value={routeCodeInput}
              onChange={(e) => handleCodeInput(e.target.value)}
              placeholder="Optional"
              maxLength={4}
              className="route-code-input"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="route-actions-unified">
          {selectedRoute ? (
            <>
              <button
                type="button"
                onClick={handleModify}
                disabled={loading}
                className="btn-modify"
                title="Modify selected route"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="btn-delete"
                title="Delete selected route"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !routeNameInput.trim()}
              className="btn-add-new"
              title="Add new route"
            >
              Add New
            </button>
          )}
        </div>
      </div>

      {selectedRoute && (
        <div className="selected-route-info">
          <span className="info-label">Selected:</span>
          <span className="info-value">
            {selectedRoute.name}
            {selectedRoute.code && ` (${selectedRoute.code})`}
          </span>
        </div>
      )}

      <ModifyModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Modify Route"
        fields={[
          {
            label: 'Route Name:',
            value: modalRouteName,
            onChange: setModalRouteName,
            placeholder: 'Enter route name'
          },
          {
            label: 'Route Code (max 4 digits):',
            value: modalRouteCode,
            onChange: (val) => {
              if (val === '' || /^\d{1,4}$/.test(val)) {
                setModalRouteCode(val);
              }
            },
            placeholder: 'Optional',
            maxLength: 4,
            className: 'modal-route-code-input'
          }
        ]}
        onSave={handleSaveModification}
        loading={loading}
      />
    </div>
  );
}
