import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Download, Upload, ExternalLink, AlertTriangle } from 'lucide-react'
import { 
  getVersionMappings, 
  addMapping, 
  removeMapping, 
  exportMappings, 
  importMappings,
  clearAllMappings 
} from '../utils/imageMappings.js'
import { getFailedImageStats } from '../utils/imageLoader.js'
import { useFailedImages } from '../hooks/useFailedImages.js'

const ImageMappingModal = ({ isOpen, onClose, version, tftData }) => {
  const [mappings, setMappings] = useState({ champions: {}, traits: {} })
  const [newMapping, setNewMapping] = useState({ 
    type: 'champions', 
    original: '', 
    mapped: '' 
  })
  const [activeTab, setActiveTab] = useState('champions')
  const [blacklist, setBlacklist] = useState({ champions: [], traits: [] })
  const [newBlacklistItem, setNewBlacklistItem] = useState('')
  
  // Use reactive hook for real-time failed images updates
  const failedImages = useFailedImages(version)

  useEffect(() => {
    if (isOpen && version) {
      loadMappings()
      loadBlacklist()
    }
  }, [isOpen, version])

  // Sync newMapping type with active tab
  useEffect(() => {
    setNewMapping(prev => ({ ...prev, type: activeTab }))
  }, [activeTab])

  const loadMappings = () => {
    const versionMappings = getVersionMappings(version)
    setMappings(versionMappings)
  }

  const loadBlacklist = () => {
    const stored = localStorage.getItem(`tft_image_blacklist_${version}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setBlacklist(parsed)
      } catch (error) {
        console.error('Failed to parse blacklist:', error)
        setBlacklist({ champions: [], traits: [] })
      }
    } else {
      setBlacklist({ champions: [], traits: [] })
    }
  }

  const saveBlacklist = (newBlacklist) => {
    try {
      localStorage.setItem(`tft_image_blacklist_${version}`, JSON.stringify(newBlacklist))
      setBlacklist(newBlacklist)
      // Note: Failed images will update automatically via reactive hook
    } catch (error) {
      console.error('Failed to save blacklist:', error)
    }
  }

  const addBlacklistItem = () => {
    if (newBlacklistItem.trim()) {
      const newBlacklist = { ...blacklist }
      newBlacklist[activeTab].push(newBlacklistItem.trim())
      saveBlacklist(newBlacklist)
      setNewBlacklistItem('')
    }
  }

  const removeBlacklistItem = (index) => {
    const newBlacklist = { ...blacklist }
    newBlacklist[activeTab].splice(index, 1)
    saveBlacklist(newBlacklist)
  }

  const handleAddMapping = () => {
    if (newMapping.original && newMapping.mapped) {
      const type = newMapping.type === 'champions' ? 'champion' : 'trait'
      addMapping(version, newMapping.original, newMapping.mapped, type)
      loadMappings()
      setNewMapping({ type: newMapping.type, original: '', mapped: '' })
    }
  }

  const handleRemoveMapping = (original, type) => {
    const mappingType = type === 'champions' ? 'champion' : 'trait'
    removeMapping(version, original, mappingType)
    loadMappings()
  }

  const handleExportMappings = () => {
    const exported = exportMappings()
    const blob = new Blob([exported], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tft-image-mappings-${version}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportMappings = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const success = importMappings(e.target.result)
        if (success) {
          loadMappings()
          alert('Mappings imported successfully!')
        } else {
          alert('Failed to import mappings. Please check the file format.')
        }
      }
      reader.readAsText(file)
    }
  }

  const isImageBlacklisted = (imageUrl, type) => {
    const filename = imageUrl.split('/').pop()
    if (!filename) return false
    
    return blacklist[type].some(pattern => 
      filename.toLowerCase().includes(pattern.toLowerCase())
    )
  }

  const getFailedImagesByType = (type) => {
    const typeStr = type === 'champions' ? 'tft-champion' : 'tft-trait'
    return failedImages.failed.filter(img => 
      img.url.includes(typeStr) && !isImageBlacklisted(img.url, type)
    )
  }

  const getIgnoredImagesByType = (type) => {
    const typeStr = type === 'champions' ? 'tft-champion' : 'tft-trait'
    return failedImages.failed.filter(img => 
      img.url.includes(typeStr) && isImageBlacklisted(img.url, type)
    )
  }

  const getBlacklistedEntitiesFromTFTData = (type) => {
    // Get blacklisted entities from current TFT data
    if (!tftData || !tftData[type]) return []
    
    const entities = Object.keys(tftData[type])
    
    return entities.filter(entityId => {
      return blacklist[type].some(pattern => 
        entityId.toLowerCase().includes(pattern.toLowerCase())
      )
    }).map(entityId => ({
      entityId,
      name: tftData[type][entityId]?.name || entityId,
      url: `fake-url-for-${type}/${entityId}` // Create a fake URL for consistency
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Image Name Mappings
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Version {version} • Manage image name discrepancies between Riot internal names and Data Dragon
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col h-full max-h-[70vh]">
          {/* Failed Images Warning */}
          {failedImages.count > 0 && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mx-6 mt-4 rounded">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-400 mr-2" />
                <p className="text-sm text-amber-700">
                  <strong>{failedImages.count} images failed to load.</strong> 
                  These may need name mappings to resolve discrepancies with Data Dragon.
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mx-6 mt-4">
            <button
              onClick={() => setActiveTab('champions')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'champions'
                  ? 'text-buretto-secondary border-b-2 border-buretto-secondary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Champions ({Object.keys(mappings.champions || {}).length})</span>
              <div className="flex gap-1">
                {getFailedImagesByType('champions').length > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getFailedImagesByType('champions').length}
                  </span>
                )}
                {getBlacklistedEntitiesFromTFTData('champions').length > 0 && (
                  <span className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getBlacklistedEntitiesFromTFTData('champions').length}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('traits')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${
                activeTab === 'traits'
                  ? 'text-buretto-secondary border-b-2 border-buretto-secondary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>Traits ({Object.keys(mappings.traits || {}).length})</span>
              <div className="flex gap-1">
                {getFailedImagesByType('traits').length > 0 && (
                  <span className="bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getFailedImagesByType('traits').length}
                  </span>
                )}
                {getBlacklistedEntitiesFromTFTData('traits').length > 0 && (
                  <span className="bg-gray-700 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {getBlacklistedEntitiesFromTFTData('traits').length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Add New Mapping */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Add New Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Original Name (Riot Internal)
                  </label>
                  <input
                    type="text"
                    value={newMapping.original}
                    onChange={(e) => setNewMapping({ ...newMapping, original: e.target.value })}
                    placeholder={newMapping.type === 'champions' ? "e.g., TFT14_Chogath" : "e.g., TFT15_Edgelord"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mapped Name (Data Dragon)
                  </label>
                  <input
                    type="text"
                    value={newMapping.mapped}
                    onChange={(e) => setNewMapping({ ...newMapping, mapped: e.target.value })}
                    placeholder={newMapping.type === 'champions' ? "e.g., TFT14_ChoGath" : "e.g., TFT10_Edgelord"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddMapping}
                    disabled={!newMapping.original || !newMapping.mapped}
                    className="w-full px-4 py-2 bg-buretto-secondary text-white rounded-md text-sm hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Mapping
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <select
                  value={newMapping.type}
                  onChange={(e) => setNewMapping({ ...newMapping, type: e.target.value })}
                  className="px-3 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="champions">Champion</option>
                  <option value="traits">Trait</option>
                </select>
              </div>
            </div>

            {/* Reference Links */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-blue-900 mb-2">Reference Links</h3>
              <p className="text-xs text-blue-700 mb-3">
                Check these GitHub repositories for correct Data Dragon file names:
              </p>
              <div className="space-y-2">
                <a
                  href={`https://github.com/InFinity54/LoL_DDragon/tree/v${version}/latest/img/tft-champion`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  TFT Champions (v{version})
                </a>
                <br />
                <a
                  href={`https://github.com/InFinity54/LoL_DDragon/tree/v${version}/latest/img/tft-trait`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  TFT Traits (v{version})
                </a>
              </div>
            </div>

            {/* Current Mappings */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Current {activeTab} Mappings
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-auto">
                {Object.entries(mappings[activeTab] || {}).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No mappings configured for {activeTab}
                  </p>
                ) : (
                  Object.entries(mappings[activeTab] || {}).map(([original, mapped]) => (
                    <div
                      key={original}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-mono text-sm">
                          <span className="text-gray-600">{original}</span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-green-600">
                            {typeof mapped === 'object' && mapped.name ? (
                              <>
                                {mapped.name}
                                {mapped.hasSetSuffix === false && (
                                  <span className="text-xs text-blue-600 ml-1">(no suffix)</span>
                                )}
                              </>
                            ) : (
                              mapped
                            )}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMapping(original, activeTab)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Blacklist Section */}
            <div className="mt-8">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Blacklist/Ignore {activeTab} (String Contains)
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Add patterns to ignore failed images. Images matching these patterns won't trigger warnings.
                Uses case-insensitive "contains" matching.
              </p>
              
              {/* Add blacklist item */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBlacklistItem}
                    onChange={(e) => setNewBlacklistItem(e.target.value)}
                    placeholder="e.g., TFT15_TutorialBot, _Dummy, TestUnit"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
                    onKeyPress={(e) => e.key === 'Enter' && addBlacklistItem()}
                  />
                  <button
                    onClick={addBlacklistItem}
                    disabled={!newBlacklistItem.trim()}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add Pattern
                  </button>
                </div>
              </div>

              {/* Current blacklist items */}
              <div className="space-y-2 mb-4">
                {blacklist[activeTab].length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No blacklist patterns for {activeTab}
                  </p>
                ) : (
                  blacklist[activeTab].map((pattern, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                    >
                      <code className="text-sm text-gray-700">contains: "{pattern}"</code>
                      <button
                        onClick={() => removeBlacklistItem(index)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Ignored/Blacklisted items for this type */}
              {(getIgnoredImagesByType(activeTab).length > 0 || getBlacklistedEntitiesFromTFTData(activeTab).length > 0) && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
                  <h4 className="text-sm font-medium text-white mb-2">
                    Ignored {activeTab} ({getIgnoredImagesByType(activeTab).length + getBlacklistedEntitiesFromTFTData(activeTab).length})
                  </h4>
                  <p className="text-xs text-gray-300 mb-2">
                    These items are ignored due to blacklist patterns
                  </p>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {/* Failed images that are blacklisted */}
                    {getIgnoredImagesByType(activeTab).map((img, index) => (
                      <div key={`failed-${index}`} className="text-xs text-gray-300 font-mono">
                        {img.url.split('/').pop()} <span className="text-red-400">(failed)</span>
                      </div>
                    ))}
                    {/* Blacklisted entities from TFT data */}
                    {getBlacklistedEntitiesFromTFTData(activeTab).map((entity, index) => (
                      <div key={`blacklisted-${index}`} className="text-xs text-gray-300 font-mono">
                        {entity.entityId} <span className="text-yellow-400">(blacklisted)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Images for this type */}
              {getFailedImagesByType(activeTab).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Failed {activeTab} ({getFailedImagesByType(activeTab).length})
                  </h4>
                  <p className="text-xs text-red-600 mb-2">
                    These images failed to load and are not blacklisted
                  </p>
                  <div className="space-y-1 max-h-32 overflow-auto">
                    {getFailedImagesByType(activeTab).map((img, index) => (
                      <div key={index} className="text-xs text-red-700 font-mono">
                        {img.url.split('/').pop()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
            <div className="flex space-x-2">
              <button
                onClick={handleExportMappings}
                className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
              <label className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 flex items-center cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportMappings}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => {
                  if (confirm('Clear all mappings? This cannot be undone.')) {
                    clearAllMappings()
                    loadMappings()
                  }
                }}
                className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Clear All
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-buretto-secondary text-white rounded hover:bg-amber-600"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImageMappingModal