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
    if (!auth.user) {
      throw new Error('Not authenticated');
    }

    // Check for duplicate phone
    const hasDuplicate = await guestService.checkDuplicatePhone(
      data.phone,
      auth.user.id
    );
    if (hasDuplicate) {
      throw new Error('A guest with this phone number already exists');
    }

    try {
      await guestService.create({
        ...data,
        user_id: auth.user.id,
      });
      onSuccess();
    } catch (error) {
      throw error;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal-900">Add New Guest</h1>
        <p className="text-charcoal-600 mt-2">Fill in the details below to add a new guest</p>
      </div>

      <div className="bg-white rounded-2xl p-8 border border-charcoal-100">
        <GuestForm onSubmit={handleSubmit} onCancel={onCancel} />
      </div>
    </div>
  );
};
