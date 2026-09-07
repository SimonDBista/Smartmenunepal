'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, AlertCircle, Check, ArrowLeft, Utensils } from 'lucide-react';

export default function HotelLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('sitan@sekuwacornor.com');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/hotel/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      if (data.token) {
        try {
          localStorage.setItem('hotel_token', data.token);
        } catch {}
      }

      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121316] text-stone-100 flex items-center justify-center p-4 relative overflow-hidden selection:bg-gold-500 selection:text-black">
      {/* Subtle atmospheric ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gold-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-6 right-6 z-20 flex items-center space-x-2 text-xs font-semibold tracking-wider text-stone-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4 text-gold-400" />
        <span>Return to Home</span>
      </Link>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-sm bg-[#16171B] border border-white/[0.08] rounded-3xl p-8 sm:p-9 shadow-2xl backdrop-blur-xl">
        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-2xl bg-gold-400/10 border border-gold-400/30 text-gold-400 flex items-center justify-center mx-auto mb-3">
            <Utensils className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-serif font-semibold block mb-1">
            STAFF PORTAL
          </span>
          <h1 className="text-3xl font-serif font-bold text-white tracking-wider uppercase">
            LOGIN
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-light">Hotel & Kitchen Operations Hub</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5 animate-slide-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email / Username Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-500">
              <User className="w-4 h-4" />
            </div>
            <input
              type="email"
              required
              placeholder="Username / Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#111216] border border-white/10 rounded-full text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition shadow-inner font-normal"
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-stone-500">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#111216] border border-white/10 rounded-full text-xs sm:text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 transition shadow-inner font-normal"
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center space-x-2.5 pt-1">
            <button
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className={`w-4 h-4 rounded-md border border-gold-400/60 flex items-center justify-center transition ${
                rememberMe ? 'bg-gold-400' : 'bg-transparent'
              }`}
            >
              {rememberMe && <Check className="w-3 h-3 text-black stroke-[3]" />}
            </button>
            <label
              onClick={() => setRememberMe(!rememberMe)}
              className="text-xs text-stone-300 font-medium cursor-pointer select-none"
            >
              Remember me
            </label>
          </div>

          {/* Sign In Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full gold-btn text-white font-semibold text-xs tracking-wider uppercase shadow-gold-glow disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>

          {/* Forget Password */}
          <div className="text-center pt-1">
            <span className="text-xs text-stone-400 hover:text-stone-200 cursor-pointer transition">
              Forgot your password?
            </span>
          </div>

          {/* Footer Note */}
          <div className="pt-4 border-t border-white/[0.08] text-center text-xs text-stone-400">
            <span>Don't have an account? </span>
            <span className="text-gold-400 font-semibold hover:underline cursor-pointer">
              Contact Administrator
            </span>
          </div>
        </form>

        {/* Demo Credentials Box */}
        <div className="mt-6 p-3 rounded-2xl bg-[#111216] border border-gold-400/25 text-center text-[11px] text-gold-400">
          <p className="font-semibold">Pre-loaded Demo Credentials:</p>
          <p className="text-stone-400 mt-0.5 font-mono text-[10px]">sitan@sekuwacornor.com | password123</p>
        </div>
      </div>
    </div>
  );
}
