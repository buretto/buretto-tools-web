/**
 * React Hook for the new DragManager system
 * Provides clean interface for components to use the unified drag system
 */

import { useCallback, useEffect, useRef } from 'react'
import dragManager from '../utils/DragManager'

export const useDragManager = () => {
  const elementRef = useRef(null)

  /**
   * Start dragging an element
   * @param {MouseEvent} e - Mouse event (from onMouseDown)
   * @param {Object} dragData - Data to associate with this drag
   * @param {Function} onDragEnd - Optional callback when drag ends
   * @param {HTMLElement} customDragImage - Optional custom drag image
   */
  const startDrag = useCallback((e, dragData, onDragEnd = null, customDragImage = null) => {
    const element = e.currentTarget
    
    // Prevent any default browser behavior immediately
    e.preventDefault()
    e.stopPropagation()
    
    // Calculate grab offset (where mouse grabbed the element)
    const rect = element.getBoundingClientRect()
    const grabX = e.clientX - rect.left
    const grabY = e.clientY - rect.top
    
    // Set grab offset in drag manager
    dragManager.setGrabOffset(grabX, grabY)
    
    // Update target position to current mouse position
    dragManager.targetPos = {
      x: e.clientX - grabX,
      y: e.clientY - grabY
    }
    
    // Start the drag immediately (no delay)
    dragManager.startDrag(element, {
      dragData,
      onDragEnd,
      customDragImage
    })
  }, [])

  /**
   * End current drag operation
   */
  const endDrag = useCallback(() => {
    dragManager.forceEnd()
  }, [])

  /**
   * Check if currently dragging
   */
  const isDragging = dragManager.isActive

  /**
   * Get current drag data
   */
  const currentDragData = dragManager.currentDragData

  /**
   * Helper to create mouse down handler for draggable elements
   * @param {Object} dragData - Data to associate with the drag
   * @param {Function} onDragEnd - Optional callback when drag ends
   * @param {HTMLElement} customDragImage - Optional custom drag image
   */
  const createDragHandler = useCallback((dragData, onDragEnd = null, customDragImage = null) => {
    return (e) => {
      // Only handle left mouse button
      if (e.button !== 0) return
      
      startDrag(e, dragData, onDragEnd, customDragImage)
    }
  }, [startDrag])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (dragManager.isActive) {
        dragManager.forceEnd()
      }
    }
  }, [])

  return {
    startDrag,
    endDrag,
    isDragging,
    currentDragData,
    createDragHandler,
    elementRef
  }
}

/**
 * Hook for drop zones to handle drops from the new drag system
 * @param {Function} onDrop - Callback when something is dropped
 * @param {Function} canDrop - Optional function to check if drop is allowed
 */
export const useDropZone = (onDrop, canDrop = null) => {
  const dropZoneRef = useRef(null)

  // Store the drop handler so DragManager can call it during endDrag
  useEffect(() => {
    const dropHandler = {
      element: dropZoneRef.current,
      onDrop,
      canDrop,
      checkDrop: (e) => {
        const dropZone = dropZoneRef.current
        if (!dropZone) return false

        // Check if mouse is over this drop zone
        const rect = dropZone.getBoundingClientRect()
        const isOver = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        )

        if (isOver) {
          const dragData = dragManager.currentDragData
          
          // Check if drop is allowed
          if (canDrop && !canDrop(dragData)) {
            return false
          }

          // Call drop handler
          if (onDrop) {
            onDrop(e, dragData)
            return true
          }
        }
        
        return false
      }
    }

    // Register this drop zone with DragManager
    dragManager.registerDropZone?.(dropHandler)
    
    return () => {
      // Unregister on cleanup
      dragManager.unregisterDropZone?.(dropHandler)
    }
  }, [onDrop, canDrop])

  return {
    dropZoneRef
  }
}