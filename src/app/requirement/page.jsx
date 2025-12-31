'use client';

import RequirementReportSection from '../../components/RequirementReportSection';
import '../../styles/requirement.css';
import AuthGuard from '../../components/AuthGuard';

export default function RequirementPage() {
    return (
        <AuthGuard>
            <div className="page-container">
                <RequirementReportSection />
            </div>
        </AuthGuard>
    );
}
