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
    console.log('🎯 Bench DROP EVENT:', { benchIndex, draggedUnit: draggedUnit?.name, dragSource })
    
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
        console.log('🔄 Bench->Bench swap')
        onUnitSwap?.(currentDraggedUnit, 'bench', currentDraggedUnit.benchIndex, null, null, existingUnit, 'bench', benchIndex, null, null)
      } else {
        console.log('🚀 Bench->Bench move')
        onUnitMove?.(currentDraggedUnit, 'bench', currentDraggedUnit.benchIndex, 'bench', benchIndex, null, null)
      }
    } else if (currentDragSource === 'board') {
      // Moving from board to bench
      if (existingUnit) {
        console.log('🔄 Board->Bench swap')
        onUnitSwap?.(currentDraggedUnit, 'board', null, currentDraggedUnit.row, currentDraggedUnit.col, existingUnit, 'bench', benchIndex, null, null)
      } else {
        console.log('🚀 Board->Bench move')
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
    startDrag(unitWithIndex, 'bench', unitIndex)
    
    // Create transparent drag image
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.globalAlpha = 0.01
    e.dataTransfer.setDragImage(canvas, 0, 0)
  }

  const handleDragEnd = (e) => {
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