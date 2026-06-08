import { GuestForm } from '../components/GuestForm';
import { CreateGuestInput } from '../types';
import { guestService } from '../services/supabase';
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

    await guestService.create({
      full_name: data.fullName,
      phone: data.phone,
      companions: data.companions,
      category: data.category,
      rsvp_status: data.rsvpStatus,
      notes: data.notes,
      user_id: auth.user.id,
    });

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
