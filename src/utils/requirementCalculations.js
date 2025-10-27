/**
 * Requirement Calculations Utility
 * Calculates physical requirement statistics for drivers and conductors
 */

/**
 * Calculate requirement statistics for a depot
 * @param {Object} dutyData - Duty allocation data
 * @param {number} dutyData.mon_sat - Mon-Sat duty count
 * @param {number} dutyData.sun - Sunday duty count
 * @param {number} dutyData.non_platform - Non-platform duties
 * @param {number} dutyData.others - Other duties
 * @returns {Object} Calculated requirement statistics
 */
export function calculateRequirementStats(dutyData) {
  const monSat = dutyData.mon_sat || 0;
  const sun = dutyData.sun || 0;
  const nonPlatform = dutyData.non_platform || 0;
  const others = dutyData.others || 0;

  // Average Duty: [(Mon-Sat × 6) + Sunday] ÷ 7
  const avgDuty = ((monSat * 6) + sun) / 7;

  // Total: Average + Non-Platform
  const total = avgDuty + nonPlatform;

  // Leave calculations (percentages of total)
  const wOff = total * 0.20;  // 20%
  const pl = total * 0.10;    // 10%
  const cl = total * 0.04;    // 4%
  const sl = total * 0.04;    // 4%

  // Total leaves
  const totalLeaves = wOff + pl + cl + sl;

  // Grand Total
  const grandTotal = total + totalLeaves + others;

  return {
    monSat,
    sun,
    avgDuty,
    nonPlatform,
    total,
    wOff,
    pl,
    cl,
    sl,
    totalLeaves,
    others,
    grandTotal
  };
}

/**
 * Format requirement statistics for display
 * @param {Object} stats - Statistics from calculateRequirementStats
 * @param {number} precision - Decimal places (default: 0)
 * @returns {Object} Formatted statistics
 */
export function formatRequirementStats(stats, precision = 0) {
  const round = (num) => {
    if (precision === 0) {
      return Math.round(num);
    }
    return Number(num.toFixed(precision));
  };

  return {
    monSat: round(stats.monSat),
    sun: round(stats.sun),
    avgDuty: round(stats.avgDuty),
    nonPlatform: round(stats.nonPlatform),
    total: round(stats.total),
    wOff: round(stats.wOff),
    pl: round(stats.pl),
    cl: round(stats.cl),
    sl: round(stats.sl),
    totalLeaves: round(stats.totalLeaves),
    others: round(stats.others),
    grandTotal: round(stats.grandTotal)
  };
}

/**
 * Normalize text for pattern matching
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract non-platform and other duties from other duties data
 * @param {Array} otherDutiesData - Array of other duties entries
 * @param {string} type - 'driver' or 'conductor'
 * @returns {Object} { nonPlatform, others }
 */
export function extractDutiesForType(otherDutiesData, type) {
  let nonPlatform = 0;
  let others = 0;

  if (!otherDutiesData || otherDutiesData.length === 0) {
    return { nonPlatform, others };
  }

  otherDutiesData.forEach(entry => {
    const normalized = normalizeText(entry.platformName);
    const isTargetType = normalized.includes(type.toLowerCase());

    if (!isTargetType) return;

    // Check for non-platform
    if (normalized.includes('non') && normalized.includes('platform')) {
      nonPlatform += entry.totalValue || 0;
    }
    // Check for other duties
    else if (normalized.includes('other') && (normalized.includes('duties') || normalized.includes('duty'))) {
      others += entry.totalValue || 0;
    }
  });

  return { nonPlatform, others };
}
