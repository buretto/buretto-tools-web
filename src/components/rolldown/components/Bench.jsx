import React, { useEffect, useRef } from 'react'
import { useDrag } from '../contexts/DragContext'

const BENCH_SLOTS = 9

function Bench({ units = [], onUnitMove, onUnitSwap, onSell, tftData, tftImages }) {
  const { isDragging, draggedUnit, dragSource, endDrag } = useDrag()
  
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
  const handleDrop = (e, benchIndex) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedUnit || !dragSource) return
    
    // Store drag data locally before clearing it
    const currentDraggedUnit = draggedUnit
    const currentDragSource = dragSource
    
    // Reset drag state immediately to make overlay disappear
    endDrag()
    
    const existingUnit = units[benchIndex]
    
    if (currentDragSource === 'bench') {
      // Moving within bench or swapping
      if (existingUnit) {
        onUnitSwap?.(currentDraggedUnit, 'bench', currentDraggedUnit.benchIndex, null, null, existingUnit, 'bench', benchIndex, null, null)
      } else {
        onUnitMove?.(currentDraggedUnit, 'bench', currentDraggedUnit.benchIndex, 'bench', benchIndex, null, null)
      }
    } else if (currentDragSource === 'board') {
      // Moving from board to bench
      if (existingUnit) {
        onUnitSwap?.(currentDraggedUnit, 'board', null, currentDraggedUnit.row, currentDraggedUnit.col, existingUnit, 'bench', benchIndex, null, null)
      } else {
        onUnitMove?.(currentDraggedUnit, 'board', null, 'bench', benchIndex, null, null)
      }
    }
  }

  const renderBenchSlots = () => {
    const slots = []
    
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`bench-${i}`}
          className={`bench-slot ${isDragging && dragSource !== 'shop' ? 'drop-zone' : ''}`}
          data-slot={i}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (isDragging && dragSource !== 'shop') {
              e.dataTransfer.dropEffect = 'move'
            }
          }}
          onDrop={(e) => {
            e.stopPropagation()
            handleDrop(e, i)
          }}
        >
          {unit && (
            <BenchUnitDisplay 
              unit={unit}
              unitIndex={i}
              tftData={tftData} 
              tftImages={tftImages}
              onSell={onSell}
            />
          )}
        </div>
      )
    }
    
    return slots
  }
  
  return (
    <div className="bench-container">
      <div className="bench-slots">
        {renderBenchSlots()}
      </div>
    </div>
  )
}

/**
 * Component for displaying a unit in the bench
 */
function BenchUnitDisplay({ unit, unitIndex, tftData, tftImages, onSell }) {
  const imageRef = useRef(null)
  const { startDrag, endDrag } = useDrag()
  
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
        imgElement.style.borderRadius = '8px'
        
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

  const handleDragStart = (e) => {
    const unitWithIndex = { ...unit, benchIndex: unitIndex }
    startDrag(unitWithIndex, 'bench', unitIndex, e.currentTarget)
    
    // Calculate grab point relative to element and get actual dimensions
    const rect = e.currentTarget.getBoundingClientRect()
    const grabX = e.clientX - rect.left
    const grabY = e.clientY - rect.top
    const actualWidth = rect.width
    const actualHeight = rect.height
    
    // Try to use the actual unit image if available
    const loadedImage = tftImages?.getImage(unit.id, 'champion')
    
    if (loadedImage) {
      // Create drag image with actual unit image using actual dimensions
      const dragImage = document.createElement('div')
      dragImage.style.width = `${actualWidth}px`
      dragImage.style.height = `${actualHeight}px`
      dragImage.style.borderRadius = '8px'
      dragImage.style.backgroundColor = 'rgba(0,0,0,0.7)'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.pointerEvents = 'none'
      dragImage.style.overflow = 'hidden'
      
      const img = document.createElement('img')
      img.src = loadedImage.src
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'cover'
      img.style.borderRadius = '8px'
      
      dragImage.appendChild(img)
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, grabX, grabY)
      
      setTimeout(() => {
        document.body.removeChild(dragImage)
      }, 0)
    } else {
      // Fallback to text-based drag image using actual dimensions
      const dragImage = document.createElement('div')
      dragImage.style.width = `${actualWidth}px`
      dragImage.style.height = `${actualHeight}px`
      dragImage.style.borderRadius = '8px'
      dragImage.style.backgroundColor = 'rgba(0,0,0,0.8)'
      dragImage.style.display = 'flex'
      dragImage.style.alignItems = 'center'
      dragImage.style.justifyContent = 'center'
      dragImage.style.color = 'white'
      dragImage.style.fontSize = '14px'
      dragImage.style.fontWeight = 'bold'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.pointerEvents = 'none'
      dragImage.textContent = championData?.name?.charAt(0) || unit.name?.charAt(0) || 'U'
      
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, grabX, grabY)
      
      setTimeout(() => {
        document.body.removeChild(dragImage)
      }, 0)
    }
    
    // Hide the original element during drag
    e.currentTarget.style.opacity = '0'
  }

  const handleDragEnd = (e) => {
    // Restore original element opacity
    e.currentTarget.style.opacity = '1'
    
    // End drag immediately for instant response
    endDrag()
  }
  
  return (
    <div 
      className="bench-unit-image" 
      ref={imageRef}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Show fallback if no image available */}
      {!championData && (
        <div className="text-placeholder">
          {unit.name?.charAt(0) || 'U'}
        </div>
      )}
    </div>
  )
}

export default Bench