import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { eventService } from '../services/supabase';
import { Event } from '../types';

const EVENT_KEY = 'luma_event_name';
const EVENT_DATE_KEY = 'luma_event_date';

type EventContextValue = {
  event: Event | null;
  events: Event[];
  archivedEvents: Event[];
  loading: boolean;
  reload: () => Promise<void>;
  update: (updates: Partial<Event>) => Promise<Event | undefined>;
  createEvent: (name?: string, eventType?: string) => Promise<Event>;
  activateEvent: (eventId: string) => Promise<Event>;
  archiveEvent: (eventId: string) => Promise<Event>;
  deleteEvent: (eventId: string) => Promise<void>;
};

const EventContext = createContext<EventContextValue | null>(null);

function syncLocalStorage(event: Event | null) {
  if (!event) {
    localStorage.removeItem(EVENT_KEY);
    localStorage.removeItem(EVENT_DATE_KEY);
    return;
  }

  localStorage.setItem(EVENT_KEY, event.event_name || '');
  if (event.event_date) {
    localStorage.setItem(EVENT_DATE_KEY, event.event_date.split('T')[0]);
  } else {
    localStorage.removeItem(EVENT_DATE_KEY);
  }
}

export const EventProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useSupabaseAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!auth.user) {
      setEvent(null);
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let allEvents: Event[] = [];
      let listSucceeded = false;

      try {
        allEvents = await eventService.list(auth.user.id);
        listSucceeded = true;
      } catch (error) {
        console.error('Failed to list events:', error);
      }

      // Only attempt getActiveOrCreate when list() succeeded but found no active event.
      // If list() failed (network error), skip — otherwise a new empty event gets created.
      if (listSucceeded && !allEvents.some((item) => !item.archived_at)) {
        try {
          const recovered = await eventService.getActiveOrCreate(auth.user.id);
          if (recovered) {
            allEvents = [
              recovered,
              ...allEvents.filter((item) => item.id !== recovered.id),
            ];
          }
        } catch (error) {
          console.error('Failed to recover active event:', error);
        }
      }

      const activeEvent = allEvents.find((item) => !item.archived_at) || null;
      setEvents(allEvents);
      setEvent(activeEvent);
      syncLocalStorage(activeEvent);
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      void reload();
      return;
    }

    syncLocalStorage(null);
    setEvent(null);
    setEvents([]);
    setLoading(false);
  }, [auth.isAuthenticated, auth.user, reload]);

  const update = useCallback(async (updates: Partial<Event>) => {
    if (!event) return;

    const updated = await eventService.update(event.id, updates);
    setEvent(updated);
    setEvents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

    if (!updated.archived_at) {
      syncLocalStorage(updated);
    }

    return updated;
  }, [event]);

  const createEvent = useCallback(async (name?: string, eventType?: string) => {
    if (!auth.user) {
      throw new Error('לא מחובר');
    }

    const created = await eventService.createNew(auth.user.id, name, eventType);
    await reload();
    return created;
  }, [auth.user, reload]);

  const activateEvent = useCallback(async (eventId: string) => {
    if (!auth.user) {
      throw new Error('לא מחובר');
    }

    const activated = await eventService.activate(auth.user.id, eventId);
    await reload();
    return activated;
  }, [auth.user, reload]);

  const archiveEvent = useCallback(async (eventId: string) => {
    if (!auth.user) {
      throw new Error('לא מחובר');
    }

    const nextActive = await eventService.archive(auth.user.id, eventId);
    await reload();
    return nextActive;
  }, [auth.user, reload]);

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!auth.user) {
      throw new Error('לא מחובר');
    }

    await eventService.delete(auth.user.id, eventId);
    await reload();
  }, [auth.user, reload]);

  const value = useMemo<EventContextValue>(() => ({
    event,
    events,
    archivedEvents: events.filter((item) => !!item.archived_at),
    loading,
    reload,
    update,
    createEvent,
    activateEvent,
    archiveEvent,
    deleteEvent,
  }), [archiveEvent, createEvent, deleteEvent, event, events, loading, reload, update]);

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
};

export function useEvent() {
  const context = useContext(EventContext);

  if (!context) {
    throw new Error('useEvent must be used within EventProvider');
  }

  return context;
}
