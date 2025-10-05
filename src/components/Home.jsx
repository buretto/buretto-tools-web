import React from 'react'
import { Calculator, TrendingUp, BarChart3, Code, Piano, Music, Gamepad2 } from 'lucide-react'

function Home({ onNavigate }) {
  const categories = [
    {
      name: 'Series Probability',
      icon: Calculator,
      tools: [
        {
          name: 'Series Calculator',
          description: 'Calculate win probabilities for best-of-N series from any score state.',
          icon: Calculator,
          action: () => onNavigate('series-calculator')
        },
        {
          name: 'Reverse Calculator',
          description: 'Find implied game win probability from target series win probability.',
          icon: TrendingUp,
          action: () => onNavigate('reverse-series-calculator')
        },
        {
          name: 'Range Calculator',
          description: 'Calculate series win probability ranges using win rate bounds.',
          icon: BarChart3,
          action: () => onNavigate('range-series-calculator')
        }
      ]
    },
    {
      name: 'Piano',
      icon: Piano,
      tools: [
        {
          name: 'Flashcards',
          description: 'Practice note reading with real-time MIDI input and progressive difficulty.',
          icon: Piano,
          action: () => onNavigate('piano-practice')
        },
        {
          name: 'Sight Reading',
          description: 'Advanced sight reading with timing analysis and performance metrics.',
          icon: Music,
          action: () => onNavigate('piano-sight-reading')
        },
        {
          name: 'Song Practice',
          description: 'Practice specific songs with difficulty variants and BPM tracking.',
          icon: Music,
          action: () => onNavigate('song-practice')
        }
      ]
    },
    {
      name: 'Gaming',
      icon: Gamepad2,
      tools: [
        {
          name: 'TFT Rolldown',
          description: 'Calculate optimal gold usage and rolldown strategies for Teamfight Tactics.',
          icon: Gamepad2,
          action: () => onNavigate('rolldown-tool')
        }
      ]
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-buretto-primary mb-3">
          Buretto Tools
        </h1>
        <p className="text-lg text-buretto-accent max-w-3xl mx-auto">
          Simple tools for exploration and learning.
        </p>
      </div>

      <div className="space-y-8">
        {categories.map((category) => (
          <div key={category.name} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* Category Header */}
            <div className="flex items-center mb-4">
              <div className="p-2 bg-buretto-secondary/10 rounded-lg">
                <category.icon className="h-6 w-6 text-buretto-secondary" />
              </div>
              <h2 className="text-2xl font-bold text-buretto-primary ml-3">
                {category.name}
              </h2>
            </div>

            {/* Tools Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.tools.map((tool) => (
                <div
                  key={tool.name}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all duration-200 border border-gray-200"
                >
                  <div className="flex items-center mb-2">
                    <tool.icon className="h-5 w-5 text-buretto-secondary mr-2" />
                    <h3 className="text-base font-semibold text-buretto-primary">
                      {tool.name}
                    </h3>
                  </div>

                  <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                    {tool.description}
                  </p>

                  <button
                    onClick={tool.action}
                    className="w-full bg-buretto-primary text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
                  >
                    Launch
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <Code className="h-10 w-10 text-buretto-secondary mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-buretto-primary mb-2">
            Open Source
          </h3>
          <p className="text-gray-600 mb-3 text-sm">
            All tools include optional code viewing so you can see how calculations work.
          </p>
          <a
            href="https://github.com/buretto/buretto-tools-web"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-buretto-secondary hover:text-yellow-600 font-medium text-sm"
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