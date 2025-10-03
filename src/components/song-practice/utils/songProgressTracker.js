// Song progress tracker - calculate completion statistics

import {
  getSongLibrary,
  getSongProgress,
  getSongsInPracticeSet,
  getPracticeSets
} from './songStorage';

// Calculate overall progress across all songs
export const calculateOverallProgress = () => {
  const library = getSongLibrary();
  const progress = getSongProgress();

  const totalSongs = Object.keys(library).length;
  if (totalSongs === 0) {
    return {
      totalSongs: 0,
      completedSongs: 0,
      percentage: 0,
      byScale: {}
    };
  }

  let completedSongs = 0;
  const scaleProgress = {};

  Object.values(library).forEach(song => {
    const songProgress = progress[song.id];
    const isCompleted = songProgress && songProgress.bestVariant && songProgress.bestGrade;

    if (isCompleted) {
      completedSongs++;
    }

    // Track by scale
    const scale = song.variants[0]?.properties?.scale || 'Unknown';
    if (!scaleProgress[scale]) {
      scaleProgress[scale] = { total: 0, completed: 0, percentage: 0 };
    }

    scaleProgress[scale].total++;
    if (isCompleted) {
      scaleProgress[scale].completed++;
    }
  });

  // Calculate percentages
  Object.keys(scaleProgress).forEach(scale => {
    const stats = scaleProgress[scale];
    stats.percentage = stats.total > 0 ? stats.completed / stats.total : 0;
  });

  return {
    totalSongs,
    completedSongs,
    percentage: completedSongs / totalSongs,
    byScale: scaleProgress
  };
};

// Calculate progress for a specific practice set
export const calculatePracticeSetProgress = (setId) => {
  const songs = getSongsInPracticeSet(setId);
  const progress = getSongProgress();

  if (songs.length === 0) {
    return {
      totalSongs: 0,
      completedSongs: 0,
      percentage: 0,
      byScale: {}
    };
  }

  let completedSongs = 0;
  const scaleProgress = {};

  songs.forEach(song => {
    const songProgress = progress[song.id];
    const isCompleted = songProgress && songProgress.bestVariant && songProgress.bestGrade;

    if (isCompleted) {
      completedSongs++;
    }

    // Track by scale
    const scale = song.variants[0]?.properties?.scale || 'Unknown';
    if (!scaleProgress[scale]) {
      scaleProgress[scale] = { total: 0, completed: 0, percentage: 0 };
    }

    scaleProgress[scale].total++;
    if (isCompleted) {
      scaleProgress[scale].completed++;
    }
  });

  // Calculate percentages
  Object.keys(scaleProgress).forEach(scale => {
    const stats = scaleProgress[scale];
    stats.percentage = stats.total > 0 ? stats.completed / stats.total : 0;
  });

  return {
    totalSongs: songs.length,
    completedSongs,
    percentage: completedSongs / songs.length,
    byScale: scaleProgress
  };
};

// Get detailed progress for a specific song
export const getSongDetailedProgress = (songId) => {
  const library = getSongLibrary();
  const progress = getSongProgress();

  const song = library[songId];
  if (!song) return null;

  const songProgress = progress[songId];

  // Build variant progress details - need to do this even if no progress
  const variantProgress = {};

  song.variants.forEach(variant => {
    const variantId = variant.variantId;
    const variantData = songProgress?.variants?.[variantId];

    if (!variantData) {
      variantProgress[variantId] = {
        name: variant.name,
        bpmLevels: {
          50: null,
          75: null,
          100: null
        },
        bestBPM: 0,
        isCompleted: false
      };
    } else {
      const bpmLevels = {
        50: variantData.bpmLevels[50] || null,
        75: variantData.bpmLevels[75] || null,
        100: variantData.bpmLevels[100] || null
      };

      // Find best BPM for this variant
      let bestBPM = 0;
      [100, 75, 50].forEach(bpm => {
        if (bpmLevels[bpm] && bpmLevels[bpm].passed) {
          bestBPM = Math.max(bestBPM, bpm);
        }
      });

      variantProgress[variantId] = {
        name: variant.name,
        bpmLevels,
        bestBPM,
        isCompleted: bestBPM > 0
      };
    }
  });

  return {
    songId,
    title: song.title,
    isCompleted: songProgress?.bestVariant && songProgress?.bestGrade,
    bestVariant: songProgress?.bestVariant || null,
    bestBPM: songProgress?.bestBPM || 0,
    bestGrade: songProgress?.bestGrade || null,
    variantProgress,
    sessionCount: songProgress?.sessions?.length || 0,
    lastPlayed: songProgress?.sessions?.length > 0 ?
      songProgress.sessions[songProgress.sessions.length - 1].timestamp : null
  };
};

// Get progress summary for all practice sets
export const getAllPracticeSetsProgress = () => {
  const sets = getPracticeSets();
  const summaries = {};

  Object.keys(sets).forEach(setId => {
    summaries[setId] = {
      ...sets[setId],
      progress: calculatePracticeSetProgress(setId)
    };
  });

  return summaries;
};

