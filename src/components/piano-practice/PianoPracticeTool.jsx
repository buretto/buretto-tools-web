import React, { useState, useEffect } from 'react';
import DeckSelector from './DeckSelector';
import CountdownTimer from './CountdownTimer';
import SightReadingSession from './SightReadingSession';
import ScoreDisplay from './ScoreDisplay';

const GAME_STATES = {
  DECK_SELECTION: 'deck_selection',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  RESULTS: 'results'
};

const PianoPracticeTool = () => {
  const [gameState, setGameState] = useState(GAME_STATES.DECK_SELECTION);
  const [selectedDeck, setSelectedDeck] = useState(null);
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionRecords, setSessionRecords] = useState({});
  const [unlockedLevels, setUnlockedLevels] = useState({});

  const handleDeckSelected = (deck) => {
    setSelectedDeck(deck);
    setGameState(GAME_STATES.COUNTDOWN);
  };

  const handleCountdownComplete = () => {
    setSessionScore(0);
    setGameState(GAME_STATES.PLAYING);
  };

  const handleSessionComplete = (score) => {
    setSessionScore(score);

    // Update session records
    const deckKey = `${selectedDeck.scale}-${selectedDeck.practiceType}-${selectedDeck.difficulty}`;
    const currentRecord = sessionRecords[deckKey] || 0;
    if (score > currentRecord) {
      setSessionRecords(prev => ({
        ...prev,
        [deckKey]: score
      }));
    }

    // Check if level should be unlocked (60+ cards = passed)
    if (score >= 60) {
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
          <SightReadingSession
            deck={selectedDeck}
            onSessionComplete={handleSessionComplete}
            isCountdownActive={gameState === GAME_STATES.COUNTDOWN}
          />
        )}

        {gameState === GAME_STATES.RESULTS && (
          <ScoreDisplay
            score={sessionScore}
            deck={selectedDeck}
            previousRecord={sessionRecords[`${selectedDeck.scale}-${selectedDeck.practiceType}-${selectedDeck.difficulty}`] || 0}
            passed={sessionScore >= 60}
            onGoAgain={handleGoAgain}
            onChangeDeck={handleChangeDeck}
          />
        )}
      </div>
    </div>
  );
};

export default PianoPracticeTool;