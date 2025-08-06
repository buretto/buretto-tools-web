// Unit Pool Management Hook
// Manages the shared pool of TFT units with accurate pool sizes and tracking

import { useState, useCallback, useMemo } from 'react'
import { getUnitPoolSize, getSetFromVersion } from '../data/shopOdds'

/**
 * Hook for managing the shared unit pool system
 * Tracks units taken from pool across player board, bench, shop, and opponent boards
 */
export const useUnitPool = (tftData, version = '15.13.1') => {
  const [unitPool, setUnitPool] = useState(new Map())
  
  // Get set information for pool sizes
  const setId = useMemo(() => getSetFromVersion(version), [version])
  
  // Initialize pool with correct sizes when tftData changes
  const initializePool = useCallback(() => {
    if (!tftData?.champions) {
      console.log('Cannot initialize pool: no tftData.champions')
      return false
    }
    
    const newPool = new Map()
    
    // Get the current set number for filtering
    const currentSetNumber = tftData.setId ? tftData.setId.replace('set', '') : '14'
    const setPrefix = `TFT${currentSetNumber}_`
    
    console.log(`Filtering champions for ${tftData.setName || `Set ${currentSetNumber}`} with prefix: ${setPrefix}`)
    
    // Filter for only champions that belong to the current set
    Object.values(tftData.champions).forEach(champion => {
      // Only include champions that belong to the current set
      if (!champion.id.startsWith(setPrefix)) {
        return // Skip champions from other sets
      }
      
      const cost = champion.cost
      const poolSize = getUnitPoolSize(setId, cost)
      
      // Initialize each champion with full pool size
      newPool.set(champion.id, {
        total: poolSize,
        available: poolSize,
        taken: 0,
        cost: cost,
        name: champion.name
      })
    })
    
    console.log(`Initialized pool with ${newPool.size} ${tftData.setName || `Set ${currentSetNumber}`} champions`)
    console.log('Sample champions:', Array.from(newPool.keys()).slice(0, 5))
    setUnitPool(newPool)
    return true
  }, [tftData, setId])
  
  // Take units from pool (when purchased or generated in shop)
  const takeUnitsFromPool = useCallback((unitId, count = 1) => {
    setUnitPool(prev => {
      const newPool = new Map(prev)
      const unitData = newPool.get(unitId)
      
      if (unitData && unitData.available >= count) {
        newPool.set(unitId, {
          ...unitData,
          available: unitData.available - count,
          taken: unitData.taken + count
        })
      }
      
      return newPool
    })
  }, [])
  
  // Return units to pool (when sold)
  const returnUnitsToPool = useCallback((unitId, count = 1) => {
    setUnitPool(prev => {
      const newPool = new Map(prev)
      const unitData = newPool.get(unitId)
      
      if (unitData && unitData.taken >= count) {
        newPool.set(unitId, {
          ...unitData,
          available: unitData.available + count,
          taken: unitData.taken - count
        })
      }
      
      return newPool
    })
  }, [])
  
  // Get available units for a specific cost tier
  const getAvailableUnitsByCost = useCallback((cost) => {
    const availableUnits = []
    
    unitPool.forEach((poolData, unitId) => {
      if (poolData.cost === cost && poolData.available > 0) {
        // Add multiple copies based on availability for weighted selection
        for (let i = 0; i < poolData.available; i++) {
          availableUnits.push(unitId)
        }
      }
    })
    
    return availableUnits
  }, [unitPool])
  
  // Check if a specific unit is available
  const isUnitAvailable = useCallback((unitId, count = 1) => {
    const unitData = unitPool.get(unitId)
    return unitData ? unitData.available >= count : false
  }, [unitPool])
  
  // Get pool statistics for a unit
  const getUnitPoolData = useCallback((unitId) => {
    return unitPool.get(unitId) || null
  }, [unitPool])
  
  // Get all pool statistics (for debugging/analytics)
  const getPoolStats = useCallback(() => {
    const stats = {
      totalUnits: 0,
      takenUnits: 0,
      availableUnits: 0,
      byCost: {}
    }
    
    for (let cost = 1; cost <= 5; cost++) {
      stats.byCost[cost] = {
        total: 0,
        taken: 0,
        available: 0,
        uniqueChampions: 0
      }
    }
    
    unitPool.forEach((poolData) => {
      stats.totalUnits += poolData.total
      stats.takenUnits += poolData.taken
      stats.availableUnits += poolData.available
      
      const costStats = stats.byCost[poolData.cost]
      if (costStats) {
        costStats.total += poolData.total
        costStats.taken += poolData.taken
        costStats.available += poolData.available
        costStats.uniqueChampions += 1
      }
    })
    
    return stats
  }, [unitPool])
  
  // Reset pool to initial state
  const resetPool = useCallback(() => {
    initializePool()
  }, [initializePool])
  
  // Calculate probability of hitting a specific champion
  const calculateChampionProbability = useCallback((championId, playerLevel, shopOdds) => {
    const unitData = unitPool.get(championId)
    if (!unitData || !shopOdds) return 0
    
    const cost = unitData.cost
    const costTierOdds = shopOdds[cost - 1] || 0 // shopOdds is 0-indexed array
    
    // Get all available units for this cost tier
    const availableUnitsOfCost = getAvailableUnitsByCost(cost)
    const totalAvailableOfCost = availableUnitsOfCost.length
    const availableOfThisChampion = unitData.available
    
    if (totalAvailableOfCost === 0) return 0
    
    // Probability = (cost tier chance) * (this champion's share of cost tier pool)
    const probability = (costTierOdds / 100) * (availableOfThisChampion / totalAvailableOfCost)
    
    return probability
  }, [unitPool, getAvailableUnitsByCost])
  
  return {
    unitPool,
    initializePool,
    takeUnitsFromPool,
    returnUnitsToPool,
    getAvailableUnitsByCost,
    isUnitAvailable,
    getUnitPoolData,
    getPoolStats,
    resetPool,
    calculateChampionProbability
  }
}