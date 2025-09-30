import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

const CountdownTimer = ({ onComplete, selectedDeck, minimal = false }) => {
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (count > 0) {
      const timer = setTimeout(() => {
        setCount(count - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [count, onComplete]);

  if (minimal) {
    return (
      <div className="flex items-center justify-center">
        {count > 0 ? (
          <span className="text-3xl font-bold text-buretto-primary">
            {count}
          </span>
        ) : (
          <span className="text-xl font-bold text-buretto-secondary">
            GO!
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="text-center space-y-8">
      {/* Deck Info */}
      <div className="bg-buretto-light p-6 rounded-lg">
        <h2 className="text-xl font-bold text-buretto-primary mb-2">
          Get Ready!
        </h2>
        <div className="space-y-1 text-buretto-accent">
          <p><span className="font-medium">Scale:</span> {selectedDeck.scale}</p>
          <p><span className="font-medium">Type:</span> {selectedDeck.practiceTypeName}</p>
          <p><span className="font-medium">Level:</span> {selectedDeck.difficultyName}</p>
          {selectedDeck.rhythmPatternName && (
            <p><span className="font-medium">Rhythm:</span> {selectedDeck.rhythmPatternName}</p>
          )}
          {selectedDeck.bpmName && (
            <p><span className="font-medium">Tempo:</span> {selectedDeck.bpmName}</p>
          )}
        </div>
      </div>

      {/* Countdown Display */}
      <div className="space-y-4">
        <p className="text-lg text-buretto-accent">
          Position your hands on the keys...
        </p>

        <div className="flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-buretto-secondary flex items-center justify-center bg-buretto-light">
            {count > 0 ? (
              <span className="text-4xl font-bold text-buretto-primary">
                {count}
              </span>
            ) : (
              <span className="text-lg font-bold text-buretto-secondary">
                GO!
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-buretto-accent">
            {selectedDeck.goal
              ? `Goal: ${selectedDeck.goal.beats} beats with ${Math.round(selectedDeck.goal.accuracy * 100)}% accuracy`
              : 'Play the sequence accurately and in time'}
          </p>
          <p className="text-sm text-buretto-accent">
            Follow the metronome and read ahead
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">
          Instructions:
        </h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Music notation will appear on the staff</li>
          <li>• Play the notes on your MIDI keyboard in rhythm</li>
          <li>• Follow the tempo and read ahead</li>
          <li>• Notes turn red when overdue, green when completed correctly</li>
        </ul>
      </div>

      {/* Browser Compatibility Warning */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Note:</strong> MIDI input requires Chrome, Firefox, or Edge.
          Safari is not supported.
        </p>
      </div>
    </div>
  );
};

export default CountdownTimer;