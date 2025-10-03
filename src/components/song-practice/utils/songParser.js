// Song parser - analyze song structure and extract properties

// Analyze a song sequence and extract properties
export const analyzeSongProperties = (sequence) => {
  if (!sequence || sequence.length === 0) {
    return null;
  }

  // Extract scale (most common root note)
  const scale = detectScale(sequence);

  // Extract octave range
  const octaveRange = detectOctaveRange(sequence);

  // Extract note types (single notes, intervals, chords, etc.)
  const noteTypes = detectNoteTypes(sequence);

  // Extract rhythm patterns
  const rhythmPatterns = detectRhythmPatterns(sequence);

  // Calculate original BPM from sequence timing
  const originalBPM = calculateBPM(sequence);

  return {
    scale,
    octaveRange,
    noteTypes,
    rhythmPatterns,
    originalBPM
  };
};

// Detect the scale of the song
const detectScale = (sequence) => {
  const noteCount = {};
  const scaleOrder = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // Count occurrences of each note (ignoring octave)
  sequence.forEach(note => {
    if (note.expectedNotes) {
      note.expectedNotes.forEach(midiNote => {
        const noteName = midiNoteToName(midiNote);
        const noteBase = noteName.replace(/[0-9]/g, ''); // Remove octave number
        noteCount[noteBase] = (noteCount[noteBase] || 0) + 1;
      });
    }
  });

  // Find most common note (likely the tonic)
  let mostCommonNote = 'C';
  let maxCount = 0;
  Object.entries(noteCount).forEach(([note, count]) => {
    if (count > maxCount) {
      mostCommonNote = note;
      maxCount = count;
    }
  });

  return mostCommonNote;
};

// Detect octave range
const detectOctaveRange = (sequence) => {
  let minOctave = 10;
  let maxOctave = 0;

  sequence.forEach(note => {
    if (note.expectedNotes) {
      note.expectedNotes.forEach(midiNote => {
        const octave = Math.floor(midiNote / 12) - 1;
        minOctave = Math.min(minOctave, octave);
        maxOctave = Math.max(maxOctave, octave);
      });
    }
  });

  return [minOctave, maxOctave];
};

// Detect note types (single notes, intervals, chords, both hands)
const detectNoteTypes = (sequence) => {
  const types = new Set();

  sequence.forEach(note => {
    const noteCount = note.expectedNotes ? note.expectedNotes.length : 0;
    const clef = note.clef;

    if (noteCount === 0) {
      // Rest or empty note
      return;
    }

    if (clef === 'both' || (note.treble && note.bass)) {
      // Both hands
      const trebleCount = note.treble ? note.treble.length : 0;
      const bassCount = note.bass ? note.bass.length : 0;

      if (trebleCount === 1 && bassCount === 1) {
        types.add('Single Notes (Both Hands)');
      } else if (trebleCount === 2 || bassCount === 2) {
        types.add('Intervals (Both Hands)');
      } else {
        types.add('Multi-Notes (Both Hands)');
      }
    } else {
      // Single hand
      if (noteCount === 1) {
        types.add('Single Notes');
      } else if (noteCount === 2) {
        types.add('Intervals (One Hand)');
      } else if (noteCount >= 3) {
        types.add('Chords (One Hand)');
      }
    }
  });

  return Array.from(types).sort();
};

// Detect rhythm patterns
const detectRhythmPatterns = (sequence) => {
  const patterns = new Set();
  const durations = sequence.map(note => note.duration || 1);

  // Check for quarter notes (all durations = 1)
  const allQuarterNotes = durations.every(d => d === 1);
  if (allQuarterNotes) {
    patterns.add('Quarter Notes');
    return Array.from(patterns);
  }

  // Check for half notes
  const hasHalfNotes = durations.some(d => d === 2);
  if (hasHalfNotes) {
    patterns.add('Mixed Simple');
  }

  // Check for eighth notes
  const hasEighthNotes = durations.some(d => d === 0.5);
  if (hasEighthNotes) {
    patterns.add('Mixed Complex');
  }

  // Check for syncopation (dotted notes, varied rhythms)
  const uniqueDurations = new Set(durations);
  if (uniqueDurations.size > 3) {
    patterns.add('Syncopated');
  }

  // Default to Mixed Simple if no specific pattern detected
  if (patterns.size === 0) {
    patterns.add('Mixed Simple');
  }

  return Array.from(patterns).sort();
};

