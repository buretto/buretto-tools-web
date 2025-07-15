// TFT Image Loading Utility with Sprite Sheet Support

const IMAGE_CACHE = new Map()
const SPRITE_CACHE = new Map()
const LOADING_PROMISES = new Map()

/**
 * Generates image URLs for TFT Data Dragon assets
 * Now uses direct image URLs since we know the pattern
 */
export const generateImageUrls = (version, championId, type = 'champion') => {
  const baseUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-${type}`
  
  // Generate expected filename based on ID and type
  let filename
  if (type === 'champion') {
    filename = `${championId}.TFT_Set14.png`
  } else if (type === 'trait') {
    // Trait naming pattern: Trait_Icon_14_TraitName.TFT_Set14.png
    const traitName = championId.replace('TFT14_', '').replace('TFT_', '')
    filename = `Trait_Icon_14_${traitName}.TFT_Set14.png`
  }
  
  return {
    individual: `${baseUrl}/${filename}`,
    fallback: null // No sprite fallback since we're using direct URLs
  }
}

/**
 * Generates image URL for a specific champion/trait
 */
export const generateDirectImageUrl = (version, entityId, type = 'champion') => {
  const baseUrl = `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-${type}`
  
  if (type === 'champion') {
    return `${baseUrl}/${entityId}.TFT_Set14.png`
  } else if (type === 'trait') {
    const traitName = entityId.replace('TFT14_', '').replace('TFT_', '')
    return `${baseUrl}/Trait_Icon_14_${traitName}.TFT_Set14.png`
  }
  
  return null
}

/**
 * Loads and caches an image
 */
const loadImage = (url) => {
  if (IMAGE_CACHE.has(url)) {
    return Promise.resolve(IMAGE_CACHE.get(url))
  }
  
  if (LOADING_PROMISES.has(url)) {
    return LOADING_PROMISES.get(url)
  }
  
  const promise = new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      IMAGE_CACHE.set(url, img)
      LOADING_PROMISES.delete(url)
      resolve(img)
    }
    
    img.onerror = () => {
      LOADING_PROMISES.delete(url)
      reject(new Error(`Failed to load image: ${url}`))
    }
    
    img.src = url
  })
  
  LOADING_PROMISES.set(url, promise)
  return promise
}

/**
 * Creates a canvas element with sprite extraction
 */
const createSpriteCanvas = (spriteImage, coordinates) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = coordinates.width
  canvas.height = coordinates.height
  
  ctx.drawImage(
    spriteImage,
    coordinates.x, coordinates.y, coordinates.width, coordinates.height,
    0, 0, coordinates.width, coordinates.height
  )
  
  return canvas
}

/**
 * Loads TFT champion or trait image with fallback strategy
 * Priority: Direct Data Dragon URL → Placeholder
 */
export const loadTFTImage = async (version, entityId, type = 'champion') => {
  const cacheKey = `${version}-${type}-${entityId}`
  
  // Check cache first
  if (IMAGE_CACHE.has(cacheKey)) {
    return IMAGE_CACHE.get(cacheKey)
  }
  
  try {
    let imageUrl
    
    // If entityId is already a full URL, use it directly
    if (typeof entityId === 'string' && entityId.startsWith('http')) {
      imageUrl = entityId
    } else {
      // Generate URL from entityId
      imageUrl = generateDirectImageUrl(version, entityId, type)
    }
    
    if (!imageUrl) {
      throw new Error('Could not generate image URL')
    }
    
    const image = await loadImage(imageUrl)
    IMAGE_CACHE.set(cacheKey, image)
    return image
  } catch (error) {
    // Fallback to placeholder
    const placeholder = await createPlaceholderImage(entityId, type)
    IMAGE_CACHE.set(cacheKey, placeholder)
    return placeholder
  }
}

/**
 * Creates a placeholder image with text
 */
const createPlaceholderImage = async (filename, type) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  canvas.width = 48
  canvas.height = 48
  
  // Background
  ctx.fillStyle = type === 'champion' ? '#4f46e5' : '#059669'
  ctx.fillRect(0, 0, 48, 48)
  
  // Border
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, 46, 46)
  
  // Text
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 12px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // Handle different filename formats safely
  let text = '?'
  if (typeof filename === 'string') {
    text = filename.split('_').pop()?.split('.')[0]?.slice(0, 3) || '?'
  } else if (filename && typeof filename === 'object') {
    // If filename is an object, try to extract a meaningful identifier
    text = filename.id?.split('_').pop()?.slice(0, 3) || filename.name?.slice(0, 3) || '?'
  }
  
  ctx.fillText(text.toUpperCase(), 24, 24)
  
  // Convert to image
  const image = new Image()
  image.src = canvas.toDataURL()
  
  return new Promise((resolve) => {
    image.onload = () => resolve(image)
  })
}

/**
 * Preloads sprite sheets for a given version and type
 */
export const preloadSprites = async (version, spriteNames, type = 'champion') => {
  const promises = spriteNames.map(spriteName => {
    const url = `https://ddragon.leagueoflegends.com/cdn/${version}/img/tft-${type}/${spriteName}`
    return loadImage(url).catch(error => {
      console.warn(`Failed to preload sprite ${spriteName}:`, error)
      return null
    })
  })
  
  const results = await Promise.all(promises)
  return results.filter(Boolean)
}

/**
 * Batch loads multiple TFT images
 */
export const loadTFTImages = async (version, entityIds, type = 'champion') => {
  const promises = entityIds.map(entityId => 
    loadTFTImage(version, entityId, type).catch(error => {
      console.warn(`Failed to load image ${entityId}:`, error)
      return null
    })
  )
  
  return Promise.all(promises)
}

/**
 * Clears image cache (useful for memory management)
 */
export const clearImageCache = () => {
  IMAGE_CACHE.clear()
  SPRITE_CACHE.clear()
  LOADING_PROMISES.clear()
}

/**
 * Gets cache statistics
 */
export const getCacheStats = () => {
  return {
    imagesLoaded: IMAGE_CACHE.size,
    spritesLoaded: SPRITE_CACHE.size,
    loadingInProgress: LOADING_PROMISES.size
  }
}

/**
 * Extracts all unique sprite names from champion/trait data
 */
export const extractSpriteNames = (data) => {
  const sprites = new Set()
  
  Object.values(data).forEach(item => {
    if (item.image && item.image.sprite) {
      sprites.add(item.image.sprite)
    }
  })
  
  return Array.from(sprites)
}