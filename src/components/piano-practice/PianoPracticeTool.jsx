import React, { useState, useEffect } from 'react';
import DeckSelector from './DeckSelector';
import CountdownTimer from './CountdownTimer';
import FlashcardSession from './FlashcardSession';
import ScoreDisplay from './ScoreDisplay';
import { saveSessionResult } from './utils/resultsStorage';

const GAME_STATES = {
  DECK_SELECTION: 'deck_selection',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  RESULTS: 'results'
};

const PianoPracticeTool = () => {
  const [gameState, setGameState] = useState(GAME_STATES.DECK_SELECTION);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);
  const [sessionRecords, setSessionRecords] = useState({});
  const [unlockedLevels, setUnlockedLevels] = useState({});

  const handleDeckSelected = (deck) => {
    setSelectedDeck(deck);
    setGameState(GAME_STATES.COUNTDOWN);
  };

  const handleCountdownComplete = () => {
    setSessionResults(null);
    setGameState(GAME_STATES.PLAYING);
  };

  const handleSessionComplete = (results) => {
    setSessionResults(results);

    // Save to localStorage for historical tracking
    saveSessionResult(selectedDeck, results);

    // Update session records
    const deckKey = `${selectedDeck.scale}-${selectedDeck.practiceType}-${selectedDeck.difficulty}`;
    const currentRecord = sessionRecords[deckKey] || 0;
    if (results.finalScore > currentRecord) {
      setSessionRecords(prev => ({
        ...prev,
        [deckKey]: results.finalScore
      }));
    }

    // Check if level should be unlocked (45+ score = passed)
    if (results.passed) {
      const nextDifficultyIndex = selectedDeck.difficultyIndex + 1;
      if (nextDifficultyIndex < 3) { // 3 difficulty levels total
        const unlockKey = `${selectedDeck.scale}-${selectedDeck.practiceType}`;
        setUnlockedLevels(prev => ({
          ...prev,
          [unlockKey]: Math.max(prev[unlockKey] || 0, nextDifficultyIndex)
        }));
      }
    }

    setGameState(GAME_STATES.RESULTS);
  };

  const handleGoAgain = () => {
    setGameState(GAME_STATES.COUNTDOWN);
  };

  const handleChangeDeck = () => {
    setGameState(GAME_STATES.DECK_SELECTION);
  };

  const resetSession = () => {
    setSessionRecords({});
    setUnlockedLevels({});
    setGameState(GAME_STATES.DECK_SELECTION);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-buretto-primary mb-2">
            Piano Flashcards
          </h1>
          <p className="text-buretto-accent">
            Practice note reading with real-time MIDI input
          </p>
        </div>

        {gameState === GAME_STATES.DECK_SELECTION && (
          <DeckSelector
            onDeckSelected={handleDeckSelected}
            unlockedLevels={unlockedLevels}
            onResetSession={resetSession}
          />
        )}

        {gameState === GAME_STATES.COUNTDOWN && (
          <CountdownTimer
            onComplete={handleCountdownComplete}
            selectedDeck={selectedDeck}
          />
        )}

        {gameState === GAME_STATES.PLAYING && (
          <FlashcardSession
            deck={selectedDeck}
            onSessionComplete={handleSessionComplete}
          />
        )}

        {gameState === GAME_STATES.RESULTS && (
          <ScoreDisplay
            results={sessionResults}
            deck={selectedDeck}
            previousRecord={sessionRecords[`${selectedDeck.scale}-${selectedDeck.practiceType}-${selectedDeck.difficulty}`] || 0}
            onGoAgain={handleGoAgain}
            onChangeDeck={handleChangeDeck}
          />
        )}
      </div>
    </div>
  );
};

export default PianoPracticeTool;