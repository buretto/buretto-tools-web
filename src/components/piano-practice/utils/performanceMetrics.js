class PerformanceMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    // Note tracking
    this.totalNotesExpected = 0;
    this.notesProgressed = 0; // Consolidating correctNotes and notesReached
    this.errorCount = 0; // Combining wrongNotes and extraNotes

    // Progress tracking
    this.sequenceProgress = 0; // How far through the sequence (0-1)
    this.timeElapsed = 0;

    // Event logs for detailed analysis
    this.noteEvents = [];
    this.mistakeEvents = [];
    this.sessionStartTime = null;
    this.sessionEndTime = null;

    // Combo tracking
    this.currentStreak = 0;
    this.longestStreak = 0;
    this.streakHistory = [];

    // For backward compatibility during transition
    this.correctNotes = 0;
    this.wrongNotes = 0;
    this.extraNotes = 0;
    this.missedNotes = 0;
    this.notesReached = 0;
  }

  startSession() {
    this.sessionStartTime = performance.now() / 1000;
  }

  endSession() {
    this.sessionEndTime = performance.now() / 1000;
    this.timeElapsed = this.sessionEndTime - this.sessionStartTime;
  }

  // Record a correct note played at the right time
  recordCorrectNote(expectedNote, actualPlayTime, timingPerformance) {
    this.notesProgressed++;
    this.currentStreak++;
    this.longestStreak = Math.max(this.longestStreak, this.currentStreak);

    // Backward compatibility
    this.correctNotes++;
    this.notesReached = Math.max(this.notesReached, expectedNote.sequenceIndex + 1);

    this.noteEvents.push({
      type: 'correct',
      expectedNote,
      actualPlayTime,
      timingPerformance,
      timestamp: performance.now() / 1000,
      sequenceIndex: expectedNote.sequenceIndex
    });
  }

  // Record a wrong note (incorrect pitch)
  recordWrongNote(expectedNote, actualMidiNote, actualPlayTime) {
    this.errorCount++;
    this.breakStreak();

    // Backward compatibility
    this.wrongNotes++;

    this.mistakeEvents.push({
      type: 'wrong_note',
      expectedNote,
      actualMidiNote,
      actualPlayTime,
      timestamp: performance.now() / 1000,
      sequenceIndex: expectedNote.sequenceIndex
    });
  }

  // Record a note played too early (needs to be replayed)
  recordEarlyNote(expectedNote, actualPlayTime, drift) {
    this.errorCount++;
    this.breakStreak();

    // Backward compatibility
    this.extraNotes++;

    this.mistakeEvents.push({
      type: 'early_note',
      expectedNote,
      actualPlayTime,
      drift,
      timestamp: performance.now() / 1000,
      sequenceIndex: expectedNote.sequenceIndex
    });
  }

  // Record an unexpected note (not in current expected notes)
  recordUnexpectedNote(actualMidiNote, actualPlayTime) {
    this.errorCount++;
    this.breakStreak();

    // Backward compatibility
    this.extraNotes++;

    this.mistakeEvents.push({
      type: 'unexpected_note',
      actualMidiNote,
      actualPlayTime,
      timestamp: performance.now() / 1000
    });
  }

  // Update sequence progress
  updateProgress(currentSequenceIndex, totalSequenceLength) {
    this.sequenceProgress = totalSequenceLength > 0 ? currentSequenceIndex / totalSequenceLength : 0;
  }

  // Break current streak and record it
  breakStreak() {
    if (this.currentStreak > 0) {
      this.streakHistory.push(this.currentStreak);
      this.currentStreak = 0;
    }
  }

  // Calculate comprehensive performance metrics
  getPerformanceMetrics() {
    const totalNotesPlayed = this.notesProgressed + this.errorCount;
    const noteAccuracy = totalNotesPlayed > 0 ? this.notesProgressed / totalNotesPlayed : 0;

    // Calculate performed BPM based on actual note progression
    // This measures the actual tempo of notes played, not target tempo
    const performedBPM = this.timeElapsed > 0 ?
      (this.notesProgressed / this.timeElapsed) * 60 : 0;

    // Calculate consistency score based on streaks
    const averageStreak = this.streakHistory.length > 0 ?
      this.streakHistory.reduce((sum, streak) => sum + streak, 0) / this.streakHistory.length :
      this.currentStreak;

    const consistencyScore = this.notesProgressed > 0 ?
      Math.min(1, averageStreak / Math.max(10, this.notesProgressed * 0.5)) : 0;

    // Calculate overall score combining accuracy, timing, and consistency
    const overallScore = (noteAccuracy * 0.4 + consistencyScore * 0.3 + Math.min(1, performedBPM / 60) * 0.3);

    return {
      // Simplified metrics
      notesProgressed: this.notesProgressed,
      errorCount: this.errorCount,
      totalNotesExpected: this.totalNotesExpected,
      totalNotesPlayed,

      // Progress metrics
      sequenceProgress: this.sequenceProgress,
      timeElapsed: this.timeElapsed,

      // Accuracy metrics
      noteAccuracy,

      // Performance metrics
      performedBPM,
      consistencyScore,
      overallScore,

      // Streak metrics
      currentStreak: this.currentStreak,
      longestStreak: this.longestStreak,
      averageStreak,
      totalStreaks: this.streakHistory.length + (this.currentStreak > 0 ? 1 : 0),

      // Session info
      sessionDuration: this.timeElapsed,
      sessionStartTime: this.sessionStartTime,
      sessionEndTime: this.sessionEndTime,

      // Backward compatibility - keep old field names
      correctNotes: this.correctNotes,
      wrongNotes: this.wrongNotes,
      extraNotes: this.extraNotes,
      missedNotes: this.missedNotes,
      notesReached: this.notesReached
    };
  }

  // Get mistake analysis for feedback
  getMistakeAnalysis() {
    const totalMistakes = this.mistakeEvents.length;

    if (totalMistakes === 0) {
      return {
        totalMistakes: 0,
        mistakeTypes: {},
        patterns: [],
        recommendations: ['Excellent performance! No mistakes detected.']
      };
    }

    // Categorize mistakes
    const mistakeTypes = {
      wrong_note: this.mistakeEvents.filter(e => e.type === 'wrong_note').length,
      early_note: this.mistakeEvents.filter(e => e.type === 'early_note').length,
      missed_note: this.mistakeEvents.filter(e => e.type === 'missed_note').length,
      unexpected_note: this.mistakeEvents.filter(e => e.type === 'unexpected_note').length
    };

    // Analyze patterns
    const patterns = this.analyzeMistakePatterns();
    const recommendations = this.generateRecommendations(mistakeTypes, patterns);

    return {
      totalMistakes,
      mistakeTypes,
      patterns,
      recommendations,
      mistakeRate: totalMistakes / Math.max(1, this.correctNotes + totalMistakes),
      averageMistakesPerStreak: this.streakHistory.length > 0 ?
        totalMistakes / this.streakHistory.length : totalMistakes
    };
  }

  // Analyze mistake patterns
  analyzeMistakePatterns() {
    const patterns = [];

    // Check for timing patterns
    const earlyMistakes = this.mistakeEvents.filter(e => e.type === 'early_note');
    if (earlyMistakes.length > 3) {
      patterns.push({
        type: 'timing',
        description: 'Tendency to rush ahead',
        severity: Math.min(1, earlyMistakes.length / 10)
      });
    }

    // Check for accuracy patterns
    const wrongNotes = this.mistakeEvents.filter(e => e.type === 'wrong_note');
    if (wrongNotes.length > 3) {
      patterns.push({
        type: 'accuracy',
        description: 'Note reading challenges',
        severity: Math.min(1, wrongNotes.length / 10)
      });
    }

    // Check for concentration patterns
    const missedNotes = this.mistakeEvents.filter(e => e.type === 'missed_note');
    if (missedNotes.length > 2) {
      patterns.push({
        type: 'concentration',
        description: 'Missing notes (possible concentration issues)',
        severity: Math.min(1, missedNotes.length / 5)
      });
    }

    return patterns;
  }

  // Generate recommendations based on performance
  generateRecommendations(mistakeTypes, patterns) {
    const recommendations = [];

    if (mistakeTypes.wrong_note > mistakeTypes.early_note + mistakeTypes.missed_note) {
      recommendations.push('Focus on note accuracy. Practice slowly with careful attention to pitch.');
    }

    if (mistakeTypes.early_note > 3) {
      recommendations.push('Work on timing patience. Try practicing with a metronome.');
    }

    if (mistakeTypes.missed_note > 2) {
      recommendations.push('Stay engaged and watch for upcoming notes. Consider shorter practice sessions.');
    }

    if (this.longestStreak < 5 && this.correctNotes > 10) {
      recommendations.push('Focus on consistency. Break down difficult sections and practice slowly.');
    }

    if (this.currentStreak > 20) {
      recommendations.push('Great consistency! Try increasing the difficulty or tempo.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Good performance! Continue practicing to build speed and accuracy.');
    }

    return recommendations;
  }

  // Get detailed event log for analysis view
  getDetailedEventLog() {
    const allEvents = [
      ...this.noteEvents.map(e => ({ ...e, category: 'success' })),
      ...this.mistakeEvents.map(e => ({ ...e, category: 'mistake' }))
    ].sort((a, b) => a.timestamp - b.timestamp);

    return allEvents;
  }

  // Get performance summary for display
  getPerformanceSummary() {
    const metrics = this.getPerformanceMetrics();
    const mistakes = this.getMistakeAnalysis();

    return {
      // Key metrics for display
      notesReached: this.notesReached,
      noteAccuracy: metrics.noteAccuracy,
      longestStreak: this.longestStreak,
      overallScore: metrics.overallScore,

      // Performance indicators
      grade: this.calculateGrade(metrics.overallScore),
      improvements: mistakes.recommendations.slice(0, 2), // Top 2 recommendations

      // Achievement indicators
      newRecord: false, // Will be set by parent component
      passedLevel: metrics.noteAccuracy >= 0.85 && this.notesReached >= 80
    };
  }

  // Calculate letter grade based on overall score
  calculateGrade(score) {
    if (score >= 0.95) return 'A+';
    if (score >= 0.9) return 'A';
    if (score >= 0.85) return 'A-';
    if (score >= 0.8) return 'B+';
    if (score >= 0.75) return 'B';
    if (score >= 0.7) return 'B-';
    if (score >= 0.65) return 'C+';
    if (score >= 0.6) return 'C';
    if (score >= 0.55) return 'C-';
    if (score >= 0.5) return 'D';
    return 'F';
  }

  // Set total expected notes for the session
  setTotalExpectedNotes(count) {
    this.totalNotesExpected = count;
  }
}

export default PerformanceMetrics;