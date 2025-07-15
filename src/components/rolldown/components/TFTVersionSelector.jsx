import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Loader2, AlertCircle, Settings } from 'lucide-react'

// Mapping of League versions to TFT versions for display
const getVersionDisplayInfo = (version) => {
  const versionMappings = {
    '15.13.1': '14.7',
    '15.1.1': '14.1',
    '14.24.1': '13.24',
    // Add more mappings as needed
  }
  
  const tftVersion = versionMappings[version] || version
  return {
    leagueVersion: version,
    tftVersion: tftVersion,
    displayText: tftVersion,
    dropdownText: `${tftVersion} (${version})`
  }
}

const TFTVersionSelector = ({ 
  currentVersion, 
  cachedVersions, 
  loading, 
  error, 
  onVersionSelect,
  onOpenMappings
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [customVersion, setCustomVersion] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
        setShowCustomInput(false)
        setCustomVersion('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus custom input when shown
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [showCustomInput])

  const handleVersionSelect = (version) => {
    onVersionSelect(version)
    setIsDropdownOpen(false)
    setShowCustomInput(false)
    setCustomVersion('')
  }

  const handleCustomVersionSubmit = (e) => {
    e.preventDefault()
    if (customVersion.trim()) {
      onVersionSelect(customVersion.trim())
      setShowCustomInput(false)
      setCustomVersion('')
      setIsDropdownOpen(false)
    }
  }

  const handleAddCustomVersion = () => {
    setShowCustomInput(true)
    setIsDropdownOpen(true)
  }

  return (
    <div className="tft-version-selector" ref={dropdownRef}>
      {/* Main selector button */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="version-selector-button"
        disabled={loading}
      >
        <div className="version-selector-content">
          <span className="version-label">TFT Set:</span>
          <span className="version-current">{getVersionDisplayInfo(currentVersion).displayText}</span>
          {loading ? (
            <Loader2 className="version-icon loading" />
          ) : (
            <ChevronDown className={`version-icon ${isDropdownOpen ? 'rotated' : ''}`} />
          )}
        </div>
      </button>

      {/* Error display */}
      {error && (
        <div className="version-error">
          <AlertCircle className="error-icon" />
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Dropdown menu */}
      {isDropdownOpen && (
        <div className="version-dropdown">
          {/* Cached versions */}
          {cachedVersions.length > 0 && (
            <div className="version-section">
              <div className="version-section-header">Cached Versions</div>
              {cachedVersions.map((version) => (
                <div key={version} className="version-option-container">
                  <button
                    className={`version-option ${version === currentVersion ? 'active' : ''}`}
                    onClick={() => handleVersionSelect(version)}
                  >
                    {getVersionDisplayInfo(version).dropdownText}
                    {version === currentVersion && <span className="current-indicator">●</span>}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onOpenMappings?.(version)
                      setIsDropdownOpen(false)
                    }}
                    className="mapping-button"
                    title={`Manage image mappings for ${version}`}
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custom version input */}
          {showCustomInput ? (
            <form onSubmit={handleCustomVersionSubmit} className="version-section">
              <div className="version-section-header">Add New Version</div>
              <div className="custom-version-input">
                <input
                  ref={inputRef}
                  type="text"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  placeholder="e.g., 14.24.1"
                  className="version-input"
                />
                <button
                  type="submit"
                  className="add-version-button"
                  disabled={!customVersion.trim() || loading}
                >
                  Add & Load
                </button>
              </div>
            </form>
          ) : (
            <div className="version-section">
              <button
                onClick={handleAddCustomVersion}
                className="version-option add-new"
              >
                <Plus className="add-icon" />
                Add New Version
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TFTVersionSelector