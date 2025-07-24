import React from 'react'
import { Star } from 'lucide-react'

function PlayerInfo({ player }) {
  const getLevelUpCost = (level) => {
    const costs = [0, 0, 2, 6, 10, 20, 36, 48, 76, 84]
    return costs[level] || 0
  }
  
  return (
    <div className="player-info-container" style={{ width: 'calc(25% - 0.5rem)', minWidth: '140px' }}>
      {/* Level and XP section with separate background */}
      <div className="level-section bg-gray-900 p-2 rounded-lg mb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-blue-400" />
            <span className="font-semibold text-sm">Lv {player.level}</span>
          </div>
          <div className="text-xs text-gray-400">
            {player.exp}/{getLevelUpCost(player.level)}
          </div>
        </div>
        <div className="bg-gray-700 rounded-full h-2">
          <div 
            className="bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(player.exp / getLevelUpCost(player.level)) * 100}%` }}
          />
        </div>
      </div>
      
      {/* Button section matching shop slot height */}
      <div className="button-section flex flex-col gap-1" style={{ height: '120px' }}>
        <button className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-xs flex-1">
          Buy XP (4g)
        </button>
        <button className="w-full px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-xs flex-1">
          Refresh ($2)
        </button>
      </div>
    </div>
  )
}

export default PlayerInfo