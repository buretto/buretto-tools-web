import React, { useEffect, useRef } from 'react'
import { useDragManager, useDropZone } from '../hooks/useDragManager'
import dragManager from '../utils/DragManager'

const HexTile = ({ 
  x, 
  y, 
  size = 32, 
  unit = null, 
  isOpponent = false,
  row,
  col,
  tftData,
  tftImages,
  onUnitMove,
  onUnitSwap,
  onSell,
  onClick = () => {} 
}) => {
  const imageRef = useRef(null)
  const polygonRef = useRef(null)
  
  // New drag system
  const { createDragHandler } = useDragManager()
  
  // Drop zone for this hex tile using new system
  const { dropZoneRef } = useDropZone(
    (e, dragData) => {
      if (!dragData || isOpponent) return
      
      const currentDraggedUnit = dragData.unit
      const currentDragSource = dragData.source
      
      if (unit) {
        // Swap units
        if (currentDragSource === 'bench') {
          onUnitSwap?.(currentDraggedUnit, 'bench', currentDraggedUnit.benchIndex, null, null, unit, 'board', null, row, col)
        } else if (currentDragSource === 'board') {
          onUnitSwap?.(currentDraggedUnit, 'board', null, currentDraggedUnit.row, currentDraggedUnit.col, unit, 'board', null, row, col)
        }
      } else {
        // Move to empty space
        if (currentDragSource === 'bench') {
          onUnitMove?.(currentDraggedUnit, 'bench', currentDraggedUnit.benchIndex, 'board', null, row, col)
        } else if (currentDragSource === 'board') {
          onUnitMove?.(currentDraggedUnit, 'board', null, 'board', null, row, col)
        }
      }
    },
    (dragData) => {
      // Can drop if not on opponent tile and drag is not from shop
      return !isOpponent && dragData && dragData.source !== 'shop'
    }
  )
  // Calculate hexagon points for pointy-top orientation (90 degrees rotated)
  const points = []
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 2  // Add 90 degrees rotation
    const px = x + size * Math.cos(angle)
    const py = y + size * Math.sin(angle)
    points.push(`${px},${py}`)
  }
  
  // Color scheme based on board type
  const fillColor = isOpponent 
    ? (unit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.1)')
    : (unit ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.1)')
  
  const strokeColor = isOpponent ? '#EF4444' : '#6087c7ff'

  // Load unit image
  useEffect(() => {
    if (unit && tftImages && unit.id && imageRef.current) {
      imageRef.current.innerHTML = ''
      
      const loadedImage = tftImages.getImage(unit.id, 'champion')
      
      if (loadedImage) {
        const imgElement = document.createElement('img')
        imgElement.src = loadedImage.src
        imgElement.alt = unit.name || 'Champion'
        imgElement.style.width = `${size * 1.12}px`
        imgElement.style.height = `${size * 1.12}px`
        imgElement.style.objectFit = 'cover'
        imgElement.style.objectPosition = '75% center' // Show more of the right side where units are
        imgElement.style.borderRadius = '50%'
        imgElement.style.pointerEvents = 'none'
        
        imageRef.current.appendChild(imgElement)
      }
    }
  }, [unit, tftImages, size])


  // New simplified drag handler
  const handleUnitDragEnd = (e, dragData) => {
    // New system handles everything automatically
  }

  // Create the drag handler using new system
  const handleUnitMouseDown = (e) => {
    if (isOpponent) return
    // Only handle left mouse button
    if (e.button !== 0) return
    
    const unitWithPosition = { ...unit, row, col }
    
    // Call the drag handler
    const dragHandler = createDragHandler(
      { unit: unitWithPosition, source: 'board' }, // drag data
      handleUnitDragEnd // end callback
    )
    dragHandler(e)
  }
  
  return (
    <g ref={dropZoneRef}>
      <polygon
        ref={polygonRef}
        points={points.join(' ')}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        className={`hex-tile ${isOpponent ? 'opponent' : 'player'}`}
        style={{ 
          cursor: unit && !isOpponent ? 'grab' : 'default',
          pointerEvents: isOpponent ? 'none' : 'all'
        }}
        onClick={onClick}
        onMouseDown={!unit && !isOpponent ? onClick : undefined}
      />
      
      {unit && (
        <foreignObject
          x={x - size}
          y={y - size}
          width={size * 2}
          height={size * 2}
          style={{ pointerEvents: isOpponent ? 'none' : 'auto' }}
        >
          <div 
            className="hex-unit-container"
            onMouseEnter={(e) => {
              if (!isOpponent && polygonRef.current) {
                // Check if we're in a drag operation
                const isDragging = document.body.classList.contains('dragging-active')
                
                if (isDragging) {
                  // Apply drag hover effect manually
                  if (polygonRef.current.classList.contains('drop-zone')) {
                    polygonRef.current.classList.add('hovered')
                  }
                } else {
                  // Apply regular hover effect manually
                  polygonRef.current.style.stroke = '#60A5FA'
                  polygonRef.current.style.strokeWidth = '3'
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!isOpponent && polygonRef.current) {
                // Check if we're in a drag operation
                const isDragging = document.body.classList.contains('dragging-active')
                
                if (isDragging) {
                  // Remove drag hover effect
                  polygonRef.current.classList.remove('hovered')
                } else {
                  // Remove regular hover effect
                  polygonRef.current.style.stroke = strokeColor
                  polygonRef.current.style.strokeWidth = '2'
                }
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            <div 
              ref={imageRef}
              className="hex-unit-display"
              data-row={row}
              data-col={col}
              onMouseDown={handleUnitMouseDown}
              style={{
                width: '56%', // Equivalent to original size * 1.12 / (size * 2) 
                height: '56%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                cursor: !isOpponent ? 'grab' : 'default',
                position: 'relative'
              }}
            >
              {/* Fallback text */}
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none' }}>
                {unit.name?.charAt(0) || 'U'}
              </span>
            </div>
          </div>
        </foreignObject>
      )}
    </g>
  )
}

export default HexTile