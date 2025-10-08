import DeckGenerator from './deckGenerator';

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
    this.deckConfig = deckConfig;
    this.rhythmPattern = deckConfig.rhythmPattern || 'quarter-notes';
    this.bpm = deckConfig.bpm || 120; // Use BPM from deck config
    this.goal = deckConfig.goal || { beats: 72, accuracy: 0.9 }; // Default goal
    this.fixedSequence = deckConfig.fixedSequence || null; // Support fixed sequences for songs

    // Create a DeckGenerator instance for note generation
    this.deckGenerator = new DeckGenerator(deckConfig);

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
    // Use DeckGenerator to create a card, then adapt it to sequence format
    const cards = this.deckGenerator.generateDeck(1);
    const card = cards[0];

    // Return the card as-is since it already has the correct structure
    // (treble, bass, notes, clef, expectedNotes)
    return card;
  }

  getNextNoteDuration() {
    const durations = this.rhythmConfig.durations;
    return durations[Math.floor(Math.random() * durations.length)];
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