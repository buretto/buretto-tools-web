import React, { useState, useMemo } from 'react';
import { X, TrendingUp, Target, Clock, Music, Award, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDeckResults, getBestMetrics, getPerformanceChartData } from './utils/resultsStorage';

const PastResultsModal = ({ deck, isOpen, onClose }) => {
  const [selectedMetric, setSelectedMetric] = useState('overallScore');

  const results = useMemo(() => getDeckResults(deck), [deck]);
  const bestMetrics = useMemo(() => getBestMetrics(deck), [deck]);
  const chartData = useMemo(() => getPerformanceChartData(deck, selectedMetric), [deck, selectedMetric]);

  if (!isOpen) return null;

  const formatPercentage = (value) => `${Math.round(value * 100)}%`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

  const metricOptions = [
    { value: 'overallScore', label: 'Overall Grade', icon: Award, color: 'text-purple-600' },
    { value: 'noteAccuracy', label: 'Note Accuracy', icon: Target, color: 'text-blue-600' },
    { value: 'timingMetrics.timingAccuracy', label: 'Timing Accuracy', icon: Clock, color: 'text-green-600' },
    { value: 'timingMetrics.timingPrecision', label: 'Timing Precision', icon: Music, color: 'text-purple-600' },
    { value: 'performedBPM', label: 'Performed BPM', icon: TrendingUp, color: 'text-orange-600' }
  ];

  const getMetricValue = (session, metric) => {
    if (metric === 'performedBPM') return Math.round(session.results.performedBPM || 0);
    if (metric.includes('.')) {
      return formatPercentage(metric.split('.').reduce((obj, key) => obj?.[key] || 0, session.results));
    }
    return formatPercentage(session.results[metric] || 0);
  };

  const PerformanceChart = ({ data, metric }) => {
    if (data.length === 0) return <div className="text-gray-500 text-center py-8">No data available</div>;

    const selectedMetricOption = metricOptions.find(m => m.value === selectedMetric);
    const strokeColor = selectedMetricOption?.color.replace('text-', '') || 'blue';

    // Color mapping for Recharts
    const colorMap = {
      'purple': '#9333ea',
      'blue': '#2563eb',
      'green': '#16a34a',
      'orange': '#ea580c'
    };

    // Custom tooltip formatter
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const value = payload[0].value;
        const formattedValue = metric === 'performedBPM' ?
          `${Math.round(value)} BPM` :
          `${Math.round(value * 100)}%`;

        return (
          <div className="bg-white p-2 border border-gray-200 rounded shadow">
            <p className="text-sm">{`Session ${label}: ${formattedValue}`}</p>
          </div>
        );
      }
      return null;
    };

    // Custom Y-axis formatter
    const formatYAxis = (value) => {
      if (metric === 'performedBPM') {
        return Math.round(value);
      }
      return `${Math.round(value * 100)}%`;
    };

    return (
      <div className="space-y-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Session Progress</span>
          <span>{data.length} sessions</span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="session"
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={formatYAxis}
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colorMap[strokeColor] || '#2563eb'}
                strokeWidth={2}
                dot={{ fill: colorMap[strokeColor] || '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colorMap[strokeColor] || '#2563eb', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recent sessions */}
        <div className="text-xs text-gray-600">
          Last 5 sessions: {data.slice(-5).map(d =>
            metric === 'performedBPM' ? Math.round(d.value) : `${Math.round(d.value * 100)}%`
          ).join(', ')}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-buretto-primary">Past Results</h2>
            <p className="text-buretto-accent mt-1">
              {deck.scale} {deck.practiceTypeName} - {deck.difficultyName} - {deck.rhythmPatternName} @ {deck.bpmName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {results.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <Music size={48} className="mx-auto mb-2 opacity-50" />
                <p>No practice sessions recorded yet for this configuration.</p>
                <p className="text-sm mt-2">Complete a session to see your progress here!</p>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Best Scores Summary */}
              {bestMetrics && (
                <div className="bg-buretto-light rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-buretto-primary mb-4 flex items-center">
                    <Award className="w-5 h-5 mr-2" />
                    Personal Bests
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-buretto-primary">{bestMetrics.bestNotesReached}</div>
                      <div className="text-sm text-buretto-accent">Notes Reached</div>
                      {bestMetrics.dates?.notesReached && (
                        <div className="text-xs text-gray-500">{formatDate(bestMetrics.dates.notesReached)}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{formatPercentage(bestMetrics.bestNoteAccuracy)}</div>
                      <div className="text-sm text-buretto-accent">Note Accuracy</div>
                      {bestMetrics.dates?.noteAccuracy && (
                        <div className="text-xs text-gray-500">{formatDate(bestMetrics.dates.noteAccuracy)}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{formatPercentage(bestMetrics.bestTimingAccuracy)}</div>
                      <div className="text-sm text-buretto-accent">Timing Accuracy</div>
                      {bestMetrics.dates?.timingAccuracy && (
                        <div className="text-xs text-gray-500">{formatDate(bestMetrics.dates.timingAccuracy)}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{formatPercentage(bestMetrics.bestTimingPrecision)}</div>
                      <div className="text-sm text-buretto-accent">Timing Precision</div>
                      {bestMetrics.dates?.timingPrecision && (
                        <div className="text-xs text-gray-500">{formatDate(bestMetrics.dates.timingPrecision)}</div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{formatPercentage(bestMetrics.bestOverallScore)}</div>
                      <div className="text-sm text-buretto-accent">Overall Grade</div>
                      {bestMetrics.dates?.overallScore && (
                        <div className="text-xs text-gray-500">{formatDate(bestMetrics.dates.overallScore)}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Performance Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-buretto-primary flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Performance Trends
                  </h3>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  >
                    {metricOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <PerformanceChart data={chartData} metric={selectedMetric} />
              </div>

              {/* Recent Sessions Table */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-buretto-primary mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Recent Sessions
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3">Date</th>
                        <th className="text-left py-2 px-3">Notes</th>
                        <th className="text-left py-2 px-3">Note Acc.</th>
                        <th className="text-left py-2 px-3">Timing Acc.</th>
                        <th className="text-left py-2 px-3">Timing Prec.</th>
                        <th className="text-left py-2 px-3">BPM</th>
                        <th className="text-left py-2 px-3">Grade</th>
                        <th className="text-left py-2 px-3">Passed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.slice(-10).reverse().map((session, index) => (
                        <tr key={session.id || `${session.timestamp}_${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3">{formatDate(session.date)}</td>
                          <td className="py-2 px-3 font-medium">{session.results.notesReached}</td>
                          <td className="py-2 px-3">{formatPercentage(session.results.noteAccuracy)}</td>
                          <td className="py-2 px-3">{formatPercentage(session.results.timingMetrics.timingAccuracy)}</td>
                          <td className="py-2 px-3">{formatPercentage(session.results.timingMetrics.timingPrecision)}</td>
                          <td className="py-2 px-3">{Math.round(session.results.performedBPM || 0)}</td>
                          <td className="py-2 px-3 font-medium">{formatPercentage(session.results.overallScore)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              session.results.passed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {session.results.passed ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {results.length > 10 && (
                  <div className="mt-3 text-sm text-gray-600 text-center">
                    Showing 10 most recent sessions of {results.length} total
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PastResultsModal;