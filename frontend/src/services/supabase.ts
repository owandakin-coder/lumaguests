import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta.env as any).VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth functions
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

// Guest operations (all protected by RLS)
export const guestService = {
  getAll: async (userId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  getById: async (id: string, userId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  create: async (guest: any) => {
    const { data, error } = await supabase
      .from('guests')
      .insert([guest])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id: string, updates: any, userId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id: string, userId: string) => {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },

  deleteAll: async (userId: string) => {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  },

  checkDuplicatePhone: async (phone: string, userId: string, excludeId?: string) => {
    let query = supabase
      .from('guests')
      .select('id')
      .eq('user_id', userId)
      .eq('phone', phone);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).length > 0;
  },

  getStats: async (userId: string) => {
    const { data, error } = await supabase
      .from('guests')
      .select('rsvp_status, companions')
      .eq('user_id', userId);

    if (error) throw error;

    const guests = data || [];
    const stats = {
      totalGuests: guests.length,
      confirmedGuests: guests.filter((g) => g.rsvp_status === 'CONFIRMED').length,
      pendingGuests: guests.filter((g) => g.rsvp_status === 'PENDING').length,
      declinedGuests: guests.filter((g) => g.rsvp_status === 'DECLINED').length,
      totalPeople: guests.reduce((sum, g) => sum + 1 + (g.companions || 0), 0),
    };

    return stats;
  },
};

// ── Event Service ────────────────────────────────────────────
export const eventService = {
  getOrCreate: async (userId: string) => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (data) return data as import('../types').Event;
    if (error && error.code !== 'PGRST116') throw error;

    // No event yet — create one with a random slug
    const slug = 'event-' + Math.random().toString(36).substring(2, 9);
    const { data: created, error: ce } = await supabase
      .from('events')
      .insert({ owner_user_id: userId, event_name: 'האירוע שלי', public_slug: slug })
      .select()
      .single();
    if (ce) throw ce;
    return created as import('../types').Event;
  },

  update: async (id: string, updates: Partial<import('../types').Event>) => {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as import('../types').Event;
  },

  getBySlug: async (slug: string): Promise<{
    event: import('../types').PublicEventData | null;
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
    return { event: data.event as import('../types').PublicEventData };
  },

  publicRegister: async (
    slug: string, fullName: string, phone: string,
    status: string, companions: number, note?: string
  ) => {
    const { data, error } = await supabase.rpc('public_rsvp_register', {
      p_slug:       slug,
      p_full_name:  fullName,
      p_phone:      phone,
      p_status:     status,
      p_companions: companions,
      p_note:       note ?? null,
    });
    if (error) throw error;
    return data as { success: boolean; guest_name?: string; status?: string; error?: string };
  },

  buildPublicUrl: (slug: string): string =>
    `${window.location.origin}/event/${slug}`,
};

// Converts any Israeli phone to international format for wa.me links.
// 05X-XXXXXXX → 9725XXXXXXX  |  already international → unchanged
export function toWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;          // already international
  if (digits.startsWith('0'))   return '972' + digits.slice(1); // local → international
  return digits;
}

// ── RSVP Magic Link Service ───────────────────────────────────
export const rsvpService = {
  generateToken: (): string => crypto.randomUUID(),

  getByToken: async (token: string) => {
    const { data, error } = await supabase.rpc('get_guest_by_token', { p_token: token });
    if (error) throw error;
    if (!data?.success) return null;
    return data.guest as import('../types').RsvpPublicGuest;
  },

  verifyToken: async (token: string) => {
    const guest = await rsvpService.getByToken(token);
    return !!guest;
  },

  respond: async (
    token: string,
    status: 'CONFIRMED' | 'DECLINED',
    companions?: number,
    note?: string
  ) => {
    const { data, error } = await supabase.rpc('respond_to_rsvp', {
      p_token:      token,
      p_status:     status,
      p_companions: companions ?? null,
      p_note:       note ?? null,
    });
    if (error) throw error;
    return data as import('../types').RsvpResponse;
  },

  buildLink: (token: string, ev?: { event_name?: string | null; event_date?: string | null; venue_name?: string | null } | null): string => {
    const base = `${window.location.origin}/rsvp/${token}`;
    if (!ev) return base;
    const p = new URLSearchParams();
    if (ev.event_name && ev.event_name !== 'האירוע שלי') p.set('en', ev.event_name);
    if (ev.event_date) p.set('ed', ev.event_date.split('T')[0]);
    if (ev.venue_name) p.set('vn', ev.venue_name);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  },

  // Share link goes through /share/{token} → Vercel function injects dynamic OG image
  buildShareLink: (
    token: string,
    ev?: { event_name?: string | null; event_date?: string | null; venue_name?: string | null; cover_image_url?: string | null } | null
  ): string => {
    const base = `${window.location.origin}/share/${token}`;
    if (!ev) return base;
    const p = new URLSearchParams();
    if (ev.event_name && ev.event_name !== 'האירוע שלי') p.set('en', ev.event_name);
    if (ev.event_date) p.set('ed', ev.event_date.split('T')[0]);
    if (ev.venue_name) p.set('vn', ev.venue_name);
    if (ev.cover_image_url) p.set('ci', ev.cover_image_url);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  },

  buildWhatsAppUrl: (
    phone: string,
    guestName: string,
    token: string,
    ev?: { event_name?: string | null; event_date?: string | null; venue_name?: string | null; cover_image_url?: string | null } | null
  ): string => {
    // Use /share/ link so WhatsApp preview shows the event cover photo
    const link = rsvpService.buildShareLink(token, ev);
    const eventName = (ev?.event_name && ev.event_name !== 'האירוע שלי') ? ev.event_name : 'האירוע שלנו';
    const lines: string[] = [`היי ${guestName} 👋`, '', `נשמח לראות אותך ב${eventName}`];
    if (ev?.event_date) {
      const d = new Date(ev.event_date);
      lines.push(`📅 ${d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}`);
    }
    if (ev?.venue_name) lines.push(`📍 ${ev.venue_name}`);
    lines.push('', 'לאישור הגעה:', link, '', 'תודה ❤️');
    return `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(lines.join('\n'))}`;
  },
};

// ── Storage — Event Cover Images ─────────────────────────────
export const storageService = {
  uploadEventCover: async (userId: string, eventId: string, file: File): Promise<string> => {
    const ext  = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${eventId}.${ext}`;

    const { error } = await supabase.storage
      .from('event-covers')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (error) throw error;

    const { data } = supabase.storage.from('event-covers').getPublicUrl(path);
    // Append a cache-buster so the browser picks up the new image
    return `${data.publicUrl}?t=${Date.now()}`;
  },

  removeEventCover: async (userId: string, eventId: string): Promise<void> => {
    // Try both common extensions
    for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
      await supabase.storage.from('event-covers').remove([`${userId}/${eventId}.${ext}`]);
    }
  },
};

