import { useEffect, useState } from 'react';
import { GuestForm } from '../components/GuestForm';
import { Guest, CreateGuestInput } from '../types';
import { guestService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface EditGuestProps {
  guestId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EditGuest = ({ guestId, onSuccess, onCancel }: EditGuestProps) => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const auth = useSupabaseAuth();

  useEffect(() => {
    if (auth.user) loadGuest();
  }, [guestId, auth.user?.id]);

  const loadGuest = async () => {
    if (!auth.user) return;
    try {
      setLoading(true);
      const data = await guestService.getById(guestId, auth.user.id);
      setGuest(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleSubmit = async (data: CreateGuestInput) => {
    if (!auth.user) throw new Error('לא מחובר');

    if (guest && data.phone !== guest.phone) {
      const hasDuplicate = await guestService.checkDuplicatePhone(data.phone, auth.user.id, guestId);
      if (hasDuplicate) throw new Error('מוזמן עם מספר טלפון זה כבר קיים');
    }

    await guestService.update(
      guestId,
      { full_name: data.fullName, phone: data.phone, companions: data.companions, category: data.category, rsvp_status: data.rsvpStatus, notes: data.notes },
      auth.user.id
    );

    onSuccess();
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-9 w-9 bg-charcoal-100 rounded-xl" />
        <div className="h-48 bg-white rounded-3xl" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="text-center py-16">
        <p className="text-charcoal-500">מוזמן לא נמצא</p>
        <button onClick={onCancel} className="mt-4 text-gold-600 font-semibold text-sm">חזרה</button>
      </div>
    );
  }

  return (
    <GuestForm
      initialData={guest}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      title="עריכת מוזמן"
    />
  );
};
