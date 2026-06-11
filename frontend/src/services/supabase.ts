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

// ── RSVP Magic Link Service ───────────────────────────────────
export const rsvpService = {
  generateToken: (): string => crypto.randomUUID(),

  getByToken: async (token: string) => {
    const { data, error } = await supabase.rpc('get_guest_by_token', { p_token: token });
    if (error) throw error;
    if (!data?.success) return null;
    return data.guest as import('../types').RsvpPublicGuest;
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

  buildLink: (token: string): string =>
    `${window.location.origin}/rsvp/${token}`,

  buildWhatsAppUrl: (phone: string, guestName: string, token: string): string => {
    const link = rsvpService.buildLink(token);
    const msg  = `שלום ${guestName}! 🎉\nנשמח לאישור הגעה לאירוע:\n👉 ${link}`;
    return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
  },
};

