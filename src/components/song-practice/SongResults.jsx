// SongResults - adapts SightReadingResults for song practice
import React from 'react';
import SightReadingResults from '../piano-practice/SightReadingResults';
import { recordSongSession } from './utils/songStorage';

const SongResults = ({ results, song, variant, bpmPercent, onGoAgain, onBackToLibrary }) => {
  // Record session results when component mounts
  React.useEffect(() => {
    if (results && song && variant) {
      const passed = results.noteAccuracy >= 0.85;
      const sessionResults = {
        ...results,
        passed,
        grade: results.grade || calculateGrade(results.overallScore)
      };

      recordSongSession(song.id, variant.variantId, bpmPercent, sessionResults);
    }
  }, [results, song, variant, bpmPercent]);

  // Create deck object compatible with SightReadingResults
  const deck = {
    scale: variant.properties.scale,
    practiceType: 'song-practice',
    practiceTypeName: `${song.title} - ${variant.name}`,
    difficulty: 'song',
    difficultyName: `${bpmPercent}% BPM`,
    rhythmPattern: variant.properties.rhythmPatterns[0],
    bpm: Math.round(variant.properties.originalBPM * bpmPercent / 100),
    goal: {
      beats: variant.sequence.length,
      accuracy: 0.85
    }
  };

  return (
    <div className="space-y-6">
      {/* Song Info Header */}
      <div className="bg-buretto-light p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-buretto-primary">{song.title}</h3>
        <p className="text-sm text-buretto-accent">
          {variant.name} - {bpmPercent}% BPM ({Math.round(variant.properties.originalBPM * bpmPercent / 100)} BPM)
        </p>
        {song.artist && (
          <p className="text-xs text-gray-600">{song.artist}</p>
        )}
      </div>

      {/* Reuse SightReadingResults */}
      <SightReadingResults
        results={results}
        deck={deck}
        previousRecord={0} // Songs don't track "records" the same way
        onGoAgain={onGoAgain}
        onChangeDeck={onBackToLibrary}
        onViewDetailedAnalysis={() => {}} // Could implement detailed analysis later
        onTryNextLevel={() => {}} // Not applicable for songs
        isSongMode={true}
        changeDeckButtonText="Change Song"
        showDetailedAnalysis={false}
        showPastResultsButton={false}
        originalBPM={variant.properties.originalBPM}
      />
    </div>
  );
};

// Calculate letter grade from overall score
const calculateGrade = (score) => {
  if (score >= 0.95) return 'A+';
  if (score >= 0.9) return 'A';
  if (score >= 0.85) return 'A-';
  if (score >= 0.8) return 'B+';
  if (score >= 0.75) return 'B';
  if (score >= 0.7) return 'B-';
  if (score >= 0.65) return 'C+';
  if (score >= 0.6) return 'C';
  if (score >= 0.5) return 'D';
  return 'F';
};

export default SongResults;
