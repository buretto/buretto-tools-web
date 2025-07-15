// CDragon Data Parser - Universal TFT Data Processing
// Parses Community Dragon data for trait/champion information

import { loadAndTransformSetData } from './setDataTransformer'

/**
 * Fetches CDragon TFT data
 */
export const fetchCDragonData = async () => {
  try {
    const response = await fetch('https://raw.communitydragon.org/latest/cdragon/tft/en_us.json')
    if (!response.ok) {
      throw new Error(`Failed to fetch CDragon data: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch CDragon data:', error)
    return null
  }
}

/**
 * Extracts current set data from CDragon
 */
export const getCurrentSetData = (cdragonData, setName = 'Set14') => {
  if (!cdragonData?.setData) return null
  
  return cdragonData.setData.find(set => set.name === setName) || null
}

/**
 * Loads Set 14 data from local setData-14.json
 * Uses the extracted and transformed data instead of CDragon API
 */
export const loadSet14Data = async (version = '15.13.1') => {
  try {
    console.log('Loading Set 14 data from local setData-14.json...')
    return await loadAndTransformSetData(version)
  } catch (error) {
    console.error('Failed to load Set 14 data:', error)
    return null
  }
}

/**
 * Parses trait data from CDragon format
 */
export const parseTraits = (setData) => {
  if (!setData?.traits) return {}
  
  const traits = {}
  
  setData.traits.forEach(trait => {
    const traitId = trait.apiName
    const displayName = trait.name
    
    // Parse trait breakpoints from effects
    const breakpoints = trait.effects?.map(effect => ({
      minUnits: effect.minUnits,
      maxUnits: effect.maxUnits === 25000 ? null : effect.maxUnits, // 25000 is infinite
      style: effect.style, // 1=bronze, 3=silver, 5=gold, 6=prismatic
      variables: effect.variables || {}
    })) || []
    
    // Extract description (clean up HTML tags for basic display)
    const description = trait.desc ? cleanDescription(trait.desc) : ''
    
    // Extract icon path
    const iconPath = trait.icon || ''
    
    traits[traitId] = {
      id: traitId,
      name: displayName,
      description,
      iconPath,
      breakpoints,
      rawData: trait // Keep raw data for advanced processing
    }
  })
  
  return traits
}

/**
 * Parses champion data from CDragon format
 */
export const parseChampions = (setData) => {
  if (!setData?.champions) return {}
  
  const champions = {}
  
  setData.champions.forEach(champion => {
    const championId = champion.apiName
    const displayName = champion.name
    
    // Extract basic champion info
    const cost = champion.cost
    const stats = champion.stats || {}
    const ability = champion.ability || {}
    
    // Extract traits (will need to be cross-referenced with trait data)
    const traits = champion.traits || []
    
    // Extract icon paths
    const iconPath = champion.icon || ''
    const squareIconPath = champion.squareIcon || ''
    
    champions[championId] = {
      id: championId,
      name: displayName,
      cost,
      traits,
      stats: {
        health: stats.hp || 0,
        damage: stats.damage || 0,
        armor: stats.armor || 0,
        magicResist: stats.magicResist || 0,
        attackSpeed: stats.attackSpeed || 0,
        critChance: stats.critChance || 0,
        critMultiplier: stats.critMultiplier || 0,
        mana: stats.mana || 0,
        initialMana: stats.initialMana || 0,
        range: stats.range || 1
      },
      ability: {
        name: ability.name || '',
        description: ability.desc ? cleanDescription(ability.desc) : '',
        iconPath: ability.icon || '',
        variables: ability.variables || []
      },
      iconPath,
      squareIconPath,
      rawData: champion // Keep raw data for advanced processing
    }
  })
  
  return champions
}

/**
 * Parses augment data from CDragon format
 */
export const parseAugments = (setData) => {
  if (!setData?.augments) return {}
  
  const augments = {}
  
  setData.augments.forEach(augment => {
    const augmentId = augment.apiName
    const displayName = augment.name
    
    // Extract description
    const description = augment.desc ? cleanDescription(augment.desc) : ''
    
    // Extract icon path
    const iconPath = augment.icon || ''
    
    augments[augmentId] = {
      id: augmentId,
      name: displayName,
      description,
      iconPath,
      rawData: augment
    }
  })
  
  return augments
}

/**
 * Creates champion-trait relationships
 */
export const createChampionTraitRelationships = (champions, traits) => {
  const relationships = {}
  
  Object.values(champions).forEach(champion => {
    const championTraits = champion.traits.map(traitId => {
      const trait = traits[traitId]
      return trait ? { id: traitId, name: trait.name } : { id: traitId, name: traitId }
    })
    
    relationships[champion.id] = championTraits
  })
  
  return relationships
}

/**
 * Cleans HTML tags and special formatting from descriptions
 */
const cleanDescription = (desc) => {
  if (!desc) return ''
  
  // Remove HTML tags
  let cleaned = desc.replace(/<[^>]*>/g, '')
  
  // Remove TFT-specific formatting tokens
  cleaned = cleaned.replace(/@\w+@/g, '') // Remove @Variable@ tokens
  cleaned = cleaned.replace(/%i:\w+%/g, '') // Remove %i:icon% tokens
  cleaned = cleaned.replace(/\{[^}]+\}/g, '') // Remove {variable} tokens
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  
  return cleaned
}

/**
 * Resolves naming aliases to display names
 */
export const resolveAliases = (internalName) => {
  const aliasMap = {
    // Common aliases found in TFT data
    'MonkeyKing': 'Wukong',
    'TFT14_Divinicorp': 'Divinicorp',
    'TFT14_StreetDemon': 'Street Demon',
    'TFT14_Supercharge': 'A.M.P.',
    'TFT14_AnimaSquad': 'Anima Squad',
    'TFT14_Vanguard': 'Vanguard',
    'TFT14_Strong': 'Slayer',
    'TFT14_ViegoUniqueTrait': 'Soul Killer',
    'TFT14_Cyberboss': 'Cyberboss',
    'TFT14_Cutter': 'Executioner',
    'TFT14_Armorclad': 'Bastion'
  }
  
  return aliasMap[internalName] || internalName
}

/**
 * Gets trait breakpoint information for UI display
 */
export const getTraitBreakpoints = (trait) => {
  if (!trait?.breakpoints) return []
  
  return trait.breakpoints.map(bp => ({
    units: bp.minUnits,
    style: getBreakpointStyle(bp.style),
    description: `${bp.minUnits}${bp.maxUnits ? `-${bp.maxUnits}` : '+'} units`
  }))
}

/**
 * Maps CDragon style numbers to readable names
 */
const getBreakpointStyle = (style) => {
  const styleMap = {
    1: 'bronze',
    3: 'silver', 
    4: 'unique',
    5: 'gold',
    6: 'prismatic'
  }
  return styleMap[style] || 'unknown'
}

/**
 * Extracts units for a specific trait
 */
export const getUnitsForTrait = (traitId, champions) => {
  return Object.values(champions).filter(champion => 
    champion.traits.includes(traitId)
  )
}

/**
 * Gets all traits for a specific champion
 */
export const getTraitsForChampion = (championId, champions, traits) => {
  const champion = champions[championId]
  if (!champion) return []
  
  return champion.traits.map(traitId => traits[traitId]).filter(Boolean)
}