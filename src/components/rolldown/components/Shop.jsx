import React, { useEffect, useRef } from 'react'
import { Coins } from 'lucide-react'

const SHOP_SLOTS = 5

function Shop({ units = [], playerGold = 0, tftData, tftImages, onPurchase }) {
  
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
  
  const renderShopSlots = () => {
    const slots = []
    
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`shop-${i}`}
          className="shop-slot"
          data-slot={i}
          onClick={() => unit && onPurchase && onPurchase(unit, i)}
        >
          {unit ? (
            <ShopUnitDisplay 
              unit={unit} 
              tftData={tftData} 
              tftImages={tftImages} 
            />
          ) : (
            <div className="empty-slot"></div>
          )}
        </div>
      )
    }
    
    return slots
  }
  
  return (
    <div className="shop-container">
      <div className="shop-slots">
        {renderShopSlots()}
      </div>
    </div>
  )
}

/**
 * Component for displaying a unit in the shop
 */
function ShopUnitDisplay({ unit, tftData, tftImages }) {
  const imageRef = useRef(null)
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
  
  return (
    <div className="unit-display">
      <div className={`unit-avatar`} ref={imageRef}>
        {/* Show fallback if no image URL available */}
        {!championData?.imageUrl && (
          <div className="text-placeholder">
            {championData?.name?.charAt(0) || unit.name?.charAt(0) || 'U'}
          </div>
        )}
      </div>
      <div className={`unit-bottom-header cost-${unit.cost}`}>
        <span className="unit-name">
          {championData?.name || unit.name || 'Unknown'}
        </span>
        <div className="unit-cost-container">
          <Coins className="unit-cost-icon" />
          <span className="unit-cost">
            {unit.cost}
          </span>
        </div>
      </div>
    </div>
  )
}

export default Shop