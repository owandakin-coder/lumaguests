export type Category = 'GROOM' | 'BRIDE' | 'FAMILY' | 'FRIENDS' | 'WORK' | 'OTHER';
export type RsvpStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface Guest {
  id: string;
  user_id?: string;
  fullName?: string;
  full_name: string;
  phone: string;
  companions: number;
  category: Category;
  rsvpStatus?: RsvpStatus;
  rsvp_status: RsvpStatus;
  notes?: string;
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
  category: Category;
  rsvpStatus: RsvpStatus;
  notes?: string;
}

export interface UpdateGuestInput {
  fullName?: string;
  phone?: string;
  companions?: number;
  category?: Category;
  rsvpStatus?: RsvpStatus;
  notes?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
