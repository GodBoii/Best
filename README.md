# Bus Schedule Management System

A comprehensive web-based application for managing bus depot schedules, fleet operations, and generating professional A4 reports. Built with Next.js and IndexedDB for offline-first local storage.

## 🚀 Overview

This system provides a complete solution for bus depot management, including schedule creation, fleet tracking, duty allocation, and automated report generation. All data is stored locally in the browser using IndexedDB, with built-in backup and restore capabilities.

## ✨ Key Features

### 📊 Schedule Management
- Create and manage bus schedules by depot, date, operator, bus type, and route
- Support for both weekday (Mon-Sat) and Sunday schedules
- Separate tracking for AM, NOON, and PM shifts
- Driver and conductor duty allocation
- Temporal data management with modification tracking (created, modified, deleted entries)
- Schedule modification history with effective dates

### 🚌 Fleet Management
- Track fleet numbers by depot, operator, and bus type
- Fleet assignment and monitoring
- Depot serial number management for summary reports
- Bus type categorization (BEST vs WET_LEASE)

### 📝 Other Duties Management
- Platform master and platform duty master configuration
- Track additional duties beyond regular schedules
- Integration with depot reports

### 📄 Report Generation
- **Depot Schedule Reports**: A4 portrait format PDF reports with:
  - Grouped by bus type category (BEST first, then WET_LEASE)
  - Automatic totals calculation (group totals, BEST total, grand total)
  - Professional formatting with proper headers and borders
  - Route merging for consolidated view
  
- **Operator Reports**: Excel format with detailed operator information

- **Requirement Reports**: Calculate and display duty requirements

- **Summary Reports**: 
  - Consolidated view across multiple depots
  - Bus type selection and filtering
  - Custom remarks by date and day type
  - Statistical calculations

### 💾 Data Management
- **Local Storage**: All data stored in browser IndexedDB (no server required)
- **Persistent Storage**: Requests browser persistent storage to prevent data loss
- **Backup & Restore**: 
  - Manual backup to JSON files
  - Automatic daily backups
  - Backup reminder system
  - Import/restore from backup files
- **Data Migration**: Automatic schema migrations with version tracking
- **Storage Health Monitoring**: Real-time storage usage tracking and alerts

### 🔐 Authentication
- Supabase authentication integration
- User session management
- Protected routes with AuthGuard
- User menu with profile management

## 🏗️ Technology Stack

### Frontend
- **Framework**: Next.js 14 (React 18)
- **Styling**: Custom CSS with modular component styles
- **PDF Generation**: jsPDF with autoTable plugin
- **Excel Generation**: xlsx-js-style
- **Image Capture**: html2canvas

### Storage
- **Primary**: IndexedDB (browser-based, offline-first)
- **Backup**: JSON file export/import
- **Authentication**: Supabase (optional, for multi-user scenarios)

### Architecture
- **Storage Adapter Pattern**: Unified API for data operations
- **Supabase-like API**: Familiar query interface (`.from()`, `.select()`, `.eq()`, etc.)
- **Client-side Only**: No backend server required for core functionality

## 📁 Project Structure

