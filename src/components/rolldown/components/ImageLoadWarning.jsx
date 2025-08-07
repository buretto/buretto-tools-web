import React, { useState, useEffect } from 'react'
import { AlertTriangle, Settings } from 'lucide-react'
import { useFailedImages } from '../hooks/useFailedImages.js'

const ImageLoadWarning = ({ onOpenMappings, version, totalImages = 0 }) => {
  const [showTooltip, setShowTooltip] = useState(false)
  const [delayCompleted, setDelayCompleted] = useState(false)
  
  // Use reactive hook for real-time failed images updates
  const failedStats = useFailedImages(version)

  useEffect(() => {
    // Don't show warnings immediately - give images time to load/retry
    const initialDelay = setTimeout(() => {
      setDelayCompleted(true)
    }, 5000) // 5 second delay before checking for failures

    return () => clearTimeout(initialDelay)
  }, [])

  if (!delayCompleted || failedStats.count === 0) return null

  const failedCount = failedStats.count
  const isPlural = failedCount !== 1

  return (
    <div className="relative inline-block">
      <div
        className="flex items-center px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => onOpenMappings()}
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 mr-2" />
        <span className="text-sm text-amber-800 font-medium">
          {failedCount} image{isPlural ? 's' : ''} failed to load
        </span>
        <Settings className="w-4 h-4 text-amber-600 ml-2" />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
          <div className="bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg">
            <div className="mb-2">
              <strong>{failedCount} image{isPlural ? 's' : ''} failed to load</strong>
            </div>
            <p className="text-gray-300 mb-2">
              Often due to mismatch between Riot internal names and Data Dragon API. 
              This can be fixed by adding name mappings.
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onOpenMappings()
                setShowTooltip(false)
              }}
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Click here to manage mappings
            </button>
            
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageLoadWarning