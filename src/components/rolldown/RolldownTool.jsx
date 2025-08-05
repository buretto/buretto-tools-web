import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Star, Coins, BarChart3, Settings, Users } from 'lucide-react'
import GameBoard from './components/GameBoard'
import Shop from './components/Shop'
import Bench from './components/Bench'
import OpponentBench from './components/OpponentBench'
import PlayerInfo from './components/PlayerInfo'
import Timer from './components/Timer'
import Analytics from './components/Analytics'
import AnalyticsPanel from './components/AnalyticsPanel'
import SettingsPanel from './components/SettingsPanel'
import TraitsColumn from './components/TraitsColumn'
import TFTVersionSelector from './components/TFTVersionSelector'
import ImageMappingModal from './components/ImageMappingModal'
import ImageLoadWarning from './components/ImageLoadWarning'
import TeamPlannerModal from './components/TeamPlannerModal'
import { useTFTData } from './hooks/useTFTData'
import { useTFTImages } from './hooks/useTFTImages'
import { useUnitPool } from './hooks/useUnitPool'
import { useShop } from './hooks/useShop'
import { useStarringSystem } from './hooks/useStarringSystem'
import { useKeyboardHotkeys } from './hooks/useKeyboardHotkeys'
import { useHoveredUnit } from './hooks/useHoveredUnit'
import { canCreateStarUpCombination } from './utils/starUpChecker'
import { startImagePreloading, setPreloadCallbacks, getPreloadProgress, PRELOAD_PHASES } from './utils/imagePreloader'
import { getShopOdds, getSetFromVersion } from './data/shopOdds'
import audioManager from './utils/audioManager'
import './styles/rolldown.css'

const getLevelUpCost = (level) => {
  const costs = [0, 0, 2, 6, 10, 20, 36, 48, 76, 84]
  return costs[level] || 0
}

const INITIAL_GAME_STATE = {
  phase: 'scouting',
  timer: 60,
  player: {
    gold: 150,
    level: 8,
    exp: 0,
    board: [],
    bench: new Array(9).fill(null),
    shop: [] // Now dynamically generated
  },
  opponent: {
    bench: [], // Opponent bench for display purposes
    board: [] // Opponent board for display purposes
  },
  analytics: {
    rollsPerMinute: 0,
    goldSpent: 0,
    startTime: Date.now(),
    actions: []
  }
}

