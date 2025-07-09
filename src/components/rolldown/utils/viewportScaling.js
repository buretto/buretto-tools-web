// Viewport Scaling System for TFT Rolldown Tool

const GAME_CONTENT = { width: 1280, height: 950 }  // Actual game content dimensions

const SCALE_CONSTRAINTS = {
  MIN_SCALE: 0.53,          // Based on 500px min height (500/950)
  MIN_HEIGHT: 500,          // Minimum playable height
  MIN_WIDTH: 675,           // Minimum playable width (500 * 1.35 aspect)
  
  ASPECT_LIMITS: {
    MIN_RATIO: 1.0,         // Below this = too narrow
    MAX_RATIO: 2.8          // Above this = too wide (allow wider layouts)
  }
}

export function calculateScaling(viewport) {
  const potentialScaleX = viewport.width / GAME_CONTENT.width
  const potentialScaleY = viewport.height / GAME_CONTENT.height
  
  // Apply minimum scale constraints
  const scaleX = Math.max(potentialScaleX, SCALE_CONSTRAINTS.MIN_SCALE)
  const scaleY = Math.max(potentialScaleY, SCALE_CONSTRAINTS.MIN_SCALE)
  
  const ratio = viewport.width / viewport.height
  
  // Determine behavior based on constraints
  if (scaleX === SCALE_CONSTRAINTS.MIN_SCALE && scaleY === SCALE_CONSTRAINTS.MIN_SCALE) {
    return {
      mode: 'DUAL_CUTOFF',
      scale: SCALE_CONSTRAINTS.MIN_SCALE,
      cutoffX: true,
      cutoffY: true
    }
  }
  
  if (ratio < SCALE_CONSTRAINTS.ASPECT_LIMITS.MIN_RATIO) {
    // Too narrow - scale by height, cut off sides
    return {
      mode: 'HORIZONTAL_CUTOFF', 
      scale: scaleY,
      cutoffX: true,
      cutoffY: false
    }
  }
  
  if (ratio > SCALE_CONSTRAINTS.ASPECT_LIMITS.MAX_RATIO) {
    // Too wide - scale by height, letterbox sides, maybe cut top/bottom
    return {
      mode: 'MIXED_LETTERBOX_CUTOFF',
      scale: scaleY, 
      cutoffX: false,
      cutoffY: scaleY === SCALE_CONSTRAINTS.MIN_SCALE
    }
  }
  
  // Prefer horizontal growth when possible for better space utilization
  const gameAspectRatio = GAME_CONTENT.width / GAME_CONTENT.height  // 1.28
  if (ratio > gameAspectRatio * 1.1) {
    // Viewport is significantly wider than game content - use height-based scaling
    return {
      mode: 'HORIZONTAL_LETTERBOX',
      scale: scaleY,
      cutoffX: false,
      cutoffY: false
    }
  }
  
  // Normal proportional scaling
  return {
    mode: 'PROPORTIONAL',
    scale: Math.min(scaleX, scaleY),
    cutoffX: false,
    cutoffY: false
  }
}

export function applyViewportScaling() {
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: window.innerWidth / window.innerHeight
  }
  
  const scalingResult = calculateScaling(viewport)
  const { mode, scale, cutoffX, cutoffY } = scalingResult
  
  // Calculate actual rendered dimensions after transform
  const renderedWidth = GAME_CONTENT.width * scale
  const renderedHeight = GAME_CONTENT.height * scale
  
  // Ensure scaled content fits within viewport with margin
  const maxScale = Math.min(
    (viewport.width - 40) / GAME_CONTENT.width,
    (viewport.height - 40) / GAME_CONTENT.height
  )
  
  const finalScale = Math.min(scale, maxScale)
  
  // Apply CSS custom properties
  document.documentElement.style.setProperty('--game-scale', finalScale)
  document.documentElement.style.setProperty('--viewport-width', `${viewport.width}px`)
  document.documentElement.style.setProperty('--viewport-height', `${viewport.height}px`)
  
  // Calculate base unit (1280px / 12 = ~107px)
  const baseUnit = (GAME_CONTENT.width / 12) * finalScale
  document.documentElement.style.setProperty('--base-unit', `${baseUnit}px`)
  
  // Apply layout mode with corrected scaling
  applyLayoutMode({...scalingResult, scale: finalScale}, viewport)
  
  return {...scalingResult, scale: finalScale}
}

function applyLayoutMode(scalingResult, viewport) {
  const { mode, scale, cutoffX, cutoffY } = scalingResult
  const gameRoot = document.querySelector('.game-root')
  
  if (!gameRoot) return
  
  // Reset classes
  gameRoot.className = 'game-root'
  
  // Calculate scaled content dimensions
  const scaledWidth = GAME_CONTENT.width * scale
  const scaledHeight = GAME_CONTENT.height * scale
  
  switch(mode) {
    case 'PROPORTIONAL':
      gameRoot.classList.add('proportional-mode')
      gameRoot.style.overflow = 'hidden'
      gameRoot.style.justifyContent = 'center'
      gameRoot.style.alignItems = 'center'
      gameRoot.style.background = '#1a1a1a'
      break
      
    case 'HORIZONTAL_CUTOFF':
      gameRoot.classList.add('horizontal-cutoff-mode')
      gameRoot.style.overflowX = 'hidden'
      gameRoot.style.overflowY = 'visible'
      gameRoot.style.justifyContent = 'center'
      gameRoot.style.alignItems = 'center'
      gameRoot.style.background = '#1a1a1a'
      break
      
    case 'HORIZONTAL_LETTERBOX':
      gameRoot.classList.add('horizontal-letterbox-mode')
      gameRoot.style.overflow = 'hidden'
      gameRoot.style.justifyContent = 'center'
      gameRoot.style.alignItems = 'center'
      gameRoot.style.background = '#1a1a1a'
      break
      
    case 'DUAL_CUTOFF':
      gameRoot.classList.add('dual-cutoff-mode')
      gameRoot.style.overflow = 'hidden'
      gameRoot.style.justifyContent = 'center'
      gameRoot.style.alignItems = 'center'
      gameRoot.style.background = '#1a1a1a'
      break
      
    case 'MIXED_LETTERBOX_CUTOFF':
      gameRoot.classList.add('letterbox-cutoff-mode')
      gameRoot.style.overflowY = 'hidden'
      gameRoot.style.overflowX = 'visible'
      gameRoot.style.justifyContent = 'center'
      gameRoot.style.alignItems = 'center'
      gameRoot.style.background = 'black'
      break
  }
}

// Debounce function for resize events
function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Initialize viewport scaling
export function initializeViewportScaling() {
  // Apply initial scaling
  applyViewportScaling()
  
  // Listen for resize events
  window.addEventListener('resize', debounce(applyViewportScaling, 100))
  
  // Handle orientation change on mobile
  window.addEventListener('orientationchange', () => {
    setTimeout(applyViewportScaling, 100)
  })
}

// Calculate base unit size for proportional elements
export function getBaseUnit(scale = 1) {
  return (GAME_CONTENT.width / 12) * scale  // ~107px at full scale
}