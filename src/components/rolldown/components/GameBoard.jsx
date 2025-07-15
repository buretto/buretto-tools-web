import React from 'react'
import HexTile from './HexTile'

const BOARD_ROWS = 4
const BOARD_COLS = 7

function GameBoard({ units, opponentUnits = [], tftData, tftImages, onUnitMove, onUnitSwap, onSell }) {
  // Base hex size calculation without multiplier for consistent viewBox
  const availableHeight = window.innerHeight * 0.612 // 61.2% for game-board-area
  const availableWidth = window.innerWidth * 0.5 // 50% for game-board width
  const baseHexSize = Math.min(availableWidth / 18, availableHeight / 14)
  
  // Adjustable multiplier for actual hex tile size
  const hexSizeMultiplier = 1.075 // Change this to scale hex tiles
  const hexSize = baseHexSize * hexSizeMultiplier
  
  const HEX_WIDTH = hexSize * 2
  const HEX_HEIGHT = hexSize * Math.sqrt(3)
  
  // Use base size for viewBox calculations to keep coordinate system stable
  const BASE_HEX_WIDTH = baseHexSize * 2
  const BASE_HEX_HEIGHT = baseHexSize * Math.sqrt(3)
  const BOARD_WIDTH = BASE_HEX_WIDTH * BOARD_COLS * 0.88 + baseHexSize * 1.5
  const BOARD_HEIGHT = BASE_HEX_HEIGHT * BOARD_ROWS * 0.88 + BASE_HEX_HEIGHT * 0.5
  const TOTAL_HEIGHT = BOARD_HEIGHT * 2 + baseHexSize * 0.15
  
  const renderHexGrid = (isOpponent = false) => {
    const tiles = []
    const yOffset = isOpponent ? hexSize * Math.sqrt(3) * 0.3 : BOARD_HEIGHT + hexSize * 0.25  // Scale board gap with tile size
    
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        // Calculate hex position using scaled size for proportional spacing
        const x = col * HEX_WIDTH * 0.88 + hexSize * 1.25  // Grid scales with tile size
        const y = row * HEX_HEIGHT * 0.88 + hexSize * 0.65 + yOffset  // Grid scales with tile size
        
        // Offset every other row for hexagonal tessellation
        const offsetX = (row % 2 === 0) ? 0 : HEX_WIDTH * 0.44
        
        const unit = isOpponent 
          ? opponentUnits.find(u => u.row === row && u.col === col) 
          : units.find(u => u.row === row && u.col === col)
        
        tiles.push(
          <HexTile
            key={`${isOpponent ? 'opp' : 'player'}-${row}-${col}`}
            x={x + offsetX}
            y={y}
            size={hexSize}
            unit={unit}
            row={row}
            col={col}
            isOpponent={isOpponent}
            tftData={tftData}
            tftImages={tftImages}
            onUnitMove={!isOpponent ? onUnitMove : undefined}
            onUnitSwap={!isOpponent ? onUnitSwap : undefined}
            onSell={!isOpponent ? onSell : undefined}
            onClick={() => !isOpponent && onUnitMove && onUnitMove(row, col)}
          />
        )
      }
    }
    
    return tiles
  }
  
  return (
    <div className="game-board bg-transparent flex justify-center items-center w-full h-full">
      <div 
        style={{ position: 'relative', width: '100%', height: '100%' }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={(e) => {
          e.preventDefault()
        }}
      >
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
    </div>
  )
}

export default GameBoard