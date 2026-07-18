import React, { useState } from 'react';
import { HiLockClosed, HiMail } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast.error('Please enter password');
      return;
    }
    
    setLoading(true);
    try {
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // We can use the same PIN since it's a simple restricted access app
      // Or we can check against a specific password
      if (password === 'zsadmin62376' || password === '62376') {
        toast.success('Welcome to ZS Trading!');
        if (onLoginSuccess) onLoginSuccess();
      } else {
        toast.error('Invalid password');
      }
    } catch (err) {
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-card-light p-6 space-y-6 animate-slide-up">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-accent-gold to-accent-champagne rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.3)] mb-4">
            <HiLockClosed className="text-3xl text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">ZS Trading</h1>
          <p className="text-sm text-accent-champagne/80 font-medium">Restricted Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-3">
            {/* Email field removed as we only need password now */}
            <div className="relative">
              <HiLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="input-field w-full pl-11 pr-4 py-3.5 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-black
              bg-gradient-to-r from-accent-gold to-accent-champagne
              hover:opacity-90 transition-all duration-200 active:scale-[0.98]
              shadow-[0_4px_20px_rgba(212,175,55,0.2)] disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
