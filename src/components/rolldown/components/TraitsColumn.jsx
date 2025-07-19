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
    
    // Sort by count descending, then by name
    return traitArray.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
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
  
  const formatBreakpoints = (breakpoints, activeBreakpoint) => {
    if (breakpoints.length === 0) return ''
    return breakpoints.map(bp => bp === activeBreakpoint ? bp : bp).join(' > ')
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
    <div className="traits-column">
      {currentTraits.map((trait, index) => (
        <div
          key={`${trait.name}-${index}`}
          className="bg-black bg-opacity-70 flex flex-row justify-start items-center mb-1 p-1 rounded"
          style={{ 
            width: 'max(12rem, 20cqw)',
            height: 'max(2.5rem, 4cqw)'
          }}
        >
          {/* Trait Icon with Hexagon */}
          <div 
            className={`trait-hexagon ${getHexagonColor(trait.breakpoints, trait.activeBreakpoint)}`}
            style={{
              width: 'max(2.8rem, 4.5cqw)',
              height: 'max(2.8rem, 4.5cqw)'
            }}
          >
            {trait.imageUrl ? (
              <img 
                src={trait.imageUrl}
                alt={trait.name}
                className="trait-image"
              />
            ) : (
              <div 
                className="trait-image bg-gray-600 rounded flex items-center justify-center text-white text-xs font-bold"
              >
                {trait.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          {/* Count Badge */}
          {trait.activeBreakpoint > 0 && (
            <div className="bg-gray-500 bg-opacity-90 border border-white border-opacity-20 text-white text-xs font-bold px-1 py-0.5 rounded ml-1">
              {trait.count}
            </div>
          )}
          
          {/* Trait Info */}
          <div className="flex flex-col justify-center ml-2 flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate" style={{ height: '50%' }}>
              {trait.name}
            </div>
            <div className="text-xs" style={{ height: '50%' }}>
              {trait.breakpoints.map((bp, idx) => (
                <span
                  key={bp}
                  className={bp === trait.activeBreakpoint ? 'text-white' : 'text-gray-400'}
                >
                  {bp}{idx < trait.breakpoints.length - 1 ? ' > ' : ''}
                </span>
              ))}
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