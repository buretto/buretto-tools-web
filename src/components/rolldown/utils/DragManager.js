/**
 * Unified Drag Manager using Mouse Events + CSS Transforms
 * Replaces HTML5 Drag & Drop API to eliminate delays and enable smooth interpolation
 */

class DragManager {
  constructor() {
    this.isDragging = false
    this.dragElement = null
    this.dragOriginElement = null // Track which element started the drag
    this.originalTransform = ''
    this.originalZIndex = ''
    this.originalPosition = ''
    this.originalScrollTop = 0
    this.originalScrollLeft = 0
    this.startPos = { x: 0, y: 0 }
    this.currentPos = { x: 0, y: 0 }
    this.targetPos = { x: 0, y: 0 }
    this.lastMousePos = { x: 0, y: 0 }
    this.grabOffset = { x: 0, y: 0 }
    this.animationId = null
    this.interpolationFactor = 0.4 
    this.onDragEnd = null
    this.dragData = null
    this.stateChangeListeners = []
    this.dropZones = [] // Registered drop zones
    this.dragThreshold = 2 // Minimum pixels to move before visual drag starts
    this.hasMetThreshold = false // Track if threshold has been met
    this.currentHoveredElement = null // Track currently hovered drop zone

    // Bind methods to preserve context
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.preventScroll = this.preventScroll.bind(this)
  }

  /**
   * Start dragging an element
   * @param {HTMLElement} element - Element to drag
   * @param {Object} options - Drag options
   * @param {Object} options.dragData - Data to associate with this drag
   * @param {Function} options.onDragEnd - Callback when drag ends
   * @param {HTMLElement} options.customDragImage - Custom drag image element
   */
  startDrag(element, options = {}) {
    if (this.isDragging) return
    this.isDragging = true
    this.dragElement = element
    this.dragOriginElement = element // Store which element started this drag
    this.dragData = options.dragData || null
    this.onDragEnd = options.onDragEnd || null

    // Get starting position
    const rect = element.getBoundingClientRect()
    
    // Store original styles for restoration
    this.originalTransform = element.style.transform || ''
    this.originalZIndex = element.style.zIndex || ''
    this.originalPosition = element.style.position || ''

    // Don't modify overflow styles - use alternative positioning approach instead

    // Use transform-based approach (more stable than fixed positioning)
    element.style.zIndex = '999999'
    element.style.position = 'relative' // Break out of parent stacking context
    element.style.transition = 'none'
    element.style.pointerEvents = 'none' // This prevents interference
    
    this.startPos = { x: rect.left, y: rect.top }
    this.currentPos = { x: 0, y: 0 } // Transform offset from original position
    this.targetPos = { x: 0, y: 0 } // Target offset from original position

    // Add global event listeners - use capture phase to ensure we get all events
    document.addEventListener('mousemove', this.handleMouseMove, { passive: false, capture: true })
    document.addEventListener('mouseup', this.handleMouseUp, { capture: true })
    document.addEventListener('contextmenu', this.handleMouseUp, { capture: true }) // Handle right-click cancel
    
    // Prevent scroll behavior during drag
    document.addEventListener('scroll', this.preventScroll, { passive: false, capture: true })
    document.addEventListener('wheel', this.preventScroll, { passive: false, capture: true })
    document.addEventListener('touchmove', this.preventScroll, { passive: false, capture: true })

    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    
    // Store current scroll position to restore if needed
    this.originalScrollTop = document.documentElement.scrollTop || document.body.scrollTop
    this.originalScrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft

    // Start animation loop
    this.startAnimation()
    
    // Update drop zone highlighting immediately (direct DOM, no React re-renders)
    this.updateDropZoneHighlighting()
    
    // Notify state change after drag setup is complete
    // Use setTimeout to avoid React re-renders during the same event cycle
    setTimeout(() => {
      this.notifyStateChange()
    }, 0)
  }

  /**
   * Prevent scroll events during drag
   */
  preventScroll(e) {
    if (this.isDragging) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }


  /**
   * Handle mouse move events
   */
  handleMouseMove(e) {
    if (!this.isDragging) return

    e.preventDefault()
    e.stopPropagation()
    
    // Track mouse position
    this.lastMousePos = { x: e.clientX, y: e.clientY }
    
    // Calculate distance from start position
    const distanceFromStart = Math.sqrt(
      Math.pow(e.clientX - (this.startPos.x + this.grabOffset.x), 2) + 
      Math.pow(e.clientY - (this.startPos.y + this.grabOffset.y), 2)
    )
    
    // Only start visual drag effects after threshold is met
    if (!this.hasMetThreshold && distanceFromStart >= this.dragThreshold) {
      this.hasMetThreshold = true
      // Change cursor to indicate dragging has started
      if (this.dragElement) {
        this.dragElement.style.cursor = 'grabbing'
      }
      document.body.style.cursor = 'grabbing'
      document.body.classList.add('dragging-active')
    }
    
    // Calculate transform offset from original position
    const newX = e.clientX - this.startPos.x - this.grabOffset.x
    const newY = e.clientY - this.startPos.y - this.grabOffset.y
    
    // Only apply visual effects after threshold is met
    if (this.hasMetThreshold && !isNaN(newX) && !isNaN(newY) && isFinite(newX) && isFinite(newY)) {
      this.targetPos = { x: newX, y: newY }
    }
    
    // Update hover highlighting if drag is active
    if (this.hasMetThreshold) {
      this.updateHoverHighlighting(e)
    }
  }

  /**
   * Handle mouse up events (end drag)
   */
  handleMouseUp(e) {
    if (!this.isDragging) return

    this.endDrag(e)
  }

  /**
   * End the drag operation
   */
  endDrag(e = null) {
    if (!this.isDragging) return
    this.isDragging = false

    // Restore original element styles
    if (this.dragElement) {
      this.dragElement.style.transform = this.originalTransform
      this.dragElement.style.zIndex = this.originalZIndex
      this.dragElement.style.position = this.originalPosition
      this.dragElement.style.pointerEvents = ''
      this.dragElement.style.transition = ''
      this.dragElement.style.opacity = ''
      this.dragElement.style.filter = ''
      this.dragElement.style.boxShadow = ''
      this.dragElement.style.visibility = ''
      this.dragElement.style.display = ''
      this.dragElement.style.cursor = ''
    }
    
    // No overflow styles to restore since we don't modify them

    // Stop animation
    this.stopAnimation()

    // Remove event listeners with same options as when added
    document.removeEventListener('mousemove', this.handleMouseMove, { passive: false, capture: true })
    document.removeEventListener('mouseup', this.handleMouseUp, { capture: true })
    document.removeEventListener('contextmenu', this.handleMouseUp, { capture: true })
    
    // Remove scroll prevention listeners
    document.removeEventListener('scroll', this.preventScroll, { passive: false, capture: true })
    document.removeEventListener('wheel', this.preventScroll, { passive: false, capture: true })
    document.removeEventListener('touchmove', this.preventScroll, { passive: false, capture: true })

    // Restore text selection and cursor
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
    document.body.style.cursor = ''
    document.body.classList.remove('dragging-active')

    // Check all registered drop zones first
    const enhancedEvent = {
      ...e,
      clientX: this.lastMousePos.x,
      clientY: this.lastMousePos.y,
      originalEvent: e
    }
    
    let dropHandled = false
    for (const dropZone of this.dropZones) {
      if (dropZone.checkDrop && dropZone.checkDrop(enhancedEvent)) {
        dropHandled = true
        break
      }
    }
    
    // Call end callback with accurate mouse position if no drop zone handled it
    if (!dropHandled && this.onDragEnd) {
      this.onDragEnd(enhancedEvent, this.dragData)
    }

    // Clear drop zone highlighting immediately (direct DOM, no React re-renders)
    this.updateDropZoneHighlighting()
    
    // Notify listeners that drag has ended
    this.notifyStateChange()
    
    // Reset state
    this.cleanup()
  }

  /**
   * Set grab offset (where the mouse grabbed the element)
   */
  setGrabOffset(x, y) {
    this.grabOffset = { x, y }
  }

