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
    <div className="analytics flex items-center responsive-header-gap-lg">
      <div className="flex items-center responsive-header-gap-sm">
        <BarChart3 className="responsive-header-icon-md text-green-400" />
        <span className="font-semibold responsive-header-text-lg">Analytics</span>
      </div>
      
      <div className="flex items-center responsive-header-gap-md">
        <div className="stat-item">
          <div className="flex items-center responsive-header-gap-sm">
            <Clock className="responsive-header-icon-sm text-blue-400" />
            <span className="responsive-header-text-sm font-medium">Time:</span>
            <span className="responsive-header-text-lg font-bold text-blue-400">
              {formatElapsedTime(getElapsedTime())}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="flex items-center responsive-header-gap-sm">
            <MousePointer className="responsive-header-icon-sm text-purple-400" />
            <span className="responsive-header-text-sm font-medium">Rolls/Min:</span>
            <span className="responsive-header-text-lg font-bold text-purple-400">
              {analytics.rollsPerMinute.toFixed(1)}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="flex items-center responsive-header-gap-sm">
            <DollarSign className="responsive-header-icon-sm text-yellow-400" />
            <span className="responsive-header-text-sm font-medium">Gold Spent:</span>
            <span className="responsive-header-text-lg font-bold text-yellow-400">
              {analytics.goldSpent}
            </span>
          </div>
        </div>
        
        <div className="stat-item">
          <div className="flex items-center responsive-header-gap-sm">
            <BarChart3 className="responsive-header-icon-sm text-green-400" />
            <span className="responsive-header-text-sm font-medium">Actions:</span>
            <span className="responsive-header-text-lg font-bold text-green-400">
              {analytics.actions.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics