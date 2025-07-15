import React, { useState, useEffect } from 'react'
import { Star } from 'lucide-react'
import GameBoard from './components/GameBoard'
import Shop from './components/Shop'
import Bench from './components/Bench'
import OpponentBench from './components/OpponentBench'
import PlayerInfo from './components/PlayerInfo'
import Timer from './components/Timer'
import Analytics from './components/Analytics'
import TraitsColumn from './components/TraitsColumn'
import TFTVersionSelector from './components/TFTVersionSelector'
import ImageMappingModal from './components/ImageMappingModal'
import ImageLoadWarning from './components/ImageLoadWarning'
import { useTFTData } from './hooks/useTFTData'
import { useTFTImages } from './hooks/useTFTImages'
import { useUnitPool } from './hooks/useUnitPool'
import { useShop } from './hooks/useShop'
import { startImagePreloading, setPreloadCallbacks, getPreloadProgress, PRELOAD_PHASES } from './utils/imagePreloader'
import './styles/rolldown.css'

const getLevelUpCost = (level) => {
  const costs = [0, 2, 2, 6, 10, 20, 36, 56, 80]
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
    bench: [],
    shop: [] // Now dynamically generated
  },
  opponent: {
    bench: [] // Opponent bench for display purposes
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
  
  // Handle shop reroll
  const handleReroll = () => {
    const rerollCost = shopHook.getRerollCost()
    
    if (gameState.player.gold >= rerollCost) {
      const newShop = shopHook.rerollShop(gameState.player.level)
      
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
  
  // Handle unit purchase
  const handlePurchase = (unit, shopSlotIndex) => {
    console.log('Purchasing unit:', unit, 'at slot:', shopSlotIndex)
    
    // Check if bench is full (9 slots)
    const benchUnits = gameState.player.bench.filter(unit => unit !== null)
    if (benchUnits.length >= 9) {
      // Show warning and return early
      setBenchFullWarning(true)
      setTimeout(() => setBenchFullWarning(false), 1000)
      return
    }
    
    if (gameState.player.gold >= unit.cost) {
      const purchasedUnit = shopHook.purchaseUnit(shopSlotIndex, 'bench')
      
      if (purchasedUnit) {
        setGameState(prev => {
          // Create updated shop with purchased slot cleared
          const updatedShop = [...prev.player.shop]
          updatedShop[shopSlotIndex] = null
          
          return {
            ...prev,
            player: {
              ...prev.player,
              gold: prev.player.gold - unit.cost,
              bench: [...prev.player.bench, purchasedUnit],
              shop: updatedShop // Use explicitly updated shop
            },
            analytics: {
              ...prev.analytics,
              goldSpent: prev.analytics.goldSpent + unit.cost,
              actions: [...prev.analytics.actions, {
                type: 'purchase',
                timestamp: Date.now(),
                unit: unit.id,
                cost: unit.cost
              }]
            }
          }
        })
      }
    }
  }
  
  // Handle unit sell
  const handleSell = (unit, location, index) => {
    const sellValue = Math.floor(unit.cost * 0.6) // TFT sell value is 60% of cost
    
    shopHook.sellUnit(unit)
    
    setGameState(prev => {
      const newState = { ...prev }
      newState.player.gold += sellValue
      
      // Remove from appropriate location
      if (location === 'bench') {
        newState.player.bench = newState.player.bench.filter((_, i) => i !== index)
      } else if (location === 'board') {
        newState.player.board = newState.player.board.filter((_, i) => i !== index)
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
            
            <Analytics analytics={gameState.analytics} />
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
            onUnitMove={(fromPos, toPos) => {
              // TODO: Implement unit movement
              console.log('Move unit from', fromPos, 'to', toPos)
            }}
          />
        </div>
        
        {/* Player Bench Area - 6.8% of content height */}
        <div className="bench-area">
          <Bench 
            units={gameState.player.bench}
            tftData={tftData}
            tftImages={tftImages}
            onUnitMove={(fromPos, toPos) => {
              // TODO: Implement bench movement
              console.log('Move bench unit from', fromPos, 'to', toPos)
            }}
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
            
            {/* Main wrapper with aligned elements */}
            <div className="shop-container-wrapper">
              {/* Player buttons - 25% of shop area width */}
              <div className="player-buttons-section unified-slot">
                <div className="button-section flex flex-col responsive-button-gap" style={{ height: '100%', position: 'relative', zIndex: 1 }}>
                  <button className="w-full bg-blue-600 hover:bg-blue-700 rounded transition-colors responsive-button-text responsive-button-padding flex-1">
                    Buy XP (4g)
                  </button>
                  <button 
                    className={`w-full rounded transition-colors responsive-button-text responsive-button-padding flex-1 ${
                      shopHook.canAffordReroll(gameState.player.gold) 
                        ? 'bg-green-600 hover:bg-green-700' 
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                    onClick={handleReroll}
                    disabled={!shopHook.canAffordReroll(gameState.player.gold)}
                  >
                    Refresh ({shopHook.getRerollCost()}g)
                  </button>
                </div>
              </div>
              
              {/* Shop - 75% of shop area width */}
              <div className="shop-wrapper">
                <Shop 
                  units={gameState.player.shop}
                  playerGold={gameState.player.gold}
                  tftData={tftData}
                  tftImages={tftImages}
                  onPurchase={(unit, shopSlotIndex) => {
                    handlePurchase(unit, shopSlotIndex)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Traits Column - Positioned absolutely */}
        <div className="traits-column">
          <TraitsColumn boardUnits={gameState.player.board} />
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
      </div>
    </div>
  )
}

export default RolldownTool