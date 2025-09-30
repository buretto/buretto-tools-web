import React from 'react';
import { Trophy, Target, RotateCcw, ArrowLeft, Unlock } from 'lucide-react';

const ScoreDisplay = ({
  score,
  deck,
  previousRecord,
  passed,
  onGoAgain,
  onChangeDeck
}) => {
  const isNewRecord = score > previousRecord;
  const progressPercentage = Math.min((score / 60) * 100, 100);

  const getScoreColor = () => {
    if (passed) return 'text-green-600';
    if (score >= 45) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = () => {
    if (passed) return 'Excellent! Level Passed!';
    if (score >= 45) return 'Good effort! Almost there!';
    if (score >= 30) return 'Keep practicing!';
    return 'Try focusing on accuracy first';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-buretto-primary mb-2">
          Session Complete!
        </h2>
        <p className="text-buretto-accent">
          {deck.scale} Scale - {deck.practiceTypeName} - {deck.difficultyName}
        </p>
      </div>

      {/* Score Display */}
      <div className="bg-white border-2 rounded-lg p-8">
        <div className="text-center space-y-6">
          {/* Main Score */}
          <div className="space-y-2">
            <div className={`text-6xl font-bold ${getScoreColor()}`}>
              {score}
            </div>
            <div className="text-lg text-buretto-accent">
              cards completed in 60 seconds
            </div>
            <div className={`text-xl font-semibold ${getScoreColor()}`}>
              {getScoreMessage()}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-buretto-accent">
              <span>Progress to Pass</span>
              <span>{score}/60</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-1000 ${
                  passed ? 'bg-green-500' : 'bg-buretto-secondary'
                }`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {/* Records and Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Current Score */}
            <div className="bg-buretto-light p-4 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Target size={20} className="text-buretto-secondary" />
                <span className="font-semibold text-buretto-primary">Today's Score</span>
              </div>
              <div className="text-2xl font-bold text-buretto-primary text-center">
                {score}
              </div>
            </div>

            {/* Previous Record */}
            <div className="bg-buretto-light p-4 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Trophy size={20} className="text-buretto-secondary" />
                <span className="font-semibold text-buretto-primary">Session Record</span>
              </div>
              <div className="text-2xl font-bold text-buretto-primary text-center">
                {Math.max(score, previousRecord)}
              </div>
              {isNewRecord && score > 0 && (
                <div className="text-sm text-green-600 text-center mt-1">
                  New Record! 🎉
                </div>
              )}
            </div>

            {/* Pass Status */}
            <div className="bg-buretto-light p-4 rounded-lg">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Unlock size={20} className={passed ? 'text-green-600' : 'text-gray-400'} />
                <span className="font-semibold text-buretto-primary">Status</span>
              </div>
              <div className={`text-lg font-bold text-center ${
                passed ? 'text-green-600' : 'text-gray-600'
              }`}>
                {passed ? 'PASSED' : 'KEEP TRYING'}
              </div>
              {passed && (
                <div className="text-sm text-green-600 text-center mt-1">
                  Next level unlocked!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={onGoAgain}
          className="flex items-center justify-center space-x-2 px-8 py-3 bg-buretto-secondary text-white rounded-lg hover:bg-opacity-90 transition-colors font-semibold"
        >
          <RotateCcw size={20} />
          <span>Go Again</span>
        </button>

        <button
          onClick={onChangeDeck}
          className="flex items-center justify-center space-x-2 px-8 py-3 bg-buretto-accent text-white rounded-lg hover:bg-opacity-90 transition-colors font-semibold"
        >
          <ArrowLeft size={20} />
          <span>Change Deck</span>
        </button>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-3">
          Tips for Improvement:
        </h3>
        <ul className="text-sm text-blue-700 space-y-2">
          {score < 30 && (
            <>
              <li>• Focus on accuracy over speed - correct notes matter most</li>
              <li>• Practice the scale pattern slowly outside of the game</li>
              <li>• Make sure your MIDI keyboard is properly calibrated</li>
            </>
          )}
          {score >= 30 && score < 45 && (
            <>
              <li>• Great progress! Work on recognizing note patterns quickly</li>
              <li>• Try practicing with a metronome to improve timing</li>
              <li>• Focus on smooth finger transitions between notes</li>
            </>
          )}
          {score >= 45 && !passed && (
            <>
              <li>• You're almost there! Work on quick note recognition</li>
              <li>• Try to anticipate the next note while playing the current one</li>
              <li>• Maintain steady rhythm even when reading gets challenging</li>
            </>
          )}
          {passed && (
            <>
              <li>• Excellent work! Try the next difficulty level</li>
              <li>• Challenge yourself with different scales</li>
              <li>• Consider trying more complex practice types</li>
            </>
          )}
        </ul>
      </div>

      {/* Session Reset Notice */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-sm text-yellow-700 text-center">
          <strong>Note:</strong> Progress and records reset when you leave this session.
          This encourages consistent practice and warming up with easier levels each time.
        </p>
      </div>
    </div>
  );
};

export default ScoreDisplay;