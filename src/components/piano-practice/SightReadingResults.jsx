import React, { useState } from 'react';
import { TrendingUp, Target, Clock, Music, BarChart3, Eye, HelpCircle } from 'lucide-react';

// Tooltip component for metric descriptions
const MetricTooltip = ({ description, children }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div className="flex items-center space-x-2">
        {children}
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <HelpCircle size={14} />
        </button>
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
          {description}
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
};

const SightReadingResults = ({
  results,
  deck,
  previousRecord,
  onGoAgain,
  onChangeDeck,
  onViewDetailedAnalysis
}) => {
  if (!results) {
    return <div>Loading results...</div>;
  }

  const {
    notesReached,
    noteAccuracy,
    timingMetrics,
    longestStreak,
    overallScore,
    mistakeAnalysis,
    sessionDuration
  } = results;

  const newRecord = notesReached > previousRecord;

  // Use tempo-based goals if available, otherwise fall back to default
  const goalBeats = deck.goal ? deck.goal.beats : 80;
  const goalAccuracy = deck.goal ? deck.goal.accuracy : 0.85;
  const passed = noteAccuracy >= goalAccuracy && notesReached >= goalBeats;

  const formatPercentage = (value) => `${Math.round(value * 100)}%`;
  const formatTime = (seconds) => `${Math.round(seconds * 1000)}ms`;

  const getGrade = (score) => {
    if (score >= 0.95) return { letter: 'A+', color: 'text-green-600' };
    if (score >= 0.9) return { letter: 'A', color: 'text-green-600' };
    if (score >= 0.85) return { letter: 'A-', color: 'text-green-500' };
    if (score >= 0.8) return { letter: 'B+', color: 'text-blue-600' };
    if (score >= 0.75) return { letter: 'B', color: 'text-blue-500' };
    if (score >= 0.7) return { letter: 'B-', color: 'text-blue-400' };
    if (score >= 0.65) return { letter: 'C+', color: 'text-yellow-600' };
    if (score >= 0.6) return { letter: 'C', color: 'text-yellow-500' };
    if (score >= 0.5) return { letter: 'D', color: 'text-orange-500' };
    return { letter: 'F', color: 'text-red-500' };
  };

  const grade = getGrade(overallScore);

  const getTimingFeedback = () => {
    const { patterns } = timingMetrics;
    if (!patterns || patterns.pattern === 'no_data') {
      return 'Not enough data to analyze timing patterns.';
    }

    switch (patterns.pattern) {
      case 'consistently_early':
        return '⏰ You tend to rush ahead. Try to slow down and feel the beat.';
      case 'consistently_late':
        return '⏳ You tend to lag behind. Practice anticipating the beat better.';
      case 'inconsistent':
        return '🎯 Work on timing consistency. Practice with a metronome.';
      case 'balanced':
        return '✅ Good timing balance! Your rhythm is well-controlled.';
      default:
        return 'Keep practicing to develop timing patterns.';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with overall results */}
      <div className="text-center">
        {newRecord && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-yellow-800 font-semibold">🎉 New Personal Record!</div>
          </div>
        )}

        {passed && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-800 font-semibold">🎯 Level Passed!</div>
            <div className="text-sm text-green-700">You've unlocked the next difficulty level</div>
          </div>
        )}

        <div className="bg-buretto-light p-6 rounded-lg">
          <div className="flex items-center justify-center space-x-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-buretto-primary mb-1">{notesReached}</div>
              <div className="text-sm text-buretto-accent">Notes Reached</div>
              {previousRecord > 0 && (
                <div className="text-xs text-gray-500">Previous: {previousRecord}</div>
              )}
            </div>

            <div className="text-center">
              <div className={`text-4xl font-bold ${grade.color} mb-1`}>{grade.letter}</div>
              <div className="text-sm text-buretto-accent">Overall Grade</div>
              <div className="text-xs text-gray-500">{formatPercentage(overallScore)}</div>
            </div>

            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-1">{longestStreak}</div>
              <div className="text-sm text-buretto-accent">Best Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <MetricTooltip description="Percentage of correct notes out of all notes attempted">
              <span className="font-medium text-buretto-primary">Note Accuracy</span>
            </MetricTooltip>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatPercentage(noteAccuracy)}
          </div>
          <div className="text-sm text-gray-600">
            {results.notesProgressed || results.correctNotes} correct / {(results.notesProgressed || results.correctNotes) + (results.errorCount || (results.wrongNotes + results.extraNotes))} played
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Clock className="w-5 h-5 text-green-600" />
            <MetricTooltip description="Percentage score based on how close notes are played to expected timing. Uses threshold-based scoring: perfect (<25ms) = 100%, good (<50ms) = 75%, etc. Pauses score 0%.">
              <span className="font-medium text-buretto-primary">Timing Accuracy</span>
            </MetricTooltip>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatPercentage(timingMetrics.timingAccuracy)}
          </div>
          <div className="text-sm text-gray-600">
            Avg drift: {formatTime(Math.abs(timingMetrics.averageDrift))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <Music className="w-5 h-5 text-purple-600" />
            <MetricTooltip description="Consistency of timing. Based on standard deviation of timing drift - lower variation = higher precision">
              <span className="font-medium text-buretto-primary">Timing Precision</span>
            </MetricTooltip>
          </div>
          <div className="text-2xl font-bold text-purple-600">
            {formatPercentage(timingMetrics.timingPrecision)}
          </div>
          <div className="text-sm text-gray-600">
            Consistency score
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            <MetricTooltip description="Actual tempo of notes played (beats per minute)">
              <span className="font-medium text-buretto-primary">Performed BPM</span>
            </MetricTooltip>
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {Math.round(results.performedBPM || results.notesPerMinute || 0)}
          </div>
          <div className="text-sm text-gray-600">
            Note tempo
          </div>
        </div>
      </div>

      {/* Feedback section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-buretto-primary mb-4">Performance Feedback</h3>

        <div className="space-y-4">
          {/* Timing feedback */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Timing Analysis</h4>
            <p className="text-sm text-blue-700">{getTimingFeedback()}</p>
          </div>

          {/* Mistake analysis */}
          {mistakeAnalysis.totalMistakes > 0 && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">
                Areas for Improvement ({mistakeAnalysis.totalMistakes} mistakes)
              </h4>
              <div className="text-sm text-yellow-700 space-y-1">
                {mistakeAnalysis.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index}>• {rec}</div>
                ))}
              </div>
            </div>
          )}

          {/* Success feedback */}
          {mistakeAnalysis.totalMistakes === 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Excellent Performance!</h4>
              <p className="text-sm text-green-700">
                Perfect accuracy! Consider increasing difficulty or tempo for your next session.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Deck configuration display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-buretto-primary mb-2">Session Configuration</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Scale:</span> {deck.scale}
          </div>
          <div>
            <span className="font-medium">Type:</span> {deck.practiceTypeName}
          </div>
          <div>
            <span className="font-medium">Difficulty:</span> {deck.difficultyName}
          </div>
          <div>
            <span className="font-medium">Rhythm:</span> {deck.rhythmPattern}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          Duration: {Math.round(sessionDuration)}s
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onGoAgain}
          className="px-6 py-3 bg-buretto-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Practice Again
        </button>

        <button
          onClick={onViewDetailedAnalysis}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Detailed Analysis</span>
        </button>

        <button
          onClick={onChangeDeck}
          className="px-6 py-3 bg-buretto-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Change Settings
        </button>
      </div>
    </div>
  );
};

export default SightReadingResults;