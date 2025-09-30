// Storage utilities for sight reading tool results and progress

const STORAGE_KEYS = {
  RESULTS_HISTORY: 'sightReading_results_history',
  UNLOCKED_LEVELS: 'sightReading_unlocked_levels',
  SESSION_RECORDS: 'sightReading_session_records'
};

// Generate a unique key for a deck configuration
export const generateDeckKey = (deck) => {
  return `${deck.scale}-${deck.practiceType}-${deck.difficulty}-${deck.rhythmPattern}-${deck.bpm}`;
};

// Generate a key for unlock tracking (scale + practice type)
export const generateUnlockKey = (scale, practiceType) => {
  return `${scale}-${practiceType}`;
};

// Save a completed session result to history
export const saveSessionResult = (deck, results) => {
  try {
    const history = getResultsHistory();
    const deckKey = generateDeckKey(deck);
    const timestamp = Date.now();

    const sessionData = {
      id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
      timestamp,
      date: new Date().toISOString(),
      deck: {
        scale: deck.scale,
        practiceType: deck.practiceType,
        practiceTypeName: deck.practiceTypeName,
        difficulty: deck.difficulty,
        difficultyName: deck.difficultyName,
        rhythmPattern: deck.rhythmPattern,
        bpm: deck.bpm,
        goal: deck.goal
      },
      results: {
        notesReached: results.notesReached,
        noteAccuracy: results.noteAccuracy,
        timingMetrics: results.timingMetrics,
        longestStreak: results.longestStreak,
        overallScore: results.overallScore,
        performedBPM: results.performedBPM,
        sessionDuration: results.sessionDuration,
        passed: results.noteAccuracy >= (deck.goal?.accuracy || 0.85) &&
               results.notesReached >= (deck.goal?.beats || 80)
      }
    };

    if (!history[deckKey]) {
      history[deckKey] = [];
    }

    history[deckKey].push(sessionData);

    // Keep only last 50 sessions per deck to avoid storage bloat
    if (history[deckKey].length > 50) {
      history[deckKey] = history[deckKey].slice(-50);
    }

    localStorage.setItem(STORAGE_KEYS.RESULTS_HISTORY, JSON.stringify(history));
    return true;
  } catch (error) {
    console.error('Failed to save session result:', error);
    return false;
  }
};

// Get all results history
export const getResultsHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RESULTS_HISTORY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load results history:', error);
    return {};
  }
};

// Get results for a specific deck configuration
export const getDeckResults = (deck) => {
  const history = getResultsHistory();
  const deckKey = generateDeckKey(deck);
  return history[deckKey] || [];
};

// Get the highest score for a specific deck
export const getHighScore = (deck) => {
  const results = getDeckResults(deck);
  if (results.length === 0) return null;

  return results.reduce((highest, session) => {
    const currentScore = session.results.overallScore;
    return currentScore > highest.score ?
      { score: currentScore, session } :
      highest;
  }, { score: -1, session: null }).session;
};

// Get the best performance for each metric for a deck
export const getBestMetrics = (deck) => {
  const results = getDeckResults(deck);
  if (results.length === 0) return null;

  return results.reduce((best, session) => {
    const r = session.results;
    return {
      bestNotesReached: Math.max(best.bestNotesReached || 0, r.notesReached),
      bestNoteAccuracy: Math.max(best.bestNoteAccuracy || 0, r.noteAccuracy),
      bestTimingAccuracy: Math.max(best.bestTimingAccuracy || 0, r.timingMetrics.timingAccuracy),
      bestTimingPrecision: Math.max(best.bestTimingPrecision || 0, r.timingMetrics.timingPrecision),
      bestOverallScore: Math.max(best.bestOverallScore || 0, r.overallScore),
      dates: {
        notesReached: r.notesReached === (best.bestNotesReached || 0) ? session.date : best.dates?.notesReached,
        noteAccuracy: r.noteAccuracy === (best.bestNoteAccuracy || 0) ? session.date : best.dates?.noteAccuracy,
        timingAccuracy: r.timingMetrics.timingAccuracy === (best.bestTimingAccuracy || 0) ? session.date : best.dates?.timingAccuracy,
        timingPrecision: r.timingMetrics.timingPrecision === (best.bestTimingPrecision || 0) ? session.date : best.dates?.timingPrecision,
        overallScore: r.overallScore === (best.bestOverallScore || 0) ? session.date : best.dates?.overallScore
      }
    };
  }, {});
};

// Session storage for unlocked levels (resets on page refresh)
export const saveUnlockedLevels = (unlockedLevels) => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.UNLOCKED_LEVELS, JSON.stringify(unlockedLevels));
  } catch (error) {
    console.error('Failed to save unlocked levels:', error);
  }
};

export const getUnlockedLevels = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.UNLOCKED_LEVELS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load unlocked levels:', error);
    return {};
  }
};

// Session storage for current session records
export const saveSessionRecords = (sessionRecords) => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_RECORDS, JSON.stringify(sessionRecords));
  } catch (error) {
    console.error('Failed to save session records:', error);
  }
};

export const getSessionRecords = () => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEYS.SESSION_RECORDS);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load session records:', error);
    return {};
  }
};

// Calculate mastery percentage for a given scale and practice type
export const calculateMasteryPercentage = (scale, practiceType) => {
  const history = getResultsHistory();
  const unlockKey = generateUnlockKey(scale, practiceType);

  // Generate all possible deck keys for this scale/practice type combination
  const rhythmPatterns = ['quarter-notes', 'mixed-simple', 'mixed-complex', 'syncopated'];
  const bpmOptions = [30, 50, 80, 120];
  const difficulties = ['half-octave', 'full-octave', 'full-scale'];

  let totalCombinations = 0;
  let passedCombinations = 0;

  rhythmPatterns.forEach(rhythm => {
    bpmOptions.forEach(bpm => {
      difficulties.forEach(difficulty => {
        totalCombinations++;

        const deckKey = `${scale}-${practiceType}-${difficulty}-${rhythm}-${bpm}`;
        const deckResults = history[deckKey] || [];

        // Check if any session in this deck was passed
        const hasPassed = deckResults.some(session => session.results.passed);
        if (hasPassed) {
          passedCombinations++;
        }
      });
    });
  });

  return totalCombinations > 0 ? (passedCombinations / totalCombinations) : 0;
};

// Get chart data for historical performance
export const getPerformanceChartData = (deck, metric = 'overallScore') => {
  const results = getDeckResults(deck);
  if (results.length === 0) return [];

  return results
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((session, index) => {
      const value = metric === 'performedBPM' ?
        session.results.performedBPM :
        metric.includes('.') ?
          metric.split('.').reduce((obj, key) => obj?.[key], session.results) :
          session.results[metric];

      return {
        session: index + 1,
        date: new Date(session.date).toLocaleDateString(),
        value: value || 0,
        timestamp: session.timestamp
      };
    });
};

// Clear all stored data (for reset functionality)
export const clearAllData = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.RESULTS_HISTORY);
    sessionStorage.removeItem(STORAGE_KEYS.UNLOCKED_LEVELS);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_RECORDS);
    return true;
  } catch (error) {
    console.error('Failed to clear data:', error);
    return false;
  }
};

// Check if session storage warning should be shown
export const shouldShowSessionWarning = () => {
  const unlockedLevels = getUnlockedLevels();
  return Object.keys(unlockedLevels).length > 0;
};