import React, { useEffect, useRef, useState } from 'react'
import { Coins } from 'lucide-react'
import { useDrag } from '../contexts/DragContext'

const SHOP_SLOTS = 5

function Shop({ units = [], playerGold = 0, tftData, tftImages, onPurchase, onSell }) {
  const [draggedUnit, setDraggedUnit] = useState(null)
  const [isDraggedOutside, setIsDraggedOutside] = useState(false)
  const { isDragging, draggedUnit: globalDraggedUnit, dragSource, endDrag } = useDrag()
  
  // Add global drag handlers to ensure proper drag state management
  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
    
    const handleDrop = (e) => {
      e.preventDefault()
    }
    
    const handleDragEnd = (e) => {
      // Reset local drag state when any drag operation ends
      setDraggedUnit(null)
      setIsDraggedOutside(false)
    }
    
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)
    document.addEventListener('dragend', handleDragEnd)
    
    return () => {
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
      document.removeEventListener('dragend', handleDragEnd)
    }
  }, [])
  
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

  const handleSellDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Store drag data locally before clearing it
    const currentDraggedUnit = globalDraggedUnit
    const currentDragSource = dragSource
    
    // Reset drag state immediately
    endDrag()
    
    if (currentDraggedUnit && (currentDragSource === 'bench' || currentDragSource === 'board') && onSell) {
      const location = currentDragSource
      const index = currentDragSource === 'bench' ? currentDraggedUnit.benchIndex : null
      onSell(currentDraggedUnit, location, index)
    }
  }

  const handleSellDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const renderShopSlots = () => {
    const slots = []
    
    // Always render shop slots for consistent layout
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`shop-${i}`}
          className={`shop-slot ${draggedUnit === i ? 'dragging' : ''}`}
          data-slot={i}
          onClick={() => unit && onPurchase && onPurchase(unit, i)}
        >
          {unit ? (
            <ShopUnitDisplay 
              unit={unit} 
              tftData={tftData} 
              tftImages={tftImages}
              slotIndex={i}
              onDragStart={(slotIndex) => setDraggedUnit(slotIndex)}
              onDragEnd={() => {
                setDraggedUnit(null)
                setIsDraggedOutside(false)
              }}
              onDragOutside={(isOutside) => setIsDraggedOutside(isOutside)}
              onPurchase={onPurchase}
            />
          ) : (
            <div className="empty-slot"></div>
          )}
        </div>
      )
    }
    
    return slots
  }

  const renderSellOverlay = () => {
    const showSellArea = isDragging && (dragSource === 'bench' || dragSource === 'board')
    
    if (!showSellArea) return null
    
    const sellValue = globalDraggedUnit ? Math.floor(globalDraggedUnit.cost * 0.6) : 0
    return (
      <div
        className="shop-slots-sell-overlay"
        onDragOver={handleSellDragOver}
        onDrop={handleSellDrop}
      >
        <div className="sell-text">
          Sell for {sellValue}g
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
function ShopUnitDisplay({ unit, tftData, tftImages, slotIndex, onDragStart, onDragEnd, onDragOutside, onPurchase }) {
  const imageRef = useRef(null)
  const [dragStartPos, setDragStartPos] = useState(null)
  const [draggedElement, setDraggedElement] = useState(null)
  const championData = tftData?.champions?.[unit.id]
  
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

  // Cleanup effect to restore opacity if component unmounts during drag
  useEffect(() => {
    return () => {
      if (draggedElement) {
        draggedElement.style.opacity = '1'
      }
    }
  }, [draggedElement])
  
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', '')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.dropEffect = 'move'
    
    // Calculate grab point relative to element and get actual dimensions
    const rect = e.currentTarget.getBoundingClientRect()
    const grabX = e.clientX - rect.left
    const grabY = e.clientY - rect.top
    const actualWidth = rect.width
    const actualHeight = rect.height
    
    // Clone the unit display and copy computed styles
    const dragImage = e.currentTarget.cloneNode(true)
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-1000px'
    dragImage.style.pointerEvents = 'none'
    dragImage.style.width = `${actualWidth}px`
    dragImage.style.height = `${actualHeight}px`
    dragImage.style.opacity = '1'
    dragImage.style.filter = 'none'
    dragImage.style.transform = 'none'
    
    // Copy the main container styles to ensure no tinting
    const originalMainStyles = window.getComputedStyle(e.currentTarget)
    dragImage.style.backgroundColor = originalMainStyles.backgroundColor
    dragImage.style.borderRadius = originalMainStyles.borderRadius
    
    // Copy computed styles for the bottom header and its children
    const originalBottomHeader = e.currentTarget.querySelector('.unit-bottom-header')
    const clonedBottomHeader = dragImage.querySelector('.unit-bottom-header')
    
    if (originalBottomHeader && clonedBottomHeader) {
      const originalStyles = window.getComputedStyle(originalBottomHeader)
      clonedBottomHeader.style.backgroundColor = originalStyles.backgroundColor
      clonedBottomHeader.style.color = originalStyles.color
      clonedBottomHeader.style.fontSize = originalStyles.fontSize
      clonedBottomHeader.style.fontWeight = originalStyles.fontWeight
      clonedBottomHeader.style.padding = originalStyles.padding
      clonedBottomHeader.style.borderRadius = originalStyles.borderRadius
      clonedBottomHeader.style.height = originalStyles.height
      clonedBottomHeader.style.minHeight = originalStyles.minHeight
      clonedBottomHeader.style.maxHeight = originalStyles.maxHeight
      clonedBottomHeader.style.display = originalStyles.display
      clonedBottomHeader.style.alignItems = originalStyles.alignItems
      clonedBottomHeader.style.justifyContent = originalStyles.justifyContent
      
      // Copy styles for unit name
      const originalUnitName = originalBottomHeader.querySelector('.unit-name')
      const clonedUnitName = clonedBottomHeader.querySelector('.unit-name')
      if (originalUnitName && clonedUnitName) {
        const nameStyles = window.getComputedStyle(originalUnitName)
        clonedUnitName.style.color = nameStyles.color
        clonedUnitName.style.fontSize = nameStyles.fontSize
        clonedUnitName.style.fontWeight = nameStyles.fontWeight
      }
      
      // Copy styles for cost icon
      const originalCostIcon = originalBottomHeader.querySelector('.unit-cost-icon')
      const clonedCostIcon = clonedBottomHeader.querySelector('.unit-cost-icon')
      if (originalCostIcon && clonedCostIcon) {
        const iconStyles = window.getComputedStyle(originalCostIcon)
        clonedCostIcon.style.color = iconStyles.color
        clonedCostIcon.style.width = iconStyles.width
        clonedCostIcon.style.height = iconStyles.height
        clonedCostIcon.style.transform = iconStyles.transform
        clonedCostIcon.style.filter = iconStyles.filter
      }
      
      // Copy styles for cost text
      const originalCostText = originalBottomHeader.querySelector('.unit-cost')
      const clonedCostText = clonedBottomHeader.querySelector('.unit-cost')
      if (originalCostText && clonedCostText) {
        const costStyles = window.getComputedStyle(originalCostText)
        clonedCostText.style.color = costStyles.color
        clonedCostText.style.fontSize = costStyles.fontSize
        clonedCostText.style.fontWeight = costStyles.fontWeight
      }
      
      // Copy styles for cost container (this is what handles the flex layout)
      const originalCostContainer = originalBottomHeader.querySelector('.unit-cost-container')
      const clonedCostContainer = clonedBottomHeader.querySelector('.unit-cost-container')
      if (originalCostContainer && clonedCostContainer) {
        const containerStyles = window.getComputedStyle(originalCostContainer)
        clonedCostContainer.style.display = containerStyles.display
        clonedCostContainer.style.alignItems = containerStyles.alignItems
        clonedCostContainer.style.gap = containerStyles.gap
        clonedCostContainer.style.paddingRight = containerStyles.paddingRight
        clonedCostContainer.style.paddingLeft = containerStyles.paddingLeft
        clonedCostContainer.style.flexDirection = containerStyles.flexDirection
      }
    }
    
    // Force full opacity on all child elements to combat browser tinting
    const allElements = dragImage.querySelectorAll('*')
    allElements.forEach(element => {
      element.style.opacity = '1'
      element.style.filter = 'none'
    })
    
    // Also set on the main drag image
    dragImage.style.opacity = '1'
    dragImage.style.filter = 'opacity(1) !important'
    
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, grabX, grabY)
    
    // Hide the original element during drag and track it
    e.currentTarget.style.opacity = '0'
    setDraggedElement(e.currentTarget)
    
    // Clean up the temporary element after drag starts
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
    
    // Store the starting position
    setDragStartPos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    })
    
    onDragStart?.(slotIndex)
  }


  const handleDragEnd = (e) => {
    // Restore original element opacity
    if (draggedElement) {
      draggedElement.style.opacity = '1'
      setDraggedElement(null)
    }
    
    if (dragStartPos) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2)
      )
      
      // Purchase if dragged more than 80px away from starting position
      if (distance > 50 && onPurchase) {
        onPurchase(unit, slotIndex)
      }
    }
    
    setDragStartPos(null)
    onDragEnd?.()
  }

  return (
    <div 
      className="unit-display"
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
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