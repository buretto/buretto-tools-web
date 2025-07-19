// Shop Generation Hook
// Handles TFT shop generation with accurate odds and pool management

import { useState, useCallback, useMemo } from 'react'
import { getShopOdds, getSetFromVersion } from '../data/shopOdds'

const SHOP_SIZE = 5
const REROLL_COST = 2 // TFT shop reroll always costs 2 gold

/**
 * Hook for managing TFT shop generation and reroll mechanics
 * Uses player level and shop odds to generate realistic shops
 */
export const useShop = (tftData, version, unitPoolHook) => {
  const [currentShop, setCurrentShop] = useState([])
  const [rerollCount, setRerollCount] = useState(0)
  
  // Get set information for shop odds
  const setId = useMemo(() => getSetFromVersion(version), [version])
  
  // Generate a single shop slot based on player level and available units
  const generateShopSlot = useCallback((playerLevel) => {
    if (!tftData?.champions) {
      return null
    }
    
    // Get shop odds for this level
    const shopOdds = getShopOdds(setId, version, playerLevel)
    if (!shopOdds) {
      return null
    }
    
    // Convert percentages to cumulative probabilities
    const cumulativeOdds = []
    let cumulative = 0
    for (let i = 0; i < shopOdds.length; i++) {
      cumulative += shopOdds[i]
      cumulativeOdds.push(cumulative)
    }
    
    // Roll for cost tier (1-5)
    const random = Math.random() * 100
    let selectedCost = 1
    
    for (let i = 0; i < cumulativeOdds.length; i++) {
      if (random <= cumulativeOdds[i]) {
        selectedCost = i + 1 // Cost is 1-indexed
        break
      }
    }
    
    // Get available units for this cost tier
    const availableUnits = unitPoolHook.getAvailableUnitsByCost(selectedCost)
    
    if (availableUnits.length === 0) {
      // No units available for this cost, try lower costs
      for (let fallbackCost = selectedCost - 1; fallbackCost >= 1; fallbackCost--) {
        const fallbackUnits = unitPoolHook.getAvailableUnitsByCost(fallbackCost)
        if (fallbackUnits.length > 0) {
          const randomIndex = Math.floor(Math.random() * fallbackUnits.length)
          const selectedUnitId = fallbackUnits[randomIndex]
          return createShopUnit(selectedUnitId, tftData.champions[selectedUnitId])
        }
      }
      return null // No units available at all
    }
    
    // Randomly select from available units (already weighted by availability)
    const randomIndex = Math.floor(Math.random() * availableUnits.length)
    const selectedUnitId = availableUnits[randomIndex]
    
    return createShopUnit(selectedUnitId, tftData.champions[selectedUnitId])
  }, [tftData, setId, version, unitPoolHook])
  
  // Create a shop unit object
  const createShopUnit = useCallback((unitId, championData) => {
    return {
      id: unitId,
      name: championData.name,
      cost: championData.cost,
      traits: championData.traits || [],
      stars: 1, // Shop units always start at 1 star
      shopId: `shop_${Date.now()}_${Math.random()}` // Unique ID for shop tracking
    }
  }, [])
  
  // Generate a complete shop
  const generateShop = useCallback((playerLevel) => {
    console.log('Generating shop for level', playerLevel)
    
    // First, return any existing shop units to pool
    currentShop.forEach(unit => {
      if (unit) {
        unitPoolHook.returnUnitsToPool(unit.id, 1)
      }
    })
    
    const newShop = []
    const reservedUnits = [] // Track units we're reserving for this shop
    
    for (let i = 0; i < SHOP_SIZE; i++) {
      const unit = generateShopSlot(playerLevel)
      if (unit) {
        // Reserve unit from pool temporarily (for shop display)
        unitPoolHook.takeUnitsFromPool(unit.id, 1)
        reservedUnits.push(unit.id)
        newShop.push(unit)
      } else {
        newShop.push(null) // Empty slot
      }
    }
    
    console.log('Generated shop with', newShop.filter(u => u !== null).length, 'units, reserved:', reservedUnits.length)
    setCurrentShop(newShop)
    return newShop
  }, [generateShopSlot, unitPoolHook, currentShop])
  
  // Return current shop units to pool (when rerolling)
  const returnShopToPool = useCallback(() => {
    currentShop.forEach(unit => {
      if (unit) {
        unitPoolHook.returnUnitsToPool(unit.id, 1)
      }
    })
  }, [currentShop, unitPoolHook])
  
  // Reroll the shop
  const rerollShop = useCallback((playerLevel) => {
    // Return current shop units to pool
    returnShopToPool()
    
    // Generate new shop
    const newShop = generateShop(playerLevel)
    
    // Increment reroll count for analytics
    setRerollCount(prev => prev + 1)
    
    return newShop
  }, [returnShopToPool, generateShop])
  
  // Purchase a unit from shop
  const purchaseUnit = useCallback((shopSlotIndex, targetLocation = 'bench') => {
    const unit = currentShop[shopSlotIndex]
    if (!unit) return null
    
    console.log('Purchasing unit:', unit.name, 'from slot', shopSlotIndex)
    
    // Unit is already taken from pool (reserved for shop display)
    // When purchased, it stays taken from pool permanently
    // Just remove from shop and return the unit
    setCurrentShop(prev => {
      const newShop = [...prev]
      newShop[shopSlotIndex] = null
      return newShop
    })
    
    // Return unit object for placing on board/bench
    return {
      ...unit,
      // Remove shop-specific properties
      shopId: undefined,
      // Add placement properties
      location: targetLocation,
      placedAt: Date.now()
    }
  }, [currentShop])
  
  // Sell a unit (return to pool)
  const sellUnit = useCallback((unit) => {
    if (unit && unit.id) {
      unitPoolHook.returnUnitsToPool(unit.id, 1)
    }
  }, [unitPoolHook])
  
  // Get shop statistics
  const getShopStats = useCallback(() => {
    const stats = {
      unitsInShop: currentShop.filter(unit => unit !== null).length,
      emptySlots: currentShop.filter(unit => unit === null).length,
      rerollCount,
      totalGoldSpentOnRerolls: rerollCount * REROLL_COST,
      costDistribution: {}
    }
    
    // Calculate cost distribution
    for (let cost = 1; cost <= 5; cost++) {
      stats.costDistribution[cost] = currentShop.filter(unit => 
        unit && unit.cost === cost
      ).length
    }
    
    return stats
  }, [currentShop, rerollCount])
  
  // Reset shop state
  const resetShop = useCallback(() => {
    returnShopToPool()
    setCurrentShop([])
    setRerollCount(0)
  }, [returnShopToPool])
  
  // Calculate the cost of rerolling
  const getRerollCost = useCallback(() => {
    return REROLL_COST
  }, [])
  
  // Check if player can afford to reroll
  const canAffordReroll = useCallback((playerGold) => {
    return playerGold >= REROLL_COST
  }, [])
  
  return {
    currentShop,
    rerollCount,
    generateShop,
    rerollShop,
    purchaseUnit,
    sellUnit,
    getShopStats,
    resetShop,
    getRerollCost,
    canAffordReroll,
    returnShopToPool
  }
}