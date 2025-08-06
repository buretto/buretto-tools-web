/**
 * Bundled shop odds data for offline fallback
 * Contains pre-downloaded shop odds for TFT Set 14 (v15.13.1)
 */

import shopOddsData from './shop-odds-15.13.1.json'

/**
 * Process the bundled shop odds data into the format expected by the app
 * @param {Object} rawData - Raw shop odds data from Data Dragon
 * @returns {Object} Processed shop odds and unit pool data
 */
const processBundledShopOdds = (rawData) => {
  try {
    if (!rawData?.data?.Shop) {
      throw new Error('Invalid shop odds data structure')
    }

    const shopOdds = {}
    const unitPoolSizes = {
      1: 22, // 1-cost champions: 22 copies each
      2: 20, // 2-cost champions: 20 copies each  
      3: 17, // 3-cost champions: 17 copies each
      4: 10, // 4-cost champions: 10 copies each
      5: 9   // 5-cost champions: 9 copies each
    }

    // Convert Data Dragon format to internal format
    rawData.data.Shop.forEach(levelData => {
      const level = levelData.level
      shopOdds[level] = []

      // Convert dropRatesByTier to array format [1-cost%, 2-cost%, 3-cost%, 4-cost%, 5-cost%]
      const ratesMap = {}
      levelData.dropRatesByTier.forEach(tierData => {
        ratesMap[tierData.cost] = tierData.rate
      })

      // Create ordered array for costs 1-5
      for (let cost = 1; cost <= 5; cost++) {
        shopOdds[level].push(ratesMap[cost] || 0)
      }
    })

    return { shopOdds, unitPoolSizes }
  } catch (error) {
    console.error('Error processing bundled shop odds:', error)
    
    // Fallback to hardcoded values if processing fails
    return {
      shopOdds: {
        1: [100, 0, 0, 0, 0],
        2: [100, 0, 0, 0, 0], 
        3: [75, 25, 0, 0, 0],
        4: [55, 30, 15, 0, 0],
        5: [45, 33, 20, 2, 0],
        6: [30, 40, 25, 5, 0],
        7: [19, 30, 40, 10, 1],
        8: [17, 24, 32, 24, 3],
        9: [15, 18, 25, 30, 12],
        10: [5, 10, 20, 40, 25],
        11: [1, 2, 12, 50, 35]
      },
      unitPoolSizes: {
        1: 22,
        2: 20,
        3: 17,
        4: 10,
        5: 9
      }
    }
  }
}

/**
 * Get bundled shop odds for TFT Set 14
 * @returns {Object} Processed shop odds and unit pool data
 */
export const getBundledShopOdds = () => {
  return processBundledShopOdds(shopOddsData)
}

/**
 * Check if bundled shop odds are available for a version
 * @param {string} version - Game version to check
 * @returns {boolean} True if bundled data is available
 */
export const hasBundledShopOdds = (version) => {
  // Currently we only have bundled data for 15.13.1 (Set 14)
  return version === '15.13.1'
}