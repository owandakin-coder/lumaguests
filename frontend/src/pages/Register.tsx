import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

interface RegisterProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
  onRegister: (email: string, password: string, name?: string) => Promise<void>;
}

export const Register = ({ onSuccess, onSwitchToLogin, onRegister }: RegisterProps) => {
  const [formData, setFormData] = useState<RegisterInput>({
    email: '',
    password: '',
    name: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await onRegister(formData.email, formData.password, formData.name);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-charcoal-900">Create Account</h1>
        <p className="text-charcoal-600 mt-2">Join Luma Guests today</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-charcoal-900 mb-2">Name (Optional)</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-charcoal-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 transition"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-charcoal-900 mb-2">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-charcoal-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 transition"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold text-charcoal-900 mb-2">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-charcoal-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-12 pr-12 py-3 rounded-lg border border-charcoal-200 bg-white focus:outline-none focus:ring-2 focus:ring-gold-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-charcoal-500 mt-1">At least 6 characters</p>
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm"
          >
            {error}
          </motion.div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 rounded-lg bg-gold-500 text-white font-semibold hover:bg-gold-600 transition disabled:opacity-50 mt-6"
        >
          {loading ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>

      {/* Switch to Login */}
      <p className="text-center text-charcoal-600 mt-6">
        Already have an account?{' '}
        <button
          onClick={onSwitchToLogin}
          className="text-gold-600 font-semibold hover:text-gold-700"
        >
          Sign in
        </button>
      </p>
    </motion.div>
  );
};
