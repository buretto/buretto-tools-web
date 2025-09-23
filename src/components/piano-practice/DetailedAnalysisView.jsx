import React, { useState } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Clock, Target, AlertTriangle, HelpCircle } from 'lucide-react';
import { midiNoteToName } from './utils/noteNames';

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

const DetailedAnalysisView = ({ results, deck, onBackToResults }) => {
  const [activeTab, setActiveTab] = useState('timeline');

  if (!results || !results.detailedAnalysis) {
    return (
      <div className="text-center">
        <div className="text-gray-500">No detailed analysis available</div>
        <button
          onClick={onBackToResults}
          className="mt-4 px-4 py-2 bg-buretto-accent text-white rounded-lg hover:bg-opacity-90"
        >
          Back to Results
        </button>
      </div>
    );
  }

  const { detailedAnalysis, mistakeAnalysis, timingMetrics } = results;
  const { performances, driftOverTime } = detailedAnalysis;

  const formatTime = (seconds) => `${Math.round(seconds * 1000)}ms`;
  const formatPercentage = (value) => `${Math.round(value * 100)}%`;

  const renderTimelineTab = () => {
    return (
      <div className="space-y-6">
        {/* Performance timeline */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-buretto-primary mb-4">Performance Timeline</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {performances.slice(0, 50).map((performance, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                performance.timingAccuracy === 'accurate' ? 'bg-green-50' :
                performance.timingAccuracy === 'too_early' ? 'bg-red-50' :
                performance.timingAccuracy === 'pause' ? 'bg-yellow-50' :
                performance.timingAccuracy === 'early' || performance.timingAccuracy === 'late' ?
                'bg-blue-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-mono text-gray-600">#{performance.sequenceIndex + 1}</span>
                  <div className="text-sm">
                    <div className="font-medium">
                      {performance.expectedNote.expectedNotes.map(note => midiNoteToName(note)).join(', ')}
                    </div>
                    <div className="text-xs text-gray-600">
                      Expected: {performance.expectedTime.toFixed(2)}s
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm">
                  <div className={`font-medium ${
                    performance.timingAccuracy === 'accurate' ? 'text-green-600' :
                    performance.timingAccuracy === 'too_early' ? 'text-red-600' :
                    performance.timingAccuracy === 'pause' ? 'text-yellow-600' :
                    'text-blue-600'
                  }`}>
                    {performance.timingAccuracy.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-gray-600">
                    Drift: {formatTime(performance.drift)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {performances.length > 50 && (
            <div className="text-center text-sm text-gray-500 mt-4">
              Showing first 50 of {performances.length} notes
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDriftAnalysisTab = () => {
    const driftData = driftOverTime.slice(0, 100); // Limit for performance

    // Calculate drift statistics
    const avgDrift = driftData.reduce((sum, d) => sum + d.drift, 0) / driftData.length;
    const avgAbsDrift = driftData.reduce((sum, d) => sum + Math.abs(d.drift), 0) / driftData.length;
    const maxEarlyDrift = Math.min(...driftData.map(d => d.drift));
    const maxLateDrift = Math.max(...driftData.map(d => d.drift));
    const driftsEarly = driftData.filter(d => d.drift < -0.02).length;
    const driftsLate = driftData.filter(d => d.drift > 0.02).length;

    return (
      <div className="space-y-6">
        {/* Drift statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Average Drift</div>
            <div className={`text-xl font-bold ${avgDrift < 0 ? 'text-red-600' : 'text-blue-600'}`}>
              {formatTime(avgDrift)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {avgDrift < 0 ? 'Tends early' : avgDrift > 0 ? 'Tends late' : 'Balanced'}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Average Abs. Drift</div>
            <div className="text-xl font-bold text-orange-600">
              {formatTime(avgAbsDrift)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Overall timing error
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Max Drift Range</div>
            <div className="text-sm font-bold">
              <span className="text-red-600">{formatTime(Math.abs(maxEarlyDrift))}</span>
              <span className="text-gray-400 mx-1">to</span>
              <span className="text-blue-600">{formatTime(maxLateDrift)}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Early to late extremes
            </div>
          </div>
        </div>

        {/* Drift chart (simplified text-based visualization) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-buretto-primary mb-4">Timing Drift Over Time</h3>
          <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
            {driftData.map((point, index) => {
              const driftMs = point.drift * 1000;
              const barLength = Math.min(50, Math.abs(driftMs) / 2); // Scale visualization
              const isEarly = driftMs < 0;

              return (
                <div key={index} className="flex items-center space-x-2">
                  <span className="w-8 text-gray-500">#{point.index + 1}</span>
                  <div className="flex-1 flex items-center">
                    {isEarly ? (
                      <div className="flex items-center">
                        <div
                          className="bg-red-300 h-2"
                          style={{ width: `${barLength}px` }}
                        />
                        <span className="ml-2 text-red-600">{Math.round(driftMs)}ms early</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <div
                          className="bg-blue-300 h-2"
                          style={{ width: `${barLength}px` }}
                        />
                        <span className="ml-2 text-blue-600">{Math.round(driftMs)}ms late</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timing patterns */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-buretto-primary mb-4">Timing Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Overall Tendency</h4>
              <p className="text-sm text-blue-700">
                {avgDrift < -0.01 ? '⏰ Tends to rush ahead' :
                 avgDrift > 0.01 ? '⏳ Tends to lag behind' :
                 '✅ Well-balanced timing'}
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">Consistency</h4>
              <p className="text-sm text-purple-700">
                {timingMetrics.timingPrecision > 0.8 ? '🎯 Very consistent' :
                 timingMetrics.timingPrecision > 0.6 ? '📊 Moderately consistent' :
                 '📈 Work on consistency'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderMistakesTab = () => {
    const { mistakeEvents } = detailedAnalysis;

    if (!mistakeEvents || mistakeEvents.length === 0) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-green-800 text-lg font-semibold mb-2">🎉 Perfect Performance!</div>
          <div className="text-green-700">No mistakes detected in this session.</div>
        </div>
      );
    }

    // Group mistakes by type
    const mistakesByType = {
      wrong_note: mistakeEvents.filter(e => e.type === 'wrong_note'),
      early_note: mistakeEvents.filter(e => e.type === 'early_note'),
      missed_note: mistakeEvents.filter(e => e.type === 'missed_note'),
      unexpected_note: mistakeEvents.filter(e => e.type === 'unexpected_note')
    };

    return (
      <div className="space-y-6">
        {/* Mistake summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-600 mb-1">Wrong Notes</div>
            <div className="text-2xl font-bold text-red-600">
              {mistakesByType.wrong_note.length}
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-600 mb-1">Early Notes</div>
            <div className="text-2xl font-bold text-orange-600">
              {mistakesByType.early_note.length}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-600 mb-1">Missed Notes</div>
            <div className="text-2xl font-bold text-yellow-600">
              {mistakesByType.missed_note.length}
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 mb-1">Extra Notes</div>
            <div className="text-2xl font-bold text-purple-600">
              {mistakesByType.unexpected_note.length}
            </div>
          </div>
        </div>

        {/* Detailed mistake list */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-buretto-primary mb-4">Mistake Details</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {mistakeEvents.map((mistake, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${
                mistake.type === 'wrong_note' ? 'bg-red-50' :
                mistake.type === 'early_note' ? 'bg-orange-50' :
                mistake.type === 'missed_note' ? 'bg-yellow-50' :
                'bg-purple-50'
              }`}>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-mono text-gray-600">
                    #{mistake.sequenceIndex + 1}
                  </span>
                  <div className="text-sm">
                    <div className="font-medium">
                      {mistake.type === 'wrong_note' && (
                        <>
                          Expected: {mistake.expectedNote.expectedNotes.map(note => midiNoteToName(note)).join(', ')} |
                          Played: {midiNoteToName(mistake.actualMidiNote)}
                        </>
                      )}
                      {mistake.type === 'early_note' && (
                        <>
                          Early: {mistake.expectedNote.expectedNotes.map(note => midiNoteToName(note)).join(', ')} |
                          {formatTime(Math.abs(mistake.drift))} too early
                        </>
                      )}
                      {mistake.type === 'missed_note' && (
                        <>
                          Missed: {mistake.expectedNote.expectedNotes.map(note => midiNoteToName(note)).join(', ')}
                        </>
                      )}
                      {mistake.type === 'unexpected_note' && (
                        <>
                          Unexpected: {midiNoteToName(mistake.actualMidiNote)}
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      Time: {mistake.timestamp ? (mistake.timestamp - results.sessionStartTime).toFixed(2) : 'N/A'}s
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <AlertTriangle className={`w-4 h-4 ${
                    mistake.type === 'wrong_note' ? 'text-red-500' :
                    mistake.type === 'early_note' ? 'text-orange-500' :
                    mistake.type === 'missed_note' ? 'text-yellow-500' :
                    'text-purple-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">Improvement Recommendations</h3>
          <div className="space-y-2">
            {mistakeAnalysis.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                <span className="text-sm text-blue-700">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMetricsTab = () => {
    // Metric descriptions for tooltips
    const descriptions = {
      'Notes Progressed': 'Number of notes successfully played in correct sequence',
      'Total Errors': 'Combined count of wrong notes, early notes, and unexpected notes',
      'Note Accuracy': 'Percentage of correct notes out of all notes attempted',
      'Total Notes Attempted': 'Total number of notes played (correct + errors)',
      'Timing Accuracy': 'Percentage score based on how close notes are played to expected timing. Uses threshold-based scoring: perfect (<25ms) = 100%, good (<50ms) = 75%, etc. Pauses score 0%.',
      'Timing Precision': 'Consistency of timing. Based on standard deviation of timing drift - lower variation = higher precision',
      'Average Drift': 'Average timing offset from expected (negative = early, positive = late)',
      'Average Abs. Drift': 'Average absolute timing deviation regardless of direction',
      'Max Early Drift': 'Largest early timing deviation recorded',
      'Max Late Drift': 'Largest late timing deviation recorded',
      'Total Pauses': 'Number of times you paused (>300ms late)',
      'Total Pause Time': 'Combined duration of all pauses',
      'Average Pause': 'Average length of pause events',
      'Min Pause': 'Shortest pause duration',
      'Max Pause': 'Longest pause duration',
      'Session Duration': 'Total time spent in the practice session',
      'Performed BPM': 'Actual tempo of notes played (beats per minute)',
      'Longest Streak': 'Maximum consecutive correct notes achieved',
      'Current Streak': 'Consecutive correct notes at session end',
      'Overall Score': 'Combined score (40% note accuracy + 30% consistency + 30% tempo)',
      'Consistency Score': 'Score based on streak patterns and note accuracy consistency'
    };

    const metrics = {
      'Note Performance': [
        { label: 'Notes Progressed', value: results.notesProgressed || results.correctNotes, description: descriptions['Notes Progressed'] },
        { label: 'Total Errors', value: results.errorCount || (results.wrongNotes + results.extraNotes), description: descriptions['Total Errors'] },
        { label: 'Note Accuracy', value: formatPercentage(results.noteAccuracy), description: descriptions['Note Accuracy'] },
        { label: 'Total Notes Attempted', value: (results.notesProgressed || results.correctNotes) + (results.errorCount || (results.wrongNotes + results.extraNotes)), description: descriptions['Total Notes Attempted'] }
      ],
      'Timing Performance': [
        { label: 'Timing Accuracy', value: formatPercentage(timingMetrics.timingAccuracy), description: descriptions['Timing Accuracy'] },
        { label: 'Timing Precision', value: formatPercentage(timingMetrics.timingPrecision), description: descriptions['Timing Precision'] },
        { label: 'Average Drift', value: formatTime(timingMetrics.averageDrift), description: descriptions['Average Drift'] },
        { label: 'Average Abs. Drift', value: formatTime(timingMetrics.averageAbsDrift), description: descriptions['Average Abs. Drift'] },
        { label: 'Max Early Drift', value: formatTime(Math.abs(timingMetrics.maxEarlyDrift)), description: descriptions['Max Early Drift'] },
        { label: 'Max Late Drift', value: formatTime(timingMetrics.maxLateDrift), description: descriptions['Max Late Drift'] }
      ],
      'Pause Analysis': [
        { label: 'Total Pauses', value: timingMetrics.pauseMetrics?.pauseCount || 0, description: descriptions['Total Pauses'] },
        { label: 'Total Pause Time', value: formatTime(timingMetrics.pauseMetrics?.totalPauseTime || 0), description: descriptions['Total Pause Time'] },
        { label: 'Average Pause', value: formatTime(timingMetrics.pauseMetrics?.averagePauseTime || 0), description: descriptions['Average Pause'] },
        { label: 'Min Pause', value: formatTime(timingMetrics.pauseMetrics?.minPauseTime || 0), description: descriptions['Min Pause'] },
        { label: 'Max Pause', value: formatTime(timingMetrics.pauseMetrics?.maxPauseTime || 0), description: descriptions['Max Pause'] }
      ],
      'Session Metrics': [
        { label: 'Session Duration', value: `${Math.round(results.sessionDuration)}s`, description: descriptions['Session Duration'] },
        { label: 'Performed BPM', value: Math.round(results.performedBPM || 0), description: descriptions['Performed BPM'] },
        { label: 'Longest Streak', value: results.longestStreak, description: descriptions['Longest Streak'] },
        { label: 'Current Streak', value: results.currentStreak, description: descriptions['Current Streak'] },
        { label: 'Overall Score', value: formatPercentage(results.overallScore), description: descriptions['Overall Score'] },
        { label: 'Consistency Score', value: formatPercentage(results.consistencyScore), description: descriptions['Consistency Score'] }
      ]
    };

    return (
      <div className="space-y-6">
        {Object.entries(metrics).map(([category, items]) => (
          <div key={category} className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-buretto-primary mb-4">{category}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  {item.description ? (
                    <MetricTooltip description={item.description}>
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </MetricTooltip>
                  ) : (
                    <span className="text-sm text-gray-700">{item.label}</span>
                  )}
                  <div className="text-right">
                    <span className="font-medium text-buretto-primary">{item.value}</span>
                    {item.details && (
                      <div className="text-xs text-gray-500 mt-1">{item.details}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const tabs = [
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'drift', label: 'Timing Analysis', icon: TrendingUp },
    { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle },
    { id: 'metrics', label: 'All Metrics', icon: Target }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBackToResults}
            className="flex items-center space-x-2 px-4 py-2 bg-buretto-accent text-white rounded-lg hover:bg-opacity-90"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Results</span>
          </button>
          <h2 className="text-2xl font-bold text-buretto-primary">Detailed Performance Analysis</h2>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-buretto-secondary text-buretto-secondary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-96">
        {activeTab === 'timeline' && renderTimelineTab()}
        {activeTab === 'drift' && renderDriftAnalysisTab()}
        {activeTab === 'mistakes' && renderMistakesTab()}
        {activeTab === 'metrics' && renderMetricsTab()}
      </div>
    </div>
  );
};

export default DetailedAnalysisView;