'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ModifyModal from './ModifyModal';

export default function BusTypeSection({ onBusTypeSelect, selectedBusType }) {
    const [busTypes, setBusTypes] = useState([]);
    const [busTypeNameInput, setBusTypeNameInput] = useState('');
    const [busTypeShortNameInput, setBusTypeShortNameInput] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredBusTypes, setFilteredBusTypes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [modalBusTypeName, setModalBusTypeName] = useState('');
    const [modalBusTypeShortName, setModalBusTypeShortName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBusTypes();
    }, []);

    useEffect(() => {
        // Filter bus types based on input
        if (busTypeNameInput.trim()) {
            const filtered = busTypes.filter(busType =>
                busType.name.toLowerCase().includes(busTypeNameInput.toLowerCase()) ||
                (busType.short_name && busType.short_name.toLowerCase().includes(busTypeNameInput.toLowerCase()))
            );
            setFilteredBusTypes(filtered);
        } else {
            setFilteredBusTypes(busTypes);
        }
    }, [busTypeNameInput, busTypes]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (!event.target.closest('.bustype-input-wrapper') && !event.target.closest('.bustype-actions-unified')) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchBusTypes = async () => {
        const { data, error } = await supabase
            .from('bus_types')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching bus types:', error);
        } else {
            setBusTypes(data || []);
        }
    };

    const handleNameInputChange = (value) => {
        setBusTypeNameInput(value);
        setShowDropdown(true);
        if (selectedBusType && selectedBusType.name !== value) {
            onBusTypeSelect(null);
            setBusTypeShortNameInput('');
        }
    };

    const handleSelect = (busType) => {
        onBusTypeSelect(busType);
        setBusTypeNameInput(busType.name);
        setBusTypeShortNameInput(busType.short_name || '');
        setShowDropdown(false);
    };

    const handleAdd = async () => {
        if (!busTypeNameInput.trim()) {
            alert('Please enter a bus type name');
            return;
        }

        const exists = busTypes.some(bt =>
            bt.name.toLowerCase() === busTypeNameInput.trim().toLowerCase()
        );
        if (exists) {
            alert('A bus type with this name already exists');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
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
            onBusTypeSelect(data);
            setShowDropdown(false);
        }
        setLoading(false);
    };

    const handleModify = () => {
        if (!selectedBusType) return;
        setModalBusTypeName(selectedBusType.name);
        setModalBusTypeShortName(selectedBusType.short_name || '');
        setShowModal(true);
    };

    const handleSaveModification = async () => {
        if (!modalBusTypeName.trim()) {
            alert('Please enter a bus type name');
            return;
        }

        if (modalBusTypeName.trim() === selectedBusType.name && modalBusTypeShortName.trim() === (selectedBusType.short_name || '')) {
            alert('No changes made');
            setShowModal(false);
            return;
        }

        const exists = busTypes.some(bt =>
            bt.id !== selectedBusType.id &&
            bt.name.toLowerCase() === modalBusTypeName.trim().toLowerCase()
        );
        if (exists) {
            alert('A bus type with this name already exists');
            return;
        }

        setLoading(true);
        const { error } = await supabase
            .from('bus_types')
            .update({
                name: modalBusTypeName.trim(),
                short_name: modalBusTypeShortName.trim() || null
            })
            .eq('id', selectedBusType.id);

        if (error) {
            alert('Error updating bus type: ' + error.message);
        } else {
            await fetchBusTypes();
            setBusTypeNameInput(modalBusTypeName.trim());
            setBusTypeShortNameInput(modalBusTypeShortName.trim());
            onBusTypeSelect({
                ...selectedBusType,
                name: modalBusTypeName.trim(),
                short_name: modalBusTypeShortName.trim() || null
            });
            setShowModal(false);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!selectedBusType) return;

        if (!confirm(`Are you sure you want to delete "${selectedBusType.name}"?`)) return;

        setLoading(true);
        const { error } = await supabase
            .from('bus_types')
            .delete()
            .eq('id', selectedBusType.id);

        if (error) {
            alert('Error deleting bus type: ' + error.message);
        } else {
            await fetchBusTypes();
            onBusTypeSelect(null);
            setBusTypeNameInput('');
            setBusTypeShortNameInput('');
        }
        setLoading(false);
    };

    return (
        <div className="form-section">
            <h3>5. Bus Type</h3>

            <div className="bustype-unified-container">
                <div className="bustype-inputs-row">
                    <div className="bustype-input-wrapper">
                        <label>Bus Type Name: <span className="required">*</span></label>
                        <input
                            type="text"
                            value={busTypeNameInput}
                            onChange={(e) => handleNameInputChange(e.target.value)}
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
                                        className={`bustype-dropdown-item ${selectedBusType?.id === busType.id ? 'selected' : ''}`}
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
                    {selectedBusType ? (
                        <>
                            <button
                                type="button"
                                onClick={handleModify}
                                disabled={loading}
                                className="btn-modify"
                                title="Modify selected bus type"
                            >
                                Modify
                            </button>
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={loading}
                                className="btn-delete"
                                title="Delete selected bus type"
                            >
                                Delete
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={loading || !busTypeNameInput.trim()}
                            className="btn-add-new"
                            title="Add new bus type"
                        >
                            Add New
                        </button>
                    )}
                </div>
            </div>

            {selectedBusType && (
                <div className="selected-bustype-info">
                    <span className="info-label">Selected:</span>
                    <span className="info-value">
                        {selectedBusType.name}
                        {selectedBusType.short_name && ` (${selectedBusType.short_name})`}
                    </span>
                </div>
            )}

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
        </div>
    );
}
