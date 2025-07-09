import React from 'react'

const HexTile = ({ 
  x, 
  y, 
  size = 32, 
  unit = null, 
  isOpponent = false, 
  onClick = () => {} 
}) => {
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
  
  return (
    <g>
      <polygon
        points={points.join(' ')}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        className={`hex-tile ${isOpponent ? 'opponent' : 'player'}`}
        style={{ 
          cursor: isOpponent ? 'default' : 'pointer',
          pointerEvents: isOpponent ? 'none' : 'all'
        }}
        onClick={onClick}
      />
      {unit && (
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fill="white"
          fontWeight="bold"
          style={{ pointerEvents: 'none' }}
        >
          {unit.name.charAt(0)}
        </text>
      )}
    </g>
  )
}

export default HexTile