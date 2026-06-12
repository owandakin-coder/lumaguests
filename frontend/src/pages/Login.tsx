import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { authService } from '../services/supabase';

interface LoginProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
}

type View = 'login' | 'forgot';

export const Login = ({ onSuccess, onSwitchToRegister, onLogin }: LoginProps) => {
  const [view, setView]           = useState<View>('login');

  // Login state
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent]   = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('יש למלא אימייל וסיסמה'); return; }
    try {
      setLoading(true);
      await onLogin(email, password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'כניסה נכשלה, נסה שוב');
    } finally { setLoading(false); }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { setError('יש למלא אימייל'); return; }
    try {
      setForgotLoading(true); setError('');
      await authService.resetPassword(forgotEmail);
      setForgotSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחה, נסה שוב');
    } finally { setForgotLoading(false); }
  };

  const switchToForgot = () => {
    setForgotEmail(email);
    setForgotSent(false);
    setError('');
    setView('forgot');
  };

  const switchToLogin = () => {
    setError('');
    setView('login');
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg,#1A1916 0%,#1A1916 40%,#F5F3EF 40%)' }}
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
          ניהול רשימת מוזמנים
        </motion.p>
      </div>

      {/* Form area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="flex-1 bg-[#F5F3EF] px-5 pt-8 pb-10"
      >
        <AnimatePresence mode="wait">

          {/* ── Login view ── */}
          {view === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              <h2 className="text-[24px] font-bold text-charcoal-900 mb-6">כניסה לחשבון</h2>

              <form onSubmit={handleLogin} className="space-y-3">
                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center px-4">
                    <Mail className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                    <input
                      type="email" value={email}
                      onChange={e => { setEmail(e.target.value); setError(''); }}
                      placeholder="אימייל"
                      dir="ltr"
                      className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center px-4">
                    <Lock className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError(''); }}
                      placeholder="סיסמה"
                      dir="ltr"
                      className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-charcoal-400 p-1">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="bg-red-50 text-red-600 text-[13px] font-medium px-4 py-3 rounded-2xl">
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit" disabled={loading}
                  className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
                  style={{ boxShadow: '0 4px 16px rgba(26,25,22,0.2)' }}
                >
                  {loading ? 'מתחבר...' : 'כניסה'}
                </button>
              </form>

              <div className="mt-5 flex flex-col items-center gap-3">
                <button
                  onClick={switchToForgot}
                  className="text-[13px] text-charcoal-400 hover:text-charcoal-600 transition-colors"
                >
                  שכחתי סיסמה
                </button>
                <p className="text-[14px] text-charcoal-500">
                  אין לך חשבון?{' '}
                  <button onClick={onSwitchToRegister} className="text-gold-600 font-bold">הרשמה</button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Forgot password view ── */}
          {view === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
            >
              {/* Back */}
              <button
                onClick={switchToLogin}
                className="flex items-center gap-1.5 text-[13px] text-charcoal-500 mb-5 active:opacity-70 transition-opacity"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה לכניסה
              </button>

              <h2 className="text-[24px] font-bold text-charcoal-900 mb-2">איפוס סיסמה</h2>
              <p className="text-[14px] text-charcoal-500 mb-6 leading-relaxed">
                נשלח לך קישור לאיפוס סיסמה לכתובת האימייל שלך.
              </p>

              {forgotSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 rounded-2xl p-5 text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-[15px] font-bold text-green-800 mb-1">הקישור נשלח!</p>
                  <p className="text-[13px] text-green-600 leading-relaxed">
                    בדוק את תיבת הדואר שלך — תוך דקות תקבל קישור לאיפוס.
                  </p>
                  <button
                    onClick={switchToLogin}
                    className="mt-4 text-[13px] text-charcoal-500 font-semibold"
                  >
                    חזרה לכניסה
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-3">
                  <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                    <div className="flex items-center px-4">
                      <Mail className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                      <input
                        type="email" value={forgotEmail}
                        onChange={e => { setForgotEmail(e.target.value); setError(''); }}
                        placeholder="האימייל שלך"
                        dir="ltr"
                        className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="bg-red-50 text-red-600 text-[13px] font-medium px-4 py-3 rounded-2xl">
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit" disabled={forgotLoading}
                    className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform"
                    style={{ boxShadow: '0 4px 16px rgba(26,25,22,0.2)' }}
                  >
                    {forgotLoading ? 'שולח...' : 'שלח קישור לאיפוס'}
                  </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
};
