import React, { useEffect } from 'react'
import { Clock, Play, Pause } from 'lucide-react'

function Timer({ phase, timer, onPhaseChange }) {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const getPhaseColor = (phase) => {
    switch (phase) {
      case 'scouting': return 'text-blue-400'
      case 'shopping': return 'text-yellow-400'
      case 'combat': return 'text-red-400'
      case 'analysis': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }
  
  const getPhaseDisplay = (phase) => {
    switch (phase) {
      case 'scouting': return 'Scouting'
      case 'shopping': return 'Shopping'
      case 'combat': return 'Combat'
      case 'analysis': return 'Analysis'
      default: return 'Unknown'
    }
  }
  
  const handleStartShopping = () => {
    onPhaseChange('shopping')
  }
  
  return (
    <div className="timer flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-400" />
        <div className={`text-2xl font-bold ${getPhaseColor(phase)}`}>
          {formatTime(timer)}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`text-lg font-semibold ${getPhaseColor(phase)}`}>
          {getPhaseDisplay(phase)}
        </div>
        
        {phase === 'scouting' && (
          <button
            onClick={handleStartShopping}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Shopping
          </button>
        )}
        
        {phase === 'shopping' && (
          <div className="text-sm text-gray-400">
            Shopping Phase Active
          </div>
        )}
      </div>
    </div>
  )
}

export default Timer