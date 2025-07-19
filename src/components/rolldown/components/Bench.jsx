import React, { useEffect, useRef } from 'react'
import { useDragManager, useDropZone } from '../hooks/useDragManager'
import dragManager from '../utils/DragManager'
import StarIcon from './StarIcon'
import { getStarSizeMultiplier, getStarCssClass } from '../utils/starringSystem'

const BENCH_SLOTS = 9

function Bench({ units = [], onUnitMove, onUnitSwap, onSell, tftData, tftImages }) {
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
      const BenchSlot = ({ children }) => {
        const { dropZoneRef } = useDropZone(
          createBenchDropHandler(i),
          (dragData) => dragData && dragData.source !== 'shop'
        )
        
        return (
          <div
            ref={dropZoneRef}
            key={`bench-${i}`}
            className="bench-slot"
            data-slot={i}
          >
            {children}
          </div>
        )
      }
      
      slots.push(
        <BenchSlot key={`bench-${i}`}>
          {unit && (
            <BenchUnitDisplay 
              unit={unit}
              unitIndex={i}
              tftData={tftData} 
              tftImages={tftImages}
              onSell={onSell}
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
function BenchUnitDisplay({ unit, unitIndex, tftData, tftImages, onSell }) {
  const imageRef = useRef(null)
  
  // New drag system
  const { createDragHandler } = useDragManager()
  
  const championData = tftData?.champions?.[unit.id]
  
  useEffect(() => {
    if (tftImages && unit.id && imageRef.current) {
      // Clear previous content
      imageRef.current.innerHTML = ''
      
      // Get the loaded image from tftImages (which applies mappings)
      const loadedImage = tftImages.getImage(unit.id, 'champion')
      const stars = unit.stars || 1
      const sizeMultiplier = getStarSizeMultiplier(stars)
      
      if (loadedImage) {
        // Use the properly loaded and mapped image
        const imgElement = document.createElement('img')
        imgElement.src = loadedImage.src
        imgElement.alt = championData?.name || unit.name || 'Champion'
        const baseSize = 80 // Base size from commit 236b516 (80% to leave room for star growth)
        const finalSize = baseSize * sizeMultiplier
        imgElement.style.width = `${finalSize}%`
        imgElement.style.height = `${finalSize}%`
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
    }
  }, [unit.id, tftImages, championData, unit.stars])

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
    <>
      {/* Star Icons - positioned relative to bench slot */}
      <StarIcon stars={stars} />
      
      <div 
        className={`bench-unit-image ${getStarCssClass(stars)}`}
        ref={imageRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: 'grab' }}
      >
        {/* Show fallback if no image available */}
        {!championData && (
          <div className="text-placeholder">
            {unit.name?.charAt(0) || 'U'}
          </div>
        )}
      </div>
    </>
  )
}

export default Bench