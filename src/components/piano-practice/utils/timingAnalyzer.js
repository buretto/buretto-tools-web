class TimingAnalyzer {
  constructor(config = {}) {
    // BPM for proportional timing calculations
    this.bpm = config.bpm || 120;

    // Calculate proportional timing thresholds based on BPM
    const beatDuration = 60.0 / this.bpm; // seconds per beat

    // Timing thresholds (proportional to beat duration)
    this.accurateThreshold = config.accurateThreshold || (beatDuration * 0.05); // ±5% of beat duration
    this.earlyThreshold = config.earlyThreshold || (beatDuration * 0.10); // 10% of beat duration early
    this.lateThreshold = config.lateThreshold || (beatDuration * 0.15); // 15% of beat duration late

    // Performance tracking
    this.performances = [];
    this.cumulativeDrift = 0;
    this.sessionStartTime = null;
    this.sequenceStartTime = null; // Track when sequence playback started
    this.pauseMetrics = {
      pauseCount: 0,
      totalPauseTime: 0,
      pauseDurations: []
    };
  }

  // Start a new session
  startSession() {
    this.performances = [];
    this.cumulativeDrift = 0;
    this.sessionStartTime = performance.now() / 1000;
    this.sequenceStartTime = null; // Will be set on first note
    this.pauseMetrics = {
      pauseCount: 0,
      totalPauseTime: 0,
      pauseDurations: []
    };
  }

  // Record a note performance
  recordNotePerformance(expectedNote, actualPlayTime, holdDuration = 0) {
    const performance = this.analyzeNotePerformance(expectedNote, actualPlayTime, holdDuration);
    this.performances.push(performance);

    // Update cumulative drift for next note timing
    if (performance.timingAccuracy === 'accurate' || performance.timingAccuracy === 'early' || performance.timingAccuracy === 'late') {
      this.cumulativeDrift += performance.drift;
    }

    return performance;
  }

  // Analyze a single note performance
  analyzeNotePerformance(expectedNote, actualPlayTime, holdDuration = 0) {
    // actualPlayTime is already in seconds from performance.now() / 1000
    const actualTimeSeconds = actualPlayTime;

    // Set sequence start time on first note if not set
    if (this.sequenceStartTime === null) {
      this.sequenceStartTime = actualTimeSeconds;
    }

    // Calculate time elapsed since sequence started
    const sequenceElapsed = actualTimeSeconds - this.sequenceStartTime;

    // Expected time is relative to sequence start (from SequenceGenerator)
    const expectedTime = expectedNote.startTime;

    // Calculate drift (positive = late, negative = early)
    const drift = sequenceElapsed - expectedTime;
    const absoluteDrift = Math.abs(drift);

    let timingAccuracy = 'accurate';
    let noteResult = 'correct';

    // Get expected duration for hold analysis
    const expectedDuration = expectedNote.duration;

    // Determine timing accuracy
    if (absoluteDrift <= this.accurateThreshold) {
      timingAccuracy = 'accurate';
    } else if (drift < -this.earlyThreshold) {
      timingAccuracy = 'too_early';
      noteResult = 'early_mistake'; // Need to play again at correct time
    } else if (drift > this.lateThreshold) {
      timingAccuracy = 'pause';
      noteResult = 'pause'; // Waited too long

      // Track pause metrics
      const pauseDuration = drift - this.lateThreshold;
      this.pauseMetrics.pauseCount++;
      this.pauseMetrics.totalPauseTime += pauseDuration;
      this.pauseMetrics.pauseDurations.push(pauseDuration);

      // Adjust sequence start time to account for pause
      // This prevents the pause from affecting subsequent notes
      this.sequenceStartTime += pauseDuration;

      // Recalculate drift after adjustment for recording purposes
      const adjustedSequenceElapsed = actualTimeSeconds - this.sequenceStartTime;
      const adjustedDrift = adjustedSequenceElapsed - expectedTime;

      // Store both the original pause duration and adjusted drift
      return {
        expectedNote,
        actualPlayTime,
        expectedTime,
        drift: adjustedDrift, // Adjusted drift for display
        pauseDuration: drift, // Original pause duration for pause metrics
        absoluteDrift: Math.abs(adjustedDrift),
        timingAccuracy,
        timingScore: 0, // Pauses always get 0 score
        noteResult,
        holdDuration,
        holdAccuracy: this.analyzeHoldDuration(holdDuration, expectedDuration),
        sequenceIndex: expectedNote.sequenceIndex
      };
    } else if (drift < 0) {
      timingAccuracy = 'early';
    } else {
      timingAccuracy = 'late';
    }

    // Calculate timing accuracy score (0-1) based on how close to perfect timing
    const timingScore = this.calculateTimingScore(absoluteDrift, timingAccuracy);

    // Analyze hold duration vs expected duration
    const holdAccuracy = this.analyzeHoldDuration(holdDuration, expectedDuration);

    return {
      expectedNote,
      actualPlayTime,
      expectedTime,
      drift,
      absoluteDrift,
      timingAccuracy,
      timingScore,
      noteResult,
      holdDuration,
      holdAccuracy,
      sequenceIndex: expectedNote.sequenceIndex
    };
  }

  // Analyze note hold duration
  analyzeHoldDuration(actualDuration, expectedDuration) {
    if (expectedDuration === 0) return { accuracy: 'n/a', ratio: 1 };

    const ratio = actualDuration / expectedDuration;
    let accuracy = 'accurate';

    if (ratio < 0.7) {
      accuracy = 'too_short';
    } else if (ratio > 1.3) {
      accuracy = 'too_long';
    } else if (ratio < 0.85 || ratio > 1.15) {
      accuracy = 'slightly_off';
    }

    return {
      accuracy,
      ratio,
      difference: actualDuration - expectedDuration
    };
  }

  // Calculate timing accuracy score based on absolute drift
  calculateTimingScore(absoluteDrift, timingAccuracy) {
    if (timingAccuracy === 'pause') {
      return 0; // Pauses get zero score
    }

    // Scoring thresholds
    const perfectThreshold = 0.025; // 25ms = perfect (100%)
    const goodThreshold = 0.05;     // 50ms = good (75%)
    const okThreshold = 0.1;        // 100ms = okay (50%)
    const poorThreshold = 0.2;      // 200ms = poor (25%)
    // Beyond 200ms = 0%

    if (absoluteDrift <= perfectThreshold) {
      return 1.0; // 100%
    } else if (absoluteDrift <= goodThreshold) {
      // Linear interpolation between 100% and 75%
      const ratio = (absoluteDrift - perfectThreshold) / (goodThreshold - perfectThreshold);
      return 1.0 - (ratio * 0.25);
    } else if (absoluteDrift <= okThreshold) {
      // Linear interpolation between 75% and 50%
      const ratio = (absoluteDrift - goodThreshold) / (okThreshold - goodThreshold);
      return 0.75 - (ratio * 0.25);
    } else if (absoluteDrift <= poorThreshold) {
      // Linear interpolation between 50% and 25%
      const ratio = (absoluteDrift - okThreshold) / (poorThreshold - okThreshold);
      return 0.5 - (ratio * 0.25);
    } else {
      return 0; // Very poor timing
    }
  }

  // Get adjusted time accounting for drift
  getAdjustedTime() {
    return this.sessionStartTime ? (performance.now() / 1000 - this.sessionStartTime) : 0;
  }

  // Calculate comprehensive timing metrics
  getTimingMetrics() {
    if (this.performances.length === 0) {
      return this.getEmptyMetrics();
    }

    const totalNotes = this.performances.length;
    const accurateNotes = this.performances.filter(p => p.timingAccuracy === 'accurate').length;
    const earlyNotes = this.performances.filter(p => p.timingAccuracy === 'early' || p.timingAccuracy === 'too_early').length;
    const lateNotes = this.performances.filter(p => p.timingAccuracy === 'late').length;
    const pauseNotes = this.performances.filter(p => p.timingAccuracy === 'pause').length;

    // Calculate timing accuracy using weighted scores instead of just accurate/inaccurate
    const totalTimingScore = this.performances.reduce((sum, p) => sum + (p.timingScore || 0), 0);
    const timingAccuracy = totalNotes > 0 ? totalTimingScore / totalNotes : 0;

    // Calculate timing precision (consistency - lower standard deviation = higher precision)
    const drifts = this.performances
      .filter(p => p && p.timingAccuracy !== 'pause' && typeof p.drift === 'number' && !isNaN(p.drift) && isFinite(p.drift))
      .map(p => p.drift)
      .filter(drift => typeof drift === 'number' && !isNaN(drift) && isFinite(drift));

    if (drifts.length === 0) {
      return this.getEmptyMetrics();
    }

    const averageDrift = drifts.length > 0 ? drifts.reduce((sum, drift) => sum + drift, 0) / drifts.length : 0;
    const averageAbsDrift = drifts.length > 0 ? drifts.reduce((sum, drift) => sum + Math.abs(drift), 0) / drifts.length : 0;

    const driftVariance = drifts.length > 0 ? drifts.reduce((sum, drift) => sum + Math.pow(drift - averageDrift, 2), 0) / drifts.length : 0;
    const driftStdDev = Math.sqrt(Math.max(0, driftVariance));

    // Convert standard deviation to precision score (0-1)
    const timingPrecision = Math.max(0, 1 - (driftStdDev / 0.2)); // 200ms std dev = 0 precision

    // Calculate max drift in both directions
    const earlyDrifts = drifts.filter(d => d < 0);
    const lateDrifts = drifts.filter(d => d > 0);
    const maxEarlyDrift = earlyDrifts.length > 0 ? Math.min(...earlyDrifts) : 0; // Most negative (earliest)
    const maxLateDrift = lateDrifts.length > 0 ? Math.max(...lateDrifts) : 0; // Most positive (latest)
    const maxAbsDrift = drifts.length > 0 ? Math.max(...drifts.map(d => Math.abs(d))) : 0;

    // Detect timing patterns
    const patterns = this.detectTimingPatterns();

    // Calculate hold timing metrics
    const holdMetrics = this.calculateHoldMetrics();

    // Calculate pause metrics
    const pauseMetrics = {
      pauseCount: this.pauseMetrics.pauseCount,
      totalPauseTime: this.pauseMetrics.totalPauseTime,
      averagePauseTime: this.pauseMetrics.pauseCount > 0 ? this.pauseMetrics.totalPauseTime / this.pauseMetrics.pauseCount : 0,
      minPauseTime: this.pauseMetrics.pauseDurations.length > 0 ? Math.min(...this.pauseMetrics.pauseDurations) : 0,
      maxPauseTime: this.pauseMetrics.pauseDurations.length > 0 ? Math.max(...this.pauseMetrics.pauseDurations) : 0
    };

    return {
      totalNotes,
      accurateNotes,
      earlyNotes,
      lateNotes,
      pauseNotes,
      timingAccuracy,
      timingPrecision,
      averageDrift,
      averageAbsDrift,
      maxEarlyDrift,
      maxLateDrift,
      maxAbsDrift,
      driftStdDev,
      cumulativeDrift: this.cumulativeDrift,
      patterns,
      holdMetrics,
      pauseMetrics
    };
  }

  // Detect timing patterns for feedback
  detectTimingPatterns() {
    if (this.performances.length < 5) {
      return { pattern: 'insufficient_data', confidence: 0 };
    }

    const recentPerformances = this.performances.slice(-10); // Look at last 10 notes
    const drifts = recentPerformances
      .filter(p => p && p.timingAccuracy !== 'pause' && typeof p.drift === 'number' && !isNaN(p.drift))
      .map(p => p.drift);

    if (drifts.length < 3) {
      return { pattern: 'insufficient_data', confidence: 0 };
    }

    const averageDrift = drifts.length > 0 ? drifts.reduce((sum, drift) => sum + drift, 0) / drifts.length : 0;
    const consistentlyEarly = drifts.filter(d => d < -0.02).length / drifts.length > 0.7;
    const consistentlyLate = drifts.filter(d => d > 0.02).length / drifts.length > 0.7;
    const inconsistent = Math.abs(averageDrift) < 0.01 && drifts.some(d => Math.abs(d) > 0.1);

    let pattern = 'balanced';
    let confidence = 0;

    if (consistentlyEarly) {
      pattern = 'consistently_early';
      confidence = Math.min(1, Math.abs(averageDrift) / 0.05);
    } else if (consistentlyLate) {
      pattern = 'consistently_late';
      confidence = Math.min(1, averageDrift / 0.05);
    } else if (inconsistent) {
      pattern = 'inconsistent';
      confidence = Math.min(1, Math.sqrt(drifts.reduce((sum, d) => sum + d*d, 0) / drifts.length) / 0.1);
    }

    return {
      pattern,
      confidence,
      averageDrift,
      recommendation: this.getPatternRecommendation(pattern, averageDrift)
    };
  }

  // Get recommendations based on timing patterns
  getPatternRecommendation(pattern, averageDrift) {
    switch (pattern) {
      case 'consistently_early':
        return 'Try to slow down and wait for the beat. Focus on feeling the pulse.';
      case 'consistently_late':
        return 'Try to anticipate the beat better. Practice with a metronome.';
      case 'inconsistent':
        return 'Work on timing consistency. Practice slow, steady rhythms first.';
      case 'balanced':
        return 'Good timing! Try increasing tempo or complexity.';
      default:
        return 'Keep practicing to establish timing patterns.';
    }
  }

  // Calculate hold duration metrics
  calculateHoldMetrics() {
    const holdPerformances = this.performances.filter(p => p && p.expectedNote && p.expectedNote.duration > 0 && p.holdAccuracy);

    if (holdPerformances.length === 0) {
      return { accuracy: 1, averageRatio: 1, pattern: 'no_holds' };
    }

    const accurateHolds = holdPerformances.filter(p => p.holdAccuracy && p.holdAccuracy.accuracy === 'accurate').length;
    const accuracy = holdPerformances.length > 0 ? accurateHolds / holdPerformances.length : 0;

    const ratios = holdPerformances
      .map(p => p.holdAccuracy.ratio)
      .filter(ratio => typeof ratio === 'number' && !isNaN(ratio));
    const averageRatio = ratios.length > 0 ? ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length : 1;

    let pattern = 'accurate';
    if (averageRatio < 0.8) {
      pattern = 'too_short';
    } else if (averageRatio > 1.2) {
      pattern = 'too_long';
    }

    return {
      accuracy,
      averageRatio,
      pattern,
      totalHolds: holdPerformances.length
    };
  }

  // Get empty metrics for initialization
  getEmptyMetrics() {
    return {
      totalNotes: 0,
      accurateNotes: 0,
      earlyNotes: 0,
      lateNotes: 0,
      pauseNotes: 0,
      timingAccuracy: 0,
      timingPrecision: 0,
      averageDrift: 0,
      driftStdDev: 0,
      cumulativeDrift: 0,
      patterns: { pattern: 'no_data', confidence: 0 },
      holdMetrics: { accuracy: 0, averageRatio: 1, pattern: 'no_data' }
    };
  }

  // Get detailed analysis for advanced view
  getDetailedAnalysis() {
    return {
      performances: this.performances,
      metrics: this.getTimingMetrics(),
      driftOverTime: this.performances.map((p, index) => ({
        index,
        time: p.actualPlayTime,
        drift: p.drift,
        timingAccuracy: p.timingAccuracy
      })),
      holdAnalysis: this.performances
        .filter(p => p.expectedNote.duration > 0)
        .map(p => ({
          index: p.sequenceIndex,
          expectedDuration: p.expectedNote.duration,
          actualDuration: p.holdDuration,
          ratio: p.holdAccuracy.ratio,
          accuracy: p.holdAccuracy.accuracy
        }))
    };
  }

  // Reset for new session
  reset() {
    this.performances = [];
    this.cumulativeDrift = 0;
    this.sessionStartTime = null;
    this.sequenceStartTime = null;
    this.pauseMetrics = {
      pauseCount: 0,
      totalPauseTime: 0,
      pauseDurations: []
    };
  }
}

export default TimingAnalyzer;