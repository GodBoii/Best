/**
 * Other Duties Helper Functions
 * Provides utilities for fetching and formatting Other Duties data for reports
 */

import storageManager from './storage/storageManager';

/**
 * Fetch Other Duties data for a specific depot and date
 * Uses temporal logic: fetches the latest entry on or before the specified date
 * 
 * @param {string} depotId - UUID of the depot
 * @param {string} reportDate - Date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of other duties entries with formatted data
 */
export async function fetchOtherDutiesForReport(depotId, reportDate) {
  try {
    const client = storageManager.getClient();

    console.log('🔍 Fetching Other Duties for:', { depotId, reportDate });

    // Step 1: Fetch all entries for this depot on or before the report date
    const entriesQuery = client
      .from('other_duties_entries')
      .select('*')
      .eq('depot_id', depotId)
      .lte('duty_date', reportDate);

    const { data: entries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      console.error('❌ Error fetching entries:', entriesError);
      throw entriesError;
    }

    console.log('📋 Found entries:', entries?.length || 0, entries);

    if (!entries || entries.length === 0) {
      console.log('⚠️ No entries found');
      return [];
    }

    // Step 2: Group by platform - keep only the latest entry for each platform
    const latestEntriesByPlatform = new Map();

    entries.forEach(entry => {
      const platformId = entry.platform_id;
      if (!latestEntriesByPlatform.has(platformId)) {
        latestEntriesByPlatform.set(platformId, entry);
      }
    });

    const latestEntries = Array.from(latestEntriesByPlatform.values());

    console.log('✨ Latest entries per platform:', latestEntries.length, latestEntries);

    if (latestEntries.length === 0) {
      console.log('⚠️ No latest entries');
      return [];
    }

    // Step 3: Fetch ALL items from other_duties_items table first, then filter
    const { data: allItems, error: allItemsError } = await client
      .from('other_duties_items')
      .select('*');

    if (allItemsError) {
      console.error('❌ Error fetching all items:', allItemsError);
      throw allItemsError;
    }

    console.log('📦 All items in database:', allItems?.length || 0);

    // Filter items for our entries
    const entryIds = latestEntries.map(e => e.id);
    console.log('🔑 Entry IDs we need:', entryIds);

    const items = (allItems || []).filter(item => entryIds.includes(item.other_duties_entry_id));
    console.log('📦 Filtered items for our entries:', items.length, items);

    // Step 4: Fetch ALL platforms, then filter
    const { data: allPlatforms, error: allPlatformsError } = await client
      .from('platform_master')
      .select('*');

    if (allPlatformsError) {
      console.error('❌ Error fetching platforms:', allPlatformsError);
      throw allPlatformsError;
    }

    const platformIds = latestEntries.map(e => e.platform_id);
    const platforms = (allPlatforms || []).filter(p => platformIds.includes(p.id));
    platforms.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

    console.log('🏢 Platforms:', platforms.length, platforms);

    // Step 5: Fetch ALL duties, then filter
    let duties = [];
    if (items && items.length > 0) {
      const { data: allDuties, error: allDutiesError } = await client
        .from('platform_duty_master')
        .select('*');

      if (allDutiesError) {
        console.error('❌ Error fetching duties:', allDutiesError);
        throw allDutiesError;
      }

      const dutyIds = items.map(i => i.platform_duty_id).filter(id => id);
      duties = (allDuties || []).filter(d => dutyIds.includes(d.id));
      console.log('📝 Duties:', duties.length, duties);
    }

    // Step 6: Combine and format the data
    const formattedEntries = latestEntries.map(entry => {
      const platform = platforms.find(p => p.id === entry.platform_id);
      const entryItems = items.filter(item => item.other_duties_entry_id === entry.id);

      console.log(`🔧 Processing entry ${entry.id}, platform: ${platform?.name}, items: ${entryItems.length}, remark: ${entry.remark || 'none'}, effective date: ${entry.duty_date}`);

      const dutyDetails = entryItems.map(item => {
        const duty = duties.find(d => d.id === item.platform_duty_id);
        return {
          name: duty?.name || 'Unknown',
          value: item.duty_value
        };
      });

      const totalValue = dutyDetails.reduce((sum, d) => sum + d.value, 0);

      return {
        platformId: entry.platform_id,
        platformName: platform?.name || 'Unknown',
        platformOrder: platform?.display_order || 0,
        effectiveDate: entry.duty_date,
        remark: entry.remark, // This is from the latest entry for this platform
        duties: dutyDetails,
        totalValue: totalValue
      };
    });

    // Sort by platform display order
    formattedEntries.sort((a, b) => a.platformOrder - b.platformOrder);

    console.log('✅ Final formatted entries:', formattedEntries.length, formattedEntries);

    return formattedEntries;
  } catch (error) {
    console.error('❌ Error fetching other duties for report:', error);
    return [];
  }
}

