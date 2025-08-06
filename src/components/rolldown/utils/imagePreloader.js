// TFT Image Preloading System
// Handles phased loading: critical images first, then background preloading

import { loadTFTImage, getCacheStats } from './imageLoader'

/**
 * Preloading phases
 */
export const PRELOAD_PHASES = {
  CRITICAL: 'critical',    // Shop + bench images (immediate)
  BACKGROUND: 'background', // All remaining set images
  COMPLETE: 'complete'     // All images loaded
}

/**
 * Image preloader class with progress tracking
 */
class ImagePreloader {
  constructor() {
    this.phase = null
    this.progress = {
      critical: { loaded: 0, total: 0, complete: false },
      background: { loaded: 0, total: 0, complete: false },
      overall: { loaded: 0, total: 0, percentage: 0 }
    }
    this.callbacks = {
      onProgress: null,
      onPhaseComplete: null,
      onComplete: null
    }
    this.isPreloading = false
    this.abortController = null
  }

  /**
   * Set progress callbacks
   */
  setCallbacks({ onProgress, onPhaseComplete, onComplete }) {
    this.callbacks.onProgress = onProgress
    this.callbacks.onPhaseComplete = onPhaseComplete
    this.callbacks.onComplete = onComplete
  }

  /**
   * Update progress and trigger callbacks
   */
  updateProgress(phase, loaded, total) {
    this.progress[phase].loaded = loaded
    this.progress[phase].total = total
    
    // Update overall progress
    this.progress.overall.loaded = this.progress.critical.loaded + this.progress.background.loaded
    this.progress.overall.total = this.progress.critical.total + this.progress.background.total
    this.progress.overall.percentage = this.progress.overall.total > 0 
      ? Math.round((this.progress.overall.loaded / this.progress.overall.total) * 100)
      : 0

    // Trigger progress callback
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(this.progress)
    }

    // Check if phase is complete
    if (loaded >= total && !this.progress[phase].complete) {
      this.progress[phase].complete = true
      
      if (this.callbacks.onPhaseComplete) {
        this.callbacks.onPhaseComplete(phase, this.progress)
      }

      // Check if all loading is complete
      if (this.progress.critical.complete && this.progress.background.complete) {
        this.phase = PRELOAD_PHASES.COMPLETE
        this.isPreloading = false
        
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(this.progress)
        }
      }
    }
  }

  /**
   * Load critical images (shop units, etc.)
   */
  async loadCriticalImages(championIds, version = '15.13.1') {
    if (!championIds || championIds.length === 0) {
      this.updateProgress('critical', 0, 0)
      return []
    }

    this.phase = PRELOAD_PHASES.CRITICAL
    this.updateProgress('critical', 0, championIds.length)

    console.log(`Loading ${championIds.length} critical champion images...`)

    const results = []
    let loaded = 0

    for (const championId of championIds) {
      if (this.abortController?.signal.aborted) break

      try {
        const image = await loadTFTImage(version, championId, 'champion')
        results.push({ championId, image, success: true })
      } catch (error) {
        console.warn(`Failed to load critical image for ${championId}:`, error)
        results.push({ championId, error, success: false })
      }

      loaded++
      this.updateProgress('critical', loaded, championIds.length)
    }

    console.log(`Critical images loaded: ${results.filter(r => r.success).length}/${championIds.length}`)
    return results
  }

  /**
   * Load all set images in background
   */
  async preloadSetImages(tftData, version = '15.13.1') {
    if (!tftData?.champions || !tftData?.traits) {
      this.updateProgress('background', 0, 0)
      return { champions: [], traits: [] }
    }

    // Get all champions and traits for the current set
    const setNumber = tftData.setId ? tftData.setId.replace('set', '') : '14'
    const setPrefix = `TFT${setNumber}_`
    
    console.log(`Preloading images for ${tftData.setName || `Set ${setNumber}`} with prefix: ${setPrefix}`)
    
    const championIds = Object.keys(tftData.champions).filter(id => id.startsWith(setPrefix))
    const traitIds = Object.keys(tftData.traits).filter(id => id.startsWith(setPrefix))
    
    const totalImages = championIds.length + traitIds.length
    this.updateProgress('background', 0, totalImages)

    console.log(`Preloading ${championIds.length} champions + ${traitIds.length} traits = ${totalImages} total images...`)

    const results = { champions: [], traits: [] }
    let loaded = 0

    // Load champion images
    for (const championId of championIds) {
      if (this.abortController?.signal.aborted) break

      try {
        const image = await loadTFTImage(version, championId, 'champion')
        results.champions.push({ championId, image, success: true })
      } catch (error) {
        console.warn(`Failed to preload champion image for ${championId}:`, error)
        results.champions.push({ championId, error, success: false })
      }

      loaded++
      this.updateProgress('background', loaded, totalImages)
    }

    // Load trait images  
    for (const traitId of traitIds) {
      if (this.abortController?.signal.aborted) break

      try {
        const image = await loadTFTImage(version, traitId, 'trait')
        results.traits.push({ traitId, image, success: true })
      } catch (error) {
        console.warn(`Failed to preload trait image for ${traitId}:`, error)
        results.traits.push({ traitId, error, success: false })
      }

      loaded++
      this.updateProgress('background', loaded, totalImages)
    }

    const successfulChampions = results.champions.filter(r => r.success).length
    const successfulTraits = results.traits.filter(r => r.success).length
    console.log(`Background preloading complete: ${successfulChampions}/${championIds.length} champions, ${successfulTraits}/${traitIds.length} traits`)

    return results
  }

  /**
   * Start full preloading process
   */
  async startPreloading(tftData, criticalChampionIds = [], version = '15.13.1') {
    if (this.isPreloading) {
      console.warn('Preloading already in progress')
      return
    }

    this.isPreloading = true
    this.abortController = new AbortController()
    
    console.log('Starting TFT image preloading...')

    try {
      // Phase 1: Load critical images first
      const criticalResults = await this.loadCriticalImages(criticalChampionIds, version)

      // Phase 2: Background preload all set images
      this.phase = PRELOAD_PHASES.BACKGROUND
      const backgroundResults = await this.preloadSetImages(tftData, version)

      console.log('Preloading completed successfully')
      return {
        critical: criticalResults,
        background: backgroundResults,
        cacheStats: getCacheStats()
      }
    } catch (error) {
      console.error('Preloading failed:', error)
      this.isPreloading = false
      throw error
    }
  }

  /**
   * Stop preloading
   */
  stopPreloading() {
    if (this.abortController) {
      this.abortController.abort()
    }
    this.isPreloading = false
    console.log('Preloading stopped')
  }

  /**
   * Get current progress
   */
  getProgress() {
    return { ...this.progress }
  }

  /**
   * Check if preloading is in progress
   */
  isActive() {
    return this.isPreloading
  }
}

// Export singleton instance
export const imagePreloader = new ImagePreloader()

// Convenience functions
export const startImagePreloading = (tftData, criticalChampionIds, version) => {
  return imagePreloader.startPreloading(tftData, criticalChampionIds, version)
}

export const setPreloadCallbacks = (callbacks) => {
  imagePreloader.setCallbacks(callbacks)
}

export const getPreloadProgress = () => {
  return imagePreloader.getProgress()
}

export const stopImagePreloading = () => {
  imagePreloader.stopPreloading()
}