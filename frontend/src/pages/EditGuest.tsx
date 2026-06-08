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
    if (auth.user) {
      loadGuest();
    }
  }, [guestId, auth.user?.id]);

  const loadGuest = async () => {
    if (!auth.user) return;

    try {
      setLoading(true);
      const data = await guestService.getById(guestId, auth.user.id);
      setGuest(data);
    } catch (error) {
      console.error('Failed to load guest:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: CreateGuestInput) => {
    if (!auth.user) {
      throw new Error('Not authenticated');
    }

    if (guest && data.phone !== guest.phone) {
      const hasDuplicate = await guestService.checkDuplicatePhone(
        data.phone,
        auth.user.id,
        guestId
      );

      if (hasDuplicate) {
        throw new Error('A guest with this phone number already exists');
      }
    }

    try {
      await guestService.update(
        guestId,
        {
          full_name: data.fullName,
          phone: data.phone,
          companions: data.companions,
          category: data.category,
          rsvp_status: data.rsvpStatus,
          notes: data.notes,
        },
        auth.user.id
      );

      onSuccess();
    } catch (error) {
      console.error('Edit guest error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="h-96 bg-charcoal-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <h2 className="text-2xl font-bold text-charcoal-900">Guest not found</h2>
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 text-gold-600 hover:text-gold-700"
        >
          Go back
        </button>
      </div>
    );
  }

  const guestName = guest.fullName || guest.full_name || 'Guest';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal-900">Edit Guest</h1>
        <p className="text-charcoal-600 mt-2">
          Update {guestName}'s information
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-charcoal-100">
        <GuestForm initialData={guest} onSubmit={handleSubmit} onCancel={onCancel} />
      </div>
    </div>
  );
};
