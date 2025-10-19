# Bus Schedule Management System

A comprehensive web application for managing bus schedules, routes, operators, and generating formatted A4 reports.

## Features

### Phase 1 (Current - Data Management)
- ✅ Depot Management (Add, Edit, Delete)
- ✅ Operator Management with Short Codes (Add, Edit, Delete)
- ✅ Bus Type Management with Categories (Add, Edit, Delete)
- ✅ Route Management with Codes (Add, Edit, Delete)
- ✅ Dynamic Schedule Creation
- ✅ Auto-population of Conductor from Driver counts
- ✅ Save schedules to Supabase database

### Phase 2 (Completed)
- ✅ Report Preview with proper formatting
- ✅ A4-formatted PDF Report Generation
- ✅ Print functionality
- ✅ Report generation by depot and date

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

#### Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in project details and wait for setup to complete

#### Get Your API Keys
1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

#### Configure Environment Variables
1. Copy the example file:
   ```bash
   cp .env.local.example .env.local
   ```
2. Open `.env.local` and add your keys:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl/Cmd + Enter)
6. You should see "Success. No rows returned" message

This will create all necessary tables:
- `depots`
- `operators`
- `bus_types`
- `routes`
- `schedules`
- `schedule_entries`

### 4. Run Development Server
```bash
npm run dev
```

### 5. Open Application
Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage Guide

### Step 1: Set Up Master Data

Before creating schedules, you need to add master data:

1. **Add Depots**
   - Click on "Depots" tab
   - Enter depot name (e.g., "Dindoshi Depot")
   - Click "Add Depot"

2. **Add Operators**
   - Click on "Operators" tab
   - Enter operator name (e.g., "Mateshwari Urban Transport")
   - Enter 2-character short code (e.g., "MU")
   - Click "Add Operator"

3. **Add Bus Types**
   - Click on "Bus Types" tab
   - Enter bus type name (e.g., "Single Decker Buses")
   - Enter short name if needed (e.g., "Ltd.")
   - Select category: BEST or WET_LEASE
   - Set display order (for report grouping)
   - Click "Add Bus Type"

4. **Add Routes**
   - Click on "Routes" tab
   - Enter route name (e.g., "349" or "C-718")
   - Enter route code (e.g., 3490)
   - Click "Add Route"

### Step 2: Create Schedule

1. Click on "Create Schedule" tab
2. **Fill in basic information (in order):**
   - 1. Select Depot
   - 2. Select Date
   - 3. Select Operator
   - 4. Select Bus Type
   - 5. Select Route
3. **Enter schedule data:**
   - Buses - Monday to Saturday (AM, NOON, PM)
   - Buses - Sunday (AM, NOON, PM)
   - Duties - Monday to Saturday (Driver, Conductor)
   - Duties - Sunday (Driver, Conductor)
4. Click "Add Entry to List"
5. Repeat steps 2-4 to add more entries
6. Click "Save All to Database" when done

### Features

**Sequential Form Flow**: The form follows a logical order - Depot → Date → Operator → Bus Type → Route → Schedule Data. All required fields are clearly marked.

**Auto-population**: When you enter Driver count, Conductor count is automatically filled with the same value. You can manually override this if needed. Works independently for Monday-Saturday and Sunday.

**Entry Management**: Add multiple entries before saving. Each entry is displayed in a card showing all information. Remove any entry with the × button.

**Batch Saving**: All entries are saved to the database at once when you click "Save All to Database". The form resets completely after successful save.

**Edit/Delete**: You can edit or delete any master data (Depots, Operators, Bus Types, Routes) from their respective tabs.

## Database Schema

### Tables Structure

- **depots**: Stores depot information
- **operators**: Stores operator names and short codes
- **bus_types**: Stores bus types with categories (BEST/WET_LEASE)
- **routes**: Stores route names and codes
- **schedules**: Main schedule container (depot + date)
- **schedule_entries**: Individual schedule rows with all data

## Project Structure

```
bus-schedule-manager/
├── supabase/
│   └── schema.sql              # Database schema
├── src/
│   ├── app/
│   │   ├── layout.jsx          # Next.js layout
│   │   └── page.jsx            # Main application
│   ├── components/
│   │   ├── DepotManager.jsx    # Depot CRUD
│   │   ├── OperatorManager.jsx # Operator CRUD
│   │   ├── BusTypeManager.jsx  # Bus Type CRUD
│   │   ├── RouteManager.jsx    # Route CRUD
│   │   └── ScheduleCreator.jsx # Schedule creation
│   ├── lib/
│   │   └── supabase.js         # Supabase client
│   ├── services/
│   │   └── reportGenerator.js  # PDF generation (Phase 2)
│   └── styles/
│       └── globals.css         # Styling
├── .env.local.example          # Environment template
├── .gitignore
├── next.config.js
├── package.json
└── README.md
```

## Troubleshooting

### "Missing Supabase environment variables" error
- Make sure you created `.env.local` file
- Check that the file contains both variables
- Restart the development server after creating the file

### Database errors
- Verify you ran the schema.sql in Supabase SQL Editor
- Check that all tables were created successfully
- Verify your API keys are correct

### Can't see data in dropdowns
- Make sure you added master data first (Depots, Routes, etc.)
- Check browser console for errors
- Verify Supabase connection is working

## Report Generation

### How to Generate Reports

1. Click on "Generate Report" in the navigation menu
2. Select a Depot from the dropdown
3. Select a Date
4. Click "Generate Report"
5. The report preview will appear below
6. Use "Print Preview" to open the PDF in a new tab for printing
7. Use "Download PDF" to save the report to your computer

### Report Features

- **Automatic Grouping**: Entries are grouped by bus type category (BEST buses, Wet Lease operators)
- **Totals Calculation**: Automatic calculation of totals for each group, BEST total, and grand total
- **A4 Format**: Reports are formatted for A4 paper size in landscape orientation
- **Professional Layout**: Matches the standard bus schedule report format with proper headers and sections

## Next Steps (Phase 3)

- Add schedule listing and editing
- Add search and filter capabilities
- Add data export/import functionality
- Add user authentication and permissions
