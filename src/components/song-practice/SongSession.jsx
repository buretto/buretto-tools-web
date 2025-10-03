// SongSession - reuses SightReadingSession with fixed sequence
// This component wraps SightReadingSession and adapts it for song practice

import React, { useMemo } from 'react';
import SightReadingSession from '../piano-practice/SightReadingSession';

const SongSession = ({ song, variant, bpmPercent, onSessionComplete, isCountdownActive }) => {
  // Create a deck configuration compatible with SightReadingSession
  const deck = useMemo(() => {
    const actualBPM = Math.round(variant.properties.originalBPM * bpmPercent / 100);

    // Adjust sequence timing based on BPM percentage
    // If BPM is 50%, notes should take twice as long (multiply times by 2)
    // If BPM is 200%, notes should take half as long (multiply times by 0.5)
    // timingRatio = 100 / bpmPercent (inverse relationship)
    const timingRatio = 100 / bpmPercent;

    const adjustedSequence = variant.sequence.map(note => {
      // Calculate endTime if not present (from startTime + duration)
      const endTime = note.endTime || (note.startTime + note.duration);

      return {
        ...note,
        startTime: note.startTime * timingRatio,
        endTime: endTime * timingRatio
      };
    });

    return {
      // Use song/variant metadata
      scale: variant.properties.scale,
      practiceTypeName: `${song.title} - ${variant.name}`,
      difficultyName: `${bpmPercent}% BPM`,
      rhythmPattern: variant.properties.rhythmPatterns[0] || 'mixed-simple',
      bpm: actualBPM,

      // Goal: 85% accuracy required to pass
      goal: {
        beats: variant.sequence.length, // Complete the whole song
        accuracy: 0.85
      },

      // Fixed sequence from song variant with adjusted timing
      fixedSequence: adjustedSequence,

      // Other required fields
      practiceType: 'song-practice',
      difficulty: 'song',
      difficultyIndex: 0,
      hands: variant.properties.noteTypes.some(t => t.includes('Both Hands')) ? 'both' : 'one',
      range: variant.properties.octaveRange[1] - variant.properties.octaveRange[0]
    };
  }, [song, variant, bpmPercent]);

  return (
    <SightReadingSession
      deck={deck}
      onSessionComplete={onSessionComplete}
      isCountdownActive={isCountdownActive}
    />
  );
};

export default SongSession;
