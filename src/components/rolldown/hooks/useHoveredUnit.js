import { useState, useCallback } from 'react'

export function useHoveredUnit() {
  const [hoveredUnit, setHoveredUnit] = useState(null)

  const onUnitHover = useCallback((unit, location, index, row = null, col = null) => {
    setHoveredUnit(unit ? {
      ...unit,
      location,
      index,
      row,
      col
    } : null)
  }, [])

  const clearHoveredUnit = useCallback(() => {
    setHoveredUnit(null)
  }, [])

  return {
    hoveredUnit,
    onUnitHover,
    clearHoveredUnit
  }
}

export default useHoveredUnit