/**
 * Runtime Data Extractor - Extracts and caches TFT set data at runtime
 */

import { fetchWithFallback } from './networkUtils'

const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json'
const CACHE_PREFIX = 'tft_extracted_set_'
// Set data doesn't change for a given set number, so cache indefinitely
// const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours - REMOVED

/**
 * Downloads and extracts set data for a specific set number
 * @param {number} setNumber - Set number to extract (e.g., 15)
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Extracted set data
 */
export const extractSetData = async (setNumber, onProgress = null) => {
  console.log(`🚀 extractSetData called for Set ${setNumber}`)
  
  const reportProgress = (stage, progress = 0) => {
    console.log(`📊 Extraction progress for Set ${setNumber}: ${stage} (${progress}%)`)
    if (onProgress) {
      onProgress({ stage, progress, setNumber })
    }
  }
  
  try {
    reportProgress('downloading', 10)
    console.log(`📥 Downloading full TFT data from: ${TFT_DATA_URL}`)
    
    // Download full TFT data from CommunityDragon
    const fallbackFn = () => {
      console.error(`❌ Cannot extract set ${setNumber} data without network access`)
      throw new Error('Cannot extract set data without network access')
    }
    
    const fullData = await fetchWithFallback(
      TFT_DATA_URL,
      fallbackFn,
      `full TFT data for set ${setNumber} extraction`,
      true
    )
    
    console.log(`📥 Downloaded full data:`, fullData ? Object.keys(fullData) : 'null')
    
    reportProgress('parsing', 40)
    
    // Find the specific set data
    console.log(`🔍 Looking for Set ${setNumber} in downloaded data...`)
    const setData = findSetByNumber(fullData, setNumber)
    console.log(`🔍 Found set data:`, setData ? 'YES' : 'NO', setData ? Object.keys(setData) : 'not found')
    
    if (!setData) {
      throw new Error(`Set ${setNumber} not found in downloaded data`)
    }
    
    reportProgress('processing', 70)
    
    // Process and optimize the set data
    const processedData = processSetData(setData, setNumber)
    
    reportProgress('caching', 90)
    
    // Cache the extracted data
    cacheSetData(setNumber, processedData)
    
    reportProgress('complete', 100)
    
    console.log(`✅ Successfully extracted and cached Set ${setNumber} data`)
    return processedData
    
  } catch (error) {
    console.error(`Failed to extract Set ${setNumber} data:`, error)
    reportProgress('error', 0)
    throw error
  }
}

/**
 * Finds set data by number in the full CommunityDragon data
 * @param {Object} fullData - Full TFT data from CommunityDragon
 * @param {number} setNumber - Set number to find
 * @returns {Object|null} Set data or null if not found
 */
const findSetByNumber = (fullData, setNumber) => {
  if (!fullData.setData || !Array.isArray(fullData.setData)) {
    return null
  }

  return fullData.setData.find(set => 
    set.number === setNumber.toString() || 
    set.number === setNumber ||
    set.mutator === `TFTSet${setNumber}` ||
    set.name === `Set${setNumber}`
  )
}

/**
 * Processes raw set data into the format expected by the application
 * @param {Object} rawSetData - Raw set data from CommunityDragon
 * @param {number} setNumber - Set number for identification
 * @returns {Object} Processed set data
 */
const processSetData = (rawSetData, setNumber) => {
  console.log(`🔧 Processing raw set data for Set ${setNumber}:`, Object.keys(rawSetData))
  console.log(`🔧 Raw set data structure:`, {
    hasChampions: !!rawSetData.champions,
    championsType: Array.isArray(rawSetData.champions) ? 'array' : typeof rawSetData.champions,
    championsCount: rawSetData.champions ? (Array.isArray(rawSetData.champions) ? rawSetData.champions.length : Object.keys(rawSetData.champions).length) : 0,
    hasTraits: !!rawSetData.traits,
    traitsType: Array.isArray(rawSetData.traits) ? 'array' : typeof rawSetData.traits,
    traitsCount: rawSetData.traits ? (Array.isArray(rawSetData.traits) ? rawSetData.traits.length : Object.keys(rawSetData.traits).length) : 0
  })
  
  // The CLI extractor saves the raw set data directly without any modification
  // From extractor.js line 124: extractedFiles.push(this.writeFile(filename, setData, description));
  // So we should do exactly the same - return raw setData unchanged
  console.log(`🔧 Returning raw set data for Set ${setNumber} unchanged (like CLI extractor)`)
  
  return rawSetData // Return exactly what CLI extractor would save
}

/**
 * Caches extracted set data in localStorage
 * @param {number} setNumber - Set number
 * @param {Object} setData - Processed set data
 */
