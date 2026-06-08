export type Category = 'GROOM' | 'BRIDE' | 'FAMILY' | 'FRIENDS' | 'WORK' | 'OTHER';
export type RsvpStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

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

export interface Guest {
  id: string;
  fullName: string;
  phone: string;
  companions: number;
  category: Category;
  rsvpStatus: RsvpStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
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
