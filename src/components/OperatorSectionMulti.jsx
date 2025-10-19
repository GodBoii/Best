'use client';

import { useState, useEffect } from 'react';
import storageManager from '../lib/storage/storageManager';
import ModifyModal from './ModifyModal';
import MultiInputWrapper from './MultiInputWrapper';

export default function OperatorSectionMulti({ operators = [], onOperatorsChange }) {
  const [allOperators, setAllOperators] = useState([]);
  const [operatorNameInput, setOperatorNameInput] = useState('');
  const [operatorShortNameInput, setOperatorShortNameInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOperators, setFilteredOperators] = useState([]);
  const [selectedForModify, setSelectedForModify] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalOperatorName, setModalOperatorName] = useState('');
  const [modalOperatorShortCode, setModalOperatorShortCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOperators();
  }, []);

  useEffect(() => {
    if (operatorNameInput.trim()) {
      const filtered = allOperators.filter(operator =>
        operator.name.toLowerCase().includes(operatorNameInput.toLowerCase()) ||
        operator.short_code.toLowerCase().includes(operatorNameInput.toLowerCase())
      );
      setFilteredOperators(filtered);
    } else {
      setFilteredOperators(allOperators);
    }
  }, [operatorNameInput, allOperators]);

  useEffect(() => {
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
      setAllOperators(data || []);
    }
  };

  const handleSelect = (operator) => {
    if (operators.find(o => o.id === operator.id)) {
      alert('This operator is already added');
      return;
    }
    
    onOperatorsChange([...operators, operator]);
    setOperatorNameInput('');
    setOperatorShortNameInput('');
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

    const exists = allOperators.some(o =>
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
      onOperatorsChange([...operators, data]);
      setOperatorNameInput('');
      setOperatorShortNameInput('');
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleModify = (operator) => {
    setSelectedForModify(operator);
    setModalOperatorName(operator.name);
    setModalOperatorShortCode(operator.short_code);
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

    const exists = allOperators.some(o =>
      o.id !== selectedForModify.id && (
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
      .eq('id', selectedForModify.id);

    if (error) {
      alert('Error updating operator: ' + error.message);
    } else {
      await fetchOperators();
      const updatedOperators = operators.map(o => 
        o.id === selectedForModify.id 
          ? { ...o, name: modalOperatorName.trim(), short_code: modalOperatorShortCode.trim().toUpperCase() }
          : o
      );
      onOperatorsChange(updatedOperators);
      setShowModal(false);
    }
    setLoading(false);
  };

  const handleDelete = async (operator) => {
    if (!confirm(`Are you sure you want to delete "${operator.name}"?`)) return;

    setLoading(true);
    const { error } = await storageManager
      .from('operators')
      .delete()
      .eq('id', operator.id);

    if (error) {
      alert('Error deleting operator: ' + error.message);
    } else {
      await fetchOperators();
      onOperatorsChange(operators.filter(o => o.id !== operator.id));
    }
    setLoading(false);
  };

  const handleRemove = (index) => {
    onOperatorsChange(operators.filter((_, i) => i !== index));
  };

  const renderOperatorItem = (operator) => {
    return (
      <div className="operator-item-display">
        <span className="operator-item-name">{operator.name}</span>
        <span className="operator-item-code">({operator.short_code})</span>
        <div className="operator-item-actions">
          <button
            type="button"
            onClick={() => handleModify(operator)}
            className="btn-modify-small"
            title="Modify"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => handleDelete(operator)}
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
        title="Operator"
        sectionNumber="3"
        items={operators}
        onRemove={handleRemove}
        renderItem={renderOperatorItem}
      >
        <div className="operator-unified-container">
          <div className="operator-inputs-row">
            <div className="operator-input-wrapper">
              <label>Operator Name: <span className="required">*</span></label>
              <input
                type="text"
                value={operatorNameInput}
                onChange={(e) => setOperatorNameInput(e.target.value)}
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
                      className="operator-dropdown-item"
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
            <button
              type="button"
              onClick={handleAdd}
              disabled={loading || !operatorNameInput.trim() || !operatorShortNameInput.trim() || operatorShortNameInput.length !== 2}
              className="btn-add-multi"
              title="Add this operator to the list"
            >
              + Add Operator
            </button>
          </div>
        </div>
      </MultiInputWrapper>

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
    </>
  );
}
