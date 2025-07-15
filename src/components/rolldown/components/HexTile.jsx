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
    startDrag(unitWithPosition, 'board', null, e.currentTarget)
    
    // Calculate grab point relative to element
    const rect = e.currentTarget.getBoundingClientRect()
    const grabX = e.clientX - rect.left
    const grabY = e.clientY - rect.top
    
    // Try to use the actual unit image if available
    const loadedImage = tftImages?.getImage(unit.id, 'champion')
    
    if (loadedImage) {
      // Create drag image with actual unit image
      const dragImage = document.createElement('div')
      dragImage.style.width = '50px'
      dragImage.style.height = '50px'
      dragImage.style.borderRadius = '50%'
      dragImage.style.backgroundColor = 'rgba(0,0,0,0.7)'
      dragImage.style.border = '2px solid #fff'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.pointerEvents = 'none'
      dragImage.style.overflow = 'hidden'
      
      const img = document.createElement('img')
      img.src = loadedImage.src
      img.style.width = '100%'
      img.style.height = '100%'
      img.style.objectFit = 'cover'
      img.style.borderRadius = '50%'
      
      dragImage.appendChild(img)
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, grabX, grabY)
      
      setTimeout(() => {
        document.body.removeChild(dragImage)
      }, 0)
    } else {
      // Fallback to text-based drag image
      const dragImage = document.createElement('div')
      dragImage.style.width = '50px'
      dragImage.style.height = '50px'
      dragImage.style.borderRadius = '50%'
      dragImage.style.backgroundColor = 'rgba(0,0,0,0.8)'
      dragImage.style.border = '2px solid #fff'
      dragImage.style.display = 'flex'
      dragImage.style.alignItems = 'center'
      dragImage.style.justifyContent = 'center'
      dragImage.style.color = 'white'
      dragImage.style.fontSize = '14px'
      dragImage.style.fontWeight = 'bold'
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.pointerEvents = 'none'
      dragImage.textContent = unit.name?.charAt(0) || 'U'
      
      document.body.appendChild(dragImage)
      e.dataTransfer.setDragImage(dragImage, grabX, grabY)
      
      setTimeout(() => {
        document.body.removeChild(dragImage)
      }, 0)
    }
    
    // Hide the original element during drag
    e.currentTarget.style.opacity = '0'
  }

  const handleUnitDragEnd = (e) => {
    // Restore original element opacity
    e.currentTarget.style.opacity = '1'
    
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