import { useEffect, useRef, useCallback } from 'react'

// Default hotkey mappings
const DEFAULT_HOTKEYS = {
  'd': 'buy-roll',
  'f': 'buy-xp',
  'e': 'sell-unit',
  'w': 'place-unit'
}

export function useKeyboardHotkeys({
  onBuyRoll,
  onBuyXP,
  onSellUnit,
  onPlaceUnit,
  hotkeyConfig = DEFAULT_HOTKEYS,
  hoveredUnit = null,
  enabled = true
}) {
  const keyHandlersRef = useRef({})
  
  // Update handlers ref when props change
  useEffect(() => {
    keyHandlersRef.current = {
      'buy-roll': onBuyRoll,
      'buy-xp': onBuyXP,
      'sell-unit': onSellUnit,
      'place-unit': onPlaceUnit
    }
  }, [onBuyRoll, onBuyXP, onSellUnit, onPlaceUnit])

  const handleKeyDown = useCallback((e) => {
    if (!enabled) return
    
    // Don't trigger hotkeys when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return
    }
    
    const key = e.key.toLowerCase()
    const action = hotkeyConfig[key]
    
    if (action && keyHandlersRef.current[action]) {
      e.preventDefault()
      
      // For unit-specific actions, pass the hovered unit
      if (action === 'sell-unit' || action === 'place-unit') {
        if (hoveredUnit) {
          keyHandlersRef.current[action](hoveredUnit)
        }
      } else {
        keyHandlersRef.current[action]()
      }
    }
  }, [hotkeyConfig, hoveredUnit, enabled])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, enabled])

  return {
    defaultHotkeys: DEFAULT_HOTKEYS,
    currentHotkeys: hotkeyConfig
  }
}

export default useKeyboardHotkeys