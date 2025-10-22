/**
 * Migration Runner Script
 * Run this script to apply database migrations to Supabase
 * 
 * Usage: node scripts/run-migration.js <migration-file-name>
 * Example: node scripts/run-migration.js add_soft_delete_columns.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationFileName) {
  try {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFileName);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    console.log(`📄 Reading migration file: ${migrationFileName}`);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🔄 Executing migration...');
    console.log('SQL:', sql);

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
    console.log('Data:', data);
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Get migration file name from command line arguments
const migrationFileName = process.argv[2];

if (!migrationFileName) {
  console.error('❌ Please provide a migration file name');
  console.error('Usage: node scripts/run-migration.js <migration-file-name>');
  console.error('Example: node scripts/run-migration.js add_soft_delete_columns.sql');
  process.exit(1);
}

runMigration(migrationFileName);
