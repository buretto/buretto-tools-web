// DDragon File Resolution Utility
// Fetches available files from GitHub API and provides automatic filename resolution

/**
 * Cache for DDragon file listings by version and type
 * Format: { "version-type": { files: Map<baseFilename, fileInfo[]>, lastFetch: timestamp } }
 */
const FILE_LISTINGS_CACHE = new Map()

/**
 * Fetches DDragon file listings from GitHub API for a specific version
 * @param {string} version - Patch version (e.g., "v15.15.1")
 * @param {string} type - Asset type: "champion" or "trait"
 * @returns {Promise<Map<string, Array>>} Map of base filenames to file info arrays
 */
export const fetchDDragonFileListing = async (version, type) => {
  const cacheKey = `${version}-${type}`
  
  // Check if we have cached data (no localStorage caching as requested)
  if (FILE_LISTINGS_CACHE.has(cacheKey)) {
    const cached = FILE_LISTINGS_CACHE.get(cacheKey)
    // Cache for 10 minutes to avoid excessive API calls during same session
    if (Date.now() - cached.lastFetch < 600000) {
      console.log(`📁 Using cached DDragon file listing for ${version}-${type}`)
      return cached.files
    }
  }

  console.log(`🔍 Fetching DDragon file listing from GitHub API: ${version}-${type}`)
  
  try {
    // Construct GitHub API URL
    const apiType = type === 'champion' ? 'tft-champion' : 'tft-trait'
    const apiUrl = `https://api.github.com/repos/noxelisdev/LoL_DDragon/contents/latest/img/${apiType}?ref=${version}`
    
    const response = await fetch(apiUrl)
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Process the data - only keep the "name" field and organize by base filename
    const fileMap = new Map()
    
    data.forEach(file => {
      if (file.type === 'file' && file.name.endsWith('.png')) {
        const baseFilename = extractBaseFilename(file.name, type)
        
        if (!fileMap.has(baseFilename)) {
          fileMap.set(baseFilename, [])
        }
        
        fileMap.get(baseFilename).push({
          filename: file.name,
          downloadUrl: file.download_url,
          setNumber: extractSetNumber(file.name),
          hasSetSuffix: file.name.includes('.TFT_Set')
        })
      }
    })
    
    // Sort files with custom priority:
    // 1. Higher set number first
    // 2. Within same set number, prefer files without .TFT_SetX suffix
    fileMap.forEach(files => {
      files.sort((a, b) => {
        // First priority: higher set number
        if (a.setNumber !== b.setNumber) {
          return b.setNumber - a.setNumber
        }
        // Second priority: within same set, prefer files without suffix
        if (a.hasSetSuffix !== b.hasSetSuffix) {
          return a.hasSetSuffix ? 1 : -1 // false (no suffix) comes before true (has suffix)
        }
        // Third priority: alphabetical order for consistency
        return a.filename.localeCompare(b.filename)
      })
    })
    
    // Cache the result
    FILE_LISTINGS_CACHE.set(cacheKey, {
      files: fileMap,
      lastFetch: Date.now()
    })
    
    console.log(`✅ Fetched ${fileMap.size} unique base filenames for ${version}-${type}`)
    return fileMap
    
  } catch (error) {
    console.error(`❌ Failed to fetch DDragon file listing for ${version}-${type}:`, error)
    
    // Return empty map on error - image loading will continue with existing logic
    return new Map()
  }
}

/**
 * Extracts base filename for grouping similar files
 * @param {string} filename - Full filename (e.g., "Trait_Icon_8_Duelist.TFT_Set8.png")
 * @param {string} type - Asset type
 * @returns {string} Base filename for grouping
 */
const extractBaseFilename = (filename, type) => {
  if (type === 'trait') {
    // For traits, extract the trait name part
    // "Trait_Icon_8_Duelist.TFT_Set8.png" -> "Duelist"
    // "Trait_Icon_4_Duelist.png" -> "Duelist"
    const match = filename.match(/^Trait_Icon_\d+_(.+?)(?:\.TFT_Set\d+)?\.png$/)
    if (match) {
      return match[1] // Return just the trait name
    }
  } else if (type === 'champion') {
    // For champions, extract the champion part
    // "TFT15_Ashe.TFT_Set15.png" -> "Ashe"
    const match = filename.match(/^(?:TFT\d+_)?(.+?)(?:\.TFT_Set\d+)?\.png$/)
    if (match) {
      return match[1]
    }
  }
  
  // Fallback: return filename without extension
  return filename.replace('.png', '')
}

