// Shop Odds Fetcher from Data Dragon API
// Fetches real-time shop drop rates and unit pool data

import { fetchWithFallback } from './networkUtils'
import { getBundledShopOdds, hasBundledShopOdds } from '../data/bundledShopOdds'

const SHOP_ODDS_CACHE = new Map()
const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour cache

/**
 * Fetches shop odds data from Data Dragon API with bundled fallback
 */
export const fetchShopOdds = async (version) => {
  const cacheKey = `shop_odds_${version}`
  
  // Check cache first
  if (SHOP_ODDS_CACHE.has(cacheKey)) {
    const cached = SHOP_ODDS_CACHE.get(cacheKey)
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.data
    }
  }
  
  // Fallback function for bundled data
  const fallbackFn = () => {
    if (hasBundledShopOdds(version)) {
      return getBundledShopOdds()
    }
    throw new Error(`No bundled shop odds available for version ${version}`)
  }
  
  try {
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/tft-shop-drop-rates-data.json`
    
    // Use fetchWithFallback for automatic timeout and offline mode handling  
    const processedData = await fetchWithFallback(
      url,
      fallbackFn,
      'shop odds',
      true // Major failure - triggers circuit breaker
    ).then(data => {
      // If data is already processed (from fallback), return as-is
      if (data && (data.shopOdds || data.unitPoolSizes)) {
        return data
      }
      // Otherwise, process the raw network data
      return processShopOddsData(data)
    })
    
    // Cache the processed data
    SHOP_ODDS_CACHE.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    })
    
    return processedData
  } catch (error) {
    console.warn(`Failed to fetch shop odds for version ${version}:`, error)
    return null
  }
}

/**
 * Processes raw shop odds data into a usable format
 */
const processShopOddsData = (rawData) => {
  const processed = {
    shopOdds: {},
    unitPoolSizes: {},
    version: rawData.version || 'unknown'
  }
  
  // Process shop odds by level
  if (rawData.shopOdds) {
    Object.entries(rawData.shopOdds).forEach(([level, odds]) => {
      processed.shopOdds[parseInt(level)] = odds
    })
  }
  
  // Process unit pool sizes
  if (rawData.unitPoolSizes) {
    Object.entries(rawData.unitPoolSizes).forEach(([cost, poolSize]) => {
      processed.unitPoolSizes[parseInt(cost)] = poolSize
    })
  }
  
  return processed
}

/**
 * Gets shop odds for a specific level with fallback
 */
export const getShopOddsForLevel = async (version, level, fallbackOdds = null) => {
  const shopOddsData = await fetchShopOdds(version)
  
  if (shopOddsData?.shopOdds?.[level]) {
    return shopOddsData.shopOdds[level]
  }
  
  // Return fallback odds if API data unavailable
  return fallbackOdds
}

/**
 * Gets unit pool size for a specific cost tier
 */
export const getUnitPoolSizeForCost = async (version, cost, fallbackSize = 0) => {
  const shopOddsData = await fetchShopOdds(version)
  
  if (shopOddsData?.unitPoolSizes?.[cost]) {
    return shopOddsData.unitPoolSizes[cost]
  }
  
  return fallbackSize
}

/**
 * Tests if shop odds API is accessible for a version
 */
export const testShopOddsAPI = async (version) => {
  try {
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/tft-shop-drop-rates-data.json`
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch (error) {
    return false
  }
}

/**
 * Clears shop odds cache
 */
export const clearShopOddsCache = () => {
  SHOP_ODDS_CACHE.clear()
}

/**
 * Gets cache statistics
 */
export const getShopOddsCacheStats = () => {
  return {
    cached: SHOP_ODDS_CACHE.size,
    entries: Array.from(SHOP_ODDS_CACHE.keys())
  }
}