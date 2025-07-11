import React from 'react'

const SHOP_SLOTS = 5

function Shop({ units = [], playerGold = 0, onPurchase }) {
  
  const renderShopSlots = () => {
    const slots = []
    
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`shop-${i}`}
          className="shop-slot"
          data-slot={i}
          onClick={() => unit && onPurchase && onPurchase(unit)}
        >
          {unit ? (
            <div className="unit-display">
              <div className={`unit-avatar cost-${unit.cost}`}>
                {unit.name?.charAt(0) || 'U'}
              </div>
              <div className="unit-cost">
                {unit.cost}g
              </div>
            </div>
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

export default Shop