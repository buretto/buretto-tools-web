// TFT Shop Odds Tables
// Prioritizes Data Dragon API data, falls back to hardcoded data
// Structure: shopOdds[set][version][level] = [1-cost%, 2-cost%, 3-cost%, 4-cost%, 5-cost%, 6-cost%]

import { fetchShopOdds } from '../utils/shopOddsFetcher'

export const SHOP_ODDS = {
  // Set 13 (Into the Arcane)
  set13: {
    '14.24.1': {
      1: [100, 0, 0, 0, 0, 0],
      2: [100, 0, 0, 0, 0, 0],
      3: [75, 25, 0, 0, 0, 0],
      4: [55, 30, 15, 0, 0, 0],
      5: [45, 33, 20, 2, 0, 0],
      6: [35, 35, 25, 5, 0, 0],
      7: [25, 35, 30, 10, 0, 0],
      8: [20, 25, 35, 18, 2, 0],
      9: [15, 20, 30, 30, 5, 0],
      10: [10, 15, 20, 40, 14, 1],
      11: [5, 10, 15, 40, 28, 2]
    },
    default: {
      1: [100, 0, 0, 0, 0, 0],
      2: [100, 0, 0, 0, 0, 0],
      3: [75, 25, 0, 0, 0, 0],
      4: [55, 30, 15, 0, 0, 0],
      5: [45, 33, 20, 2, 0, 0],
      6: [35, 35, 25, 5, 0, 0],
      7: [25, 35, 30, 10, 0, 0],
      8: [20, 25, 35, 18, 2, 0],
      9: [15, 20, 30, 30, 5, 0],
      10: [10, 15, 20, 40, 14, 1],
      11: [5, 10, 15, 40, 28, 2]
    }
  },
  
  // Set 14 (Inkborn Fables) - Placeholder data
  set14: {
    '15.1.1': {
      1: [100, 0, 0, 0, 0, 0],
      2: [100, 0, 0, 0, 0, 0],
      3: [75, 25, 0, 0, 0, 0],
      4: [55, 30, 15, 0, 0, 0],
      5: [45, 33, 20, 2, 0, 0],
      6: [35, 35, 25, 5, 0, 0],
      7: [25, 35, 30, 10, 0, 0],
      8: [20, 25, 35, 18, 2, 0],
      9: [15, 20, 30, 30, 5, 0],
      10: [10, 15, 20, 40, 14, 1],
      11: [5, 10, 15, 40, 28, 2]
    },
    default: {
      1: [100, 0, 0, 0, 0, 0],
      2: [100, 0, 0, 0, 0, 0],
      3: [75, 25, 0, 0, 0, 0],
      4: [55, 30, 15, 0, 0, 0],
      5: [45, 33, 20, 2, 0, 0],
      6: [35, 35, 25, 5, 0, 0],
      7: [25, 35, 30, 10, 0, 0],
      8: [20, 25, 35, 18, 2, 0],
      9: [15, 20, 30, 30, 5, 0],
      10: [10, 15, 20, 40, 14, 1],
      11: [5, 10, 15, 40, 28, 2]
    }
  }
}

// Unit pool sizes per cost tier
export const UNIT_POOL_SIZES = {
  set13: {
    1: 29,
    2: 22,
    3: 18,
    4: 12,
    5: 10,
    6: 8
  },
  set14: {
    1: 30,  // Updated Set 14 pool sizes
    2: 25,
    3: 18,
    4: 10,
    5: 9,
    6: 8    // Keep 6-cost as fallback
  }
}

// XP required for each level
export const XP_REQUIREMENTS = {
  set13: [0, 0, 2, 6, 10, 20, 36, 56, 80, 104, 136, 220],
  set14: [0, 0, 2, 6, 10, 20, 36, 56, 80, 104, 136, 220]
}

/**
 * Gets shop odds for a specific set, version, and level
 * Prioritizes Data Dragon API, falls back to hardcoded data
 */
export const getShopOdds = (set, version, level) => {
  // For static/synchronous usage, return hardcoded data
  const setData = SHOP_ODDS[set]
  if (!setData) return null
  
  const versionData = setData[version] || setData.default
  if (!versionData) return null
  
  return versionData[level] || null
}

/**
 * Gets shop odds with API fallback (async version)
 * Tries Data Dragon API first, then falls back to hardcoded data
 */
export const getShopOddsWithAPI = async (set, version, level) => {
  try {
    // Try to fetch from Data Dragon API first
    const apiData = await fetchShopOdds(version)
    if (apiData?.shopOdds?.[level]) {
      return apiData.shopOdds[level]
    }
  } catch (error) {
    console.warn('Failed to fetch shop odds from API, using fallback:', error)
  }
  
  // Fall back to hardcoded data
  return getShopOdds(set, version, level)
}

/**
 * Gets unit pool size for a specific set and cost tier
 */
export const getUnitPoolSize = (set, cost) => {
  const setData = UNIT_POOL_SIZES[set]
  if (!setData) return 0
  
  return setData[cost] || 0
}

/**
 * Gets unit pool size with API fallback (async version)
 * Tries Data Dragon API first, then falls back to hardcoded data
 */
export const getUnitPoolSizeWithAPI = async (version, cost, set) => {
  try {
    // Try to fetch from Data Dragon API first
    const apiData = await fetchShopOdds(version)
    if (apiData?.unitPoolSizes?.[cost]) {
      return apiData.unitPoolSizes[cost]
    }
  } catch (error) {
    console.warn('Failed to fetch pool sizes from API, using fallback:', error)
  }
  
  // Fall back to hardcoded data
  return getUnitPoolSize(set, cost)
}

/**
 * Gets XP requirement for a specific set and level
 */
export const getXPRequirement = (set, level) => {
  const setData = XP_REQUIREMENTS[set]
  if (!setData) return 0
  
  return setData[level] || 0
}

/**
 * Determines TFT set from version string
 * e.g., "14.24.1" -> "set13", "15.1.1" -> "set14"
 */
export const getSetFromVersion = (version) => {
  const majorVersion = parseInt(version.split('.')[0])
  
  // Version to set mapping based on TFT release schedule
  if (majorVersion >= 15) return 'set14'
  if (majorVersion >= 14) return 'set13'
  if (majorVersion >= 13) return 'set12'
  
  return 'set13' // Default fallback
}

/**
 * Calculates the probability of hitting a specific champion
 * based on current pool state and shop odds
 */
export const calculateChampionProbability = (
  championCost,
  playerLevel,
  currentPoolSize,
  totalPoolSize,
  set,
  version
) => {
  const shopOdds = getShopOdds(set, version, playerLevel)
  if (!shopOdds) return 0
  
  const costTierOdds = shopOdds[championCost - 1] || 0
  const poolProbability = currentPoolSize / totalPoolSize
  
  return (costTierOdds / 100) * poolProbability
}

/**
 * Gets all available sets
 */
export const getAvailableSets = () => {
  return Object.keys(SHOP_ODDS)
}

/**
 * Gets all available versions for a set
 */
export const getAvailableVersions = (set) => {
  const setData = SHOP_ODDS[set]
  if (!setData) return []
  
  return Object.keys(setData).filter(version => version !== 'default')
}