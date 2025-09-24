import React, { useState } from 'react';
import DeckSelector from './DeckSelector';
import CountdownTimer from './CountdownTimer';
import SightReadingSession from './SightReadingSession';
import SightReadingResults from './SightReadingResults';
import DetailedAnalysisView from './DetailedAnalysisView';

const GAME_STATES = {
  DECK_SELECTION: 'deck_selection',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  RESULTS: 'results',
  DETAILED_ANALYSIS: 'detailed_analysis'
};

const SightReadingTool = () => {
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

    // Update session records based on notes reached
    const deckKey = `${selectedDeck.scale}-${selectedDeck.practiceType}-${selectedDeck.difficulty}-${selectedDeck.rhythmPattern}`;
    const currentRecord = sessionRecords[deckKey] || 0;
    if (results.notesReached > currentRecord) {
      setSessionRecords(prev => ({
        ...prev,
        [deckKey]: results.notesReached
      }));
    }

    // Unlock next level based on performance (reaching 80+ notes with good accuracy)
    const shouldUnlock = results.notesReached >= 80 && results.noteAccuracy >= 0.85;
    if (shouldUnlock) {
      const nextDifficultyIndex = selectedDeck.difficultyIndex + 1;
      if (nextDifficultyIndex < 3) {
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

  const handleViewDetailedAnalysis = () => {
    setGameState(GAME_STATES.DETAILED_ANALYSIS);
  };

  const handleBackToResults = () => {
    setGameState(GAME_STATES.RESULTS);
  };

  const resetSession = () => {
    setSessionRecords({});
    setUnlockedLevels({});
    setGameState(GAME_STATES.DECK_SELECTION);
  };

  const getDeckKey = () => {
    if (!selectedDeck) return '';
    return `${selectedDeck.scale}-${selectedDeck.practiceType}-${selectedDeck.difficulty}-${selectedDeck.rhythmPattern}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-buretto-primary mb-2">
            Piano Sight Reading
          </h1>
          <p className="text-buretto-accent">
            Practice reading musical sequences with real-time timing feedback
          </p>
        </div>

        {gameState === GAME_STATES.DECK_SELECTION && (
          <DeckSelector
            onDeckSelected={handleDeckSelected}
            unlockedLevels={unlockedLevels}
            onResetSession={resetSession}
            mode="sight-reading"
          />
        )}

        {(gameState === GAME_STATES.COUNTDOWN || gameState === GAME_STATES.PLAYING) && (
          <div className="relative">
            <SightReadingSession
              deck={selectedDeck}
              onSessionComplete={handleSessionComplete}
              isCountdownActive={gameState === GAME_STATES.COUNTDOWN}
            />

            {gameState === GAME_STATES.COUNTDOWN && (
              <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-10 pointer-events-none">
                <div className="text-center">
                  <div className="bg-white bg-opacity-90 rounded-full w-24 h-24 flex items-center justify-center mb-4 shadow-lg mx-auto">
                    <CountdownTimer
                      onComplete={handleCountdownComplete}
                      selectedDeck={selectedDeck}
                      minimal={true}
                    />
                  </div>
                  <div className="bg-white bg-opacity-90 rounded-lg px-4 py-2 shadow-lg">
                    <p className="text-sm font-medium text-gray-800">
                      Get ready - {selectedDeck.scale} {selectedDeck.practiceTypeName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {gameState === GAME_STATES.RESULTS && (
          <SightReadingResults
            results={sessionResults}
            deck={selectedDeck}
            previousRecord={sessionRecords[getDeckKey()] || 0}
            onGoAgain={handleGoAgain}
            onChangeDeck={handleChangeDeck}
            onViewDetailedAnalysis={handleViewDetailedAnalysis}
          />
        )}

        {gameState === GAME_STATES.DETAILED_ANALYSIS && (
          <DetailedAnalysisView
            results={sessionResults}
            deck={selectedDeck}
            onBackToResults={handleBackToResults}
          />
        )}
      </div>
    </div>
  );
};

export default SightReadingTool;