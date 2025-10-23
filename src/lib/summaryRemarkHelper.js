/**
 * Summary Remark Helper Functions
 * Provides utilities for fetching and formatting remarks for summary reports
 * Uses TEMPORAL LOGIC: fetches the latest remark on or before the specified date
 */

import storageManager from './storage/storageManager';

/**
 * Fetch the remark for a specific date and day type
 * Uses temporal logic: fetches the latest remark on or before the specified date
 * 
 * @param {string} reportDate - Date in YYYY-MM-DD format
 * @param {string} dayType - 'MON_SAT' or 'SUNDAY'
 * @returns {Promise<string|null>} The remark text or null if no remark found
 */
export async function fetchRemarkForSummaryReport(reportDate, dayType) {
  try {
    const client = storageManager.getClient();

    console.log('🔍 Fetching Summary Remark for:', { reportDate, dayType });

    // Fetch all remarks for this day type on or before the report date
    const { data: remarks, error } = await client
      .from('summary_report_remarks')
      .select('*')
      .eq('day_type', dayType)
      .lte('remark_date', reportDate)
      .order('remark_date', { ascending: false });

    if (error) {
      console.error('❌ Error fetching remarks:', error);
      throw error;
    }

    console.log('📋 Found remarks:', remarks?.length || 0, remarks);

    // Return the latest remark (first one due to descending order)
    if (remarks && remarks.length > 0) {
      const latestRemark = remarks[0];
      console.log('✅ Using remark from:', latestRemark.remark_date, ':', latestRemark.remark_text);
      return latestRemark.remark_text;
    }

    console.log('⚠️ No remark found for this date and day type');
    return null;
  } catch (error) {
    console.error('❌ Error fetching remark for summary report:', error);
    return null;
  }
}

/**
 * Check if a remark exists for a specific date and day type
 * 
 * @param {string} reportDate - Date in YYYY-MM-DD format
 * @param {string} dayType - 'MON_SAT' or 'SUNDAY'
 * @returns {Promise<boolean>} True if a remark exists
 */
export async function hasRemarkForSummaryReport(reportDate, dayType) {
  try {
    const remark = await fetchRemarkForSummaryReport(reportDate, dayType);
    return remark !== null;
  } catch (error) {
    console.error('Error checking remark existence:', error);
    return false;
  }
}

/**
 * Format remark for display in summary report
 * 
 * @param {string} remarkText - The remark text
 * @returns {string} Formatted remark with "Note:-" prefix
 */
export function formatRemarkForDisplay(remarkText) {
  if (!remarkText || !remarkText.trim()) {
    return '';
  }
  return `Note:- ${remarkText.trim()}`;
}

/**
 * Example usage in summary report generation:
 * 
 * const remarkText = await fetchRemarkForSummaryReport(reportDate, dayType);
 * if (remarkText) {
 *   const formattedRemark = formatRemarkForDisplay(remarkText);
 *   // Display in report: "Note:- [remark text]"
 * }
 */
