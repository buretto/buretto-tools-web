// TFT Version Detection Utility
// Handles fetching the latest TFT version with fallback support

import { fetchWithFallback, shouldUseOfflineMode, enableOfflineMode } from './networkUtils'

/**
 * Gets the latest TFT version from Data Dragon versions API
 * @returns {Promise<string>} Latest version (e.g., "15.15.1")
 */
export const getLatestVersion = async () => {
  const fallbackFn = () => {
    // Fallback to known good Set 14 version if API fails
    console.log('Using fallback version: 15.13.1 (Set 14)')
    return '15.13.1'
  }
  
  try {
    const versions = await fetchWithFallback(
      'https://ddragon.leagueoflegends.com/api/versions.json',
      fallbackFn,
      'version data',
      true // This is a major failure - triggers circuit breaker
    )
    
    // If we got the fallback string, return it directly
    if (typeof versions === 'string') {
      return versions
    }
    
    // Otherwise, extract the latest version from the array
    if (Array.isArray(versions) && versions.length > 0) {
      const latestVersion = versions[0]
      console.log(`Latest TFT version: ${latestVersion}`)
      return latestVersion
    }
    
    throw new Error('Invalid versions data format')
  } catch (error) {
    console.warn('Failed to fetch latest version:', error)
    return fallbackFn()
  }
}

/**
 * Determines if a version should use offline/bundled data
 * @param {string} version - Version to check
 * @returns {boolean} True if should use bundled data
 */
export const shouldUseBundledData = (version) => {
  // Use bundled data for Set 14 (15.13.1) or if explicitly offline
  return version === '15.13.1' || shouldUseOfflineMode()
}

/**
 * Gets the appropriate version to use based on user preferences and network status
 * @param {string} requestedVersion - Version requested by user (optional)
 * @returns {Promise<{version: string, networkFailed: boolean}>} Version to use and network status
 */
export const getVersionToUse = async (requestedVersion = null) => {
  // If user specifically requested a version, use it
  if (requestedVersion) {
    return { version: requestedVersion, networkFailed: false }
  }
  
  // Check offline mode preference
  if (shouldUseOfflineMode()) {
    console.log('Offline mode enabled, using bundled Set 14 data')
    return { version: '15.13.1', networkFailed: false }
  }
  
  // Try to get latest version, fallback to Set 14
  try {
    const latestVersion = await getLatestVersion()
    
    // If we got the fallback version, we know network failed
    if (latestVersion === '15.13.1') {
      console.log('Network failed, enabling offline mode and using bundled Set 14 data')
      // Enable offline mode since network is clearly not working
      enableOfflineMode()
      return { version: '15.13.1', networkFailed: true }
    }
    
    return { version: latestVersion, networkFailed: false }
  } catch (error) {
    console.warn('Failed to determine version:', error)
    // Enable offline mode due to network failure
    enableOfflineMode()
    return { version: '15.13.1', networkFailed: true }
  }
}

/**
 * Maps version to TFT set information
 * @param {string} version - Game version
 * @returns {Object} Set info with set ID and name
 */
export const getSetInfoFromVersion = (version) => {
  // Simple mapping - expand as needed for other sets
  if (version.startsWith('15.13') || version.startsWith('15.12') || version.startsWith('15.11')) {
    return { setId: 'set14', setName: 'Set14', hasBundledData: true }
  }
  
  // For newer versions, assume current set
  return { setId: 'set15', setName: 'Set15', hasBundledData: false }
}

/**
 * Gets user-friendly set name from version
 * @param {string} version - Game version  
 * @returns {string} Display name (e.g., "TFT Set 14")
 */
export const getSetDisplayName = (version) => {
  const setInfo = getSetInfoFromVersion(version)
  const setNumber = setInfo.setId.replace('set', '')
  return `TFT Set ${setNumber}`
}