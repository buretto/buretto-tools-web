import React from 'react'
import { Shield, Swords, Sparkles, Heart, Zap, Star } from 'lucide-react'

function TraitsColumn({ boardUnits }) {
  // Mock trait data - this will be calculated from board units
  const traits = [
    { name: 'Warrior', count: 2, threshold: 3, color: 'text-red-400', icon: Swords },
    { name: 'Mage', count: 3, threshold: 3, color: 'text-blue-400', icon: Sparkles },
    { name: 'Guardian', count: 1, threshold: 2, color: 'text-green-400', icon: Shield },
  ]
  
  const getTraitStyle = (count, threshold) => {
    if (count >= threshold) return 'bg-yellow-600 text-black'
    if (count === threshold - 1) return 'bg-gray-600 text-yellow-400'
    return 'bg-gray-800 text-gray-400'
  }
  
  return (
    <div className="traits-column">
      {traits.map((trait, index) => {
        const IconComponent = trait.icon
        return (
          <div
            key={index}
            className={`trait-item rounded-lg border-2 transition-all ${getTraitStyle(trait.count, trait.threshold)}`}
            style={{ 
              width: 'max(1.8rem, 3.36vw)',
              marginBottom: 'max(0.18rem, 0.336vw)',
              padding: 'max(0.18rem, 0.336vw)' /* 20% bigger overall */
            }}
          >
            <div className="flex flex-col items-center">
              <IconComponent 
                style={{ 
                  width: 'max(10.8px, 1.68vw)', 
                  height: 'max(10.8px, 1.68vw)',
                  marginBottom: 'max(0.12rem, 0.21vw)'
                }} 
              />
              <div className="responsive-header-text-xs font-bold">
                {trait.count}/{trait.threshold}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TraitsColumn