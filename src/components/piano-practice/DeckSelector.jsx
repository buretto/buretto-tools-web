import React, { useState, useEffect } from 'react';
import { Lock, Unlock, RotateCcw, TrendingUp, History, Award } from 'lucide-react';
import { calculateMasteryPercentage, getHighScore, getResultsHistory } from './utils/resultsStorage';
import PastResultsModal from './PastResultsModal';

const SCALES = [
  'C', 'F', 'G', 'D', 'A', 'E', 'B',
  'Bb', 'Eb', 'Ab', 'Db', 'Gb'
];

const PRACTICE_TYPES = [
  { id: 'single-notes', name: 'Single Notes', description: 'One note at a time', supportsInversions: false, needsIntervalSelection: false },
  { id: 'intervals-basic', name: 'Intervals (Basic)', description: 'Build up from 2nds to Octaves', supportsInversions: false, needsIntervalSelection: true, intervalType: 'basic' },
  { id: 'triads', name: 'Triads', description: 'Three-note chords from scale', supportsInversions: true, needsIntervalSelection: false },
  { id: 'sevenths', name: '7th Chords', description: 'Four-note seventh chords', supportsInversions: true, needsIntervalSelection: false },
  { id: 'intervals-advanced', name: 'Intervals (Advanced)', description: 'Build up from 6ths to 10ths', supportsInversions: false, needsIntervalSelection: true, intervalType: 'advanced' }
];

const INVERSION_OPTIONS = [
  { id: 'root', name: 'Root Position', description: 'Root note in bass', level: 1 },
  { id: 'first', name: '1st Inversion', description: '3rd in bass', level: 2 },
  { id: 'second', name: '2nd Inversion', description: '5th in bass', level: 3 },
  { id: 'third', name: '3rd Inversion', description: '7th in bass (7th chords only)', level: 4 }
];

const HAND_OPTIONS = [
  { id: 'left', name: 'Left Hand Only', description: 'Bass clef only' },
  { id: 'right', name: 'Right Hand Only', description: 'Treble clef only' },
  { id: 'both', name: 'Both Hands', description: 'Both clefs' }
];

const SIMULTANEOUS_PLAY_OPTIONS = [
  { id: 'single-notes', name: 'Single Notes', description: 'Add single notes in other hand', level: 1 },
  { id: 'intervals', name: 'Intervals', description: 'Add intervals in other hand', level: 2 },
  { id: 'chords', name: 'Chords', description: 'Add chords in other hand', level: 3 }
];

const INTERVAL_BASIC_OPTIONS = [
  { id: '2nd', name: '2nds', description: 'Second intervals', degree: 1, level: 1 },
  { id: '3rd', name: '3rds', description: 'Third intervals', degree: 2, level: 2 },
  { id: '4th', name: '4ths', description: 'Fourth intervals', degree: 3, level: 3 },
  { id: '5th', name: '5ths', description: 'Fifth intervals', degree: 4, level: 4 },
  { id: 'octave', name: 'Octaves', description: 'Octave intervals', degree: 7, level: 5 }
];

const INTERVAL_ADVANCED_OPTIONS = [
  { id: '6th', name: '6ths', description: 'Sixth intervals', degree: 5, level: 1 },
  { id: '7th', name: '7ths', description: 'Seventh intervals', degree: 6, level: 2 },
  { id: '9th', name: '9ths', description: 'Ninth intervals', degree: 8, level: 3 },
  { id: '10th', name: '10ths', description: 'Tenth intervals', degree: 9, level: 4 }
];

const DIFFICULTY_LEVELS = [
  { id: 'half-octave', name: 'Half Octave', range: 4 },
  { id: 'full-octave', name: 'Full Octave', range: 8 },
  { id: 'full-scale', name: 'Full Scale', range: 15 }
];

const RHYTHM_PATTERNS = [
  { id: 'quarter-notes', name: 'Quarter Notes', description: 'Steady quarter note rhythm' },
  { id: 'mixed-simple', name: 'Mixed Simple', description: 'Quarter and half notes' },
  { id: 'mixed-complex', name: 'Mixed Complex', description: 'Varied note durations' },
  { id: 'syncopated', name: 'Syncopated', description: 'Dotted rhythms and syncopation' }
];

const BPM_OPTIONS = [
  { id: 'slow', bpm: 30, name: '30 BPM', description: 'Very slow, beginner tempo', goal: { beats: 27, accuracy: 0.9 } },
  { id: 'moderate', bpm: 50, name: '50 BPM', description: 'Slow, learning tempo', goal: { beats: 45, accuracy: 0.9 } },
  { id: 'medium', bpm: 80, name: '80 BPM', description: 'Medium tempo', goal: { beats: 72, accuracy: 0.9 } },
  { id: 'fast', bpm: 120, name: '120 BPM', description: 'Fast, performance tempo', goal: { beats: 108, accuracy: 0.9 } }
];

// Helper function to generate consistent deck keys for progress tracking
const generateDeckKey = (deck) => {
  const parts = [
    deck.scale,
    deck.practiceType,
    deck.difficulty,
  ];

  // Add inversion selection if applicable
  if (Array.isArray(deck.selectedInversions) && deck.selectedInversions.length > 0) {
    parts.push(deck.selectedInversions.sort().join('-'));
  }

  // Add interval selection if applicable
  if (Array.isArray(deck.selectedIntervals) && deck.selectedIntervals.length > 0) {
    parts.push(deck.selectedIntervals.sort().join('-'));
  }

  // Add hand setting
  parts.push(deck.hand || 'both');

  // Add simultaneous play if it's an array with items
  if (Array.isArray(deck.simultaneousPlay) && deck.simultaneousPlay.length > 0) {
    parts.push(deck.simultaneousPlay.sort().join('-'));
  } else if (deck.simultaneousPlay) {
    parts.push('none');
  }

  // Add rhythm pattern and BPM for sight reading
  if (deck.rhythmPattern) {
    parts.push(deck.rhythmPattern);
  }
  if (deck.bpm) {
    parts.push(deck.bpm.toString());
  }

  return parts.join('-');
};

