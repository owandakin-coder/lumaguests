import { useState, useEffect } from 'react';
import { Category, RsvpStatus, Guest, CreateGuestInput } from '../types';

interface GuestFormProps {
  initialData?: Guest;
  onSubmit: (data: CreateGuestInput) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
}

const categories: Category[] = ['GROOM', 'BRIDE', 'FAMILY', 'FRIENDS', 'WORK', 'OTHER'];
const rsvpStatuses: RsvpStatus[] = ['PENDING', 'CONFIRMED', 'DECLINED'];

export const GuestForm = ({ initialData, onSubmit, isLoading = false, onCancel }: GuestFormProps) => {
  const [formData, setFormData] = useState<CreateGuestInput>({
    fullName: initialData?.fullName || initialData?.full_name || '',
    phone: initialData?.phone || '',
    companions: initialData?.companions || 0,
    category: initialData?.category || 'FAMILY',
    rsvpStatus: initialData?.rsvpStatus || initialData?.rsvp_status || 'PENDING',
    notes: initialData?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setErrors({});
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }

    if (formData.companions < 0) {
      newErrors.companions = 'Companions cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'companions') {
      setFormData((prev) => ({
        ...prev,
        [name]: Math.max(0, parseInt(value) || 0),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        submit: error instanceof Error ? error.message : 'An error occurred',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Full Name */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-900 mb-2">
          Full Name
        </label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="John Doe"
          className={`w-full px-4 py-3 rounded-lg border transition ${
            errors.fullName
              ? 'border-red-300 bg-red-50 focus:ring-red-500'
              : 'border-charcoal-200 bg-white focus:ring-gold-400'
          } focus:outline-none focus:ring-2`}
        />
        {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-900 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="+1 (555) 123-4567"
          className={`w-full px-4 py-3 rounded-lg border transition ${
            errors.phone
              ? 'border-red-300 bg-red-50 focus:ring-red-500'
              : 'border-charcoal-200 bg-white focus:ring-gold-400'
          } focus:outline-none focus:ring-2`}
        />
        {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
      </div>

      {/* Grid: Companions, Category */}
      <div className="grid grid-cols-2 gap-4">
        {/* Companions */}
        <div>
          <label className="block text-sm font-semibold text-charcoal-900 mb-2">
            Companions
          </label>
          <input
            type="number"
            name="companions"
            value={formData.companions}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-3 rounded-lg border border-charcoal-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 transition"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-charcoal-900 mb-2">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-charcoal-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 transition"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* RSVP Status */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-900 mb-2">
          RSVP Status
        </label>
        <div className="flex gap-3">
          {rsvpStatuses.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, rsvpStatus: status }))}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                formData.rsvpStatus === status
                  ? 'bg-gold-500 text-white'
                  : 'bg-charcoal-100 text-charcoal-700 hover:bg-charcoal-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-charcoal-900 mb-2">
          Notes (Optional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Add any additional notes..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-charcoal-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 transition resize-none"
        />
      </div>

      {/* Submit Error */}
      {errors.submit && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{errors.submit}</p>}

      {/* Actions */}
      <div className="flex gap-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 rounded-lg border border-charcoal-200 text-charcoal-900 font-semibold hover:bg-charcoal-50 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 transition disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Guest'}
        </button>
      </div>
    </form>
  );
};
