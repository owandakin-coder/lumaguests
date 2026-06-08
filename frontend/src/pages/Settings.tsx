import { motion } from 'framer-motion';
import { Settings as SettingsIcon } from 'lucide-react';

export const Settings = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-charcoal-900">Settings</h1>
        <p className="text-charcoal-600 mt-2">Manage your app preferences</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-6 border border-charcoal-100">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-6 h-6 text-gold-600" />
            <h2 className="text-lg font-semibold text-charcoal-900">App Information</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2">
              <span className="text-charcoal-600">App Name</span>
              <span className="font-medium text-charcoal-900">Luma Guests</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-charcoal-100 pt-2">
              <span className="text-charcoal-600">Version</span>
              <span className="font-medium text-charcoal-900">1.0.0</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-charcoal-100 pt-2">
              <span className="text-charcoal-600">API Status</span>
              <span className="inline-flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium text-green-700">Connected</span>
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-charcoal-100">
          <h2 className="text-lg font-semibold text-charcoal-900 mb-4">About</h2>
          <p className="text-charcoal-600 text-sm leading-relaxed">
            Luma Guests is a premium guest-list management application designed to help you organize
            and track event guests with ease. Built with care for a seamless, elegant experience.
          </p>
        </div>

        <div className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-2xl p-6 border border-gold-200">
          <h3 className="font-semibold text-charcoal-900 mb-2">✨ Premium Experience</h3>
          <p className="text-sm text-charcoal-600">
            Enjoy a beautifully designed interface with real-time synchronization and powerful event
            management features.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
