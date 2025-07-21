import React from 'react'
import { X, BarChart3, Clock, DollarSign, MousePointer, TrendingUp } from 'lucide-react'

function AnalyticsPanel({ isOpen, onClose, analytics }) {
  if (!isOpen) return null

  const getElapsedTime = () => {
    return Math.floor((Date.now() - analytics.startTime) / 1000)
  }
  
  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getActionsByType = () => {
    const actionCounts = analytics.actions.reduce((acc, action) => {
      acc[action.type] = (acc[action.type] || 0) + 1
      return acc
    }, {})
    
    return actionCounts
  }

  const getAverageGoldPerAction = () => {
    const totalActions = analytics.actions.length
    return totalActions > 0 ? (analytics.goldSpent / totalActions).toFixed(1) : '0.0'
  }

  const actionCounts = getActionsByType()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="text-green-400" size={20} />
            <h2 className="text-xl font-bold text-white">Analytics</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="text-blue-400" size={16} />
                <span className="text-sm text-gray-300">Session Time</span>
              </div>
              <div className="text-lg font-bold text-blue-400">
                {formatElapsedTime(getElapsedTime())}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MousePointer className="text-purple-400" size={16} />
                <span className="text-sm text-gray-300">Rolls/Min</span>
              </div>
              <div className="text-lg font-bold text-purple-400">
                {analytics.rollsPerMinute.toFixed(1)}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="text-yellow-400" size={16} />
                <span className="text-sm text-gray-300">Gold Spent</span>
              </div>
              <div className="text-lg font-bold text-yellow-400">
                {analytics.goldSpent}
              </div>
            </div>

            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="text-green-400" size={16} />
                <span className="text-sm text-gray-300">Total Actions</span>
              </div>
              <div className="text-lg font-bold text-green-400">
                {analytics.actions.length}
              </div>
            </div>
          </div>

          {/* Action Breakdown */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Action Breakdown</h3>
            <div className="space-y-2">
              {Object.entries(actionCounts).map(([actionType, count]) => (
                <div key={actionType} className="flex justify-between">
                  <span className="text-gray-300 capitalize">{actionType.replace('-', ' ')}</span>
                  <span className="text-white font-semibold">{count}</span>
                </div>
              ))}
              {Object.keys(actionCounts).length === 0 && (
                <span className="text-gray-400 italic">No actions recorded yet</span>
              )}
            </div>
          </div>

          {/* Additional Stats */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Gold/Action</span>
                <span className="text-white font-semibold">{getAverageGoldPerAction()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Rerolls</span>
                <span className="text-white font-semibold">{actionCounts.reroll || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Purchases</span>
                <span className="text-white font-semibold">{actionCounts.purchase || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Sells</span>
                <span className="text-white font-semibold">{actionCounts.sell || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-600">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPanel