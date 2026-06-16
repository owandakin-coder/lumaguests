import { useEffect, useState } from 'react';
import { GuestForm } from '../components/GuestForm';
import { Guest, CreateGuestInput } from '../types';
import { guestService } from '../services/supabase';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';
import { useEvent } from '../hooks/useEvent';

interface EditGuestProps {
  guestId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EditGuest = ({ guestId, onSuccess, onCancel }: EditGuestProps) => {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const auth = useSupabaseAuth();
  const { event } = useEvent();

  useEffect(() => {
    if (auth.user && event?.id) {
      void loadGuest();
    }
  }, [auth.user, event?.id, guestId]);

  const loadGuest = async () => {
    if (!auth.user || !event?.id) return;

    try {
      setLoading(true);
      setLoadError(false);
      const guestOwnerId = event.owner_user_id || auth.user.id;
      const data = await guestService.getById(guestId, guestOwnerId, event.id);
      setGuest(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateGuestInput) => {
    if (!auth.user) {
      throw new Error('לא מחובר');
    }
    if (!event?.id) {
      throw new Error('לא נמצא אירוע פעיל. יש לחזור לניהול אירוע ולטעון אירוע פעיל.');
    }

    const guestOwnerId = event.owner_user_id || auth.user.id;

    if (guest && data.phone.trim() !== guest.phone) {
      const hasDuplicate = await guestService.checkDuplicatePhone(data.phone.trim(), guestOwnerId, event.id, guestId);
      if (hasDuplicate) {
        throw new Error('מוזמן עם מספר טלפון זה כבר קיים');
      }
    }

    try {
      await guestService.update(
        guestId,
        {
          full_name: data.fullName.trim(),
          phone: data.phone.trim(),
          companions: data.companions,
          side: data.side ?? null,
          category: data.category,
          rsvp_status: data.rsvpStatus,
          notes: data.notes?.trim() || null,
        },
        guestOwnerId,
        event.id
      );
    } catch (error: any) {
      if (error?.code === '23505') throw new Error('מוזמן עם מספר טלפון זה כבר קיים');
      throw error;
    }

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

  if (loadError) return (
    <div className="flex flex-col items-center py-20 gap-3">
      <p className="text-charcoal-500">שגיאה בטעינת המוזמן</p>
      <button onClick={() => void loadGuest()} className="text-gold-600 font-bold text-sm">נסה שוב</button>
      <button onClick={onCancel} className="text-charcoal-400 text-sm">חזרה</button>
    </div>
  );

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
      eventType={event?.event_type}
    />
  );
};
