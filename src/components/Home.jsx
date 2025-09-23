import React from 'react'
import { Calculator, TrendingUp, BarChart3, Code, Piano, Music } from 'lucide-react'

function Home({ onNavigate }) {
  const tools = [
    {
      name: 'Series Probability Calculator',
      description: 'Calculate win probabilities for best-of-N series from any score state.',
      icon: Calculator,
      action: () => onNavigate('series-calculator'),
      status: 'available',
      features: ['Any series length', 'Partial state support', 'Real-time updates', 'Code view toggle']
    },
    {
      name: 'Reverse Series Probability Calculator',
      description: 'Given a target series win probability and current scores, find the implied game win probability.',
      icon: Calculator,
      action: () => onNavigate('reverse-series-calculator'),
      status: 'available',
      features: ['Works from any series state', 'Binary search algorithm', 'Verification included', 'Handles edge cases']
    },
    {
      name: 'Series Probability Range Calculator',
      description: 'Calculate series win probability ranges using upper and lower bounds for game win rates.',
      icon: Calculator,
      action: () => onNavigate('range-series-calculator'),
      status: 'available',
      features: ['Uncertainty modeling', 'Two probability models', 'Monte Carlo simulation', 'Confidence intervals']
    },
    {
      name: 'Piano Practice Flashcards',
      description: 'Practice note reading with real-time MIDI input. Multiple scales, practice types, and difficulty levels.',
      icon: Piano,
      action: () => onNavigate('piano-practice'),
      status: 'available',
      features: ['MIDI keyboard input', 'Multiple scales & clefs', 'Timed challenges', 'Progressive difficulty']
    },
    {
      name: 'Piano Sight Reading',
      description: 'Advanced sight reading practice with real-time timing analysis, musical sequences, and performance metrics.',
      icon: Music,
      action: () => onNavigate('piano-sight-reading'),
      status: 'available',
      features: ['Musical sequences', 'Timing drift analysis', 'Performance metrics', 'Detailed feedback']
    }
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-buretto-primary mb-4">
          Buretto Tools
        </h1>
        <p className="text-xl text-buretto-accent max-w-3xl mx-auto mb-4">
          Simple tools for exploration and learning.
        </p>
        
        <div className="max-w-2xl mx-auto">
          <button 
            className="text-sm text-gray-500 hover:text-buretto-secondary transition-colors cursor-pointer flex items-center mx-auto"
            onClick={(e) => {
              const content = e.target.nextElementSibling;
              content.classList.toggle('hidden');
              e.target.textContent = content.classList.contains('hidden') 
                ? 'Learn about these tools ↓' 
                : 'Learn about these tools ↑';
            }}
          >
            Learn about these tools ↓
          </button>
          
          <div className="hidden mt-3 p-4 bg-gray-50 rounded-lg text-sm text-gray-700 leading-relaxed">
            These tools help visualize how small differences in game-by-game confidence impact series outcomes. 
            Intended for exploring and comparing instincts and intuition.
            What assumptions and simplifications do these models make? Always consider what's being simplified in any estimate.
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tools.map((tool) => (
          <div 
            key={tool.name}
            className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-buretto-secondary/10 rounded-lg">
                  <tool.icon className="h-6 w-6 text-buretto-secondary" />
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-buretto-primary">
                    {tool.name}
                  </h3>
                  {tool.status === 'available' && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Available
                    </span>
                  )}
                </div>
              </div>
              
              <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                {tool.description}
              </p>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  {tool.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center">
                      <div className="w-1 h-1 bg-buretto-secondary rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <button 
                onClick={tool.action}
                className="w-full bg-buretto-primary text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Launch Tool
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <Code className="h-12 w-12 text-buretto-secondary mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-buretto-primary mb-2">
            Open Source
          </h3>
          <p className="text-gray-600 mb-4">
            All tools include optional code viewing so you can see how calculations work.
          </p>
          <a 
            href="https://github.com/buretto/buretto-tools-web" 
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-buretto-secondary hover:text-yellow-600 font-medium"
          >
            <Code className="h-4 w-4 mr-1" />
            View Source Code
          </a>
        </div>
      </div>
    </div>
  )
}

export default Home