const DeckSelector = ({ onDeckSelected, unlockedLevels, onResetSession, mode = 'flashcards' }) => {
  const [selectedScale, setSelectedScale] = useState(null);
  const [selectedPracticeType, setSelectedPracticeType] = useState(null);
  const [selectedInversions, setSelectedInversions] = useState([]);
  const [selectedIntervals, setSelectedIntervals] = useState([]);
  const [selectedHand, setSelectedHand] = useState(null);
  const [selectedSimultaneousPlay, setSelectedSimultaneousPlay] = useState([]);
  const [selectedRhythmPattern, setSelectedRhythmPattern] = useState(null);
  const [selectedBPM, setSelectedBPM] = useState(null);
  const [showPastResults, setShowPastResults] = useState(false);
  const [pastResultsDeck, setPastResultsDeck] = useState(null);

  // Per-practice-type memory for inversions and intervals
  const [practiceTypeMemory, setPracticeTypeMemory] = useState({});

  // Restore last settings from localStorage on mount
  useEffect(() => {
    const storageKey = `piano-practice-last-settings-${mode}`;
    const savedSettings = localStorage.getItem(storageKey);
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.selectedScale) setSelectedScale(settings.selectedScale);
        if (settings.selectedPracticeType) {
          const practiceType = PRACTICE_TYPES.find(pt => pt.id === settings.selectedPracticeType);
          if (practiceType) setSelectedPracticeType(practiceType);
        }
        if (settings.selectedInversions) setSelectedInversions(settings.selectedInversions);
        if (settings.selectedIntervals) setSelectedIntervals(settings.selectedIntervals);
        if (settings.selectedHand) {
          const hand = HAND_OPTIONS.find(h => h.id === settings.selectedHand);
          if (hand) setSelectedHand(hand);
        }
        if (settings.selectedSimultaneousPlay) setSelectedSimultaneousPlay(settings.selectedSimultaneousPlay);
        if (settings.selectedRhythmPattern) {
          const rhythm = RHYTHM_PATTERNS.find(r => r.id === settings.selectedRhythmPattern);
          if (rhythm) setSelectedRhythmPattern(rhythm);
        }
        if (settings.selectedBPM) {
          const bpm = BPM_OPTIONS.find(b => b.id === settings.selectedBPM);
          if (bpm) setSelectedBPM(bpm);
        }
        // Restore per-practice-type memory
        if (settings.practiceTypeMemory) setPracticeTypeMemory(settings.practiceTypeMemory);
      } catch (e) {
        console.error('Failed to restore settings:', e);
      }
    }
  }, [mode]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const storageKey = `piano-practice-last-settings-${mode}`;
    const settings = {
      selectedScale,
      selectedPracticeType: selectedPracticeType?.id || null,
      selectedInversions,
      selectedIntervals,
      selectedHand: selectedHand?.id || null,
      selectedSimultaneousPlay,
      selectedRhythmPattern: selectedRhythmPattern?.id || null,
      selectedBPM: selectedBPM?.id || null,
      practiceTypeMemory
    };
    localStorage.setItem(storageKey, JSON.stringify(settings));
  }, [mode, selectedScale, selectedPracticeType, selectedInversions, selectedIntervals, selectedHand, selectedSimultaneousPlay, selectedRhythmPattern, selectedBPM, practiceTypeMemory]);

  const handleScaleSelect = (scale) => {
    setSelectedScale(scale);
    // Don't reset other settings - let user keep their preferences
  };

  const handlePracticeTypeSelect = (practiceType) => {
    // Save current practice type's settings to memory before switching
    if (selectedPracticeType) {
      setPracticeTypeMemory(prev => ({
        ...prev,
        [selectedPracticeType.id]: {
          inversions: selectedInversions,
          intervals: selectedIntervals
        }
      }));
    }

    setSelectedPracticeType(practiceType);

    // Restore settings from memory for this practice type, if available
    const memory = practiceTypeMemory[practiceType.id];
    if (memory) {
      // Restore inversions if this practice type supports inversions
      if (practiceType.supportsInversions && memory.inversions) {
        setSelectedInversions(memory.inversions);
      } else {
        setSelectedInversions([]);
      }

      // Restore intervals if this practice type needs interval selection
      if (practiceType.needsIntervalSelection && memory.intervals) {
        setSelectedIntervals(memory.intervals);
      } else {
        setSelectedIntervals([]);
      }
    } else {
      // No memory - reset to defaults
      if (!practiceType.supportsInversions) {
        setSelectedInversions([]);
      }
      if (!practiceType.needsIntervalSelection) {
        setSelectedIntervals([]);
      }
    }

    // Don't reset hand, simultaneous play, rhythm, or BPM - let user keep preferences
  };

  const handleInversionToggle = (optionId) => {
    const option = INVERSION_OPTIONS.find(opt => opt.id === optionId);
    if (!option) return;

    setSelectedInversions(prev => {
      const isCurrentlySelected = prev.includes(optionId);

      if (isCurrentlySelected) {
        // Remove this option and all higher-level options
        return prev.filter(id => {
          const opt = INVERSION_OPTIONS.find(o => o.id === id);
          return opt.level < option.level;
        });
      } else {
        // Add this option and all lower-level options
        const newSelection = new Set(prev);
        INVERSION_OPTIONS.forEach(opt => {
          if (opt.level <= option.level) {
            newSelection.add(opt.id);
          }
        });
        return Array.from(newSelection);
      }
    });
  };

  const handleHandSelect = (hand) => {
    setSelectedHand(hand);
  };

  const handleIntervalToggle = (optionId) => {
    const intervalOptions = selectedPracticeType?.intervalType === 'basic'
      ? INTERVAL_BASIC_OPTIONS
      : INTERVAL_ADVANCED_OPTIONS;
    const option = intervalOptions.find(opt => opt.id === optionId);
    if (!option) return;

    setSelectedIntervals(prev => {
      const isCurrentlySelected = prev.includes(optionId);

      if (isCurrentlySelected) {
        // Remove this option and all higher-level options
        return prev.filter(id => {
          const opt = intervalOptions.find(o => o.id === id);
          return opt.level < option.level;
        });
      } else {
        // Add this option and all lower-level options
        const newSelection = new Set(prev);
        intervalOptions.forEach(opt => {
          if (opt.level <= option.level) {
            newSelection.add(opt.id);
          }
        });
        return Array.from(newSelection);
      }
    });
  };

  const handleSimultaneousPlayToggle = (optionId) => {
    const option = SIMULTANEOUS_PLAY_OPTIONS.find(opt => opt.id === optionId);
    if (!option) return;

    setSelectedSimultaneousPlay(prev => {
      const isCurrentlySelected = prev.includes(optionId);

      if (isCurrentlySelected) {
        // Remove this option and all higher-level options
        return prev.filter(id => {
          const opt = SIMULTANEOUS_PLAY_OPTIONS.find(o => o.id === id);
          return opt.level < option.level;
        });
      } else {
        // Add this option and all lower-level options
        const newSelection = new Set(prev);
        SIMULTANEOUS_PLAY_OPTIONS.forEach(opt => {
          if (opt.level <= option.level) {
            newSelection.add(opt.id);
          }
        });
        return Array.from(newSelection);
      }
    });
  };

  const handleRhythmPatternSelect = (rhythmPattern) => {
    setSelectedRhythmPattern(rhythmPattern);
    setSelectedBPM(null);
  };

  const handleBPMSelect = (bpmOption) => {
    setSelectedBPM(bpmOption);
  };

  const handleDifficultySelect = (difficulty, difficultyIndex) => {
    // Ensure first interval is always included for interval practice types
    let intervalsToUse = selectedIntervals;
    if (selectedPracticeType.needsIntervalSelection) {
      const intervalOptions = selectedPracticeType.intervalType === 'basic'
        ? INTERVAL_BASIC_OPTIONS
        : INTERVAL_ADVANCED_OPTIONS;
      const firstInterval = intervalOptions[0].id;
      if (!intervalsToUse.includes(firstInterval)) {
        intervalsToUse = [firstInterval, ...intervalsToUse];
      }
    }

    // Ensure first inversion (root) is always included for chord practice types
    let inversionsToUse = selectedInversions;
    if (selectedPracticeType.supportsInversions) {
      const firstInversion = INVERSION_OPTIONS[0].id; // 'root'
      if (!inversionsToUse.includes(firstInversion)) {
        inversionsToUse = [firstInversion, ...inversionsToUse];
      }
    }

    const deckConfig = {
      scale: selectedScale,
      practiceType: selectedPracticeType.id,
      practiceTypeName: selectedPracticeType.name,
      difficulty: difficulty.id,
      difficultyName: difficulty.name,
      difficultyIndex: difficultyIndex,
      range: difficulty.range,
      // New settings
      selectedInversions: inversionsToUse.length > 0 ? inversionsToUse : [],
      selectedIntervals: intervalsToUse.length > 0 ? intervalsToUse : [],
      hand: selectedHand?.id || 'both',
      handName: selectedHand?.name || 'Both Hands',
      simultaneousPlay: selectedSimultaneousPlay.length > 0 ? selectedSimultaneousPlay : [],
      supportsInversions: selectedPracticeType.supportsInversions,
      needsIntervalSelection: selectedPracticeType.needsIntervalSelection || false,
      intervalType: selectedPracticeType.intervalType || null
    };

    // Add rhythm pattern and BPM for sight reading mode
    if (mode === 'sight-reading' && selectedRhythmPattern && selectedBPM) {
      deckConfig.rhythmPattern = selectedRhythmPattern.id;
      deckConfig.rhythmPatternName = selectedRhythmPattern.name;
      deckConfig.bpm = selectedBPM.bpm;
      deckConfig.bpmName = selectedBPM.name;
      deckConfig.goal = selectedBPM.goal;
    }

    onDeckSelected(deckConfig);
  };

  const isLevelUnlocked = (difficultyIndex) => {
    if (difficultyIndex === 0) return true; // First level always unlocked
    const unlockKey = `${selectedScale}-${selectedPracticeType.id}`;
    return (unlockedLevels[unlockKey] || 0) >= difficultyIndex;
  };

  const getMasteryPercentage = () => {
    if (!selectedScale || !selectedPracticeType) return 0;
    return calculateMasteryPercentage(selectedScale, selectedPracticeType.id);
  };

  const getDeckHighScore = (difficulty, difficultyIndex) => {
    if (!selectedScale || !selectedPracticeType || !selectedRhythmPattern || !selectedBPM || mode !== 'sight-reading') {
      return null;
    }

    const tempDeck = {
      scale: selectedScale,
      practiceType: selectedPracticeType.id,
      difficulty: difficulty.id,
      rhythmPattern: selectedRhythmPattern.id,
      bpm: selectedBPM.bpm
    };

    return getHighScore(tempDeck);
  };

  const openPastResults = (difficulty, difficultyIndex) => {
    if (!selectedScale || !selectedPracticeType || !selectedRhythmPattern || !selectedBPM) return;

    const deck = {
      scale: selectedScale,
      practiceType: selectedPracticeType.id,
      practiceTypeName: selectedPracticeType.name,
      difficulty: difficulty.id,
      difficultyName: difficulty.name,
      difficultyIndex: difficultyIndex,
      rhythmPattern: selectedRhythmPattern.id,
      rhythmPatternName: selectedRhythmPattern.name,
      bpm: selectedBPM.bpm,
      bpmName: selectedBPM.name,
      goal: selectedBPM.goal
    };

    setPastResultsDeck(deck);
    setShowPastResults(true);
  };

  return (
    <div className="space-y-8">
      {/* Header with reset button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-buretto-primary">
          {mode === 'sight-reading' ? 'Configure Sight Reading Session' : 'Select Practice Deck'}
        </h2>
        <button
          onClick={onResetSession}
          className="flex items-center gap-2 px-4 py-2 bg-buretto-accent text-white rounded-lg hover:bg-opacity-80 transition-colors"
          title="Reset all session progress"
        >
          <RotateCcw size={16} />
          Reset Session
        </button>
      </div>

      {/* Step 1: Scale Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-buretto-primary">
          1. Choose Scale
        </h3>
        <div className="grid grid-cols-6 gap-3">
          {SCALES.map((scale) => {
            // Calculate overall mastery for this scale across all practice types
            const overallMastery = mode === 'sight-reading' ?
              PRACTICE_TYPES.reduce((total, type) => {
                return total + calculateMasteryPercentage(scale, type.id);
              }, 0) / PRACTICE_TYPES.length : 0;
            const showMastery = mode === 'sight-reading' && overallMastery > 0;

            return (
              <button
                key={scale}
                onClick={() => handleScaleSelect(scale)}
                className={`p-3 rounded-lg border-2 transition-colors relative ${
                  selectedScale === scale
                    ? 'border-buretto-secondary bg-buretto-secondary text-white'
                    : 'border-gray-300 hover:border-buretto-secondary'
                }`}
              >
                <div className="font-medium">{scale}</div>
                {showMastery && (
                  <div className="text-xs opacity-75 mt-1">
                    {Math.round(overallMastery * 100)}% complete
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Practice Type Selection */}
      {selectedScale && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            2. Choose Note Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRACTICE_TYPES.map((type) => {
              const masteryPercentage = mode === 'sight-reading' ? calculateMasteryPercentage(selectedScale, type.id) : 0;
              const showMastery = mode === 'sight-reading' && masteryPercentage > 0;

              return (
                <button
                  key={type.id}
                  onClick={() => handlePracticeTypeSelect(type)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedPracticeType?.id === type.id
                      ? 'border-buretto-secondary bg-buretto-secondary text-white'
                      : 'border-gray-300 hover:border-buretto-secondary'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{type.name}</div>
                    {showMastery && (
                      <div className="flex items-center space-x-1 text-xs opacity-75">
                        <TrendingUp size={12} />
                        <span>{Math.round(masteryPercentage * 100)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm opacity-75">
                    {type.description}
                  </div>
                  {showMastery && (
                    <div className="mt-2 text-xs opacity-60">
                      {Math.round(masteryPercentage * 100)}% mastery across all combinations
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Inversion Selection (Chords) OR Interval Selection (Intervals) */}
      {selectedScale && selectedPracticeType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            3. {selectedPracticeType.supportsInversions ? 'Choose Inversion' :
                selectedPracticeType.needsIntervalSelection ? 'Choose Intervals' :
                'Choose Inversion (Not applicable)'}
          </h3>
          {selectedPracticeType.supportsInversions ? (
            // Show inversion checkboxes for chords
            <>
              <p className="text-sm text-gray-600 mb-3">
                Add inversions progressively to your practice. Higher levels include all lower levels.
              </p>
              <div className="space-y-2">
                {INVERSION_OPTIONS.map((option) => {
                  // Hide 3rd inversion entirely for triads
                  if (option.id === 'third' && selectedPracticeType.id === 'triads') {
                    return null;
                  }

                  const isSelected = selectedInversions.includes(option.id);
                  const isFirstOption = option.level === 1;

                  // Check if previous level is enabled (either in selectedInversions OR is the first option)
                  const isPreviousLevelEnabled = option.level === 1 || selectedInversions.some(id => {
                    const opt = INVERSION_OPTIONS.find(o => o.id === id);
                    return opt && opt.level === option.level - 1;
                  }) || option.level === 2; // Level 2 can always be enabled since level 1 is always on

                  const isDisabled = !isFirstOption && !isPreviousLevelEnabled;

                  // First option is always selected (even if not in array)
                  const isEffectivelySelected = isSelected || isFirstOption;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border-2 ${
                        isFirstOption ? 'cursor-default' : 'cursor-pointer'
                      } transition-colors ${
                        isEffectivelySelected
                          ? 'border-buretto-secondary bg-buretto-secondary bg-opacity-10'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-buretto-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isEffectivelySelected}
                        onChange={() => !isDisabled && !isFirstOption && handleInversionToggle(option.id)}
                        disabled={isDisabled || isFirstOption}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-buretto-primary">{option.name}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : selectedPracticeType.needsIntervalSelection ? (
            // Show interval checkboxes for interval practice types
            <>
              <p className="text-sm text-gray-600 mb-3">
                Add intervals progressively to your practice. Higher levels include all lower levels.
              </p>
              <div className="space-y-2">
                {(selectedPracticeType.intervalType === 'basic' ? INTERVAL_BASIC_OPTIONS : INTERVAL_ADVANCED_OPTIONS).map((option) => {
                  const isSelected = selectedIntervals.includes(option.id);
                  const intervalOptions = selectedPracticeType.intervalType === 'basic'
                    ? INTERVAL_BASIC_OPTIONS
                    : INTERVAL_ADVANCED_OPTIONS;
                  const isFirstOption = option.level === 1;

                  // Check if previous level is enabled (either in selectedIntervals OR is the first option)
                  const isPreviousLevelEnabled = option.level === 1 || selectedIntervals.some(id => {
                    const opt = intervalOptions.find(o => o.id === id);
                    return opt && opt.level === option.level - 1;
                  }) || option.level === 2; // Level 2 can always be enabled since level 1 is always on

                  const isDisabled = !isFirstOption && !isPreviousLevelEnabled;

                  // First option is always selected (even if not in array)
                  const isEffectivelySelected = isSelected || isFirstOption;

                  return (
                    <label
                      key={option.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border-2 ${
                        isFirstOption ? 'cursor-default' : 'cursor-pointer'
                      } transition-colors ${
                        isEffectivelySelected
                          ? 'border-buretto-secondary bg-buretto-secondary bg-opacity-10'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-300 hover:border-buretto-secondary'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isEffectivelySelected}
                        onChange={() => !isDisabled && !isFirstOption && handleIntervalToggle(option.id)}
                        disabled={isDisabled || isFirstOption}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-buretto-primary">{option.name}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            // Not applicable for single notes
            <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 text-gray-500">
              <p className="text-sm">
                Inversions and interval selection only apply to chords and interval practice. Single notes don't have these options.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Hand Selection */}
      {selectedScale && selectedPracticeType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            4. Choose Hand
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {HAND_OPTIONS.map((hand) => (
              <button
                key={hand.id}
                onClick={() => handleHandSelect(hand)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedHand?.id === hand.id
                    ? 'border-buretto-secondary bg-buretto-secondary text-white'
                    : 'border-gray-300 hover:border-buretto-secondary'
                }`}
              >
                <div className="font-medium mb-1">{hand.name}</div>
                <div className="text-sm opacity-75">{hand.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 5: Simultaneous Playing (Sight Reading Only) */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && selectedHand && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            5. Simultaneous Playing (Other Hand)
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Add notes in the other hand to increase difficulty. Higher levels include all lower levels.
          </p>
          <div className="space-y-2">
            {SIMULTANEOUS_PLAY_OPTIONS.map((option) => {
              const isSelected = selectedSimultaneousPlay.includes(option.id);
              const isDisabled = option.level > 1 && !selectedSimultaneousPlay.some(id => {
                const opt = SIMULTANEOUS_PLAY_OPTIONS.find(o => o.id === id);
                return opt && opt.level === option.level - 1;
              });

              return (
                <label
                  key={option.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-buretto-secondary bg-buretto-secondary bg-opacity-10'
                      : isDisabled
                      ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-buretto-secondary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => !isDisabled && handleSimultaneousPlayToggle(option.id)}
                    disabled={isDisabled}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-buretto-primary">{option.name}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 italic">
            Note: Selecting "None" (no checkboxes) means only the primary hand plays.
          </p>
        </div>
      )}

      {/* Step 5: Difficulty Level Selection (Flashcards Only) */}
      {mode !== 'sight-reading' && selectedScale && selectedPracticeType && selectedHand && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            5. Choose Difficulty & Start
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DIFFICULTY_LEVELS.map((difficulty, index) => {
              const isUnlocked = isLevelUnlocked(index);
              return (
                <button
                  key={difficulty.id}
                  onClick={() => isUnlocked && handleDifficultySelect(difficulty, index)}
                  disabled={!isUnlocked}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    isUnlocked
                      ? 'border-gray-300 hover:border-buretto-secondary hover:bg-buretto-light'
                      : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {difficulty.name}
                    </span>
                    {isUnlocked ? (
                      <Unlock size={16} className="text-green-600" />
                    ) : (
                      <Lock size={16} className="text-gray-400" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {difficulty.range} notes range
                  </div>
                  {!isUnlocked && (
                    <div className="text-xs text-gray-500 mt-1">
                      Complete previous level with 60+ cards
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 6: Rhythm Pattern Selection (Sight Reading Only) */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && selectedHand && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            6. Choose Rhythm Pattern
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RHYTHM_PATTERNS.map((pattern) => {
              // Calculate mastery for this specific rhythm pattern across all BPMs and difficulties
              const history = getResultsHistory();
              const bpmOptions = [30, 50, 80, 120];
              const difficulties = ['half-octave', 'full-octave', 'full-scale'];

              let totalCombinations = 0;
              let passedCombinations = 0;

              bpmOptions.forEach(bpm => {
                difficulties.forEach(difficulty => {
                  totalCombinations++;
                  const deckKey = `${selectedScale}-${selectedPracticeType.id}-${difficulty}-${pattern.id}-${bpm}`;
                  const deckResults = history[deckKey] || [];
                  const hasPassed = deckResults.some(session => session.results.passed);
                  if (hasPassed) {
                    passedCombinations++;
                  }
                });
              });

              const patternMastery = totalCombinations > 0 ? (passedCombinations / totalCombinations) : 0;
              const showMastery = patternMastery > 0;

              return (
                <button
                  key={pattern.id}
                  onClick={() => handleRhythmPatternSelect(pattern)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedRhythmPattern?.id === pattern.id
                      ? 'border-buretto-secondary bg-buretto-secondary text-white'
                      : 'border-gray-300 hover:border-buretto-secondary'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{pattern.name}</div>
                    {showMastery && (
                      <div className="flex items-center space-x-1 text-xs opacity-75">
                        <TrendingUp size={12} />
                        <span>{Math.round(patternMastery * 100)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm opacity-75">
                    {pattern.description}
                  </div>
                  {showMastery && (
                    <div className="mt-2 text-xs opacity-60">
                      {Math.round(patternMastery * 100)}% mastery across all tempos
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 7: BPM Selection for Sight Reading */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && selectedHand && selectedRhythmPattern && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            7. Choose Tempo (BPM)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {BPM_OPTIONS.map((bpmOption) => {
              // Calculate mastery for this specific BPM across all difficulties
              const history = getResultsHistory();
              const difficulties = ['half-octave', 'full-octave', 'full-scale'];

              let totalCombinations = 0;
              let passedCombinations = 0;

              difficulties.forEach(difficulty => {
                totalCombinations++;
                const deckKey = `${selectedScale}-${selectedPracticeType.id}-${difficulty}-${selectedRhythmPattern.id}-${bpmOption.bpm}`;
                const deckResults = history[deckKey] || [];
                const hasPassed = deckResults.some(session => session.results.passed);
                if (hasPassed) {
                  passedCombinations++;
                }
              });

              const bpmMastery = totalCombinations > 0 ? (passedCombinations / totalCombinations) : 0;
              const showMastery = bpmMastery > 0;

              return (
                <button
                  key={bpmOption.id}
                  onClick={() => handleBPMSelect(bpmOption)}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    selectedBPM?.id === bpmOption.id
                      ? 'border-buretto-secondary bg-buretto-secondary text-white'
                      : 'border-gray-300 hover:border-buretto-secondary'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium">{bpmOption.name}</div>
                    {showMastery && (
                      <div className="flex items-center space-x-1 text-xs opacity-75">
                        <TrendingUp size={12} />
                        <span>{Math.round(bpmMastery * 100)}%</span>
                      </div>
                    )}
                  </div>
                  <div className="text-sm opacity-75 mb-2">
                    {bpmOption.description}
                  </div>
                  <div className="text-xs opacity-60">
                    Goal: {bpmOption.goal.beats} beats @ {Math.round(bpmOption.goal.accuracy * 100)}% accuracy
                  </div>
                  {showMastery && (
                    <div className="mt-2 text-xs opacity-60">
                      {Math.round(bpmMastery * 100)}% mastery across all difficulties
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 8: Difficulty Selection for Sight Reading */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && selectedHand && selectedRhythmPattern && selectedBPM && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            8. Choose Difficulty & Start
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {DIFFICULTY_LEVELS.map((difficulty, index) => {
              const isUnlocked = isLevelUnlocked(index);
              const highScore = mode === 'sight-reading' ? getDeckHighScore(difficulty, index) : null;
              const passingScore = selectedBPM ? selectedBPM.goal.beats : 80;
              const showHighScore = highScore && highScore.results.notesReached > 0;

              return (
                <button
                  key={difficulty.id}
                  onClick={() => isUnlocked && handleDifficultySelect(difficulty, index)}
                  disabled={!isUnlocked}
                  className={`p-4 rounded-lg border-2 text-left transition-colors ${
                    isUnlocked
                      ? 'border-gray-300 hover:border-buretto-secondary hover:bg-buretto-light'
                      : 'border-gray-200 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">
                      {difficulty.name}
                    </span>
                    <div className="flex items-center space-x-2">
                      {showHighScore && mode === 'sight-reading' && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openPastResults(difficulty, index);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                          title="View past results"
                        >
                          <History size={14} className="text-blue-600" />
                        </div>
                      )}
                      {isUnlocked ? (
                        <Unlock size={16} className="text-green-600" />
                      ) : (
                        <Lock size={16} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {difficulty.range} notes range
                  </div>
                  {showHighScore && mode === 'sight-reading' && (
                    <div className="text-xs text-blue-600 mt-1 flex items-center space-x-1">
                      <Award size={12} />
                      <span>High Score: {highScore.results.notesReached}/{passingScore}</span>
                    </div>
                  )}
                  {!isUnlocked && (
                    <div className="text-xs text-gray-500 mt-1">
                      Complete previous level with goal requirements
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Selection Summary */}
      {selectedScale && selectedPracticeType && (
        <div className="bg-buretto-light p-4 rounded-lg">
          <h4 className="font-semibold text-buretto-primary mb-2">
            Current Selection:
          </h4>
          <div className="space-y-1">
            <p className="text-buretto-accent">
              <span className="font-medium">{selectedScale}</span> scale -
              <span className="font-medium"> {selectedPracticeType.name}</span>
              {selectedPracticeType.supportsInversions && selectedInversions.length > 0 && (
                <span> - <span className="font-medium">
                  {selectedInversions.map(id => {
                    const opt = INVERSION_OPTIONS.find(o => o.id === id);
                    return opt?.name;
                  }).join(', ')}
                </span></span>
              )}
              {selectedPracticeType.needsIntervalSelection && selectedIntervals.length > 0 && (
                <span> - <span className="font-medium">
                  {selectedIntervals.map(id => {
                    const intervalOptions = selectedPracticeType.intervalType === 'basic'
                      ? INTERVAL_BASIC_OPTIONS
                      : INTERVAL_ADVANCED_OPTIONS;
                    const opt = intervalOptions.find(o => o.id === id);
                    return opt?.name;
                  }).join(', ')}
                </span></span>
              )}
              {selectedHand && (
                <span> - <span className="font-medium">{selectedHand.name}</span></span>
              )}
            </p>
            {mode === 'sight-reading' && (
              <p className="text-buretto-accent text-sm">
                {selectedSimultaneousPlay.length > 0 && (
                  <span>Simultaneous: <span className="font-medium">{selectedSimultaneousPlay.map(sp => {
                    const opt = SIMULTANEOUS_PLAY_OPTIONS.find(o => o.id === sp);
                    return opt?.name;
                  }).join(', ')}</span> | </span>
                )}
                {selectedRhythmPattern && (
                  <span><span className="font-medium">{selectedRhythmPattern.name}</span> | </span>
                )}
                {selectedBPM && (
                  <span><span className="font-medium">{selectedBPM.name}</span></span>
                )}
              </p>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {mode === 'sight-reading' ? (
              selectedBPM ?
                'Choose a difficulty level above to start your sight reading session' :
                selectedRhythmPattern ?
                  'Choose a tempo (BPM) to continue' :
                  selectedHand ?
                    'Choose a rhythm pattern to continue' :
                    'Choose your hand preference to continue'
            ) : (
              selectedHand ?
                'Choose a difficulty level above to start practicing' :
                'Choose your hand preference to continue'
            )}
          </p>
        </div>
      )}

      {/* Past Results Modal */}
      {pastResultsDeck && (
        <PastResultsModal
          deck={pastResultsDeck}
          isOpen={showPastResults}
          onClose={() => {
            setShowPastResults(false);
            setPastResultsDeck(null);
          }}
        />
      )}
    </div>
  );
};

export default DeckSelector;