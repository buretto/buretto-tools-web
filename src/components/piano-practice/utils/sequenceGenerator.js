// Scale definitions with note patterns (reuse from deckGenerator)
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

// Rhythm patterns with note durations (in beats)
const RHYTHM_PATTERNS = {
  'quarter-notes': {
    name: 'Quarter Notes',
    durations: [1], // Only quarter notes
    tempo: 120 // BPM
  },
  'mixed-simple': {
    name: 'Mixed Simple',
    durations: [1, 2], // Quarter and half notes
    tempo: 100
  },
  'mixed-complex': {
    name: 'Mixed Complex',
    durations: [0.5, 1, 2, 4], // Eighth, quarter, half, whole notes
    tempo: 80
  },
  'syncopated': {
    name: 'Syncopated',
    durations: [0.5, 1.5, 1], // Eighth, dotted quarter, quarter
    tempo: 90
  }
};

class SequenceGenerator {
  constructor(deckConfig) {
    this.scale = deckConfig.scale;
    this.practiceType = deckConfig.practiceType;
    this.difficulty = deckConfig.difficulty;
    this.hands = deckConfig.hands;
    this.rhythmPattern = deckConfig.rhythmPattern || 'quarter-notes';
    this.range = deckConfig.range;
    this.bpm = deckConfig.bpm || 120; // Use BPM from deck config
    this.goal = deckConfig.goal || { beats: 72, accuracy: 0.9 }; // Default goal
    this.fixedSequence = deckConfig.fixedSequence || null; // Support fixed sequences for songs

    this.scaleNotes = SCALE_PATTERNS[this.scale];
    this.octaveRange = OCTAVE_RANGES[this.difficulty];
    this.rhythmConfig = {
      ...RHYTHM_PATTERNS[this.rhythmPattern],
      tempo: this.bpm // Override tempo with selected BPM
    };
  }

  // Generate a sequence that lasts approximately targetDuration seconds
  generateSequence(targetDuration = 60) {
    // If fixed sequence provided (e.g., for song practice), add sequenceIndex if missing
    if (this.fixedSequence) {
      return this.fixedSequence.map((note, index) => ({
        ...note,
        sequenceIndex: note.sequenceIndex !== undefined ? note.sequenceIndex : index
      }));
    }
    const sequence = [];
    const beatsPerSecond = this.rhythmConfig.tempo / 60;
    const targetBeats = targetDuration * beatsPerSecond;

    let currentBeat = 0;
    let sequenceIndex = 0;

    while (currentBeat < targetBeats) {
      const note = this.generateSequenceNote(sequenceIndex);
      const duration = this.getNextNoteDuration();

      sequence.push({
        ...note,
        duration,
        startTime: currentBeat / beatsPerSecond,
        endTime: (currentBeat + duration) / beatsPerSecond,
        sequenceIndex
      });

      currentBeat += duration;
      sequenceIndex++;
    }

    return sequence;
  }

  generateSequenceNote(sequenceIndex) {
    // Create musical patterns that resemble actual songs
    const isBassMeasure = this.shouldPlayBass(sequenceIndex);

    switch (this.practiceType) {
      case 'single-notes':
        return this.generateSequenceSingleNote(isBassMeasure);
      case 'intervals-one-hand':
        return this.generateSequenceInterval(isBassMeasure, false);
      case 'chords-one-hand':
        return this.generateSequenceChord(isBassMeasure, false);
      case 'single-notes-both-hands':
        return this.generateSequenceSingleNote(false, true);
      case 'intervals-both-hands':
        return this.generateSequenceInterval(false, true);
      case 'multi-notes-both-hands':
        return this.generateSequenceMultiNotes();
      default:
        return this.generateSequenceSingleNote(isBassMeasure);
    }
  }

  // Determine if this note should be bass (create song-like patterns)
  shouldPlayBass(sequenceIndex) {
    if (this.hands === 'both') return false; // Both hands handle their own logic

    // Bass notes play less frequently - every 4th note on average
    // Add some musical pattern by making it more likely on strong beats
    const strongBeat = sequenceIndex % 4 === 0;
    const bassChance = strongBeat ? 0.4 : 0.1;

    return Math.random() < bassChance;
  }

  generateSequenceSingleNote(preferBass = false, bothHands = false) {
    if (bothHands) {
      // For both hands, create complementary parts
      const trebleNote = this.getRandomNote(this.scaleNotes);
      const bassNote = this.getRandomNote(this.scaleNotes);
      const trebleOctave = this.getRandomOctave(this.octaveRange.treble);
      const bassOctave = this.getRandomOctave(this.octaveRange.bass);

      return {
        type: 'single-notes-both',
        treble: [{ note: trebleNote, octave: trebleOctave }],
        bass: [{ note: bassNote, octave: bassOctave }],
        expectedNotes: [
          this.noteToMidi(trebleNote, trebleOctave),
          this.noteToMidi(bassNote, bassOctave)
        ],
        clef: 'both'
      };
    } else {
      const clef = preferBass ? 'bass' : (Math.random() > 0.7 ? 'bass' : 'treble');
      const note = this.getRandomNote(this.scaleNotes);
      const octave = this.getRandomOctave(this.octaveRange[clef]);

      return {
        type: 'single-note',
        clef,
        notes: [{ note, octave }],
        expectedNotes: [this.noteToMidi(note, octave)]
      };
    }
  }

  generateSequenceInterval(preferBass = false, bothHands = false) {
    if (bothHands) {
      const trebleNote1 = this.getRandomNote(this.scaleNotes);
      const trebleNote2 = this.getRandomNote(this.scaleNotes);
      const bassNote1 = this.getRandomNote(this.scaleNotes);
      const bassNote2 = this.getRandomNote(this.scaleNotes);

      const trebleOctave = this.getRandomOctave(this.octaveRange.treble);
      const bassOctave = this.getRandomOctave(this.octaveRange.bass);

      return {
        type: 'interval-both',
        treble: [
          { note: trebleNote1, octave: trebleOctave },
          { note: trebleNote2, octave: trebleOctave }
        ],
        bass: [
          { note: bassNote1, octave: bassOctave },
          { note: bassNote2, octave: bassOctave }
        ],
        expectedNotes: [
          this.noteToMidi(trebleNote1, trebleOctave),
          this.noteToMidi(trebleNote2, trebleOctave),
          this.noteToMidi(bassNote1, bassOctave),
          this.noteToMidi(bassNote2, bassOctave)
        ],
        clef: 'both'
      };
    } else {
      const clef = preferBass ? 'bass' : (Math.random() > 0.7 ? 'bass' : 'treble');
      const note1 = this.getRandomNote(this.scaleNotes);
      const note2 = this.getRandomNote(this.scaleNotes);
      const octave = this.getRandomOctave(this.octaveRange[clef]);

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

  generateSequenceChord(preferBass = false, bothHands = false) {
    const chordNotes = this.getRandomChordNotes(this.scaleNotes);

    if (bothHands) {
      const trebleOctave = this.getRandomOctave(this.octaveRange.treble);
      const bassOctave = this.getRandomOctave(this.octaveRange.bass);

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
        ],
        clef: 'both'
      };
    } else {
      const clef = preferBass ? 'bass' : (Math.random() > 0.7 ? 'bass' : 'treble');
      const octave = this.getRandomOctave(this.octaveRange[clef]);

      return {
        type: 'chord',
        clef,
        notes: chordNotes.map(note => ({ note, octave })),
        expectedNotes: chordNotes.map(note => this.noteToMidi(note, octave))
      };
    }
  }

  generateSequenceMultiNotes() {
    // Create varied musical textures
    const trebleCount = Math.floor(Math.random() * 2) + 1; // 1-2 notes
    const bassCount = Math.floor(Math.random() * 2) + 1; // 1-2 notes

    const trebleNotes = [];
    const bassNotes = [];

    for (let i = 0; i < trebleCount; i++) {
      const note = this.getRandomNote(this.scaleNotes);
      const octave = this.getRandomOctave(this.octaveRange.treble);
      trebleNotes.push({ note, octave });
    }

    for (let i = 0; i < bassCount; i++) {
      const note = this.getRandomNote(this.scaleNotes);
      const octave = this.getRandomOctave(this.octaveRange.bass);
      bassNotes.push({ note, octave });
    }

    return {
      type: 'multi-notes',
      treble: trebleNotes,
      bass: bassNotes,
      expectedNotes: [
        ...trebleNotes.map(({ note, octave }) => this.noteToMidi(note, octave)),
        ...bassNotes.map(({ note, octave }) => this.noteToMidi(note, octave))
      ],
      clef: 'both'
    };
  }

  getNextNoteDuration() {
    const durations = this.rhythmConfig.durations;
    return durations[Math.floor(Math.random() * durations.length)];
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

  // Get rhythm configuration for display
  getRhythmConfig() {
    return this.rhythmConfig;
  }

  // Get total duration estimate for a sequence
  estimateSequenceDuration(sequence) {
    if (sequence.length === 0) return 0;
    const lastNote = sequence[sequence.length - 1];
    return lastNote.endTime;
  }
}

export default SequenceGenerator;