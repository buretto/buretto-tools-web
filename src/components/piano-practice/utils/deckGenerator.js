// Scale definitions with note patterns
const SCALE_PATTERNS = {
  'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
  'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
  'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
  'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
  'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F']
};

// Octave ranges for different difficulty levels
const OCTAVE_RANGES = {
  'half-octave': { treble: [4], bass: [3] },
  'full-octave': { treble: [4, 5], bass: [2, 3] },
  'full-scale': { treble: [4, 5, 6], bass: [2, 3, 4] }
};

class DeckGenerator {
  constructor(deckConfig) {
    this.scale = deckConfig.scale;
    this.practiceType = deckConfig.practiceType;
    this.difficulty = deckConfig.difficulty;
    this.hands = deckConfig.hands;
    this.range = deckConfig.range;
  }

  generateDeck(size = 100) {
    const deck = [];
    const scaleNotes = SCALE_PATTERNS[this.scale];
    const octaveRange = OCTAVE_RANGES[this.difficulty];

    for (let i = 0; i < size; i++) {
      const card = this.generateCard(scaleNotes, octaveRange);
      deck.push(card);
    }

    return this.shuffleArray(deck);
  }

  generateCard(scaleNotes, octaveRange) {
    switch (this.practiceType) {
      case 'single-notes':
        return this.generateSingleNote(scaleNotes, octaveRange);
      case 'intervals-one-hand':
        return this.generateInterval(scaleNotes, octaveRange, false);
      case 'chords-one-hand':
        return this.generateChord(scaleNotes, octaveRange, false);
      case 'single-notes-both-hands':
        return this.generateSingleNote(scaleNotes, octaveRange, true);
      case 'intervals-both-hands':
        return this.generateInterval(scaleNotes, octaveRange, true);
      case 'multi-notes-both-hands':
        return this.generateMultiNotes(scaleNotes, octaveRange);
      default:
        return this.generateSingleNote(scaleNotes, octaveRange);
    }
  }

  generateSingleNote(scaleNotes, octaveRange, bothHands = false) {
    const note = this.getRandomNote(scaleNotes);

    if (bothHands) {
      const trebleOctave = this.getRandomOctave(octaveRange.treble);
      const bassOctave = this.getRandomOctave(octaveRange.bass);

      return {
        type: 'single-notes-both',
        treble: [{ note, octave: trebleOctave }],
        bass: [{ note, octave: bassOctave }],
        expectedNotes: [
          this.noteToMidi(note, trebleOctave),
          this.noteToMidi(note, bassOctave)
        ]
      };
    } else {
      const clef = Math.random() > 0.5 ? 'treble' : 'bass';
      const octave = this.getRandomOctave(octaveRange[clef]);

      return {
        type: 'single-note',
        clef,
        notes: [{ note, octave }],
        expectedNotes: [this.noteToMidi(note, octave)]
      };
    }
  }

  generateInterval(scaleNotes, octaveRange, bothHands = false) {
    const note1 = this.getRandomNote(scaleNotes);
    const note2 = this.getRandomNote(scaleNotes);

    if (bothHands) {
      const trebleOctave = this.getRandomOctave(octaveRange.treble);
      const bassOctave = this.getRandomOctave(octaveRange.bass);

      return {
        type: 'interval-both',
        treble: [{ note: note1, octave: trebleOctave }],
        bass: [{ note: note2, octave: bassOctave }],
        expectedNotes: [
          this.noteToMidi(note1, trebleOctave),
          this.noteToMidi(note2, bassOctave)
        ]
      };
    } else {
      const clef = Math.random() > 0.5 ? 'treble' : 'bass';
      const octave = this.getRandomOctave(octaveRange[clef]);

      return {
        type: 'interval',
        clef,
        notes: [
          { note: note1, octave },
          { note: note2, octave }
        ],
        expectedNotes: [
          this.noteToMidi(note1, octave),
          this.noteToMidi(note2, octave)
        ]
      };
    }
  }

  generateChord(scaleNotes, octaveRange, bothHands = false) {
    const chordNotes = this.getRandomChordNotes(scaleNotes);

    if (bothHands) {
      const trebleOctave = this.getRandomOctave(octaveRange.treble);
      const bassOctave = this.getRandomOctave(octaveRange.bass);

      // Split chord between hands
      const midPoint = Math.floor(chordNotes.length / 2);
      const trebleNotes = chordNotes.slice(midPoint);
      const bassNotes = chordNotes.slice(0, midPoint);

      return {
        type: 'chord-both',
        treble: trebleNotes.map(note => ({ note, octave: trebleOctave })),
        bass: bassNotes.map(note => ({ note, octave: bassOctave })),
        expectedNotes: [
          ...trebleNotes.map(note => this.noteToMidi(note, trebleOctave)),
          ...bassNotes.map(note => this.noteToMidi(note, bassOctave))
        ]
      };
    } else {
      const clef = Math.random() > 0.5 ? 'treble' : 'bass';
      const octave = this.getRandomOctave(octaveRange[clef]);

      return {
        type: 'chord',
        clef,
        notes: chordNotes.map(note => ({ note, octave })),
        expectedNotes: chordNotes.map(note => this.noteToMidi(note, octave))
      };
    }
  }

  generateMultiNotes(scaleNotes, octaveRange) {
    const noteCount = Math.floor(Math.random() * 3) + 2; // 2-4 notes total
    const trebleCount = Math.floor(noteCount / 2) + (noteCount % 2);
    const bassCount = noteCount - trebleCount;

    const trebleNotes = [];
    const bassNotes = [];

    for (let i = 0; i < trebleCount; i++) {
      const note = this.getRandomNote(scaleNotes);
      const octave = this.getRandomOctave(octaveRange.treble);
      trebleNotes.push({ note, octave });
    }

    for (let i = 0; i < bassCount; i++) {
      const note = this.getRandomNote(scaleNotes);
      const octave = this.getRandomOctave(octaveRange.bass);
      bassNotes.push({ note, octave });
    }

    return {
      type: 'multi-notes',
      treble: trebleNotes,
      bass: bassNotes,
      expectedNotes: [
        ...trebleNotes.map(({ note, octave }) => this.noteToMidi(note, octave)),
        ...bassNotes.map(({ note, octave }) => this.noteToMidi(note, octave))
      ]
    };
  }

  getRandomNote(scaleNotes) {
    return scaleNotes[Math.floor(Math.random() * scaleNotes.length)];
  }

  getRandomOctave(octaves) {
    return octaves[Math.floor(Math.random() * octaves.length)];
  }

  getRandomChordNotes(scaleNotes) {
    const chordSize = Math.floor(Math.random() * 2) + 3; // 3-4 notes
    const selectedNotes = [];
    const availableNotes = [...scaleNotes];

    for (let i = 0; i < chordSize && availableNotes.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableNotes.length);
      selectedNotes.push(availableNotes.splice(randomIndex, 1)[0]);
    }

    return selectedNotes.sort();
  }

  noteToMidi(noteName, octave) {
    const noteValues = {
      'C': 0, 'C#': 1, 'Db': 1,
      'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4,
      'F': 5, 'F#': 6, 'Gb': 6,
      'G': 7, 'G#': 8, 'Ab': 8,
      'A': 9, 'A#': 10, 'Bb': 10,
      'B': 11
    };

    return (octave + 1) * 12 + noteValues[noteName];
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

export default DeckGenerator;