/**
 * Extracts set number from filename
 * @param {string} filename - Full filename
 * @returns {number} Set number, or 0 if not found
 */
const extractSetNumber = (filename) => {
  // Try to extract from Trait_Icon_X_ pattern
  let match = filename.match(/^Trait_Icon_(\d+)_/)
  if (match) {
    return parseInt(match[1], 10)
  }
  
  // Try to extract from TFT_SetX pattern
  match = filename.match(/\.TFT_Set(\d+)\.png$/)
  if (match) {
    return parseInt(match[1], 10)
  }
  
  // Try to extract from TFTX_ pattern
  match = filename.match(/^TFT(\d+)_/)
  if (match) {
    return parseInt(match[1], 10)
  }
  
  return 0
}

/**
 * Resolves the best filename for a given entity ID using pre-fetched file map
 * @param {Map} fileMap - Pre-fetched file map from fetchDDragonFileListing
 * @param {string} entityId - Entity ID (e.g., "TFT15_Duelist", "TFT15_Ashe")
 * @param {string} type - Asset type: "champion" or "trait"
 * @returns {Object|null} Resolved file info or null if not found
 */
export const resolveDDragonFilename = (fileMap, entityId, type) => {
  try {
    if (!fileMap || fileMap.size === 0) {
      return null // No files available, let existing logic handle it
    }
    
    // Extract the entity name from the ID
    let entityName
    if (type === 'trait') {
      // For traits: "TFT15_Duelist" -> "Duelist"
      const match = entityId.match(/^TFT\d+_(.+)$/)
      entityName = match ? match[1] : entityId
    } else if (type === 'champion') {
      // For champions: "TFT15_Ashe" -> "Ashe"
      const match = entityId.match(/^(?:TFT\d+_)?(.+)$/)
      entityName = match ? match[1] : entityId
    } else {
      entityName = entityId
    }
    
    // Try to find matching files
    if (fileMap.has(entityName)) {
      const matchingFiles = fileMap.get(entityName)
      // Return the highest priority file (already sorted by set number desc)
      const bestMatch = matchingFiles[0]
      
      return bestMatch
    }
    
    // Try case-insensitive search
    const lowerEntityName = entityName.toLowerCase()
    for (const [baseName, files] of fileMap.entries()) {
      if (baseName.toLowerCase() === lowerEntityName) {
        const bestMatch = files[0]
        return bestMatch
      }
    }
    
    return null
    
  } catch (error) {
    console.error(`❌ Error resolving DDragon filename for ${entityId}:`, error)
    return null
  }
}

/**
 * DEPRECATED: Use resolveDDragonFilename with pre-fetched fileMap instead
 * This function is kept for backwards compatibility but should not be used
 * as it triggers individual API calls
 */
export const resolveDDragonFilenameAsync = async (version, entityId, type) => {
  console.warn(`⚠️ resolveDDragonFilenameAsync is deprecated. Use pre-fetched file maps instead.`)
  try {
    const fileMap = await fetchDDragonFileListing(version, type)
    return resolveDDragonFilename(fileMap, entityId, type)
  } catch (error) {
    console.error(`❌ Error resolving DDragon filename for ${entityId}:`, error)
    return null
  }
}

/**
 * Clears the DDragon file listings cache
 */
export const clearDDragonCache = () => {
  FILE_LISTINGS_CACHE.clear()
  console.log('🗑️ Cleared DDragon file listings cache')
}

/**
 * Gets cache statistics
 */
export const getDDragonCacheStats = () => {
  const stats = {
    cacheEntries: FILE_LISTINGS_CACHE.size,
    totalFiles: 0,
    versions: []
  }
  
  for (const [key, cache] of FILE_LISTINGS_CACHE.entries()) {
    stats.versions.push(key)
    stats.totalFiles += cache.files.size
  }
  
  return stats
}