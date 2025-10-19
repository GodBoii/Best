'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import ModifyModal from './ModifyModal';
import MultiInputWrapper from './MultiInputWrapper';

export default function BusTypeSectionMulti({ busTypes = [], onBusTypesChange }) {
  const [allBusTypes, setAllBusTypes] = useState([]);
  const [busTypeNameInput, setBusTypeNameInput] = useState('');
  const [busTypeShortNameInput, setBusTypeShortNameInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredBusTypes, setFilteredBusTypes] = useState([]);
  const [selectedForModify, setSelectedForModify] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalBusTypeName, setModalBusTypeName] = useState('');
  const [modalBusTypeShortName, setModalBusTypeShortName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBusTypes();
  }, []);

  useEffect(() => {
    if (busTypeNameInput.trim()) {
      const filtered = allBusTypes.filter(busType =>
        busType.name.toLowerCase().includes(busTypeNameInput.toLowerCase()) ||
        (busType.short_name && busType.short_name.toLowerCase().includes(busTypeNameInput.toLowerCase()))
      );
      setFilteredBusTypes(filtered);
    } else {
      setFilteredBusTypes(allBusTypes);
    }
  }, [busTypeNameInput, allBusTypes]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.bustype-input-wrapper') && !event.target.closest('.bustype-actions-unified')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBusTypes = async () => {
    const { data, error } = await storageManager
      .from('bus_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching bus types:', error);
    } else {
      setAllBusTypes(data || []);
    }
  };

  const handleSelect = (busType) => {
    if (busTypes.find(bt => bt.id === busType.id)) {
      alert('This bus type is already added');
      return;
    }
    
    onBusTypesChange([...busTypes, busType]);
    setBusTypeNameInput('');
    setBusTypeShortNameInput('');
    setShowDropdown(false);
  };

  const handleAdd = async () => {
    if (!busTypeNameInput.trim()) {
      alert('Please enter a bus type name');
      return;
    }

    const exists = allBusTypes.some(bt =>
      bt.name.toLowerCase() === busTypeNameInput.trim().toLowerCase()
    );
    if (exists) {
      alert('A bus type with this name already exists');
      return;
    }

    setLoading(true);
    const { data, error } = await storageManager
      .from('bus_types')
      .insert([{
        name: busTypeNameInput.trim(),
        short_name: busTypeShortNameInput.trim() || null,
        category: 'BEST'
      }])
      .select()
      .single();

    if (error) {
      alert('Error adding bus type: ' + error.message);
    } else {
      await fetchBusTypes();
      onBusTypesChange([...busTypes, data]);
      setBusTypeNameInput('');
      setBusTypeShortNameInput('');
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleModify = (busType) => {
    setSelectedForModify(busType);
    setModalBusTypeName(busType.name);
    setModalBusTypeShortName(busType.short_name || '');
    setShowModal(true);
  };

  const handleSaveModification = async () => {
    if (!modalBusTypeName.trim()) {
      alert('Please enter a bus type name');
      return;
    }

    const exists = allBusTypes.some(bt =>
      bt.id !== selectedForModify.id &&
      bt.name.toLowerCase() === modalBusTypeName.trim().toLowerCase()
    );
    if (exists) {
      alert('A bus type with this name already exists');
      return;
    }

    setLoading(true);
    const { error } = await storageManager
      .from('bus_types')
      .update({
        name: modalBusTypeName.trim(),
        short_name: modalBusTypeShortName.trim() || null
      })
      .eq('id', selectedForModify.id);

    if (error) {
      alert('Error updating bus type: ' + error.message);
    } else {
      await fetchBusTypes();
      const updatedBusTypes = busTypes.map(bt => 
        bt.id === selectedForModify.id 
          ? { ...bt, name: modalBusTypeName.trim(), short_name: modalBusTypeShortName.trim() || null }
          : bt
      );
      onBusTypesChange(updatedBusTypes);
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleDelete = async (busType) => {
    if (!confirm(`Are you sure you want to delete "${busType.name}"?`)) return;

    setLoading(true);
    const { error } = await storageManager
      .from('bus_types')
      .delete()
      .eq('id', busType.id);

    if (error) {
      alert('Error deleting bus type: ' + error.message);
    } else {
      await fetchBusTypes();
      onBusTypesChange(busTypes.filter(bt => bt.id !== busType.id));
    }
    setLoading(false);
  };

  const handleRemove = (index) => {
    onBusTypesChange(busTypes.filter((_, i) => i !== index));
  };

  const renderBusTypeItem = (busType) => {
    return (
      <div className="bustype-item-display">
        <span className="bustype-item-name">{busType.name}</span>
        {busType.short_name && <span className="bustype-item-code">({busType.short_name})</span>}
        <div className="bustype-item-actions">
          <button
            type="button"
            onClick={() => handleModify(busType)}
            className="btn-modify-small"
            title="Modify"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(busType)}
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
        title="Bus Type"
        sectionNumber="4"
        items={busTypes}
        onRemove={handleRemove}
        renderItem={renderBusTypeItem}
      >
        <div className="bustype-unified-container">
          <div className="bustype-inputs-row">
            <div className="bustype-input-wrapper">
              <label>Bus Type Name: <span className="required">*</span></label>
              <input
                type="text"
                value={busTypeNameInput}
                onChange={(e) => setBusTypeNameInput(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type to search or add new bus type"
                className="bustype-unified-input"
                autoComplete="off"
              />

              {showDropdown && filteredBusTypes.length > 0 && (
                <div className="bustype-dropdown">
                  {filteredBusTypes.map(busType => (
                    <div
                      key={busType.id}
                      className="bustype-dropdown-item"
                      onClick={() => handleSelect(busType)}
                    >
                      <span className="bustype-name">{busType.name}</span>
                      {busType.short_name && <span className="bustype-code">({busType.short_name})</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bustype-short-wrapper">
              <label>Initials (2 chars):</label>
              <input
                type="text"
                value={busTypeShortNameInput}
                onChange={(e) => setBusTypeShortNameInput(e.target.value.toUpperCase())}
                placeholder="Optional"
                maxLength={10}
                className="bustype-short-input"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="bustype-actions-unified">
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !busTypeNameInput.trim()}
              className="btn-add-multi"
              title="Add this bus type to the list"
            >
              + Add Bus Type
            </button>
          </div>
        </div>
      </MultiInputWrapper>

      <ModifyModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Modify Bus Type"
        fields={[
          {
            label: 'Bus Type Name:',
            value: modalBusTypeName,
            onChange: setModalBusTypeName,
            placeholder: 'Enter bus type name'
          },
          {
            label: 'Short Name (optional):',
            value: modalBusTypeShortName,
            onChange: (val) => setModalBusTypeShortName(val.toUpperCase()),
            placeholder: 'Optional',
            maxLength: 10,
            className: 'modal-short-name-input'
          }
        ]}
        onSave={handleSaveModification}
        loading={loading}
      />
    </>
  );
}
