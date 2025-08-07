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
import { getVersionToUse, shouldUseBundledData } from '../utils/versionDetector'
import { getBundledShopOdds } from '../data/bundledShopOdds'
import { getSetInfoFromVersion as detectSetInfo } from '../utils/setDetector'
import { extractSetData, getCachedSetData, isSetDataCached, downloadSetImages } from '../utils/runtimeExtractor'

const BASE_URL = 'https://ddragon.leagueoflegends.com/cdn'
const CACHE_PREFIX = 'tft_data_'
const SHOP_ODDS_CACHE_PREFIX = 'tft_shop_odds_'
const TEAMPLANNER_CACHE_PREFIX = 'tft_teamplanner_'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

// Helper function to get cached data
const getCachedData = (version) => {
  try {
    const cached = localStorage.getItem(`${CACHE_PREFIX}${version}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (Date.now() - parsed.timestamp < CACHE_EXPIRY) {
        // Validate that the cached data is actually valid
        if (parsed.data && parsed.data.champions && Object.keys(parsed.data.champions).length > 0) {
          return parsed.data
        } else {
          console.warn(`🗑️ Removing invalid cached data for ${version} (no champions data)`)
          localStorage.removeItem(`${CACHE_PREFIX}${version}`)
          return null
        }
      } else {
        console.log(`🗑️ Cached data for ${version} has expired`)
        localStorage.removeItem(`${CACHE_PREFIX}${version}`)
      }
    }
  } catch (error) {
    console.error('Error reading cached data:', error)
    // Remove corrupted cache entry
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${version}`)
    } catch (removeError) {
      console.error('Error removing corrupted cache:', removeError)
    }
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
    
    // Always include the bundled Set 14 version since it's always available
    const bundledVersion = '15.13.1'
    versions.push(bundledVersion)
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        const version = key.substring(CACHE_PREFIX.length)
        // Skip if this is the bundled version (already added)
        if (version === bundledVersion) {
          continue
        }
        
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
    // Even on error, return the bundled version
    return ['15.13.1']
  }
}

// Helper functions for caching shop odds
const getCachedShopOdds = (version) => {
  try {
    const cached = localStorage.getItem(`${SHOP_ODDS_CACHE_PREFIX}${version}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Shop odds never change for a given patch - cache indefinitely
      return parsed.data
    }
  } catch (error) {
    console.error('Error reading cached shop odds:', error)
  }
  return null
}

const setCachedShopOdds = (version, data) => {
  try {
    const cacheEntry = { data, timestamp: Date.now() }
    localStorage.setItem(`${SHOP_ODDS_CACHE_PREFIX}${version}`, JSON.stringify(cacheEntry))
    console.log(`💾 Cached shop odds for ${version}`)
  } catch (error) {
    console.error('Error caching shop odds:', error)
  }
}

// Helper functions for caching team planner data
const getCachedTeamplanner = (version) => {
  try {
    const cached = localStorage.getItem(`${TEAMPLANNER_CACHE_PREFIX}${version}`)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Team planner data never changes for a given patch - cache indefinitely
      return parsed.data
    }
  } catch (error) {
    console.error('Error reading cached team planner:', error)
  }
  return null
}

const setCachedTeamplanner = (version, data) => {
  try {
    const cacheEntry = { data, timestamp: Date.now() }
    localStorage.setItem(`${TEAMPLANNER_CACHE_PREFIX}${version}`, JSON.stringify(cacheEntry))
    console.log(`💾 Cached team planner for ${version}`)
  } catch (error) {
    console.error('Error caching team planner:', error)
  }
}

// Helper function to convert extracted set data to our app format
const convertExtractedDataToAppFormat = (extractedData, version, setInfo) => {
  try {
    // The extracted data should be in the CDragon format from the runtime extractor
    // It should have been processed by the processSetData function
    
    if (!extractedData) {
      console.warn('No extracted data provided')
      return null
    }
    
    console.log('🔍 Converting extracted data structure:', Object.keys(extractedData))
    console.log('🔍 Extracted data format:', {
      hasChampions: !!extractedData.champions,
      championsType: Array.isArray(extractedData.champions) ? 'array' : typeof extractedData.champions,
      hasTraits: !!extractedData.traits,
      traitsType: Array.isArray(extractedData.traits) ? 'array' : typeof extractedData.traits,
      hasMetadata: !!extractedData.metadata,
      topLevelKeys: Object.keys(extractedData)
    })
    
    // Parse champions from the extracted set data (raw CDragon format)
    const champions = {}
    const championsList = extractedData.champions || []
    const setNumber = setInfo.setNumber
    const realUnitPrefix = `TFT${setNumber}_`
    
    console.log(`🔍 Filtering for real ${setInfo.setName} units with prefix: ${realUnitPrefix}`)
    
    if (Array.isArray(championsList)) {
      console.log('🔍 First few champions structure:', championsList.slice(0, 3).map(c => ({
        keys: Object.keys(c || {}),
        apiName: c?.apiName,
        name: c?.name,
        characterName: c?.characterName
      })))
      
      let realUnits = 0
      let skippedUnits = 0
      
      championsList.forEach((champion, index) => {
        if (champion && champion.apiName) {
          const championId = champion.apiName
          
          // Filter out non-real units: only include units with the set number in their ID
          if (!championId.startsWith(realUnitPrefix)) {
            skippedUnits++
            console.log(`🚫 Skipping non-real unit: ${championId} (${champion.name || champion.characterName})`)
            return
          }
          
          // Additional filter: units must have non-empty traits (empty traits = NPC units)
          if (!champion.traits || !Array.isArray(champion.traits) || champion.traits.length === 0) {
            skippedUnits++
            console.log(`🚫 Skipping NPC unit (no traits): ${championId} (${champion.name || champion.characterName})`)
            return
          }
          
          realUnits++
          champions[championId] = {
            id: championId,
            name: champion.name || champion.characterName || championId,
            cost: champion.cost || 1,
            traits: champion.traits || [],
            stats: champion.stats || {},
            imageUrl: generateDirectImageUrl(version, championId, 'champion')
          }
        } else if (champion) {
          console.warn(`🔍 Champion ${index} missing apiName:`, Object.keys(champion), champion.name || champion.characterName || 'unnamed')
        }
      })
      
      console.log(`✅ Filtered champions: ${realUnits} real units, ${skippedUnits} non-real units skipped`)
    } else if (typeof championsList === 'object' && championsList !== null) {
      // Handle object format (CDragon sometimes uses objects instead of arrays)
      let realUnits = 0
      let skippedUnits = 0
      
      Object.values(championsList).forEach(champion => {
        if (champion && champion.apiName) {
          const championId = champion.apiName
          
          // Filter out non-real units: only include units with the set number in their ID
          if (!championId.startsWith(realUnitPrefix)) {
            skippedUnits++
            console.log(`🚫 Skipping non-real unit: ${championId} (${champion.name || champion.characterName})`)
            return
          }
          
          // Additional filter: units must have non-empty traits (empty traits = NPC units)
          if (!champion.traits || !Array.isArray(champion.traits) || champion.traits.length === 0) {
            skippedUnits++
            console.log(`🚫 Skipping NPC unit (no traits): ${championId} (${champion.name || champion.characterName})`)
            return
          }
          
          realUnits++
          champions[championId] = {
            id: championId,
            name: champion.name || champion.characterName || championId,
            cost: champion.cost || 1,
            traits: champion.traits || [],
            stats: champion.stats || {},
            imageUrl: generateDirectImageUrl(version, championId, 'champion')
          }
        }
      })
      
      console.log(`✅ Filtered champions (object format): ${realUnits} real units, ${skippedUnits} non-real units skipped`)
    }
    
    // Parse traits from the extracted set data (raw CDragon format) 
    const traits = {}
    const traitsList = extractedData.traits || []
    
    console.log(`🔍 Filtering traits for real ${setInfo.setName} traits with prefix: ${realUnitPrefix}`)
    console.log(`🔍 First few traits:`, traitsList.slice(0, 5).map(t => ({
      name: t?.name,
      id: t?.id,
      apiName: t?.apiName,
      effectKeys: t ? Object.keys(t) : [],
      hasEffects: !!t?.effects,
      effectsLength: t?.effects?.length || 0
    })))
    
    let realTraits = 0
    let skippedTraits = 0
    
    traitsList.forEach((trait, index) => {
      if (trait && (trait.name || trait.id || trait.apiName)) {
        // Traits use apiName like champions, not name/id
        const traitId = trait.apiName || trait.name || trait.id
        
        // Filter out non-real traits: only include traits with the set number in their ID
        if (!traitId.startsWith(realUnitPrefix)) {
          skippedTraits++
          // Log first few skipped traits to see the pattern
          if (skippedTraits <= 5) {
            console.log(`🚫 Skipping non-real trait: ${traitId}`)
          }
          return
        }
        
        realTraits++
        
        // Convert effects to breakpoints format (same logic as setDataTransformer but generic)
        const breakpoints = trait.effects?.map(effect => ({
          minUnits: effect.minUnits,
          maxUnits: effect.maxUnits === 25000 ? null : effect.maxUnits,
          style: effect.style, // Keep raw style for now
          variables: effect.variables || {}
        })) || []
        
        traits[traitId] = {
          id: traitId,
          apiName: trait.apiName,
          name: trait.display_name || trait.name || traitId,
          description: trait.description || trait.desc || '',
          effects: trait.effects, // Keep original effects for compatibility
          breakpoints: breakpoints, // Add breakpoints in expected format
          imageUrl: generateDirectImageUrl(version, traitId, 'trait')
        }
        
        if (realTraits <= 5) {
          console.log(`✅ Adding real trait: ${traitId} (${trait.display_name || trait.name || 'unnamed'}) with ${breakpoints.length} breakpoints`)
        }
      }
    })
    
    console.log(`✅ Filtered traits: ${realTraits} real traits, ${skippedTraits} non-real traits skipped`)
    
    console.log(`🔄 Converted extracted data: ${Object.keys(champions).length} champions, ${Object.keys(traits).length} traits`)
    
    return {
      champions,
      traits,
      augments: {}, // TODO: Parse augments if needed
      championTraitRelationships: {}, // TODO: Create relationships
      version,
      setId: `set${setInfo.setNumber}`,
      setName: setInfo.setName,
      cached: true // Mark as cached since it came from localStorage
    }
  } catch (error) {
    console.error('Failed to convert extracted data:', error)
    return null
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
const fetchTFTData = async (version, networkFailed = false, onProgress = null) => {
  console.log('🚀 FETCHDATA START: version=' + version + ', networkFailed=' + networkFailed)
  
  try {
    // Check if we should use static fallback
    if (shouldUseStaticFallback(version)) {
      console.log('Using static fallback data for version:', version)
      return getStaticFallbackData()
    }
    
    // Detect the actual set from the version
    if (onProgress) {
      onProgress({ stage: 'detecting_set', progress: 30, isActive: true })
    }
    
    // Create timeout progress callback to update the main progress during timeout
    const onTimeoutProgress = onProgress ? (timeoutProgress) => {
      // Map timeout progress (0-100) to our stage progress (30-60)
      const mappedProgress = Math.floor(Math.min(30 + (timeoutProgress * 0.3), 60))
      onProgress({ stage: 'detecting_set', progress: mappedProgress, isActive: true })
    } : null
    
    const setInfo = await detectSetInfo(version, onTimeoutProgress)
    const setId = `set${setInfo.setNumber}`
    const setName = setInfo.setName
    
    console.log(`🚀 POST-DETECTION: setInfo.setNumber = ${setInfo.setNumber}`)
    console.log(`🔍 setId = ${setId}, setName = ${setName}`)
    
    console.log(`🔍 ABOUT TO CHECK Set 14 condition: setInfo.setNumber === 14 -> ${setInfo.setNumber === 14}`)
    
    // Check if this is Set 14 - use bundled local setData-14.json
    if (setInfo.setNumber === 14) {
      console.log('✅ ENTERING Set 14 branch')
      console.log('Detected Set 14, using local setData-14.json...')
      
      // If network failed or we're in offline mode, skip all network requests
      console.log(`🔍 Checking shouldSkipNetwork: networkFailed=${networkFailed}`)
      const shouldSkipNetwork = networkFailed || shouldUseBundledData(version)
      console.log(`🔍 shouldSkipNetwork = ${shouldSkipNetwork}`)
      
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
    }
    
    console.log(`🎆 AFTER Set 14 if block - this should always show`)
    console.log(`✅ SKIPPED Set 14 branch, continuing to Set ${setInfo.setNumber} logic`)
    
    // For any other sets (not Set 14), try runtime extraction first
    console.log(`🎯 Detected ${setName} (Set ${setInfo.setNumber}) for version ${version}`)
    console.log(`🔥 ABOUT TO ATTEMPT EXTRACTION for Set ${setInfo.setNumber}`)
    console.log(`🔍 Debug: networkFailed=${networkFailed}, setInfo.setNumber=${setInfo.setNumber}`)
    console.log(`📍 Data loading progress: Successfully detected set, now checking for cached data...`)
    
    if (onProgress) {
      onProgress({ stage: 'downloading', progress: 40, isActive: true })
    }
    
    // Check if we have cached extracted data for this set
    if (isSetDataCached(setInfo.setNumber)) {
      console.log(`Using cached extracted data for Set ${setInfo.setNumber}`)
      if (onProgress) {
        onProgress({ stage: 'loading_cached', progress: 80, isActive: true })
      }
      
      const cachedSetData = getCachedSetData(setInfo.setNumber)
      if (cachedSetData) {
        // Convert cached set data to our expected format
        const convertedData = convertExtractedDataToAppFormat(cachedSetData, version, setInfo)
        
        if (convertedData) {
          // Get shop odds and teamplanner data (with caching)
          let shopOddsData = getCachedShopOdds(version)
          let teamplannerData = getCachedTeamplanner(version)
          
          // Fetch if not cached
          const fetchPromises = []
          if (!shopOddsData) {
            fetchPromises.push(fetchShopOdds(version).catch(() => null))
          } else {
            fetchPromises.push(Promise.resolve(shopOddsData))
          }
          
          if (!teamplannerData) {
            fetchPromises.push(fetchTeamplannerData(version).catch(() => null))
          } else {
            fetchPromises.push(Promise.resolve(teamplannerData))
          }
          
          const [fetchedShopOdds, fetchedTeamplanner] = await Promise.all(fetchPromises)
          
          // Cache newly fetched data
          if (fetchedShopOdds && !shopOddsData) {
            setCachedShopOdds(version, fetchedShopOdds)
            shopOddsData = fetchedShopOdds
          }
          if (fetchedTeamplanner && !teamplannerData) {
            setCachedTeamplanner(version, fetchedTeamplanner)
            teamplannerData = fetchedTeamplanner
          }
          
          if (onProgress) {
            onProgress({ stage: 'complete', progress: 100, isActive: true })
          }
          
          return {
            ...convertedData,
            gameData: {
              shopOdds: shopOddsData?.shopOdds || {},
              unitPoolSizes: shopOddsData?.unitPoolSizes || {}
            },
            teamplannerData,
            dataSources: {
              cdragon: true, // We extracted from CDragon
              shopOdds: !!shopOddsData,
              teamplanner: !!teamplannerData
            }
          }
        }
      }
    }
    
    // Try to extract set data at runtime if not cached (for any set except Set 14 which has bundled data)
    console.log(`🔍 EXTRACTION CONDITIONS: setInfo.setNumber !== 14 (${setInfo.setNumber !== 14})`)
    console.log(`📊 Values: networkFailed=${networkFailed}, setInfo.setNumber=${setInfo.setNumber}`)
    console.log(`🎯 ATTEMPTING extraction regardless of networkFailed status for new sets`)
    
    if (setInfo.setNumber !== 14) {
      try {
        console.log(`🎆 STARTING runtime extraction for Set ${setInfo.setNumber}`)
        console.log(`📍 About to call extractSetData(${setInfo.setNumber}, onProgress)`)
        const extractedData = await extractSetData(setInfo.setNumber, onProgress)
        console.log(`🔍 Runtime extraction result:`, extractedData ? 'SUCCESS' : 'FAILED', extractedData ? Object.keys(extractedData) : 'no data')
        
        if (extractedData) {
          console.log(`✅ Successfully extracted Set ${setInfo.setNumber} data`)
          
          // Convert extracted data to our expected format
          const convertedData = convertExtractedDataToAppFormat(extractedData, version, setInfo)
          
          if (convertedData) {
            // Get shop odds and teamplanner data (with caching)
            let shopOddsData = getCachedShopOdds(version)
            let teamplannerData = getCachedTeamplanner(version)
            
            // Fetch if not cached
            const fetchPromises = []
            if (!shopOddsData) {
              fetchPromises.push(fetchShopOdds(version).catch(() => null))
            } else {
              fetchPromises.push(Promise.resolve(shopOddsData))
            }
            
            if (!teamplannerData) {
              fetchPromises.push(fetchTeamplannerData(version).catch(() => null))
            } else {
              fetchPromises.push(Promise.resolve(teamplannerData))
            }
            
            const [fetchedShopOdds, fetchedTeamplanner] = await Promise.all(fetchPromises)
            
            // Cache newly fetched data
            if (fetchedShopOdds && !shopOddsData) {
              setCachedShopOdds(version, fetchedShopOdds)
              shopOddsData = fetchedShopOdds
            }
            if (fetchedTeamplanner && !teamplannerData) {
              setCachedTeamplanner(version, fetchedTeamplanner)
              teamplannerData = fetchedTeamplanner
            }
            
            return {
              ...convertedData,
              gameData: {
                shopOdds: shopOddsData?.shopOdds || {},
                unitPoolSizes: shopOddsData?.unitPoolSizes || {}
              },
              teamplannerData,
              dataSources: {
                cdragon: true, // We extracted from CDragon
                shopOdds: !!shopOddsData,
                teamplanner: !!teamplannerData
              }
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Runtime extraction failed for Set ${setInfo.setNumber}:`, error)
        // Fall through to existing CDragon logic if not network failed
        if (networkFailed) {
          console.log('⚠️ Network failed and extraction failed - cannot load data for this version')
          throw new Error(`Cannot load Set ${setInfo.setNumber} data: network unavailable and extraction failed`)
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
  } catch (error) {
    console.error(`Error fetching TFT data for version ${version}:`, error)
    // Final fallback to static data
    console.log(`📦 Using static fallback data due to error`)
    return getStaticFallbackData()
  }
}

// Use a ref-like approach that's more reliable than global variables
const initializationState = {
  promise: null,
  completed: false
}

export const useTFTData = (initialVersion = null) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentVersion, setCurrentVersion] = useState('15.13.1') // Start with Set 14 as default
  const [cachedVersions, setCachedVersions] = useState([])
  const [preloadingSprites, setPreloadingSprites] = useState(false)
  const [progress, setProgress] = useState({ isActive: false, stage: null, progress: 0 })
  
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
        // Clear any existing progress when using cached data
        // Use setTimeout to ensure progress state updates properly
        setTimeout(() => setProgress({ isActive: false }), 0)
        console.log(`✅ Using cached data for version ${version}`)
        return
      }
      
      // Only show fetching progress if we need to actually fetch data
      setProgress({ stage: 'fetching_version', progress: 5, isActive: true })
      
      // Fetch from API if not cached (pass network status and progress callback)
      const networkFailed = window.tftNetworkFailed || false
      const freshData = await fetchTFTData(version, networkFailed, setProgress)
      
      // Only cache if we actually got valid data
      if (freshData && freshData.champions && Object.keys(freshData.champions).length > 0) {
        setCachedData(version, freshData)
        setData(freshData)
        setCurrentVersion(version)
        updateCachedVersions()
        console.log(`✅ Successfully loaded and cached data for version ${version}`)
      } else {
        console.warn(`⚠️ Failed to load valid data for version ${version}`, freshData)
        throw new Error(`No valid data received for version ${version}`)
      }
      
      setProgress({ stage: 'complete', progress: 100, isActive: true })
      // Hide progress after a brief delay
      setTimeout(() => {
        setProgress({ isActive: false })
      }, 1500)
      
      // Note: No sprite preloading needed since we're using direct image URLs
      
    } catch (err) {
      setError(err.message)
      setData(null)
      setProgress({ stage: 'error', progress: 0, isActive: true, error: err.message })
      // Hide error progress after a delay
      setTimeout(() => {
        setProgress({ isActive: false })
      }, 3000)
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
    // Skip if already completed or in progress
    if (initializationState.completed || initializationState.promise) {
      if (initializationState.promise) {
        console.log('🔄 Skipping duplicate initialization, using existing promise')
        initializationState.promise.then(({ version, networkFailed }) => {
          window.tftNetworkFailed = networkFailed
          loadVersion(version)
        }).catch(() => {
          // Handle errors gracefully
        })
      }
      return
    }
    
    const initializeData = async () => {
      try {
        const { version: versionToUse, networkFailed } = await getVersionToUse(initialVersion, setProgress)
        console.log(`🚀 Initializing TFT data with version: ${versionToUse}`)
        
        // Store network status for the loadVersion function
        window.tftNetworkFailed = networkFailed
        
        loadVersion(versionToUse)
        return { version: versionToUse, networkFailed }
      } catch (error) {
        console.error('Failed to determine initial version:', error)
        // Final fallback to Set 14
        window.tftNetworkFailed = true
        setProgress({ stage: 'error', progress: 0, isActive: true, error: error.message })
        setTimeout(() => {
          setProgress({ isActive: false })
        }, 3000)
        loadVersion('15.13.1')
        return { version: '15.13.1', networkFailed: true }
      }
    }
    
    // Set and execute initialization
    initializationState.promise = initializeData()
      .finally(() => {
        initializationState.completed = true
        initializationState.promise = null
      })
    
  }, [])
  
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
    progress,
    loadVersion,
    clearCache,
    clearAllCache
  }
}