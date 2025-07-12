import React, { useState } from 'react'
import Navigation from './components/Navigation'
import SeriesCalculator from './components/SeriesCalculator.jsx'
import ReverseSeriesCalculator from './components/ReverseSeriesCalculator.jsx'
import RangeSeriesCalculator from './components/RangeSeriesCalculator.jsx'
import RolldownTool from './components/rolldown/RolldownTool.jsx'
import Home from './components/Home'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  
  const renderPage = () => {
    switch(currentPage) {
      case 'series-calculator':
        return <SeriesCalculator />
      case 'reverse-series-calculator':
        return <ReverseSeriesCalculator />
      case 'range-series-calculator':
        return <RangeSeriesCalculator />
      case 'rolldown-tool':
        return <RolldownTool />
      default:
        return <Home onNavigate={setCurrentPage} />
    }
  }

  return (
    <div className={currentPage === 'rolldown-tool' ? 'scroll-snap-container bg-gray-50' : 'min-h-screen bg-gray-50'}>
      {currentPage === 'rolldown-tool' ? (
        <>
          {/* Navigation Zone - scrolls away */}
          <div className="scroll-snap-section bg-gray-50 flex flex-col">
            <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-600">
                <p className="text-lg mb-2">Scroll down for fullscreen tool</p>
                <div className="animate-bounce">↓</div>
              </div>
            </div>
          </div>
          
          {/* Tool Zone - snaps to fullscreen */}
          <div className="tool-fullscreen">
            {renderPage()}
          </div>
        </>
      ) : (
        <>
          <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
          {renderPage()}
        </>
      )}
    </div>
  )
}

export default App