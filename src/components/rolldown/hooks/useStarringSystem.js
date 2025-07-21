/**
 * Hook for managing TFT starring system
 * Handles automatic unit combining and star management
 */

import { useCallback } from 'react'
import { combineUnits, calculateSellValue } from '../utils/starringSystem'

export const useStarringSystem = (audioManager = null) => {
  
  /**
   * Process units for potential combining
   * @param {Array} benchUnits - Units on bench
   * @param {Array} boardUnits - Units on board
   * @returns {Object} - { newBenchUnits, newBoardUnits, combinedUnits }
   */
  const processUnitCombining = useCallback((benchUnits, boardUnits) => {
    // Prepare all units with location information
    const allUnits = []
    
    // Add bench units with exact position mapping
    benchUnits.forEach((unit, index) => {
      if (unit) {
        allUnits.push({
          ...unit,
          location: 'bench',
          benchIndex: index
        })
      } else {
        allUnits.push(null) // Preserve null slots to maintain array indices
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
      
      // Play star-up sound based on new star level
      if (audioManager && newUnit.stars === 2) {
        audioManager.play2Star()
      } else if (audioManager && newUnit.stars === 3) {
        audioManager.play3Star()
      }
    })
    
    // Separate back to bench and board while preserving original positions
    // Always maintain exactly 9 bench slots
    const newBenchUnits = new Array(9).fill(null)
    const newBoardUnits = []
    
    // Separate the combined units back to their original locations
    result.newUnits.forEach((unit, index) => {
      if (!unit) return // Skip null slots
      
      if (unit.location === 'bench') {
        // Use the unit's benchIndex to maintain position
        const targetIndex = unit.benchIndex !== undefined ? unit.benchIndex : index
        if (targetIndex < 9) {
          newBenchUnits[targetIndex] = {
            ...unit,
            benchIndex: targetIndex
          }
        } else {
          // If benchIndex is invalid (>=9), find first empty slot as fallback
          const emptyIndex = newBenchUnits.findIndex(slot => slot === null)
          if (emptyIndex !== -1) {
            newBenchUnits[emptyIndex] = {
              ...unit,
              benchIndex: emptyIndex
            }
          } else {
            // If bench is completely full, move to board as fallback
            console.warn('Bench still full after combining, moving unit to board:', unit.name)
            newBoardUnits.push({
              ...unit,
              location: 'board',
              row: 0, // Place at front row
              col: newBoardUnits.filter(u => u.row === 0).length // Next available column
            })
          }
        }
      } else {
        // Board unit - preserve position
        newBoardUnits.push(unit)
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
   * @param {boolean} forceAdd - If true, add unit even if bench is full (for star-up combinations)
   * @returns {Object} - { newBenchUnits, newBoardUnits, combinedUnits }
   */
  const addUnitWithCombining = useCallback((unit, benchUnits, boardUnits, targetLocation = 'bench', targetIndex = null, forceAdd = false) => {
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
        } else if (forceAdd) {
          // Bench is full but we're forcing add (for star-up combinations)
          // Add to a temporary 10th slot that will be processed by combining
          newBenchUnits.push({ ...unit, location: 'bench', benchIndex: newBenchUnits.length })
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