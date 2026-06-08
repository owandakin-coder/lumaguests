import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onRegister: (email: string, password: string, name?: string) => Promise<void>;
}

export const Register = ({ onSuccess, onSwitchToLogin, onRegister }: RegisterProps) => {
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('יש למלא אימייל וסיסמה'); return; }
    if (password.length < 6) { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    try {
      setLoading(true);
      await onRegister(email, password, name);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההרשמה נכשלה, נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Brand */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-charcoal-900 flex items-center justify-center mx-auto mb-4">
          <span className="text-gold-400 text-2xl font-bold">L</span>
        </div>
        <h1 className="text-[32px] font-bold text-charcoal-900">יצירת חשבון</h1>
        <p className="text-sm text-charcoal-400 mt-1">הצטרף ל-Luma Guests</p>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-3xl p-5 space-y-4" style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-500 mb-1.5">שם (אופציונלי)</label>
          <div className="relative">
            <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ישראל ישראלי"
              className="w-full pr-10 pl-4 py-3.5 rounded-2xl border border-charcoal-100 bg-ivory-100 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-300 transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-500 mb-1.5">אימייל</label>
          <div className="relative">
            <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="you@example.com"
              dir="ltr"
              className="w-full pr-10 pl-4 py-3.5 rounded-2xl border border-charcoal-100 bg-ivory-100 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-300 transition text-right"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-charcoal-500 mb-1.5">סיסמה</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="לפחות 6 תווים"
              dir="ltr"
              className="w-full pr-10 pl-10 py-3.5 rounded-2xl border border-charcoal-100 bg-ivory-100 text-sm text-charcoal-900 placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-gold-300 transition text-right"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl"
          >
            {error}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-charcoal-900 text-white font-semibold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
        >
          {loading ? 'יוצר חשבון...' : 'הרשמה'}
        </button>

        {/* Legal */}
        <p className="text-[11px] text-charcoal-400 text-center leading-relaxed">
          בהרשמה אתה מסכים ל
          <button className="text-gold-600 underline mx-1">תנאי שימוש</button>
          ול
          <button className="text-gold-600 underline mx-1">מדיניות פרטיות</button>
        </p>
      </div>

      {/* Switch */}
      <p className="text-center text-sm text-charcoal-500">
        יש לך כבר חשבון?{' '}
        <button onClick={onSwitchToLogin} className="text-gold-600 font-semibold">
          כניסה
        </button>
      </p>
    </motion.div>
  );
};
