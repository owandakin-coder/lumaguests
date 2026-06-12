import { useState, useEffect, useCallback } from 'react';
import { useSupabaseAuth } from './useSupabaseAuth';
import { eventService } from '../services/supabase';
import { Event } from '../types';

export function useEvent() {
  const auth = useSupabaseAuth();
  const [event, setEvent]     = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.user) return;
    try {
      setLoading(true);
      const data = await eventService.getOrCreate(auth.user.id);
      setEvent(data);
      // Keep localStorage in sync for components still reading it
      localStorage.setItem('luma_event_name', data.event_name || '');
      if (data.event_date) {
        localStorage.setItem('luma_event_date', data.event_date.split('T')[0]);
      } else {
        localStorage.removeItem('luma_event_date');
      }
    } catch {
      // silent — fall back to whatever is in localStorage
    } finally {
      setLoading(false);
    }
  }, [auth.user?.id]);

  useEffect(() => {
    if (auth.isAuthenticated && auth.user) load();
    else setLoading(false);
  }, [auth.isAuthenticated, auth.user?.id]);

  const update = useCallback(async (updates: Partial<Event>) => {
    if (!event) return;
    const updated = await eventService.update(event.id, updates);
    setEvent(updated);
    // Sync localStorage
    if (updates.event_name !== undefined)
      localStorage.setItem('luma_event_name', updates.event_name || '');
    if (updates.event_date !== undefined) {
      if (updates.event_date)
        localStorage.setItem('luma_event_date', updates.event_date.split('T')[0]);
      else
        localStorage.removeItem('luma_event_date');
    }
    return updated;
  }, [event]);

  return { event, loading, reload: load, update };
}
