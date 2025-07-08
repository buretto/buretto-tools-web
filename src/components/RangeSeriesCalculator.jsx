import React, { useState, useMemo } from 'react';
import { Code, Eye, EyeOff, BarChart3, TrendingUp, Info, AlertTriangle } from 'lucide-react';

function RangeSeriesCalculator() {
  const [pALow, setPALow] = useState(0.45);
  const [pAHigh, setPAHigh] = useState(0.65);
  const [firstToWin, setFirstToWin] = useState(3);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [confidenceLevel, setConfidenceLevel] = useState(0.90);
  const [showCode, setShowCode] = useState(false);
  const [useRandomModel, setUseRandomModel] = useState(false);
  const [distributionType, setDistributionType] = useState('uniform');

  // Calculate series win probability for a given game probability
  const calculateSeriesProb = (pA, firstToWin, scoreA, scoreB) => {
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

  // Seeded random number generator for consistent results
  const seededRandom = (seed) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Calculate range statistics
  const calculateRange = (pALow, pAHigh, firstToWin, scoreA, scoreB, useRandomModel, distributionType, confidenceLevel) => {
    const probLow = calculateSeriesProb(pALow, firstToWin, scoreA, scoreB);
    const probHigh = calculateSeriesProb(pAHigh, firstToWin, scoreA, scoreB);
    
    if (!useRandomModel) {
      // Simple min/max for fixed-but-unknown probability
      return {
        min: probLow,
        max: probHigh,
        mean: (probLow + probHigh) / 2,
        range: probHigh - probLow,
        confidenceLow: null,
        confidenceHigh: null,
        confidenceWidth: null,
        probabilities: null
      };
    }
    
    // Monte Carlo simulation for random game probabilities
    const samples = 1000;
    const probabilities = [];
    
    // Create deterministic seed from input parameters
    const seedString = `${pALow}-${pAHigh}-${firstToWin}-${scoreA}-${scoreB}-${distributionType}-${confidenceLevel}`;
    let seedHash = 0;
    for (let i = 0; i < seedString.length; i++) {
      const char = seedString.charCodeAt(i);
      seedHash = ((seedHash << 5) - seedHash) + char;
      seedHash = seedHash & seedHash; // Convert to 32-bit integer
    }
    
    for (let i = 0; i < samples; i++) {
      let pA;
      
      // Use seeded random with unique seed for each sample
      const sampleSeed = seedHash + i;
      const rand1 = seededRandom(sampleSeed);
      const rand2 = seededRandom(sampleSeed + 1000000);
      
      if (distributionType === 'uniform') {
        // Uniform distribution between bounds
        pA = pALow + rand1 * (pAHigh - pALow);
      } else if (distributionType === 'normal') {
        // Normal distribution with bounds as ±2 standard deviations
        const mean = (pALow + pAHigh) / 2;
        const stdDev = (pAHigh - pALow) / 4;
        // Box-Muller transform for normal distribution
        const normalSample = Math.sqrt(-2 * Math.log(rand1)) * Math.cos(2 * Math.PI * rand2);
        pA = Math.max(0.001, Math.min(0.999, mean + normalSample * stdDev));
      } else if (distributionType === 'beta') {
        // Beta distribution with mode at center of range
        const alpha = 2;
        const beta = 2;
        // Simple beta approximation using seeded random
        let betaSample = 0;
        for (let j = 0; j < alpha; j++) {
          betaSample += seededRandom(sampleSeed + j + 2000000);
        }
        for (let j = 0; j < beta; j++) {
          betaSample *= seededRandom(sampleSeed + j + 3000000);
        }
        betaSample = betaSample / (alpha + beta - 1);
        pA = pALow + betaSample * (pAHigh - pALow);
      }
      
      const prob = calculateSeriesProb(pA, firstToWin, scoreA, scoreB);
      probabilities.push(prob);
    }
    
    // Sort probabilities to find percentiles
    probabilities.sort((a, b) => a - b);
    
    const alpha = 1 - confidenceLevel;
    const lowerIndex = Math.floor(probabilities.length * (alpha / 2));
    const upperIndex = Math.floor(probabilities.length * (1 - alpha / 2));
    
    const confidenceLow = probabilities[lowerIndex];
    const confidenceHigh = probabilities[Math.min(upperIndex, probabilities.length - 1)];
    
    return {
      min: probLow,
      max: probHigh,
      mean: (probLow + probHigh) / 2, // Theoretical mean for symmetric distributions
      range: probHigh - probLow,
      confidenceLow,
      confidenceHigh,
      confidenceWidth: confidenceHigh - confidenceLow,
      probabilities
    };
  };

  const result = useMemo(() => 
    calculateRange(pALow, pAHigh, firstToWin, scoreA, scoreB, useRandomModel, distributionType, confidenceLevel), 
    [pALow, pAHigh, firstToWin, scoreA, scoreB, useRandomModel, distributionType, confidenceLevel]
  );

  const isFinished = scoreA >= firstToWin || scoreB >= firstToWin;
  const hasValidRange = pALow < pAHigh;
  
  const getSeriesName = (firstToWin) => {
    const totalGames = 2 * firstToWin - 1;
    return `Best-of-${totalGames}`;
  };

  const codeExample = `// Series Probability Range Calculator with Deterministic Results
function calculateRange(pALow, pAHigh, firstToWin, scoreA, scoreB, useRandomModel, distributionType, confidenceLevel) {
  // Seeded random number generator for consistent results
  const seededRandom = (seed) => {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // ... calculateSeriesProb function same as before ...

  const probLow = calculateSeriesProb(pALow, firstToWin, scoreA, scoreB);
  const probHigh = calculateSeriesProb(pAHigh, firstToWin, scoreA, scoreB);
  
  if (!useRandomModel) {
    // Fixed-but-unknown probability: just return min/max range
    return {
      min: probLow,
      max: probHigh,
      mean: (probLow + probHigh) / 2,
      range: probHigh - probLow
    };
  }
  
  // Random game probability model: Deterministic Monte Carlo simulation
  const samples = 1000;
  const probabilities = [];
  
  // Create deterministic seed from input parameters
  const seedString = \`\${pALow}-\${pAHigh}-\${firstToWin}-\${scoreA}-\${scoreB}-\${distributionType}-\${confidenceLevel}\`;
  let seedHash = 0;
  for (let i = 0; i < seedString.length; i++) {
    const char = seedString.charCodeAt(i);
    seedHash = ((seedHash << 5) - seedHash) + char;
    seedHash = seedHash & seedHash; // Convert to 32-bit integer
  }
  
  for (let i = 0; i < samples; i++) {
    let pA;
    
    // Use seeded random with unique seed for each sample
    const sampleSeed = seedHash + i;
    const rand1 = seededRandom(sampleSeed);
    const rand2 = seededRandom(sampleSeed + 1000000);
    
    if (distributionType === 'uniform') {
      pA = pALow + rand1 * (pAHigh - pALow);
    } else if (distributionType === 'normal') {
      // Normal distribution with bounds as ±2σ
      const mean = (pALow + pAHigh) / 2;
      const stdDev = (pAHigh - pALow) / 4;
      // Box-Muller transform with seeded random
      const normalSample = Math.sqrt(-2 * Math.log(rand1)) * Math.cos(2 * Math.PI * rand2);
      pA = Math.max(0.001, Math.min(0.999, mean + normalSample * stdDev));
    }
    // ... other distributions ...
    
    const prob = calculateSeriesProb(pA, firstToWin, scoreA, scoreB);
    probabilities.push(prob);
  }
  
  probabilities.sort((a, b) => a - b);
  
  // Calculate confidence interval
  const alpha = 1 - confidenceLevel;
  const lowerIndex = Math.floor(probabilities.length * (alpha / 2));
  const upperIndex = Math.floor(probabilities.length * (1 - alpha / 2));
  
  return {
    min: probLow,
    max: probHigh,
    mean: probabilities.reduce((sum, p) => sum + p, 0) / probabilities.length,
    confidenceLow: probabilities[lowerIndex],
    confidenceHigh: probabilities[upperIndex]
  };
}

// Current calculation:
// Game Probability Range: ${(pALow * 100).toFixed(1)}% - ${(pAHigh * 100).toFixed(1)}%
// Model: ${useRandomModel ? 'Deterministic random (' + distributionType + ')' : 'Fixed but unknown probability'}
// Series: ${getSeriesName(firstToWin)} (first to ${firstToWin})
// Score: ${scoreA}-${scoreB}
// Result: ${(result.min * 100).toFixed(1)}% - ${(result.max * 100).toFixed(1)}% series win probability`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-buretto-primary mb-4">
          Series Probability Range Calculator
        </h1>
        <p className="text-lg text-buretto-accent max-w-3xl mx-auto">
          Calculate series win probability ranges using upper and lower bounds for game win rates. 
          Handles uncertainty in team strength assessment with confidence intervals.
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

      {/* Invalid Range Warning */}
      {!hasValidRange && (
        <div className="mb-6 bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl">
          <div className="flex items-center text-yellow-800">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span className="font-medium">Invalid Range:</span>
            <span className="ml-2">Lower bound must be less than upper bound</span>
          </div>
        </div>
      )}
      
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-buretto-primary flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Game Probability Range
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lower Bound (Team A Win Probability)
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={pALow}
                  onChange={(e) => setPALow(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1%</span>
                  <span className="font-bold text-lg text-red-600">
                    {(pALow * 100).toFixed(1)}%
                  </span>
                  <span>99%</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upper Bound (Team A Win Probability)
                </label>
                <input
                  type="range"
                  min="0.01"
                  max="0.99"
                  step="0.01"
                  value={pAHigh}
                  onChange={(e) => setPAHigh(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1%</span>
                  <span className="font-bold text-lg text-green-600">
                    {(pAHigh * 100).toFixed(1)}%
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
              
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="randomModel"
                    checked={useRandomModel}
                    onChange={(e) => setUseRandomModel(e.target.checked)}
                    className="w-4 h-4 text-buretto-primary border-gray-300 rounded focus:ring-buretto-primary"
                  />
                  <label htmlFor="randomModel" className="text-sm font-medium text-gray-700">
                    Advanced: Game probabilities vary randomly within range
                  </label>
                </div>
                
                <div className="text-xs text-gray-600 leading-relaxed mb-4">
                  {useRandomModel ? (
                    <>
                      <strong>Random Model:</strong> Each game's win probability is randomly drawn from a distribution 
                      within your specified range. Use this when team performance varies game-to-game due to conditions, 
                      fatigue, or other factors.
                    </>
                  ) : (
                    <>
                      <strong>Default:</strong> Team A has one true win probability somewhere within your range, 
                      but you don't know exactly where. This is the standard approach for basic "what-if" analysis.
                    </>
                  )}
                </div>
                
                <div className={`space-y-3 transition-opacity duration-200 ${useRandomModel ? 'opacity-100' : 'opacity-50'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence Level {!useRandomModel && <span className="text-gray-400">(Advanced only)</span>}
                    </label>
                    <select
                      value={confidenceLevel}
                      onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                      disabled={!useRandomModel}
                    >
                      <option value={0.68}>68%</option>
                      <option value={0.80}>80%</option>
                      <option value={0.90}>90%</option>
                      <option value={0.95}>95%</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Probability Distribution {!useRandomModel && <span className="text-gray-400">(Advanced only)</span>}
                    </label>
                    <select
                      value={distributionType}
                      onChange={(e) => setDistributionType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white disabled:bg-gray-100"
                      disabled={!useRandomModel}
                    >
                      <option value="uniform">Uniform</option>
                      <option value="normal">Normal</option>
                      <option value="beta">Beta</option>
                    </select>
                  </div>
                </div>
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
                Game probability: {(pALow * 100).toFixed(1)}% - {(pAHigh * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">
                {useRandomModel ? `Random (${distributionType})` : 'Fixed but unknown'}
              </div>
              
              {isFinished && (
                <div className="text-xl font-bold text-buretto-secondary mt-4 bg-white rounded-lg p-3">
                  🎉 {scoreA >= firstToWin ? 'Team A' : 'Team B'} Won!
                </div>
              )}
            </div>
          </div>
          
          {hasValidRange && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold mb-4 text-buretto-primary">
                Series Win Probability Range
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-500 mb-1">
                      {(result.min * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Minimum {useRandomModel ? '(worst case scenario)' : '(lower bound)'}</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {(result.max * 100).toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Maximum {useRandomModel ? '(best case scenario)' : '(upper bound)'}</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-1">
                    {(result.mean * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">{useRandomModel ? 'Expected probability' : 'Midpoint'}</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    ±{(result.range * 50).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Range width</div>
                </div>
                
                {/* Visual range bar */}
                <div className="relative w-full bg-gray-200 rounded-full h-8 mt-4">
                  {useRandomModel ? (
                    <div 
                      className="absolute bg-gradient-to-r from-red-400 to-green-400 h-8 rounded-full"
                      style={{ 
                        left: `${result.min * 100}%`, 
                        width: `${(result.max - result.min) * 100}%` 
                      }}
                    >
                    </div>
                  ) : (
                    <div 
                      className="absolute bg-blue-500 h-8 rounded-full"
                      style={{ 
                        left: `${result.min * 100}%`, 
                        width: `${(result.max - result.min) * 100}%` 
                      }}
                    >
                    </div>
                  )}
                  <div 
                    className="absolute w-1 bg-blue-800 h-8"
                    style={{ left: `${result.mean * 100}%` }}
                  >
                  </div>
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}
          
          {hasValidRange && useRandomModel && result.confidenceLow !== null && (
            <div className="bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
              <h2 className="text-xl font-semibold mb-4 text-buretto-primary flex items-center">
                <Info className="h-5 w-5 mr-2" />
                {(confidenceLevel * 100).toFixed(0)}% Confidence Interval
              </h2>
              
              <div className="space-y-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {(result.confidenceLow * 100).toFixed(1)}% - {(result.confidenceHigh * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">
                    {(confidenceLevel * 100).toFixed(0)}% of random scenarios fall within this range
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-700">
                    ±{(result.confidenceWidth * 50).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence interval width</div>
                </div>
                
                <div className="text-xs text-gray-600 bg-white p-3 rounded border">
                  <strong>Note:</strong> This interval assumes game probabilities are randomly distributed 
                  ({distributionType}) within your specified range. It represents the variability you'd expect 
                  if the series were repeated many times with varying conditions.
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
          Two Different Models
        </h3>
        <div className="text-sm text-gray-700 space-y-3">
          <div>
            <p className="font-medium text-gray-800 mb-1">Fixed but Unknown Probability (Default):</p>
            <p>
              Team A has one true win probability somewhere in your range, but you don't know exactly where. 
              Shows simple min/max bounds for "what if the true probability is X" analysis. This is the standard approach.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-800 mb-1">Random Game Probabilities (Optional Advanced Feature):</p>
            <p>
              Each game's probability varies randomly within your range due to conditions, form, fatigue, etc. 
              Uses Monte Carlo simulation with 1000+ samples to generate confidence intervals. Only enable this 
              if you specifically want to model game-to-game variability.
            </p>
          </div>
          <div>
            <p className="font-medium text-gray-800 mb-1">Applications:</p>
            <p>
              Risk assessment, scenario planning, sensitivity analysis, betting strategy, and understanding 
              how uncertainty in team assessment affects series predictions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RangeSeriesCalculator;