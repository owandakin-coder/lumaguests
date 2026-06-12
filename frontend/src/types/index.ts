export type Side = 'BRIDE' | 'GROOM' | 'SHARED';
export type Category = 'FAMILY' | 'FRIENDS' | 'WORK' | 'OTHER';
export type RsvpStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface Guest {
  id: string;
  user_id?: string;
  fullName?: string;
  full_name: string;
  phone: string;
  companions: number;
  side?: Side | null;
  category: Category;
  rsvpStatus?: RsvpStatus;
  rsvp_status: RsvpStatus;
  notes?: string;
  rsvp_token?: string;
  rsvp_via_link?: boolean;
  rsvp_responded_at?: string;
  rsvp_public_note?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface Stats {
  totalGuests: number;
  confirmedGuests: number;
  pendingGuests: number;
  declinedGuests: number;
  totalPeople: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateGuestInput {
  fullName: string;
  phone: string;
  companions: number;
  side?: Side | null;
  category: Category;
  rsvpStatus: RsvpStatus;
  notes?: string;
}

export interface UpdateGuestInput {
  fullName?: string;
  phone?: string;
  companions?: number;
  side?: Side | null;
  category?: Category;
  rsvpStatus?: RsvpStatus;
  notes?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface RsvpPublicGuest {
  id: string;
  full_name: string;
  rsvp_status: RsvpStatus;
  companions: number;
  rsvp_via_link: boolean;
  rsvp_responded_at: string | null;
}

export interface RsvpResponse {
  success: boolean;
  name?: string;
  status?: string;
  error?: string;
}

// ── Event ────────────────────────────────────────────────────
export interface Event {
  id: string;
  owner_user_id: string;
  event_name: string;
  event_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  description: string | null;
  cover_image_url: string | null;
  public_slug: string | null;
  is_public: boolean;
  public_rsvp_enabled?: boolean | null;
  theme_color: string;
  created_at: string;
  updated_at: string;
}

export interface PublicEventData {
  id: string;
  event_name: string;
  event_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  description: string | null;
  cover_image_url: string | null;
  theme_color: string;
  owner_user_id: string;
}
