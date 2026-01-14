import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import Kiosk from './Kiosk.jsx'
import Dashboard from './Dashboard.jsx'
import Stats from './Stats.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/kiosk" element={<Kiosk />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/stats" element={<Stats />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
