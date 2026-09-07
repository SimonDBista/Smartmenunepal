'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, LogOut, ExternalLink, Sparkles } from 'lucide-react';
import { AdminData } from '@/lib/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAdminAuth() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/auth/admin/me', { headers });
        if (!res.ok) {
          router.push('/admin/login');
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    checkAdminAuth();
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('admin_token');
      } catch {}
      await fetch('/api/auth/admin/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch {
      window.location.href = '/admin/login';
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mb-4 shadow-gold-glow" />
        <p className="text-sm font-serif font-bold text-white">Opening Admin Console...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-brandPink-500 selection:text-white">
      {/* Admin Topbar */}
      <header className="sticky top-0 z-30 bg-dark-950/90 backdrop-blur-xl border-b border-white/[0.08] px-6 py-3.5 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold-400 via-amber-500 to-brandPink-500 flex items-center justify-center text-black font-extrabold shadow-gold-glow border border-white/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-serif font-extrabold text-sm text-white tracking-wide uppercase">
                SmartMenu Nepal
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-gold-500/20 border border-gold-500/40 text-gold-300 text-[10px] font-extrabold">
                Super Admin
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Admin • {admin?.email}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl dark-btn text-slate-300 text-xs font-semibold flex items-center space-x-1.5 hover:text-white"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
          </Link>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Admin Page Content */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