```
bus-schedule-manager/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── fleet/                    # Fleet schedule management
│   │   ├── login/                    # Authentication
│   │   ├── modifications/            # Schedule modifications
│   │   ├── other-duties/             # Other duties management
│   │   ├── report/                   # Single depot report
│   │   ├── reports/                  # Multi-depot reports
│   │   ├── requirement/              # Requirement calculations
│   │   ├── settings/                 # Application settings
│   │   ├── signup/                   # User registration
│   │   ├── summary/                  # Summary reports
│   │   ├── layout.jsx                # Root layout
│   │   └── page.jsx                  # Home page (schedule entry)
│   │
│   ├── components/                   # React components
│   │   ├── AuthGuard.jsx             # Route protection
│   │   ├── BackupReminder.jsx        # Backup notification system
│   │   ├── DataBackupUtility.jsx     # Backup/restore UI
│   │   ├── DatabaseVersionChecker.jsx # Schema version management
│   │   ├── DatabaseViewer.jsx        # Data inspection tool
│   │   ├── FleetSchedule.jsx         # Fleet management UI
│   │   ├── MigrationRunner.jsx       # Database migration UI
│   │   ├── SimpleForm.jsx            # Schedule entry form
│   │   ├── StorageHealthDashboard.jsx # Storage monitoring
│   │   ├── StorageToggle.jsx         # Storage mode switcher
│   │   ├── UserMenu.jsx              # User profile menu
│   │   └── [40+ other components]    # Feature-specific components
│   │
│   ├── lib/                          # Core libraries
│   │   ├── auth/                     # Authentication
│   │   │   ├── AuthContext.jsx       # Auth state management
│   │   │   └── supabaseAuth.js       # Supabase auth helpers
│   │   ├── storage/                  # Storage layer
│   │   │   ├── indexedDBAdapter.js   # IndexedDB implementation
│   │   │   ├── storageManager.js     # Unified storage interface
│   │   │   ├── backupManager.js      # Backup automation
│   │   │   ├── storageMonitor.js     # Health monitoring
│   │   │   └── migrations.js         # Schema migrations
│   │   ├── reportHelpers/            # Report utilities
│   │   │   └── depotScheduleHelper.js # Schedule data processing
│   │   ├── otherDutiesHelper.js      # Other duties utilities
│   │   ├── summaryRemarkHelper.js    # Summary remarks utilities
│   │   └── supabase.js               # Supabase client config
│   │
│   ├── services/                     # Business logic
│   │   ├── reportGenerator.js        # PDF report generation
│   │   └── operatorReportGenerator.js # Excel report generation
│   │
│   ├── utils/                        # Utility functions
│   │   ├── requirementCalculations.js # Duty requirement calculations
│   │   └── summaryCalculations.js    # Summary statistics
│   │
│   └── styles/                       # CSS modules
│       ├── globals.css               # Global styles
│       ├── variables.css             # CSS variables
│       └── [15+ component styles]    # Feature-specific styles
│
├── scripts/
│   └── run-migration.js              # Migration script
│
├── .env.local                        # Environment variables
├── next.config.js                    # Next.js configuration
├── package.json                      # Dependencies
└── README.md                         # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Modern web browser with IndexedDB support
- (Optional) Supabase account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bus-schedule-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   
   > **Note**: Supabase is only required for authentication. Core functionality works without it.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. **Add Master Data** (in order):
   - **Depots**: Add your bus depots with names and serial numbers
   - **Operators**: Add operators with short codes (e.g., "MU" for Mateshwari Urban)
   - **Bus Types**: Add bus types with categories (BEST or WET_LEASE) and display order
   - **Routes**: Add routes with names and numeric codes

2. **Configure Settings**:
   - Set depot serial numbers for summary reports
   - Configure summary bus type selections
   - Set up platform masters and duty masters for other duties

3. **Create Schedules**:
   - Select depot, date, operator, bus type, and route
   - Enter schedule data (buses and duties for weekdays and Sundays)
   - Add entries and save to database

## 📖 Usage Guide

### Creating a Schedule

1. Navigate to the home page (Schedule Entry)
2. Fill in the form fields in order:
   - Select **Depot**
   - Choose **Date**
   - Select **Operator**
   - Choose **Bus Type**
   - Select **Route**
3. Enter schedule data:
   - **Buses**: AM, NOON, PM for Mon-Sat and Sunday
   - **Duties**: Driver and Conductor counts (auto-populated)
4. Click **"Add Entry to List"**
5. Repeat for additional entries
6. Click **"Save All to Database"**

### Modifying Schedules

1. Go to **Schedule Modifications** page
2. Select depot and date
3. View existing entries
4. Click **"Modify"** on any entry
5. Make changes and save
6. System tracks modification history with effective dates

### Generating Reports

#### Depot Schedule Report (PDF)
1. Go to **Reports** page
2. Select depot and date
3. Click **"Generate Report"**
4. Preview appears below
5. Use **"Download PDF"** or **"Print Preview"**

#### Operator Report (Excel)
1. Go to **Reports** page
2. Select operator and date range
3. Click **"Generate Operator Report"**
4. Excel file downloads automatically

#### Summary Report
1. Go to **Summary** page
2. Select date and day type
3. Choose bus types to include
4. Add optional remarks
5. Generate and download report

### Managing Fleet

1. Go to **FLEET Schedule** page
2. Select depot and date
3. Set depot serial number (for reports)
4. Add fleet entries with operator, bus type, and fleet number
5. View and manage existing fleet entries

### Backup & Restore

#### Manual Backup
1. Go to **Settings** page
2. Click **"Backup Data"** in Data Backup Utility
3. JSON file downloads to your Downloads folder
4. Store safely (recommended: cloud storage or external drive)

#### Restore from Backup
1. Go to **Settings** page
2. Click **"Choose File"** in Data Backup Utility
3. Select your backup JSON file
4. Click **"Restore Data"**
5. Confirm the restoration

#### Automatic Backups
- System automatically backs up daily
- Backup reminder appears if no backup in 7 days
- Backups saved to Downloads folder with timestamp

## 🗄️ Database Schema

### Core Tables

#### depots
- `id` (UUID, primary key)
- `name` (text, unique)
- `display_order` (integer) - Serial number for reports
- `created_at` (timestamp)

#### operators
- `id` (UUID, primary key)
- `name` (text, unique)
- `short_code` (text, unique, 2 characters)
- `created_at` (timestamp)

#### bus_types
- `id` (UUID, primary key)
- `name` (text, unique)
- `short_name` (text, optional)
- `category` (text) - 'BEST' or 'WET_LEASE'
- `display_order` (integer) - Sort order in reports
- `created_at` (timestamp)

#### routes
- `id` (UUID, primary key)
- `name` (text, unique)
- `code` (text, unique) - Numeric route code
- `created_at` (timestamp)

#### schedules
- `id` (UUID, primary key)
- `depot_id` (UUID, foreign key)
- `schedule_date` (date)
- `created_at` (timestamp)
- Unique constraint: (depot_id, schedule_date)

#### schedule_entries
- `id` (UUID, primary key)
- `schedule_id` (UUID, foreign key)
- `depot_id` (UUID, foreign key)
- `operator_id` (UUID, foreign key, nullable)
- `bus_type_id` (UUID, foreign key)
- `route_id` (UUID, foreign key)
- `schedule_date` (date)
- `mon_sat_am`, `mon_sat_noon`, `mon_sat_pm` (text) - Weekday buses
- `sun_am`, `sun_noon`, `sun_pm` (text) - Sunday buses
- `duties_driver_ms`, `duties_cond_ms` (text) - Weekday duties
- `duties_driver_sun`, `duties_cond_sun` (text) - Sunday duties
- `entry_status` (text) - 'created', 'modified', 'deleted'
- `effective_from` (date) - When entry becomes active
- `effective_to` (date, nullable) - When entry expires
- `created_at`, `updated_at` (timestamp)

#### fleet_entries
- `id` (UUID, primary key)
- `depot_id` (UUID, foreign key)
- `schedule_date` (date)
- `operator_id` (UUID, foreign key)
- `bus_type_id` (UUID, foreign key)
- `fleet_number` (integer, 0-9999)
- `created_at` (timestamp)

#### other_duties_entries
- `id` (UUID, primary key)
- `depot_id` (UUID, foreign key)
- `duty_date` (date)
- `platform_id` (UUID, foreign key)
- `created_at` (timestamp)

#### other_duties_items
- `id` (UUID, primary key)
- `other_duties_entry_id` (UUID, foreign key)
- `platform_duty_id` (UUID, foreign key)
- `duty_count` (integer)
- `created_at` (timestamp)

#### summary_settings
- `id` (UUID, primary key)
- `setting_key` (text, unique)
- `setting_value` (text)
- `created_at`, `updated_at` (timestamp)

#### summary_report_remarks
- `id` (UUID, primary key)
- `remark_date` (date)
- `day_type` (text) - 'weekday' or 'sunday'
- `remark_text` (text)
- `created_at`, `updated_at` (timestamp)
- Unique constraint: (remark_date, day_type)

#### platform_master
- `id` (UUID, primary key)
- `name` (text, unique)
- `display_order` (integer)
- `created_at` (timestamp)

#### platform_duty_master
- `id` (UUID, primary key)
- `name` (text, unique)
- `display_order` (integer)
- `created_at` (timestamp)

## 🔧 Configuration

### Storage Configuration

The system uses IndexedDB for local storage with the following features:

- **Database Name**: `BusScheduleDB`
- **Current Version**: 6
- **Persistent Storage**: Automatically requested to prevent data eviction
- **Storage Monitoring**: Real-time usage tracking with alerts

### Report Configuration

#### PDF Reports (Depot Schedule)
- **Format**: A4 Portrait
- **Font**: Times New Roman
- **Grouping**: By bus type category (BEST first, then WET_LEASE)
- **Sorting**: 
  - BEST entries by display_order
  - WET_LEASE by operator name, then bus type
  - Routes by numeric code (ascending)

#### Excel Reports (Operator)
- **Format**: XLSX with styling
- **Sheets**: One per operator
- **Styling**: Professional formatting with borders and colors

## 🛠️ Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

### Database Migrations

Migrations run automatically on database version changes. To manually trigger:

1. Update `DB_VERSION` in `src/lib/storage/indexedDBAdapter.js`
2. Add migration logic in `onupgradeneeded` event
3. Reload the application

### Adding New Features

1. **New Table**: Add object store in `indexedDBAdapter.js` `initDB()` method
2. **New Component**: Create in `src/components/` with corresponding CSS
3. **New Page**: Add route in `src/app/` directory
4. **New Report**: Extend `reportGenerator.js` or create new service

## 🐛 Troubleshooting

### Data Not Saving
- Check browser console for errors
- Verify IndexedDB is enabled in browser settings
- Check storage quota (Settings > Storage Health Dashboard)
- Try clearing browser cache and reloading

### Reports Not Generating
- Ensure all required data is present (depot, date, entries)
- Check browser console for PDF/Excel generation errors
- Verify jsPDF and xlsx libraries are loaded
- Try with a smaller dataset first

### Backup/Restore Issues
- Ensure backup file is valid JSON
- Check file size (large backups may take time)
- Verify browser allows file downloads
- Try manual backup before restore

### Performance Issues
- Check storage usage (Settings > Storage Health Dashboard)
- Clear old/unused data
- Export and reimport data to compact database
- Use Chrome/Edge for best IndexedDB performance

### Authentication Issues
- Verify Supabase credentials in `.env.local`
- Check network connection
- Clear browser cookies and retry
- Authentication is optional for core features

## 📊 Storage Limits

### Browser Storage Quotas
- **Chrome/Edge**: ~60% of available disk space
- **Firefox**: ~50% of available disk space
- **Safari**: ~1GB (may prompt user)

### Recommendations
- Regular backups (automatic daily backups enabled)
- Monitor storage usage in Settings
- Archive old data periodically
- Use persistent storage (automatically requested)

## 🔒 Security Considerations

- All data stored locally in browser (no server transmission)
- Backup files contain unencrypted data (store securely)
- Authentication via Supabase (optional, for multi-user)
- No sensitive data should be stored without encryption
- Regular backups protect against data loss

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- Next.js team for the excellent framework
- jsPDF for PDF generation capabilities
- Supabase for authentication infrastructure
- IndexedDB for robust local storage

## 📞 Support

For issues, questions, or feature requests, please contact the development team or open an issue in the repository.

---

**Version**: 1.0.0  
**Last Updated**: 2025  
**Database Version**: 6
