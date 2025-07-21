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
    this.originalCursor = ''
    this.originalScrollTop = 0
    this.originalScrollLeft = 0
    this.originalParent = null
    this.originalNextSibling = null
    this.startPos = { x: 0, y: 0 }
    this.currentPos = { x: 0, y: 0 }
    this.targetPos = { x: 0, y: 0 }
    this.lastMousePos = { x: 0, y: 0 }
    this.grabOffset = { x: 0, y: 0 }
    this.animationId = null
    this.interpolationFactor = 0.4 
    this.onDragEnd = null
    this.dragData = null
    this.originalParent = null
    this.originalNextSibling = null
    this.stateChangeListeners = []
    this.dropZones = [] // Registered drop zones
    this.shopDragThreshold = 8 // Minimum pixels to move before visual drag starts for shop units
    this.benchBoardDragThreshold = 0 // Minimum pixels to move before visual drag starts for bench/board units
    this.hasMetThreshold = false // Track if threshold has been met
    this.currentHoveredElement = null // Track currently hovered drop zone
    this.isOverShopContainer = false // Track if cursor is over shop container wrapper
    this.audioManager = null // Audio manager for sound effects
    this.lastHoveredElement = null // Track last hovered element for hover sound timing

    // Bind methods to preserve context
    this.handleMouseMove = this.handleMouseMove.bind(this)
    this.handleMouseUp = this.handleMouseUp.bind(this)
    this.preventScroll = this.preventScroll.bind(this)
  }

  /**
   * Set the audio manager for sound effects
   */
  setAudioManager(audioManager) {
    this.audioManager = audioManager
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

    // Get starting position and capture EXACT dimensions before any style changes
    const rect = element.getBoundingClientRect()
    const exactWidth = rect.width
    const exactHeight = rect.height
    
    // Store original styles for restoration
    this.originalTransform = element.style.transform || ''
    this.originalZIndex = element.style.zIndex || ''
    this.originalPosition = element.style.position || ''
    this.originalCursor = element.style.cursor || ''
    this.originalWidth = element.style.width || ''
    this.originalHeight = element.style.height || ''

    // Don't modify overflow styles - use alternative positioning approach instead

    // Lock exact dimensions BEFORE applying any other styles to prevent flexbox compression
    // Skip dimension locking for board units - they're positioned in SVG and don't need compression protection
    const isBoardUnit = this.dragData?.source === 'board' && element.classList?.contains('hex-unit-display')
    if (!isBoardUnit) {
      element.style.width = `${exactWidth}px`
      element.style.height = `${exactHeight}px`
    }
    
    // For shop units, also lock the unit-avatar dimensions to prevent flex compression
    if (this.dragData?.source === 'shop') {
      const unitAvatar = element.querySelector('.unit-avatar')
      if (unitAvatar) {
        const avatarRect = unitAvatar.getBoundingClientRect()
        unitAvatar.style.width = `${avatarRect.width}px`
        unitAvatar.style.height = `${avatarRect.height}px`
        unitAvatar.style.flex = 'none' // Remove flex behavior during drag
      }
    }
    
    // Don't apply position and visual styles immediately - wait for threshold
    // Store styles to apply later when threshold is met
    element.style.transition = 'none'
    element.style.pointerEvents = 'none' // This prevents interference during mouse events
    
    
    // Don't add dragging-active class immediately - wait for threshold
    
    // Add source-specific drag class for more granular styling
    if (this.dragData?.source) {
      document.body.classList.add(`dragging-from-${this.dragData.source}`)
    }
    
    // Don't add dragging class immediately - wait for threshold
    
    // Set grabbing cursor immediately for bench and board units (not shop)
    if (this.dragData?.source === 'bench' || this.dragData?.source === 'board') {
      element.style.setProperty('cursor', 'grabbing', 'important')
      document.body.style.cursor = 'grabbing'
    }
    
    // Special handling for board units - move to end of SVG to ensure they render last
    if (this.dragData?.source === 'board') {
      this.handleBoardUnitDOMOrder(element)
    }
    
    // startPos is now set by useDragManager to the element position, don't override it
    // Only set if it hasn't been set yet
    if (!this.startPos || (this.startPos.x === 0 && this.startPos.y === 0)) {
      this.startPos = { x: rect.left, y: rect.top }
    }
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
      Math.pow(e.clientX - this.startPos.x, 2) + 
      Math.pow(e.clientY - this.startPos.y, 2)
    )
    
    // Determine the appropriate threshold based on drag source
    const currentThreshold = this.dragData?.source === 'shop' 
      ? this.shopDragThreshold 
      : this.benchBoardDragThreshold
    
    // Only start visual drag effects after threshold is met
    if (!this.hasMetThreshold && distanceFromStart >= currentThreshold) {
      this.hasMetThreshold = true
      
      // Play pickup sound when drag threshold is met (but not for shop units)
      if (this.audioManager && this.dragData?.source !== 'shop') {
        this.audioManager.playUnitPickup()
      }
      
      // Apply positioning styles when threshold is met
      if (this.dragElement) {
        // Don't override position - let existing CSS positioning work
        this.dragElement.style.zIndex = '9999999' // Highest z-index for all dragged elements
        this.dragElement.classList.add('dragging')
      }
      
      // Add dragging-active class when threshold is met
      document.body.classList.add('dragging-active')
      
      // Change cursor to indicate dragging has started (only for shop units - bench/board already set)
      if (this.dragData?.source === 'shop') {
        if (this.dragElement) {
          this.dragElement.style.cursor = 'grabbing'
        }
        document.body.style.cursor = 'grabbing'
      }
      
      // Apply shop container transparency for shop units
      if (this.dragData?.source === 'shop') {
        this.updateShopContainerOpacity()
      }
      
      // Notify that visual drag has started (for sell overlay, etc.)
      this.notifyStateChange()
    }
    
    // Calculate transform to keep grab point under cursor
    // For board units (inside SVG), we need to handle coordinates differently
    let newX, newY
    
    if (this.dragData?.source === 'board' && this.dragElement) {
      const svg = this.dragElement.closest('svg')
      if (svg) {
        // Get the CTM (Current Transformation Matrix) to convert screen to SVG coordinates
        const ctm = svg.getScreenCTM()
        if (ctm) {
          // Convert only the mouse movement delta to SVG coordinates
          const mouseDeltaX = e.clientX - this.startPos.x
          const mouseDeltaY = e.clientY - this.startPos.y
          
          const screenDelta = svg.createSVGPoint()
          screenDelta.x = mouseDeltaX
          screenDelta.y = mouseDeltaY
          const svgDelta = screenDelta.matrixTransform(ctm.inverse())
          
          // Apply grab offset in SVG coordinate space
          const grabOffsetSvg = svg.createSVGPoint()
          grabOffsetSvg.x = this.grabOffset.x
          grabOffsetSvg.y = this.grabOffset.y
          const svgGrabOffset = grabOffsetSvg.matrixTransform(ctm.inverse())
          
          newX = svgDelta.x - svgGrabOffset.x
          newY = svgDelta.y - svgGrabOffset.y
        } else {
          // Fallback if CTM is not available
          newX = e.clientX - this.startPos.x - this.grabOffset.x
          newY = e.clientY - this.startPos.y - this.grabOffset.y
        }
      } else {
        // Fallback if SVG is not found
        newX = e.clientX - this.startPos.x - this.grabOffset.x
        newY = e.clientY - this.startPos.y - this.grabOffset.y
      }
    } else {
      // Regular DOM elements - use screen coordinates
      newX = e.clientX - this.startPos.x - this.grabOffset.x
      newY = e.clientY - this.startPos.y - this.grabOffset.y
    }
    
    // Only apply visual effects after threshold is met
    if (this.hasMetThreshold && !isNaN(newX) && !isNaN(newY) && isFinite(newX) && isFinite(newY)) {
      this.targetPos = { x: newX, y: newY }
      
    }
    
    // Update hover highlighting if drag is active
    if (this.hasMetThreshold) {
      this.updateHoverHighlighting(e)
      
      // Update shop container state for shop units
      if (this.dragData?.source === 'shop') {
        this.updateShopContainerState(e)
      }
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
      // For board units, always clear transform to prevent "non-fresh" positioning issues
      // For other units, restore original transform
      const isBoardUnit = this.dragData?.source === 'board' && this.dragElement.classList?.contains('hex-unit-display')
      this.dragElement.style.transform = isBoardUnit ? '' : this.originalTransform
      
      this.dragElement.style.zIndex = this.originalZIndex
      this.dragElement.style.position = this.originalPosition
      this.dragElement.style.pointerEvents = ''
      this.dragElement.style.transition = ''
      this.dragElement.style.opacity = ''
      this.dragElement.style.filter = ''
      this.dragElement.style.boxShadow = ''
      this.dragElement.style.visibility = ''
      this.dragElement.style.display = ''
      this.dragElement.style.cursor = this.originalCursor
      // Restore original dimensions
      this.dragElement.style.width = this.originalWidth
      this.dragElement.style.height = this.originalHeight
      
      // For shop units, restore unit-avatar styles
      if (this.dragData?.source === 'shop') {
        const unitAvatar = this.dragElement.querySelector('.unit-avatar')
        if (unitAvatar) {
          unitAvatar.style.width = ''
          unitAvatar.style.height = ''
          unitAvatar.style.flex = ''
        }
      }
      
      this.dragElement.classList.remove('dragging')
    }
    
    // Restore board unit DOM order if needed
    if (this.dragData?.source === 'board') {
      this.restoreBoardUnitDOMOrder()
      // Force refresh cursor styles for all board units after board operations
      this.refreshBoardUnitCursors()
    }
    
    // Also refresh board unit cursors if drag ended on the board (for swaps)
    if (this.dragData?.source === 'bench') {
      // Small delay to ensure DOM updates are complete
      setTimeout(() => {
        this.refreshBoardUnitCursors()
      }, 10)
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
    
    // Remove source-specific drag class
    if (this.dragData?.source) {
      document.body.classList.remove(`dragging-from-${this.dragData.source}`)
    }

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
        // Play drop sound when drop is successful
        if (this.audioManager && this.hasMetThreshold) {
          this.audioManager.playUnitDrop()
        }
        break
      }
    }
    
    // Call end callback with accurate mouse position if no drop zone handled it
    if (!dropHandled && this.onDragEnd) {
      console.log('🎯 Calling drag end callback:', this.dragData)
      this.onDragEnd(enhancedEvent, this.dragData)
    } else {
      console.log('🎯 No drag end callback called:', { dropHandled, hasCallback: !!this.onDragEnd })
    }

    // Clear drop zone highlighting immediately (direct DOM, no React re-renders)
    this.updateDropZoneHighlighting()
    
    // Restore shop container opacity
    this.restoreShopContainerOpacity()
    
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
    if (!this.dragElement) return
    
    // For board units, don't apply any transform until threshold is met AND we have a valid target position
    if (this.dragData?.source === 'board' && (!this.hasMetThreshold || (this.targetPos.x === 0 && this.targetPos.y === 0))) {
      return
    }
    
    if (!this.hasMetThreshold) return

    // Check if element is still connected to DOM
    const isConnected = this.dragElement.isConnected
    const isInDocument = document.contains(this.dragElement)
    
    // If element is no longer connected to DOM, try to find the replacement
    if (!isConnected || !isInDocument) {
      console.log('🔍 Element disconnected, attempting recovery...')
      
      let replacementElement = null
      
      // For bench units, use more specific selector with unitIndex
      if (this.dragData?.source === 'bench' && this.dragData?.unitIndex !== undefined) {
        // Find the specific bench slot, then look for the unit image within it
        const benchSlot = document.querySelector(`.bench-container .bench-slot[data-slot="${this.dragData.unitIndex}"]`)
        if (benchSlot) {
          replacementElement = benchSlot.querySelector('.bench-unit-image')
        }
      }
      
      // For board units, use row/col position to find the specific hex tile
      else if (this.dragData?.source === 'board' && this.dragData?.unit?.row !== undefined && this.dragData?.unit?.col !== undefined) {
        // Find the specific hex unit display by row/col
        const row = this.dragData.unit.row
        const col = this.dragData.unit.col
        replacementElement = document.querySelector(`.hex-unit-display[data-row="${row}"][data-col="${col}"]`)
      }
      
      // Fallback to original className-based search for other sources
      if (!replacementElement) {
        replacementElement = document.querySelector(`.${this.dragElement.className.split(' ').join('.')}`)
      }
      
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
    // Only use translate, ignore any original transforms that might cause scaling
    const transform = `translate(${Math.round(this.currentPos.x)}px, ${Math.round(this.currentPos.y)}px)`
    
    
    this.dragElement.style.transform = transform
    
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
    
    // Remove source-specific drag class
    if (this.dragData?.source) {
      document.body.classList.remove(`dragging-from-${this.dragData.source}`)
    }
    
    // No overflow styles to restore since we don't modify them
    
    // Reset all state
    this.dragElement = null
    this.dragOriginElement = null
    this.dragData = null
    this.onDragEnd = null
    this.originalTransform = ''
    this.originalZIndex = ''
    this.originalPosition = ''
    this.originalCursor = ''
    this.originalWidth = ''
    this.originalHeight = ''
    this.grabOffset = { x: 0, y: 0 }
    this.currentPos = { x: 0, y: 0 }
    this.targetPos = { x: 0, y: 0 }
    this.startPos = { x: 0, y: 0 }
    this.lastMousePos = { x: 0, y: 0 }
    this.hasMetThreshold = false
    this.currentHoveredElement = null
    this.lastHoveredElement = null
    this.isOverShopContainer = false
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
   * Handle DOM order for board units to ensure they render last in SVG
   */
  handleBoardUnitDOMOrder(element) {
    // Find the parent <g> element that contains this board unit
    const parentG = element.closest('g')
    if (!parentG) return
    
    // Find the SVG container
    const svg = parentG.closest('svg')
    if (!svg) return
    
    // Store original position for restoration
    this.originalParent = parentG.parentNode
    this.originalNextSibling = parentG.nextSibling
    
    // Move the <g> element to the end of the SVG so it renders last
    svg.appendChild(parentG)
    
    console.log('🎯 Moved board unit to end of SVG for proper rendering order')
  }

  /**
   * Restore board unit DOM order
   */
  restoreBoardUnitDOMOrder() {
    if (this.originalParent && this.dragElement) {
      const parentG = this.dragElement.closest('g')
      if (parentG) {
        // Restore original position
        if (this.originalNextSibling) {
          this.originalParent.insertBefore(parentG, this.originalNextSibling)
        } else {
          this.originalParent.appendChild(parentG)
        }
        console.log('🔄 Restored board unit to original DOM position')
      }
    }
    
    // Clear references
    this.originalParent = null
    this.originalNextSibling = null
  }

  /**
   * Force refresh cursor styles for all board units
   */
  refreshBoardUnitCursors() {
    // Find all board unit display elements
    const boardUnits = document.querySelectorAll('.hex-tile.player .hex-unit-display')
    
    boardUnits.forEach(unitElement => {
      // Force the cursor style to be grab for player units
      unitElement.style.setProperty('cursor', 'grab', 'important')
    })
    
    console.log('🔄 Refreshed cursor styles for', boardUnits.length, 'board units')
  }

  /**
   * Add listener for drag state changes
   */
  addStateChangeListener(listener) {
    console.log('➕ Adding drag state listener, total will be:', this.stateChangeListeners.length + 1)
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
    console.log('🔔 Notifying drag state change:', {
      isActive: this.isDragging,
      dragData: this.dragData,
      listeners: this.stateChangeListeners.length
    })
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
    // Check if we're inside a hex unit container or display (when hovering over unit on hex tile)
    else if (elementUnderMouse?.classList.contains('hex-unit-container') || elementUnderMouse?.classList.contains('hex-unit-display')) {
      // Find the parent hex tile
      const hexTile = elementUnderMouse.closest('g')?.querySelector('.hex-tile.player')
      if (hexTile) {
        targetElement = hexTile
      }
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
      
      // Play hover sound when entering a new drop zone (but not the same one)
      if (this.audioManager && this.lastHoveredElement !== targetElement) {
        this.audioManager.playDragHover()
      }
      
      this.lastHoveredElement = targetElement
      this.currentHoveredElement = targetElement
    } else {
      this.lastHoveredElement = null
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
  
  /**
   * Apply fading styles using hybrid approach: 
   * - Background/border styles for shop slots and buttons
   * - Individual opacity for unit-displays (except dragged one)
   */
  applyShopFadingStyles() {
    // 1. Fade backgrounds and borders of all shop slots
    const shopSlots = document.querySelectorAll('.shop-slot')
    shopSlots.forEach(slot => {
      slot.style.setProperty('background-color', 'rgba(31, 41, 55, 0.3)', 'important')
      slot.style.setProperty('border-color', 'rgba(55, 65, 81, 0.3)', 'important')
    })
    
    // 2. Fade background and borders of player buttons section
    const playerButtonsSection = document.querySelector('.player-buttons-section')
    if (playerButtonsSection) {
      playerButtonsSection.style.setProperty('background-color', 'rgba(31, 41, 55, 0.3)', 'important')
      playerButtonsSection.style.setProperty('border-color', 'rgba(55, 65, 81, 0.3)', 'important')
      
      // Also fade the buttons inside
      const buttons = playerButtonsSection.querySelectorAll('button')
      buttons.forEach(button => {
        button.style.setProperty('opacity', '0.6', 'important')
      })
    }
    
    // 3. Fade all unit-displays individually (except the dragged one)
    const unitDisplays = document.querySelectorAll('.unit-display')
    unitDisplays.forEach(unitDisplay => {
      // Skip the dragged element
      if (this.dragElement && (unitDisplay === this.dragElement || this.dragElement.contains(unitDisplay) || unitDisplay.contains(this.dragElement))) {
        return
      }
      unitDisplay.style.setProperty('opacity', '0.6', 'important')
      
      // Hide empty slot inset for shop slots that contain units but are not being dragged
      const shopSlot = unitDisplay.closest('.shop-slot')
      if (shopSlot) {
        const emptySlot = shopSlot.querySelector('.empty-slot')
        if (emptySlot) {
          emptySlot.style.setProperty('opacity', '0', 'important')
        }
      }
    })
    
    // 4. Ensure dragged unit-display stays at full opacity
    if (this.dragElement) {
      this.dragElement.style.setProperty('opacity', '1', 'important')
    }
  }

  /**
   * Remove all shop fading styles
   */
  removeShopFadingStyles() {
    // 1. Restore shop slot backgrounds and borders
    const shopSlots = document.querySelectorAll('.shop-slot')
    shopSlots.forEach(slot => {
      slot.style.removeProperty('background-color')
      slot.style.removeProperty('border-color')
    })
    
    // 2. Restore player buttons section
    const playerButtonsSection = document.querySelector('.player-buttons-section')
    if (playerButtonsSection) {
      playerButtonsSection.style.removeProperty('background-color')
      playerButtonsSection.style.removeProperty('border-color')
      
      // Restore buttons
      const buttons = playerButtonsSection.querySelectorAll('button')
      buttons.forEach(button => {
        button.style.removeProperty('opacity')
      })
    }
    
    // 3. Restore all unit-displays
    const unitDisplays = document.querySelectorAll('.unit-display')
    unitDisplays.forEach(unitDisplay => {
      unitDisplay.style.removeProperty('opacity')
    })
    
    // 4. Restore all empty slot insets
    const emptySlots = document.querySelectorAll('.empty-slot')
    emptySlots.forEach(emptySlot => {
      emptySlot.style.removeProperty('opacity')
    })
  }

  /**
   * Update shop container opacity during drag from shop
   */
  updateShopContainerOpacity() {
    // Apply hybrid fading styles
    this.applyShopFadingStyles()
  }
  
  /**
   * Update shop container state based on cursor position
   */
  updateShopContainerState(e) {
    // Check if cursor is inside either shop child (shop-wrapper or player-buttons-section)
    const shopWrapper = document.querySelector('.shop-wrapper')
    const playerButtonsSection = document.querySelector('.player-buttons-section')
    
    let isOverShopArea = false
    
    // Check if cursor is inside shop-wrapper
    if (shopWrapper) {
      const shopRect = shopWrapper.getBoundingClientRect()
      const isInsideShop = e.clientX >= shopRect.left && 
                          e.clientX <= shopRect.right && 
                          e.clientY >= shopRect.top && 
                          e.clientY <= shopRect.bottom
      if (isInsideShop) {
        isOverShopArea = true
      }
    }
    
    // Check if cursor is inside player-buttons-section
    if (playerButtonsSection && !isOverShopArea) {
      const buttonsRect = playerButtonsSection.getBoundingClientRect()
      const isInsideButtons = e.clientX >= buttonsRect.left && 
                             e.clientX <= buttonsRect.right && 
                             e.clientY >= buttonsRect.top && 
                             e.clientY <= buttonsRect.bottom
      if (isInsideButtons) {
        isOverShopArea = true
      }
    }
    
    const wasOverShop = this.isOverShopContainer
    this.isOverShopContainer = isOverShopArea
    
    // Update fading based on cursor position
    if (this.isOverShopContainer && !wasOverShop) {
      // Entering shop area - apply hybrid fading styles
      this.applyShopFadingStyles()
    } else if (!this.isOverShopContainer && wasOverShop) {
      // Leaving shop area - restore all styles
      this.removeShopFadingStyles()
    }
  }
  
  /**
   * Restore shop container opacity
   */
  restoreShopContainerOpacity() {
    // Remove all hybrid fading styles
    this.removeShopFadingStyles()
  }
  
  /**
   * Check if cursor is currently over shop container
   */
  get isOverShopContainerWrapper() {
    return this.isOverShopContainer
  }
}

// Create singleton instance
const dragManager = new DragManager()

export default dragManager