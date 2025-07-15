import React, { createContext, useContext, useState, useCallback } from 'react'

const DragContext = createContext()

export const useDrag = () => {
  const context = useContext(DragContext)
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider')
  }
  return context
}

export const DragProvider = ({ children }) => {
  const [draggedUnit, setDraggedUnit] = useState(null)
  const [dragSource, setDragSource] = useState(null) // 'bench', 'board', 'shop'
  const [dragSourceIndex, setDragSourceIndex] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const startDrag = (unit, source, sourceIndex) => {
    setDraggedUnit(unit)
    setDragSource(source)
    setDragSourceIndex(sourceIndex)
    setIsDragging(true)
  }

  const endDrag = useCallback(() => {
    setDraggedUnit(null)
    setDragSource(null)
    setDragSourceIndex(null)
    setIsDragging(false)
  }, [])
  
  // Add global drag end handler to ensure drag state is always reset
  React.useEffect(() => {
    const handleGlobalDragEnd = (e) => {
      // Use a small delay to ensure all drop operations complete first
      setTimeout(() => {
        endDrag()
      }, 50)
    }
    
    const handleGlobalDragLeave = (e) => {
      // Only reset if we're leaving the entire document
      if (e.target === document.documentElement) {
        setTimeout(() => {
          endDrag()
        }, 50)
      }
    }
    
    document.addEventListener('dragend', handleGlobalDragEnd)
    document.addEventListener('dragleave', handleGlobalDragLeave)
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
      document.removeEventListener('dragleave', handleGlobalDragLeave)
    }
  }, [endDrag])

  const value = {
    draggedUnit,
    dragSource,
    dragSourceIndex,
    isDragging,
    startDrag,
    endDrag
  }

  return (
    <DragContext.Provider value={value}>
      {children}
    </DragContext.Provider>
  )
}