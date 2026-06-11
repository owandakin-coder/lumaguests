import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onRegister: (email: string, password: string, name?: string) => Promise<void>;
}

export const Register = ({ onSuccess, onSwitchToLogin, onRegister }: RegisterProps) => {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('יש למלא אימייל וסיסמה'); return; }
    if (password.length < 6)  { setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
    try {
      setLoading(true);
      await onRegister(email, password, name);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ההרשמה נכשלה, נסה שוב');
    } finally { setLoading(false); }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg,#1A1916 0%,#1A1916 42%,#F5F3EF 42%)' }}
    >
      {/* Dark top — brand */}
      <div className="flex-shrink-0 px-6 pt-16 pb-12 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 rounded-2xl bg-gold-500 flex items-center justify-center mx-auto mb-5"
          style={{ boxShadow: '0 8px 24px rgba(201,168,76,0.4)' }}
        >
          <span className="text-charcoal-900 text-2xl font-black">L</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-[32px] font-bold text-white leading-tight"
        >
          Luma Guests
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[14px] text-white/50 mt-1"
        >
          ניהול מוזמנים פרמיום
        </motion.p>
      </div>

      {/* Form area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex-1 bg-[#F5F3EF] px-5 pt-8 pb-10"
      >
        <h2 className="text-[24px] font-bold text-charcoal-900 mb-6">יצירת חשבון</h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center px-4">
              <User className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="שם (אופציונלי)"
                className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
              />
            </div>
          </div>

          {/* Email */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center px-4">
              <Mail className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                placeholder="אימייל"
                dir="ltr"
                className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
              />
            </div>
          </div>

          {/* Password */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-center px-4">
              <Lock className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="סיסמה (לפחות 6 תווים)"
                dir="ltr"
                className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-charcoal-400 p-1"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-red-50 text-red-600 text-[13px] font-medium px-4 py-3 rounded-2xl"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
            style={{ boxShadow: '0 4px 16px rgba(26,25,22,0.2)' }}
          >
            {loading ? 'יוצר חשבון...' : 'הרשמה'}
          </button>
        </form>

        <p className="text-[11px] text-charcoal-400 text-center leading-relaxed mt-4">
          בהרשמה אתה מסכים ל
          <span className="text-gold-600 mx-0.5">תנאי שימוש</span>
          ול
          <span className="text-gold-600 mx-0.5">מדיניות פרטיות</span>
        </p>

        <p className="text-center text-[14px] text-charcoal-500 mt-5">
          יש לך כבר חשבון?{' '}
          <button onClick={onSwitchToLogin} className="text-gold-600 font-bold">
            כניסה
          </button>
        </p>
      </motion.div>
    </div>
  );
};
