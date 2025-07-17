import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Coins } from 'lucide-react'
import { useDragManager, useDropZone } from '../hooks/useDragManager'
import dragManager from '../utils/DragManager'

const SHOP_SLOTS = 5

function Shop({ units = [], playerGold = 0, tftData, tftImages, onPurchase, onSell }) {
  // Track ongoing drags to prevent click handlers from interfering
  const isDragActiveRef = useRef(false)
  
  // New drop zone for selling
  const { dropZoneRef } = useDropZone(
    (e, dragData) => {
      // Handle sell drop
      if (dragData && (dragData.source === 'bench' || dragData.source === 'board') && onSell) {
        const location = dragData.source
        const index = dragData.source === 'bench' ? dragData.unit.benchIndex : null
        onSell(dragData.unit, location, index)
      }
    },
    (dragData) => {
      // Can drop if it's from bench or board
      return dragData && (dragData.source === 'bench' || dragData.source === 'board')
    }
  )

  // Load images for visible units
  useEffect(() => {
    if (tftImages && units.length > 0) {
      units.forEach(unit => {
        if (unit && unit.id) {
          tftImages.loadImage(unit.id, 'champion')
        }
      })
    }
  }, [units, tftImages])

  
  const renderShopSlots = () => {
    const slots = []
    
    // Always render shop slots for consistent layout
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`shop-${i}`}
          className="shop-slot"
          data-slot={i}
          onClick={(e) => {
            // Prevent event propagation
            e.stopPropagation()
            
            // Only allow click purchase if no drag occurred
            console.log('🛒 Shop slot click:', {
              unit: unit?.name,
              isDragActive: isDragActiveRef.current
            })
            if (unit && onPurchase && !isDragActiveRef.current) {
              console.log('🛒 Purchasing via click')
              onPurchase(unit, i)
            }
            
            // Reset drag tracking after any click (longer delay to ensure drag completes first)
            setTimeout(() => {
              isDragActiveRef.current = false
            }, 200)
          }}
        >
          {unit ? (
            <ShopUnitDisplay 
              unit={unit} 
              tftData={tftData} 
              tftImages={tftImages}
              slotIndex={i}
              onPurchase={onPurchase}
              isDragActiveRef={isDragActiveRef}
            />
          ) : (
            <div className="empty-slot"></div>
          )}
        </div>
      )
    }
    
    return slots
  }

  // Always render the overlay but control visibility via CSS and manual updates
  const sellOverlayRef = useRef(null)
  
  // Update sell overlay visibility based on drag state using proper state change events
  useEffect(() => {
    const updateSellOverlay = () => {
      if (!sellOverlayRef.current) return
      
      const isActive = dragManager.isActive
      const dragData = dragManager.currentDragData
      const shouldShow = isActive && dragData?.source !== 'shop'
      
      console.log('🛒 Sell overlay update:', {
        isActive,
        dragData,
        shouldShow,
        sellOverlayExists: !!sellOverlayRef.current
      })
      
      if (shouldShow) {
        const sellValue = dragData?.unit ? Math.floor(dragData.unit.cost * 0.6) : 0
        sellOverlayRef.current.style.display = 'flex'
        const sellText = sellOverlayRef.current.querySelector('.sell-text')
        if (sellText) {
          sellText.textContent = `Sell for ${sellValue}g`
        }
      } else {
        sellOverlayRef.current.style.display = 'none'
      }
    }
    
    // Update immediately
    updateSellOverlay()
    
    // Listen for drag state changes
    dragManager.addStateChangeListener(updateSellOverlay)
    
    return () => {
      dragManager.removeStateChangeListener(updateSellOverlay)
    }
  }, [])

  const renderSellOverlay = () => {
    return (
      <div
        ref={(el) => {
          sellOverlayRef.current = el
          if (dropZoneRef) dropZoneRef.current = el
        }}
        className="shop-slots-sell-overlay"
        style={{ display: 'none' }} // Hidden by default
      >
        <div className="sell-text">
          Sell for 0g
        </div>
      </div>
    )
  }
  
  return (
    <div className="shop-container">
      <div className="shop-slots">
        {renderShopSlots()}
        {renderSellOverlay()}
      </div>
    </div>
  )
}

/**
 * Component for displaying a unit in the shop
 */
