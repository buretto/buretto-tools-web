import React, { useState, useEffect } from 'react'
import { X, RotateCcw, Wifi, WifiOff } from 'lucide-react'
import { shouldUseOfflineMode, enableOfflineMode, disableOfflineMode } from '../utils/networkUtils'

function SettingsPanel({ isOpen, onClose, hotkeys, onUpdateHotkeys, defaultHotkeys }) {
  const [editingHotkeys, setEditingHotkeys] = useState(hotkeys)
  const [recordingKey, setRecordingKey] = useState(null)
  const [isOfflineMode, setIsOfflineMode] = useState(shouldUseOfflineMode())

  // Update offline mode state when panel opens
  useEffect(() => {
    if (isOpen) {
      setIsOfflineMode(shouldUseOfflineMode())
    }
  }, [isOpen])

  // Add event listener when recording - must be before early return
  React.useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (recordingKey) {
        e.preventDefault()
        e.stopPropagation()
        
        const key = e.key.toLowerCase()
        
        // Skip modifier keys and special keys
        if (['shift', 'ctrl', 'alt', 'meta', 'escape', 'tab', 'enter'].includes(key)) {
          return
        }
        
        // Create new hotkey mapping
        const newHotkeys = { ...editingHotkeys }
        
        // Remove any existing mapping for this key
        Object.keys(newHotkeys).forEach(k => {
          if (k === key) {
            delete newHotkeys[k]
          }
        })
        
        // Remove old mapping for this action
        Object.keys(newHotkeys).forEach(k => {
          if (newHotkeys[k] === recordingKey) {
            delete newHotkeys[k]
          }
        })
        
        // Add new mapping
        newHotkeys[key] = recordingKey
        
        setEditingHotkeys(newHotkeys)
        setRecordingKey(null)
      }
    }
    
    if (recordingKey) {
      document.addEventListener('keydown', handleGlobalKeyDown, true)
      return () => {
        document.removeEventListener('keydown', handleGlobalKeyDown, true)
      }
    }
  }, [recordingKey, editingHotkeys])

  if (!isOpen) return null

  const actionLabels = {
    'buy-roll': 'Buy Roll (Refresh Shop)',
    'buy-xp': 'Buy XP',
    'sell-unit': 'Sell Unit (when hovering)',
    'place-unit': 'Place/Remove Unit (when hovering)'
  }

  const handleKeyRecord = (action) => {
    setRecordingKey(action)
  }


  const handleSave = () => {
    onUpdateHotkeys(editingHotkeys)
    onClose()
  }

  const handleReset = () => {
    setEditingHotkeys(defaultHotkeys)
  }

  const getCurrentKeyForAction = (action) => {
    return Object.keys(editingHotkeys).find(key => editingHotkeys[key] === action) || 'None'
  }

  const handleOfflineModeToggle = () => {
    if (isOfflineMode) {
      disableOfflineMode()
      setIsOfflineMode(false)
    } else {
      enableOfflineMode()
      setIsOfflineMode(true)
    }
  }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4"
        tabIndex={0}
        autoFocus
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Keyboard Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(actionLabels).map(([action, label]) => {
            const currentKey = getCurrentKeyForAction(action)
            const isRecording = recordingKey === action

            return (
              <div key={action} className="flex justify-between items-center">
                <div className="text-white text-sm">
                  {label}
                </div>
                <button
                  onClick={() => handleKeyRecord(action)}
                  className={`px-3 py-1 rounded text-sm font-mono transition-colors ${
                    isRecording 
                      ? 'bg-blue-600 text-white animate-pulse' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {isRecording ? 'Press key...' : currentKey.toUpperCase()}
                </button>
              </div>
            )
          })}
        </div>

        {/* Offline Mode Section */}
        <div className="mt-6 pt-4 border-t border-gray-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isOfflineMode ? <WifiOff size={16} className="text-gray-400" /> : <Wifi size={16} className="text-green-400" />}
              <div>
                <div className="text-white text-sm font-medium">Offline Mode</div>
                <div className="text-gray-400 text-xs">
                  {isOfflineMode ? 'Using bundled data only' : 'Fetching latest data from network'}
                </div>
              </div>
            </div>
            <button
              onClick={handleOfflineModeToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isOfflineMode ? 'bg-blue-600' : 'bg-gray-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isOfflineMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-between mt-6 pt-4 border-t border-gray-600">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            <RotateCcw size={16} />
            Reset to Default
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel