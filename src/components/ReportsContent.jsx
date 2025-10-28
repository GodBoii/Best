'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DepotReportSection from './DepotReportSection';
import SummaryReportSection from './SummaryReportSection';
import RequirementReportSection from './RequirementReportSection';

export default function ReportsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('depot');

  useEffect(() => {
    // Check if tab parameter is in URL
    const tab = searchParams.get('tab');
    if (tab === 'summary') {
      setActiveTab('summary');
    } else if (tab === 'requirement') {
      setActiveTab('requirement');
    }
  }, [searchParams]);

  return (
    <div className="reports-container">
      <div className="reports-tabs">
        <button
          className={`tab-button ${activeTab === 'depot' ? 'active' : ''}`}
          onClick={() => setActiveTab('depot')}
        >
          Depot Report
        </button>
        <button
          className={`tab-button ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary Report
        </button>
        <button
          className={`tab-button ${activeTab === 'requirement' ? 'active' : ''}`}
          onClick={() => setActiveTab('requirement')}
        >
          Requirement Report
        </button>
      </div>

      <div className="reports-content">
        {activeTab === 'depot' && <DepotReportSection />}
        {activeTab === 'summary' && <SummaryReportSection />}
        {activeTab === 'requirement' && <RequirementReportSection />}
      </div>
    </div>
  );
}
