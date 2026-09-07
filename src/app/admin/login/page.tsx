'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@digitalizenepal.com');
  const [password, setPassword] = useState('adminpassword123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Admin login failed');
      }

      if (data.token) {
        try {
          localStorage.setItem('admin_token', data.token);
        } catch {}
      }

      window.location.href = '/admin';
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden selection:bg-brandPink-500 selection:text-white">
      {/* Ambient background light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-gold-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 right-6 z-20 flex items-center space-x-2 text-xs font-bold text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>

      <div className="relative z-10 w-full max-w-md bg-dark-850/90 backdrop-blur-xl border border-gold-500/30 rounded-3xl p-8 sm:p-9 shadow-premium-card">
        {/* Header */}
        <div className="text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-600 flex items-center justify-center text-black mx-auto mb-3.5 shadow-gold-glow border border-white/20">
            <Shield className="w-7 h-7" />
          </div>
          <span className="text-[10px] uppercase tracking-[0.35em] text-gold-400 font-serif font-bold">
            PLATFORM SUPER ADMIN
          </span>
          <h1 className="text-2xl font-serif font-extrabold text-white mt-1">
            SmartMenu Nepal
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-normal">
            Platform administration and restaurant management
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2.5 animate-slide-up">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@digitalizenepal.com"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 shadow-inner font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Secret Master Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 shadow-inner font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl gold-btn text-xs font-extrabold flex items-center justify-center space-x-2 mt-6 shadow-gold-glow"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Admin Portal'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 p-3 rounded-2xl bg-dark-900 border border-white/[0.06] text-center text-[11px] text-slate-400">
          <span className="font-semibold text-gold-400">Pre-seeded Root Admin:</span>
          <p className="mt-0.5 font-mono">admin@digitalizenepal.com / adminpassword123</p>
        </div>
      </div>
    </div>
  );
}
