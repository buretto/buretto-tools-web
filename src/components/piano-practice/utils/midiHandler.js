class MidiHandler {
  constructor() {
    this.midiAccess = null;
    this.onNoteOnCallback = null;
    this.onNoteOffCallback = null;
    this.isConnected = false;
  }

  async initialize() {
    try {
      if (!navigator.requestMIDIAccess) {
        throw new Error('Web MIDI API not supported in this browser');
      }

      this.midiAccess = await navigator.requestMIDIAccess();
      this.setupMidiInputs();
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize MIDI:', error);
      return false;
    }
  }

  setupMidiInputs() {
    const inputs = this.midiAccess.inputs.values();
    for (let input of inputs) {
      input.onmidimessage = this.handleMidiMessage.bind(this);
    }
  }

  handleMidiMessage(message) {
    const [command, note, velocity] = message.data;

    // Note on message (command 144-159 = note on, velocity > 0)
    if (command >= 144 && command <= 159 && velocity > 0) {
      if (this.onNoteOnCallback) {
        this.onNoteOnCallback(note);
      }
    }

    // Note off message (command 128-143 = note off, or note on with velocity 0)
    if ((command >= 128 && command <= 143) ||
        (command >= 144 && command <= 159 && velocity === 0)) {
      if (this.onNoteOffCallback) {
        this.onNoteOffCallback(note);
      }
    }
  }

  setNoteCallbacks(onNoteOn, onNoteOff) {
    this.onNoteOnCallback = onNoteOn;
    this.onNoteOffCallback = onNoteOff;
  }

  // Convert MIDI note number to note name and octave
  midiNoteToNoteName(midiNote) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(midiNote / 12) - 1;
    const noteName = noteNames[midiNote % 12];
    return { note: noteName, octave };
  }

  // Convert note name and octave to MIDI note number
  noteNameToMidi(noteName, octave) {
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

  disconnect() {
    if (this.midiAccess) {
      const inputs = this.midiAccess.inputs.values();
      for (let input of inputs) {
        input.onmidimessage = null;
      }
    }
    this.onNoteOnCallback = null;
    this.onNoteOffCallback = null;
    this.isConnected = false;
  }
}

export default MidiHandler;