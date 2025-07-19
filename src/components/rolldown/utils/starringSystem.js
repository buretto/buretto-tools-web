/**
 * TFT Starring System Logic
 * Handles unit combining, star counting, and related mechanics
 */

/**
 * Combines units into higher star levels
 * @param {Array} units - Array of all units (bench + board)
 * @param {Function} onUnitsRemoved - Callback when units are removed for combining
 * @returns {Object} - { newUnits: [], combinedUnits: [] }
 */
export const combineUnits = (units, onUnitsRemoved = null) => {
  // Count units by ID
  const unitCounts = {}
  const unitsByLocation = {}
  
  units.forEach((unit, index) => {
    if (!unit || !unit.id) return
    
    const key = unit.id
    if (!unitCounts[key]) {
      unitCounts[key] = []
      unitsByLocation[key] = { bench: [], board: [] }
    }
    
    const unitWithIndex = { ...unit, originalIndex: index }
    unitCounts[key].push(unitWithIndex)
    
    // Track location for removal
    if (unit.location === 'bench' || unit.benchIndex !== undefined) {
      unitsByLocation[key].bench.push(unitWithIndex)
    } else {
      unitsByLocation[key].board.push(unitWithIndex)
    }
  })
  
  const newUnits = [...units]
  const combinedUnits = []
  
  // Process each unit type
  Object.entries(unitCounts).forEach(([unitId, unitList]) => {
    let unitsToProcess = [...unitList]
    
    // Group by star level
    const starLevels = {}
    unitsToProcess.forEach(unit => {
      const stars = unit.stars || 1
      if (!starLevels[stars]) {
        starLevels[stars] = []
      }
      starLevels[stars].push(unit)
    })
    
    // Combine from lowest star level up
    for (let starLevel = 1; starLevel <= 3; starLevel++) {
      const unitsAtLevel = starLevels[starLevel] || []
      
      while (unitsAtLevel.length >= 3 && starLevel < 4) {
        // Take 3 units to combine
        const unitsToRemove = unitsAtLevel.splice(0, 3)
        
        // Create the upgraded unit (use first unit as base)
        const baseUnit = unitsToRemove[0]
        const upgradedUnit = {
          ...baseUnit,
          stars: starLevel + 1,
          placedAt: Date.now(), // Update timestamp
        }
        
        // Remove the 3 units from their locations
        unitsToRemove.forEach(unit => {
          newUnits[unit.originalIndex] = null
        })
        
        // Add the upgraded unit to the first available position
        let placed = false
        for (let i = 0; i < newUnits.length; i++) {
          if (newUnits[i] === null) {
            newUnits[i] = upgradedUnit
            placed = true
            break
          }
        }
        
        // If we couldn't place it, add to end (shouldn't happen in normal cases)
        if (!placed) {
          newUnits.push(upgradedUnit)
        }
        
        combinedUnits.push({
          unitId,
          fromStars: starLevel,
          toStars: starLevel + 1,
          removedUnits: unitsToRemove,
          newUnit: upgradedUnit
        })
        
        // Add the new unit to the next star level for potential further combining
        if (!starLevels[starLevel + 1]) {
          starLevels[starLevel + 1] = []
        }
        starLevels[starLevel + 1].push(upgradedUnit)
        
        // Callback for analytics/effects
        if (onUnitsRemoved) {
          onUnitsRemoved(unitsToRemove, upgradedUnit)
        }
      }
    }
  })
  
  return {
    newUnits: newUnits.filter(unit => unit !== null),
    combinedUnits
  }
}

/**
 * Calculate the sell value of a unit with new pricing rules
 * @param {Object} unit - The unit to sell
 * @returns {number} - Sell value in gold
 */
export const calculateSellValue = (unit) => {
  if (!unit) return 0
  
  const cost = unit.cost || 1
  const stars = unit.stars || 1
  
  // Calculate the purchase cost (what the unit was bought for)
  const purchaseCost = cost * stars * stars
  
  // ALL 1-star units sell for their full purchase cost (no penalty)
  if (stars === 1) {
    return purchaseCost // Full value for all 1-star units
  }
  
  // Multi-star units have a 1 gold sell back penalty
  return Math.max(1, purchaseCost - 1)
}

/**
 * Get the visual size multiplier for a unit based on star level
 * @param {number} stars - Star level (1-4)
 * @returns {number} - Size multiplier
 */
export const getStarSizeMultiplier = (stars) => {
  switch (stars) {
    case 1: return 1.0
    case 2: return 1.1  // 10% bigger
    case 3: return 1.21 // 10% bigger again (1.1 * 1.1)
    case 4: return 1.33 // 10% bigger again (1.21 * 1.1)
    default: return 1.0
  }
}

/**
 * Get the CSS class for star styling
 * @param {number} stars - Star level (1-4)
 * @returns {string} - CSS class name
 */
export const getStarCssClass = (stars) => {
  switch (stars) {
    case 2: return 'unit-2-star'
    case 3: return 'unit-3-star'
    case 4: return 'unit-4-star'
    default: return ''
  }
}

/**
 * Get star icon data for rendering
 * @param {number} stars - Star level (1-4)
 * @returns {Object} - { show: boolean, count: number, color: string, shape: string }
 */
export const getStarIconData = (stars) => {
  switch (stars) {
    case 2:
      return {
        show: true,
        count: 2,
        color: '#C0C0C0', // Silver
        shape: 'diamond'
      }
    case 3:
      return {
        show: true,
        count: 3,
        color: '#FFD700', // Gold
        shape: 'diamond'
      }
    case 4:
      return {
        show: true,
        count: 4,
        color: '#9ACD32', // Platinum green for max tier
        shape: 'diamond'
      }
    default:
      return {
        show: false,
        count: 1,
        color: '',
        shape: ''
      }
  }
}