// Get songs that are in progress (started but not completed)
export const getInProgressSongs = () => {
  const library = getSongLibrary();
  const progress = getSongProgress();

  return Object.values(library).filter(song => {
    const songProgress = progress[song.id];
    if (!songProgress) return false;

    const hasProgress = songProgress.sessions && songProgress.sessions.length > 0;
    const isCompleted = songProgress.bestVariant && songProgress.bestGrade;

    return hasProgress && !isCompleted;
  });
};

// Get recently played songs
export const getRecentlyPlayedSongs = (limit = 10) => {
  const library = getSongLibrary();
  const progress = getSongProgress();

  const songsWithTimestamps = Object.values(library)
    .map(song => {
      const songProgress = progress[song.id];
      if (!songProgress || !songProgress.sessions || songProgress.sessions.length === 0) {
        return null;
      }

      const lastSession = songProgress.sessions[songProgress.sessions.length - 1];
      return {
        song,
        lastPlayed: lastSession.timestamp
      };
    })
    .filter(item => item !== null)
    .sort((a, b) => b.lastPlayed - a.lastPlayed)
    .slice(0, limit);

  return songsWithTimestamps.map(item => item.song);
};

// Get recommended songs to practice (not completed, by difficulty)
export const getRecommendedSongs = (limit = 10) => {
  const library = getSongLibrary();
  const progress = getSongProgress();

  // Filter songs that aren't completed yet
  const incompleteSongs = Object.values(library).filter(song => {
    const songProgress = progress[song.id];
    const isCompleted = songProgress && songProgress.bestVariant && songProgress.bestGrade;
    return !isCompleted;
  });

  // Sort by complexity (easier songs first for recommendations)
  // Could be enhanced with more sophisticated recommendation algorithm
  return incompleteSongs
    .sort((a, b) => {
      const complexityA = calculateSongComplexity(a);
      const complexityB = calculateSongComplexity(b);
      return complexityA - complexityB;
    })
    .slice(0, limit);
};

// Calculate song complexity score (helper)
const calculateSongComplexity = (song) => {
  // Use properties from first (easiest) variant
  const variant = song.variants[0];
  if (!variant || !variant.properties) return 0.5;

  const props = variant.properties;

  let score = 0;

  // Octave range
  const octaveSpan = props.octaveRange[1] - props.octaveRange[0];
  score += Math.min(octaveSpan / 5, 1) * 0.3;

  // Note types
  const complexityByType = {
    'Single Notes': 0.1,
    'Intervals (One Hand)': 0.3,
    'Chords (One Hand)': 0.5,
    'Single Notes (Both Hands)': 0.4,
    'Intervals (Both Hands)': 0.7,
    'Multi-Notes (Both Hands)': 1.0
  };

  const maxTypeComplexity = Math.max(
    ...props.noteTypes.map(type => complexityByType[type] || 0.5)
  );
  score += maxTypeComplexity * 0.4;

  // Rhythm
  const rhythmComplexity = {
    'Quarter Notes': 0.1,
    'Mixed Simple': 0.3,
    'Mixed Complex': 0.7,
    'Syncopated': 1.0
  };

  const maxRhythmComplexity = Math.max(
    ...props.rhythmPatterns.map(pattern => rhythmComplexity[pattern] || 0.5)
  );
  score += maxRhythmComplexity * 0.3;

  return Math.min(score, 1);
};

// Get achievement statistics
export const getAchievementStats = () => {
  const library = getSongLibrary();
  const progress = getSongProgress();

  const stats = {
    totalSongs: Object.keys(library).length,
    completedSongs: 0,
    perfectScores: 0, // A+ grades
    totalSessions: 0,
    longestStreak: 0,
    favoriteScale: null,
    scaleStats: {}
  };

  Object.values(library).forEach(song => {
    const songProgress = progress[song.id];
    if (!songProgress) return;

    // Count sessions
    stats.totalSessions += songProgress.sessions?.length || 0;

    // Check completion
    if (songProgress.bestVariant && songProgress.bestGrade) {
      stats.completedSongs++;

      if (songProgress.bestGrade === 'A+') {
        stats.perfectScores++;
      }
    }

    // Track by scale
    const scale = song.variants[0]?.properties?.scale || 'Unknown';
    if (!stats.scaleStats[scale]) {
      stats.scaleStats[scale] = 0;
    }
    if (songProgress.bestVariant) {
      stats.scaleStats[scale]++;
    }
  });

  // Find favorite scale (most completed songs)
  let maxCompleted = 0;
  Object.entries(stats.scaleStats).forEach(([scale, count]) => {
    if (count > maxCompleted) {
      maxCompleted = count;
      stats.favoriteScale = scale;
    }
  });

  return stats;
};

// Export progress data for analysis/backup
export const exportProgressData = () => {
  return {
    overall: calculateOverallProgress(),
    practiceSets: getAllPracticeSetsProgress(),
    achievements: getAchievementStats(),
    exportDate: new Date().toISOString()
  };
};
