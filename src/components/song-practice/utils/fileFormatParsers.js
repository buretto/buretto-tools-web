// File format parsers for MIDI and MusicXML files
import { Midi } from '@tonejs/midi';

/**
 * Parse a MIDI file and convert to song sequence format
 * @param {File} file - MIDI file
 * @returns {Promise<Object>} - Song data with sequence
 */
export const parseMidiFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const midi = new Midi(arrayBuffer);

    if (!midi.tracks || midi.tracks.length === 0) {
      throw new Error('MIDI file contains no tracks');
    }

    // Combine all tracks into a single sequence
    const allNotes = [];

    midi.tracks.forEach(track => {
      track.notes.forEach(note => {
        allNotes.push({
          time: note.time,
          duration: note.duration,
          midi: note.midi,
          velocity: note.velocity,
          name: note.name
        });
      });
    });

    // Sort notes by time
    allNotes.sort((a, b) => a.time - b.time);

    if (allNotes.length === 0) {
      throw new Error('MIDI file contains no notes');
    }

    // Convert to our sequence format
    const sequence = allNotes.map(note => {
      const octave = Math.floor(note.midi / 12) - 1;
      // Note: Use uppercase for display, VexFlow will handle the conversion to lowercase internally
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const noteName = noteNames[note.midi % 12];

      // Determine clef based on MIDI note (middle C = 60)
      const clef = note.midi >= 60 ? 'treble' : 'bass';

      return {
        startTime: note.time,
        duration: note.duration,
        expectedNotes: [note.midi],
        clef: clef,
        notes: [
          {
            note: noteName,
            octave: octave
          }
        ]
      };
    });

    // Extract song name from filename (remove extension)
    const title = file.name.replace(/\.(mid|midi)$/i, '');

    return {
      title: title,
      sequence: sequence,
      sourceFormat: 'midi',
      originalBPM: midi.header.tempos.length > 0 ? Math.round(midi.header.tempos[0].bpm) : 120
    };

  } catch (error) {
    console.error('Error parsing MIDI file:', error);
    throw new Error(`Failed to parse MIDI file: ${error.message}`);
  }
};

/**
 * Parse a MusicXML file and convert to song sequence format
 * @param {File} file - MusicXML file
 * @returns {Promise<Object>} - Song data with sequence
 */
export const parseMusicXMLFile = async (file) => {
  try {
    const text = await file.text();

    // Parse the XML string
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      throw new Error('Invalid XML format');
    }

    const sequence = [];
    let currentTime = 0;
    let divisionsPerQuarter = 1;
    let tempo = 120; // Default BPM

    // Extract title
    let title = file.name.replace(/\.(xml|musicxml)$/i, '');
    const workTitle = xmlDoc.querySelector('work-title');
    const movementTitle = xmlDoc.querySelector('movement-title');
    if (movementTitle && movementTitle.textContent) {
      title = movementTitle.textContent.trim();
    } else if (workTitle && workTitle.textContent) {
      title = workTitle.textContent.trim();
    }

    // Handle score-partwise (most common format)
    const parts = xmlDoc.querySelectorAll('part');
    if (parts.length === 0) {
      throw new Error('No parts found in MusicXML file');
    }

    // Process all parts (we'll merge them)
    parts.forEach(part => {
      currentTime = 0; // Reset time for each part
      const measures = part.querySelectorAll('measure');

      measures.forEach(measure => {
        // Get divisions (timing resolution)
        const divisionsElem = measure.querySelector('divisions');
        if (divisionsElem) {
          divisionsPerQuarter = parseInt(divisionsElem.textContent) || 1;
        }

        // Get tempo
        const soundElem = measure.querySelector('sound[tempo]');
        if (soundElem) {
          tempo = parseFloat(soundElem.getAttribute('tempo')) || 120;
        }

        // Process all notes in the measure
        const notes = measure.querySelectorAll('note');
        notes.forEach(noteElem => {
          // Check if it's a rest
          if (noteElem.querySelector('rest')) {
            const durationElem = noteElem.querySelector('duration');
            if (durationElem) {
              const duration = parseInt(durationElem.textContent) || 0;
              currentTime += duration / divisionsPerQuarter;
            }
            return;
          }

          // Get pitch information
          const pitchElem = noteElem.querySelector('pitch');
          if (!pitchElem) return;

          const stepElem = pitchElem.querySelector('step');
          const octaveElem = pitchElem.querySelector('octave');
          const alterElem = pitchElem.querySelector('alter');

          if (!stepElem || !octaveElem) return;

          const step = stepElem.textContent.trim(); // C, D, E, F, G, A, B
          const octave = parseInt(octaveElem.textContent);
          const alter = alterElem ? parseInt(alterElem.textContent) : 0;

          // Convert to MIDI note number
          const noteMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
          const midiNote = (octave + 1) * 12 + noteMap[step] + alter;

          // Calculate note name with accidentals
          const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
          const noteName = noteNames[midiNote % 12];

          // Determine clef from staff or MIDI note
          let clef = 'treble';
          const staffElem = noteElem.querySelector('staff');
          if (staffElem && parseInt(staffElem.textContent) === 2) {
            clef = 'bass';
          } else if (midiNote < 60) {
            clef = 'bass';
          }

          // Calculate duration in beats (quarter notes)
          const durationElem = noteElem.querySelector('duration');
          const duration = durationElem ? parseInt(durationElem.textContent) / divisionsPerQuarter : 1;

          // Check if this is a chord (multiple notes at same time)
          const isChord = noteElem.querySelector('chord') !== null;

          if (isChord && sequence.length > 0) {
            // Add to previous note's chord
            const prevNote = sequence[sequence.length - 1];
            prevNote.expectedNotes.push(midiNote);
            prevNote.notes.push({
              note: noteName,
              octave: octave
            });
          } else {
            // Create new note entry
            sequence.push({
              startTime: currentTime,
              duration: duration,
              expectedNotes: [midiNote],
              clef: clef,
              notes: [
                {
                  note: noteName,
                  octave: octave
                }
              ]
            });

            // Advance time (unless it's a chord)
            currentTime += duration;
          }
        });
      });
    });

    if (sequence.length === 0) {
      throw new Error('No notes found in MusicXML file');
    }

    return {
      title: title,
      sequence: sequence,
      sourceFormat: 'musicxml',
      originalBPM: tempo
    };

  } catch (error) {
    console.error('Error parsing MusicXML file:', error);
    throw new Error(`Failed to parse MusicXML file: ${error.message}`);
  }
};

/**
 * Parse any supported file format
 * @param {File} file - File to parse
 * @returns {Promise<Object>} - Song data with sequence
 */
export const parseFile = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase();

  switch (extension) {
    case 'mid':
    case 'midi':
      return await parseMidiFile(file);

    case 'xml':
    case 'musicxml':
      return await parseMusicXMLFile(file);

    default:
      throw new Error(`Unsupported file format: .${extension}`);
  }
};

/**
 * Get supported file extensions
 * @returns {string} - File input accept attribute value
 */
export const getSupportedFileFormats = () => {
  return '.mid,.midi,.xml,.musicxml';
};
