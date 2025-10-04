import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import MidiHandler from './utils/midiHandler';
import DeckGenerator from './utils/deckGenerator';
import { midiNoteToName } from './utils/noteNames';

const FlashcardSession = ({ deck, onSessionComplete }) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [currentCard, setCurrentCard] = useState(null);
  const [flashcardDeck, setFlashcardDeck] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [lastCardIndex, setLastCardIndex] = useState(-1);
  const [pressedNotes, setPressedNotes] = useState(new Set());
  const [midiStatus, setMidiStatus] = useState('connecting');

  const svgRef = useRef(null);
  const midiHandlerRef = useRef(null);
  const timerRef = useRef(null);
  const currentCardRef = useRef(null);
  const pressedNotesRef = useRef(new Set());

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
      setCurrentCard(generatedDeck[0]);
      currentCardRef.current = generatedDeck[0];
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
          onSessionComplete(score);
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
  }, [score, onSessionComplete]);

  const handleMidiNoteOn = (midiNote) => {
    const currentCard = currentCardRef.current;

    if (!currentCard) {
      return;
    }

    const newPressedNotes = new Set([...pressedNotesRef.current, midiNote]);
    pressedNotesRef.current = newPressedNotes;
    setPressedNotes(newPressedNotes);

    // Check if all expected notes are pressed
    const expectedNotes = new Set(currentCard.expectedNotes);
    const allNotesMatch = expectedNotes.size === newPressedNotes.size &&
                         [...expectedNotes].every(note => newPressedNotes.has(note));

    if (allNotesMatch) {
      handleCorrectAnswer();
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
    currentCardRef.current = currentCard;
    if (currentCard && svgRef.current) {
      renderCard(currentCard);
    }
  }, [currentCard]);

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
    setScore(prev => prev + 1);
    setPressedNotes(new Set());
    pressedNotesRef.current = new Set();

    // Get the current card from ref (immediately updated, not async like state)
    const currentCardData = currentCardRef.current;

    // Generate a few candidates and pick one that's different from current
    let nextCard;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const generator = new DeckGenerator(deck);
      const tempDeck = generator.generateDeck(1);
      nextCard = tempDeck[0];
      attempts++;
    } while (cardsAreEqual(nextCard, currentCardData) && attempts < maxAttempts);

    // Update state with the new card
    const nextIndex = cardIndex + 1;
    setCardIndex(nextIndex);
    setLastCardIndex(cardIndex);
    setCurrentCard(nextCard);
    currentCardRef.current = nextCard;
  };

  const handleStop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    onSessionComplete(score);
  };

  const renderCard = (card) => {
    // Clear previous rendering
    svgRef.current.innerHTML = '';

    const renderer = new Renderer(svgRef.current, Renderer.Backends.SVG);
    renderer.resize(600, 300);
    const context = renderer.getContext();

    // Always show both clefs
    let trebleStave, bassStave;
    const voices = [];

    // Always render treble clef
    trebleStave = new Stave(50, 20, 500);
    trebleStave.addClef('treble').setContext(context).draw();

    if (card.treble || (card.clef === 'treble' && card.notes)) {
      const notes = card.treble || card.notes;
      const staveNotes = createStaveNotes(notes, 'treble');
      const trebleVoice = new Voice({ num_beats: 4, beat_value: 4 });
      trebleVoice.addTickables(staveNotes);
      voices.push({ voice: trebleVoice, stave: trebleStave });
    }

    // Always render bass clef
    bassStave = new Stave(50, 120, 500);
    bassStave.addClef('bass').setContext(context).draw();

    if (card.bass || (card.clef === 'bass' && card.notes)) {
      const notes = card.bass || card.notes;
      const staveNotes = createStaveNotes(notes, 'bass');
      const bassVoice = new Voice({ num_beats: 4, beat_value: 4 });
      bassVoice.addTickables(staveNotes);
      voices.push({ voice: bassVoice, stave: bassStave });
    }

    // Format and draw voices
    if (voices.length > 0) {
      const formatter = new Formatter();
      formatter.joinVoices(voices.map(v => v.voice));

      voices.forEach(({ voice, stave }) => {
        formatter.format([voice], 400);
        voice.draw(context, stave);
      });
    }
  };

  const createStaveNotes = (notes, clef) => {
    if (!notes || notes.length === 0) return [];

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
      duration: 'w'
    });

    // Add accidentals
    // Note: VexFlow 5.0 uses addModifier(modifier, index) parameter order
    notes.forEach((note, index) => {
      if (note.note.includes('#')) {
        staveNote.addModifier(new Accidental('#'), index);
      } else if (note.note.includes('b')) {
        staveNote.addModifier(new Accidental('b'), index);
      }
    });

    return [staveNote];
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
            <div className="text-2xl font-bold text-buretto-primary">{score}</div>
            <div className="text-sm text-buretto-accent">Cards</div>
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
            Goal: 60+ to pass
          </div>
        </div>
      </div>


      {/* Music notation */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-buretto-primary">
            Play the note(s) shown below
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
          Play all the notes shown simultaneously on your MIDI keyboard.
          Correct answers will automatically advance to the next card.
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