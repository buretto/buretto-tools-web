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
    console.log('🛑 DRAG STATE RESET')
    setDraggedUnit(null)
    setDragSource(null)
    setDragSourceIndex(null)
    setIsDragging(false)
  }, [])
  
  // Add global drag end handler to ensure drag state is always reset
  React.useEffect(() => {
    const handleGlobalDragEnd = (e) => {
      console.log('⏰ Global drag end (50ms delay)')
      // Use a small delay to ensure all drop operations complete first
      setTimeout(() => {
        endDrag()
      }, 50)
    }
    
    const handleGlobalDrop = (e) => {
      console.log('⚡ Global drop (immediate)', e.target, e.target.className, e.target.tagName)
      // Only reset if the drop wasn't handled by a valid drop zone
      setTimeout(() => {
        console.log('⚡ Global drop reset after timeout')
        endDrag()
      }, 10)
    }
    
    const handleGlobalDragLeave = (e) => {
      // Only reset if we're leaving the entire document
      if (e.target === document.documentElement) {
        setTimeout(() => {
          endDrag()
        }, 100)
      }
    }
    
    // Add mouse up handler as fallback
    const handleMouseUp = (e) => {
      if (isDragging) {
        setTimeout(() => {
          endDrag()
        }, 100)
      }
    }
    
    // Listen for force drag end events
    const handleForceDragEnd = (e) => {
      endDrag()
    }
    
    document.addEventListener('dragend', handleGlobalDragEnd)
    document.addEventListener('drop', handleGlobalDrop)
    document.addEventListener('dragleave', handleGlobalDragLeave)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('forceDragEnd', handleForceDragEnd)
    
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
      document.removeEventListener('drop', handleGlobalDrop)
      document.removeEventListener('dragleave', handleGlobalDragLeave)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('forceDragEnd', handleForceDragEnd)
    }
  }, [endDrag, isDragging])

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