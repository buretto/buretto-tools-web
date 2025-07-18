import React from 'react'
import { getStarIconData } from '../utils/starringSystem'

/**
 * Component to render star icons for units
 */
function StarIcon({ stars = 1 }) {
  const starData = getStarIconData(stars)
  
  if (!starData.show) {
    return null
  }
  
  const getColorClass = (color) => {
    switch (color) {
      case '#C0C0C0': return 'silver'
      case '#FFD700': return 'gold'
      case '#9ACD32': return 'platinum-green' // Platinum green color
      default: return 'silver'
    }
  }
  
  const colorClass = getColorClass(starData.color)
  
  return (
    <div className="star-icon-container">
      {Array.from({ length: starData.count }, (_, index) => (
        <div 
          key={index}
          className={`star-icon ${starData.shape} ${colorClass}`}
        />
      ))}
    </div>
  )
}

export default StarIcon