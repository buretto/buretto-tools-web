import React, { useState, useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'

const DISCLAIMER_STORAGE_KEY = 'tft-rolldown-disclaimer-dismissed'

function DisclaimerModal({ onClose }) {
  const [dontShowAgain, setDontShowAgain] = useState(false)

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-70" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-4 border-2 border-yellow-600">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-500" size={24} />
            <h2 className="text-xl font-bold text-white">Tool Status</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close disclaimer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-gray-300 space-y-4">
          <p className="text-lg">
            Hi. This was an experiment I started at end of Set 14 while waiting for Set 15.
            It has not been updated since and probably won't in the future (have taken a break
            from TFT and gaming in general).
          </p>

          <p>
            The base functionality is done but it's missing the final UX to make it usable.
          </p>

          <div className="bg-gray-900 rounded p-4 border border-gray-700">
            <p className="font-semibold text-white mb-2">Left on TODO list:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Different rolldown scenarios drills (3 cost 3* carries rolldown, 4 cost 3* rolldown, 5 cost 3* rolldown)</li>
              <li>Scouting support (e.g. for 5 cost rolldown it would assume one final player and you just check what he is holding on bench/board)</li>
            </ol>
          </div>

          <p className="text-yellow-400 font-semibold">
            ⚠️ It is not a usable tool right now, parts left in it might be broken in future relying
            on Riot and community APIs which might get outdated.
          </p>

          <p className="text-sm text-gray-400">
            You can check if I'm active again: my server is <span className="font-semibold text-white">NA</span>,
            and IGN is <span className="font-semibold text-white">PoopyPlatypus</span>.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 flex items-center justify-between">
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-gray-800 cursor-pointer"
            />
            <span className="text-sm">Don't show this again</span>
          </label>

          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default DisclaimerModal

// Helper function to check if disclaimer should be shown
export function shouldShowDisclaimer() {
  return localStorage.getItem(DISCLAIMER_STORAGE_KEY) !== 'true'
}
