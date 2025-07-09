import React from 'react'

const BENCH_SLOTS = 9

function Bench({ units = [], onUnitMove }) {
  const renderBenchSlots = () => {
    const slots = []
    
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`bench-${i}`}
          className="bench-slot"
          data-slot={i}
          onClick={() => onUnitMove && onUnitMove(i, null)}
        >
          {unit && (
            <div className="unit-display">
              <div className={`unit-avatar cost-${unit.cost}`}>
                {unit.name?.charAt(0) || 'U'}
              </div>
            </div>
          )}
        </div>
      )
    }
    
    return slots
  }
  
  return (
    <div className="bench-container">
      <div className="bench-slots">
        {renderBenchSlots()}
      </div>
    </div>
  )
}

export default Bench