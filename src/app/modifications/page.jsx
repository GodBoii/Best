'use client';

import DepotScheduleModifications from '../../components/DepotScheduleModifications';
import Link from 'next/link';
import StorageToggle from '../../components/StorageToggle';
import BackupReminder from '../../components/BackupReminder';
import '../../styles/globals.css';
import '../../styles/modifications.css';

export default function ModificationsPage() {
    return (
        <div className="app-container">
            <BackupReminder />

            <header className="app-header">
                <h1>Bus Schedule Management System</h1>
                <StorageToggle />
            </header>

            <nav className="app-nav">
                <Link href="/">
                    <button>Schedule Entry</button>
                </Link>
                <Link href="/modifications">
                    <button className="active">Schedule Modifications</button>
                </Link>
                <Link href="/report">
                    <button>Depot Report</button>
                </Link>
                <Link href="/summary">
                    <button>Summary Report</button>
                </Link>
                <Link href="/fleet">
                    <button>FLEET Schedule</button>
                </Link>
                <Link href="/settings">
                    <button>⚙️ Settings</button>
                </Link>
            </nav>

            <main className="app-main">
                <DepotScheduleModifications />
            </main>

            <footer className="app-footer">
                <p>Bus Schedule Management System © 2025</p>
            </footer>
        </div>
    );
}
