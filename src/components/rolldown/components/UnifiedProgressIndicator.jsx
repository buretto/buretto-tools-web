import React from 'react'

/**
 * Unified progress indicator that handles both data loading and image preloading
 */
const UnifiedProgressIndicator = ({ 
  progress, 
  className = "",
  showInHeader = true 
}) => {
  if (!progress || !progress.isActive) {
    return null
  }

  const getProgressColor = (stage) => {
    switch (stage) {
      case 'downloading':
      case 'fetching_version':
      case 'detecting_set':
        return 'bg-yellow-500'
      case 'parsing':
      case 'processing':
        return 'bg-orange-500'
      case 'caching':
        return 'bg-blue-500'
      case 'loading_images':
      case 'downloading_images':
        return 'bg-green-500'
      case 'complete':
      case 'complete_images':
        return 'bg-green-600'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getProgressText = (progress) => {
    const { stage, current, total, setNumber } = progress
    
    switch (stage) {
      case 'fetching_version':
        return 'Fetching patch info...'
      case 'detecting_set':
        return 'Detecting TFT set...'
      case 'downloading':
        return `Downloading Set ${setNumber} data...`
      case 'parsing':
        return `Parsing Set ${setNumber} data...`
      case 'processing':
        return `Processing Set ${setNumber} data...`
      case 'caching':
        return 'Caching data...'
      case 'loading_images':
        return 'Loading shop images...'
      case 'downloading_images':
        if (current && total) {
          return `Loading images... ${current}/${total}`
        }
        return 'Loading images...'
      case 'complete':
        return 'Data loaded successfully!'
      case 'complete_images':
        return 'Images loaded successfully!'
      case 'error':
        return progress.error || 'Loading failed'
      default:
        return 'Loading...'
    }
  }

  const progressText = getProgressText(progress)
  const progressColor = getProgressColor(progress.stage)
  const percentage = progress.progress || 0

  if (showInHeader) {
    // Header style - compact inline display
    return (
      <div className={`flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-lg ${className}`}>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-300">
            {progressText}
          </span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-1 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 min-w-[2rem]">
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    )
  } else {
    // Full screen style - for major loading operations
    return (
      <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
        <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-white mb-4">
              {progressText}
            </div>
            
            <div className="w-full bg-gray-600 rounded-full h-3 mb-4">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            
            <div className="text-sm text-gray-400">
              {percentage}% complete
            </div>
            
            {progress.stage === 'downloading_images' && progress.current && progress.total && (
              <div className="text-xs text-gray-500 mt-2">
                {progress.current} / {progress.total} images
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }
}

export default UnifiedProgressIndicator