const cacheSetData = (setNumber, setData) => {
  try {
    const cacheEntry = {
      data: setData,
      timestamp: Date.now(),
      setNumber
    }
    
    const cacheKey = `${CACHE_PREFIX}${setNumber}`
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry))
    
    console.log(`💾 Cached Set ${setNumber} data`)
  } catch (error) {
    console.error(`Failed to cache Set ${setNumber} data:`, error)
  }
}

/**
 * Retrieves cached set data
 * @param {number} setNumber - Set number
 * @returns {Object|null} Cached set data or null if not found/expired
 */
export const getCachedSetData = (setNumber) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${setNumber}`
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      const parsed = JSON.parse(cached)
      
      // Set data is cached indefinitely since it doesn't change for a given set number
      return parsed.data
    }
  } catch (error) {
    console.error(`Error retrieving cached Set ${setNumber} data:`, error)
  }
  
  return null
}

/**
 * Checks if set data is cached and valid
 * @param {number} setNumber - Set number
 * @returns {boolean} True if cached data exists and is valid
 */
export const isSetDataCached = (setNumber) => {
  return getCachedSetData(setNumber) !== null
}

/**
 * Downloads and caches images for a set
 * @param {number} setNumber - Set number
 * @param {Object} setData - Set data containing champion/trait information
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<void>}
 */
export const downloadSetImages = async (setNumber, setData, onProgress = null) => {
  const reportProgress = (stage, current, total) => {
    if (onProgress) {
      const progress = total > 0 ? Math.round((current / total) * 100) : 0
      onProgress({ stage, progress, current, total, setNumber })
    }
  }
  
  try {
    // Extract image URLs from set data
    const imageUrls = extractImageUrls(setData, setNumber)
    
    reportProgress('downloading_images', 0, imageUrls.length)
    
    // Download images in batches to avoid overwhelming the browser
    const BATCH_SIZE = 5
    let downloaded = 0
    
    for (let i = 0; i < imageUrls.length; i += BATCH_SIZE) {
      const batch = imageUrls.slice(i, i + BATCH_SIZE)
      
      await Promise.all(batch.map(async (url) => {
        try {
          // Preload the image
          return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
              downloaded++
              reportProgress('downloading_images', downloaded, imageUrls.length)
              resolve()
            }
            img.onerror = () => {
              console.warn(`Failed to load image: ${url}`)
              downloaded++
              reportProgress('downloading_images', downloaded, imageUrls.length)
              resolve() // Continue even if some images fail
            }
            img.src = url
          })
        } catch (error) {
          console.warn(`Error downloading image ${url}:`, error)
        }
      }))
    }
    
    reportProgress('complete_images', imageUrls.length, imageUrls.length)
    console.log(`✅ Downloaded ${imageUrls.length} images for Set ${setNumber}`)
    
  } catch (error) {
    console.error(`Failed to download images for Set ${setNumber}:`, error)
    throw error
  }
}

/**
 * Extracts image URLs from set data
 * @param {Object} setData - Set data
 * @param {number} setNumber - Set number
 * @returns {Array<string>} Array of image URLs
 */
const extractImageUrls = (setData, setNumber) => {
  const urls = []
  
  // Extract champion images
  if (setData.champions) {
    Object.values(setData.champions).forEach(champion => {
      if (champion.characterRecord && champion.characterRecord.squarePortraitPath) {
        // Convert CommunityDragon path to actual URL
        const imageUrl = `https://raw.communitydragon.org/latest/game/${champion.characterRecord.squarePortraitPath.toLowerCase().replace(/\\/g, '/')}`
        urls.push(imageUrl)
      }
    })
  }
  
  // Extract trait images
  if (setData.traits) {
    Object.values(setData.traits).forEach(trait => {
      if (trait.icon) {
        const imageUrl = `https://raw.communitydragon.org/latest/game/${trait.icon.toLowerCase().replace(/\\/g, '/')}`
        urls.push(imageUrl)
      }
    })
  }
  
  return urls
}

/**
 * Clears cached set data for a specific set
 * @param {number} setNumber - Set number
 */
export const clearSetCache = (setNumber) => {
  try {
    const cacheKey = `${CACHE_PREFIX}${setNumber}`
    localStorage.removeItem(cacheKey)
    console.log(`🗑️ Cleared cache for Set ${setNumber}`)
  } catch (error) {
    console.error(`Error clearing cache for Set ${setNumber}:`, error)
  }
}

/**
 * Lists all cached sets
 * @returns {Array<number>} Array of cached set numbers
 */
export const getCachedSets = () => {
  const cachedSets = []
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        const setNumber = parseInt(key.substring(CACHE_PREFIX.length))
        if (!isNaN(setNumber) && isSetDataCached(setNumber)) {
          cachedSets.push(setNumber)
        }
      }
    }
  } catch (error) {
    console.error('Error listing cached sets:', error)
  }
  
  return cachedSets.sort((a, b) => b - a) // Sort newest first
}