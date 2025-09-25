import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import MidiHandler from './utils/midiHandler';
import SequenceGenerator from './utils/sequenceGenerator';
import TimingAnalyzer from './utils/timingAnalyzer';
import PerformanceMetrics from './utils/performanceMetrics';
import { midiNoteToName } from './utils/noteNames';

const SightReadingSession = ({ deck, onSessionComplete, isCountdownActive = false }) => {
  const [timeLeft, setTimeLeft] = useState(60); // Always start with 60 seconds
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [sequence, setSequence] = useState([]);
  const [pressedNotes, setPressedNotes] = useState(new Set());
  const [midiStatus, setMidiStatus] = useState('connecting');
  const [currentStreak, setCurrentStreak] = useState(0);
  const [notesReached, setNotesReached] = useState(0);
  // Simple state machine for sight reading
  const SIGHT_READING_STATES = {
    PLAYING: 'playing',
    PAUSED_FOR_NOTE: 'paused_for_note',
    RESUMING: 'resuming'
  };

  const [sightReadingState, setSightReadingState] = useState(SIGHT_READING_STATES.PLAYING);
  const sightReadingStateRef = useRef(SIGHT_READING_STATES.PLAYING);

  // Helper function to update both state and ref
  const setSightReadingStateBoth = (newState) => {
    setSightReadingState(newState);
    sightReadingStateRef.current = newState;
    console.log('🔄 State changed to:', newState);
  };
  const [noteStatuses, setNoteStatuses] = useState({}); // Track note completion/pause status
  const [trainingWheelsMode, setTrainingWheelsMode] = useState(true); // Enable timing adjustment by default
  const [timingAdjustment, setTimingAdjustment] = useState(null); // Show timing adjustment notifications

  // Refs for stable access
  const svgRef = useRef(null);
  const midiHandlerRef = useRef(null);
  const timerRef = useRef(null);
  const timingAnalyzerRef = useRef(null);
  const performanceMetricsRef = useRef(null);
  const sequenceRef = useRef([]);
  const originalSequenceRef = useRef([]); // Store original sequence timing for recalculations
  const currentNoteIndexRef = useRef(0);
  const pressedNotesRef = useRef(new Set());
  const waitingForCorrectNoteRef = useRef(null);
  const noteHoldStartRef = useRef(null);
  const sequenceStartTimeRef = useRef(null);
  const overdueCheckIntervalRef = useRef(null);
  const metronomeIntervalRef = useRef(null);
  const audioContextRef = useRef(null);

  // Initialize system
  useEffect(() => {
    const initializeSession = async () => {
      // Initialize MIDI
      midiHandlerRef.current = new MidiHandler();
      const midiSuccess = await midiHandlerRef.current.initialize();

      if (midiSuccess) {
        setMidiStatus('connected');
        // Don't set callbacks yet - wait for countdown to complete
      } else {
        setMidiStatus('error');
      }

      // Initialize analyzers with BPM for proportional timing
      timingAnalyzerRef.current = new TimingAnalyzer({ bpm: deck.bpm || 120 });
      performanceMetricsRef.current = new PerformanceMetrics();

      // Generate sequence
      try {
        const generator = new SequenceGenerator(deck);
        // Generate sequence for 60 seconds or based on goal duration, whichever is longer
        let sequenceDuration = 60;
        if (deck.goal && deck.bpm) {
          const beatsPerSecond = deck.bpm / 60;
          const goalDuration = deck.goal.beats / beatsPerSecond;
          sequenceDuration = Math.max(60, Math.ceil(goalDuration));
        }
        const generatedSequence = generator.generateSequence(sequenceDuration);
        setSequence(generatedSequence);
        sequenceRef.current = generatedSequence;
        originalSequenceRef.current = generatedSequence; // Store original timing

        // Start session
        timingAnalyzerRef.current.startSession();
        performanceMetricsRef.current.startSession();
        performanceMetricsRef.current.setTotalExpectedNotes(generatedSequence.length);

        // Mark session as ready to start
        setSessionStarted(true);

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
      if (overdueCheckIntervalRef.current) {
        clearInterval(overdueCheckIntervalRef.current);
      }
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [deck]);

  // Timer - only start after session is initialized and countdown is complete
  useEffect(() => {
    if (sessionStarted && !isCountdownActive) {
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
    }
  }, [sessionStarted, isCountdownActive]);

  // Set MIDI callbacks when countdown completes
  useEffect(() => {
    if (sessionStarted && !isCountdownActive && midiHandlerRef.current) {
      midiHandlerRef.current.setNoteCallbacks(handleMidiNoteOn, handleMidiNoteOff);

      // Start timing analysis and metronome immediately when countdown ends
      // Set sequence start time (only once!)
      if (!sequenceStartTimeRef.current) {
        sequenceStartTimeRef.current = performance.now() / 1000;
        console.log('🎬 Sequence started at:', sequenceStartTimeRef.current);
      } else {
        console.log('⚠️ Sequence start time already set:', sequenceStartTimeRef.current);
      }

      // Start overdue checking every 100ms
      if (overdueCheckIntervalRef.current) {
        clearInterval(overdueCheckIntervalRef.current);
      }
      overdueCheckIntervalRef.current = setInterval(() => {
        const currentSequence = sequenceRef.current;
        const currentIndex = currentNoteIndexRef.current;
        const sequenceStartTime = sequenceStartTimeRef.current;

        if (!currentSequence || !sequenceStartTime || currentIndex >= currentSequence.length) {
          console.log('⏸️ Skipping timing check:', {
            hasSequence: !!currentSequence,
            hasStartTime: !!sequenceStartTime,
            currentIndex,
            sequenceLength: currentSequence?.length || 0
          });
          return;
        }

        const currentTime = performance.now() / 1000;
        const sequenceElapsed = currentTime - sequenceStartTime;
        const currentNote = currentSequence[currentIndex];
        const expectedTime = currentNote.startTime;
        const drift = sequenceElapsed - expectedTime;

        // Calculate reasonable thresholds based on BPM (±20% as requested)
        const beatDuration = 60.0 / (deck.bpm || 120);
        const warningThreshold = beatDuration * 0.15; // 15% of beat duration - start showing orange
        const lateThreshold = beatDuration * 0.2; // 20% of beat duration - mark as overdue

        // Debug timing values - show more frequently to debug the issue
        if (currentIndex < 10 || Math.floor(sequenceElapsed) % 8 === 0) {
          console.log('⏰ Timing check:', {
            noteIndex: currentIndex,
            expectedTime,
            sequenceElapsed,
            drift,
            warningThreshold,
            lateThreshold,
            currentTime,
            sequenceStartTime: sequenceStartTime,
            timingCalculation: `${currentTime} - ${sequenceStartTime} = ${sequenceElapsed}`,
            bpm: deck.bpm,
            beatDuration,
            noteStatus: noteStatuses[currentIndex]
          });
        }

        // Simple state-based timing checks - use ref to get current state
        if (sightReadingStateRef.current === SIGHT_READING_STATES.PLAYING) {
          const currentNoteStatus = noteStatuses[currentIndex];
          if (!currentNoteStatus || currentNoteStatus === 'warning') {

            // Simple timing check - no complex grace periods or buffers
            if (drift > lateThreshold) {
              // Mark note as overdue and switch to PAUSED_FOR_NOTE state
              console.log('🔴 Note overdue - switching to PAUSED_FOR_NOTE:', {
                noteIndex: currentIndex,
                drift,
                lateThreshold: `${lateThreshold.toFixed(3)}s`
              });

              setNoteStatuses(prev => ({ ...prev, [currentIndex]: 'overdue' }));
              setSightReadingStateBoth(SIGHT_READING_STATES.PAUSED_FOR_NOTE);

            } else if (drift > warningThreshold) {
              // Show warning
              setNoteStatuses(prev => ({ ...prev, [currentIndex]: 'warning' }));
            }
          }
        }
        // If not in PLAYING state, skip all timing checks
      }, 50);

      // Metronome is now handled by separate useEffect for pause state management
    }
  }, [isCountdownActive, sessionStarted, deck.bpm, noteStatuses]);

  // Manage metronome based on sight reading state
  useEffect(() => {
    const shouldPlayMetronome = sightReadingState === SIGHT_READING_STATES.PLAYING;

    if (!shouldPlayMetronome) {
      // Stop metronome when not in PLAYING state
      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
        metronomeIntervalRef.current = null;
        console.log('🔇 Metronome stopped:', sightReadingState);
      }
    } else if (sessionStarted && !isCountdownActive && deck.bpm && !metronomeIntervalRef.current) {
      // Start metronome when in PLAYING state (if not already running)
      const interval = (60 / deck.bpm) * 1000;
      metronomeIntervalRef.current = setInterval(() => {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
      }, interval);
      console.log('🔊 Metronome started:', sightReadingState);
    }
  }, [sightReadingState, sessionStarted, isCountdownActive, deck.bpm]);

  // Update refs when state changes
  useEffect(() => {
    currentNoteIndexRef.current = currentNoteIndex;
  }, [currentNoteIndex]);

  useEffect(() => {
    pressedNotesRef.current = pressedNotes;
  }, [pressedNotes]);

  useEffect(() => {
    sequenceRef.current = sequence;
    if (sequence.length > 0) {
      // Small delay to ensure SVG element is mounted
      setTimeout(() => renderCurrentNotes(), 100);
    }
  }, [sequence, currentNoteIndex, noteStatuses]);

  // Force initial render when SVG ref is available
  useEffect(() => {
    if (svgRef.current && sequence.length > 0) {
      renderCurrentNotes();
    }
  }, [sequence]);

  const handleMidiNoteOn = useCallback((midiNote) => {
    const currentSequence = sequenceRef.current;
    const currentIndex = currentNoteIndexRef.current;
    const currentTime = performance.now() / 1000;

    console.log('🎹 MIDI Note On:', {
      midiNote,
      currentIndex,
      sequenceLength: currentSequence?.length || 0,
      waitingForNote: !!waitingForCorrectNoteRef.current
    });

    if (!currentSequence || currentIndex >= currentSequence.length) {
      console.log('❌ No sequence or index out of bounds');
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

    console.log('🎯 Expected note:', {
      expectedNotes: Array.from(expectedNotes),
      pressedNotes: Array.from(newPressedNotes),
      noteStatus: noteStatuses[currentIndex]
    });

    // Check if we're waiting for a specific note to be replayed
    if (waitingForCorrectNoteRef.current) {
      console.log('⏳ Waiting for correct note replay');
      const waitingNote = waitingForCorrectNoteRef.current;

      console.log('🔄 Replay check:', {
        waitingNoteExpected: waitingNote.expectedNotes,
        playedNote: midiNote,
        isCorrectNote: waitingNote.expectedNotes.includes(midiNote)
      });

      if (waitingNote.expectedNotes.includes(midiNote)) {
        console.log('✅ Correct replay note played');

        // Check if all expected notes for this waiting note are now pressed
        const allWaitingNotesPressed = waitingNote.expectedNotes.every(note =>
          newPressedNotes.has(note)
        );

        console.log('🔍 All waiting notes pressed?', allWaitingNotesPressed);

        if (allWaitingNotesPressed) {
          console.log('🎉 All replay notes correct, analyzing timing...');

          // Analyze timing for the corrected note
          const timingPerformance = timingAnalyzerRef.current.recordNotePerformance(
            waitingNote, currentTime, 0, sequenceStartTimeRef.current
          );

          console.log('⏱️ Replay timing:', {
            accuracy: timingPerformance.timingAccuracy,
            drift: timingPerformance.drift
          });

          if (timingPerformance.timingAccuracy === 'accurate' ||
              timingPerformance.timingAccuracy === 'early' ||
              timingPerformance.timingAccuracy === 'late' ||
              timingPerformance.timingAccuracy === 'pause') {

            console.log('🎯 Replay successful, advancing...');

            // Success! Clear waiting state and advance - mark as appropriate status
            const waitingNoteIndex = waitingNote.sequenceIndex;
            const noteStatus = timingPerformance.timingAccuracy === 'pause' ? 'paused' : 'completed';

            setNoteStatuses(prev => ({
              ...prev,
              [waitingNoteIndex]: noteStatus
            }));

            performanceMetricsRef.current.recordCorrectNote(waitingNote, currentTime, timingPerformance);
            waitingForCorrectNoteRef.current = null;

            // Handle replay with state machine
            if (timingPerformance.timingAccuracy === 'pause') {
              const beatDuration = 60.0 / (deck.bpm || 120);
              const toleranceThreshold = beatDuration * 0.2;
              const lateDrift = timingPerformance.drift;

              if (trainingWheelsMode && lateDrift > toleranceThreshold) {
                // Calculate indices before advancing
                const currentNoteForCalc = currentNoteIndexRef.current;
                const nextNoteIndex = currentNoteIndexRef.current + 1;

                // Advance to next note first
                advanceToNextNote();

                // Training wheels: recalculate timeline after replay
                setSightReadingStateBoth(SIGHT_READING_STATES.RESUMING);
                setTimeout(() => recalculateTimeline(nextNoteIndex, currentNoteForCalc), 50);
              } else {
                // Advance and return to normal playing
                advanceToNextNote();
                setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
              }
            } else {
              // Normal timing - advance and return to playing
              advanceToNextNote();
              setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
            }
          } else {
            console.log('❌ Replay timing still not acceptable:', timingPerformance.timingAccuracy);
          }
        }
        return;
      } else {
        console.log('❌ Wrong replay note - still waiting');
      }
    }

    // Check if this note is part of the current expected notes
    if (expectedNotes.has(midiNote)) {
      console.log('✅ Correct note played');
      // Check if all expected notes are now pressed
      const allExpectedPressed = [...expectedNotes].every(note =>
        newPressedNotes.has(note)
      );

      console.log('🔍 All expected pressed?', allExpectedPressed);

      if (allExpectedPressed) {
        console.log('🎉 All notes correct, analyzing timing...');
        // All notes are correct, analyze timing
        const timingPerformance = timingAnalyzerRef.current.recordNotePerformance(
          expectedNote, currentTime, 0, sequenceStartTimeRef.current
        );

        console.log('Note timing analysis:', {
          noteIndex: currentIndex,
          expectedTime: expectedNote.startTime,
          actualTime: currentTime,
          drift: timingPerformance.drift,
          accuracy: timingPerformance.timingAccuracy,
          sequenceStartTime: sequenceStartTimeRef.current
        });

        if (timingPerformance.timingAccuracy === 'too_early' || timingPerformance.timingAccuracy === 'early') {
          // Check if we should use training wheels for early notes
          const beatDuration = 60.0 / (deck.bpm || 120);
          const toleranceThreshold = beatDuration * 0.2; // 20% tolerance
          const earlyDrift = Math.abs(timingPerformance.drift);

          if (trainingWheelsMode && earlyDrift > toleranceThreshold) {
            // Training wheels: recalculate timeline and continue
            console.log('🏃‍♀️ Training wheels: Early note - recalculating timeline');

            setTimingAdjustment({
              type: 'early',
              message: 'Played too early - timing recentered',
              adjustment: earlyDrift
            });
            setTimeout(() => setTimingAdjustment(null), 2000);

            // Mark as completed and advance
            setNoteStatuses(prev => ({ ...prev, [currentIndex]: 'completed' }));
            performanceMetricsRef.current.recordCorrectNote(expectedNote, currentTime, timingPerformance);
            setCurrentStreak(prev => prev + 1);

            // Calculate next note index before advancing
            const nextNoteIndex = currentIndex + 1;

            // Advance to next note first
            advanceToNextNote();

            // Then switch to RESUMING state and recalculate timeline
            setSightReadingStateBoth(SIGHT_READING_STATES.RESUMING);
            setTimeout(() => recalculateTimeline(nextNoteIndex, currentIndex), 50);
          } else {
            // Early but within tolerance - just advance normally like an accurate note
            setNoteStatuses(prev => ({ ...prev, [currentIndex]: 'completed' }));
            performanceMetricsRef.current.recordCorrectNote(expectedNote, currentTime, timingPerformance);
            setCurrentStreak(prev => prev + 1);
            advanceToNextNote();
          }
        } else if (timingPerformance.timingAccuracy === 'late') {
          // Note played late but not pause-level late
          const beatDuration = 60.0 / (deck.bpm || 120);
          const toleranceThreshold = beatDuration * 0.2; // 20% tolerance
          const lateDrift = timingPerformance.drift;

          setNoteStatuses(prev => ({ ...prev, [currentIndex]: 'completed' }));
          performanceMetricsRef.current.recordCorrectNote(expectedNote, currentTime, timingPerformance);
          setCurrentStreak(prev => prev + 1);

          if (trainingWheelsMode && lateDrift > toleranceThreshold) {
            console.log('🐌 Training wheels: Late note - recalculating timeline');

            setTimingAdjustment({
              type: 'late',
              message: 'Played late - timing recentered',
              adjustment: lateDrift
            });
            setTimeout(() => setTimingAdjustment(null), 2000);

            // Calculate next note index before advancing
            const nextNoteIndex = currentIndex + 1;

            // Advance to next note first
            advanceToNextNote();

            // Then switch to RESUMING state and recalculate timeline
            setSightReadingStateBoth(SIGHT_READING_STATES.RESUMING);
            setTimeout(() => recalculateTimeline(nextNoteIndex, currentIndex), 50);
          } else {
            // Late but within tolerance, or training wheels disabled
            advanceToNextNote();
            setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
          }
        } else if (timingPerformance.timingAccuracy === 'pause') {
          // Note played after significant delay
          const beatDuration = 60.0 / (deck.bpm || 120);
          const toleranceThreshold = beatDuration * 0.2; // 20% tolerance
          const lateDrift = timingPerformance.drift;

          setNoteStatuses(prev => ({ ...prev, [currentIndex]: 'paused' }));

          performanceMetricsRef.current.recordCorrectNote(expectedNote, currentTime, timingPerformance);
          setCurrentStreak(prev => prev + 1);

          if (trainingWheelsMode) {
            // Training wheels: always recalculate timeline for any 'pause' note
            console.log('🎯 Training wheels: recalculating timeline for pause note', {
              lateDrift,
              toleranceThreshold,
              exceedsThreshold: lateDrift > toleranceThreshold
            });

            // Show notification only if significantly beyond tolerance
            if (lateDrift > toleranceThreshold) {
              setTimingAdjustment({
                type: 'late',
                message: 'Played late - timing recentered',
                adjustment: lateDrift - toleranceThreshold
              });
              setTimeout(() => setTimingAdjustment(null), 2000);
            }

            // Calculate next note index before advancing
            const nextNoteIndex = currentIndex + 1;

            // Advance to next note first
            advanceToNextNote();

            // Always recalculate timeline for any 'pause' note in training wheels mode
            setSightReadingStateBoth(SIGHT_READING_STATES.RESUMING);
            setTimeout(() => recalculateTimeline(nextNoteIndex, currentIndex), 50);
          } else {
            // No training wheels - advance and return to PLAYING state
            advanceToNextNote();
            setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
          }
        } else {
          // Correct timing (or acceptable early/late) - mark as completed (green)
          // Even if it was previously overdue, it turns green when played correctly
          setNoteStatuses(prev => ({
            ...prev,
            [currentIndex]: 'completed'
          }));
          performanceMetricsRef.current.recordCorrectNote(expectedNote, currentTime, timingPerformance);
          setCurrentStreak(prev => prev + 1);
          advanceToNextNote();
        }
      }
    } else {
      console.log('❌ Wrong note played:', {
        expected: Array.from(expectedNotes),
        played: midiNote
      });
      // Wrong note
      performanceMetricsRef.current.recordWrongNote(expectedNote, midiNote, currentTime);
      setCurrentStreak(0);
    }
  }, []);

  // Timeline recalculation for training wheels mode
  const recalculateTimeline = useCallback((fromNoteIndex, currentNoteIndex) => {
    const currentTime = performance.now() / 1000;

    if (fromNoteIndex >= sequenceRef.current.length) {
      console.log('📅 No more notes to recalculate');
      setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
      return;
    }

    // Use ORIGINAL sequence timing (not adjusted timing) to prevent accumulation
    const originalCurrentNote = originalSequenceRef.current[currentNoteIndex];
    const originalExpectedTime = originalCurrentNote.startTime;

    // Calculate when the note became "late" (crossed the late threshold)
    const beatDuration = 60.0 / (deck.bpm || 120);
    const lateThreshold = beatDuration * 0.2;
    const originalTimeWhenNoteBecameLate = originalExpectedTime + lateThreshold;

    // For extremely late notes (pause notes), establish new baseline instead of rewinding
    const maxReasonableDrift = 10.0; // 10 seconds max reasonable drift
    const calculatedDrift = currentTime - (sequenceStartTimeRef.current + originalExpectedTime);

    if (Math.abs(calculatedDrift) > maxReasonableDrift) {
      // Extremely late - establish new baseline from current time
      const nextNote = originalSequenceRef.current[fromNoteIndex];
      const nextExpectedTime = nextNote ? nextNote.startTime : originalExpectedTime + beatDuration;
      sequenceStartTimeRef.current = currentTime - nextExpectedTime;
      console.log('📅 Extremely late note - establishing new baseline for next note');
    } else {
      // Normal late note - rewind to late threshold
      sequenceStartTimeRef.current = currentTime - originalTimeWhenNoteBecameLate;
      console.log('📅 Normal late note - rewinding to late threshold');
    }

    console.log('📅 Timeline rewound to late threshold:', {
      currentNoteIndex,
      fromNoteIndex,
      originalExpectedTime,
      lateThreshold,
      originalTimeWhenNoteBecameLate,
      currentTime,
      newSequenceStartTime: sequenceStartTimeRef.current,
      verification: `Timeline set to when note became late at ${originalTimeWhenNoteBecameLate}s`
    });

    setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
  }, [deck.bpm]);

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

    console.log('🎯 Advancing to next note:', { newIndex });

    // Clear any existing status for the next note (in case it was previously marked)
    setNoteStatuses(prev => {
      const updated = { ...prev };
      if (updated[newIndex] === 'warning' || updated[newIndex] === 'overdue') {
        delete updated[newIndex];
      }
      return updated;
    });

    // State transitions handled elsewhere - just ensure we're in correct state if not paused
    if (sightReadingStateRef.current === SIGHT_READING_STATES.PAUSED_FOR_NOTE && !waitingForCorrectNoteRef.current) {
      setSightReadingStateBoth(SIGHT_READING_STATES.PLAYING);
    }

    // Update progress
    if (performanceMetricsRef.current && sequenceRef.current.length > 0) {
      performanceMetricsRef.current.updateProgress(newIndex, sequenceRef.current.length);
    }

    // Check if goal has been achieved
    checkGoalAchievement();

    // Clear pressed notes for next note
    setPressedNotes(new Set());
    pressedNotesRef.current = new Set();
    waitingForCorrectNoteRef.current = null;
  };

  // Check if the tempo-based goal has been achieved
  const checkGoalAchievement = () => {
    if (!deck.goal || !performanceMetricsRef.current) return;

    const metrics = performanceMetricsRef.current.getPerformanceMetrics();
    const timingMetrics = timingAnalyzerRef.current?.getTimingMetrics();

    // Check if we've reached the required beats with required accuracy
    const beatsReached = notesReached; // Each note represents one beat in our system
    const noteAccuracy = metrics.noteAccuracy || 0;

    if (beatsReached >= deck.goal.beats && noteAccuracy >= deck.goal.accuracy) {
      // Goal achieved! End session successfully
      setTimeout(() => endSession(), 100); // Small delay to ensure state updates
    }
  };

  // Check for overdue notes and mark them as late
  const checkForOverdueNotes = useCallback(() => {
    const currentSequence = sequenceRef.current;
    const currentIndex = currentNoteIndexRef.current;
    const sequenceStartTime = sequenceStartTimeRef.current;

    if (!currentSequence || !sequenceStartTime || currentIndex >= currentSequence.length) {
      return;
    }

    const currentTime = performance.now() / 1000;
    const sequenceElapsed = currentTime - sequenceStartTime;
    const currentNote = currentSequence[currentIndex];
    const expectedTime = currentNote.startTime;
    const drift = sequenceElapsed - expectedTime;
    const lateThreshold = 0.3; // 300ms late threshold (same as TimingAnalyzer)

    // If current note is overdue and not already marked
    if (drift > lateThreshold && !noteStatuses[currentIndex]) {
      setNoteStatuses(prev => ({
        ...prev,
        [currentIndex]: 'overdue'
      }));
    }
  }, [noteStatuses]);

  // Metronome functions
  const playMetronomeClick = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.setValueAtTime(800, ctx.currentTime); // High pitch click
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  }, []);

  const startMetronome = useCallback((bpm) => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
    }

    const interval = (60 / bpm) * 1000; // Convert BPM to milliseconds
    metronomeIntervalRef.current = setInterval(playMetronomeClick, interval);
  }, [playMetronomeClick]);

  const stopMetronome = useCallback(() => {
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
  }, []);

  // Start overdue checking when sequence begins
  const startOverdueMonitoring = useCallback(() => {
    if (!sequenceStartTimeRef.current) {
      sequenceStartTimeRef.current = performance.now() / 1000;
    }

    // Check every 100ms for overdue notes
    if (overdueCheckIntervalRef.current) {
      clearInterval(overdueCheckIntervalRef.current);
    }

    overdueCheckIntervalRef.current = setInterval(checkForOverdueNotes, 100);

    // Start metronome if BPM is available
    if (deck.bpm) {
      startMetronome(deck.bpm);
    }
  }, [checkForOverdueNotes, deck.bpm, startMetronome]);

  // Stop overdue monitoring
  const stopOverdueMonitoring = useCallback(() => {
    if (overdueCheckIntervalRef.current) {
      clearInterval(overdueCheckIntervalRef.current);
      overdueCheckIntervalRef.current = null;
    }
  }, []);

  const endSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Stop overdue monitoring and metronome
    stopOverdueMonitoring();
    stopMetronome();

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

  const createStaveNotesFromSequence = (sequenceNotes, clef, noteStatuses = {}) => {
    if (!sequenceNotes || sequenceNotes.length === 0) return [];

    const staveNotes = [];

    sequenceNotes.forEach(sequenceNote => {
      const notes = extractNotesForClef(sequenceNote, clef);
      if (notes.length > 0) {
        const noteStatus = noteStatuses[sequenceNote.sequenceIndex];
        const vexflowNote = createStaveNote(notes, clef, sequenceNote.duration, false, noteStatus);
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

  const createStaveNote = (notes, clef, duration, isRest = false, noteStatus = null) => {
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

    // Apply color styling based on note status
    // Color scheme based on timing requirements:
    // - Black: Default notes (not yet due or just due)
    // - Orange: Warning notes (getting late but still acceptable)
    // - Red: Overdue notes (significantly late, needs immediate attention)
    // - Green: Successfully completed notes - indicates success
    if (noteStatus === 'completed') {
      staveNote.setStyle({
        fillStyle: '#22c55e', // Green for completed notes
        strokeStyle: '#22c55e'
      });
    } else if (noteStatus === 'paused') {
      staveNote.setStyle({
        fillStyle: '#22c55e', // Green for notes completed after pause (still success)
        strokeStyle: '#22c55e'
      });
    } else if (noteStatus === 'overdue') {
      staveNote.setStyle({
        fillStyle: '#dc2626', // Red for overdue notes (urgent, needs attention)
        strokeStyle: '#dc2626'
      });
    } else if (noteStatus === 'warning') {
      staveNote.setStyle({
        fillStyle: '#f59e0b', // Orange for notes getting late (warning)
        strokeStyle: '#f59e0b'
      });
    }
    // Default notes remain black (no styling needed)

    return staveNote;
  };

  const highlightCurrentNote = (context, startIndex) => {
    // Could add visual highlighting of the current note here
    // For now, just rely on the progression indicator
  };

  const renderCurrentNotes = () => {
    const currentSequence = sequenceRef.current;
    const currentIndex = currentNoteIndexRef.current;

    console.log('renderCurrentNotes called:', {
      svgRef: !!svgRef.current,
      sequenceLength: currentSequence?.length || 0,
      currentIndex
    });

    if (!svgRef.current || !currentSequence) {
      console.log('Skipping render: missing SVG ref or sequence');
      return;
    }

    // Calculate which "page" of music to show
    // Each page shows 24 notes (2 rows of 12 notes each, 6 measures total)
    const notesPerPage = 24;
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

    renderSequenceNotes(notesToRender, pageStartIndex, noteStatuses);
  };

  const renderSequenceNotes = (notes, startIndex, noteStatuses = {}) => {
    console.log('renderSequenceNotes called:', {
      notesLength: notes?.length || 0,
      startIndex,
      noteStatuses: Object.keys(noteStatuses).length
    });

    // Clear previous rendering
    svgRef.current.innerHTML = '';

    const renderer = new Renderer(svgRef.current, Renderer.Backends.SVG);
    renderer.resize(1000, 400);
    const context = renderer.getContext();

    try {
      if (!notes || notes.length === 0) {
        console.log('Drawing placeholder - no notes');
        // Draw empty staves with placeholder
        context.fillStyle = '#666';
        context.font = '20px Arial';
        context.textAlign = 'center';
        context.fillText('♪ Ready to start ♪', 400, 200);
        return;
      }

      console.log('Rendering', notes.length, 'notes starting at index', startIndex);

      // Show 6 measures across two rows (3 measures per row)
      const notesPerMeasure = 4; // 4 quarter notes per measure
      const measuresPerRow = 3; // 3 measures per row
      const notesPerRow = notesPerMeasure * measuresPerRow; // 12 notes per row

      // First row (measures 1-3)
      const firstRowNotes = notes.slice(0, notesPerRow);
      if (firstRowNotes.length > 0) {
        renderRowOfMeasures(context, firstRowNotes, 0, 20, 120, noteStatuses, measuresPerRow); // y positions for treble/bass
      }

      // Second row (measures 4-6)
      const secondRowNotes = notes.slice(notesPerRow, notesPerRow * 2);
      if (secondRowNotes.length > 0) {
        renderRowOfMeasures(context, secondRowNotes, 1, 220, 320, noteStatuses, measuresPerRow); // y positions for treble/bass
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

  const renderRowOfMeasures = (context, notes, rowIndex, trebleY, bassY, noteStatuses = {}, measuresPerRow = 4) => {
    if (!notes || notes.length === 0) return;

    const staveWidth = measuresPerRow === 3 ? 250 : 175; // Wider staves for 3 measures per row
    const staveStartX = 50;

    // Create measures per row
    for (let measureIndex = 0; measureIndex < measuresPerRow; measureIndex++) {
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
                const noteStatus = noteStatuses[note.sequenceIndex];
                const staveNote = createStaveNote(noteData, 'treble', 1, false, noteStatus); // Force quarter note
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
                const noteStatus = noteStatuses[note.sequenceIndex];
                const staveNote = createStaveNote(noteData, 'bass', 1, false, noteStatus); // Force quarter note
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
          <div className="flex items-center justify-end space-x-3">
            <label className="flex items-center text-xs text-buretto-accent">
              <input
                type="checkbox"
                checked={trainingWheelsMode}
                onChange={(e) => setTrainingWheelsMode(e.target.checked)}
                className="mr-1"
              />
              Training Wheels
            </label>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                midiStatus === 'connected' ? 'bg-green-500' :
                midiStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <div className="text-sm text-buretto-accent">
                MIDI {midiStatus === 'connected' ? 'Connected' :
                      midiStatus === 'error' ? 'Error' : 'Connecting...'}
              </div>
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
            Goal: {deck.goal ? `${deck.goal.beats} beats with ${Math.round(deck.goal.accuracy * 100)}% accuracy` : '80+ notes with 85% accuracy'}
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

      {/* Timing Adjustment Notification */}
      {timingAdjustment && (
        <div className={`fixed top-4 right-4 p-3 rounded-lg shadow-lg z-50 ${
          timingAdjustment.type === 'early'
            ? 'bg-blue-50 border border-blue-200'
            : 'bg-orange-50 border border-orange-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">
              {timingAdjustment.type === 'early' ? '🏃‍♀️' : '🐌'}
            </span>
            <div>
              <p className={`text-sm font-medium ${
                timingAdjustment.type === 'early' ? 'text-blue-700' : 'text-orange-700'
              }`}>
                {timingAdjustment.message}
              </p>
              <p className={`text-xs ${
                timingAdjustment.type === 'early' ? 'text-blue-600' : 'text-orange-600'
              }`}>
                Adjusted by {timingAdjustment.adjustment.toFixed(2)}s
              </p>
            </div>
          </div>
        </div>
      )}

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
            {sightReadingState === SIGHT_READING_STATES.PAUSED_FOR_NOTE ? (
              <>
                ⏸️ Paused - play the red note to continue
                <span className="block text-xs mt-1">
                  {trainingWheelsMode ? 'Timing will recenter when played' : 'Must play at correct time'}
                </span>
              </>
            ) : sightReadingState === SIGHT_READING_STATES.RESUMING ? (
              <>
                🔄 Adjusting timeline...
                <span className="block text-xs mt-1">Getting back in sync</span>
              </>
            ) : (
              <>
                🎵 Read ahead and maintain steady timing
                {trainingWheelsMode && (
                  <span className="block text-xs mt-1">Training wheels: timing adjusts if played ±20% off</span>
                )}
              </>
            )}
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