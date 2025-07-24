import React, { useEffect, useRef } from 'react'
import { useDragManager, useDropZone } from '../hooks/useDragManager'
import dragManager from '../utils/DragManager'
import StarIcon from './StarIcon'
import { getStarSizeMultiplier, getStarCssClass } from '../utils/starringSystem'

const BENCH_SLOTS = 9

// Move BenchSlot outside render to prevent recreation
function BenchSlot({ children, dropZoneRef }) {
  return (
    <div
      ref={dropZoneRef}
      className="bench-slot"
    >
      {children}
    </div>
  )
}

function Bench({ units = [], onUnitMove, onUnitSwap, onSell, tftData, tftImages, onUnitHover }) {
  // Create drop zones for each bench slot using new system
  const createBenchDropHandler = (benchIndex) => {
    return (e, dragData) => {
      if (!dragData || dragData.source === 'shop') return
      
      const currentDraggedUnit = dragData.unit
      const currentDragSource = dragData.source
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
  }
  
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

  const renderBenchSlots = () => {
    const slots = []
    
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const unit = units[i]
      
      // Create drop zone for this bench slot
      const { dropZoneRef } = useDropZone(
        createBenchDropHandler(i),
        (dragData) => dragData && dragData.source !== 'shop'
      )
      
      slots.push(
        <BenchSlot key={`bench-${i}`} dropZoneRef={dropZoneRef}>
          {unit && (
            <BenchUnitDisplay 
              key={`${unit.id}-${i}-${unit.stars || 1}`}
              unit={unit}
              unitIndex={i}
              tftData={tftData} 
              tftImages={tftImages}
              onSell={onSell}
              onUnitHover={onUnitHover}
            />
          )}
        </BenchSlot>
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
function BenchUnitDisplay({ unit, unitIndex, tftData, tftImages, onSell, onUnitHover }) {
  const imageRef = useRef(null)
  const dragRef = useRef(null)
  const currentImageSrcRef = useRef(null)
  
  
  // New drag system
  const { createDragHandler } = useDragManager()
  
  const championData = tftData?.champions?.[unit.id]
  
  useEffect(() => {
    if (!tftImages || !unit.id || !imageRef.current) return
    
    const loadedImage = tftImages.getImage(unit.id, 'champion')
    
    // Check what's currently in the DOM
    const existingImg = imageRef.current.querySelector('img')
    const currentSrc = existingImg?.src
    const expectedSrc = loadedImage?.src
    
    // Only update if the expected image is different from what's currently displayed
    if (currentSrc === expectedSrc && expectedSrc) {
      return
    }
    
    // Clear and set new content
    imageRef.current.innerHTML = ''
    
    if (loadedImage) {
      // Use the properly loaded and mapped image
      const imgElement = document.createElement('img')
      imgElement.src = loadedImage.src
      imgElement.alt = championData?.name || unit.name || 'Champion'
      imgElement.style.width = '100%'
      imgElement.style.height = '100%'
      imgElement.style.objectFit = 'cover'
      imgElement.style.objectPosition = '75% center' // Show more of the right side where units are
      imgElement.style.borderRadius = '50%' // Make circular
      
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
  }, [unit.id, unit.stars, tftImages?.loadedImagesCount])

  // New simplified drag handler
  const handleDragEnd = (e, dragData) => {
    // New system handles everything automatically
  }

  // Create the drag handler using new system
  const handleMouseDown = (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return
    
    const unitWithIndex = { ...unit, benchIndex: unitIndex }
    
    // Call the drag handler
    const dragHandler = createDragHandler(
      { unit: unitWithIndex, unitIndex, source: 'bench' }, // drag data
      handleDragEnd // end callback
    )
    dragHandler(e)
  }
  
  const stars = unit.stars || 1
  const sizeMultiplier = getStarSizeMultiplier(stars)
  
  return (
    <div 
      className="bench-unit-image"
      ref={dragRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => onUnitHover?.(unit, 'bench', unitIndex)}
      onMouseLeave={() => onUnitHover?.(null)}
      style={{ 
        cursor: 'grab',
        // Invisible padding outside the visual elements (for drag offset fix)
        padding: `${10 / sizeMultiplier}%`,
      }}
    >
      {/* Star Icons - positioned relative to this draggable container */}
      <StarIcon stars={stars} />
      
      <div 
        className={getStarCssClass(stars)}
        ref={imageRef}
        style={{ 
          // Use transform scale to match board unit scaling without affecting layout
          transform: `scale(${sizeMultiplier})`,
          width: '80%', // Base size to match board units better
          height: '80%',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transformOrigin: 'center',
          marginTop: '-40%', // Half of height to center
          marginLeft: '-40%', // Half of width to center
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {/* Show fallback if no image available */}
        {!championData && (
          <div className="text-placeholder">
            {unit.name?.charAt(0) || 'U'}
          </div>
        )}
      </div>
    </div>
  )
}

export default Bench