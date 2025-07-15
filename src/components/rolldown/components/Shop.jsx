import React, { useEffect, useRef } from 'react'

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
  
  useEffect(() => {
    if (tftData?.champions?.[unit.id]?.imageUrl && imageRef.current) {
      // Clear previous content
      imageRef.current.innerHTML = ''
      
      // Create image element with direct URL
      const imgElement = document.createElement('img')
      imgElement.src = tftData.champions[unit.id].imageUrl
      imgElement.alt = tftData.champions[unit.id].name || unit.name || 'Champion'
      imgElement.style.width = '100%'
      imgElement.style.height = '100%'
      imgElement.style.objectFit = 'cover'
      
      // Handle image load errors
      imgElement.onerror = () => {
        imageRef.current.innerHTML = `<div class="error-placeholder">!</div>`
      }
      
      imageRef.current.appendChild(imgElement)
    }
  }, [unit.id, tftData])
  
  const championData = tftData?.champions?.[unit.id]
  
  return (
    <div className="unit-display">
      <div className={`unit-avatar cost-${unit.cost}`} ref={imageRef}>
        {/* Show fallback if no image URL available */}
        {!championData?.imageUrl && (
          <div className="text-placeholder">
            {championData?.name?.charAt(0) || unit.name?.charAt(0) || 'U'}
          </div>
        )}
      </div>
      <div className="unit-cost">
        {unit.cost}g
      </div>
    </div>
  )
}

export default Shop