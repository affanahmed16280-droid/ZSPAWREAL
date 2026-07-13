import React, { useState } from 'react';
import { HiLockClosed, HiUser } from 'react-icons/hi';
import toast from 'react-hot-toast';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === 'zsronex' && password === '16280') {
      toast.success('Welcome to ZS Trading!');
      onLogin();
    } else {
      toast.error('Invalid username or password');
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
            <div className="relative">
              <HiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 text-lg" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="input-field w-full pl-11 pr-4 py-3.5 text-sm"
                autoCapitalize="none"
              />
            </div>
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
            className="w-full py-3.5 rounded-xl text-sm font-bold text-black
              bg-gradient-to-r from-accent-gold to-accent-champagne
              hover:opacity-90 transition-all duration-200 active:scale-[0.98]
              shadow-[0_4px_20px_rgba(212,175,55,0.2)]"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
