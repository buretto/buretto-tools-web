/**
 * Hook for managing TFT starring system
 * Handles automatic unit combining and star management
 */

import { useCallback } from 'react'
import { combineUnits, calculateSellValue } from '../utils/starringSystem'

export const useStarringSystem = () => {
  
  /**
   * Process units for potential combining
   * @param {Array} benchUnits - Units on bench
   * @param {Array} boardUnits - Units on board
   * @returns {Object} - { newBenchUnits, newBoardUnits, combinedUnits }
   */
  const processUnitCombining = useCallback((benchUnits, boardUnits) => {
    // Prepare all units with location information
    const allUnits = []
    
    // Add bench units
    benchUnits.forEach((unit, index) => {
      if (unit) {
        allUnits.push({
          ...unit,
          location: 'bench',
          benchIndex: index
        })
      } else {
        allUnits.push(null)
      }
    })
    
    // Add board units
    boardUnits.forEach((unit, index) => {
      if (unit) {
        allUnits.push({
          ...unit,
          location: 'board',
          boardIndex: index
        })
      }
    })
    
    // Combine units
    const result = combineUnits(allUnits, (removedUnits, newUnit) => {
      console.log('Units combined:', removedUnits.length, 'units became', newUnit.stars, 'star', newUnit.name)
    })
    
    // Separate back to bench and board
    const newBenchUnits = new Array(benchUnits.length).fill(null)
    const newBoardUnits = []
    
    let benchIndex = 0
    let boardIndex = 0
    
    result.newUnits.forEach(unit => {
      if (unit.location === 'bench') {
        // Find next available bench slot
        while (benchIndex < newBenchUnits.length && newBenchUnits[benchIndex] !== null) {
          benchIndex++
        }
        if (benchIndex < newBenchUnits.length) {
          newBenchUnits[benchIndex] = {
            ...unit,
            benchIndex
          }
          benchIndex++
        }
      } else {
        // Board unit
        newBoardUnits.push(unit)
        boardIndex++
      }
    })
    
    return {
      newBenchUnits,
      newBoardUnits,
      combinedUnits: result.combinedUnits
    }
  }, [])
  
  /**
   * Add a unit and check for combining
   * @param {Object} unit - Unit to add
   * @param {Array} benchUnits - Current bench units
   * @param {Array} boardUnits - Current board units
   * @param {string} targetLocation - 'bench' or 'board'
   * @param {number} targetIndex - Index for placement
   * @returns {Object} - { newBenchUnits, newBoardUnits, combinedUnits }
   */
  const addUnitWithCombining = useCallback((unit, benchUnits, boardUnits, targetLocation = 'bench', targetIndex = null) => {
    // Add the unit to appropriate location
    let newBenchUnits = [...benchUnits]
    let newBoardUnits = [...boardUnits]
    
    if (targetLocation === 'bench') {
      if (targetIndex !== null && targetIndex < newBenchUnits.length) {
        newBenchUnits[targetIndex] = { ...unit, location: 'bench', benchIndex: targetIndex }
      } else {
        // Find first empty slot
        const emptyIndex = newBenchUnits.findIndex(slot => slot === null)
        if (emptyIndex !== -1) {
          newBenchUnits[emptyIndex] = { ...unit, location: 'bench', benchIndex: emptyIndex }
        }
      }
    } else {
      // Adding to board
      newBoardUnits.push({ ...unit, location: 'board' })
    }
    
    // Process combining
    return processUnitCombining(newBenchUnits, newBoardUnits)
  }, [processUnitCombining])
  
  /**
   * Calculate sell value using new pricing rules
   */
  const getSellValue = useCallback((unit) => {
    return calculateSellValue(unit)
  }, [])
  
  return {
    processUnitCombining,
    addUnitWithCombining,
    getSellValue
  }
}