// Static Fallback Data for v15.13.1 (TFT 14.7)
// Uses real setData-14.json data with transformer for consistency

import setDataFallback from './setData-14-fallback.json'
import { transformChampions, transformTraits, createChampionTraitRelationships } from '../utils/setDataTransformer'
import { getShopOdds, getUnitPoolSize } from './shopOdds'
import teamplannerData from './tftchampions-teamplanner-15.13.json'

// Transform the setData using our transformer for consistency
const version = '15.13.1'
const transformedChampions = transformChampions(setDataFallback, version)
const transformedTraits = transformTraits(setDataFallback, version)
const championTraitRelationships = createChampionTraitRelationships(transformedChampions, transformedTraits)

export const STATIC_FALLBACK_DATA = {
  version: '15.13.1',
  setId: 'set14',
  setName: 'Set14',
  
  // Real champion data from setData-14.json, transformed
  champions: transformedChampions,
  
  // Real trait data from setData-14.json, transformed  
  traits: transformedTraits,
  
  // Champion-trait relationships from real data
  championTraitRelationships,
  
  // Real teamplanner data from Community Dragon
  teamplannerData: teamplannerData,
  
  // Game data with static shop odds
  gameData: {
    shopOdds: (() => {
      const shopOdds = {}
      for (let level = 1; level <= 11; level++) {
        shopOdds[level] = getShopOdds('set14', version, level)
      }
      return shopOdds
    })(),
    unitPoolSizes: (() => {
      const unitPoolSizes = {}
      for (let cost = 1; cost <= 6; cost++) {
        unitPoolSizes[cost] = getUnitPoolSize('set14', cost)
      }
      return unitPoolSizes
    })()
  },
  
  // Data sources status
  dataSources: {
    cdragon: false, // This is fallback, not live CDragon
    shopOdds: false, // Using static shop odds
    teamplanner: true // Using real Community Dragon teamplanner data
  }
}

/**
 * Gets static fallback data
 */
export const getStaticFallbackData = () => {
  return STATIC_FALLBACK_DATA
}

/**
 * Checks if we should use static fallback
 */
export const shouldUseStaticFallback = (version) => {
  // Don't use static fallback for Set 14 (v15.13.1) since we have setData-14.json
  // Only use static fallback if no version specified or for other unsupported versions
  return !version
}