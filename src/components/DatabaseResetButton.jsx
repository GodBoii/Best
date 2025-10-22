'use client';

import { useState } from 'react';

export default function DatabaseResetButton() {
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (!confirm('This will clear all local data and refresh the page. Are you sure?')) {
      return;
    }

    setIsResetting(true);
    try {
      // Delete the IndexedDB database
      const deleteRequest = indexedDB.deleteDatabase('BusScheduleDB');
      
      deleteRequest.onsuccess = () => {
        console.log('Database deleted successfully');
        alert('Local database cleared. The page will now refresh.');
        window.location.reload();
      };

      deleteRequest.onerror = () => {
        console.error('Error deleting database');
        alert('Error clearing database. Please try clearing your browser cache manually.');
        setIsResetting(false);
      };

      deleteRequest.onblocked = () => {
        console.warn('Database deletion blocked');
        alert('Please close all other tabs with this app open and try again.');
        setIsResetting(false);
      };
    } catch (error) {
      console.error('Error resetting database:', error);
      alert('Error: ' + error.message);
      setIsResetting(false);
    }
  };

  return (
    <button
      onClick={handleReset}
      disabled={isResetting}
      style={{
        padding: '8px 16px',
        backgroundColor: '#e74c3c',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: isResetting ? 'not-allowed' : 'pointer',
        fontSize: '14px',
        opacity: isResetting ? 0.6 : 1
      }}
      title="Clear local database and refresh (use if you see database errors)"
    >
      {isResetting ? 'Resetting...' : '🔄 Reset Local DB'}
    </button>
  );
}
