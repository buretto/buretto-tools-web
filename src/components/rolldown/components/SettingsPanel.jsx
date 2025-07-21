import React, { useState } from 'react'
import { X, RotateCcw } from 'lucide-react'

function SettingsPanel({ isOpen, onClose, hotkeys, onUpdateHotkeys, defaultHotkeys }) {
  const [editingHotkeys, setEditingHotkeys] = useState(hotkeys)
  const [recordingKey, setRecordingKey] = useState(null)

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

  const handleKeyDown = (e) => {
    if (recordingKey) {
      e.preventDefault()
      const key = e.key.toLowerCase()
      
      // Don't allow duplicate keys
      const existingAction = Object.keys(editingHotkeys).find(k => editingHotkeys[k] === action && k !== key)
      if (existingAction) {
        return // Key already in use
      }

      setEditingHotkeys(prev => ({
        ...prev,
        [key]: recordingKey
      }))
      setRecordingKey(null)
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-md w-full mx-4"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
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