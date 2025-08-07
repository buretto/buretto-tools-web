import { useState, useEffect } from 'react'
import { getFailedImageStats, subscribeToFailedImagesChanges } from '../utils/imageLoader'

/**
 * Hook that provides reactive failed images statistics
 * Updates in real-time as images fail during loading
 */
export const useFailedImages = (version = null) => {
  const [failedStats, setFailedStats] = useState({ count: 0, failed: [], totalFailed: 0 })

  useEffect(() => {
    // Initial load
    const updateStats = () => {
      const stats = getFailedImageStats(version)
      setFailedStats(stats)
    }
    
    updateStats()

    // Subscribe to real-time changes
    const unsubscribe = subscribeToFailedImagesChanges(updateStats)

    return unsubscribe
  }, [version])

  return failedStats
}