  /**
   * Start smooth animation loop
   */
  startAnimation() {
    if (this.animationId) return

    console.log('🟢 Animation loop started')

    const animate = () => {
      if (!this.isDragging) {
        console.log('🔍 Animation stopped - isDragging false')
        return
      }

      // Smooth interpolation towards target
      this.currentPos.x += (this.targetPos.x - this.currentPos.x) * this.interpolationFactor
      this.currentPos.y += (this.targetPos.y - this.currentPos.y) * this.interpolationFactor

      this.updateDragElementTransform()

      this.animationId = requestAnimationFrame(animate)
    }

    this.animationId = requestAnimationFrame(animate)
  }

  /**
   * Stop animation loop
   */
  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  /**
   * Update drag element position and transform
   */
  updateDragElementTransform() {
    if (!this.dragElement || !this.hasMetThreshold) return

    // Check if element is still connected to DOM
    const isConnected = this.dragElement.isConnected
    const isInDocument = document.contains(this.dragElement)
    
    // If element is no longer connected to DOM, try to find the replacement
    if (!isConnected || !isInDocument) {
      console.log('🔍 Element disconnected, attempting recovery...')
      
      // Try to find a replacement element with the same className
      const replacementElement = document.querySelector(`.${this.dragElement.className.split(' ').join('.')}`)
      
      if (replacementElement && replacementElement.isConnected) {
        console.log('✅ Found replacement element, updating reference')
        this.dragElement = replacementElement
        
        // Restore original styles on new element
        this.originalTransform = replacementElement.style.transform || ''
        this.originalZIndex = replacementElement.style.zIndex || ''
        this.originalPosition = replacementElement.style.position || ''
        
        // Refresh highlighting after element recovery
        this.updateDropZoneHighlighting()
        
        // Continue with transform
      } else {
        console.warn('❌ No replacement element found, terminating visual drag')
        return
      }
    }

    // Use CSS transform for positioning (works with overflow: visible)
    const transform = `${this.originalTransform} translate(${Math.round(this.currentPos.x)}px, ${Math.round(this.currentPos.y)}px) scale(0.95)`
    this.dragElement.style.transform = transform
    this.dragElement.style.opacity = '0.9'
    this.dragElement.style.filter = 'brightness(1.1)'
    this.dragElement.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)'
    
