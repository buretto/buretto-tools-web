import React, { useState, useMemo } from 'react';
import { Code, Eye, EyeOff, TrendingUp, Target, Info, AlertCircle } from 'lucide-react';

function ReverseSeriesCalculator() {
  const [targetProbability, setTargetProbability] = useState(0.65);
  const [firstToWin, setFirstToWin] = useState(3);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [showCode, setShowCode] = useState(false);

  // Binary search to find the game probability that gives target series probability
  const findGameProbability = (targetSeriesProb, firstToWin, scoreA, scoreB) => {
    const A_needs = firstToWin - scoreA;
    const B_needs = firstToWin - scoreB;
    
    // Handle finished series
    if (scoreA >= firstToWin) return targetSeriesProb === 1.0 ? 0.5 : null;
    if (scoreB >= firstToWin) return targetSeriesProb === 0.0 ? 0.5 : null;
    
    // Calculate series probability for given game probability
    const calculateSeriesProb = (pA) => {
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
    
    // Binary search for the game probability
    let low = 0.001;
    let high = 0.999;
    const tolerance = 0.0001;
    
    for (let i = 0; i < 100; i++) {
      const mid = (low + high) / 2;
      const seriesProb = calculateSeriesProb(mid);
      
      if (Math.abs(seriesProb - targetSeriesProb) < tolerance) {
        return mid;
      }
      
      if (seriesProb < targetSeriesProb) {
        low = mid;
      } else {
        high = mid;
      }
    }
    
    return (low + high) / 2;
  };

  const result = useMemo(() => {
    const gameProb = findGameProbability(targetProbability, firstToWin, scoreA, scoreB);
    
    if (gameProb === null) {
      return { gameProb: null, error: "Target probability impossible for finished series" };
    }
    
    // Verify the result
    const A_needs = firstToWin - scoreA;
    const B_needs = firstToWin - scoreB;
    
    if (A_needs === 0 || B_needs === 0) {
      return { gameProb, error: null, verification: null };
    }
    
    // Calculate actual series probability with found game probability
    const memo = {};
    function winProb(A_needs, B_needs) {
      if (A_needs === 0) return 1.0;
      if (B_needs === 0) return 0.0;
      
      const key = `${A_needs},${B_needs}`;
      if (key in memo) return memo[key];
      
      const result = gameProb * winProb(A_needs - 1, B_needs) + 
                     (1 - gameProb) * winProb(A_needs, B_needs - 1);
      
      memo[key] = result;
      return result;
    }
    
    const verification = winProb(A_needs, B_needs);
    
    return { gameProb, error: null, verification };
  }, [targetProbability, firstToWin, scoreA, scoreB]);

  const isFinished = scoreA >= firstToWin || scoreB >= firstToWin;
  
  const getSeriesName = (firstToWin) => {
    const totalGames = 2 * firstToWin - 1;
    return `Best-of-${totalGames}`;
  };

  const codeExample = `// Reverse Series Probability Calculator
function findGameProbability(targetSeriesProb, firstToWin, scoreA, scoreB) {
  const A_needs = firstToWin - scoreA;
  const B_needs = firstToWin - scoreB;
  
  // Handle finished series
  if (scoreA >= firstToWin) return targetSeriesProb === 1.0 ? 0.5 : null;
  if (scoreB >= firstToWin) return targetSeriesProb === 0.0 ? 0.5 : null;
  
  // Calculate series probability for given game probability
  const calculateSeriesProb = (pA) => {
    const memo = {};
    function winProb(A_needs, B_needs) {
      if (A_needs === 0) return 1.0;
      if (B_needs === 0) return 0.0;
      
      const key = \`\${A_needs},\${B_needs}\`;
      if (key in memo) return memo[key];
      
      const result = pA * winProb(A_needs - 1, B_needs) + 
                     (1 - pA) * winProb(A_needs, B_needs - 1);
      
      memo[key] = result;
      return result;
    }
    
    return winProb(A_needs, B_needs);
  };
  
  // Binary search for the game probability
  let low = 0.001;
  let high = 0.999;
  const tolerance = 0.0001;
  
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const seriesProb = calculateSeriesProb(mid);
    
    if (Math.abs(seriesProb - targetSeriesProb) < tolerance) {
      return mid;
    }
    
    if (seriesProb < targetSeriesProb) {
      low = mid;
    } else {
      high = mid;
    }
  }
  
  return (low + high) / 2;
}

// Current calculation:
// Target Series Probability: ${(targetProbability * 100).toFixed(1)}%
// Series: ${getSeriesName(firstToWin)} (first to ${firstToWin})
// Score: ${scoreA}-${scoreB}
// Result: ${result.gameProb ? (result.gameProb * 100).toFixed(1) + '% game win probability needed' : 'No solution'}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-buretto-primary mb-4">
          Reverse Series Probability Calculator
        </h1>
        <p className="text-lg text-buretto-accent max-w-3xl mx-auto">
          Given a target series win probability and current scores, find the implied game win probability. 
          Uses binary search to solve the inverse problem.
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
              <Target className="h-5 w-5 mr-2" />
              Target Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Series Win Probability
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={targetProbability}
                  onChange={(e) => setTargetProbability(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1%</span>
                  <span className="font-bold text-lg text-buretto-primary">
                    {(targetProbability * 100).toFixed(1)}%
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
              <TrendingUp className="h-5 w-5 mr-2" />
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
              <div className="text-sm text-gray-600">
                Target: {(targetProbability * 100).toFixed(1)}% series win probability
              </div>
              
              {isFinished && (
                <div className="text-xl font-bold text-buretto-secondary mt-4 bg-white rounded-lg p-3">
                  🎉 {scoreA >= firstToWin ? 'Team A' : 'Team B'} Won!
                </div>
              )}
            </div>
          </div>
          
          {result.error ? (
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-xl">
              <h2 className="text-xl font-semibold mb-4 text-red-800 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error
              </h2>
              <p className="text-red-700">{result.error}</p>
            </div>
          ) : (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-buretto-primary">
                Required Game Win Probability
              </h2>
              
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {(result.gameProb * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Team A needs to win each game</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-500 mb-2">
                    {((1 - result.gameProb) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Team B wins each game</div>
                </div>
                
                {/* Visual probability bar */}
                <div className="w-full bg-gray-200 rounded-full h-6 mt-4">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-center"
                    style={{ width: `${result.gameProb * 100}%` }}
                  >
                    {result.gameProb > 0.15 && (
                      <span className="text-white text-xs font-semibold">
                        {(result.gameProb * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                
                {result.verification && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm text-green-800">
                      <strong>Verification:</strong> With {(result.gameProb * 100).toFixed(1)}% game win probability, 
                      the series win probability is {(result.verification * 100).toFixed(1)}%
                      {Math.abs(result.verification - targetProbability) > 0.001 && (
                        <span className="text-orange-600">
                          {' '}(diff: {((result.verification - targetProbability) * 100).toFixed(2)}%)
                        </span>
                      )}
                    </div>
                  </div>
                )}
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
            <strong>Binary Search:</strong> Uses binary search to find the game win probability that produces 
            the target series win probability. Iteratively narrows the search range until convergence.
          </p>
          <p>
            <strong>Inverse Problem:</strong> Given f(x) = target, find x where f is the series probability function. 
            This is the mathematical inverse of the forward calculation.
          </p>
          <p>
            <strong>Applications:</strong> Market analysis (what odds are implied by betting lines), 
            performance requirements (what skill level is needed), and strategic planning.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReverseSeriesCalculator;