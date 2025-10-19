'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import ModifyModal from './ModifyModal';

export default function OperatorSection({ onOperatorSelect, selectedOperator }) {
  const [operators, setOperators] = useState([]);
  const [operatorNameInput, setOperatorNameInput] = useState('');
  const [operatorShortNameInput, setOperatorShortNameInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOperators, setFilteredOperators] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalOperatorName, setModalOperatorName] = useState('');
  const [modalOperatorShortCode, setModalOperatorShortCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOperators();
  }, []);

  useEffect(() => {
    // Filter operators based on input
    if (operatorNameInput.trim()) {
      const filtered = operators.filter(operator =>
        operator.name.toLowerCase().includes(operatorNameInput.toLowerCase()) ||
        operator.short_code.toLowerCase().includes(operatorNameInput.toLowerCase())
      );
      setFilteredOperators(filtered);
    } else {
      setFilteredOperators(operators);
    }
  }, [operatorNameInput, operators]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.operator-input-wrapper') && !event.target.closest('.operator-actions-unified')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOperators = async () => {
    const { data, error } = await storageManager
      .from('operators')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching operators:', error);
    } else {
      setOperators(data || []);
    }
  };

  const handleNameInputChange = (value) => {
    setOperatorNameInput(value);
    setShowDropdown(true);
    if (selectedOperator && selectedOperator.name !== value) {
      onOperatorSelect(null);
      setOperatorShortNameInput('');
    }
  };

  const handleSelect = (operator) => {
    onOperatorSelect(operator);
    setOperatorNameInput(operator.name);
    setOperatorShortNameInput(operator.short_code);
    setShowDropdown(false);
  };

  const handleAdd = async () => {
    if (!operatorNameInput.trim()) {
      alert('Please enter an operator name');
      return;
    }

    if (!operatorShortNameInput.trim() || operatorShortNameInput.length !== 2) {
      alert('Please enter a 2-character operator short name');
      return;
    }

    const exists = operators.some(o =>
      o.name.toLowerCase() === operatorNameInput.trim().toLowerCase() ||
      o.short_code.toLowerCase() === operatorShortNameInput.trim().toLowerCase()
    );
    if (exists) {
      alert('An operator with this name or short code already exists');
      return;
    }

    setLoading(true);
    const { data, error } = await storageManager
      .from('operators')
      .insert([{
        name: operatorNameInput.trim(),
        short_code: operatorShortNameInput.trim().toUpperCase()
      }])
      .select()
      .single();

    if (error) {
      alert('Error adding operator: ' + error.message);
    } else {
      await fetchOperators();
      onOperatorSelect(data);
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleModify = () => {
    if (!selectedOperator) return;
    setModalOperatorName(selectedOperator.name);
    setModalOperatorShortCode(selectedOperator.short_code);
    setShowModal(true);
  };

  const handleSaveModification = async () => {
    if (!modalOperatorName.trim()) {
      alert('Please enter an operator name');
      return;
    }

    if (!modalOperatorShortCode.trim() || modalOperatorShortCode.trim().length !== 2) {
      alert('Short code must be exactly 2 characters');
      return;
    }

    if (modalOperatorName.trim() === selectedOperator.name && modalOperatorShortCode.trim().toUpperCase() === selectedOperator.short_code) {
      alert('No changes made');
      setShowModal(false);
      return;
    }

    const exists = operators.some(o =>
      o.id !== selectedOperator.id && (
        o.name.toLowerCase() === modalOperatorName.trim().toLowerCase() ||
        o.short_code.toLowerCase() === modalOperatorShortCode.trim().toLowerCase()
      )
    );
    if (exists) {
      alert('An operator with this name or short code already exists');
      return;
    }

    setLoading(true);
    const { error } = await storageManager
      .from('operators')
      .update({
        name: modalOperatorName.trim(),
        short_code: modalOperatorShortCode.trim().toUpperCase()
      })
      .eq('id', selectedOperator.id);

    if (error) {
      alert('Error updating operator: ' + error.message);
    } else {
      await fetchOperators();
      setOperatorNameInput(modalOperatorName.trim());
      setOperatorShortNameInput(modalOperatorShortCode.trim().toUpperCase());
      onOperatorSelect({
        ...selectedOperator,
        name: modalOperatorName.trim(),
        short_code: modalOperatorShortCode.trim().toUpperCase()
      });
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!selectedOperator) return;

    if (!confirm(`Are you sure you want to delete "${selectedOperator.name}"?`)) return;

    setLoading(true);
    const { error } = await storageManager
      .from('operators')
      .delete()
      .eq('id', selectedOperator.id);

    if (error) {
      alert('Error deleting operator: ' + error.message);
    } else {
      await fetchOperators();
      onOperatorSelect(null);
      setOperatorNameInput('');
      setOperatorShortNameInput('');
    }
    setLoading(false);
  };

  return (
    <div className="form-section">
      <h3>3. Operator</h3>

      <div className="operator-unified-container">
        <div className="operator-inputs-row">
          <div className="operator-input-wrapper">
            <label>Operator Name: <span className="required">*</span></label>
            <input
              type="text"
              value={operatorNameInput}
              onChange={(e) => handleNameInputChange(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              placeholder="Type to search or add new operator"
              className="operator-unified-input"
              autoComplete="off"
            />

            {showDropdown && filteredOperators.length > 0 && (
              <div className="operator-dropdown">
                {filteredOperators.map(operator => (
                  <div
                    key={operator.id}
                    className={`operator-dropdown-item ${selectedOperator?.id === operator.id ? 'selected' : ''}`}
                    onClick={() => handleSelect(operator)}
                  >
                    <span className="operator-name">{operator.name}</span>
                    <span className="operator-code">({operator.short_code})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="operator-short-wrapper">
            <label>Initials (2 chars): <span className="required">*</span></label>
            <input
              type="text"
              value={operatorShortNameInput}
              onChange={(e) => setOperatorShortNameInput(e.target.value.toUpperCase())}
              placeholder="MU"
              maxLength={2}
              className="operator-short-input"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="operator-actions-unified">
          {selectedOperator ? (
            <>
              <button
                type="button"
                onClick={handleModify}
                disabled={loading}
                className="btn-modify"
                title="Modify selected operator"
              >
                Modify
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="btn-delete"
                title="Delete selected operator"
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !operatorNameInput.trim() || !operatorShortNameInput.trim() || operatorShortNameInput.length !== 2}
              className="btn-add-new"
              title="Add new operator"
            >
              Add New
            </button>
          )}
        </div>
      </div>

      {selectedOperator && (
        <div className="selected-operator-info">
          <span className="info-label">Selected:</span>
          <span className="info-value">{selectedOperator.name} ({selectedOperator.short_code})</span>
        </div>
      )}

      <ModifyModal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Modify Operator"
        fields={[
          {
            label: 'Operator Name:',
            value: modalOperatorName,
            onChange: setModalOperatorName,
            placeholder: 'Enter operator name'
          },
          {
            label: 'Short Code (2 characters):',
            value: modalOperatorShortCode,
            onChange: (val) => setModalOperatorShortCode(val.toUpperCase()),
            placeholder: 'MU',
            maxLength: 2,
            className: 'modal-short-code-input'
          }
        ]}
        onSave={handleSaveModification}
        loading={loading}
      />
    </div>
  );
}
