import React from 'react'
import { BarChart3, Clock, DollarSign, MousePointer } from 'lucide-react'

function Analytics({ analytics }) {
  const getElapsedTime = () => {
    return Math.floor((Date.now() - analytics.startTime) / 1000)
  }
  
  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  return (
    <div className="analytics flex items-center gap-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-green-400" />
        <span className="font-semibold">Analytics</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="stat-item">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium">Time:</span>
            <span className="text-lg font-bold text-blue-400">
              {formatElapsedTime(getElapsedTime())}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="flex items-center gap-2">
            <MousePointer className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium">Rolls/Min:</span>
            <span className="text-lg font-bold text-purple-400">
              {analytics.rollsPerMinute.toFixed(1)}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium">Gold Spent:</span>
            <span className="text-lg font-bold text-yellow-400">
              {analytics.goldSpent}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium">Actions:</span>
            <span className="text-lg font-bold text-green-400">
              {analytics.actions.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics