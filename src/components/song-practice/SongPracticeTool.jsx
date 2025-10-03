import React, { useState, useEffect } from 'react';
import SongLibrary from './SongLibrary';
import SongSession from './SongSession';
import SongResults from './SongResults';
import SongImporter from './SongImporter';
import PracticeSetManager from './PracticeSetManager';
import CountdownTimer from '../piano-practice/CountdownTimer';
import { initializeDefaultSongs } from './utils/defaultSongs';

const STATES = {
  LIBRARY: 'library',
  COUNTDOWN: 'countdown',
  PLAYING: 'playing',
  RESULTS: 'results'
};

const SongPracticeTool = () => {
  const [state, setState] = useState(STATES.LIBRARY);

  // Initialize default songs on mount
  useEffect(() => {
    initializeDefaultSongs();
  }, []);
  const [selectedSong, setSelectedSong] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedBPM, setSelectedBPM] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);
  const [showImporter, setShowImporter] = useState(false);
  const [showSetManager, setShowSetManager] = useState(false);

  const handleSongSelected = (song, variant, bpmPercent) => {
    setSelectedSong(song);
    setSelectedVariant(variant);
    setSelectedBPM(bpmPercent);
    setState(STATES.COUNTDOWN);
  };

  const handleCountdownComplete = () => {
    setState(STATES.PLAYING);
  };

  const handleSessionComplete = (results) => {
    setSessionResults(results);
    setState(STATES.RESULTS);
  };

  const handleGoAgain = () => {
    setState(STATES.COUNTDOWN);
  };

  const handleBackToLibrary = () => {
    setState(STATES.LIBRARY);
    setSelectedSong(null);
    setSelectedVariant(null);
    setSelectedBPM(null);
    setSessionResults(null);
  };

  const handleImportComplete = (count) => {
    // Library will refresh automatically due to re-render
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-buretto-primary mb-2">
            Song Practice
          </h1>
          <p className="text-buretto-accent">
            Practice specific songs with progressive difficulty and BPM tracking
          </p>
        </div>

        {/* Library View */}
        {state === STATES.LIBRARY && (
          <SongLibrary
            onSongSelected={handleSongSelected}
            onOpenImporter={() => setShowImporter(true)}
            onManageSets={() => setShowSetManager(true)}
          />
        )}

        {/* Countdown */}
        {state === STATES.COUNTDOWN && (
          <div className="space-y-6">
            {/* Song Info */}
            <div className="bg-buretto-light p-6 rounded-lg text-center">
              <h2 className="text-2xl font-bold text-buretto-primary mb-2">
                {selectedSong.title}
              </h2>
              <p className="text-lg text-buretto-accent">
                {selectedVariant.name} - {selectedBPM}% BPM
              </p>
              <p className="text-sm text-gray-600 mt-2">
                {Math.round(selectedVariant.properties.originalBPM * selectedBPM / 100)} BPM •{' '}
                {selectedVariant.properties.scale} •{' '}
                {selectedVariant.sequence.length} notes
              </p>
            </div>

            {/* Countdown Timer */}
            <CountdownTimer
              onComplete={handleCountdownComplete}
              selectedDeck={{
                scale: selectedVariant.properties.scale,
                practiceTypeName: selectedSong.title,
                bpm: Math.round(selectedVariant.properties.originalBPM * selectedBPM / 100)
              }}
            />

            {/* Cancel Button */}
            <div className="text-center">
              <button
                onClick={handleBackToLibrary}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Playing */}
        {(state === STATES.PLAYING || state === STATES.COUNTDOWN) && state !== STATES.LIBRARY && (
          <div className={state === STATES.COUNTDOWN ? 'hidden' : ''}>
            <SongSession
              song={selectedSong}
              variant={selectedVariant}
              bpmPercent={selectedBPM}
              onSessionComplete={handleSessionComplete}
              isCountdownActive={state === STATES.COUNTDOWN}
            />
          </div>
        )}

        {/* Results */}
        {state === STATES.RESULTS && (
          <SongResults
            results={sessionResults}
            song={selectedSong}
            variant={selectedVariant}
            bpmPercent={selectedBPM}
            onGoAgain={handleGoAgain}
            onBackToLibrary={handleBackToLibrary}
          />
        )}
      </div>

      {/* Modals */}
      {showImporter && (
        <SongImporter
          onClose={() => setShowImporter(false)}
          onImportComplete={handleImportComplete}
        />
      )}

      {showSetManager && (
        <PracticeSetManager
          onClose={() => setShowSetManager(false)}
        />
      )}
    </div>
  );
};

export default SongPracticeTool;
