import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { RsvpPage }          from './pages/RsvpPage.tsx'
import { EventPublicPage }   from './pages/EventPublicPage.tsx'
import { ResetPasswordPage } from './pages/ResetPasswordPage.tsx'
import { SupabaseAuthProvider } from './hooks/useSupabaseAuth'
import './index.css'

const path      = window.location.pathname
const rsvpMatch  = path.match(/^\/rsvp\/([\w-]+)$/)
const eventMatch = path.match(/^\/event\/([\w-]+)$/)
const isResetPassword = path === '/reset-password'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      {rsvpMatch  ? <RsvpPage token={rsvpMatch[1]}  /> :
       eventMatch ? <EventPublicPage slug={eventMatch[1]} /> :
       isResetPassword ? <ResetPasswordPage /> :
       <App />}
    </SupabaseAuthProvider>
  </React.StrictMode>,
)
