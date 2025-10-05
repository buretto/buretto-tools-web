import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import MidiHandler from './utils/midiHandler';
import DeckGenerator from './utils/deckGenerator';
import { midiNoteToName } from './utils/noteNames';

const FlashcardSession = ({ deck, onSessionComplete }) => {
  const [notesCorrect, setNotesCorrect] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentBar, setCurrentBar] = useState([]); // Array of 4 cards
  const [currentNoteInBar, setCurrentNoteInBar] = useState(0); // Which note in the bar (0-3)
  const [flashcardDeck, setFlashcardDeck] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [lastCardIndex, setLastCardIndex] = useState(-1);
  const [pressedNotes, setPressedNotes] = useState(new Set());
  const [midiStatus, setMidiStatus] = useState('connecting');

  const svgRef = useRef(null);
  const midiHandlerRef = useRef(null);
  const timerRef = useRef(null);
  const currentBarRef = useRef([]);
  const currentNoteInBarRef = useRef(0);
  const pressedNotesRef = useRef(new Set());

  // Session completion guard to prevent duplicate saves
  const sessionCompletedRef = useRef(false);

  // Initialize MIDI and deck
  useEffect(() => {
    const initializeMidi = async () => {
      midiHandlerRef.current = new MidiHandler();
      const success = await midiHandlerRef.current.initialize();

      if (success) {
        setMidiStatus('connected');
        midiHandlerRef.current.setNoteCallbacks(handleMidiNoteOn, handleMidiNoteOff);
      } else {
        setMidiStatus('error');
      }
    };

    try {
      const generator = new DeckGenerator(deck);
      const generatedDeck = generator.generateDeck(200);

      setFlashcardDeck(generatedDeck);

      // Initialize with first bar (4 cards)
      const firstBar = generatedDeck.slice(0, 4);
      setCurrentBar(firstBar);
      currentBarRef.current = firstBar;
      setCurrentNoteInBar(0);
      currentNoteInBarRef.current = 0;
    } catch (error) {
      console.error('Error generating deck:', error);
    }

    initializeMidi();

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
          // Prevent duplicate session completion
          if (sessionCompletedRef.current) {
            return 0;
          }
          sessionCompletedRef.current = true;

          const finalScore = notesCorrect - mistakes;
          const results = {
            notesCorrect,
            mistakes,
            finalScore,
            passed: finalScore > 45
          };
          onSessionComplete(results);
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
  }, [notesCorrect, mistakes, onSessionComplete]);

  const handleMidiNoteOn = (midiNote) => {
    const currentBar = currentBarRef.current;
    const noteIndex = currentNoteInBarRef.current;

    if (!currentBar || currentBar.length === 0 || noteIndex >= currentBar.length) {
      return;
    }

    const currentCard = currentBar[noteIndex];

    const newPressedNotes = new Set([...pressedNotesRef.current, midiNote]);
    pressedNotesRef.current = newPressedNotes;
    setPressedNotes(newPressedNotes);

    // Check if all expected notes are pressed
    const expectedNotes = new Set(currentCard.expectedNotes);
    const allNotesMatch = expectedNotes.size === newPressedNotes.size &&
                         [...expectedNotes].every(note => newPressedNotes.has(note));

    if (allNotesMatch) {
      handleCorrectAnswer();
    } else if (newPressedNotes.size >= expectedNotes.size) {
      // User has pressed enough notes but they're wrong - count as mistake
      setMistakes(prev => prev + 1);
      // Reset pressed notes to let them try again
      setPressedNotes(new Set());
      pressedNotesRef.current = new Set();
    }
  };

  const handleMidiNoteOff = (midiNote) => {
    const newPressedNotes = new Set(pressedNotesRef.current);
    newPressedNotes.delete(midiNote);
    pressedNotesRef.current = newPressedNotes;
    setPressedNotes(newPressedNotes);
  };

  // Update refs when state changes
  useEffect(() => {
    currentBarRef.current = currentBar;
    if (currentBar.length > 0 && svgRef.current) {
      renderBar(currentBar, currentNoteInBar);
    }
  }, [currentBar, currentNoteInBar]);

  useEffect(() => {
    currentNoteInBarRef.current = currentNoteInBar;
  }, [currentNoteInBar]);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  const cardsAreEqual = (card1, card2) => {
    if (!card1 || !card2) return false;

    // Compare expected notes (the actual musical content)
    const notes1 = card1.expectedNotes.sort();
    const notes2 = card2.expectedNotes.sort();

    return notes1.length === notes2.length &&
           notes1.every((note, index) => note === notes2[index]);
  };

  const handleCorrectAnswer = () => {
    setNotesCorrect(prev => prev + 1);
    setPressedNotes(new Set());
    pressedNotesRef.current = new Set();

    const noteIndex = currentNoteInBarRef.current;

    // Move to next note in the bar
    if (noteIndex < 3) {
      // Still notes left in current bar
      setCurrentNoteInBar(noteIndex + 1);
      currentNoteInBarRef.current = noteIndex + 1;
    } else {
      // Finished this bar, generate a new one
      const generator = new DeckGenerator(deck);
      const newBar = generator.generateDeck(4);

      setCurrentBar(newBar);
      currentBarRef.current = newBar;
      setCurrentNoteInBar(0);
      currentNoteInBarRef.current = 0;

      const nextIndex = cardIndex + 4;
      setCardIndex(nextIndex);
    }
  };

  const handleStop = () => {
    // Prevent duplicate session completion
    if (sessionCompletedRef.current) {
      return;
    }
    sessionCompletedRef.current = true;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    const finalScore = notesCorrect - mistakes;
    const results = {
      notesCorrect,
      mistakes,
      finalScore,
      passed: finalScore > 45
    };
    onSessionComplete(results);
  };

  const renderBar = (bar, currentNoteIndex) => {
    // Clear previous rendering
    svgRef.current.innerHTML = '';

    const renderer = new Renderer(svgRef.current, Renderer.Backends.SVG);
    renderer.resize(600, 300);
    const context = renderer.getContext();

    // Always show both clefs for 1 bar (4 beats)
    let trebleStave, bassStave;

    // Always render treble and bass clefs
    trebleStave = new Stave(50, 20, 500);
    trebleStave.addClef('treble').addTimeSignature('4/4').setContext(context).draw();

    bassStave = new Stave(50, 120, 500);
    bassStave.addClef('bass').addTimeSignature('4/4').setContext(context).draw();

    // Create note arrays for treble and bass
    const trebleNotes = [];
    const bassNotes = [];

    // Process each of the 4 cards in the bar
    bar.forEach((card, index) => {
      const isCurrentNote = index === currentNoteIndex;

      if (card.treble || (card.clef === 'treble' && card.notes)) {
        const notes = card.treble || card.notes;
        const staveNote = createStaveNote(notes, 'treble', isCurrentNote);
        trebleNotes.push(staveNote);
      } else if (card.clef === 'bass' || card.bass) {
        // This note is for bass clef only, add rest to treble
        trebleNotes.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: 'qr' }));
      } else {
        // No specific clef, add rest
        trebleNotes.push(new StaveNote({ clef: 'treble', keys: ['b/4'], duration: 'qr' }));
      }

      if (card.bass || (card.clef === 'bass' && card.notes)) {
        const notes = card.bass || card.notes;
        const staveNote = createStaveNote(notes, 'bass', isCurrentNote);
        bassNotes.push(staveNote);
      } else if (card.clef === 'treble' || card.treble) {
        // This note is for treble clef only, add rest to bass
        bassNotes.push(new StaveNote({ clef: 'bass', keys: ['d/3'], duration: 'qr' }));
      } else {
        // No specific clef, add rest
        bassNotes.push(new StaveNote({ clef: 'bass', keys: ['d/3'], duration: 'qr' }));
      }
    });

    // Create voices
    const trebleVoice = new Voice({ num_beats: 4, beat_value: 4 });
    trebleVoice.addTickables(trebleNotes);

    const bassVoice = new Voice({ num_beats: 4, beat_value: 4 });
    bassVoice.addTickables(bassNotes);

    // Format and draw
    const formatter = new Formatter();
    formatter.joinVoices([trebleVoice, bassVoice]);
    formatter.format([trebleVoice], 400);
    formatter.format([bassVoice], 400);

    trebleVoice.draw(context, trebleStave);
    bassVoice.draw(context, bassStave);
  };

  const createStaveNote = (notes, clef, isCurrentNote = false) => {
    if (!notes || notes.length === 0) {
      return new StaveNote({ clef: clef, keys: [clef === 'treble' ? 'b/4' : 'd/3'], duration: 'qr' });
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
      duration: 'q' // Quarter note
    });

    // Add accidentals
    notes.forEach((note, index) => {
      if (note.note.includes('#')) {
        staveNote.addModifier(new Accidental('#'), index);
      } else if (note.note.includes('b')) {
        staveNote.addModifier(new Accidental('b'), index);
      }
    });

    // Highlight current note
    if (isCurrentNote) {
      staveNote.setStyle({
        fillStyle: '#f59e0b', // Orange for current note
        strokeStyle: '#f59e0b'
      });
    }

    return staveNote;
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

  return (
    <div className="space-y-6">
      {/* Header with score and timer */}
      <div className="flex justify-between items-center bg-buretto-light p-4 rounded-lg">
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{notesCorrect}</div>
            <div className="text-sm text-buretto-accent">Correct</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{mistakes}</div>
            <div className="text-sm text-buretto-accent">Mistakes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-buretto-primary">{notesCorrect - mistakes}</div>
            <div className="text-sm text-buretto-accent">Score</div>
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
            Goal: 45+ to pass
          </div>
        </div>
      </div>


      {/* Music notation */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            Play the notes shown - one bar at a time
          </h3>
          <p className="text-sm text-buretto-accent">
            {deck.practiceTypeName} - {deck.difficultyName}
          </p>
        </div>

        <div className="flex justify-center">
          <svg ref={svgRef} width="600" height="300"></svg>
        </div>

      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-700 text-center mb-3">
          Play the notes at your own pace. Each correct answer advances to the next bar.
          Wrong notes count as mistakes and deduct from your final score.
        </p>
        <div className="flex justify-center space-x-3">
          <button
            onClick={() => {
              setPressedNotes(new Set());
              pressedNotesRef.current = new Set();
            }}
            className="px-4 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Reset Pressed Notes
          </button>
          <button
            onClick={handleCorrectAnswer}
            className="px-4 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            Skip Card (Test)
          </button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardSession;