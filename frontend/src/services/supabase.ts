import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

type EventRecord = import('../types').Event;
type PublicEventRecord = import('../types').PublicEventData;
type GuestRecord = import('../types').Guest;
type RsvpPublicGuestRecord = import('../types').RsvpPublicGuest;

function buildDefaultSlug() {
  return `event-${Math.random().toString(36).substring(2, 9)}`;
}

export const authService = {
  signUp: async (email: string, password: string, name?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || '' },
      },
    });
    if (error) throw error;
    return data;
  },

  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  updateEmail: async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  },

  updatePassword: async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange: (callback: (user: any) => void) => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
    return subscription;
  },
};

export const guestService = {
  getAll: async (userId: string, eventId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as GuestRecord[];
  },

  getById: async (id: string, userId: string, eventId?: string) => {
    let query = supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query.single();
    if (error) throw error;
    return data as GuestRecord;
  },

  create: async (guest: any) => {
    const { data, error } = await supabase
      .from('guests')
      .insert([guest])
      .select()
      .single();
    if (error) throw error;
    return data as GuestRecord;
  },

  update: async (id: string, updates: any, userId: string, eventId?: string) => {
    const safeUpdates = { ...updates };

    if ('rsvp_token' in safeUpdates) {
      let tokenQuery = supabase
        .from('guests')
        .select('rsvp_token')
        .eq('id', id)
        .eq('user_id', userId);

      if (eventId) {
        tokenQuery = tokenQuery.eq('event_id', eventId);
      }

      const { data: currentGuest, error: currentError } = await tokenQuery.single();
      if (currentError) throw currentError;

      if (currentGuest?.rsvp_token) {
        delete safeUpdates.rsvp_token;
      } else if (!safeUpdates.rsvp_token) {
        delete safeUpdates.rsvp_token;
      }
    }

    let query = supabase
      .from('guests')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', userId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as GuestRecord;
  },

  delete: async (id: string, userId: string, eventId?: string) => {
    let query = supabase
      .from('guests')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { error } = await query;
    if (error) throw error;
  },

  deleteAll: async (userId: string, eventId?: string) => {
    let query = supabase
      .from('guests')
      .delete()
      .eq('user_id', userId);

    if (eventId) {
      query = query.eq('event_id', eventId);
    }

    const { error } = await query;
    if (error) throw error;
  },

  checkDuplicatePhone: async (phone: string, userId: string, eventId: string, excludeId?: string) => {
    let query = supabase
      .from('guests')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .eq('phone', phone);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).length > 0;
  },

  getStats: async (userId: string, eventId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('rsvp_status, companions')
      .eq('user_id', userId)
      .eq('event_id', eventId);

    if (error) throw error;

    const guests = data || [];
    return {
      totalGuests: guests.length,
      confirmedGuests: guests.filter((g) => g.rsvp_status === 'CONFIRMED').length,
      pendingGuests: guests.filter((g) => g.rsvp_status === 'PENDING').length,
      declinedGuests: guests.filter((g) => g.rsvp_status === 'DECLINED').length,
      totalPeople: guests.reduce((sum, g) => sum + 1 + (g.companions || 0), 0),
    };
  },
};

export const eventService = {
  list: async (userId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('owner_user_id', userId)
      .order('archived_at', { ascending: true, nullsFirst: true })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EventRecord[];
  },

  getActiveOrCreate: async (userId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('owner_user_id', userId)
      .is('archived_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) return data as EventRecord;
    if (error && error.code !== 'PGRST116') throw error;

    const slug = buildDefaultSlug();
    const { data: created, error: createError } = await supabase
      .from('events')
      .insert({
        owner_user_id: userId,
        event_name: 'האירוע שלי',
        public_slug: slug,
        archived_at: null,
      })
      .select()
      .single();

    if (createError) throw createError;
    return created as EventRecord;
  },

  getOrCreate: async (userId: string) => {
    return eventService.getActiveOrCreate(userId);
  },

  update: async (id: string, updates: Partial<EventRecord>) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EventRecord;
  },

  createNew: async (userId: string, name?: string) => {
    const { data, error } = await supabase.rpc('create_event_lite', {
      p_user_id: userId,
      p_event_name: name?.trim() || 'אירוע חדש',
    });
    if (error) throw error;
    return data as EventRecord;
  },

  activate: async (userId: string, eventId: string) => {
    const { data, error } = await supabase.rpc('set_active_event_lite', {
      p_user_id: userId,
      p_event_id: eventId,
    });
    if (error) throw error;
    return data as EventRecord;
  },

  archive: async (userId: string, eventId: string) => {
    const { data, error } = await supabase.rpc('archive_event_lite', {
      p_user_id: userId,
      p_event_id: eventId,
    });
    if (error) throw error;
    return data as EventRecord;
  },

  getBySlug: async (slug: string): Promise<{
    event: PublicEventRecord | null;
    error?: 'not_found' | 'not_public';
    eventName?: string;
  }> => {
    const { data, error } = await supabase.rpc('get_public_event', { p_slug: slug });
    if (error) throw error;

    if (!data?.success) {
      return {
        event: null,
        error: data?.error as 'not_found' | 'not_public',
        eventName: data?.event_name,
      };
    }

    return { event: data.event as PublicEventRecord };
  },

  publicRegister: async (
    slug: string,
    fullName: string,
    phone: string,
    status: string,
    companions: number,
    note?: string
  ) => {
    const { data, error } = await supabase.rpc('public_rsvp_register', {
      p_slug: slug,
      p_full_name: fullName,
      p_phone: phone,
      p_status: status,
      p_companions: companions,
      p_note: note ?? null,
    });
    if (error) throw error;
    return data as { success: boolean; guest_name?: string; status?: string; error?: string };
  },

  buildPublicUrl: (slug: string): string => `${window.location.origin}/event/${slug}`,
};

export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

export function openWhatsAppUrl(waUrl: string): void {
  try {
    const url = new URL(waUrl);
    const phone = url.pathname.replace(/^\//, '');
    const text = url.searchParams.get('text') ?? '';
    const deepLink = phone
      ? `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`
      : `whatsapp://send?text=${encodeURIComponent(text)}`;
    window.location.href = deepLink;
  } catch {
    window.open(waUrl, '_blank');
  }
}

export const rsvpService = {
  generateToken: (): string => crypto.randomUUID(),

  buildPersonalRsvpLink: (guest: Pick<GuestRecord, 'rsvp_token'> | null | undefined): string | null =>
    guest?.rsvp_token ? `${window.location.origin}/rsvp/${guest.rsvp_token}` : null,

  getByToken: async (token: string) => {
    const { data, error } = await supabase.rpc('get_guest_by_token', { p_token: token });
    if (error) throw error;
    return data as {
      success: boolean;
      error?: 'not_found' | 'guest_unavailable' | 'general_error';
      guest?: RsvpPublicGuestRecord;
    };
  },

  verifyToken: async (token: string) => {
    const result = await rsvpService.getByToken(token);
    return !!result?.success;
  },

  respond: async (
    token: string,
    status: 'CONFIRMED' | 'DECLINED',
    companions?: number,
    note?: string
  ) => {
    const { data, error } = await supabase.rpc('respond_to_rsvp', {
      p_token: token,
      p_status: status,
      p_companions: companions ?? null,
      p_note: note ?? null,
    });
    if (error) throw error;
    return data as import('../types').RsvpResponse;
  },

  buildLink: (
    token: string,
    ev?: { event_name?: string | null; event_date?: string | null; venue_name?: string | null; venue_address?: string | null } | null
  ): string => {
    const base = rsvpService.buildPersonalRsvpLink({ rsvp_token: token });
    if (!base) return `${window.location.origin}/rsvp/${token}`;
    if (!ev) return base;
    const params = new URLSearchParams();
    if (ev.event_name && ev.event_name !== 'האירוע שלי') params.set('en', ev.event_name);
    if (ev.event_date) params.set('ed', ev.event_date.split('T')[0]);
    if (ev.venue_name) params.set('vn', ev.venue_name);
    if (ev.venue_address) params.set('va', ev.venue_address);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  },

  buildShareLink: (
    token: string,
    ev?: {
      event_name?: string | null;
      event_date?: string | null;
      venue_name?: string | null;
      venue_address?: string | null;
      cover_image_url?: string | null;
      updated_at?: string | null;
    } | null
  ): string => {
    const base = `${window.location.origin}/share/${token}`;
    if (!ev) return base;
    const params = new URLSearchParams();
    if (ev.event_name && ev.event_name !== 'האירוע שלי') params.set('en', ev.event_name);
    if (ev.event_date) params.set('ed', ev.event_date.split('T')[0]);
    if (ev.venue_name) params.set('vn', ev.venue_name);
    if (ev.venue_address) params.set('va', ev.venue_address);
    if (ev.cover_image_url) params.set('ci', ev.cover_image_url);
    if (ev.updated_at) params.set('v', ev.updated_at);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  },

  buildWhatsAppUrl: (
    phone: string,
    guestName: string,
    token: string,
    ev?: {
      event_name?: string | null;
      event_date?: string | null;
      venue_name?: string | null;
      venue_address?: string | null;
      cover_image_url?: string | null;
      updated_at?: string | null;
    } | null
  ): string => {
    const link = rsvpService.buildPersonalRsvpLink({ rsvp_token: token }) || `${window.location.origin}/rsvp/${token}`;
    const eventName = ev?.event_name && ev.event_name !== 'האירוע שלי' ? ev.event_name : 'האירוע שלנו';
    const lines: string[] = [`היי ${guestName} 👋`, '', `נשמח לראות אותך ב${eventName}`];

    if (ev?.event_date) {
      const date = new Date(ev.event_date);
      lines.push(`📅 ${date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}`);
    }
    if (ev?.venue_name) lines.push(`📍 ${ev.venue_name}`);
    if (ev?.venue_address) lines.push(`   ${ev.venue_address}`);

    lines.push('', 'לאישור הגעה:', link, '', 'תודה ❤️');
    return `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(lines.join('\n'))}`;
  },
};

export const storageService = {
  uploadEventCover: async (userId: string, eventId: string, file: File): Promise<string> => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${eventId}.${ext}`;

    const { error } = await supabase.storage
      .from('event-covers')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw error;

    const { data } = supabase.storage.from('event-covers').getPublicUrl(path);
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  removeEventCover: async (userId: string, eventId: string): Promise<void> => {
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      await supabase.storage.from('event-covers').remove([`${userId}/${eventId}.${ext}`]);
    }
  },
};
