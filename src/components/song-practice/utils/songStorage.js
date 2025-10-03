// Storage utilities for song practice tool - songs, progress, and practice sets

const STORAGE_KEYS = {
  SONG_LIBRARY: 'songPractice_library',
  SONG_PROGRESS: 'songPractice_progress',
  PRACTICE_SETS: 'songPractice_sets'
};

// ==================== Song Library Management ====================

// Get all songs from library
export const getSongLibrary = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SONG_LIBRARY);
    return stored ? JSON.parse(stored) : getDefaultSongLibrary();
  } catch (error) {
    console.error('Failed to load song library:', error);
    return getDefaultSongLibrary();
  }
};

// Save entire song library
export const saveSongLibrary = (library) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SONG_LIBRARY, JSON.stringify(library));
    return true;
  } catch (error) {
    console.error('Failed to save song library:', error);
    return false;
  }
};

// Add a single song to library
export const addSong = (song) => {
  const library = getSongLibrary();
  const songId = song.id || generateSongId(song.title);

  const newSong = {
    ...song,
    id: songId,
    dateAdded: new Date().toISOString()
  };

  library[songId] = newSong;
  saveSongLibrary(library);
  return songId;
};

// Add multiple songs (bulk import)
export const addSongs = (songs) => {
  const library = getSongLibrary();
  const addedIds = [];

  songs.forEach(song => {
    const songId = song.id || generateSongId(song.title);
    library[songId] = {
      ...song,
      id: songId,
      dateAdded: new Date().toISOString()
    };
    addedIds.push(songId);
  });

  saveSongLibrary(library);
  return addedIds;
};

// Get a specific song by ID
export const getSong = (songId) => {
  const library = getSongLibrary();
  return library[songId] || null;
};

// Update a song
export const updateSong = (songId, updates) => {
  const library = getSongLibrary();
  if (library[songId]) {
    library[songId] = {
      ...library[songId],
      ...updates,
      dateModified: new Date().toISOString()
    };
    saveSongLibrary(library);
    return true;
  }
  return false;
};

// Delete a song
export const deleteSong = (songId) => {
  const library = getSongLibrary();
  if (library[songId]) {
    delete library[songId];
    saveSongLibrary(library);

    // Also clean up progress for this song
    const progress = getSongProgress();
    if (progress[songId]) {
      delete progress[songId];
      saveSongProgress(progress);
    }

    return true;
  }
  return false;
};

