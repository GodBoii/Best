/**
 * Database Migration Utilities
 * Handles schema updates for existing local storage databases
 */

/**
 * Migrate existing schedule_entries to add temporal tracking fields
 * Adds: is_deleted, deleted_at, modified_at
 */
export async function migrateScheduleEntriesToTemporal(storageManager) {
    console.log('🔄 Starting migration: Add temporal tracking to schedule_entries');

    try {
        // Get all existing schedule entries
        const { data: entries, error } = await storageManager
            .from('schedule_entries')
            .select('*');

        if (error) {
            throw error;
        }

        if (!entries || entries.length === 0) {
            console.log('✅ No entries to migrate');
            return { success: true, migrated: 0 };
        }

        console.log(`📋 Found ${entries.length} entries to migrate`);

        let migrated = 0;
        let skipped = 0;

        // Update each entry to add missing fields
        for (const entry of entries) {
            let needsUpdate = false;
            const updates = {};

            // Add is_deleted if missing
            if (entry.is_deleted === undefined || entry.is_deleted === null) {
                updates.is_deleted = false;
                needsUpdate = true;
            }

            // Add deleted_at if missing
            if (entry.deleted_at === undefined) {
                updates.deleted_at = null;
                needsUpdate = true;
            }

            // Add modified_at if missing (use created_at as fallback)
            if (!entry.modified_at) {
                updates.modified_at = entry.created_at || new Date().toISOString();
                needsUpdate = true;
            }

            if (needsUpdate) {
                const { error: updateError } = await storageManager
                    .from('schedule_entries')
                    .update(updates)
                    .eq('id', entry.id);

                if (updateError) {
                    console.error(`❌ Error updating entry ${entry.id}:`, updateError);
                } else {
                    migrated++;
                }
            } else {
                skipped++;
            }
        }

        console.log(`✅ Migration complete: ${migrated} migrated, ${skipped} skipped`);
        return { success: true, migrated, skipped, total: entries.length };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Check if migration is needed
 */
export async function checkMigrationStatus(storageManager) {
    try {
        const { data: entries, error } = await storageManager
            .from('schedule_entries')
            .select('*');

        if (error) {
            return { needsMigration: false, error: error.message };
        }

        if (!entries || entries.length === 0) {
            return { needsMigration: false, reason: 'No entries found' };
        }

        // Check if any entry is missing the new fields
        const needsMigration = entries.some(entry =>
            entry.is_deleted === undefined ||
            entry.is_deleted === null ||
            entry.deleted_at === undefined ||
            !entry.modified_at
        );

        return {
            needsMigration,
            totalEntries: entries.length,
            reason: needsMigration ? 'Some entries missing temporal fields' : 'All entries up to date'
        };

    } catch (error) {
        return { needsMigration: false, error: error.message };
    }
}

/**
 * Run all migrations
 */
export async function runAllMigrations(storageManager) {
    console.log('🚀 Running all database migrations...');

    const results = [];

    // Migration 1: Add temporal tracking
    const migrationStatus = await checkMigrationStatus(storageManager);
    if (migrationStatus.needsMigration) {
        const result = await migrateScheduleEntriesToTemporal(storageManager);
        results.push({ name: 'temporal_tracking', ...result });
    } else {
        console.log('⏭️ Skipping temporal tracking migration - not needed');
        results.push({ name: 'temporal_tracking', success: true, skipped: true });
    }

    console.log('✅ All migrations complete');
    return results;
}