    // Ensure element stays visible and on top
    this.dragElement.style.visibility = 'visible'
    this.dragElement.style.display = 'block'
    this.dragElement.style.zIndex = '999999'
    this.dragElement.style.transition = 'none'
    this.dragElement.style.pointerEvents = 'none'
  }

  /**
   * Check if currently dragging
   */
  get isActive() {
    return this.isDragging
  }

  /**
   * Get current drag data
   */
  get currentDragData() {
    return this.dragData
  }

  /**
   * Cleanup state
   */
  cleanup() {
    // Stop any ongoing animation
    this.stopAnimation()
    
    // Remove any remaining event listeners (safety net) - use same options as when added
    document.removeEventListener('mousemove', this.handleMouseMove, { passive: false, capture: true })
    document.removeEventListener('mouseup', this.handleMouseUp, { capture: true })
    document.removeEventListener('contextmenu', this.handleMouseUp, { capture: true })
    document.removeEventListener('scroll', this.preventScroll, { passive: false, capture: true })
    document.removeEventListener('wheel', this.preventScroll, { passive: false, capture: true })
    document.removeEventListener('touchmove', this.preventScroll, { passive: false, capture: true })
    
    // Reset text selection
    document.body.style.userSelect = ''
    document.body.style.webkitUserSelect = ''
    document.body.classList.remove('dragging-active')
    
    // No overflow styles to restore since we don't modify them
    
    // Reset all state
    this.dragElement = null
    this.dragOriginElement = null
    this.dragData = null
    this.onDragEnd = null
    this.originalTransform = ''
    this.originalZIndex = ''
    this.originalPosition = ''
    this.grabOffset = { x: 0, y: 0 }
    this.currentPos = { x: 0, y: 0 }
    this.targetPos = { x: 0, y: 0 }
    this.startPos = { x: 0, y: 0 }
    this.lastMousePos = { x: 0, y: 0 }
    this.hasMetThreshold = false
    this.currentHoveredElement = null
    this.originalScrollTop = 0
    this.originalScrollLeft = 0
  }

  /**
   * Force end drag (for cleanup)
   */
  forceEnd() {
    if (this.isDragging) {
      this.endDrag()
    }
  }
  
  /**
   * Add listener for drag state changes
   */
  addStateChangeListener(listener) {
    this.stateChangeListeners.push(listener)
  }
  
  /**
   * Remove listener for drag state changes
   */
  removeStateChangeListener(listener) {
    const index = this.stateChangeListeners.indexOf(listener)
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1)
    }
  }
  
  /**
   * Notify all listeners of state change
   */
  notifyStateChange() {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.warn('Error in drag state listener:', error)
      }
    })
  }
  
  /**
   * Update drop zone highlighting via direct DOM manipulation (no React re-renders)
   */
  updateDropZoneHighlighting() {
    const isActive = this.isDragging
    const dragData = this.dragData
    const shouldHighlight = isActive && dragData?.source !== 'shop'
    
    // Find all hex tiles (drop zones) - only player tiles
    const hexTiles = document.querySelectorAll('.hex-tile.player')
    hexTiles.forEach(tile => {
      if (shouldHighlight) {
        // Temporarily disable transitions to prevent flashing when element reconnects
        const originalTransition = tile.style.transition
        tile.style.transition = 'none'
        tile.classList.add('drop-zone')
        
        // Restore transition after a frame
        requestAnimationFrame(() => {
          tile.style.transition = originalTransition
        })
      } else {
        tile.classList.remove('drop-zone')
        tile.classList.remove('hovered')
      }
    })
    
    // Find only player bench slots (not opponent bench slots)
    const benchSlots = document.querySelectorAll('.bench-container .bench-slot')
    benchSlots.forEach(slot => {
      if (shouldHighlight) {
        // Temporarily disable transitions to prevent flashing when element reconnects
        const originalTransition = slot.style.transition
        slot.style.transition = 'none'
        slot.classList.add('drop-zone')
        
        // Restore transition after a frame
        requestAnimationFrame(() => {
          slot.style.transition = originalTransition
        })
      } else {
        slot.classList.remove('drop-zone')
        slot.classList.remove('hovered')
      }
    })
  }

  /**
   * Update hover highlighting for the currently hovered drop zone
   */
  updateHoverHighlighting(e) {
    const dragData = this.dragData
    const shouldHighlight = this.isDragging && dragData?.source !== 'shop'
    
    if (!shouldHighlight) return
    
    // Clear previous hover state
    if (this.currentHoveredElement) {
      this.currentHoveredElement.classList.remove('hovered')
    }
    
    // Find the element under the mouse cursor
    const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY)
    
    // Check if it's a valid drop zone
    let targetElement = null
    
    // Check for hex tiles
    if (elementUnderMouse?.classList.contains('hex-tile') && elementUnderMouse.classList.contains('player')) {
      targetElement = elementUnderMouse
    }
    // Check for bench slots
    else if (elementUnderMouse?.classList.contains('bench-slot') && elementUnderMouse.closest('.bench-container')) {
      targetElement = elementUnderMouse
    }
    // Check if we're inside a bench slot (child element)
    else if (elementUnderMouse?.closest('.bench-container .bench-slot')) {
      targetElement = elementUnderMouse.closest('.bench-container .bench-slot')
    }
    
    // Apply hover state to the target element
    if (targetElement && targetElement.classList.contains('drop-zone')) {
      targetElement.classList.add('hovered')
      this.currentHoveredElement = targetElement
    } else {
      this.currentHoveredElement = null
    }
  }
  
  /**
   * Register a drop zone
   */
  registerDropZone(dropHandler) {
    if (dropHandler && !this.dropZones.includes(dropHandler)) {
      this.dropZones.push(dropHandler)
    }
  }
  
  /**
   * Unregister a drop zone
   */
  unregisterDropZone(dropHandler) {
    const index = this.dropZones.indexOf(dropHandler)
    if (index > -1) {
      this.dropZones.splice(index, 1)
    }
  }
}

// Create singleton instance
const dragManager = new DragManager()

export default dragManager