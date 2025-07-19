import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { generateDirectImageUrl } from '../utils/imageLoader'

function TraitsColumn({ boardUnits, tftData }) {
  const [currentPage, setCurrentPage] = useState(0)
  
  // Calculate traits from board units
  const traits = useMemo(() => {
    if (!tftData || !boardUnits || boardUnits.length === 0) {
      return []
    }
    
    const traitCounts = {}
    
    // Count traits from all board units
    boardUnits.forEach(unit => {
      if (unit && unit.id && tftData.champions[unit.id]) {
        const champion = tftData.champions[unit.id]
        if (champion.traits) {
          champion.traits.forEach(traitName => {
            traitCounts[traitName] = (traitCounts[traitName] || 0) + 1
          })
        }
      }
    })
    
    // Convert to array and add trait data
    const traitArray = Object.entries(traitCounts).map(([traitName, count]) => {
      const traitData = tftData.traits ? Object.values(tftData.traits).find(t => t.name === traitName) : null
      
      // Get breakpoints from trait data
      let breakpoints = []
      let activeBreakpoint = 0
      
      if (traitData && traitData.breakpoints) {
        breakpoints = traitData.breakpoints.map(bp => bp.minUnits).sort((a, b) => a - b)
        // Find the highest breakpoint that the current count meets
        for (let i = breakpoints.length - 1; i >= 0; i--) {
          if (count >= breakpoints[i]) {
            activeBreakpoint = breakpoints[i]
            break
          }
        }
      }
      
      // Generate proper image URL using the mapping system
      let imageUrl = null
      if (traitData && traitData.id) {
        // Use the trait's API name (traitData.id) for proper mapping
        imageUrl = generateDirectImageUrl(tftData.version || '15.13.1', traitData.id, 'trait')
      } else {
        // Fallback: try to construct trait ID from name
        const traitId = `TFT14_${traitName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}`
        imageUrl = generateDirectImageUrl(tftData.version || '15.13.1', traitId, 'trait')
      }
      
      return {
        name: traitName,
        count,
        breakpoints,
        activeBreakpoint,
        traitData,
        imageUrl
      }
    })
    
    // Sort by active status first (active traits before inactive), then by count descending, then by name
    return traitArray.sort((a, b) => {
      // First priority: active traits before inactive traits
      const aActive = a.activeBreakpoint > 0
      const bActive = b.activeBreakpoint > 0
      
      if (aActive !== bActive) {
        return bActive - aActive // true (1) comes before false (0)
      }
      
      // Second priority: count descending
      if (b.count !== a.count) return b.count - a.count
      
      // Third priority: name alphabetically
      return a.name.localeCompare(b.name)
    })
  }, [boardUnits, tftData])
  
  const traitsPerPage = 10
  const totalPages = Math.ceil(traits.length / traitsPerPage)
  const startIndex = currentPage * traitsPerPage
  const endIndex = Math.min(startIndex + traitsPerPage, traits.length)
  const currentTraits = traits.slice(startIndex, endIndex)
  
  const goToNextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages)
  }
  
  const goToPrevPage = () => {
    setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages)
  }
  
  const formatBreakpoints = (breakpoints, activeBreakpoint, currentCount) => {
    if (breakpoints.length === 0) return ''
    
    // If trait is not active, show "current/first" format (e.g., "1/2")
    if (!activeBreakpoint || activeBreakpoint === 0) {
      const firstBreakpoint = breakpoints[0] || 0
      return (
        <span className="text-gray-600">
          {currentCount}/{firstBreakpoint}
        </span>
      )
    }
    
    // If trait is active, show full breakpoint sequence
    return breakpoints.map((bp, index) => (
      <span key={bp}>
        <span className={bp === activeBreakpoint ? 'text-white' : 'text-gray-600'}>
          {bp}
        </span>
        {index < breakpoints.length - 1 && <span className="text-gray-600"> > </span>}
      </span>
    ))
  }
  
  const getHexagonColor = (breakpoints, activeBreakpoint) => {
    // Non-activated traits get inactive styling
    if (!activeBreakpoint || breakpoints.length === 0) return 'inactive'
    
    // First breakpoint is always bronze
    if (activeBreakpoint === breakpoints[0]) return 'bronze'
    
    // Gold when breakpoint requires 5 or more units
    if (activeBreakpoint >= 5) return 'gold'
    
    // Silver for everything else
    return 'silver'
  }
  
  return (
    <div className="traits-column flex flex-col items-start">
      {currentTraits.map((trait, index) => (
        <div
          key={`${trait.name}-${index}`}
          className="bg-black bg-opacity-70 flex flex-row justify-start items-center mb-1 rounded w-fit"
          style={{ 
            minWidth: 'max(5rem, 10cqw)',
            height: 'max(1.85rem, 2.9cqw)',
            gap: trait.activeBreakpoint > 0 ? 'max(0.4rem, 0.66cqw)' : 'max(0.66rem, 1cqw)',      
            padding: 'max(0.0rem, 0.0cqw) max(1rem, 1.66cqw) max(0.1rem, 0.2cqw) 0'
          }}
        >
          {/* Trait Icon with Hexagon */}
          <div 
            className={`trait-hexagon ${getHexagonColor(trait.breakpoints, trait.activeBreakpoint)}`}
            style={{
              width: 'max(1.75rem, 2.8125cqw)',
              height: 'max(1.75rem, 2.8125cqw)',
              marginLeft: 'max(-0.875rem, -1.40625cqw)',
              flexShrink: 0
            }}
          >
            {trait.imageUrl ? (
              <img 
                src={trait.imageUrl}
                alt={trait.name}
                className="trait-image"
                style={{
                  filter: trait.activeBreakpoint > 0 ? 'brightness(0)' : 'brightness(0.6)'
                }}
              />
            ) : (
              <div 
                className={`trait-image bg-gray-600 rounded flex items-center justify-center text-xs font-bold ${
                  trait.activeBreakpoint > 0 ? 'text-black' : 'text-gray-600'
                }`}
              >
                {trait.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Count Badge */}
          {trait.activeBreakpoint > 0 && (
            <div className="bg-gray-500 bg-opacity-90 border border-white border-opacity-20 text-white text-xs font-bold px-1 py-0.5 rounded" style={{ flexShrink: 0 }}>
              {trait.count}
            </div>
          )}
          
          {/* Trait Info */}
          <div className="flex flex-col justify-start" style={{ height: '90%', flexShrink: 0 }}>
            <div 
              className={`font-semibold leading-tight whitespace-nowrap ${
                trait.activeBreakpoint > 0 ? 'text-white' : 'text-gray-600'
              }`} 
              style={{ 
                height: '45%',
                fontSize: '0.7rem'
              }}
            >
              {trait.name}
            </div>
            <div 
              className="leading-tight whitespace-nowrap"
              style={{ 
                height: '45%',
                fontSize: '0.6rem',
                flexShrink: 0
              }}
            >
              {formatBreakpoints(trait.breakpoints, trait.activeBreakpoint, trait.count)}
            </div>
          </div>
        </div>
      ))}
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-1">
          <button
            onClick={goToPrevPage}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded flex items-center justify-center transition-all"
            style={{ 
              width: 'max(12rem, 20cqw)',
              height: 'max(2rem, 3cqw)'
            }}
          >
            <ChevronUp size={16} className="mr-1" />
            Previous
          </button>
          <button
            onClick={goToNextPage}
            className="bg-black bg-opacity-70 hover:bg-opacity-90 text-white p-2 rounded flex items-center justify-center transition-all"
            style={{ 
              width: 'max(12rem, 20cqw)',
              height: 'max(2rem, 3cqw)'
            }}
          >
            <ChevronDown size={16} className="mr-1" />
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default TraitsColumn