import React from 'react'

function BurettoLogo() {
  return (
    <div className="flex items-center space-x-3">
      {/* Buretto Icon - Epic Games style */}
      <div className="relative">
        <div 
          className="w-8 h-8 bg-buretto-primary transform rotate-180"
          style={{
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)'
          }}
        >
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-4 h-px bg-white transform rotate-12"></div>
          </div>
        </div>
      </div>
      
      <div>
        <span className="text-xl font-bold text-buretto-primary">Buretto</span>
        <span className="text-buretto-accent ml-2 text-sm">Tools</span>
      </div>
    </div>
  )
}

function Navigation({ currentPage, onNavigate }) {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <button onClick={() => onNavigate('home')}>
            <BurettoLogo />
          </button>
          
          <div className="flex space-x-6">
            <button 
              onClick={() => onNavigate('home')}
              className={`${currentPage === 'home' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Home
            </button>
            <button 
              onClick={() => onNavigate('series-calculator')}
              className={`${currentPage === 'series-calculator' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Series Calculator
            </button>
            <button 
              onClick={() => onNavigate('reverse-series-calculator')}
              className={`${currentPage === 'reverse-series-calculator' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Reverse Calculator
            </button>
            <button 
              onClick={() => onNavigate('range-series-calculator')}
              className={`${currentPage === 'range-series-calculator' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Range Calculator
            </button>
            <button
              onClick={() => onNavigate('rolldown-tool')}
              className={`${currentPage === 'rolldown-tool' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              TFT Rolldown
            </button>
            <button
              onClick={() => onNavigate('piano-practice')}
              className={`${currentPage === 'piano-practice' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Piano Practice
            </button>
            <button
              onClick={() => onNavigate('piano-sight-reading')}
              className={`${currentPage === 'piano-sight-reading' ? 'text-buretto-primary font-medium' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Sight Reading
            </button>
            <a
              href="https://www.buretto.com"
              className="text-buretto-secondary font-medium hover:text-yellow-600"
            >
              ← Main Site
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation