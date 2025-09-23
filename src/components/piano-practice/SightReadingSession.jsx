import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import MidiHandler from './utils/midiHandler';
import SequenceGenerator from './utils/sequenceGenerator';
import TimingAnalyzer from './utils/timingAnalyzer';
import PerformanceMetrics from './utils/performanceMetrics';
import { midiNoteToName } from './utils/noteNames';

const SightReadingSession = ({ deck, onSessionComplete }) => {
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [sequence, setSequence] = useState([]);
  const [pressedNotes, setPressedNotes] = useState(new Set());
  const [midiStatus, setMidiStatus] = useState('connecting');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [notesReached, setNotesReached] = useState(0);

  // Refs for stable access
  const svgRef = useRef(null);
  const midiHandlerRef = useRef(null);
  const timerRef = useRef(null);
  const timingAnalyzerRef = useRef(null);
  const performanceMetricsRef = useRef(null);
  const sequenceRef = useRef([]);
  const currentNoteIndexRef = useRef(0);
  const pressedNotesRef = useRef(new Set());
  const waitingForCorrectNoteRef = useRef(null);
  const noteHoldStartRef = useRef(null);

  // Initialize system
  useEffect(() => {
    const initializeSession = async () => {
      // Initialize MIDI
      midiHandlerRef.current = new MidiHandler();
      const midiSuccess = await midiHandlerRef.current.initialize();

      if (midiSuccess) {
        setMidiStatus('connected');
        midiHandlerRef.current.setNoteCallbacks(handleMidiNoteOn, handleMidiNoteOff);
      } else {
        setMidiStatus('error');
      }

      // Initialize analyzers
      timingAnalyzerRef.current = new TimingAnalyzer();
      performanceMetricsRef.current = new PerformanceMetrics();

      // Generate sequence
      try {
        const generator = new SequenceGenerator(deck);
        const generatedSequence = generator.generateSequence(60);
        setSequence(generatedSequence);
        sequenceRef.current = generatedSequence;

        // Start session
        timingAnalyzerRef.current.startSession();
        performanceMetricsRef.current.startSession();
        performanceMetricsRef.current.setTotalExpectedNotes(generatedSequence.length);

        console.log('Generated sequence:', generatedSequence);
      } catch (error) {
        console.error('Error generating sequence:', error);
      }
    };

    initializeSession();

    return () => {
      if (midiHandlerRef.current) {
        midiHandlerRef.current.disconnect();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [deck]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    currentNoteIndexRef.current = currentNoteIndex;
  }, [currentNoteIndex]);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  useEffect(() => {
    sequenceRef.current = sequence;
    if (sequence.length > 0 && currentNoteIndex < sequence.length) {
      renderCurrentNotes();
    }
  }, [sequence, currentNoteIndex]);

  const handleMidiNoteOn = useCallback((midiNote) => {
    const currentSequence = sequenceRef.current;
    const currentIndex = currentNoteIndexRef.current;
    const currentTime = performance.now() / 1000;

    if (!currentSequence || currentIndex >= currentSequence.length) {
      // Note played when no notes are expected - record as unexpected
      performanceMetricsRef.current.recordUnexpectedNote(midiNote, currentTime);
      return;
    }
    const newPressedNotes = new Set([...pressedNotesRef.current, midiNote]);
    pressedNotesRef.current = newPressedNotes;
    setPressedNotes(newPressedNotes);

    // Record note hold start time
    noteHoldStartRef.current = currentTime;

    // Get current expected note
    const expectedNote = currentSequence[currentIndex];
    const expectedNotes = new Set(expectedNote.expectedNotes);

    // Check if we're waiting for a specific note to be replayed
    if (waitingForCorrectNoteRef.current) {
      const waitingNote = waitingForCorrectNoteRef.current;
      if (waitingNote.expectedNotes.includes(midiNote)) {
        // Check if all expected notes for this waiting note are now pressed
        const allWaitingNotesPressed = waitingNote.expectedNotes.every(note =>
          newPressedNotes.has(note)
        );

        if (allWaitingNotesPressed) {
          // Analyze timing for the corrected note
          const timingPerformance = timingAnalyzerRef.current.recordNotePerformance(
            waitingNote, currentTime, 0
          );

          if (timingPerformance.timingAccuracy === 'accurate' ||
              timingPerformance.timingAccuracy === 'early' ||
              timingPerformance.timingAccuracy === 'late') {

            // Success! Clear waiting state and advance
            performanceMetricsRef.current.recordCorrectNote(waitingNote, currentTime, timingPerformance);
            waitingForCorrectNoteRef.current = null;
            advanceToNextNote();
          }
        }
        return;
      }
    }

    // Check if this note is part of the current expected notes
    if (expectedNotes.has(midiNote)) {
      // Check if all expected notes are now pressed
      const allExpectedPressed = [...expectedNotes].every(note =>
        newPressedNotes.has(note)
      );

      if (allExpectedPressed) {
        // All notes are correct, analyze timing
        const timingPerformance = timingAnalyzerRef.current.recordNotePerformance(
          expectedNote, currentTime, 0
        );

        if (timingPerformance.timingAccuracy === 'too_early') {
          // Too early - treat as mistake, need to replay at correct time
          performanceMetricsRef.current.recordEarlyNote(expectedNote, currentTime, timingPerformance.drift);
          waitingForCorrectNoteRef.current = expectedNote;

          // Clear pressed notes to require replay
          setPressedNotes(new Set());
          pressedNotesRef.current = new Set();
        } else {
          // Correct timing (or acceptable early/late)
          performanceMetricsRef.current.recordCorrectNote(expectedNote, currentTime, timingPerformance);
          setCurrentStreak(prev => prev + 1);
          advanceToNextNote();
        }
      }
    } else {
      // Wrong note
      performanceMetricsRef.current.recordWrongNote(expectedNote, midiNote, currentTime);
      setCurrentStreak(0);
    }
  }, []);

  const handleMidiNoteOff = useCallback((midiNote) => {
    const currentTime = performance.now() / 1000;
    const holdDuration = noteHoldStartRef.current ?
      currentTime - noteHoldStartRef.current : 0;

    // Update pressed notes
    const newPressedNotes = new Set(pressedNotesRef.current);
    newPressedNotes.delete(midiNote);
    pressedNotesRef.current = newPressedNotes;
    setPressedNotes(newPressedNotes);

    // Record hold duration if this was part of the expected notes
    const currentSequence = sequenceRef.current;
    const currentIndex = currentNoteIndexRef.current;

    if (currentSequence && currentIndex < currentSequence.length) {
      const expectedNote = currentSequence[currentIndex];
      if (expectedNote.expectedNotes.includes(midiNote) && holdDuration > 0) {
        // Could track hold durations here if needed for analysis
      }
    }
  }, []);

  const advanceToNextNote = () => {
    const newIndex = currentNoteIndexRef.current + 1;
    setCurrentNoteIndex(newIndex);
    setNotesReached(prev => Math.max(prev, newIndex));

    // Update progress
    if (performanceMetricsRef.current && sequenceRef.current.length > 0) {
      performanceMetricsRef.current.updateProgress(newIndex, sequenceRef.current.length);
    }

    // Clear pressed notes for next note
    setPressedNotes(new Set());
    pressedNotesRef.current = new Set();
    waitingForCorrectNoteRef.current = null;
  };

  const endSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Finalize metrics
    if (performanceMetricsRef.current && timingAnalyzerRef.current) {
      performanceMetricsRef.current.endSession();

      const performanceMetrics = performanceMetricsRef.current.getPerformanceMetrics();
      const timingMetrics = timingAnalyzerRef.current.getTimingMetrics();
      const mistakeAnalysis = performanceMetricsRef.current.getMistakeAnalysis();
      const detailedAnalysis = timingAnalyzerRef.current.getDetailedAnalysis();

      const results = {
        ...performanceMetrics,
        timingMetrics,
        mistakeAnalysis,
        detailedAnalysis,
        sequence: sequenceRef.current,
        finalNoteIndex: currentNoteIndexRef.current
      };

      onSessionComplete(results);
    }
  };

  const handleStop = () => {
    endSession();
  };

  const groupNotesByMeasure = (notes) => {
    // Simple grouping - could be enhanced to handle proper measures
    return [notes.slice(0, 4)]; // Show up to 4 notes at once
  };

  const createStaveNotesFromSequence = (sequenceNotes, clef) => {
    if (!sequenceNotes || sequenceNotes.length === 0) return [];

    const staveNotes = [];

    sequenceNotes.forEach(sequenceNote => {
      const notes = extractNotesForClef(sequenceNote, clef);
      if (notes.length > 0) {
        const vexflowNote = createStaveNote(notes, clef, sequenceNote.duration);
        staveNotes.push(vexflowNote);
      }
    });

    return staveNotes;
  };

  const extractNotesForClef = (sequenceNote, clef) => {
    if (sequenceNote.clef && sequenceNote.clef !== clef && sequenceNote.clef !== 'both') {
      return [];
    }

    if (clef === 'treble' && sequenceNote.treble) {
      return sequenceNote.treble;
    }
    if (clef === 'bass' && sequenceNote.bass) {
      return sequenceNote.bass;
    }
    if (sequenceNote.notes && (sequenceNote.clef === clef || !sequenceNote.clef)) {
      return sequenceNote.notes;
    }

    return [];
  };

  const createStaveNote = (notes, clef, duration, isRest = false) => {
    // Convert duration to VexFlow duration
    let vexflowDuration = 'q'; // quarter note default
    if (duration <= 0.5) vexflowDuration = '8';
    else if (duration <= 1) vexflowDuration = 'q';
    else if (duration <= 2) vexflowDuration = 'h';
    else vexflowDuration = 'w';

    // Create rest if no notes or explicitly requested
    if (isRest || notes.length === 0) {
      vexflowDuration += 'r'; // Add 'r' suffix for rest
      return new StaveNote({
        clef: clef,
        keys: [clef === 'treble' ? 'b/4' : 'd/3'], // Dummy key for rest positioning
        duration: vexflowDuration
      });
    }

    // Convert notes to VexFlow format
    const vexflowNotes = notes.map(note => {
      let vexNote = `${note.note}`;

      // Handle accidentals
      if (note.note.includes('#')) {
        vexNote = note.note.replace('#', '');
      } else if (note.note.includes('b')) {
        vexNote = note.note.replace('b', '');
      }

      return `${vexNote}/${note.octave}`;
    });

    const staveNote = new StaveNote({
      clef: clef,
      keys: vexflowNotes,
      duration: vexflowDuration
    });

    // Add accidentals only for actual notes (not rests)
    if (!isRest && notes.length > 0) {
      notes.forEach((note, index) => {
        if (note.note.includes('#')) {
          staveNote.addAccidental(index, new Accidental('#'));
        } else if (note.note.includes('b')) {
          staveNote.addAccidental(index, new Accidental('b'));
        }
      });
    }

    return staveNote;
  };

  const highlightCurrentNote = (context, startIndex) => {
    // Could add visual highlighting of the current note here
    // For now, just rely on the progression indicator
  };

  const renderCurrentNotes = () => {
    const currentSequence = sequenceRef.current;
    const currentIndex = currentNoteIndexRef.current;

    if (!svgRef.current || !currentSequence) {
      return;
    }

    // Calculate which "page" of music to show
    // Each page shows 32 notes (2 rows of 16 notes each, 8 measures total)
    const notesPerPage = 32;
    const currentPage = Math.floor(currentIndex / notesPerPage);
    const pageStartIndex = currentPage * notesPerPage;

    // Get the notes for this page, pad with rests if needed
    let notesToRender = currentSequence.slice(pageStartIndex, pageStartIndex + notesPerPage);

    // Pad with rests if we don't have enough notes to fill the page
    while (notesToRender.length < notesPerPage) {
      notesToRender.push({
        type: 'rest',
        duration: 1,
        clef: 'both',
        expectedNotes: [],
        sequenceIndex: pageStartIndex + notesToRender.length
      });
    }

    renderSequenceNotes(notesToRender, pageStartIndex);
  };

  const renderSequenceNotes = (notes, startIndex) => {
    // Clear previous rendering
    svgRef.current.innerHTML = '';

    const renderer = new Renderer(svgRef.current, Renderer.Backends.SVG);
    renderer.resize(1000, 400);
    const context = renderer.getContext();

    try {
      if (!notes || notes.length === 0) {
        // Draw empty staves with placeholder
        context.fillStyle = '#666';
        context.font = '20px Arial';
        context.textAlign = 'center';
        context.fillText('♪ Ready to start ♪', 400, 200);
        return;
      }

      // Show 32 notes across two rows (4 measures per row, 8 measures total)
      const notesPerMeasure = 4; // 4 quarter notes per measure
      const measuresPerRow = 4; // 4 measures per row
      const notesPerRow = notesPerMeasure * measuresPerRow; // 16 notes per row

      // First row (measures 1-4)
      const firstRowNotes = notes.slice(0, notesPerRow);
      if (firstRowNotes.length > 0) {
        renderRowOfMeasures(context, firstRowNotes, 0, 20, 120); // y positions for treble/bass
      }

      // Second row (measures 5-8)
      const secondRowNotes = notes.slice(notesPerRow, notesPerRow * 2);
      if (secondRowNotes.length > 0) {
        renderRowOfMeasures(context, secondRowNotes, 1, 220, 320); // y positions for treble/bass
      }

    } catch (error) {
      console.error('Error rendering notes:', error);

      // Fallback: draw placeholder text
      context.fillStyle = '#666';
      context.font = '20px Arial';
      context.textAlign = 'center';
      context.fillText('♪ Loading music ♪', 400, 200);
    }

    // Highlight current note
    highlightCurrentNote(context, startIndex);
  };

  const renderRowOfMeasures = (context, notes, rowIndex, trebleY, bassY) => {
    if (!notes || notes.length === 0) return;

    const staveWidth = 175; // Smaller width to fit 4 measures per row
    const staveStartX = 50;

    // Create four measures per row
    for (let measureIndex = 0; measureIndex < 4; measureIndex++) {
      const measureStartIdx = measureIndex * 4;
      const measureNotes = notes.slice(measureStartIdx, measureStartIdx + 4);

      // Always render measure, even if empty (will be filled with rests)
      const xOffset = measureIndex * staveWidth;

      // Create treble stave for this measure
      const trebleStave = new Stave(staveStartX + xOffset, trebleY, staveWidth);
      if (measureIndex === 0) {
        trebleStave.addClef('treble');
      }
      trebleStave.setContext(context).draw();

      // Create bass stave for this measure
      const bassStave = new Stave(staveStartX + xOffset, bassY, staveWidth);
      if (measureIndex === 0) {
        bassStave.addClef('bass');
      }
      bassStave.setContext(context).draw();

      // Collect notes for each clef in this measure
      const trebleStaveNotes = [];
      const bassStaveNotes = [];

      // For simplicity, convert all notes to quarter notes to avoid timing issues
      // This ensures exactly 4 beats per measure
      for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
        const note = measureNotes[beatIndex];

        if (note) {
          // Add treble notes
          if (note.type === 'rest' || note.clef === 'treble' || note.treble || (note.clef !== 'bass' && !note.bass)) {
            if (note.type === 'rest') {
              const rest = createStaveNote([], 'treble', 1, true);
              trebleStaveNotes.push(rest);
            } else {
              const noteData = extractNotesForClef(note, 'treble');
              if (noteData.length > 0) {
                const staveNote = createStaveNote(noteData, 'treble', 1); // Force quarter note
                trebleStaveNotes.push(staveNote);
              } else {
                const rest = createStaveNote([], 'treble', 1, true);
                trebleStaveNotes.push(rest);
              }
            }
          } else {
            // No treble note for this beat
            const rest = createStaveNote([], 'treble', 1, true);
            trebleStaveNotes.push(rest);
          }

          // Add bass notes
          if (note.type === 'rest' || note.clef === 'bass' || note.bass || note.clef === 'both') {
            if (note.type === 'rest') {
              const rest = createStaveNote([], 'bass', 1, true);
              bassStaveNotes.push(rest);
            } else {
              const noteData = extractNotesForClef(note, 'bass');
              if (noteData.length > 0) {
                const staveNote = createStaveNote(noteData, 'bass', 1); // Force quarter note
                bassStaveNotes.push(staveNote);
              } else {
                const rest = createStaveNote([], 'bass', 1, true);
                bassStaveNotes.push(rest);
              }
            }
          } else {
            // No bass note for this beat
            const rest = createStaveNote([], 'bass', 1, true);
            bassStaveNotes.push(rest);
          }
        } else {
          // No note for this beat - add rests
          const trebleRest = createStaveNote([], 'treble', 1, true);
          const bassRest = createStaveNote([], 'bass', 1, true);
          trebleStaveNotes.push(trebleRest);
          bassStaveNotes.push(bassRest);
        }
      }

      // Create and format voices
      const voices = [];

      if (trebleStaveNotes.length > 0) {
        const trebleVoice = new Voice({ num_beats: 4, beat_value: 4 });
        trebleVoice.addTickables(trebleStaveNotes);
        voices.push({ voice: trebleVoice, stave: trebleStave });
      }

      if (bassStaveNotes.length > 0) {
        const bassVoice = new Voice({ num_beats: 4, beat_value: 4 });
        bassVoice.addTickables(bassStaveNotes);
        voices.push({ voice: bassVoice, stave: bassStave });
      }

      // Format and draw this measure
      if (voices.length > 0) {
        const formatter = new Formatter();
        formatter.joinVoices(voices.map(v => v.voice));

        voices.forEach(({ voice, stave }) => {
          formatter.format([voice], staveWidth - 100);
          voice.draw(context, stave);
        });
      }
    }
  };

  if (midiStatus === 'error') {
    return (
      <div className="text-center space-y-4">
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            MIDI Connection Failed
          </h3>
          <p className="text-red-700 mb-4">
            Unable to connect to MIDI devices. Please ensure:
          </p>
          <ul className="text-sm text-red-600 text-left space-y-1">
            <li>• Your MIDI keyboard is connected and powered on</li>
            <li>• You're using Chrome, Firefox, or Edge browser</li>
            <li>• You've granted MIDI access permission</li>
          </ul>
        </div>
      </div>
    );
  }

  const progressPercentage = sequence.length > 0 ?
    (currentNoteIndex / sequence.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header with metrics and timer */}
      <div className="flex justify-between items-center bg-buretto-light p-4 rounded-lg">
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-buretto-primary">{notesReached}</div>
            <div className="text-sm text-buretto-accent">Notes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{currentStreak}</div>
            <div className="text-sm text-buretto-accent">Streak</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-1">
              <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-600' : 'text-buretto-primary'}`}>
                {timeLeft}s
              </div>
              <button
                onClick={handleStop}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            </div>
            <div className="text-sm text-buretto-accent">Time Left</div>
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="flex items-center justify-end space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              midiStatus === 'connected' ? 'bg-green-500' :
              midiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <div className="text-sm text-buretto-accent">
              MIDI {midiStatus === 'connected' ? 'Connected' :
                    midiStatus === 'error' ? 'Error' : 'Connecting...'}
            </div>
          </div>
          <div className="text-xs h-4 flex items-center justify-end">
            {pressedNotes.size > 0 && (
              <span className="text-green-600">
                Playing: {[...pressedNotes].map(note => midiNoteToName(note)).join(', ')}
              </span>
            )}
          </div>
          <div className="text-sm text-buretto-accent">
            Goal: 80+ notes with 85% accuracy
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-buretto-primary">Progress</span>
          <span className="text-sm text-buretto-accent">
            {currentNoteIndex} / {sequence.length} notes
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-buretto-secondary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Music notation */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            Play the sequence as it appears
          </h3>
          <p className="text-sm text-buretto-accent">
            {deck.practiceTypeName} - {deck.difficultyName} - {deck.rhythmPattern}
          </p>
        </div>

        <div className="flex justify-center">
          <svg ref={svgRef} width="1000" height="400"></svg>
        </div>
      </div>

      {/* Status indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {waitingForCorrectNoteRef.current && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-700 text-center">
              ⏱️ Play the note again at the correct time
            </p>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <p className="text-sm text-blue-700 text-center">
            🎵 Read ahead and maintain steady timing
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
          <p className="text-sm text-green-700 text-center">
            🎯 Focus on accuracy and consistent rhythm
          </p>
        </div>
      </div>
    </div>
  );
};

export default SightReadingSession;