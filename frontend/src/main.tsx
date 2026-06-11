import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { RsvpPage } from './pages/RsvpPage.tsx'
import './index.css'

const rsvpMatch = window.location.pathname.match(/^\/rsvp\/([\w-]+)$/)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {rsvpMatch ? <RsvpPage token={rsvpMatch[1]} /> : <App />}
  </React.StrictMode>,
)
