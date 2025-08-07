// TFT Image Name Mapping System
// Handles discrepancies between Riot internal names and Data Dragon file names

import { getSetInfoFromVersion } from './versionDetector.js'

// Default mappings for known discrepancies - Based on actual GitHub file analysis
// Structure: set-based mappings that work across all patches within a set
const DEFAULT_MAPPINGS_BY_SET = {
  'set14': {
    champions: {
      'TFT14_Chogath': 'TFT14_ChoGath', // Case sensitivity fix - icon shows ChoGath with capital G
    },
    traits: {
      // Based on actual Data Dragon file names from GitHub:
      // Format: mapped name can be string (auto-detect extension) or object with name and hasSetSuffix
      'TFT14_Supercharge': 'TFT14_Amp', // Trait_Icon_14_Amp.TFT_Set14.png
      'TFT14_Vanguard': 'TFT12_Vanguard', // Trait_Icon_12_Vanguard.TFT_Set12.png
      'TFT14_Strong': { name: 'TFT4_Slayer', hasSetSuffix: false }, // Trait_Icon_4_Slayer.png (no .TFT_Set4)
      'TFT14_ViegoUniqueTrait': 'TFT14_SoulKiller', // Trait_Icon_14_SoulKiller.TFT_Set14.png
      'TFT14_Cyberboss': 'TFT14_Cyberbosses', // Trait_Icon_14_Cyberbosses.TFT_Set14.png (plural)
      'TFT14_Cutter': { name: 'TFT4_Executioner', hasSetSuffix: false }, // Trait_Icon_4_Executioner.png (no .TFT_Set4)
      'TFT14_Armorclad': { name: 'TFT9_Bastion', hasSetSuffix: false }, // Trait_Icon_9_Bastion.png (no .TFT_Set9)
      'TFT14_EdgeRunner': 'TFT14_Exotech', // Trait_Icon_14_Exotech.TFT_Set14.png
      'TFT14_Netgod': 'TFT14_GodoftheNet', // Trait_Icon_14_GodoftheNet.TFT_Set14.png
      'TFT14_Swift': { name: 'TFT10_Rapidfire', hasSetSuffix: false }, // Trait_Icon_10_Rapidfire.png (no .TFT_Set10)
      'TFT14_Controller': { name: 'TFT9_Strategist', hasSetSuffix: false }, // Trait_Icon_9_Strategist.png (no .TFT_Set9)
      'TFT14_Immortal': 'TFT14_GoldenOx', // Trait_Icon_14_GoldenOx.TFT_Set14.png
      'TFT14_BallisTek': 'TFT14_BoomBots', // Trait_Icon_14_BoomBots.TFT_Set14.png (plural)
      'TFT14_Thirsty': 'TFT14_Dynamo', // Trait_Icon_14_Dynamo.TFT_Set14.png
      'TFT14_HotRod': 'TFT14_NitroForge', // Trait_Icon_14_NitroForge.TFT_Set14.png
      'TFT14_Suits': 'TFT14_Cypher' // Trait_Icon_14_Cypher.TFT_Set14.png
    }
  },
  'set15': {
    champions: {},
    traits: {
      // Set 15 trait mappings - Based on actual Data Dragon file names
      // Format: Internal name -> DDragon filename pattern
      'TFT15_TheCrew': 'TFT15_StarCrew', // Trait_Icon_15_StarCrew.TFT_Set15.png
      'TFT15_Luchador': 'TFT15_RingKings', // Trait_Icon_15_RingKings.TFT_Set15.png
      'TFT15_ElTigre': 'TFT15_TheChamp', // Trait_Icon_15_TheChamp.TFT_Set15.png
      'TFT15_BattleAcademia': 'TFT15_BattleClub', // Trait_Icon_15_BattleClub.TFT_Set15.png
      'TFT15_Spellslinger': 'TFT15_Sorcerer', // Trait_Icon_15_Sorcerer.TFT_Set15.png
      'TFT15_Captain': 'TFT15_RogueCaptain', // Trait_Icon_15_RogueCaptain.TFT_Set15.png
      'TFT15_SentaiRanger': 'TFT15_RoboRangers', // Trait_Icon_15_RoboRangers.TFT_Set15.png
      'TFT15_Edgelord': { name: 'TFT10_Edgelord', hasSetSuffix: false } // Trait_Icon_10_Edgelord.png (Set 10, no suffix)
    }
  }
}

