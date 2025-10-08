import React, { useState } from 'react';
import { Lock, Unlock, RotateCcw, TrendingUp, History, Award } from 'lucide-react';
import { calculateMasteryPercentage, getHighScore, getResultsHistory } from './utils/resultsStorage';
import PastResultsModal from './PastResultsModal';

const SCALES = [
  'C', 'F', 'G', 'D', 'A', 'E', 'B',
  'Bb', 'Eb', 'Ab', 'Db', 'Gb'
];

const PRACTICE_TYPES = [
  { id: 'single-notes', name: 'Single Notes', description: 'One note at a time', supportsInversions: false },
  { id: 'intervals-basic', name: 'Intervals (Basic)', description: '2nds, 3rds, 4ths, 5ths, Octaves', supportsInversions: false },
  { id: 'triads', name: 'Triads', description: 'Three-note chords from scale', supportsInversions: true },
  { id: 'sevenths', name: '7th Chords', description: 'Four-note seventh chords', supportsInversions: true },
  { id: 'intervals-advanced', name: 'Intervals (Advanced)', description: '6ths, 7ths, 9ths, 10ths', supportsInversions: false }
];

const INVERSION_OPTIONS = [
  { id: 'root', name: 'Root Position', description: 'Root note in bass' },
  { id: 'first', name: '1st Inversion', description: '3rd in bass' },
  { id: 'second', name: '2nd Inversion', description: '5th in bass' },
  { id: 'third', name: '3rd Inversion', description: '7th in bass (7th chords only)' },
  { id: 'all', name: 'All Inversions', description: 'Random inversions' }
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

  // Add inversion if applicable
  if (deck.supportsInversions || deck.inversion) {
    parts.push(deck.inversion || 'root');
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
  const [selectedInversion, setSelectedInversion] = useState(null);
  const [selectedHand, setSelectedHand] = useState(null);
  const [selectedSimultaneousPlay, setSelectedSimultaneousPlay] = useState([]);
  const [selectedRhythmPattern, setSelectedRhythmPattern] = useState(null);
  const [selectedBPM, setSelectedBPM] = useState(null);
  const [showPastResults, setShowPastResults] = useState(false);
  const [pastResultsDeck, setPastResultsDeck] = useState(null);

  const handleScaleSelect = (scale) => {
    setSelectedScale(scale);
    setSelectedPracticeType(null);
    setSelectedInversion(null);
    setSelectedHand(null);
    setSelectedSimultaneousPlay([]);
    setSelectedRhythmPattern(null);
    setSelectedBPM(null);
  };

  const handlePracticeTypeSelect = (practiceType) => {
    setSelectedPracticeType(practiceType);
    // Reset inversion if new practice type doesn't support it
    if (!practiceType.supportsInversions) {
      setSelectedInversion(null);
    }
    setSelectedHand(null);
    setSelectedSimultaneousPlay([]);
    setSelectedRhythmPattern(null);
    setSelectedBPM(null);
  };

  const handleInversionSelect = (inversion) => {
    setSelectedInversion(inversion);
  };

  const handleHandSelect = (hand) => {
    setSelectedHand(hand);
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
    const deckConfig = {
      scale: selectedScale,
      practiceType: selectedPracticeType.id,
      practiceTypeName: selectedPracticeType.name,
      difficulty: difficulty.id,
      difficultyName: difficulty.name,
      difficultyIndex: difficultyIndex,
      range: difficulty.range,
      // New settings
      inversion: selectedInversion?.id || 'root',
      inversionName: selectedInversion?.name || 'Root Position',
      hand: selectedHand?.id || 'both',
      handName: selectedHand?.name || 'Both Hands',
      simultaneousPlay: selectedSimultaneousPlay.length > 0 ? selectedSimultaneousPlay : [],
      supportsInversions: selectedPracticeType.supportsInversions
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

      {/* Step 3: Inversion Selection (Chords only) */}
      {selectedScale && selectedPracticeType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            3. Choose Inversion {!selectedPracticeType.supportsInversions && '(Not applicable)'}
          </h3>
          {!selectedPracticeType.supportsInversions ? (
            <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-300 text-gray-500">
              <p className="text-sm">
                Inversions only apply to chords (Triads and 7th Chords). Single notes and intervals don't have inversions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {INVERSION_OPTIONS.map((inversion) => {
                // Hide 3rd inversion for triads
                if (inversion.id === 'third' && selectedPracticeType.id === 'triads') {
                  return null;
                }

                return (
                  <button
                    key={inversion.id}
                    onClick={() => handleInversionSelect(inversion)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedInversion?.id === inversion.id
                        ? 'border-buretto-secondary bg-buretto-secondary text-white'
                        : 'border-gray-300 hover:border-buretto-secondary'
                    }`}
                  >
                    <div className="font-medium mb-1">{inversion.name}</div>
                    <div className="text-xs opacity-75">{inversion.description}</div>
                  </button>
                );
              })}
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
              {selectedPracticeType.supportsInversions && selectedInversion && (
                <span> - <span className="font-medium">{selectedInversion.name}</span></span>
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