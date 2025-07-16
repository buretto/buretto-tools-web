import React from 'react'

const BENCH_SLOTS = 9

function OpponentBench({ units = [], label = "Opponent Bench" }) {
  const renderOpponentBenchSlots = () => {
    const slots = []
    
    for (let i = 0; i < BENCH_SLOTS; i++) {
      const unit = units[i]
      
      slots.push(
        <div
          key={`opponent-bench-${i}`}
          className="opponent-bench-slot"
          data-slot={i}
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
    <div className="opponent-bench-container">
      <div className="bench-slots">
        {renderOpponentBenchSlots()}
      </div>
    </div>
  )
}

export default OpponentBench