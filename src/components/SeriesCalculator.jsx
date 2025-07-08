import React, { useState, useMemo } from 'react';
import { Code, Eye, EyeOff, Calculator, BarChart3, TrendingUp, Info } from 'lucide-react';

function SeriesCalculator() {
  const [pA, setPA] = useState(0.55);
  const [firstToWin, setFirstToWin] = useState(3);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [showCode, setShowCode] = useState(false);

  // Calculate series win probability from current state
  const calculateProbability = (pA, firstToWin, scoreA, scoreB) => {
    const A_needs = firstToWin - scoreA;
    const B_needs = firstToWin - scoreB;
    
    // Handle finished series
    if (scoreA >= firstToWin) return 1.0;
    if (scoreB >= firstToWin) return 0.0;
    
    // Recursive calculation with memoization
    const memo = {};
    function winProb(A_needs, B_needs) {
      if (A_needs === 0) return 1.0;
      if (B_needs === 0) return 0.0;
      
      const key = `${A_needs},${B_needs}`;
      if (key in memo) return memo[key];
      
      const result = pA * winProb(A_needs - 1, B_needs) + 
                     (1 - pA) * winProb(A_needs, B_needs - 1);
      
      memo[key] = result;
      return result;
    }
    
    return winProb(A_needs, B_needs);
  };

  const probability = useMemo(() => 
    calculateProbability(pA, firstToWin, scoreA, scoreB), 
    [pA, firstToWin, scoreA, scoreB]
  );

  const isFinished = scoreA >= firstToWin || scoreB >= firstToWin;
  
  const getSeriesName = (firstToWin) => {
    const totalGames = 2 * firstToWin - 1;
    return `Best-of-${totalGames}`;
  };

  const getSwingAnalysis = () => {
    if (isFinished) return null;
    
    const probIfAWins = scoreA + 1 >= firstToWin ? 1.0 : 
      calculateProbability(pA, firstToWin, scoreA + 1, scoreB);
    const probIfBWins = scoreB + 1 >= firstToWin ? 0.0 : 
      calculateProbability(pA, firstToWin, scoreA, scoreB + 1);
    
    return {
      ifAWins: probIfAWins,
      ifBWins: probIfBWins,
      swingA: probIfAWins - probability,
      swingB: probIfBWins - probability
    };
  };

  const swing = getSwingAnalysis();

  const codeExample = `// Series Win Probability Calculator
function calculateProbability(pA, firstToWin, scoreA, scoreB) {
  const A_needs = firstToWin - scoreA;
  const B_needs = firstToWin - scoreB;
  
  // Handle finished series
  if (scoreA >= firstToWin) return 1.0;
  if (scoreB >= firstToWin) return 0.0;
  
  // Recursive calculation with memoization
  const memo = {};
  function winProb(A_needs, B_needs) {
    if (A_needs === 0) return 1.0;  // Team A won
    if (B_needs === 0) return 0.0;  // Team B won
    
    const key = \`\${A_needs},\${B_needs}\`;
    if (key in memo) return memo[key];
    
    // P(A wins) = P(A wins next) * P(A wins from new state) + 
    //             P(B wins next) * P(A wins from new state)
    const result = pA * winProb(A_needs - 1, B_needs) + 
                   (1 - pA) * winProb(A_needs, B_needs - 1);
    
    memo[key] = result;
    return result;
  }
  
  return winProb(A_needs, B_needs);
}

// Current calculation:
// pA = ${pA}
// Series: ${getSeriesName(firstToWin)} (first to ${firstToWin})
// Score: ${scoreA}-${scoreB}
// Result: ${(probability * 100).toFixed(1)}% chance Team A wins`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-buretto-primary mb-4">
          Series Probability Calculator
        </h1>
        <p className="text-lg text-buretto-accent max-w-3xl mx-auto">
          Calculate win probabilities for best-of-N series from any score state. 
          Uses dynamic programming to compute exact probabilities for sports analytics and betting.
        </p>
      </div>

      {/* Code Toggle */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={() => setShowCode(!showCode)}
          className="flex items-center space-x-2 px-4 py-2 bg-buretto-primary text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          {showCode ? <EyeOff className="h-4 w-4" /> : <Code className="h-4 w-4" />}
          <span>{showCode ? 'Hide' : 'Show'} Code</span>
        </button>
      </div>

      {/* Code View */}
      {showCode && (
        <div className="mb-8 bg-gray-900 text-green-400 p-6 rounded-lg overflow-x-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">{codeExample}</pre>
        </div>
      )}
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-buretto-primary flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team A Win Probability (per game)
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={pA}
                  onChange={(e) => setPA(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1%</span>
                  <span className="font-bold text-lg text-buretto-primary">
                    {(pA * 100).toFixed(1)}%
                  </span>
                  <span>99%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Series Type
                </label>
                <select
                  value={firstToWin}
                  onChange={(e) => setFirstToWin(parseInt(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                >
                  <option value={2}>Best-of-3 (first to 2)</option>
                  <option value={3}>Best-of-5 (first to 3)</option>
                  <option value={4}>Best-of-7 (first to 4)</option>
                  <option value={5}>Best-of-9 (first to 5)</option>
                  <option value={6}>Best-of-11 (first to 6)</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-buretto-primary flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Current Score
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team A Score
                </label>
                <input
                  type="number"
                  min="0"
                  max={firstToWin}
                  value={scoreA}
                  onChange={(e) => setScoreA(Math.max(0, Math.min(firstToWin, parseInt(e.target.value) || 0)))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-center text-xl font-bold"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team B Score
                </label>
                <input
                  type="number"
                  min="0"
                  max={firstToWin}
                  value={scoreB}
                  onChange={(e) => setScoreB(Math.max(0, Math.min(firstToWin, parseInt(e.target.value) || 0)))}
                  className="w-full p-3 border border-gray-300 rounded-lg text-center text-xl font-bold"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Results */}
        <div className="space-y-6">
          <div className="bg-buretto-secondary/5 p-6 rounded-xl border-2 border-buretto-secondary/20">
            <h2 className="text-xl font-semibold mb-4 text-buretto-primary flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Current Situation
            </h2>
            
            <div className="text-center space-y-3">
              <div className="text-5xl font-bold text-buretto-primary">
                {scoreA} - {scoreB}
              </div>
              <div className="text-sm text-gray-600">
                {getSeriesName(firstToWin)} • First to {firstToWin}
              </div>
              
              {isFinished && (
                <div className="text-xl font-bold text-buretto-secondary mt-4 bg-white rounded-lg p-3">
                  🎉 {scoreA >= firstToWin ? 'Team A' : 'Team B'} Won!
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-buretto-primary">
              Win Probability
            </h2>
            
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {(probability * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Team A wins series</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 mb-2">
                  {((1 - probability) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Team B wins series</div>
              </div>
              
              {/* Visual probability bar */}
              <div className="w-full bg-gray-200 rounded-full h-6 mt-4">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
                  style={{ width: `${probability * 100}%` }}
                >
                  {probability > 0.15 && (
                    <span className="text-white text-xs font-semibold">
                      {(probability * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {swing && !isFinished && (
            <div className="bg-yellow-50 p-6 rounded-xl border-2 border-yellow-200">
              <h2 className="text-xl font-semibold mb-4 text-buretto-primary flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Next Game Impact
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium">If Team A wins next game:</span>
                  <div className="text-right">
                    <span className="font-bold text-blue-600 text-lg">
                      {(swing.ifAWins * 100).toFixed(1)}%
                    </span>
                    <span className="text-green-600 ml-2 text-sm">
                      (+{(swing.swingA * 100).toFixed(1)})
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                  <span className="text-sm font-medium">If Team B wins next game:</span>
                  <div className="text-right">
                    <span className="font-bold text-red-500 text-lg">
                      {(swing.ifBWins * 100).toFixed(1)}%
                    </span>
                    <span className="text-red-600 ml-2 text-sm">
                      ({(swing.swingB * 100).toFixed(1)})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="mt-12 p-6 bg-gray-100 rounded-xl">
        <h3 className="font-semibold text-buretto-primary mb-3 flex items-center">
          <Info className="h-5 w-5 mr-2" />
          How It Works
        </h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>Dynamic Programming:</strong> Uses recursive calculation with memoization to compute exact probabilities 
            for any series state in O(n²) time complexity.
          </p>
          <p>
            <strong>Mathematical Foundation:</strong> P(A wins | current state) = P(A wins next) × P(A wins | A wins next) + 
            P(B wins next) × P(A wins | B wins next)
          </p>
          <p>
            <strong>Applications:</strong> Sports analytics, betting strategy, tournament prediction, and any competitive scenario 
            with independent game outcomes.
          </p>
        </div>
      </div>
    </div>
  );
}

export default SeriesCalculator;