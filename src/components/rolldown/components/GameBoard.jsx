import React, { useEffect, useState } from 'react'
import HexTile from './HexTile'

const BOARD_ROWS = 4
const BOARD_COLS = 7

function GameBoard({ units, onUnitMove }) {
  const [hexSize, setHexSize] = useState(107) // Default fallback
  
  // Read hex size from CSS custom property
  useEffect(() => {
    const updateHexSize = () => {
      const baseUnit = parseFloat(
        getComputedStyle(document.documentElement)
          .getPropertyValue('--base-unit')
          .replace('px', '')
      ) || 107 // Fallback to default
      
      setHexSize(baseUnit)
    }
    
    updateHexSize()
    // Listen for changes to the CSS custom property
    const observer = new MutationObserver(updateHexSize)
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['style'] 
    })
    
    return () => observer.disconnect()
  }, [])
  
  const HEX_WIDTH = hexSize * 2
  const HEX_HEIGHT = hexSize * Math.sqrt(3)
  
  // Calculate board dimensions with proper padding for current spacing (0.88/0.44)
  const BOARD_WIDTH = HEX_WIDTH * BOARD_COLS * 0.88 + hexSize * 1.5  // Reduced padding for better fit
  const BOARD_HEIGHT = HEX_HEIGHT * BOARD_ROWS * 0.88 + HEX_HEIGHT * 0.5  // Reduced padding for better fit
  const TOTAL_HEIGHT = BOARD_HEIGHT * 2 + hexSize * 0.5  // Reduced gap between boards
  
  const renderHexGrid = (isOpponent = false) => {
    const tiles = []
    const yOffset = isOpponent ? 0 : BOARD_HEIGHT + hexSize * 0.25  // Account for reduced gap
    
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        // Calculate hex position with proper tessellation and spacing
        const x = col * HEX_WIDTH * 0.88 + hexSize * 1.25  // Optimized spacing for better fit
        const y = row * HEX_HEIGHT * 0.88 + hexSize * 1.25 + yOffset  // Increased Y offset to center tiles properly
        
        // Offset every other row for hexagonal tessellation
        const offsetX = (row % 2 === 0) ? 0 : HEX_WIDTH * 0.44
        
        const unit = units.find(u => u.row === row && u.col === col)
        
        tiles.push(
          <HexTile
            key={`${isOpponent ? 'opp' : 'player'}-${row}-${col}`}
            x={x + offsetX}
            y={y}
            size={hexSize}
            unit={unit}
            isOpponent={isOpponent}
            onClick={() => !isOpponent && onUnitMove && onUnitMove(row, col)}
          />
        )
      }
    }
    
    return tiles
  }
  
  return (
    <div className="game-board bg-transparent flex justify-center items-center w-full h-full">
      <svg 
        viewBox={`0 0 ${BOARD_WIDTH} ${TOTAL_HEIGHT}`}
        className="hex-game-board"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%' }}
      >
        {/* Opponent Board */}
        {renderHexGrid(true)}
        
        {/* Player Board */}
        {renderHexGrid(false)}
      </svg>
    </div>
  )
}

export default GameBoard