// Calculate BPM from sequence timing
const calculateBPM = (sequence) => {
  if (sequence.length < 2) return 120; // Default

  // Find average time between notes
  const intervals = [];
  for (let i = 1; i < Math.min(sequence.length, 20); i++) {
    const interval = sequence[i].startTime - sequence[i - 1].startTime;
    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) return 120;

  const averageInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;

  // Convert interval to BPM (assuming quarter note = 1 beat)
  const bpm = Math.round(60 / averageInterval);

  // Clamp to reasonable range
  return Math.max(30, Math.min(240, bpm));
};

// Convert MIDI note number to note name
const midiNoteToName = (midiNote) => {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midiNote / 12) - 1;
  const noteName = noteNames[midiNote % 12];
  return `${noteName}${octave}`;
};

// Calculate complexity score (0-1, higher = more complex)
export const calculateComplexityScore = (properties) => {
  let score = 0;

  // Octave range complexity (wider = more complex)
  const octaveSpan = properties.octaveRange[1] - properties.octaveRange[0];
  score += Math.min(octaveSpan / 5, 1) * 0.3; // Max 0.3 for range

  // Note type complexity
  const complexityByType = {
    'Single Notes': 0.1,
    'Intervals (One Hand)': 0.3,
    'Chords (One Hand)': 0.5,
    'Single Notes (Both Hands)': 0.4,
    'Intervals (Both Hands)': 0.7,
    'Multi-Notes (Both Hands)': 1.0
  };

  const maxTypeComplexity = Math.max(
    ...properties.noteTypes.map(type => complexityByType[type] || 0.5)
  );
  score += maxTypeComplexity * 0.4; // Max 0.4 for note types

  // Rhythm complexity
  const rhythmComplexity = {
    'Quarter Notes': 0.1,
    'Mixed Simple': 0.3,
    'Mixed Complex': 0.7,
    'Syncopated': 1.0
  };

  const maxRhythmComplexity = Math.max(
    ...properties.rhythmPatterns.map(pattern => rhythmComplexity[pattern] || 0.5)
  );
  score += maxRhythmComplexity * 0.3; // Max 0.3 for rhythm

  return Math.min(score, 1);
};

// Check if song is complex enough to warrant simplified variants
export const isComplexEnoughForVariants = (properties) => {
  const complexityScore = calculateComplexityScore(properties);
  return complexityScore >= 0.5; // Threshold: 50% complexity or higher
};

// Parse imported song data (JSON format)
export const parseImportedSong = (songData) => {
  try {
    // Expected format:
    // {
    //   title: "Song Title",
    //   artist: "Artist Name" (optional),
    //   tags: ["tag1", "tag2"] (optional),
    //   sequence: [...] // Array of note objects
    // }

    if (!songData.title || !songData.sequence || !Array.isArray(songData.sequence)) {
      throw new Error('Invalid song data: missing title or sequence');
    }

    // Analyze properties from sequence
    const properties = analyzeSongProperties(songData.sequence);

    if (!properties) {
      throw new Error('Could not analyze song properties');
    }

    // Create song object with "original" variant
    const song = {
      title: songData.title,
      artist: songData.artist || null,
      tags: songData.tags || [],
      variants: [
        {
          variantId: 'original',
          name: 'Original',
          sequence: songData.sequence,
          properties
        }
      ]
    };

    return song;
  } catch (error) {
    console.error('Error parsing imported song:', error);
    return null;
  }
};

// Parse multiple imported songs
export const parseImportedSongs = (songsData) => {
  if (!Array.isArray(songsData)) {
    return [];
  }

  const parsedSongs = [];

  songsData.forEach((songData, index) => {
    const song = parseImportedSong(songData);
    if (song) {
      parsedSongs.push(song);
    } else {
      console.warn(`Failed to parse song at index ${index}`);
    }
  });

  return parsedSongs;
};

// Validate song sequence structure
export const validateSongSequence = (sequence) => {
  if (!Array.isArray(sequence)) {
    return { valid: false, error: 'Sequence must be an array' };
  }

  if (sequence.length === 0) {
    return { valid: false, error: 'Sequence cannot be empty' };
  }

  for (let i = 0; i < sequence.length; i++) {
    const note = sequence[i];

    if (!note.startTime && note.startTime !== 0) {
      return { valid: false, error: `Note at index ${i} missing startTime` };
    }

    if (!note.duration) {
      return { valid: false, error: `Note at index ${i} missing duration` };
    }

    if (!note.expectedNotes && !note.type) {
      return { valid: false, error: `Note at index ${i} missing expectedNotes or type` };
    }
  }

  return { valid: true };
};