function ShopUnitDisplay({ unit, tftData, tftImages, slotIndex, onPurchase, isDragActiveRef }) {
  const imageRef = useRef(null)
  const championData = tftData?.champions?.[unit.id]
  
  // New drag system
  const { createDragHandler } = useDragManager()
  
  useEffect(() => {
    if (tftImages && unit.id && imageRef.current) {
      // Clear previous content
      imageRef.current.innerHTML = ''
      
      // Get the loaded image from tftImages (which applies mappings)
      const loadedImage = tftImages.getImage(unit.id, 'champion')
      
      if (loadedImage) {
        // Use the properly loaded and mapped image
        const imgElement = document.createElement('img')
        imgElement.src = loadedImage.src
        imgElement.alt = championData?.name || unit.name || 'Champion'
        imgElement.style.width = '100%'
        imgElement.style.height = '100%'
        imgElement.style.objectFit = 'cover'
        
        imageRef.current.appendChild(imgElement)
      } else if (tftImages.isImageLoading(unit.id, 'champion')) {
        // Show loading indicator
        imageRef.current.innerHTML = `<div class="loading-placeholder">...</div>`
      } else if (tftImages.hasImageError(unit.id, 'champion')) {
        // Show error indicator
        imageRef.current.innerHTML = `<div class="error-placeholder">!</div>`
      } else {
        // Fallback to text placeholder
        imageRef.current.innerHTML = `<div class="text-placeholder">${championData?.name?.charAt(0) || unit.name?.charAt(0) || 'U'}</div>`
      }
    }
  }, [unit.id, tftImages, championData])

  // Stable drag end handler using useCallback
  const handleDragEnd = useCallback((e, dragData) => {
    console.log('🎯 handleDragEnd called with:', { e, dragData })
    
    // Get current mouse position (enhanced by drag manager)
    const mouseX = e?.clientX || 0
    const mouseY = e?.clientY || 0
    
    // Mark this as a drag operation since handleDragEnd was called by drag manager
    if (isDragActiveRef) {
      isDragActiveRef.current = true
    }
    
    // Check if mouse is outside shop-container-wrapper for purchase
    const shopContainerWrapper = document.querySelector('.shop-container-wrapper')
    
    if (shopContainerWrapper) {
      const shopRect = shopContainerWrapper.getBoundingClientRect()
      const isOutsideShopWrapper = mouseX < shopRect.left || 
                                  mouseX > shopRect.right || 
                                  mouseY < shopRect.top || 
                                  mouseY > shopRect.bottom
      
      console.log('🛒 Drag end check:', {
        unit: unit?.name,
        isOutsideShopWrapper,
        mousePos: { mouseX, mouseY },
        shopRect: shopRect ? { left: shopRect.left, right: shopRect.right, top: shopRect.top, bottom: shopRect.bottom } : null,
        willPurchase: isOutsideShopWrapper
      })
      
      // Purchase if cursor is outside shop-container-wrapper bounds
      if (isOutsideShopWrapper && onPurchase) {
        console.log('🛒 Purchasing via drag outside wrapper')
        onPurchase(unit, slotIndex)
      }
    }
  }, [unit, slotIndex, onPurchase, isDragActiveRef])

  // Stable mouse down handler using useCallback
  const handleMouseDown = useCallback((e) => {
    // Reset drag tracking at start
    if (isDragActiveRef) {
      isDragActiveRef.current = false
    }
    
    // No need to store position for distance calculation anymore
    
    // Call the drag handler
    const dragHandler = createDragHandler(
      { unit, slotIndex, source: 'shop' }, // drag data
      handleDragEnd // end callback
    )
    dragHandler(e)
  }, [unit, slotIndex, createDragHandler, handleDragEnd, isDragActiveRef])

  return (
    <div 
      className="unit-display"
      onMouseDown={(e) => {
        // Stop event from bubbling to parent shop-slot
        e.stopPropagation()
        handleMouseDown(e)
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className={`unit-avatar`} ref={imageRef} style={{pointerEvents: 'none'}}>
        {/* Show fallback if no image URL available */}
        {!championData?.imageUrl && (
          <div className="text-placeholder">
            {championData?.name?.charAt(0) || unit.name?.charAt(0) || 'U'}
          </div>
        )}
      </div>
      <div className={`unit-bottom-header cost-${unit.cost}`} style={{pointerEvents: 'none'}}>
        <span className="unit-name">
          {championData?.name || unit.name || 'Unknown'}
        </span>
        <div className="unit-cost-container">
          <Coins className="unit-cost-icon" />
          <span className="unit-cost">
            {unit.cost}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Shop