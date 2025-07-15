import { useState, useEffect, useCallback } from 'react'
import { loadTFTImage, loadTFTImages, clearImageCache, getCacheStats } from '../utils/imageLoader'

/**
 * Hook for managing TFT image loading and caching
 */
export const useTFTImages = (tftData) => {
  const [loadedImages, setLoadedImages] = useState(new Map())
  const [loadingImages, setLoadingImages] = useState(new Set())
  const [imageErrors, setImageErrors] = useState(new Map())
  const [cacheStats, setCacheStats] = useState({ imagesLoaded: 0, spritesLoaded: 0, loadingInProgress: 0 })

  // Update cache stats periodically
  useEffect(() => {
    const updateStats = () => {
      setCacheStats(getCacheStats())
    }
    
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds
    updateStats() // Initial update
    
    return () => clearInterval(interval)
  }, [])

  /**
   * Loads a single TFT image
   */
  const loadImage = useCallback(async (championId, type = 'champion') => {
    if (!tftData || !tftData[`${type}s`]) return null
    
    const entityData = tftData[`${type}s`][championId]
    if (!entityData) return null
    
    const cacheKey = `${tftData.version}-${type}-${championId}`
    
    // Return cached image if available
    if (loadedImages.has(cacheKey)) {
      return loadedImages.get(cacheKey)
    }
    
    // Return null if already loading
    if (loadingImages.has(cacheKey)) {
      return null
    }
    
    // Return cached error if exists
    if (imageErrors.has(cacheKey)) {
      return null
    }
    
    try {
      setLoadingImages(prev => new Set(prev).add(cacheKey))
      
      // Handle different data structures
      const imageIdentifier = entityData.imageUrl || entityData.image || championId
      const image = await loadTFTImage(tftData.version, imageIdentifier, type)
      
      setLoadedImages(prev => new Map(prev).set(cacheKey, image))
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(cacheKey)
        return newSet
      })
      
      return image
    } catch (error) {
      setImageErrors(prev => new Map(prev).set(cacheKey, error))
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(cacheKey)
        return newSet
      })
      
      console.warn(`Failed to load ${type} image for ${championId}:`, error)
      return null
    }
  }, [tftData, loadedImages, loadingImages, imageErrors])

  /**
   * Loads multiple images in batch
   */
  const loadImageBatch = useCallback(async (entityIds, type = 'champion') => {
    if (!tftData || !tftData[`${type}s`]) return []
    
    const imageDataArray = entityIds
      .map(id => tftData[`${type}s`][id])
      .filter(Boolean)
      .map(entity => entity.image)
    
    try {
      const images = await loadTFTImages(tftData.version, imageDataArray, type)
      
      // Update loaded images cache
      entityIds.forEach((id, index) => {
        if (images[index]) {
          const cacheKey = `${tftData.version}-${type}-${id}`
          setLoadedImages(prev => new Map(prev).set(cacheKey, images[index]))
        }
      })
      
      return images
    } catch (error) {
      console.warn(`Failed to load ${type} images in batch:`, error)
      return []
    }
  }, [tftData])

  /**
   * Gets a loaded image from cache
   */
  const getImage = useCallback((championId, type = 'champion') => {
    const cacheKey = `${tftData?.version}-${type}-${championId}`
    return loadedImages.get(cacheKey) || null
  }, [tftData, loadedImages])

  /**
   * Checks if an image is currently loading
   */
  const isImageLoading = useCallback((championId, type = 'champion') => {
    const cacheKey = `${tftData?.version}-${type}-${championId}`
    return loadingImages.has(cacheKey)
  }, [tftData, loadingImages])

  /**
   * Checks if an image failed to load
   */
  const hasImageError = useCallback((championId, type = 'champion') => {
    const cacheKey = `${tftData?.version}-${type}-${championId}`
    return imageErrors.has(cacheKey)
  }, [tftData, imageErrors])

  /**
   * Preloads all champion images for current set
   */
  const preloadAllChampions = useCallback(async () => {
    if (!tftData?.champions) return
    
    const championIds = Object.keys(tftData.champions)
    return loadImageBatch(championIds, 'champion')
  }, [tftData, loadImageBatch])

  /**
   * Preloads all trait images for current set
   */
  const preloadAllTraits = useCallback(async () => {
    if (!tftData?.traits) return
    
    const traitIds = Object.keys(tftData.traits)
    return loadImageBatch(traitIds, 'trait')
  }, [tftData, loadImageBatch])

  /**
   * Clears all image caches
   */
  const clearAllCaches = useCallback(() => {
    clearImageCache()
    setLoadedImages(new Map())
    setLoadingImages(new Set())
    setImageErrors(new Map())
  }, [])

  /**
   * Clears images for a specific version (useful when switching sets)
   */
  const clearVersionImages = useCallback((version) => {
    setLoadedImages(prev => {
      const newMap = new Map()
      for (const [key, value] of prev) {
        if (!key.startsWith(`${version}-`)) {
          newMap.set(key, value)
        }
      }
      return newMap
    })
    
    setLoadingImages(prev => {
      const newSet = new Set()
      for (const key of prev) {
        if (!key.startsWith(`${version}-`)) {
          newSet.add(key)
        }
      }
      return newSet
    })
    
    setImageErrors(prev => {
      const newMap = new Map()
      for (const [key, value] of prev) {
        if (!key.startsWith(`${version}-`)) {
          newMap.set(key, value)
        }
      }
      return newMap
    })
  }, [])

  // Clear version-specific images when TFT data changes
  useEffect(() => {
    if (tftData?.version) {
      // Clear images from previous versions, keep current version
      const currentVersion = tftData.version
      setLoadedImages(prev => {
        const newMap = new Map()
        for (const [key, value] of prev) {
          if (key.startsWith(`${currentVersion}-`)) {
            newMap.set(key, value)
          }
        }
        return newMap
      })
    }
  }, [tftData?.version])

  return {
    loadImage,
    loadImageBatch,
    getImage,
    isImageLoading,
    hasImageError,
    preloadAllChampions,
    preloadAllTraits,
    clearAllCaches,
    clearVersionImages,
    cacheStats,
    loadedImagesCount: loadedImages.size,
    loadingImagesCount: loadingImages.size,
    errorImagesCount: imageErrors.size
  }
}