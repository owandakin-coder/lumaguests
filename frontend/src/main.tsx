import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { RsvpPage }          from './pages/RsvpPage.tsx'
import { EventPublicPage }   from './pages/EventPublicPage.tsx'
import './index.css'

const path      = window.location.pathname
const rsvpMatch  = path.match(/^\/rsvp\/([\w-]+)$/)
const eventMatch = path.match(/^\/event\/([\w-]+)$/)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {rsvpMatch  ? <RsvpPage token={rsvpMatch[1]}  /> :
     eventMatch ? <EventPublicPage slug={eventMatch[1]} /> :
     <App />}
  </React.StrictMode>,
)
