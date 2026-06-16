import { GuestForm } from '../components/GuestForm';
import { CreateGuestInput } from '../types';
import { guestService, rsvpService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useEvent } from '../hooks/useEvent';

interface AddGuestProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AddGuest = ({ onSuccess, onCancel }: AddGuestProps) => {
  const auth = useSupabaseAuth();
  const { event } = useEvent();

  const handleSubmit = async (data: CreateGuestInput) => {
    if (!auth.user) {
      throw new Error('לא מחובר');
    }
    if (!event?.id) {
      throw new Error('לא נמצא אירוע פעיל. יש לחזור לניהול אירוע ולטעון אירוע פעיל.');
    }

    const guestOwnerId = event.owner_user_id || auth.user.id;
    const hasDuplicate = await guestService.checkDuplicatePhone(data.phone.trim(), guestOwnerId, event.id);
    if (hasDuplicate) {
      throw new Error('מוזמן עם מספר טלפון זה כבר קיים');
    }

    const base = {
      full_name: data.fullName.trim(),
      phone: data.phone.trim(),
      companions: data.companions ?? 0,
      side: data.side ?? null,
      category: data.category,
      rsvp_status: data.rsvpStatus,
      notes: data.notes?.trim() || null,
      user_id: guestOwnerId,
      event_id: event.id,
    };

    try {
      await guestService.create({ ...base, rsvp_token: rsvpService.generateToken() });
    } catch (error: any) {
      if (error?.message?.includes('rsvp_token') || error?.code === '42703') {
        await guestService.create(base);
      } else if (error?.code === '23505') {
        throw new Error('מוזמן עם מספר טלפון זה כבר קיים');
      } else {
        throw error;
      }
    }

    onSuccess();
  };

  return (
    <GuestForm
      onSubmit={handleSubmit}
      onCancel={onCancel}
      title="הוספת מוזמן"
      eventType={event?.event_type}
    />
  );
};
