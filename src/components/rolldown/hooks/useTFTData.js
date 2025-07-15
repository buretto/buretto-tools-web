import { useState, useEffect, useCallback } from 'react'
import { generateDirectImageUrl } from '../utils/imageLoader'
import { fetchShopOdds } from '../utils/shopOddsFetcher'
import { getShopOdds, getUnitPoolSize, getSetFromVersion } from '../data/shopOdds'
import { 
  fetchCDragonData, 
  getCurrentSetData, 
  parseTraits, 
  parseChampions, 
  parseAugments,
  createChampionTraitRelationships,
  loadSet14Data
} from '../utils/cdragonParser'
import { getStaticFallbackData, shouldUseStaticFallback } from '../data/staticFallback'

const BASE_URL = 'https://ddragon.leagueoflegends.com/cdn'
const CACHE_PREFIX = 'tft_data_'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Helper function to get cached data
const getCachedData = (version) => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${version}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
        return parsed.data
      }
    }
  } catch (error) {
    console.error('Error reading cached data:', error)
  }
  return null
}

// Helper function to set cached data
const setCachedData = (version, data) => {
  try {
    const cacheEntry = {
      data,
      timestamp: Date.now()
    }
    localStorage.setItem(`${CACHE_PREFIX}${version}`, JSON.stringify(cacheEntry))
  } catch (error) {
    console.error('Error caching data:', error)
  }
}

// Helper function to get all cached versions
const getCachedVersions = () => {
  try {
    const versions = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        const version = key.substring(CACHE_PREFIX.length)
        const cached = localStorage.getItem(key)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
            versions.push(version)
          }
        }
      }
    }
    return versions.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
  } catch (error) {
    console.error('Error getting cached versions:', error)
    return []
  }
}

// Helper function to fetch data from dual sources
const fetchTFTData = async (version) => {
  try {
    // Check if we should use static fallback
    if (shouldUseStaticFallback(version)) {
      console.log('Using static fallback data for version:', version)
      return getStaticFallbackData()
    }
    
    // Determine set name from version
    const setId = getSetFromVersion(version)
    const setName = `Set${setId.replace('set', '')}`
    
    // Check if this is Set 14 - use local setData-14.json
    if (setName === 'Set14') {
      console.log('Detected Set 14, using local setData-14.json...')
      const set14Data = await loadSet14Data(version)
      
      if (set14Data) {
        // Fetch shop odds separately
        const shopOddsData = await fetchShopOdds(version).catch(() => null)
        
        // Add shop odds to the set data
        let shopOdds = {}
        let unitPoolSizes = {}
        
        if (shopOddsData) {
          shopOdds = shopOddsData.shopOdds || {}
          unitPoolSizes = shopOddsData.unitPoolSizes || {}
        } else {
          // Fallback to static shop odds
          for (let level = 1; level <= 11; level++) {
            shopOdds[level] = getShopOdds(setId, version, level)
          }
          for (let cost = 1; cost <= 6; cost++) {
            unitPoolSizes[cost] = getUnitPoolSize(setId, cost)
          }
        }
        
        return {
          ...set14Data,
          gameData: {
            shopOdds,
            unitPoolSizes
          },
          dataSources: {
            cdragon: true,
            shopOdds: !!shopOddsData
          }
        }
      }
    }
    
    // For other sets, use CDragon API
    const [shopOddsData, cdragonData] = await Promise.all([
      fetchShopOdds(version).catch(() => null), // Data Dragon shop odds
      fetchCDragonData().catch(() => null) // CDragon game data
    ])
    
    // Get current set data from CDragon
    const currentSetData = cdragonData ? getCurrentSetData(cdragonData, setName) : null
    
    let champions = {}
    let traits = {}
    let augments = {}
    let championTraitRelationships = {}
    
    if (currentSetData) {
      // Parse CDragon data
      champions = parseChampions(currentSetData)
      traits = parseTraits(currentSetData)
      augments = parseAugments(currentSetData)
      championTraitRelationships = createChampionTraitRelationships(champions, traits)
      
      // Add image URLs to champions and traits
      Object.keys(champions).forEach(championId => {
        champions[championId].imageUrl = generateDirectImageUrl(version, championId, 'champion')
      })
      
      Object.keys(traits).forEach(traitId => {
        traits[traitId].imageUrl = generateDirectImageUrl(version, traitId, 'trait')
      })
    } else {
      // If CDragon data unavailable, use static fallback
      console.warn('CDragon data unavailable, falling back to static data')
      return getStaticFallbackData()
    }
    
    // Get shop odds (try Data Dragon first, fallback to static)
    let shopOdds = {}
    let unitPoolSizes = {}
    
    if (shopOddsData) {
      shopOdds = shopOddsData.shopOdds || {}
      unitPoolSizes = shopOddsData.unitPoolSizes || {}
    } else {
      // Fallback to static shop odds
      for (let level = 1; level <= 11; level++) {
        shopOdds[level] = getShopOdds(setId, version, level)
      }
      for (let cost = 1; cost <= 6; cost++) {
        unitPoolSizes[cost] = getUnitPoolSize(setId, cost)
      }
    }
    
    return {
      champions,
      traits,
      augments,
      championTraitRelationships,
      version,
      setId,
      setName,
      cached: false,
      dataSources: {
        cdragon: !!currentSetData,
        shopOdds: !!shopOddsData
      },
      gameData: {
        shopOdds,
        unitPoolSizes
      }
    }
  } catch (error) {
    console.error(`Error fetching TFT data for version ${version}:`, error)
    // Final fallback to static data
    return getStaticFallbackData()
  }
}

export const useTFTData = (initialVersion = '15.13.1') => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(initialVersion)
  const [cachedVersions, setCachedVersions] = useState([])
  const [preloadingSprites, setPreloadingSprites] = useState(false)
  
  // Update cached versions list
  const updateCachedVersions = useCallback(() => {
    setCachedVersions(getCachedVersions())
  }, [])
  
  // Load data for a specific version
  const loadVersion = useCallback(async (version) => {
    setLoading(true)
    setError(null)
    
    try {
      // Try to get cached data first
      const cachedData = getCachedData(version)
      if (cachedData) {
        setData({ ...cachedData, cached: true })
        setCurrentVersion(version)
        setLoading(false)
        return
      }
      
      // Fetch from API if not cached
      const freshData = await fetchTFTData(version)
      setCachedData(version, freshData)
      setData(freshData)
      setCurrentVersion(version)
      updateCachedVersions()
      
      // Note: No sprite preloading needed since we're using direct image URLs
      
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [updateCachedVersions])
  
  // Initialize cached versions on mount
  useEffect(() => {
    updateCachedVersions()
  }, [updateCachedVersions])
  
  // Load initial version
  useEffect(() => {
    loadVersion(initialVersion)
  }, [loadVersion, initialVersion])
  
  // Clear cache for a specific version
  const clearCache = useCallback((version) => {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${version}`)
      updateCachedVersions()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }, [updateCachedVersions])
  
  // Clear all cache
  const clearAllCache = useCallback(() => {
    try {
      const keys = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_PREFIX)) {
          keys.push(key)
        }
      }
      keys.forEach(key => localStorage.removeItem(key))
      updateCachedVersions()
    } catch (error) {
      console.error('Error clearing all cache:', error)
    }
  }, [updateCachedVersions])
  
  return {
    data,
    loading,
    error,
    currentVersion,
    cachedVersions,
    preloadingSprites,
    loadVersion,
    clearCache,
    clearAllCache
  }
}