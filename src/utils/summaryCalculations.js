/**
 * Summary Calculations Utility
 * Calculates summary statistics for depot reports including:
 * - Average (Driver/Conductor)
 * - Non Platform Duties (Driver/Conductor)
 * - Leave Reserve (Driver/Conductor)
 * - Others (Driver/Conductor)
 * - Grand Total (Driver/Conductor)
 */

/**
 * Normalize text for pattern matching
 * Converts to lowercase, removes special characters, and trims whitespace
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with space
    .replace(/\s+/g, ' ')      // Collapse multiple spaces
    .trim();
}

/**
 * Categorize a platform entry based on its name
 * @param {string} platformName - Name of the platform
 * @returns {string|null} Category key or null if no match
 */
function categorizePlatformEntry(platformName) {
  const normalized = normalizeText(platformName);
  
  // Check for "non platform" + "driver"
  if (normalized.includes('non') && normalized.includes('platform') && normalized.includes('driver')) {
    return 'nonPlatformDriver';
  }
  
  // Check for "non platform" + "conductor"
  if (normalized.includes('non') && normalized.includes('platform') && normalized.includes('conductor')) {
    return 'nonPlatformConductor';
  }
  
  // Check for "other" + ("duties" or "duty") + "driver"
  if (normalized.includes('other') && (normalized.includes('duties') || normalized.includes('duty')) && normalized.includes('driver')) {
    return 'otherDutiesDriver';
  }
  
  // Check for "other" + ("duties" or "duty") + "conductor"
  if (normalized.includes('other') && (normalized.includes('duties') || normalized.includes('duty')) && normalized.includes('conductor')) {
    return 'otherDutiesConductor';
  }
  
  return null;
}

/**
 * Extract platform duty values from other duties data
 * @param {Array} otherDutiesData - Array of other duties entries
 * @returns {Object} Categorized platform duty values
 */
function extractPlatformDuties(otherDutiesData) {
  const categories = {
    nonPlatformDriver: 0,
    nonPlatformConductor: 0,
    otherDutiesDriver: 0,
    otherDutiesConductor: 0
  };
  
  if (!otherDutiesData || otherDutiesData.length === 0) {
    return categories;
  }
  
  // Process each platform entry
  otherDutiesData.forEach(entry => {
    const category = categorizePlatformEntry(entry.platformName);
    
    if (category && categories.hasOwnProperty(category)) {
      // Add the total value to the appropriate category
      categories[category] += entry.totalValue || 0;
    }
  });
  
  return categories;
}

/**
 * Calculate summary statistics for a depot report
 * @param {Object} grandTotals - Grand totals from the report
 * @param {number} grandTotals.duties_driver_ms - Driver duties Mon-Sat
 * @param {number} grandTotals.duties_driver_sun - Driver duties Sunday
 * @param {number} grandTotals.duties_cond_ms - Conductor duties Mon-Sat
 * @param {number} grandTotals.duties_cond_sun - Conductor duties Sunday
 * @param {Array} otherDutiesData - Other duties data from fetchOtherDutiesForReport
 * @returns {Object} Summary statistics
 */
export function calculateSummaryStatistics(grandTotals, otherDutiesData) {
  // Initialize with zeros
  const summary = {
    driver: {
      average: 0,
      nonPlatform: 0,
      leaveReserve: 0,
      others: 0,
      grandTotal: 0
    },
    conductor: {
      average: 0,
      nonPlatform: 0,
      leaveReserve: 0,
      others: 0,
      grandTotal: 0
    }
  };
  
  // Extract platform duties from other duties data
  const platformDuties = extractPlatformDuties(otherDutiesData);
  
  // Calculate averages
  // Formula: [(Mon-Sat Total × 6) + Sunday Total] ÷ 7
  const driverMonSat = grandTotals?.duties_driver_ms || 0;
  const driverSunday = grandTotals?.duties_driver_sun || 0;
  const conductorMonSat = grandTotals?.duties_cond_ms || 0;
  const conductorSunday = grandTotals?.duties_cond_sun || 0;
  
  summary.driver.average = ((driverMonSat * 6) + driverSunday) / 7;
  summary.conductor.average = ((conductorMonSat * 6) + conductorSunday) / 7;
  
  // Set non-platform duties
  summary.driver.nonPlatform = platformDuties.nonPlatformDriver;
  summary.conductor.nonPlatform = platformDuties.nonPlatformConductor;
  
  // Set others
  summary.driver.others = platformDuties.otherDutiesDriver;
  summary.conductor.others = platformDuties.otherDutiesConductor;
  
  // Calculate leave reserve
  // Formula: [(Average + Non Platform) × 36%]
  summary.driver.leaveReserve = (summary.driver.average + summary.driver.nonPlatform) * 0.36;
  summary.conductor.leaveReserve = (summary.conductor.average + summary.conductor.nonPlatform) * 0.36;
  
  // Calculate grand totals
  summary.driver.grandTotal = 
    summary.driver.average + 
    summary.driver.nonPlatform + 
    summary.driver.leaveReserve + 
    summary.driver.others;
    
  summary.conductor.grandTotal = 
    summary.conductor.average + 
    summary.conductor.nonPlatform + 
    summary.conductor.leaveReserve + 
    summary.conductor.others;
  
  return summary;
}

/**
 * Format summary statistics for display
 * Rounds numbers to appropriate precision
 * @param {Object} summary - Summary statistics from calculateSummaryStatistics
 * @param {number} precision - Decimal places (default: 0 for integers)
 * @returns {Object} Formatted summary
 */
export function formatSummaryStatistics(summary, precision = 0) {
  const round = (num) => {
    if (precision === 0) {
      return Math.round(num);
    }
    return Number(num.toFixed(precision));
  };
  
  return {
    driver: {
      average: round(summary.driver.average),
      nonPlatform: round(summary.driver.nonPlatform),
      leaveReserve: round(summary.driver.leaveReserve),
      others: round(summary.driver.others),
      grandTotal: round(summary.driver.grandTotal)
    },
    conductor: {
      average: round(summary.conductor.average),
      nonPlatform: round(summary.conductor.nonPlatform),
      leaveReserve: round(summary.conductor.leaveReserve),
      others: round(summary.conductor.others),
      grandTotal: round(summary.conductor.grandTotal)
    }
  };
}

/**
 * Generate summary table data for PDF
 * @param {Object} summary - Formatted summary statistics
 * @returns {Array} Table rows for jsPDF autoTable
 */
export function generateSummaryTableData(summary) {
  return [
    ['AVERAGE :-', summary.driver.average, summary.conductor.average],
    ['Non Platform Duties :-', summary.driver.nonPlatform, summary.conductor.nonPlatform],
    ['Leave Reserve :-', summary.driver.leaveReserve, summary.conductor.leaveReserve],
    ['Others :-', summary.driver.others, summary.conductor.others],
    ['Grand Total :-', summary.driver.grandTotal, summary.conductor.grandTotal]
  ];
}
