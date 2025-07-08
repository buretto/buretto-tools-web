import React, { useState } from 'react'
import Navigation from './components/Navigation'
import SeriesCalculator from './components/SeriesCalculator'
import Home from './components/Home'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  
  const renderPage = () => {
    switch(currentPage) {
      case 'series-calculator':
        return <SeriesCalculator />
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