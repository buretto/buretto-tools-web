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
    shop: []
  },
  opponent: {
    bench: [] // Opponent bench for display purposes
  },
  unitPool: new Map(),
  analytics: {
    rollsPerMinute: 0,
    goldSpent: 0,
    startTime: Date.now(),
    actions: []
  }
}

function RolldownTool() {
  const [gameState, setGameState] = useState(INITIAL_GAME_STATE)
  
  
  return (
    <div className="game-root w-full h-full">
      <div className="game-content">
        {/* Header Area - 15% of content height */}
        <div className="game-header">
          <div className="flex justify-between items-center p-4 bg-gray-800 border-b border-gray-700 w-full h-full">
            <Timer 
              phase={gameState.phase} 
              timer={gameState.timer}
              onPhaseChange={(newPhase) => setGameState(prev => ({ ...prev, phase: newPhase }))}
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
                  <button className="w-full bg-blue-600 hover:bg-blue-700 rounded transition-colors responsive-button-text responsive-button-padding flex-1">
                    Refresh ($2)
                  </button>
                </div>
              </div>
              
              {/* Shop - 75% of shop area width */}
              <div className="shop-wrapper">
                <Shop 
                  units={gameState.player.shop}
                  playerGold={gameState.player.gold}
                  onPurchase={(unit) => {
                    // TODO: Implement unit purchase
                    console.log('Purchase unit', unit)
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
      </div>
    </div>
  )
}

export default RolldownTool