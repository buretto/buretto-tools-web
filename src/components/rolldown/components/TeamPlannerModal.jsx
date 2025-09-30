import React, { useState, useEffect, useRef } from 'react'
import { X, RotateCcw, Camera, Clipboard, Minus, Star, HelpCircle, ChevronUp, ChevronLeft } from 'lucide-react'
import { generateDirectImageUrl } from '../utils/imageLoader'
import { parseTeamcode, isValidTeamcodeFormat } from '../utils/teamcodeParser'

// Component for displaying unit images following the same pattern as Shop
function UnitImage({ unit, tftData, tftImages }) {
  const imageRef = useRef(null)
  const championData = tftData?.champions?.[unit.id]

  useEffect(() => {
    if (!tftImages || !unit.id || !imageRef.current) return
    
    const loadedImage = tftImages.getImage(unit.id, 'champion')
    
    // Check what's currently in the DOM
    const existingImg = imageRef.current.querySelector('img')
    const currentSrc = existingImg?.src
    const expectedSrc = loadedImage?.src
    
    // Only update if the expected image is different from what's currently displayed
    if (currentSrc === expectedSrc && expectedSrc) {
      return
    }
    
    // Clear and set new content
    imageRef.current.innerHTML = ''
    
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
  }, [unit.id, tftImages?.loadedImagesCount, championData, tftImages])

  return <div ref={imageRef} className="unit-image" />
}

