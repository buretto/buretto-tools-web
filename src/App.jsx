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
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      {renderPage()}
    </div>
  )
}

export default App