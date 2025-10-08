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

// Interval definitions matching DeckSelector options
const INTERVAL_DEGREES = {
  '2nd': 1,
  '3rd': 2,
  '4th': 3,
  '5th': 4,
  'octave': 7,
  '6th': 5,
  '7th': 6,
  '9th': 8,
  '10th': 9
};

class DeckGenerator {
  constructor(deckConfig) {
    this.scale = deckConfig.scale;
    this.practiceType = deckConfig.practiceType;
    this.difficulty = deckConfig.difficulty;
    this.range = deckConfig.range;
    this.hand = deckConfig.hand || 'both';
    this.selectedInversions = deckConfig.selectedInversions || [];
    this.simultaneousPlay = deckConfig.simultaneousPlay || [];
    this.supportsInversions = deckConfig.supportsInversions || false;
    this.selectedIntervals = deckConfig.selectedIntervals || [];
    this.intervalType = deckConfig.intervalType || null;
  }

  generateDeck(size = 100) {
    const deck = [];
    const scaleNotes = SCALE_PATTERNS[this.scale];
    const octaveRange = OCTAVE_RANGES[this.difficulty];

    for (let i = 0; i < size; i++) {
      let card = this.generateCard(scaleNotes, octaveRange);

      // Apply simultaneous play notes if configured (sight reading mode)
      if (this.simultaneousPlay && this.simultaneousPlay.length > 0) {
        card = this.addSimultaneousPlayNotes(card, scaleNotes, octaveRange);
      }

      deck.push(card);
    }

    return this.shuffleArray(deck);
  }

  generateCard(scaleNotes, octaveRange) {
    switch (this.practiceType) {
      case 'single-notes':
        return this.generateSingleNote(scaleNotes, octaveRange);
      case 'intervals-basic':
        return this.generateBasicInterval(scaleNotes, octaveRange);
      case 'intervals-advanced':
        return this.generateAdvancedInterval(scaleNotes, octaveRange);
      case 'triads':
        return this.generateTriad(scaleNotes, octaveRange);
      case 'sevenths':
        return this.generateSeventhChord(scaleNotes, octaveRange);
      // Legacy support for old practice types
      case 'intervals-one-hand':
        return this.generateBasicInterval(scaleNotes, octaveRange);
      case 'chords-one-hand':
        return this.generateChord(scaleNotes, octaveRange, false);
      case 'single-notes-both-hands':
        return this.generateSingleNote(scaleNotes, octaveRange, true);
      case 'intervals-both-hands':
        return this.generateBasicInterval(scaleNotes, octaveRange);
      case 'multi-notes-both-hands':
        return this.generateMultiNotes(scaleNotes, octaveRange);
      default:
        return this.generateSingleNote(scaleNotes, octaveRange);
    }
  }

  generateSingleNote(scaleNotes, octaveRange) {
    const note = this.getRandomNote(scaleNotes);

    // For "both hands" mode, randomly pick ONE clef (not both)
    const clef = this.hand === 'left' ? 'bass' : this.hand === 'right' ? 'treble' : (Math.random() > 0.5 ? 'treble' : 'bass');
    const octave = this.getRandomOctave(octaveRange[clef]);

    return {
      type: 'single-note',
      clef,
      notes: [{ note, octave }],
      expectedNotes: [this.noteToMidi(note, octave)]
    };
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

  generateBasicInterval(scaleNotes, octaveRange) {
    // Basic intervals: 2nd, 3rd, 4th, 5th, Octave
    // Use selectedIntervals if provided, otherwise use all basic intervals
    let intervalSizes;
    if (this.selectedIntervals && this.selectedIntervals.length > 0) {
      // Convert selected interval IDs to their degree values
      intervalSizes = this.selectedIntervals.map(id => INTERVAL_DEGREES[id]);
    } else {
      // Default to all basic intervals
      intervalSizes = [1, 2, 3, 4, 7]; // 2nd, 3rd, 4th, 5th, octave
    }

    const intervalSize = intervalSizes[Math.floor(Math.random() * intervalSizes.length)];

    const rootNoteIndex = Math.floor(Math.random() * scaleNotes.length);
    const note2Index = (rootNoteIndex + intervalSize) % scaleNotes.length;
    const note1 = scaleNotes[rootNoteIndex];
    const note2 = scaleNotes[note2Index];

    // For "both hands" mode, randomly pick ONE clef (not both)
    const clef = this.hand === 'left' ? 'bass' : this.hand === 'right' ? 'treble' : (Math.random() > 0.5 ? 'treble' : 'bass');
    const octave = this.getRandomOctave(octaveRange[clef]);

    // Handle octave adjustment for the second note
    // If interval is an octave, second note goes up one octave
    // If the interval wrapped around the scale (note2Index < rootNoteIndex), second note also goes up one octave
    const octave2 = (intervalSize === 7 || note2Index < rootNoteIndex) ? octave + 1 : octave;

    return {
      type: 'interval-basic',
      clef,
      notes: [
        { note: note1, octave },
        { note: note2, octave: octave2 }
      ],
      expectedNotes: [
        this.noteToMidi(note1, octave),
        this.noteToMidi(note2, octave2)
      ]
    };
  }

  generateAdvancedInterval(scaleNotes, octaveRange) {
    // Advanced intervals: 6th, 7th, 9th, 10th
    // Use selectedIntervals if provided, otherwise use all advanced intervals
    let intervalSizes;
    if (this.selectedIntervals && this.selectedIntervals.length > 0) {
      // Convert selected interval IDs to their degree values
      intervalSizes = this.selectedIntervals.map(id => INTERVAL_DEGREES[id]);
    } else {
      // Default to all advanced intervals
      intervalSizes = [5, 6, 8, 9]; // 6th, 7th, 9th, 10th
    }

    const intervalSize = intervalSizes[Math.floor(Math.random() * intervalSizes.length)];

    const rootNoteIndex = Math.floor(Math.random() * scaleNotes.length);
    const note2Index = (rootNoteIndex + intervalSize) % scaleNotes.length;
    const note1 = scaleNotes[rootNoteIndex];
    const note2 = scaleNotes[note2Index];

    // For "both hands" mode, randomly pick ONE clef (not both)
    const clef = this.hand === 'left' ? 'bass' : this.hand === 'right' ? 'treble' : (Math.random() > 0.5 ? 'treble' : 'bass');
    const octave = this.getRandomOctave(octaveRange[clef]);

    // Handle octave adjustment for the second note
    // 9th and 10th intervals always go up an octave
    // Also, if the interval wrapped around the scale, second note goes up an octave
    const octave2 = (intervalSize >= 7 || note2Index < rootNoteIndex) ? octave + 1 : octave;

    return {
      type: 'interval-advanced',
      clef,
      notes: [
        { note: note1, octave },
        { note: note2, octave: octave2 }
      ],
      expectedNotes: [
        this.noteToMidi(note1, octave),
        this.noteToMidi(note2, octave2)
      ]
    };
  }

  generateTriad(scaleNotes, octaveRange) {
    // Generate a triad from scale degrees (I, ii, iii, IV, V, vi, vii°)
    const rootIndex = Math.floor(Math.random() * scaleNotes.length);
    const root = scaleNotes[rootIndex];
    const third = scaleNotes[(rootIndex + 2) % scaleNotes.length];
    const fifth = scaleNotes[(rootIndex + 4) % scaleNotes.length];

    let chordNotes = [
      { note: root, degree: 0 },
      { note: third, degree: 2 },
      { note: fifth, degree: 4 }
    ];

    // Apply inversion
    chordNotes = this.applyInversion(chordNotes, 'triad');

    const clef = this.hand === 'left' ? 'bass' : this.hand === 'right' ? 'treble' : (Math.random() > 0.5 ? 'treble' : 'bass');
    const baseOctave = this.getRandomOctave(octaveRange[clef]);

    const notesWithOctaves = chordNotes.map((n, idx) => ({
      note: n.note,
      octave: baseOctave + (n.octaveAdjust || 0)
    }));

    return {
      type: 'triad',
      clef,
      notes: notesWithOctaves,
      expectedNotes: notesWithOctaves.map(({ note, octave }) => this.noteToMidi(note, octave))
    };
  }

  generateSeventhChord(scaleNotes, octaveRange) {
    // Generate a 7th chord from scale degrees
    const rootIndex = Math.floor(Math.random() * scaleNotes.length);
    const root = scaleNotes[rootIndex];
    const third = scaleNotes[(rootIndex + 2) % scaleNotes.length];
    const fifth = scaleNotes[(rootIndex + 4) % scaleNotes.length];
    const seventh = scaleNotes[(rootIndex + 6) % scaleNotes.length];

    let chordNotes = [
      { note: root, degree: 0 },
      { note: third, degree: 2 },
      { note: fifth, degree: 4 },
      { note: seventh, degree: 6 }
    ];

    // Apply inversion
    chordNotes = this.applyInversion(chordNotes, 'seventh');

    const clef = this.hand === 'left' ? 'bass' : this.hand === 'right' ? 'treble' : (Math.random() > 0.5 ? 'treble' : 'bass');
    const baseOctave = this.getRandomOctave(octaveRange[clef]);

    const notesWithOctaves = chordNotes.map((n, idx) => ({
      note: n.note,
      octave: baseOctave + (n.octaveAdjust || 0)
    }));

    return {
      type: 'seventh',
      clef,
      notes: notesWithOctaves,
      expectedNotes: notesWithOctaves.map(({ note, octave }) => this.noteToMidi(note, octave))
    };
  }

  applyInversion(chordNotes, chordType) {
    // chordNotes is an array of {note, degree}
    // Returns same array with octaveAdjust property added

    // Pick a random inversion from the selected inversions array
    let inversionType = 'root';
    if (this.selectedInversions && this.selectedInversions.length > 0) {
      // Filter out 'third' for triads
      let availableInversions = this.selectedInversions;
      if (chordType === 'triad') {
        availableInversions = this.selectedInversions.filter(inv => inv !== 'third');
      }
      inversionType = availableInversions[Math.floor(Math.random() * availableInversions.length)];
    }

    const result = [...chordNotes];

    if (inversionType === 'root') {
      // Root position - no changes
      return chordNotes.map(n => ({ ...n, octaveAdjust: 0 }));
    } else if (inversionType === 'first') {
      // Move root up an octave
      result[0].octaveAdjust = 1;
      return result.slice(1).concat(result[0]);
    } else if (inversionType === 'second') {
      // Move root and third up an octave
      result[0].octaveAdjust = 1;
      result[1].octaveAdjust = 1;
      return result.slice(2).concat(result[0], result[1]);
    } else if (inversionType === 'third' && chordType === 'seventh') {
      // Move root, third, and fifth up an octave (7th chords only)
      result[0].octaveAdjust = 1;
      result[1].octaveAdjust = 1;
      result[2].octaveAdjust = 1;
      return result.slice(3).concat(result[0], result[1], result[2]);
    }

    return result.map(n => ({ ...n, octaveAdjust: 0 }));
  }

  addSimultaneousPlayNotes(card, scaleNotes, octaveRange) {
    // For sight reading mode: randomly add notes to the opposite hand
    // Only apply if simultaneousPlay is configured and we're not already playing both hands
    if (!this.simultaneousPlay || this.simultaneousPlay.length === 0) {
      return card;
    }

    // Don't apply if card already has both hands playing
    if (card.treble && card.bass) {
      return card;
    }

    // Randomly decide whether to add simultaneous notes (50% chance)
    if (Math.random() < 0.5) {
      return card;
    }

    // Determine which hand to add notes to (opposite of current)
    const addToTreble = card.clef === 'bass' || card.bass;
    const addToBass = card.clef === 'treble' || card.treble;

    // Pick the highest level from simultaneousPlay settings
    const maxLevel = Math.max(...this.simultaneousPlay.map(sp => {
      if (sp === 'single-notes') return 1;
      if (sp === 'intervals') return 2;
      if (sp === 'chords') return 3;
      return 0;
    }));

    // Randomly choose what to add (weighted towards simpler options)
    const rand = Math.random();
    let addType;
    if (maxLevel >= 3 && rand < 0.2) {
      addType = 'chord';
    } else if (maxLevel >= 2 && rand < 0.5) {
      addType = 'interval';
    } else {
      addType = 'single';
    }

    // Generate the additional notes
    let additionalNotes = [];
    if (addType === 'single') {
      const note = this.getRandomNote(scaleNotes);
      const octave = this.getRandomOctave(addToTreble ? octaveRange.treble : octaveRange.bass);
      additionalNotes = [{ note, octave }];
    } else if (addType === 'interval') {
      const note1 = this.getRandomNote(scaleNotes);
      const note2 = this.getRandomNote(scaleNotes);
      const octave = this.getRandomOctave(addToTreble ? octaveRange.treble : octaveRange.bass);
      additionalNotes = [
        { note: note1, octave },
        { note: note2, octave }
      ];
    } else if (addType === 'chord') {
      const chordNotes = this.getRandomChordNotes(scaleNotes).slice(0, 3);
      const octave = this.getRandomOctave(addToTreble ? octaveRange.treble : octaveRange.bass);
      additionalNotes = chordNotes.map(note => ({ note, octave }));
    }

    // Add the notes to the appropriate clef
    const updatedCard = { ...card };
    if (addToTreble) {
      updatedCard.treble = additionalNotes;
      updatedCard.expectedNotes = [
        ...card.expectedNotes,
        ...additionalNotes.map(({ note, octave }) => this.noteToMidi(note, octave))
      ];
    } else if (addToBass) {
      updatedCard.bass = additionalNotes;
      updatedCard.expectedNotes = [
        ...card.expectedNotes,
        ...additionalNotes.map(({ note, octave }) => this.noteToMidi(note, octave))
      ];
    }

    return updatedCard;
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