// Local storage key for user mappings
const STORAGE_KEY = 'tft_image_mappings'

/**
 * Get stored mappings from localStorage
 */
export const getStoredMappings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.warn('Failed to load stored mappings:', error)
    return {}
  }
}

/**
 * Save mappings to localStorage
 */
export const saveMappings = (mappings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
    console.log('Mappings saved successfully')
  } catch (error) {
    console.error('Failed to save mappings:', error)
  }
}

/**
 * Get combined mappings (default + user stored) using set-based lookup
 * @param {string} version - Game version to get mappings for
 */
export const getCombinedMappings = (version) => {
  const stored = getStoredMappings()
  
  // Get set info from version
  const setInfo = getSetInfoFromVersion(version)
  const setId = setInfo.setId
  
  // Start with default mappings for this set
  const defaultMappings = DEFAULT_MAPPINGS_BY_SET[setId] || { champions: {}, traits: {} }
  
  // Create combined mappings structure for this version
  const combined = {
    [version]: {
      champions: { ...defaultMappings.champions },
      traits: { ...defaultMappings.traits }
    }
  }
  
  // Merge stored mappings for this specific version
  if (stored[version]) {
    if (stored[version].champions) {
      combined[version].champions = { 
        ...combined[version].champions, 
        ...stored[version].champions 
      }
    }
    
    if (stored[version].traits) {
      combined[version].traits = { 
        ...combined[version].traits, 
        ...stored[version].traits 
      }
    }
  }
  
  return combined
}

/**
 * Get mapping for a specific entity
 * Returns either a string or an object with name and hasSetSuffix
 */
export const getMappedName = (version, entityId, type = 'champion') => {
  const mappings = getCombinedMappings(version)
  
  if (mappings[version] && mappings[version][type + 's']) {
    return mappings[version][type + 's'][entityId] || entityId
  }
  
  return entityId
}

/**
 * Get mapping info for a specific entity (handles both string and object formats)
 */
export const getMappingInfo = (version, entityId, type = 'champion') => {
  const mapping = getMappedName(version, entityId, type)
  
  // If mapping is an object with name and hasSetSuffix
  if (typeof mapping === 'object' && mapping.name) {
    return {
      name: mapping.name,
      hasSetSuffix: mapping.hasSetSuffix !== false // default to true if not specified
    }
  }
  
  // If mapping is a string, assume it has set suffix
  return {
    name: mapping,
    hasSetSuffix: true
  }
}

/**
 * Add a new mapping
 */
export const addMapping = (version, entityId, mappedName, type = 'champion') => {
  const stored = getStoredMappings()
  
  if (!stored[version]) {
    stored[version] = { champions: {}, traits: {} }
  }
  
  const typeKey = type + 's'
  if (!stored[version][typeKey]) {
    stored[version][typeKey] = {}
  }
  
  stored[version][typeKey][entityId] = mappedName
  saveMappings(stored)
}

/**
 * Remove a mapping
 */
export const removeMapping = (version, entityId, type = 'champion') => {
  const stored = getStoredMappings()
  
  if (stored[version] && stored[version][type + 's']) {
    delete stored[version][type + 's'][entityId]
    saveMappings(stored)
  }
}

/**
 * Get all mappings for a version
 */
export const getVersionMappings = (version) => {
  const mappings = getCombinedMappings(version)
  return mappings[version] || { champions: {}, traits: {} }
}

/**
 * Clear all user mappings
 */
export const clearAllMappings = () => {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Export mappings as JSON
 */
export const exportMappings = () => {
  const mappings = getStoredMappings()
  return JSON.stringify(mappings, null, 2)
}

/**
 * Import mappings from JSON
 */
export const importMappings = (jsonString) => {
  try {
    const imported = JSON.parse(jsonString)
    saveMappings(imported)
    return true
  } catch (error) {
    console.error('Failed to import mappings:', error)
    return false
  }
}