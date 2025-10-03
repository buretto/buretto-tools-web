import React, { useState, useEffect } from 'react';
import { Music, Filter, Search, TrendingUp, Award, Clock, Settings, Download } from 'lucide-react';
import { filterSongs, getAllTags, getPracticeSets } from './utils/songStorage';
import { getSongDetailedProgress, calculatePracticeSetProgress } from './utils/songProgressTracker';

const SongLibrary = ({ onSongSelected, onOpenImporter, onManageSets }) => {
  const [songs, setSongs] = useState([]);
  const [selectedPracticeSet, setSelectedPracticeSet] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [propertyFilters, setPropertyFilters] = useState({
    scale: null,
    noteTypes: [],
    rhythmPatterns: []
  });
  const [practiceSetStats, setPracticeSetStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [practiceSets, setPracticeSets] = useState({});

  // Load practice sets and tags
  useEffect(() => {
    const sets = getPracticeSets();
    setPracticeSets(sets);
    setAvailableTags(getAllTags());
  }, []);

  // Update filtered songs when filters change
  useEffect(() => {
    updateFilteredSongs();
  }, [selectedPracticeSet, searchText, propertyFilters]);

  const updateFilteredSongs = () => {
    const filters = {
      search: searchText,
      ...propertyFilters
    };

    // Add practice set tag filter
    if (selectedPracticeSet !== 'all') {
      const practiceSet = practiceSets[selectedPracticeSet];
      if (practiceSet && practiceSet.tagFilters) {
        filters.tags = practiceSet.tagFilters;
      }
    }

    const filtered = filterSongs(filters);
    setSongs(filtered);

    // Update practice set stats
    if (selectedPracticeSet !== 'all') {
      const stats = calculatePracticeSetProgress(selectedPracticeSet);
      setPracticeSetStats(stats);
    } else {
      setPracticeSetStats(null);
    }
  };

  const handleSongClick = (song, variant, bpmPercent) => {
    onSongSelected(song, variant, bpmPercent);
  };

  const handlePropertyFilterChange = (filterType, value) => {
    setPropertyFilters(prev => {
      if (filterType === 'scale') {
        return { ...prev, scale: prev.scale === value ? null : value };
      } else if (filterType === 'noteTypes' || filterType === 'rhythmPatterns') {
        const currentArray = prev[filterType];
        const newArray = currentArray.includes(value)
          ? currentArray.filter(v => v !== value)
          : [...currentArray, value];
        return { ...prev, [filterType]: newArray };
      }
      return prev;
    });
  };

  const clearFilters = () => {
    setSearchText('');
    setPropertyFilters({
      scale: null,
      noteTypes: [],
      rhythmPatterns: []
    });
  };

  const hasActiveFilters = searchText || propertyFilters.scale ||
    propertyFilters.noteTypes.length > 0 || propertyFilters.rhythmPatterns.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-buretto-primary">Song Library</h2>
          <p className="text-sm text-buretto-accent">
            {songs.length} song{songs.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onManageSets}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Settings size={16} />
            <span>Manage Sets</span>
          </button>
          <button
            onClick={onOpenImporter}
            className="flex items-center space-x-2 px-4 py-2 bg-buretto-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors"
          >
            <Download size={16} />
            <span>Import Songs</span>
          </button>
        </div>
      </div>

      {/* Practice Set Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-buretto-primary mb-2">
          Practice Set
        </label>
        <select
          value={selectedPracticeSet}
          onChange={(e) => setSelectedPracticeSet(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary"
        >
          <option value="all">All Songs</option>
          {Object.values(practiceSets).map(set => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>

        {/* Practice Set Stats */}
        {practiceSetStats && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800">Progress</span>
              <span className="text-sm text-blue-600">
                {practiceSetStats.completed}/{practiceSetStats.total} songs
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${practiceSetStats.percentage * 100}%` }}
              />
            </div>

            {/* By Scale */}
            {Object.keys(practiceSetStats.byScale).length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="text-xs font-medium text-blue-800 mb-1">By Scale:</div>
                {Object.entries(practiceSetStats.byScale).map(([scale, stats]) => (
                  <div key={scale} className="text-xs text-blue-700 flex justify-between">
                    <span>{scale}:</span>
                    <span>{Math.round(stats.percentage * 100)}% ({stats.completed}/{stats.total})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by title or artist..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-buretto-secondary"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 text-sm text-buretto-accent hover:text-buretto-primary transition-colors"
          >
            <Filter size={16} />
            <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-red-600 hover:text-red-700 transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Property Filters */}
        {showFilters && (
          <div className="space-y-3 pt-3 border-t border-gray-200">
            {/* Scale Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Scale</label>
              <div className="flex flex-wrap gap-2">
                {['C', 'F', 'G', 'D', 'A', 'E', 'B', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].map(scale => (
                  <button
                    key={scale}
                    onClick={() => handlePropertyFilterChange('scale', scale)}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      propertyFilters.scale === scale
                        ? 'bg-buretto-secondary text-white border-buretto-secondary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-buretto-secondary'
                    }`}
                  >
                    {scale}
                  </button>
                ))}
              </div>
            </div>

            {/* Note Types Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Note Types</label>
              <div className="flex flex-wrap gap-2">
                {['Single Notes', 'Intervals (One Hand)', 'Chords (One Hand)', 'Single Notes (Both Hands)', 'Intervals (Both Hands)', 'Multi-Notes (Both Hands)'].map(type => (
                  <button
                    key={type}
                    onClick={() => handlePropertyFilterChange('noteTypes', type)}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      propertyFilters.noteTypes.includes(type)
                        ? 'bg-buretto-secondary text-white border-buretto-secondary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-buretto-secondary'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Rhythm Patterns Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Rhythm Patterns</label>
              <div className="flex flex-wrap gap-2">
                {['Quarter Notes', 'Mixed Simple', 'Mixed Complex', 'Syncopated'].map(pattern => (
                  <button
                    key={pattern}
                    onClick={() => handlePropertyFilterChange('rhythmPatterns', pattern)}
                    className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                      propertyFilters.rhythmPatterns.includes(pattern)
                        ? 'bg-buretto-secondary text-white border-buretto-secondary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-buretto-secondary'
                    }`}
                  >
                    {pattern}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Songs List */}
      {songs.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Songs Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            {hasActiveFilters
              ? 'Try adjusting your filters or search terms'
              : 'Import some songs to get started'}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={onOpenImporter}
              className="px-4 py-2 bg-buretto-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors"
            >
              Import Songs
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {songs.map(song => (
            <SongCard
              key={song.id}
              song={song}
              onSelectVariant={handleSongClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Song Card Component
const SongCard = ({ song, onSelectVariant }) => {
  const [expandedVariant, setExpandedVariant] = useState(null);
  const songProgress = getSongDetailedProgress(song.id);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-buretto-secondary transition-colors">
      {/* Song Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-buretto-primary">{song.title}</h3>
          {song.artist && (
            <p className="text-sm text-gray-600">{song.artist}</p>
          )}
          {song.tags && song.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {song.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Progress Indicator */}
        {songProgress.isCompleted && (
          <div className="flex items-center space-x-2 text-green-600">
            <Award size={20} />
            <div className="text-right">
              <div className="text-sm font-semibold">{songProgress.bestGrade}</div>
              <div className="text-xs">at {songProgress.bestBPM}% BPM</div>
            </div>
          </div>
        )}
      </div>

      {/* Variants */}
      <div className="space-y-2">
        {song.variants.map(variant => {
          const variantProgress = songProgress.variantProgress[variant.variantId];
          const isExpanded = expandedVariant === variant.variantId;

          return (
            <div key={variant.variantId} className="border border-gray-200 rounded-lg">
              {/* Variant Header */}
              <button
                onClick={() => setExpandedVariant(isExpanded ? null : variant.variantId)}
                className="w-full px-3 py-2 flex justify-between items-center hover:bg-gray-50 transition-colors rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-buretto-primary">{variant.name}</span>
                  {variantProgress.isCompleted && (
                    <span className="text-xs text-green-600 flex items-center">
                      <Award size={12} className="mr-1" />
                      Best: {variantProgress.bestBPM}%
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{variant.properties.scale}</span>
                  <span>•</span>
                  <span>{variant.properties.originalBPM} BPM</span>
                  <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* BPM Levels */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-2">
                  <div className="text-xs text-gray-600 mb-2">
                    <div><strong>Scale:</strong> {variant.properties.scale}</div>
                    <div><strong>Range:</strong> {variant.properties.octaveRange[0]} - {variant.properties.octaveRange[1]}</div>
                    <div><strong>Note Types:</strong> {variant.properties.noteTypes.join(', ')}</div>
                    <div><strong>Rhythm:</strong> {variant.properties.rhythmPatterns.join(', ')}</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[50, 75, 100].map(bpm => {
                      const bpmResult = variantProgress.bpmLevels[bpm];
                      const actualBPM = Math.round(variant.properties.originalBPM * bpm / 100);

                      return (
                        <button
                          key={bpm}
                          onClick={() => onSelectVariant(song, variant, bpm)}
                          className={`px-3 py-2 rounded-lg border-2 text-sm transition-colors ${
                            bpmResult && bpmResult.passed
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-buretto-secondary'
                          }`}
                        >
                          <div className="font-medium">{bpm}%</div>
                          <div className="text-xs opacity-75">{actualBPM} BPM</div>
                          {bpmResult && (
                            <div className="text-xs font-semibold mt-1">
                              {bpmResult.grade}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SongLibrary;
