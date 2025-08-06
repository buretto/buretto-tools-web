/**
 * Set Detection Utility - Detects TFT set number from patch version data
 */

import { fetchWithFallback } from './networkUtils'

/**
 * Detects the TFT set number from a given patch version
 * @param {string} version - Patch version (e.g., "15.15.1")
 * @returns {Promise<{setNumber: number, setName: string}>} Set information
 */
export const detectSetFromVersion = async (version) => {
  try {
    // Fetch champion data to extract set information
    const championUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/tft-champion.json`
    
    const fallbackFn = () => {
      // Default fallback to Set 14 if we can't determine the set
      console.warn(`Could not determine set for version ${version}, defaulting to Set 14`)
      return { setNumber: 14, setName: 'TFTSet14' }
    }
    
    const championData = await fetchWithFallback(
      championUrl,
      fallbackFn,
      `champion data for ${version}`,
      true // This is a major failure - important for set detection
    )
    
    // If we got the fallback object, return it directly
    if (championData && typeof championData === 'object' && championData.setNumber) {
      return championData
    }
    
    // Extract set information from champion data
    const setInfo = extractSetFromChampionData(championData)
    
    if (setInfo) {
      console.log(`Detected ${setInfo.setName} (Set ${setInfo.setNumber}) for version ${version}`)
      return setInfo
    }
    
    throw new Error('Could not extract set information from champion data')
    
  } catch (error) {
    console.warn('Failed to detect set from version:', error)
    // Fallback to Set 14
    return { setNumber: 14, setName: 'TFTSet14' }
  }
}

/**
 * Extracts set information from champion data by analyzing asset paths
 * @param {Object} championData - TFT champion data from Data Dragon
 * @returns {Object|null} Set information or null if not found
 */
const extractSetFromChampionData = (championData) => {
  if (!championData || !championData.data) {
    console.warn('Invalid champion data structure:', championData)
    return null
  }
  
  const setNumbers = new Set()
  
  // Look through all champion keys for set information (e.g., "Maps/Shipping/Map22/Sets/TFTSet15/Shop/TFT15_Aatrox")
  Object.keys(championData.data).forEach(championKey => {
    // Check the champion key path for TFTSet patterns
    const keySetMatches = championKey.match(/TFTSet(\d+)/gi)
    if (keySetMatches) {
      keySetMatches.forEach(match => {
        const setNum = parseInt(match.replace(/TFTSet/i, ''))
        if (!isNaN(setNum)) {
          setNumbers.add(setNum)
        }
      })
    }
    
    // Also check the champion data itself
    const champion = championData.data[championKey]
    
    // Check champion ID for set patterns (e.g., "TFT15_Aatrox")
    if (champion.id) {
      const idSetMatches = champion.id.match(/TFT(\d+)_/gi)
      if (idSetMatches) {
        idSetMatches.forEach(match => {
          const setNum = parseInt(match.replace(/TFT(\d+)_/gi, '$1'))
          if (!isNaN(setNum)) {
            setNumbers.add(setNum)
          }
        })
      }
    }
    
    // Check image file names for set patterns (e.g., "TFT15_Aatrox.TFT_Set15.png")
    if (champion.image?.full) {
      const imageSetMatches = champion.image.full.match(/TFT(?:_Set)?(\d+)|TFT(\d+)_/gi)
      if (imageSetMatches) {
        imageSetMatches.forEach(match => {
          // Handle both "TFT_Set15" and "TFT15_" patterns
          const setNum = parseInt(match.replace(/TFT(?:_Set)?(\d+)|TFT(\d+)_/gi, '$1$2'))
          if (!isNaN(setNum)) {
            setNumbers.add(setNum)
          }
        })
      }
    }
  })
  
  // If we found set numbers, choose the highest one (current set)
  if (setNumbers.size > 0) {
    const currentSet = Math.max(...Array.from(setNumbers))
    console.log(`🎯 Found set numbers: [${Array.from(setNumbers).sort().join(', ')}], selected: ${currentSet}`)
    
    return {
      setNumber: currentSet,
      setName: `TFTSet${currentSet}`
    }
  }
  
  console.warn('No set numbers found in champion data. Sample keys:', Object.keys(championData.data).slice(0, 3))
  
  return null
}

/**
 * Checks if a set's data is already cached/extracted
 * @param {number} setNumber - Set number to check
 * @returns {boolean} True if set data exists
 */
export const isSetDataCached = (setNumber) => {
  // Check if we have bundled data for this set
  if (setNumber === 14) {
    return true // We have Set 14 bundled
  }
  
  // Check if we have extracted data in cache
  try {
    const cachedKey = `tft_extracted_set_${setNumber}`
    const cached = localStorage.getItem(cachedKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Set data is cached indefinitely since it doesn't change for a given set number
      return true
    }
  } catch (error) {
    console.error('Error checking cached set data:', error)
  }
  
  return false
}

/**
 * Maps version to appropriate set information with caching
 * @param {string} version - Game version
 * @returns {Promise<Object>} Set information
 */
export const getSetInfoFromVersion = async (version) => {
  // Check if we have cached set info for this version
  const cacheKey = `tft_version_set_${version}`
  
  try {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      // Version-to-set mappings are cached indefinitely
      return parsed.setInfo
    }
  } catch (error) {
    console.error('Error reading cached set info:', error)
  }
  
  // Detect set from version
  const setInfo = await detectSetFromVersion(version)
  
  // Cache the result
  try {
    const cacheEntry = {
      setInfo,
      timestamp: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
  } catch (error) {
    console.error('Error caching set info:', error)
  }
  
  return setInfo
}