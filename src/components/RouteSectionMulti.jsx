'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import ModifyModal from './ModifyModal';
import MultiInputWrapper from './MultiInputWrapper';

export default function RouteSectionMulti({ routes = [], onRoutesChange }) {
  const [allRoutes, setAllRoutes] = useState([]);
  const [routeNameInput, setRouteNameInput] = useState('');
  const [routeCodeInput, setRouteCodeInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [selectedForModify, setSelectedForModify] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalRouteName, setModalRouteName] = useState('');
  const [modalRouteCode, setModalRouteCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (routeNameInput.trim()) {
      const filtered = allRoutes.filter(route =>
        route.name.toLowerCase().includes(routeNameInput.toLowerCase()) ||
        (route.code && route.code.toString().includes(routeNameInput))
      );
      setFilteredRoutes(filtered);
    } else {
      setFilteredRoutes(allRoutes);
    }
  }, [routeNameInput, allRoutes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.route-input-wrapper') && !event.target.closest('.route-actions-unified')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchRoutes = async () => {
    const { data, error } = await storageManager
      .from('routes')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching routes:', error);
    } else {
      setAllRoutes(data || []);
    }
  };

  const handleSelect = (route) => {
    // Check if already added
    if (routes.find(r => r.id === route.id)) {
      alert('This route is already added');
      return;
    }
    
    onRoutesChange([...routes, route]);
    setRouteNameInput('');
    setRouteCodeInput('');
    setShowDropdown(false);
  };

  const handleAdd = async () => {
    if (!routeNameInput.trim()) {
      alert('Please enter a route name');
      return;
    }

    const exists = allRoutes.some(r =>
      r.name.toLowerCase() === routeNameInput.trim().toLowerCase()
    );
    if (exists) {
      alert('A route with this name already exists');
      return;
    }

    setLoading(true);
    const paddedCode = routeCodeInput.trim() ? routeCodeInput.trim().padStart(4, '0') : null;
    
    const { data, error } = await storageManager
      .from('routes')
      .insert([{
        name: routeNameInput.trim(),
        code: paddedCode
      }])
      .select()
      .single();

    if (error) {
      alert('Error adding route: ' + error.message);
    } else {
      await fetchRoutes();
      onRoutesChange([...routes, data]);
      setRouteNameInput('');
      setRouteCodeInput('');
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleModify = (route) => {
    setSelectedForModify(route);
    setModalRouteName(route.name);
    setModalRouteCode(route.code ? route.code.toString() : '');
    setShowModal(true);
  };

  const handleSaveModification = async () => {
    if (!modalRouteName.trim()) {
      alert('Please enter a route name');
      return;
    }

    const exists = allRoutes.some(r =>
      r.id !== selectedForModify.id &&
      r.name.toLowerCase() === modalRouteName.trim().toLowerCase()
    );
    if (exists) {
      alert('A route with this name already exists');
      return;
    }

    setLoading(true);
    const paddedCode = modalRouteCode.trim() ? modalRouteCode.trim().padStart(4, '0') : null;
    
    const { error } = await storageManager
      .from('routes')
      .update({
        name: modalRouteName.trim(),
        code: paddedCode
      })
      .eq('id', selectedForModify.id);

    if (error) {
      alert('Error updating route: ' + error.message);
    } else {
      await fetchRoutes();
      // Update in selected routes array
      const updatedRoutes = routes.map(r => 
        r.id === selectedForModify.id 
          ? { ...r, name: modalRouteName.trim(), code: paddedCode }
          : r
      );
      onRoutesChange(updatedRoutes);
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleDelete = async (route) => {
    if (!confirm(`Are you sure you want to delete "${route.name}"?`)) return;

    setLoading(true);
    const { error } = await storageManager
      .from('routes')
      .delete()
      .eq('id', route.id);

    if (error) {
      alert('Error deleting route: ' + error.message);
    } else {
      await fetchRoutes();
      // Remove from selected routes
      onRoutesChange(routes.filter(r => r.id !== route.id));
    }
    setLoading(false);
  };

  const handleRemove = (index) => {
    onRoutesChange(routes.filter((_, i) => i !== index));
  };

  const handleCodeInput = (value) => {
    if (value === '' || (/^\d{1,4}$/.test(value))) {
      setRouteCodeInput(value);
    }
  };

  const renderRouteItem = (route) => {
    return (
      <div className="route-item-display">
        <span className="route-item-name">{route.name}</span>
        {route.code && <span className="route-item-code">({route.code})</span>}
        <div className="route-item-actions">
          <button
            type="button"
            onClick={() => handleModify(route)}
            className="btn-modify-small"
            title="Modify"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(route)}
            className="btn-delete-small"
            title="Delete"
          >
            Del
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <MultiInputWrapper
        title="Route"
        sectionNumber="5"
        items={routes}
        onRemove={handleRemove}
        renderItem={renderRouteItem}
      >
        <div className="route-unified-container">
          <div className="route-inputs-row">
            <div className="route-input-wrapper">
              <label>Route Name: <span className="required">*</span></label>
              <input
                type="text"
                value={routeNameInput}
                onChange={(e) => setRouteNameInput(e.target.value)}
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
                      className="route-dropdown-item"
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
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !routeNameInput.trim()}
              className="btn-add-multi"
              title="Add this route to the list"
            >
              + Add Route
            </button>
          </div>
        </div>
      </MultiInputWrapper>

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
    </>
  );
}