function TeamPlannerModal({ isOpen, onClose, tftData, tftImages, version, teamSlots, setTeamSlots }) {
  // Use teamSlots from props instead of local state
  // Fallback to local state if not provided (for backward compatibility)
  const [localTeamSlots, setLocalTeamSlots] = useState(new Array(10).fill(null))
  const currentTeamSlots = teamSlots || localTeamSlots
  const currentSetTeamSlots = setTeamSlots || setLocalTeamSlots
  const [unitsByTier, setUnitsByTier] = useState({})
  const [helpOpen, setHelpOpen] = useState(false)
  const [currentTraitPage, setCurrentTraitPage] = useState(0)

  // Clear team planner when version changes (switching sets)
  useEffect(() => {
    if (version && currentSetTeamSlots) {
      console.log(`🗑️ Clearing team planner for version change: ${version}`)
      currentSetTeamSlots(new Array(10).fill(null))
    }
  }, [version, currentSetTeamSlots])

  // Initialize units by tier when tftData is available
  useEffect(() => {
    if (tftData && tftData.champions) {
      const unitGroups = {}
      
      Object.values(tftData.champions).forEach(champion => {
        const tier = champion.cost || 1
        if (!unitGroups[tier]) {
          unitGroups[tier] = []
        }
        unitGroups[tier].push(champion)
      })

      // Sort units within each tier by name
      Object.keys(unitGroups).forEach(tier => {
        unitGroups[tier].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      })

      setUnitsByTier(unitGroups)
    }
  }, [tftData])

  // Load images for visible units
  useEffect(() => {
    if (tftImages && Object.keys(unitsByTier).length > 0) {
      Object.values(unitsByTier).flat().forEach(unit => {
        if (unit && unit.id) {
          tftImages.loadImage(unit.id, 'champion')
        }
      })
    }
  }, [unitsByTier, tftImages])

  if (!isOpen) return null

  const handleClearAll = () => {
    currentSetTeamSlots(new Array(10).fill(null))
  }

  const handleSnapshot = () => {
    // TODO: Implement snapshot functionality
    console.log('Snapshot team:', currentTeamSlots)
  }

  const handlePasteTeamcode = async () => {
    try {
      // Try to read from clipboard
      const clipboardText = await navigator.clipboard.readText()
      
      if (!clipboardText) {
        alert('Clipboard is empty')
        return
      }

      // Validate teamcode format
      if (!isValidTeamcodeFormat(clipboardText)) {
        alert('Invalid teamcode format. Teamcodes should start with "01" and end with "TFTSet" followed by numbers.')
        return
      }

      // Check if teamplanner data is available
      if (!tftData?.teamplannerData) {
        alert('Teamplanner data not available. Please try again when data has loaded.')
        return
      }

      // Parse the teamcode
      const parseResult = parseTeamcode(clipboardText, tftData.teamplannerData)
      
      if (!parseResult.success) {
        alert(`Failed to parse teamcode: ${parseResult.error}`)
        return
      }

      // Check if the set matches current TFT data set
      if (parseResult.setId !== tftData?.setName?.replace('Set', 'TFTSet')) {
        const currentSet = tftData?.setName || 'Unknown'
        const teamcodeSet = parseResult.setId?.replace('TFTSet', 'Set') || 'Unknown'
        
        if (!confirm(`This teamcode is for ${teamcodeSet} but you're currently using ${currentSet} data. Load anyway?`)) {
          return
        }
      }

      // Convert character IDs to champion objects
      const newTeamSlots = new Array(10).fill(null)
      let loadedCount = 0

      parseResult.champions.forEach((characterId, index) => {
        if (characterId && index < 10) {
          // Find the champion by character_id
          const champion = Object.values(tftData?.champions || {}).find(champ => 
            champ.character_id === characterId || champ.id === characterId
          )
          
          if (champion) {
            newTeamSlots[index] = {
              ...champion,
              starTarget: 2, // Default to 2 star
              isCarry: false,
              isTraitBot: false
            }
            loadedCount++
          } else {
            console.warn(`Champion not found for character_id: ${characterId}`)
          }
        }
      })

      // Update team slots
      currentSetTeamSlots(newTeamSlots)
      
      // Show success message
      alert(`Successfully loaded teamcode! ${loadedCount} champions imported.`)
      
    } catch (error) {
      console.error('Error pasting teamcode:', error)
      
      if (error.name === 'NotAllowedError') {
        alert('Clipboard access denied. Please allow clipboard permissions or paste the teamcode manually.')
      } else {
        alert(`Error pasting teamcode: ${error.message}`)
      }
    }
  }

  const handleUnitClick = (unit) => {
    // Check if unit is already in team (prevent duplicates)
    const isUnitAlreadyInTeam = currentTeamSlots.some(slot => slot && slot.id === unit.id)
    if (isUnitAlreadyInTeam) {
      return // Don't add duplicate units
    }

    // Find first empty slot and add unit
    const emptySlotIndex = currentTeamSlots.findIndex(slot => slot === null)
    if (emptySlotIndex !== -1) {
      const newSlots = [...currentTeamSlots]
      newSlots[emptySlotIndex] = {
        ...unit,
        starTarget: 2, // Default to 2 star
        isCarry: false,
        isTraitBot: false
      }
      currentSetTeamSlots(newSlots)
    }
  }

  const handleSlotClick = (index) => {
    // Clear the slot
    const newSlots = [...currentTeamSlots]
    newSlots[index] = null
    currentSetTeamSlots(newSlots)
  }

  const handleStarToggle = (index, toggleType) => {
    const newSlots = [...currentTeamSlots]
    const unit = newSlots[index]
    if (!unit) return

    if (toggleType === 'traitBot') {
      // Toggle trait bot - if enabled, disable carry and set to 1 star
      unit.isTraitBot = !unit.isTraitBot
      if (unit.isTraitBot) {
        unit.isCarry = false
        unit.starTarget = 1
      } else {
        // When untoggling trait bot, reset to 2 star default
        unit.starTarget = 2
      }
    } else if (toggleType === 'carry') {
      // Toggle carry - if enabled, disable trait bot and set to 3 star
      unit.isCarry = !unit.isCarry
      if (unit.isCarry) {
        unit.isTraitBot = false
        unit.starTarget = 3
      } else {
        unit.starTarget = 2 // Default back to 2 star
      }
    }

    currentSetTeamSlots(newSlots)
  }

  const getTierColorClass = (cost) => {
    switch(cost) {
      case 1: return 'cost-1'
      case 2: return 'cost-2'
      case 3: return 'cost-3'
      case 4: return 'cost-4'
      case 5: return 'cost-5'
      default: return 'cost-1'
    }
  }

  const renderUnitBrowser = () => {
    return (
      <div className="unit-browser">
        <div className="unit-browser-scroll">
          {[1, 2, 3, 4, 5].map(tier => (
            <div key={tier} className="tier-section">
              <div className={`tier-header ${getTierColorClass(tier)}`}>
                <span>Tier {tier}</span>
              </div>
              <div className="unit-grid">
                {(unitsByTier[tier] || []).map(unit => {
                  const isAlreadyInTeam = currentTeamSlots.some(slot => slot && slot.id === unit.id)
                  return (
                    <div
                      key={unit.id}
                      className={`unit-item ${getTierColorClass(tier)} ${isAlreadyInTeam ? 'already-selected' : ''}`}
                      onClick={() => handleUnitClick(unit)}
                      title={isAlreadyInTeam ? `${unit.name} (Already in team)` : unit.name}
                    >
                      <UnitImage unit={unit} tftData={tftData} tftImages={tftImages} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTeamSlots = () => {
    const rows = [
      currentTeamSlots.slice(0, 5), // First row
      currentTeamSlots.slice(5, 10) // Second row
    ]

    return (
      <div className="team-slots-container">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="team-row">
            {row.map((unit, colIndex) => {
              const slotIndex = rowIndex * 5 + colIndex
              return (
                <div
                  key={slotIndex}
                  className="team-slot"
                  onClick={() => handleSlotClick(slotIndex)}
                >
                  <div className="slot-toggles">
                    <button
                      className={`toggle-btn trait-bot ${unit?.isTraitBot ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStarToggle(slotIndex, 'traitBot')
                      }}
                      disabled={!unit}
                      title="Trait Bot (1 star)"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      className={`toggle-btn carry ${unit?.isCarry ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStarToggle(slotIndex, 'carry')
                      }}
                      disabled={!unit}
                      title="Carry (3 star)"
                    >
                      <Star size={12} />
                    </button>
                  </div>

                  <div className="slot-content">
                    {unit ? (
                      <>
                        <UnitImage unit={unit} tftData={tftData} tftImages={tftImages} />
                        <div className={`slot-footer ${getTierColorClass(unit.cost)}`}>
                          <span className="unit-name">{unit.name}</span>
                          <div className="star-indicator">
                            {Array.from({ length: unit.starTarget }, (_, i) => (
                              <Star key={i} size={8} fill="currentColor" />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="empty-slot">
                        <div className="empty-slot-inner"></div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  const renderTraitRow = () => {
    // Calculate traits using the exact same logic as TraitsColumn
    if (!tftData || !currentTeamSlots) {
      return (
        <div className="trait-row">
          <div className="trait-items">
            <div className="no-traits">No active traits</div>
          </div>
        </div>
      )
    }
    
    const traitCounts = {}
    
    // Count traits from unique champions on team (duplicates count as one)
    const uniqueChampions = new Set()
    currentTeamSlots.filter(Boolean).forEach(unit => {
      if (unit && unit.id && tftData.champions[unit.id]) {
        uniqueChampions.add(unit.id)
      }
    })
    
    // Add traits for each unique champion
    uniqueChampions.forEach(championId => {
      const champion = tftData.champions[championId]
      if (champion.traits) {
        champion.traits.forEach(traitName => {
          traitCounts[traitName] = (traitCounts[traitName] || 0) + 1
        })
      }
    })
    
    // Convert to array and add trait data - same as TraitsColumn
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
    const sortedTraits = traitArray.sort((a, b) => {
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

    // Pagination logic - max 10 traits per page
    const traitsPerPage = 10
    const totalPages = Math.ceil(sortedTraits.length / traitsPerPage)
    const startIndex = currentTraitPage * traitsPerPage
    const endIndex = Math.min(startIndex + traitsPerPage, sortedTraits.length)
    const currentTraits = sortedTraits.slice(startIndex, endIndex)

    const goToNextPage = () => {
      setCurrentTraitPage((prev) => (prev + 1) % totalPages)
    }

    // Helper function to get trait tier color class
    const getTraitTierClass = (trait) => {
      if (trait.activeBreakpoint === 0) return 'trait-inactive'
      
      const breakpointIndex = trait.breakpoints.indexOf(trait.activeBreakpoint)
      if (breakpointIndex === 0) return 'trait-bronze'
      if (breakpointIndex === 1) return 'trait-silver' 
      if (breakpointIndex === 2) return 'trait-gold'
      if (breakpointIndex >= 3) return 'trait-prismatic'
      return 'trait-bronze'
    }

    // Helper function to get breakpoint progress text
    const getBreakpointProgress = (trait) => {
      if (trait.breakpoints.length === 0) {
        return `${trait.count}`
      }
      
      // Find the next breakpoint that hasn't been reached
      const nextBreakpoint = trait.breakpoints.find(bp => trait.count < bp)
      
      if (nextBreakpoint) {
        return `${trait.count}/${nextBreakpoint}`
      } else {
        // All breakpoints reached, show current count with highest breakpoint
        const highestBreakpoint = trait.breakpoints[trait.breakpoints.length - 1]
        return `${trait.count}/${highestBreakpoint}+`
      }
    }

    // Determine pagination button content
    const isReturningToFirst = currentTraitPage === totalPages - 1
    const remainingTraits = sortedTraits.length - traitsPerPage

    return (
      <div className="trait-row">
        <div className="trait-display-wrapper">
          <div className="trait-icons-container">
            {currentTraits.map(trait => (
              <div 
                key={trait.name} 
                className={`trait-icon-item ${getTraitTierClass(trait)}`}
                title={`${trait.name} (${getBreakpointProgress(trait)})`}
              >
                <div className="trait-icon-circle">
                  {trait.imageUrl ? (
                    <img src={trait.imageUrl} alt={trait.name} className="trait-image" />
                  ) : (
                    <span className="trait-fallback">{trait.name?.[0] || '?'}</span>
                  )}
                </div>
                <span className="trait-progress-text">{getBreakpointProgress(trait)}</span>
              </div>
            ))}
            
            {sortedTraits.length === 0 && (
              <div className="no-traits">No traits</div>
            )}
          </div>
          
          {/* Fixed position pagination button */}
          {totalPages > 1 && (
            <div className="trait-pagination-btn-fixed" onClick={goToNextPage}>
              {isReturningToFirst ? (
                <ChevronLeft size={16} className="pagination-icon" />
              ) : (
                <span className="pagination-text">+{remainingTraits}</span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderHelpPopup = () => {
    if (!helpOpen) return null

    return (
      <div className="help-popup-overlay" onClick={() => setHelpOpen(false)}>
        <div className="help-popup" onClick={(e) => e.stopPropagation()}>
          <div className="help-popup-header">
            <h3>Star Level Guide</h3>
            <button onClick={() => setHelpOpen(false)} className="help-close-btn">
              <X size={16} />
            </button>
          </div>
          
          <div className="help-popup-content">
            <div className="help-section">
              <div className="help-item">
                <div className="help-icon-demo">
                  <div className="demo-toggle trait-bot active">
                    <Minus size={12} />
                  </div>
                  <div className="demo-stars">
                    <Star size={12} fill="currentColor" />
                  </div>
                </div>
                <div className="help-text">
                  <strong>Trait Bots (1★)</strong>
                  <p>For expensive units that mainly provide traits. Saves gold for rolldowns and core upgrades.</p>
                </div>
              </div>

              <div className="help-item">
                <div className="help-icon-demo">
                  <div className="demo-toggle invisible">
                    {/* Invisible placeholder for alignment */}
                  </div>
                  <div className="demo-stars">
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                  </div>
                </div>
                <div className="help-text">
                  <strong>Default (2★)</strong>
                  <p>Standard target for most units.</p>
                </div>
              </div>

              <div className="help-item">
                <div className="help-icon-demo">
                  <div className="demo-toggle carry active">
                    <Star size={12} />
                  </div>
                  <div className="demo-stars">
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                    <Star size={12} fill="currentColor" />
                  </div>
                </div>
                <div className="help-text">
                  <strong>Primary Carries (3★)</strong>
                  <p>The primary units for reroll comp that are the focus of the rolldown.</p>
                </div>
              </div>
            </div>

            <div className="help-warning">
              <strong>Scoring Impact:</strong> Points are deducted if your final board has missing or under-starred units that you rolled past during your rolldown.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="team-planner-modal">
        {/* Header */}
        <div className="modal-header">
          <div className="header-left">
            <h2 className="modal-title">TEAM PLANNER</h2>
          </div>
          <div className="header-center">
            <button 
              className="help-icon-container" 
              onClick={() => setHelpOpen(true)}
              title="Star Level Guide"
            >
              <HelpCircle size={16} className="help-icon" />
            </button>
          </div>
          <div className="header-right">
            <button
              onClick={handleClearAll}
              className="header-btn"
              title="Clear All"
            >
              <RotateCcw size={16} />
              Clear All
            </button>
            <button
              onClick={handleSnapshot}
              className="header-btn"
              title="Snapshot"
            >
              <Camera size={16} />
              Snapshot
            </button>
            <button
              onClick={handlePasteTeamcode}
              className="header-btn"
              title="Paste Teamcode"
            >
              <Clipboard size={16} />
              Paste
            </button>
            <button
              onClick={onClose}
              className="close-btn"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Left: Unit Browser */}
          <div className="left-section">
            {renderUnitBrowser()}
          </div>

          {/* Right: Team Planner */}
          <div className="right-section">
            {renderTeamSlots()}
            {renderTraitRow()}
          </div>
        </div>
        
        {/* Help Popup */}
        {renderHelpPopup()}
      </div>
    </div>
  )
}

export default TeamPlannerModal