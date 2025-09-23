import React, { useState } from 'react';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

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

const DeckSelector = ({ onDeckSelected, unlockedLevels, onResetSession }) => {
  const [selectedScale, setSelectedScale] = useState(null);
  const [selectedPracticeType, setSelectedPracticeType] = useState(null);

  const handleScaleSelect = (scale) => {
    setSelectedScale(scale);
    setSelectedPracticeType(null);
  };

  const handlePracticeTypeSelect = (practiceType) => {
    setSelectedPracticeType(practiceType);
  };

  const handleDifficultySelect = (difficulty, difficultyIndex) => {
    onDeckSelected({
      scale: selectedScale,
      practiceType: selectedPracticeType.id,
      practiceTypeName: selectedPracticeType.name,
      difficulty: difficulty.id,
      difficultyName: difficulty.name,
      difficultyIndex: difficultyIndex,
      hands: selectedPracticeType.hands,
      range: difficulty.range
    });
  };

  const isLevelUnlocked = (difficultyIndex) => {
    if (difficultyIndex === 0) return true; // First level always unlocked
    const unlockKey = `${selectedScale}-${selectedPracticeType.id}`;
    return (unlockedLevels[unlockKey] || 0) >= difficultyIndex;
  };

  return (
    <div className="space-y-8">
      {/* Header with reset button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-buretto-primary">
          Select Practice Deck
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
          {SCALES.map((scale) => (
            <button
              key={scale}
              onClick={() => handleScaleSelect(scale)}
              className={`p-3 rounded-lg border-2 transition-colors ${
                selectedScale === scale
                  ? 'border-buretto-secondary bg-buretto-secondary text-white'
                  : 'border-gray-300 hover:border-buretto-secondary'
              }`}
            >
              {scale}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Practice Type Selection */}
      {selectedScale && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            2. Choose Practice Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {PRACTICE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => handlePracticeTypeSelect(type)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  selectedPracticeType?.id === type.id
                    ? 'border-buretto-secondary bg-buretto-secondary text-white'
                    : 'border-gray-300 hover:border-buretto-secondary'
                }`}
              >
                <div className="font-medium">{type.name}</div>
                <div className="text-sm opacity-75">
                  {type.hands === 'one' ? 'Single hand/clef' : 'Both hands/clefs'}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Difficulty Level Selection */}
      {selectedScale && selectedPracticeType && (
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

      {/* Current Selection Summary */}
      {selectedScale && selectedPracticeType && (
        <div className="bg-buretto-light p-4 rounded-lg">
          <h4 className="font-semibold text-buretto-primary mb-2">
            Current Selection:
          </h4>
          <p className="text-buretto-accent">
            <span className="font-medium">{selectedScale}</span> scale -
            <span className="font-medium"> {selectedPracticeType.name}</span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Choose a difficulty level above to start practicing
          </p>
        </div>
      )}
    </div>
  );
};

export default DeckSelector;