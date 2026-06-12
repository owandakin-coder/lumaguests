import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { authService, supabase } from '../services/supabase';

export const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const hash = window.location.hash.startsWith('#')
        ? new URLSearchParams(window.location.hash.slice(1))
        : null;
      const accessToken = hash?.get('access_token');
      const refreshToken = hash?.get('refresh_token');

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            throw sessionError;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          throw new Error('קישור האיפוס אינו תקין או שפג תוקפו');
        }

        if (isMounted) {
          setIsReady(true);
          window.history.replaceState({}, document.title, '/reset-password');
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'לא ניתן לאמת את קישור האיפוס');
        }
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await authService.updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירת הסיסמה נכשלה');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(180deg,#1A1916 0%,#1A1916 38%,#F5F3EF 38%)' }}
    >
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
        <h1 className="text-[32px] font-bold text-white leading-tight">איפוס סיסמה</h1>
        <p className="text-[14px] text-white/50 mt-1">בחר/י סיסמה חדשה לחשבון שלך</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex-1 bg-[#F5F3EF] px-5 pt-8 pb-10"
      >
        {success ? (
          <div className="bg-white rounded-3xl p-6 text-center" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
            <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-[22px] font-bold text-charcoal-900 mb-2">הסיסמה עודכנה</h2>
            <p className="text-[14px] text-charcoal-500 leading-relaxed mb-5">
              אפשר לחזור לאפליקציה ולהתחבר עם הסיסמה החדשה.
            </p>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold"
            >
              חזרה לכניסה
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <h2 className="text-[24px] font-bold text-charcoal-900 mb-6">סיסמה חדשה</h2>

            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center px-4">
                <Lock className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="סיסמה חדשה"
                  dir="ltr"
                  className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
                  disabled={!isReady || isSaving}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-charcoal-400 p-1"
                  disabled={!isReady || isSaving}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div
              className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center px-4">
                <Lock className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="אימות סיסמה"
                  dir="ltr"
                  className="flex-1 py-4 px-3 text-[15px] text-charcoal-900 placeholder-charcoal-400 bg-transparent focus:outline-none text-right"
                  disabled={!isReady || isSaving}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-[13px] font-medium px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            {!error && !isReady && (
              <div className="bg-charcoal-100 text-charcoal-500 text-[13px] font-medium px-4 py-3 rounded-2xl">
                מאמת את קישור האיפוס...
              </div>
            )}

            <button
              type="submit"
              disabled={!isReady || isSaving}
              className="w-full py-4 rounded-2xl bg-charcoal-900 text-white text-[15px] font-bold disabled:opacity-50 active:scale-[0.98] transition-transform mt-2"
              style={{ boxShadow: '0 4px 16px rgba(26,25,22,0.2)' }}
            >
              {isSaving ? 'שומר...' : 'שמירת סיסמה חדשה'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