// Generate unique song ID from title
const generateSongId = (title) => {
  const base = title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${base}-${timestamp}-${random}`;
};

// ==================== Progress Tracking ====================

// Get all song progress
export const getSongProgress = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SONG_PROGRESS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load song progress:', error);
    return {};
  }
};

// Save all song progress
export const saveSongProgress = (progress) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SONG_PROGRESS, JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Failed to save song progress:', error);
    return false;
  }
};

// Record a completed song session
export const recordSongSession = (songId, variantId, bpmPercent, results) => {
  const progress = getSongProgress();

  if (!progress[songId]) {
    progress[songId] = {
      variants: {},
      bestVariant: null,
      bestBPM: 0,
      bestGrade: null,
      sessions: []
    };
  }

  if (!progress[songId].variants[variantId]) {
    progress[songId].variants[variantId] = {
      bpmLevels: {}
    };
  }

  // Store session result for this variant + BPM combination
  const currentBest = progress[songId].variants[variantId].bpmLevels[bpmPercent];
  const passed = results.passed;
  const grade = results.grade || 'F';

  if (!currentBest || results.overallScore > currentBest.overallScore) {
    progress[songId].variants[variantId].bpmLevels[bpmPercent] = {
      overallScore: results.overallScore,
      noteAccuracy: results.noteAccuracy,
      grade,
      passed,
      date: new Date().toISOString()
    };
  }

  // Update overall song progress (highest variant at highest BPM)
  updateOverallSongProgress(progress[songId], songId);

  // Add to session history (keep last 20)
  progress[songId].sessions.push({
    timestamp: Date.now(),
    variantId,
    bpmPercent,
    results: {
      overallScore: results.overallScore,
      noteAccuracy: results.noteAccuracy,
      grade,
      passed
    }
  });

  if (progress[songId].sessions.length > 20) {
    progress[songId].sessions = progress[songId].sessions.slice(-20);
  }

  saveSongProgress(progress);
  return true;
};

// Update overall song progress based on highest variant/BPM passed
const updateOverallSongProgress = (songProgress, songId) => {
  const song = getSong(songId);
  if (!song) return;

  // Find the hardest variant with a passing grade at the highest BPM
  const variantOrder = song.variants.map(v => v.variantId);
  let bestVariantIndex = -1;
  let bestBPM = 0;
  let bestGrade = null;

  // Start from hardest variant and work backwards
  for (let i = variantOrder.length - 1; i >= 0; i--) {
    const variantId = variantOrder[i];
    const variantProgress = songProgress.variants[variantId];

    if (variantProgress) {
      // Check BPM levels from highest to lowest
      const bpmLevels = [100, 75, 50];
      for (const bpm of bpmLevels) {
        const level = variantProgress.bpmLevels[bpm];
        if (level && level.passed) {
          if (i > bestVariantIndex || (i === bestVariantIndex && bpm > bestBPM)) {
            bestVariantIndex = i;
            bestBPM = bpm;
            bestGrade = level.grade;
          }
        }
      }
    }
  }

  if (bestVariantIndex >= 0) {
    songProgress.bestVariant = variantOrder[bestVariantIndex];
    songProgress.bestBPM = bestBPM;
    songProgress.bestGrade = bestGrade;
  }
};

// Get progress for a specific song
export const getSongProgressById = (songId) => {
  const progress = getSongProgress();
  return progress[songId] || null;
};

// Get best result for a specific song variant + BPM
export const getBestResult = (songId, variantId, bpmPercent) => {
  const progress = getSongProgress();
  return progress[songId]?.variants[variantId]?.bpmLevels[bpmPercent] || null;
};

// ==================== Practice Sets Management ====================

// Get all practice sets
export const getPracticeSets = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.PRACTICE_SETS);
    return stored ? JSON.parse(stored) : getDefaultPracticeSets();
  } catch (error) {
    console.error('Failed to load practice sets:', error);
    return getDefaultPracticeSets();
  }
};

// Save all practice sets
export const savePracticeSets = (sets) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRACTICE_SETS, JSON.stringify(sets));
    return true;
  } catch (error) {
    console.error('Failed to save practice sets:', error);
    return false;
  }
};

// Create a new practice set
export const createPracticeSet = (name, tagFilters, description = '') => {
  const sets = getPracticeSets();
  const setId = generatePracticeSetId(name);

  sets[setId] = {
    id: setId,
    name,
    tagFilters, // Array of required tags
    description,
    dateCreated: new Date().toISOString()
  };

  savePracticeSets(sets);
  return setId;
};

// Update a practice set
export const updatePracticeSet = (setId, updates) => {
  const sets = getPracticeSets();
  if (sets[setId]) {
    sets[setId] = {
      ...sets[setId],
      ...updates,
      dateModified: new Date().toISOString()
    };
    savePracticeSets(sets);
    return true;
  }
  return false;
};

// Delete a practice set
export const deletePracticeSet = (setId) => {
  const sets = getPracticeSets();
  if (sets[setId] && !sets[setId].isDefault) {
    delete sets[setId];
    savePracticeSets(sets);
    return true;
  }
  return false; // Can't delete default sets
};

// Generate practice set ID
const generatePracticeSetId = (name) => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
};

// Get songs in a practice set
export const getSongsInPracticeSet = (setId) => {
  const sets = getPracticeSets();
  const set = sets[setId];
  if (!set) return [];

  const library = getSongLibrary();
  const tagFilters = set.tagFilters || [];

  return Object.values(library).filter(song => {
    // Song must have all required tags
    return tagFilters.every(tag => song.tags && song.tags.includes(tag));
  });
};

// Calculate completion percentage for a practice set
export const calculatePracticeSetCompletion = (setId) => {
  const songs = getSongsInPracticeSet(setId);
  if (songs.length === 0) return { total: 0, completed: 0, percentage: 0 };

  const progress = getSongProgress();
  const completedCount = songs.filter(song => {
    const songProgress = progress[song.id];
    return songProgress && songProgress.bestVariant && songProgress.bestGrade;
  }).length;

  return {
    total: songs.length,
    completed: completedCount,
    percentage: completedCount / songs.length
  };
};

// Calculate completion by scale for a practice set
export const calculatePracticeSetCompletionByScale = (setId) => {
  const songs = getSongsInPracticeSet(setId);
  const progress = getSongProgress();

  const scaleStats = {};

  songs.forEach(song => {
    // Get scale from first variant (assuming all variants share same scale)
    const scale = song.variants[0]?.properties?.scale || 'Unknown';

    if (!scaleStats[scale]) {
      scaleStats[scale] = { total: 0, completed: 0, percentage: 0 };
    }

    scaleStats[scale].total++;

    const songProgress = progress[song.id];
    if (songProgress && songProgress.bestVariant && songProgress.bestGrade) {
      scaleStats[scale].completed++;
    }
  });

  // Calculate percentages
  Object.keys(scaleStats).forEach(scale => {
    const stats = scaleStats[scale];
    stats.percentage = stats.total > 0 ? stats.completed / stats.total : 0;
  });

  return scaleStats;
};

// ==================== Default Data ====================

// Default song library (empty initially, will be populated with built-in songs)
const getDefaultSongLibrary = () => {
  return {};
};

// Default practice sets
const getDefaultPracticeSets = () => {
  return {
    'default-list': {
      id: 'default-list',
      name: 'Default Collection',
      tagFilters: ['default-list'],
      description: 'Built-in collection of practice songs',
      isDefault: true,
      dateCreated: new Date().toISOString()
    }
  };
};

// ==================== Filtering & Search ====================

// Filter songs by criteria
export const filterSongs = (filters = {}) => {
  const library = getSongLibrary();
  const songs = Object.values(library);

  return songs.filter(song => {
    // Filter by tags (AND logic - song must have ALL specified tags)
    if (filters.tags && filters.tags.length > 0) {
      const hasAllTags = filters.tags.every(tag => song.tags && song.tags.includes(tag));
      if (!hasAllTags) return false;
    }

    // Filter by search text (title or artist)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const titleMatch = song.title.toLowerCase().includes(searchLower);
      const artistMatch = song.artist && song.artist.toLowerCase().includes(searchLower);
      if (!titleMatch && !artistMatch) return false;
    }

    // Filter by properties (ANY variant must match)
    if (filters.scale || filters.octaveRange || filters.noteTypes || filters.rhythmPatterns) {
      const hasMatchingVariant = song.variants.some(variant => {
        const props = variant.properties;

        if (filters.scale && props.scale !== filters.scale) return false;

        if (filters.octaveRange) {
          const [minOctave, maxOctave] = filters.octaveRange;
          if (props.octaveRange[0] < minOctave || props.octaveRange[1] > maxOctave) {
            return false;
          }
        }

        if (filters.noteTypes && filters.noteTypes.length > 0) {
          const hasType = filters.noteTypes.some(type => props.noteTypes.includes(type));
          if (!hasType) return false;
        }

        if (filters.rhythmPatterns && filters.rhythmPatterns.length > 0) {
          const hasPattern = filters.rhythmPatterns.some(pattern =>
            props.rhythmPatterns.includes(pattern)
          );
          if (!hasPattern) return false;
        }

        return true;
      });

      if (!hasMatchingVariant) return false;
    }

    return true;
  });
};

// Get all unique tags from library
export const getAllTags = () => {
  const library = getSongLibrary();
  const tagSet = new Set();

  Object.values(library).forEach(song => {
    if (song.tags) {
      song.tags.forEach(tag => tagSet.add(tag));
    }
  });

  return Array.from(tagSet).sort();
};

// Get all unique artists from library
export const getAllArtists = () => {
  const library = getSongLibrary();
  const artistSet = new Set();

  Object.values(library).forEach(song => {
    if (song.artist) {
      artistSet.add(song.artist);
    }
  });

  return Array.from(artistSet).sort();
};

// ==================== Data Management ====================

// Clear all song data (for testing/reset)
export const clearAllSongData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SONG_LIBRARY);
    localStorage.removeItem(STORAGE_KEYS.SONG_PROGRESS);
    localStorage.removeItem(STORAGE_KEYS.PRACTICE_SETS);
    return true;
  } catch (error) {
    console.error('Failed to clear song data:', error);
    return false;
  }
};

// Export data for backup
export const exportSongData = () => {
  return {
    library: getSongLibrary(),
    progress: getSongProgress(),
    practiceSets: getPracticeSets(),
    exportDate: new Date().toISOString()
  };
};

// Import data from backup
export const importSongData = (data) => {
  try {
    if (data.library) saveSongLibrary(data.library);
    if (data.progress) saveSongProgress(data.progress);
    if (data.practiceSets) savePracticeSets(data.practiceSets);
    return true;
  } catch (error) {
    console.error('Failed to import song data:', error);
    return false;
  }
};
