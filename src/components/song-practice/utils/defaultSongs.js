// Default song library with sample songs
import { getSongLibrary, addSongs } from './songStorage';

export const DEFAULT_SONGS = [
  {
    title: "Ode to Joy (Simple)",
    artist: "Ludwig van Beethoven",
    tags: ["default-list", "classical", "beginner"],
    variants: [
      {
        variantId: "original",
        name: "Original",
        properties: {
          scale: "C",
          octaveRange: [4, 4],
          noteTypes: ["Single Notes"],
          rhythmPatterns: ["Quarter Notes"],
          originalBPM: 60
        },
        sequence: [
          // E E F G | G F E D | C C D E | E D D
          { startTime: 0, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 0 },
          { startTime: 1, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 1 },
          { startTime: 2, duration: 1, expectedNotes: [65], clef: "treble", notes: [{ note: "F", octave: 4 }], sequenceIndex: 2 },
          { startTime: 3, duration: 1, expectedNotes: [67], clef: "treble", notes: [{ note: "G", octave: 4 }], sequenceIndex: 3 },
          { startTime: 4, duration: 1, expectedNotes: [67], clef: "treble", notes: [{ note: "G", octave: 4 }], sequenceIndex: 4 },
          { startTime: 5, duration: 1, expectedNotes: [65], clef: "treble", notes: [{ note: "F", octave: 4 }], sequenceIndex: 5 },
          { startTime: 6, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 6 },
          { startTime: 7, duration: 1, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 7 },
          { startTime: 8, duration: 1, expectedNotes: [60], clef: "treble", notes: [{ note: "C", octave: 4 }], sequenceIndex: 8 },
          { startTime: 9, duration: 1, expectedNotes: [60], clef: "treble", notes: [{ note: "C", octave: 4 }], sequenceIndex: 9 },
          { startTime: 10, duration: 1, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 10 },
          { startTime: 11, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 11 },
          { startTime: 12, duration: 1.5, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 12 },
          { startTime: 13.5, duration: 0.5, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 13 },
          { startTime: 14, duration: 2, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 14 }
        ]
      }
    ]
  },
  {
    title: "Twinkle Twinkle Little Star",
    artist: "Traditional",
    tags: ["default-list", "folk", "beginner"],
    variants: [
      {
        variantId: "original",
        name: "Original",
        properties: {
          scale: "C",
          octaveRange: [4, 5],
          noteTypes: ["Single Notes"],
          rhythmPatterns: ["Quarter Notes"],
          originalBPM: 60
        },
        sequence: [
          // C C G G | A A G | F F E E | D D C
          { startTime: 0, duration: 1, expectedNotes: [60], clef: "treble", notes: [{ note: "C", octave: 4 }], sequenceIndex: 0 },
          { startTime: 1, duration: 1, expectedNotes: [60], clef: "treble", notes: [{ note: "C", octave: 4 }], sequenceIndex: 1 },
          { startTime: 2, duration: 1, expectedNotes: [67], clef: "treble", notes: [{ note: "G", octave: 4 }], sequenceIndex: 2 },
          { startTime: 3, duration: 1, expectedNotes: [67], clef: "treble", notes: [{ note: "G", octave: 4 }], sequenceIndex: 3 },
          { startTime: 4, duration: 1, expectedNotes: [69], clef: "treble", notes: [{ note: "A", octave: 4 }], sequenceIndex: 4 },
          { startTime: 5, duration: 1, expectedNotes: [69], clef: "treble", notes: [{ note: "A", octave: 4 }], sequenceIndex: 5 },
          { startTime: 6, duration: 2, expectedNotes: [67], clef: "treble", notes: [{ note: "G", octave: 4 }], sequenceIndex: 6 },
          { startTime: 8, duration: 1, expectedNotes: [65], clef: "treble", notes: [{ note: "F", octave: 4 }], sequenceIndex: 7 },
          { startTime: 9, duration: 1, expectedNotes: [65], clef: "treble", notes: [{ note: "F", octave: 4 }], sequenceIndex: 8 },
          { startTime: 10, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 9 },
          { startTime: 11, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 10 },
          { startTime: 12, duration: 1, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 11 },
          { startTime: 13, duration: 1, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 12 },
          { startTime: 14, duration: 2, expectedNotes: [60], clef: "treble", notes: [{ note: "C", octave: 4 }], sequenceIndex: 13 }
        ]
      }
    ]
  },
  {
    title: "C Major Scale",
    artist: "Exercise",
    tags: ["default-list", "exercise", "scale"],
    variants: [
      {
        variantId: "original",
        name: "Original",
        properties: {
          scale: "C",
          octaveRange: [4, 5],
          noteTypes: ["Single Notes"],
          rhythmPatterns: ["Quarter Notes"],
          originalBPM: 80
        },
        sequence: [
          // C D E F G A B C ascending
          { startTime: 0, duration: 1, expectedNotes: [60], clef: "treble", notes: [{ note: "C", octave: 4 }], sequenceIndex: 0 },
          { startTime: 1, duration: 1, expectedNotes: [62], clef: "treble", notes: [{ note: "D", octave: 4 }], sequenceIndex: 1 },
          { startTime: 2, duration: 1, expectedNotes: [64], clef: "treble", notes: [{ note: "E", octave: 4 }], sequenceIndex: 2 },
          { startTime: 3, duration: 1, expectedNotes: [65], clef: "treble", notes: [{ note: "F", octave: 4 }], sequenceIndex: 3 },
          { startTime: 4, duration: 1, expectedNotes: [67], clef: "treble", notes: [{ note: "G", octave: 4 }], sequenceIndex: 4 },
          { startTime: 5, duration: 1, expectedNotes: [69], clef: "treble", notes: [{ note: "A", octave: 4 }], sequenceIndex: 5 },
          { startTime: 6, duration: 1, expectedNotes: [71], clef: "treble", notes: [{ note: "B", octave: 4 }], sequenceIndex: 6 },
          { startTime: 7, duration: 1, expectedNotes: [72], clef: "treble", notes: [{ note: "C", octave: 5 }], sequenceIndex: 7 }
        ]
      }
    ]
  }
];

// Initialize default songs in storage if library is empty
export const initializeDefaultSongs = () => {
  const library = getSongLibrary();

  // Only add if library is empty
  if (Object.keys(library).length === 0) {
    addSongs(DEFAULT_SONGS);
    console.log('Initialized default song library');
  }
};