/**
 * Format Other Duties data for display in report footer
 * Matches the format: "1) Non Platform (Driver) = 4   { Staff Car = 2 , CNG = 1 , Washing = 1 }"
 * With remark: "Note:- remark text"
 * 
 * @param {Array} otherDutiesData - Array of other duties entries from fetchOtherDutiesForReport
 * @returns {Array<string>} Array of formatted strings for display
 */
export function formatOtherDutiesForReport(otherDutiesData) {
  if (!otherDutiesData || otherDutiesData.length === 0) {
    return [];
  }

  const lines = [];

  // Add all platform lines
  otherDutiesData.forEach((entry, index) => {
    const number = index + 1;
    const platformName = entry.platformName;
    const total = entry.totalValue;

    // Format duties breakdown
    let dutiesBreakdown = '';
    if (entry.duties && entry.duties.length > 0) {
      const dutyStrings = entry.duties.map(d => `${d.name} = ${d.value}`);
      dutiesBreakdown = `   { ${dutyStrings.join(' , ')} }`;
    }

    // Add main line
    lines.push(`${number}) ${platformName} = ${total}${dutiesBreakdown}`);
  });

  // Find the most recent remark (latest effective date with a remark)
  const entriesWithRemarks = otherDutiesData
    .filter(entry => entry.remark && entry.remark.trim())
    .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));

  // Add only the latest remark at the bottom
  if (entriesWithRemarks.length > 0) {
    const latestRemark = entriesWithRemarks[0].remark.trim();
    lines.push(''); // Empty line before remark
    lines.push(`Note:- ${latestRemark}`);
  }

  return lines;
}

/**
 * Format Other Duties data for PDF generation
 * Returns structured data that can be used by jsPDF
 * 
 * @param {Array} otherDutiesData - Array of other duties entries from fetchOtherDutiesForReport
 * @returns {Object} Structured data for PDF generation
 */
export function formatOtherDutiesForPDF(otherDutiesData) {
  if (!otherDutiesData || otherDutiesData.length === 0) {
    return {
      hasData: false,
      lines: []
    };
  }

  const lines = formatOtherDutiesForReport(otherDutiesData);

  return {
    hasData: true,
    lines: lines,
    rawData: otherDutiesData
  };
}

/**
 * Check if Other Duties data exists for a depot and date
 * 
 * @param {string} depotId - UUID of the depot
 * @param {string} reportDate - Date in YYYY-MM-DD format
 * @returns {Promise<boolean>} True if data exists
 */
export async function hasOtherDutiesData(depotId, reportDate) {
  try {
    const data = await fetchOtherDutiesForReport(depotId, reportDate);
    return data.length > 0;
  } catch (error) {
    console.error('Error checking other duties data:', error);
    return false;
  }
}

/**
 * Example usage in report generation:
 * 
 * const otherDutiesData = await fetchOtherDutiesForReport(depotId, reportDate);
 * const formattedLines = formatOtherDutiesForReport(otherDutiesData);
 * 
 * // Display in report footer:
 * formattedLines.forEach(line => {
 *   console.log(line);
 * });
 * 
 * Output:
 * 1) Non Platform (Driver) = 4   { Staff Car = 2 , CNG = 1 , Washing = 1 }
 * 2) Other Duties  (Driver) = 3   { Refr.Course = 2 , S.R.4-4-10 = 1 }
 * 3) Non Platform (Conductor) = 0
 * 4) Other Duties  (Conductor) = 3   { Refr.Course = 2 , S.R.4-4-10 = 1 }
 */
