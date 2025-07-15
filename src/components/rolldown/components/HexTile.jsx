import React, { useEffect, useRef } from 'react'
import { useDrag } from '../contexts/DragContext'

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
  const { isDragging, draggedUnit, dragSource, startDrag, endDrag } = useDrag()
  const imageRef = useRef(null)
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
  
  const strokeColor = isOpponent ? '#EF4444' : '#3B82F6'

  // Load unit image
  useEffect(() => {
    if (unit && tftImages && unit.id && imageRef.current) {
      imageRef.current.innerHTML = ''
      
      const loadedImage = tftImages.getImage(unit.id, 'champion')
      
      if (loadedImage) {
        const imgElement = document.createElement('img')
        imgElement.src = loadedImage.src
        imgElement.alt = unit.name || 'Champion'
        imgElement.style.width = `${size * 1.6}px`
        imgElement.style.height = `${size * 1.6}px`
        imgElement.style.objectFit = 'cover'
        imgElement.style.borderRadius = '50%'
        imgElement.style.pointerEvents = 'none'
        
        imageRef.current.appendChild(imgElement)
      }
    }
  }, [unit, tftImages, size])

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedUnit || !dragSource || isOpponent) {
      return
    }
    
    // Store drag data locally before clearing it
    const currentDraggedUnit = draggedUnit
    const currentDragSource = dragSource
    
    // Reset drag state immediately to make overlay disappear
    endDrag()
    
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
  }

  const handleUnitDragStart = (e) => {
    if (isOpponent) return
    
    const unitWithPosition = { ...unit, row, col }
    startDrag(unitWithPosition, 'board', null)
    
    // Create transparent drag image
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    const ctx = canvas.getContext('2d')
    ctx.globalAlpha = 0.01
    e.dataTransfer.setDragImage(canvas, 0, 0)
  }

  const handleUnitDragEnd = (e) => {
    // End drag immediately for instant response
    endDrag()
  }
  
  return (
    <g>
      <polygon
        points={points.join(' ')}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        className={`hex-tile ${isOpponent ? 'opponent' : 'player'} ${isDragging && dragSource !== 'shop' && !isOpponent ? 'drop-zone' : ''}`}
        style={{ 
          cursor: isOpponent ? 'default' : 'pointer',
          pointerEvents: isOpponent ? 'none' : 'all'
        }}
        onClick={onClick}
        onDragOver={(e) => {
          if (!isOpponent && isDragging && dragSource !== 'shop') {
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onDrop={(e) => {
          if (!isOpponent && isDragging && dragSource !== 'shop') {
            e.preventDefault()
            e.stopPropagation()
            handleDrop(e)
          }
        }}
      />
      
      
      {unit && (
        <g>
          {/* Unit image container */}
          <foreignObject
            x={x - size * 0.8}
            y={y - size * 0.8}
            width={size * 1.6}
            height={size * 1.6}
          >
            <div 
              ref={imageRef}
              draggable={!isOpponent}
              onDragStart={handleUnitDragStart}
              onDragEnd={handleUnitDragEnd}
              onDragOver={(e) => {
                if (!isOpponent && isDragging && dragSource !== 'shop') {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'move'
                }
              }}
              onDrop={(e) => {
                if (!isOpponent && isDragging && dragSource !== 'shop') {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDrop(e)
                }
              }}
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '50%',
                border: '2px solid #fff',
                cursor: !isOpponent ? 'grab' : 'default',
                pointerEvents: isOpponent ? 'none' : 'auto',
                position: 'relative',
                zIndex: 10
              }}
            >
              {/* Fallback text */}
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold', pointerEvents: 'none' }}>
                {unit.name?.charAt(0) || 'U'}
              </span>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  )
}

export default HexTile