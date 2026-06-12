import { Event } from '../types';
import { toWaPhone } from '../services/supabase';

export const PUBLIC_RSVP_ERROR =
  'יש להפעיל RSVP ציבורי ולהגדיר קישור אירוע לפני שליחת הודעה.';

export const isPublicRsvpEnabled = (event: Pick<Event, 'is_public' | 'public_rsvp_enabled'> | null | undefined) =>
  !!event && (event.public_rsvp_enabled ?? event.is_public);

export const buildPublicRsvpLink = (
  event: Pick<Event, 'public_slug' | 'is_public' | 'public_rsvp_enabled'> | null | undefined
) =>
  event?.public_slug && isPublicRsvpEnabled(event)
    ? `${window.location.origin}/event/${event.public_slug}`
    : null;

export const validatePublicRsvpShare = (event: Event | null | undefined) => {
  if (!event || !isPublicRsvpEnabled(event) || !event.public_slug) {
    return PUBLIC_RSVP_ERROR;
  }

  return null;
};

const formatEventDate = (eventDate: string | null) => {
  if (!eventDate) {
    return 'פרטים בהמשך';
  }

  const date = new Date(eventDate);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const dateText = date.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (!hasTime) {
    return dateText;
  }

  const timeText = date.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${dateText} בשעה ${timeText}`;
};

export const buildPublicRsvpMessage = (guestName: string, event: Event) => {
  const rsvpLink = buildPublicRsvpLink(event);

  if (!rsvpLink) {
    throw new Error(PUBLIC_RSVP_ERROR);
  }

  const eventName = event.event_name || 'האירוע שלנו';
  const venueName = event.venue_name || 'פרטי המקום בהמשך';

  return [
    `היי ${guestName} 👋`,
    '',
    `נשמח לראות אותך ב${eventName}`,
    '',
    `📅 ${formatEventDate(event.event_date)}`,
    `📍 ${venueName}`,
    '',
    'לאישור הגעה:',
    rsvpLink,
    '',
    'תודה ❤️',
  ].join('\n');
};

export const buildPublicRsvpWhatsAppUrl = (phone: string, message: string) =>
  `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(message)}`;

export const buildGuestRsvpMessage = (
  guestName: string,
  event: Pick<Event, 'event_name' | 'event_date' | 'venue_name'> | null | undefined,
  rsvpLink: string
) => {
  const eventName = event?.event_name || 'האירוע שלנו';
  const venueName = event?.venue_name || 'פרטי המקום בהמשך';

  return [
    `היי ${guestName} 👋`,
    '',
    `נשמח לראות אותך ב${eventName}`,
    '',
    `📅 ${formatEventDate(event?.event_date ?? null)}`,
    `📍 ${venueName}`,
    '',
    'לאישור הגעה:',
    rsvpLink,
    '',
    'תודה ❤️',
  ].join('\n');
};

export const buildGuestRsvpWhatsAppUrl = (phone: string, message: string) =>
  `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(message)}`;
