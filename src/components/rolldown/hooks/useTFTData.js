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
import staticTeamplannerData from '../data/tftchampions-teamplanner-15.13.json'
import { fetchWithFallback } from '../utils/networkUtils'
import { getVersionToUse, shouldUseBundledData, getSetInfoFromVersion } from '../utils/versionDetector'
import { getBundledShopOdds } from '../data/bundledShopOdds'

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

// Helper function to fetch teamplanner data from Community Dragon
const fetchTeamplannerData = async (version) => {
  // Use specific version for Set 14 (15.13), latest for newer versions
  const cdVersion = version === '15.13.1' ? '15.13' : (version.includes('15.') ? 'latest' : version.split('.').slice(0, 2).join('.'))
  const teamplannerUrl = `https://raw.communitydragon.org/${cdVersion}/plugins/rcp-be-lol-game-data/global/default/v1/tftchampions-teamplanner.json`
  
  // Fallback function for bundled data (only available for Set 14)
  const fallbackFn = () => {
    if (version === '15.13.1') {
      return staticTeamplannerData
    }
    throw new Error(`No bundled teamplanner data available for version ${version}`)
  }
  
  return fetchWithFallback(teamplannerUrl, fallbackFn, 'teamplanner data', true)
}

// Helper function to fetch data from dual sources with smart network handling
const fetchTFTData = async (version, networkFailed = false) => {
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
      
      // If network failed or we're in offline mode, skip all network requests
      const shouldSkipNetwork = networkFailed || shouldUseBundledData(version)
      
      if (shouldSkipNetwork) {
        console.log('⚡ Using fully bundled Set 14 data (no network requests)')
        const [set14Data, shopOddsData, teamplannerData] = await Promise.all([
          loadSet14Data(version),
          Promise.resolve({ // Use bundled shop odds immediately
            shopOdds: getBundledShopOdds().shopOdds,
            unitPoolSizes: getBundledShopOdds().unitPoolSizes
          }),
          Promise.resolve(staticTeamplannerData) // Use bundled teamplanner data
        ])
        
        if (set14Data) {
          return {
            ...set14Data,
            gameData: {
              shopOdds: shopOddsData.shopOdds,
              unitPoolSizes: shopOddsData.unitPoolSizes
            },
            teamplannerData,
            dataSources: {
              cdragon: true,
              shopOdds: true, // We have bundled data
              teamplanner: true // We have bundled data
            }
          }
        }
      } else {
        // Try network requests for Set 14 supplementary data
        const [set14Data, shopOddsData, teamplannerData] = await Promise.all([
          loadSet14Data(version),
          fetchShopOdds(version),
          fetchTeamplannerData(version)
        ])
        
        if (set14Data) {
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
          teamplannerData,
          dataSources: {
            cdragon: true,
            shopOdds: !!shopOddsData,
            teamplanner: !!teamplannerData
          }
        }
      }
    }
    
    // For other sets, use CDragon API (skip if network failed)
    if (networkFailed) {
      console.log('⚠️ Network failed - cannot fetch data for non-bundled version:', version)
      throw new Error('Network unavailable for non-bundled version')
    }
    
    console.log(`Fetching CDragon data for ${setName}...`)
    const [shopOddsData, cdragonData, teamplannerData] = await Promise.all([
      fetchShopOdds(version), // Data Dragon shop odds (with bundled fallback)
      fetchCDragonData().catch(() => null), // CDragon game data (no bundled fallback yet)
      fetchTeamplannerData(version) // Community Dragon teamplanner data (with bundled fallback)
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
      teamplannerData,
      dataSources: {
        cdragon: !!currentSetData,
        shopOdds: !!shopOddsData,
        teamplanner: !!teamplannerData
      },
      gameData: {
        shopOdds,
        unitPoolSizes
      }
    }
    
    }
  }
   catch (error) {
    console.error(`Error fetching TFT data for version ${version}:`, error)
    // Final fallback to static data
    return getStaticFallbackData()
  }
}

export const useTFTData = (initialVersion = null) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentVersion, setCurrentVersion] = useState('15.13.1') // Start with Set 14 as default
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
      
      // Fetch from API if not cached (pass network status)
      const networkFailed = window.tftNetworkFailed || false
      const freshData = await fetchTFTData(version, networkFailed)
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
  
  // Load initial version - try latest first, fallback to bundled
  useEffect(() => {
    const initializeData = async () => {
      try {
        const { version: versionToUse, networkFailed } = await getVersionToUse(initialVersion)
        console.log(`Initializing TFT data with version: ${versionToUse}`)
        
        // Store network status for the loadVersion function
        window.tftNetworkFailed = networkFailed
        
        loadVersion(versionToUse)
      } catch (error) {
        console.error('Failed to determine initial version:', error)
        // Final fallback to Set 14
        window.tftNetworkFailed = true
        loadVersion('15.13.1')
      }
    }
    
    initializeData()
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