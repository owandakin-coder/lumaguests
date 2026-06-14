import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import { RsvpPage }          from './pages/RsvpPage.tsx'
import { EventPublicPage }   from './pages/EventPublicPage.tsx'
import { ResetPasswordPage } from './pages/ResetPasswordPage.tsx'
import { SupabaseAuthProvider } from './hooks/useSupabaseAuth'
import './index.css'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  })
}

const path      = window.location.pathname
const rsvpMatch  = path.match(/^\/rsvp\/([\w-]+)$/)
const eventMatch = path.match(/^\/event\/([\w-]+)$/)
const isResetPassword = path === '/reset-password'

const sp = new URLSearchParams(window.location.search);
const rsvpEventInfo = rsvpMatch ? {
  eventName:    sp.get('en') ?? undefined,
  eventDate:    sp.get('ed') ?? undefined,
  venueName:    sp.get('vn') ?? undefined,
  venueAddress: sp.get('va') ?? undefined,
} : null;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SupabaseAuthProvider>
      {rsvpMatch  ? <RsvpPage token={rsvpMatch[1]} eventName={rsvpEventInfo?.eventName} eventDate={rsvpEventInfo?.eventDate} venueName={rsvpEventInfo?.venueName} venueAddress={rsvpEventInfo?.venueAddress} /> :
       eventMatch ? <EventPublicPage slug={eventMatch[1]} /> :
       isResetPassword ? <ResetPasswordPage /> :
       <App />}
    </SupabaseAuthProvider>
  </React.StrictMode>,
)
