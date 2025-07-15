// SetData Transformer - Transforms extracted setData to rolldown tool format
// Handles filtering and transforming TFT14 units and traits from extracted setData

/**
 * Filters and transforms TFT14 champions from setData
 * Only includes playable champions with proper TFT14_ prefix, role, and traits
 */
export const transformChampions = (setData, version = '15.13.1') => {
  if (!setData?.champions) return {}
  
  const champions = {}
  
  setData.champions.forEach(champion => {
    // Filter for TFT14 playable champions
    if (!isPlayableTFT14Champion(champion)) return
    
    const championId = champion.apiName
    
    champions[championId] = {
      id: championId,
      name: champion.name,
      cost: champion.cost,
      traits: champion.traits || [],
      stats: {
        health: champion.stats?.hp || 0,
        damage: champion.stats?.damage || 0,
        armor: champion.stats?.armor || 0,
        magicResist: champion.stats?.magicResist || 0,
        attackSpeed: champion.stats?.attackSpeed || 0,
        critChance: champion.stats?.critChance || 0,
        critMultiplier: champion.stats?.critMultiplier || 0,
        mana: champion.stats?.mana || 0,
        initialMana: champion.stats?.initialMana || 0,
        range: champion.stats?.range || 1
      },
      ability: {
        name: champion.ability?.name || '',
        description: cleanDescription(champion.ability?.desc || ''),
        iconPath: '', // Will be replaced with ddragon URL
        variables: champion.ability?.variables || []
      },
      // Replace game client paths with ddragon URLs
      imageUrl: generateChampionImageUrl(version, championId),
      iconPath: champion.icon || '',
      squareIconPath: champion.squareIcon || '',
      rawData: champion
    }
  })
  
  return champions
}

/**
 * Filters and transforms TFT14 traits from setData
 */
export const transformTraits = (setData, version = '15.13.1') => {
  if (!setData?.traits) return {}
  
  const traits = {}
  
  setData.traits.forEach(trait => {
    // Filter for TFT14 traits
    if (!trait.apiName?.startsWith('TFT14_')) return
    
    const traitId = trait.apiName
    
    // Parse trait breakpoints from effects
    const breakpoints = trait.effects?.map(effect => ({
      minUnits: effect.minUnits,
      maxUnits: effect.maxUnits === 25000 ? null : effect.maxUnits,
      style: mapBreakpointStyle(effect.style),
      variables: effect.variables || {}
    })) || []
    
    traits[traitId] = {
      id: traitId,
      name: trait.name,
      description: cleanDescription(trait.desc || ''),
      breakpoints,
      // Replace game client path with ddragon URL
      imageUrl: generateTraitImageUrl(version, trait.name),
      iconPath: trait.icon || '',
      rawData: trait
    }
  })
  
  return traits
}

/**
 * Creates champion-trait relationships for transformed data
 */
export const createChampionTraitRelationships = (champions, traits) => {
  const relationships = {}
  
  Object.values(champions).forEach(champion => {
    const championTraits = champion.traits.map(traitName => {
      // Find trait by name since setData uses trait names in champion.traits
      const trait = Object.values(traits).find(t => t.name === traitName)
      return trait 
        ? { id: trait.id, name: trait.name }
        : { id: traitName, name: traitName }
    })
    
    relationships[champion.id] = championTraits
  })
  
  return relationships
}

/**
 * Checks if a champion is a playable TFT14 unit
 */
const isPlayableTFT14Champion = (champion) => {
  return (
    champion.apiName?.startsWith('TFT14_') &&
    champion.characterName?.startsWith('TFT14_') &&
    champion.role && 
    champion.traits &&
    Array.isArray(champion.traits) &&
    champion.traits.length > 0 &&
    champion.cost >= 1 && 
    champion.cost <= 5
  )
}

/**
 * Generates champion image URL for ddragon API
 */
const generateChampionImageUrl = (version, championId) => {
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-champion/${championId}.TFT_Set14.png`
}

/**
 * Generates trait image URL for ddragon API
 */
const generateTraitImageUrl = (version, traitName) => {
  // Convert trait name to icon filename format
  const iconName = `Trait_Icon_14_${traitName.replace(/\s+/g, '')}`
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-trait/${iconName}.TFT_Set14.png`
}

/**
 * Maps CDragon style numbers to readable names
 */
const mapBreakpointStyle = (style) => {
  const styleMap = {
    1: 'bronze',
    3: 'silver',
    4: 'unique', 
    5: 'gold',
    6: 'prismatic'
  }
  return styleMap[style] || 'bronze'
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
 * Loads and transforms setData-14.json to rolldown tool format
 */
export const loadAndTransformSetData = async (version = '15.13.1') => {
  try {
    // Import the setData-14.json file
    const setDataModule = await import('../cdragon_sample_data/tft-data/setData-14.json')
    const setData = setDataModule.default
    
    // Transform the data
    const champions = transformChampions(setData, version)
    const traits = transformTraits(setData, version)
    const championTraitRelationships = createChampionTraitRelationships(champions, traits)
    
    return {
      champions,
      traits,
      championTraitRelationships,
      version,
      setId: 'set14',
      setName: 'Set14',
      cached: false,
      dataSources: {
        cdragon: true,
        shopOdds: false // Will be handled separately
      },
      rawSetData: setData
    }
  } catch (error) {
    console.error('Error loading setData-14.json:', error)
    return null
  }
}

/**
 * Gets all TFT14 champion IDs from setData
 */
export const getTFT14ChampionIds = (setData) => {
  if (!setData?.champions) return []
  
  return setData.champions
    .filter(isPlayableTFT14Champion)
    .map(champion => champion.apiName)
}

/**
 * Gets all TFT14 trait names from setData
 */
export const getTFT14TraitNames = (setData) => {
  if (!setData?.traits) return []
  
  return setData.traits
    .filter(trait => trait.apiName?.startsWith('TFT14_'))
    .map(trait => trait.name)
}