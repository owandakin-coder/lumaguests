import { GuestForm } from '../components/GuestForm';
import { CreateGuestInput } from '../types';
import { guestService, rsvpService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface AddGuestProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddGuest = ({ onSuccess, onCancel }: AddGuestProps) => {
  const auth = useSupabaseAuth();

  const handleSubmit = async (data: CreateGuestInput) => {
    if (!auth.user) throw new Error('לא מחובר');

    const hasDuplicate = await guestService.checkDuplicatePhone(data.phone, auth.user.id);
    if (hasDuplicate) throw new Error('מוזמן עם מספר טלפון זה כבר קיים');

    const base = {
      full_name:   data.fullName.trim(),
      phone:       data.phone.trim(),
      companions:  data.companions ?? 0,
      category:    data.category,
      rsvp_status: data.rsvpStatus,
      notes:       data.notes?.trim() || null,
      user_id:     auth.user.id,
    };

    // Try with rsvp_token; if column doesn't exist yet fall back without it
    try {
      await guestService.create({ ...base, rsvp_token: rsvpService.generateToken() });
    } catch (e: any) {
      if (e?.message?.includes('rsvp_token') || e?.code === '42703') {
        await guestService.create(base);
      } else {
        throw e;
      }
    }

    onSuccess();
  };

  return (
    <GuestForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      title="הוספת מוזמן"
    />
  );
};