function RolldownTool() {
  const [gameState, setGameState] = useState(INITIAL_GAME_STATE)
  const [benchFullWarning, setBenchFullWarning] = useState(false)
  const [preloadProgress, setPreloadProgress] = useState({
    critical: { loaded: 0, total: 0, complete: false },
    background: { loaded: 0, total: 0, complete: false },
    overall: { loaded: 0, total: 0, percentage: 0 }
  })
  const [preloadPhase, setPreloadPhase] = useState(null)
  const [mappingModalOpen, setMappingModalOpen] = useState(false)
  const [mappingModalVersion, setMappingModalVersion] = useState(null)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hotkeys, setHotkeys] = useState({ d: 'buy-roll', f: 'buy-xp', e: 'sell-unit', w: 'place-unit' })
  const [lastRerollTime, setLastRerollTime] = useState(0)
  const [rerollCooldown, setRerollCooldown] = useState(false)
  const [teamPlannerOpen, setTeamPlannerOpen] = useState(false)
  
  const { 
    data: tftData, 
    loading: tftLoading, 
    error: tftError, 
    currentVersion, 
    cachedVersions, 
    loadVersion 
  } = useTFTData()
  
  
  const tftImages = useTFTImages(tftData)
  
  
  // Initialize pool and shop management
  const unitPoolHook = useUnitPool(tftData, currentVersion)
  const shopHook = useShop(tftData, currentVersion, unitPoolHook)
  const starringSystem = useStarringSystem(audioManager)
  
  // Initialize hovered unit tracking
  const { hoveredUnit, onUnitHover, clearHoveredUnit } = useHoveredUnit()
  
  // Initialize audio manager
  useEffect(() => {
    audioManager.initialize()
  }, [])
  
  // Set up drag manager audio after audio manager is ready
  useEffect(() => {
    import('./utils/DragManager').then(module => {
      const dragManager = module.default
      dragManager.setAudioManager(audioManager)
    })
  }, [])
  
  // Set up preloading callbacks
  useEffect(() => {
    setPreloadCallbacks({
      onProgress: (progress) => {
        setPreloadProgress(progress)
      },
      onPhaseComplete: (phase, progress) => {
        console.log(`Preload phase '${phase}' complete`)
        setPreloadPhase(phase)
      },
      onComplete: (progress) => {
        console.log('All image preloading complete!')
        setPreloadPhase(PRELOAD_PHASES.COMPLETE)
      }
    })
  }, [])

  // Initialize pool when tftData is loaded
  useEffect(() => {
    if (tftData && tftData.champions && Object.keys(tftData.champions).length > 0 && !tftLoading) {
      console.log('Initializing pool with tftData:', Object.keys(tftData.champions).length, 'champions')
      
      // Initialize pool - preloading will happen after shop is generated
      unitPoolHook.initializePool()
    }
  }, [tftData, tftLoading])
  
  // Generate shop when unitPool is ready and shop is empty
  useEffect(() => {
    if (unitPoolHook.unitPool.size > 0 && gameState.player.shop.length === 0) {
      console.log('Pool is ready with', unitPoolHook.unitPool.size, 'units, generating initial shop...')
      const initialShop = shopHook.generateShop(gameState.player.level)
      console.log('Generated initial shop:', initialShop)
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          shop: initialShop
        }
      }))
      
      // Start preloading with critical shop images
      if (tftData && initialShop.length > 0) {
        const startPreloading = async () => {
          try {
            const criticalChampionIds = initialShop
              .filter(unit => unit && unit.id)
              .map(unit => unit.id)
            
            console.log(`Starting preload with ${criticalChampionIds.length} critical images`)
            
            await startImagePreloading(tftData, criticalChampionIds, currentVersion)
          } catch (error) {
            console.error('Image preloading failed:', error)
          }
        }
        
        startPreloading()
      }
    }
  }, [unitPoolHook.unitPool.size, gameState.player.shop.length, tftData, currentVersion])
  
  // Track shop rerolls to force component re-mounting (restarts animations)
  const [shopKey, setShopKey] = useState(0)

  // Handle shop reroll with rate limiting
  const handleReroll = () => {
    const rerollCost = shopHook.getRerollCost()
    const now = Date.now()
    const timeSinceLastReroll = now - lastRerollTime
    const minRerollInterval = 250 // 250ms = 4 rerolls per second max
    
    if (gameState.player.gold >= rerollCost && timeSinceLastReroll >= minRerollInterval) {
      setLastRerollTime(now)
      setRerollCooldown(true)
      
      // Reset cooldown after the interval
      setTimeout(() => {
        setRerollCooldown(false)
      }, minRerollInterval)
      const newShop = shopHook.rerollShop(gameState.player.level)
      
      // Force Shop component to re-mount (restarts all animations from beginning)
      setShopKey(prev => prev + 1)
      
      // Play reroll sound
      audioManager.playBuyRoll()
      
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - rerollCost,
          shop: newShop
        },
        analytics: {
          ...prev.analytics,
          goldSpent: prev.analytics.goldSpent + rerollCost,
          actions: [...prev.analytics.actions, {
            type: 'reroll',
            timestamp: Date.now(),
            cost: rerollCost
          }]
        }
      }))
    }
  }
  
  // Handle buy XP
  const handleBuyXP = () => {
    const xpCost = 4
    
    if (gameState.player.gold >= xpCost && gameState.player.level < 10) {
      const currentExp = gameState.player.exp
      const levelUpCost = getLevelUpCost(gameState.player.level)
      const newExp = currentExp + 4
      
      let newLevel = gameState.player.level
      let finalExp = newExp
      
      // Check if we level up
      if (newExp >= levelUpCost) {
        newLevel = gameState.player.level + 1
        finalExp = newExp - levelUpCost
      }
      
      // Play XP sound
      audioManager.playBuyXP()
      
      setGameState(prev => ({
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - xpCost,
          exp: finalExp,
          level: newLevel
        },
        analytics: {
          ...prev.analytics,
          goldSpent: prev.analytics.goldSpent + xpCost,
          actions: [...prev.analytics.actions, {
            type: 'buy-xp',
            timestamp: Date.now(),
            cost: xpCost
          }]
        }
      }))
    }
  }
  
  // Handle unit purchase
  const handlePurchase = (unit, shopSlotIndex) => {
    console.log('Purchasing unit:', unit, 'at slot:', shopSlotIndex)
    
    // Check if bench is full (9 slots)
    const benchUnits = gameState.player.bench.filter(unit => unit !== null)
    const isBenchFull = benchUnits.length >= 9
    
    // Check if this unit can create a star-up combination
    const canStarUp = canCreateStarUpCombination(unit, gameState.player.bench, gameState.player.board)
    
    // Only block purchase if bench is full AND no star-up combination is possible
    if (isBenchFull && !canStarUp) {
      // Show warning and return early
      setBenchFullWarning(true)
      setTimeout(() => setBenchFullWarning(false), 1000)
      console.log('🚫 Purchase blocked: bench full and no star-up combination possible for', unit.name)
      return
    }
    
    if (canStarUp && isBenchFull) {
      console.log('✅ Purchase allowed: star-up combination possible for', unit.name, 'despite full bench')
    }
    
    // Calculate the actual cost based on star level
    const actualCost = unit.cost * (unit.stars || 1) * (unit.stars || 1)
    
    if (gameState.player.gold >= actualCost) {
      const purchasedUnit = shopHook.purchaseUnit(shopSlotIndex, 'bench')
      
      if (purchasedUnit) {
        // Play purchase sound
        audioManager.playBuyUnit()
        setGameState(prev => {
          // Create updated shop with purchased slot cleared
          const updatedShop = [...prev.player.shop]
          updatedShop[shopSlotIndex] = null
          
          // Use the unit as-is from shop (with its star level already set)
          // No need to modify stars - the shop unit already has the correct star level
          
          // Add unit to bench and check for combining
          // Force add if star-up combination is possible (even when bench is full)
          const result = starringSystem.addUnitWithCombining(
            purchasedUnit, 
            prev.player.bench, 
            prev.player.board, 
            'bench',
            null,
            canStarUp // forceAdd parameter
          )
          
          return {
            ...prev,
            player: {
              ...prev.player,
              gold: prev.player.gold - actualCost,
              bench: result.newBenchUnits,
              board: result.newBoardUnits,
              shop: updatedShop // Use explicitly updated shop
            },
            analytics: {
              ...prev.analytics,
              goldSpent: prev.analytics.goldSpent + actualCost,
              actions: [...prev.analytics.actions, {
                type: 'purchase',
                timestamp: Date.now(),
                unit: unit.id,
                cost: actualCost,
                combinedUnits: result.combinedUnits
              }]
            }
          }
        })
      }
    }
  }
  
  // Handle unit sell
  const handleSell = (unit, location, index) => {
    const sellValue = starringSystem.getSellValue(unit)
    
    shopHook.sellUnit(unit)
    
    // Play sell sound
    audioManager.playSellUnit()
    
    // Use a closure variable to prevent React Strict Mode double execution
    let sellProcessed = false
    
    setGameState(prev => {
      // If this closure's sell has already been processed, return unchanged state
      if (sellProcessed) {
        return prev
      }
      
      // Mark this sell as processed
      sellProcessed = true
      
      const newState = { ...prev }
      newState.player.gold += sellValue
      
      // Remove from appropriate location
      if (location === 'bench') {
        const newBench = [...newState.player.bench]
        newBench[index] = null
        newState.player.bench = newBench
      } else if (location === 'board') {
        // For board units, find by row/col position instead of array index
        newState.player.board = newState.player.board.filter(boardUnit => 
          !(boardUnit.row === unit.row && boardUnit.col === unit.col)
        )
      }
      
      newState.analytics = {
        ...prev.analytics,
        actions: [...prev.analytics.actions, {
          type: 'sell',
          timestamp: Date.now(),
          unit: unit.id,
          value: sellValue
        }]
      }
      
      return newState
    })
  }

  // Handle unit move from bench to board or board to bench
  const handleUnitMove = (unit, fromLocation, fromIndex, toLocation, toIndex, toRow, toCol) => {
    setGameState(prev => {
      const newState = { ...prev }
      
      // Create new bench and board arrays
      const newBench = [...newState.player.bench]
      const newBoard = [...newState.player.board]
      
      // Handle moves based on source and destination
      if (fromLocation === 'bench' && toLocation === 'board') {
        // Bench to board: Check capacity FIRST, then move
        const currentBoardSize = newBoard.length
        const playerLevel = newState.player.level
        
        if (currentBoardSize >= playerLevel) {
          // Board is full - leave unit in bench (no changes)
        } else {
          // Board has space - remove from bench and add to board
          newBench[fromIndex] = null
          const updatedUnit = { ...unit, row: toRow, col: toCol }
          newBoard.push(updatedUnit)
        }
      } else if (fromLocation === 'board' && toLocation === 'bench') {
        // Board to bench: Remove from board, add to bench
        const boardIndex = newBoard.findIndex(u => 
          u.row === unit.row && u.col === unit.col
        )
        if (boardIndex !== -1) {
          newBoard.splice(boardIndex, 1)
        }
        
        // Clean the unit's position data when moving to bench
        const benchUnit = { ...unit }
        delete benchUnit.row
        delete benchUnit.col
        
        // Simple duplication check - if this exact unit already exists on bench, skip
        const alreadyOnBench = newBench.some(benchSlot => 
          benchSlot && 
          benchSlot.id === unit.id && 
          benchSlot.row === unit.row &&
          benchSlot.col === unit.col
        )
        
        if (!alreadyOnBench) {
          if (toIndex !== null && toIndex !== undefined) {
            newBench[toIndex] = benchUnit
          } else {
            const emptySlot = newBench.findIndex(slot => slot === null)
            if (emptySlot !== -1) {
              newBench[emptySlot] = benchUnit
            }
          }
        }
      } else if (fromLocation === 'board' && toLocation === 'board') {
        // Board to board: Remove from old position, add to new position
        const boardIndex = newBoard.findIndex(u => 
          u.row === unit.row && u.col === unit.col
        )
        if (boardIndex !== -1) {
          newBoard.splice(boardIndex, 1)
        }
        const updatedUnit = { ...unit, row: toRow, col: toCol }
        newBoard.push(updatedUnit)
      } else if (fromLocation === 'bench' && toLocation === 'bench') {
        // Bench to bench: Remove from old position, add to new position
        newBench[fromIndex] = null
        if (toIndex !== null && toIndex !== undefined) {
          newBench[toIndex] = unit
        } else {
          const emptySlot = newBench.findIndex(slot => slot === null)
          if (emptySlot !== -1) {
            newBench[emptySlot] = unit
          }
        }
      }
      
      // Update state and clean up any duplicates
      newState.player.bench = removeBenchDuplicates(newBench)
      newState.player.board = removeBoardDuplicates(newBoard)
      
      return newState
    })
  }

  // Handle unit swap between positions
  // Helper function to remove duplicate units from board
  const removeBoardDuplicates = (boardUnits) => {
    const seen = new Set()
    return boardUnits.filter(unit => {
      if (!unit) return false
      const key = `${unit.id}_${unit.row}_${unit.col}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Helper function to remove duplicate units - only remove units that still have position data
  const removeBenchDuplicates = (benchUnits) => {
    const seen = new Set()
    
    return benchUnits.map((unit, index) => {
      if (!unit) return null
      
      // Only consider it a duplicate if it has position data (came from board)
      // AND we've already seen the same unit with the same position data
      if (unit.row !== undefined && unit.col !== undefined) {
        const positionKey = `${unit.id}_${unit.stars}_${unit.row}_${unit.col}`
        
        if (seen.has(positionKey)) {
          return null // Remove duplicate that came from same board position
        }
        
        seen.add(positionKey)
      }
      
      // Always keep units without position data (legitimate purchases)
      return unit
    })
  }

  const handleUnitSwap = (unit1, location1, index1, row1, col1, unit2, location2, index2, row2, col2) => {
    console.log('🔄 SWAP HANDLER CALLED:', { 
      unit1: unit1?.name, 
      location1, 
      unit2: unit2?.name, 
      location2 
    })
    
    setGameState(prev => {
      const newState = { ...prev }
      const newBench = [...newState.player.bench]
      const newBoard = [...newState.player.board]
      
      if (location1 === 'bench' && location2 === 'bench') {
        // Swap bench positions
        newBench[index1] = unit2
        newBench[index2] = unit1
      } else if (location1 === 'board' && location2 === 'board') {
        // Swap board positions - find units by position
        const unit1Index = newBoard.findIndex(u => u.row === unit1.row && u.col === unit1.col)
        const unit2Index = newBoard.findIndex(u => u.row === unit2.row && u.col === unit2.col)
        
        // Prevent self-swaps and validate indices
        if (unit1Index !== -1 && unit2Index !== -1 && unit1Index !== unit2Index) {
          // Update positions
          newBoard[unit1Index] = { ...unit2, row: row1, col: col1 }
          newBoard[unit2Index] = { ...unit1, row: row2, col: col2 }
        }
      } else {
        // Swap between bench and board
        if (location1 === 'bench' && location2 === 'board') {
          // Remove unit1 from bench, remove unit2 from board
          newBench[index1] = { ...unit2 } // Place unit2 in bench position
          
          const unit2BoardIndex = newBoard.findIndex(u => u.row === unit2.row && u.col === unit2.col)
          if (unit2BoardIndex !== -1) {
            newBoard[unit2BoardIndex] = { ...unit1, row: row2, col: col2 } // Place unit1 in board position
          }
        } else if (location1 === 'board' && location2 === 'bench') {
          // Remove unit1 from board, remove unit2 from bench
          newBench[index2] = { ...unit1 } // Place unit1 in bench position
          
          const unit1BoardIndex = newBoard.findIndex(u => u.row === unit1.row && u.col === unit1.col)
          if (unit1BoardIndex !== -1) {
            newBoard[unit1BoardIndex] = { ...unit2, row: row1, col: col1 } // Place unit2 in board position
          }
        }
      }
      
      // Update state and clean up any duplicates
      // For swaps, no move context needed since we're not creating duplicates
      newState.player.bench = removeBenchDuplicates(newBench)
      newState.player.board = removeBoardDuplicates(newBoard)
      
      return newState
    })
  }

  // Handle opening mapping modal
  const handleOpenMappings = (version = currentVersion) => {
    setMappingModalVersion(version)
    setMappingModalOpen(true)
  }

  // Handle closing mapping modal
  const handleCloseMappings = () => {
    setMappingModalOpen(false)
    setMappingModalVersion(null)
  }

  // Handle unit placement/removal with w key
  const handlePlaceUnit = useCallback((unit) => {
    if (!unit || !unit.location) return
    
    // Get fresh state to avoid stale closure issues
    setGameState(prev => {
      // Validate unit still exists in current state
      let currentUnit = null
      if (unit.location === 'bench') {
        currentUnit = prev.player.bench[unit.index]
        if (!currentUnit || currentUnit.id !== unit.id) {
          return prev // Unit no longer exists or has changed
        }
      } else if (unit.location === 'board') {
        currentUnit = prev.player.board.find(u => 
          u.row === unit.row && u.col === unit.col && u.id === unit.id
        )
        if (!currentUnit) {
          return prev // Unit no longer exists
        }
      }
      
      if (unit.location === 'bench') {
        // Move from bench to board - find first available spot
        const currentBoardSize = prev.player.board.length
        if (currentBoardSize >= prev.player.level) {
          return prev // Board is full
        }
        
        // Find first available position starting from bottom-left
        let targetRow = 3
        let targetCol = 0
        let found = false
        
        for (let row = 3; row >= 0 && !found; row--) {
          for (let col = 0; col < 7 && !found; col++) {
            const occupied = prev.player.board.find(u => u.row === row && u.col === col)
            if (!occupied) {
              targetRow = row
              targetCol = col
              found = true
            }
          }
        }
        
        if (found) {
          // Perform the move directly in state update
          const newState = { ...prev }
          const newBench = [...newState.player.bench]
          const newBoard = [...newState.player.board]
          
          // Remove from bench
          newBench[unit.index] = null
          
          // Add to board
          const boardUnit = { ...currentUnit, row: targetRow, col: targetCol }
          newBoard.push(boardUnit)
          
          newState.player.bench = newBench
          newState.player.board = newBoard
          
          return newState
        }
      } else if (unit.location === 'board') {
        // Move from board to bench
        const newState = { ...prev }
        const newBench = [...newState.player.bench]
        const newBoard = [...newState.player.board]
        
        // Remove from board
        const boardIndex = newBoard.findIndex(u => 
          u.row === unit.row && u.col === unit.col
        )
        if (boardIndex !== -1) {
          newBoard.splice(boardIndex, 1)
        }
        
        // Add to bench (clean position data)
        const benchUnit = { ...currentUnit }
        delete benchUnit.row
        delete benchUnit.col
        
        const emptySlot = newBench.findIndex(slot => slot === null)
        if (emptySlot !== -1) {
          newBench[emptySlot] = benchUnit
        }
        
        newState.player.bench = removeBenchDuplicates(newBench)
        newState.player.board = removeBoardDuplicates(newBoard)
        
        return newState
      }
      
      return prev
    })
  }, [])

  // Handle instant sell with e key
  const handleInstantSell = useCallback((unit) => {
    if (!unit || !unit.location) return
    
    // Validate that the unit still exists in the current game state
    let unitExists = false
    if (unit.location === 'bench') {
      unitExists = gameState.player.bench[unit.index] && 
                   gameState.player.bench[unit.index].id === unit.id
    } else if (unit.location === 'board') {
      unitExists = gameState.player.board.some(boardUnit => 
        boardUnit && boardUnit.id === unit.id && 
        boardUnit.row === unit.row && boardUnit.col === unit.col
      )
    }
    
    // If unit no longer exists, clear hovered unit and return
    if (!unitExists) {
      clearHoveredUnit()
      return
    }
    
    const location = unit.location
    const index = unit.location === 'bench' ? unit.index : null
    handleSell(unit, location, index)
    
    // Clear hovered unit after selling to prevent repeated sells
    clearHoveredUnit()
  }, [gameState.player.bench, gameState.player.board, clearHoveredUnit])

  // Initialize keyboard hotkeys
  useKeyboardHotkeys({
    onBuyRoll: handleReroll,
    onBuyXP: handleBuyXP,
    onSellUnit: handleInstantSell,
    onPlaceUnit: handlePlaceUnit,
    hotkeyConfig: hotkeys,
    hoveredUnit,
    enabled: !analyticsOpen && !settingsOpen && !mappingModalOpen && !teamPlannerOpen
  })
  
  return (
      <div className="game-root w-full h-full">
        <div className="game-content">
        {/* Bench Full Warning */}
        {benchFullWarning && (
          <div className="bench-full-warning">
            <div className="bench-full-warning-text">
              Your bench is full, you must free up space on your bench to purchase a unit!
            </div>
          </div>
        )}
        
        {/* Header Area - 15% of content height */}
        <div className="game-header">
          <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700 w-full h-full">
            <Timer 
              phase={gameState.phase} 
              timer={gameState.timer}
              onPhaseChange={(newPhase) => setGameState(prev => ({ ...prev, phase: newPhase }))}
            />
            
            {/* Image Preloading Progress */}
            {preloadPhase !== PRELOAD_PHASES.COMPLETE && preloadProgress.overall.total > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-gray-300">
                    {preloadPhase === PRELOAD_PHASES.CRITICAL ? 'Loading shop...' : 
                     preloadPhase === PRELOAD_PHASES.BACKGROUND ? 'Loading images...' : 'Preparing...'}
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${
                          preloadPhase === PRELOAD_PHASES.CRITICAL ? 'bg-yellow-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${preloadProgress.overall.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 min-w-[2rem]">
                      {preloadProgress.overall.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Image Load Warning */}
            <ImageLoadWarning 
              onOpenMappings={handleOpenMappings}
              version={currentVersion}
              totalImages={preloadProgress.overall.total}
            />
            
            {/* Button Container for Team Planner, Analytics and Settings */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTeamPlannerOpen(true)}
                className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Team Planner"
              >
                <Users size={16} className="text-blue-400" />
              </button>
              <button
                onClick={() => setAnalyticsOpen(true)}
                className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Analytics"
              >
                <BarChart3 size={16} className="text-green-400" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                title="Settings"
              >
                <Settings size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Opponent Bench Area - 6.8% of content height */}
        <div className="opponent-bench-area">
          <OpponentBench 
            units={gameState.opponent?.bench || []}
            label="Opponent Bench"
          />
        </div>
        
        {/* Game Board Area - 61.2% of content height */}
        <div className="game-board-area">
          <GameBoard 
            units={gameState.player.board}
            opponentUnits={gameState.opponent.board || []}
            tftData={tftData}
            tftImages={tftImages}
            onUnitMove={handleUnitMove}
            onUnitSwap={handleUnitSwap}
            onSell={handleSell}
            onUnitHover={onUnitHover}
          />
        </div>
        
        {/* Player Bench Area - 6.8% of content height */}
        <div className="bench-area">
          <Bench 
            units={gameState.player.bench}
            tftData={tftData}
            tftImages={tftImages}
            onUnitMove={handleUnitMove}
            onUnitSwap={handleUnitSwap}
            onSell={handleSell}
            onUnitHover={onUnitHover}
          />
        </div>
        
        {/* Shop Area - 13% of content height */}
        <div className="shop-area">
          <div className="shop-area-content">
            {/* Level/XP section floating above */}
            <div className="level-floating-section">
              <div className="level-section bg-gray-900 py-1 px-2 rounded-lg" style={{ flex: 1 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold responsive-header-text-sm">Lv {gameState.player.level}</span>
                  </div>
                  <div className="responsive-header-text-xs text-gray-400">
                    {gameState.player.exp}/{getLevelUpCost(gameState.player.level)}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-full h-1">
                  <div 
                    className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${(gameState.player.exp / getLevelUpCost(gameState.player.level)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            {/* Shop Odds Display */}
            <div className="shop-odds-section">
              {(() => {
                const currentSet = getSetFromVersion(currentVersion)
                const shopOdds = getShopOdds(currentSet, currentVersion, gameState.player.level)
                if (!shopOdds) return null
                
                return (
                  <div className="shop-odds-container">
                    {shopOdds.slice(0, 5).map((percentage, index) => {
                      const cost = index + 1
                      const costClass = `cost-${cost}`
                      
                      // Define shapes for each cost tier
                      const renderShape = (cost) => {
                        if (cost <= 2) {
                          return <div className={`tier-shape tier-circle ${costClass}`} />
                        } else if (cost === 3) {
                          return <div className={`tier-shape tier-triangle ${costClass}`} />
                        } else if (cost === 4) {
                          return <div className={`tier-shape tier-pentagon ${costClass}`} />
                        } else if (cost === 5) {
                          return <div className={`tier-shape tier-hexagon ${costClass}`} />
                        }
                        return null
                      }
                      
                      return (
                        <div key={cost} className="shop-odds-item">
                          {renderShape(cost)}
                          <span className={`shop-odds-text ${costClass}`}>
                            {percentage}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
            
            {/* Player Gold Display */}
            <div className="player-gold-section">
              <div className="player-gold-container">
                <div className="player-gold-display">
                  <Coins className="player-gold-icon" />
                  <span className="player-gold-text">
                    {gameState.player.gold}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Main wrapper with aligned elements */}
            <div className="shop-container-wrapper">
              {/* Player buttons - 25% of shop area width */}
              <div className="player-buttons-section unified-slot">
                <div className="button-section flex flex-col responsive-button-gap" style={{ height: '100%', position: 'relative', zIndex: 1 }}>
                  <button 
                    className={`w-full rounded transition-colors responsive-button-text responsive-button-padding flex-1 ${
                      gameState.player.gold >= 4 && gameState.player.level < 10
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                    onClick={handleBuyXP}
                    disabled={gameState.player.gold < 4 || gameState.player.level >= 10}
                    style={{
                      opacity: (gameState.player.gold >= 4 && gameState.player.level < 10) ? 1 : 0.6
                    }}
                  >
                    Buy XP (4g)
                  </button>
                  <button 
                    className={`w-full rounded transition-colors responsive-button-text responsive-button-padding flex-1 ${
                      shopHook.canAffordReroll(gameState.player.gold) && !rerollCooldown
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                    onClick={handleReroll}
                    disabled={!shopHook.canAffordReroll(gameState.player.gold) || rerollCooldown}
                    style={{
                      opacity: (shopHook.canAffordReroll(gameState.player.gold) && !rerollCooldown) ? 1 : 0.6
                    }}
                  >
                    Refresh ({shopHook.getRerollCost()}g)
                  </button>
                </div>
              </div>
              
              {/* Shop - 75% of shop area width */}
              <div className="shop-wrapper">
                <Shop 
                  key={shopKey}
                  units={gameState.player.shop}
                  playerGold={gameState.player.gold}
                  tftData={tftData}
                  tftImages={tftImages}
                  benchUnits={gameState.player.bench}
                  boardUnits={gameState.player.board}
                  onPurchase={(unit, shopSlotIndex) => {
                    handlePurchase(unit, shopSlotIndex)
                  }}
                  onSell={handleSell}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Board Capacity Indicator - Positioned absolutely over opponent board */}
        <div 
          className={`board-capacity-indicator ${
            gameState.player.board.length >= gameState.player.level ? 'full' : 'not-full'
          }`}
        >
          {gameState.player.board.length}/{gameState.player.level}
        </div>

        {/* Traits Column - Positioned absolutely */}
        <div className="traits-column">
          <TraitsColumn boardUnits={gameState.player.board} tftData={tftData} />
        </div>
        
        {/* TFT Version Selector - Positioned absolutely */}
        <TFTVersionSelector
          currentVersion={currentVersion}
          cachedVersions={cachedVersions}
          loading={tftLoading}
          error={tftError}
          onVersionSelect={loadVersion}
          onOpenMappings={handleOpenMappings}
        />

        {/* Image Mapping Modal */}
        <ImageMappingModal
          isOpen={mappingModalOpen}
          onClose={handleCloseMappings}
          version={mappingModalVersion}
        />

        {/* Analytics Panel */}
        <AnalyticsPanel
          isOpen={analyticsOpen}
          onClose={() => setAnalyticsOpen(false)}
          analytics={gameState.analytics}
        />

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          hotkeys={hotkeys}
          onUpdateHotkeys={setHotkeys}
          defaultHotkeys={{ d: 'buy-roll', f: 'buy-xp', e: 'sell-unit', w: 'place-unit' }}
        />

        {/* Team Planner Modal */}
        <TeamPlannerModal
          isOpen={teamPlannerOpen}
          onClose={() => setTeamPlannerOpen(false)}
          tftData={tftData}
          tftImages={tftImages}
        />
        </div>
      </div>
  )
}

export default RolldownTool