import React, { useState } from 'react';
import { Lock, Unlock, RotateCcw, TrendingUp, History, Award } from 'lucide-react';
import { calculateMasteryPercentage, getHighScore, getResultsHistory } from './utils/resultsStorage';
import PastResultsModal from './PastResultsModal';

const SCALES = [
  'C', 'F', 'G', 'D', 'A', 'E', 'B',
  'Bb', 'Eb', 'Ab', 'Db', 'Gb'
];

const PRACTICE_TYPES = [
  { id: 'single-notes', name: 'Single Notes', hands: 'one' },
  { id: 'intervals-one-hand', name: 'Intervals (One Hand)', hands: 'one' },
  { id: 'chords-one-hand', name: 'Chords (One Hand)', hands: 'one' },
  { id: 'single-notes-both-hands', name: 'Single Notes (Both Hands)', hands: 'both' },
  { id: 'intervals-both-hands', name: 'Intervals (Both Hands)', hands: 'both' },
  { id: 'multi-notes-both-hands', name: 'Multi-Notes (Both Hands)', hands: 'both' }
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

const DeckSelector = ({ onDeckSelected, unlockedLevels, onResetSession, mode = 'flashcards' }) => {
  const [selectedScale, setSelectedScale] = useState(null);
  const [selectedPracticeType, setSelectedPracticeType] = useState(null);
  const [selectedRhythmPattern, setSelectedRhythmPattern] = useState(null);
  const [selectedBPM, setSelectedBPM] = useState(null);
  const [showPastResults, setShowPastResults] = useState(false);
  const [pastResultsDeck, setPastResultsDeck] = useState(null);

  const handleScaleSelect = (scale) => {
    setSelectedScale(scale);
    setSelectedPracticeType(null);
    setSelectedRhythmPattern(null);
    setSelectedBPM(null);
  };

  const handlePracticeTypeSelect = (practiceType) => {
    setSelectedPracticeType(practiceType);
    setSelectedRhythmPattern(null);
    setSelectedBPM(null);
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
      hands: selectedPracticeType.hands,
      range: difficulty.range
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
            2. Choose Practice Type
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
                    {type.hands === 'one' ? 'Single hand/clef' : 'Both hands/clefs'}
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

      {/* Step 3: Difficulty Level Selection (Flashcards only) */}
      {mode !== 'sight-reading' && selectedScale && selectedPracticeType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            3. Choose Difficulty Level
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

      {/* Step 3: Rhythm Pattern Selection (Sight Reading Only) */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            3. Choose Rhythm Pattern
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

      {/* Step 4: BPM Selection for Sight Reading */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && selectedRhythmPattern && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            4. Choose Tempo (BPM)
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

      {/* Step 5: Difficulty Selection for Sight Reading */}
      {mode === 'sight-reading' && selectedScale && selectedPracticeType && selectedRhythmPattern && selectedBPM && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            5. Choose Difficulty & Start
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
          <p className="text-buretto-accent">
            <span className="font-medium">{selectedScale}</span> scale -
            <span className="font-medium"> {selectedPracticeType.name}</span>
            {mode === 'sight-reading' && selectedRhythmPattern && (
              <span> - <span className="font-medium">{selectedRhythmPattern.name}</span></span>
            )}
            {mode === 'sight-reading' && selectedBPM && (
              <span> - <span className="font-medium">{selectedBPM.name}</span></span>
            )}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {mode === 'sight-reading' ? (
              selectedBPM ?
                'Choose a difficulty level above to start your sight reading session' :
                selectedRhythmPattern ?
                  'Choose a tempo (BPM) to continue' :
                  'Choose a rhythm pattern to continue'
            ) : (
              'Choose a difficulty level above to start practicing'
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