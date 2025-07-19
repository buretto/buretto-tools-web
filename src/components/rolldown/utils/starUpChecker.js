/**
 * Utility functions for checking if star-up combinations are possible
 * Used to determine if shop purchases should bypass bench full restrictions
 */

/**
 * Checks if a shop unit can create a star-up combination with existing units
 * @param {Object} shopUnit - The unit from the shop
 * @param {Array} benchUnits - Array of units on the bench
 * @param {Array} boardUnits - Array of units on the board
 * @returns {boolean} - True if a star-up combination is possible
 */
export function canCreateStarUpCombination(shopUnit, benchUnits = [], boardUnits = []) {
  if (!shopUnit || !shopUnit.id) return false
  
  // Combine all existing units (bench and board)
  const allExistingUnits = [...benchUnits, ...boardUnits].filter(unit => unit !== null && unit !== undefined)
  
  // Count units by ID and star level
  const unitCounts = {}
  
  // Count existing units
  allExistingUnits.forEach(unit => {
    if (unit && unit.id === shopUnit.id) {
      const key = `${unit.id}_${unit.stars || 1}`
      unitCounts[key] = (unitCounts[key] || 0) + 1
    }
  })
  
  // Add the shop unit to the count
  const shopUnitKey = `${shopUnit.id}_${shopUnit.stars || 1}`
  unitCounts[shopUnitKey] = (unitCounts[shopUnitKey] || 0) + 1
  
  // Check if any star level can form a combination (3+ units)
  for (const [key, count] of Object.entries(unitCounts)) {
    if (count >= 3) {
      return true
    }
  }
  
  return false
}

/**
 * Checks if a specific unit type exists on the player's bench or board
 * @param {string} unitId - The ID of the unit to check for
 * @param {Array} benchUnits - Array of units on the bench
 * @param {Array} boardUnits - Array of units on the board
 * @returns {boolean} - True if the unit exists on bench or board
 */
export function hasUnitOnBenchOrBoard(unitId, benchUnits = [], boardUnits = []) {
  if (!unitId) return false
  
  const allUnits = [...benchUnits, ...boardUnits].filter(unit => unit !== null && unit !== undefined)
  
  return allUnits.some(unit => unit && unit.id === unitId)
}

/**
 * Gets detailed information about potential star-up combinations for a shop unit
 * @param {Object} shopUnit - The unit from the shop
 * @param {Array} benchUnits - Array of units on the bench
 * @param {Array} boardUnits - Array of units on the board
 * @returns {Object} - Detailed combination information
 */
export function getStarUpCombinationInfo(shopUnit, benchUnits = [], boardUnits = []) {
  if (!shopUnit || !shopUnit.id) {
    return {
      canCombine: false,
      hasUnitOnBoard: false,
      unitCounts: {},
      wouldCreateCombination: false
    }
  }
  
  const allExistingUnits = [...benchUnits, ...boardUnits].filter(unit => unit !== null && unit !== undefined)
  
  // Count units by ID and star level
  const unitCounts = {}
  
  allExistingUnits.forEach(unit => {
    if (unit && unit.id === shopUnit.id) {
      const key = `${unit.id}_${unit.stars || 1}`
      unitCounts[key] = (unitCounts[key] || 0) + 1
    }
  })
  
  // Check if the unit exists on bench or board
  const hasUnitOnBoard = hasUnitOnBenchOrBoard(shopUnit.id, benchUnits, boardUnits)
  
  // Add shop unit to count
  const shopUnitKey = `${shopUnit.id}_${shopUnit.stars || 1}`
  const countWithShopUnit = { ...unitCounts }
  countWithShopUnit[shopUnitKey] = (countWithShopUnit[shopUnitKey] || 0) + 1
  
  // Check if adding this shop unit would create a combination
  const wouldCreateCombination = Object.values(countWithShopUnit).some(count => count >= 3)
  
  return {
    canCombine: wouldCreateCombination,
    hasUnitOnBoard,
    unitCounts,
    wouldCreateCombination
  }
}

/**
 * Determines highlighting type for a shop unit
 * @param {Object} shopUnit - The unit from the shop
 * @param {Array} benchUnits - Array of units on the bench
 * @param {Array} boardUnits - Array of units on the board
 * @returns {string} - Highlighting type: 'combination', 'owned', 'none'
 */
export function getShopUnitHighlightType(shopUnit, benchUnits = [], boardUnits = []) {
  const info = getStarUpCombinationInfo(shopUnit, benchUnits, boardUnits)
  
  if (info.canCombine) {
    return 'combination' // Strong highlight for star-up combinations
  } else if (info.hasUnitOnBoard) {
    return 'owned' // Subtle highlight for units already owned
  }
  
  return 'none' // No highlighting
}