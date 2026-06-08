import { useState, useEffect } from 'react';
import { Category, RsvpStatus, Guest, CreateGuestInput } from '../types';
import { ChevronRight } from 'lucide-react';

interface GuestFormProps {
  initialData?: Guest;
  onSubmit: (data: CreateGuestInput) => Promise<void>;
  isLoading?: boolean;
  onCancel: () => void;
  title?: string;
}

const categories: { value: Category; label: string }[] = [
  { value: 'GROOM',   label: 'חתן'    },
  { value: 'BRIDE',   label: 'כלה'    },
  { value: 'FAMILY',  label: 'משפחה'  },
  { value: 'FRIENDS', label: 'חברים'  },
  { value: 'WORK',    label: 'עבודה'  },
  { value: 'OTHER',   label: 'אחר'    },
];

const rsvpStatuses: { value: RsvpStatus; label: string }[] = [
  { value: 'PENDING',   label: 'ממתין'    },
  { value: 'CONFIRMED', label: 'אישר'     },
  { value: 'DECLINED',  label: 'לא מגיע' },
];

export const GuestForm = ({ initialData, onSubmit, isLoading = false, onCancel, title }: GuestFormProps) => {
  const [formData, setFormData] = useState<CreateGuestInput>({
    fullName:   initialData?.fullName  || initialData?.full_name   || '',
    phone:      initialData?.phone     || '',
    companions: initialData?.companions || 0,
    category:   initialData?.category  || 'FAMILY',
    rsvpStatus: initialData?.rsvpStatus || initialData?.rsvp_status || 'PENDING',
    notes:      initialData?.notes     || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { setErrors({}); }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.fullName.trim())  e.fullName  = 'שם מלא הוא שדה חובה';
    if (!formData.phone.trim())     e.phone     = 'מספר טלפון הוא שדה חובה';
    else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) e.phone = 'פורמט טלפון לא תקין';
    if (formData.companions < 0)    e.companions = 'לא יכול להיות שלילי';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'companions') {
      setFormData((p) => ({ ...p, [name]: Math.max(0, parseInt(value) || 0) }));
    } else {
      setFormData((p) => ({ ...p, [name]: value }));
    }
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await onSubmit(formData);
    } catch (err) {
      setErrors((p) => ({ ...p, submit: err instanceof Error ? err.message : 'שגיאה, נסה שוב' }));
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3.5 rounded-2xl border text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 transition ${
      errors[field]
        ? 'border-red-300 bg-red-50 focus:ring-red-300'
        : 'border-transparent bg-white focus:ring-gold-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button type="button" onClick={onCancel} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm active:scale-90 transition-transform">
          <ChevronRight className="w-5 h-5 text-charcoal-600" />
        </button>
        <h1 className="text-xl font-bold text-charcoal-900">{title || 'הוספת מוזמן'}</h1>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-500 mb-1.5 mr-1">שם מלא</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="ישראל ישראלי"
          className={inputClass('fullName')}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        />
        {errors.fullName && <p className="text-red-500 text-xs mt-1 mr-1">{errors.fullName}</p>}
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-500 mb-1.5 mr-1">מספר טלפון</label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          placeholder="050-000-0000"
          dir="ltr"
          className={`${inputClass('phone')} text-right`}
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        />
        {errors.phone && <p className="text-red-500 text-xs mt-1 mr-1">{errors.phone}</p>}
      </div>

      {/* Companions */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-500 mb-1.5 mr-1">מלווים</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, companions: Math.max(0, p.companions - 1) }))}
            className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-xl font-semibold text-charcoal-600 shadow-sm active:scale-90 transition-transform"
          >−</button>
          <div className="flex-1 py-3 rounded-2xl bg-white text-center text-lg font-bold text-charcoal-900 shadow-sm">
            {formData.companions}
          </div>
          <button
            type="button"
            onClick={() => setFormData((p) => ({ ...p, companions: p.companions + 1 }))}
            className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-xl font-semibold text-charcoal-600 shadow-sm active:scale-90 transition-transform"
          >+</button>
        </div>
      </div>

      {/* Category chips */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-500 mb-2 mr-1">צד / קטגוריה</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData((p) => ({ ...p, category: value }))}
              className={`px-4 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95 ${
                formData.category === value
                  ? 'bg-charcoal-900 text-white'
                  : 'bg-white text-charcoal-600 shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* RSVP Status */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-500 mb-2 mr-1">סטטוס RSVP</label>
        <div className="grid grid-cols-3 gap-2">
          {rsvpStatuses.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFormData((p) => ({ ...p, rsvpStatus: value }))}
              className={`py-3 rounded-2xl text-xs font-semibold transition-all active:scale-95 ${
                formData.rsvpStatus === value
                  ? value === 'CONFIRMED' ? 'bg-emerald-600 text-white'
                  : value === 'DECLINED'  ? 'bg-red-500 text-white'
                  :                         'bg-charcoal-900 text-white'
                  : 'bg-white text-charcoal-600 shadow-sm'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-semibold text-charcoal-500 mb-1.5 mr-1">הערות (אופציונלי)</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="הערות נוספות..."
          rows={3}
          className="w-full px-4 py-3.5 rounded-2xl border border-transparent bg-white text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-300 transition resize-none"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        />
      </div>

      {/* Submit error */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm">
          {errors.submit}
        </div>
      )}

      {/* Sticky Save */}
      <div className="sticky bottom-4 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-base font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
        >
          {isLoading ? 'שומר...' : 'שמור מוזמן'}
        </button>
      </div>
    </form>
  );
};
