'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag,
  UtensilsCrossed,
  MessageSquare,
  Star,
  BarChart3,
  QrCode,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ShieldAlert,
  Utensils,
  Bell,
} from 'lucide-react';
import { HotelData } from '@/lib/types';
import OrderNotificationToast from '@/components/OrderNotificationToast';
import { playOrderBell, unlockAudio } from '@/lib/audio';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === '/dashboard/login';

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }

    async function checkAuth() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('hotel_token') : null;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/auth/hotel/me', { headers });
        if (!res.ok) {
          router.push('/dashboard/login');
          return;
        }
        const data = await res.json();
        setHotel(data.hotel);
      } catch {
        router.push('/dashboard/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [isLoginPage, router]);

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem('hotel_token');
      } catch {}
      await fetch('/api/auth/hotel/logout', { method: 'POST' });
      window.location.href = '/dashboard/login';
    } catch {
      window.location.href = '/dashboard/login';
    }
  };

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-bronze-400/20 border-t-bronze-400 animate-spin mb-4" />
        <p className="text-sm font-serif tracking-wider uppercase text-stone-300">
          Opening Staff Dashboard...
        </p>
      </div>
    );
  }

  // Account Inactivity Guard
  if (hotel && hotel.status !== 'active') {
    return (
      <div className="min-h-screen bg-[#121316] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#16171B] border border-amber-500/30 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-100 mb-2">Account Inactive</h2>
          <p className="text-[11px] uppercase tracking-widest text-amber-400 font-bold mb-3">
            STATUS: {hotel.status.toUpperCase()}
          </p>
          <p className="text-xs text-stone-300 mb-6 leading-relaxed">
            Your restaurant subscription for <strong>{hotel.name}</strong> is currently pending or expired. Please reach out to the platform admin to activate access.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:admin@digitalizenepal.com"
              className="w-full py-3 rounded-xl bronze-btn text-xs font-semibold uppercase tracking-wider block"
            >
              Contact Support
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-stone-850 text-stone-400 hover:text-white text-xs font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Live Orders', href: '/dashboard', icon: ShoppingBag },
    { label: 'Menu Manager', href: '/dashboard/menu', icon: UtensilsCrossed },
    { label: 'Live Chat', href: '/dashboard/chat', icon: MessageSquare },
    { label: 'Reviews & Ratings', href: '/dashboard/feedback', icon: Star },
    { label: 'Sales Reports', href: '/dashboard/reports', icon: BarChart3 },
    { label: 'Menu QR Code', href: '/dashboard/qr', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-[#121316] text-stone-100 flex selection:bg-bronze-400 selection:text-black">
      {/* Desktop Luxury Sidebar */}
      <aside className="hidden lg:flex w-72 flex-col bg-[#121316] border-r border-white/[0.07] p-5 sticky top-0 h-screen justify-between z-20">
        <div>
          {/* Brand Header */}
          <div className="p-3.5 bg-[#16171B] rounded-2xl border border-white/[0.06] mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-bronze-400/15 border border-bronze-400/40 flex items-center justify-center text-bronze-400 font-serif font-bold text-lg">
                <Utensils className="w-5 h-5" />
              </div>
              <div className="leading-tight overflow-hidden">
                <span className="font-serif font-semibold text-sm text-stone-100 tracking-wide block truncate">
                  {hotel?.name || 'Restaurant Dashboard'}
                </span>
                <span className="text-[9px] text-bronze-400 font-semibold tracking-[0.2em] uppercase mt-0.5 block">
                  Staff Operations Hub
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3.5 px-4 py-3 rounded-2xl text-xs font-semibold tracking-wider transition-all ${
                    isActive
                      ? 'bronze-btn text-white shadow-sm'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-[#16171B]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/[0.06] space-y-2.5">
          {/* Order Alert Bell Status & Test Button */}
          <button
            onClick={() => {
              unlockAudio();
              playOrderBell();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gold-400/10 hover:bg-gold-400/20 border border-gold-400/30 text-gold-300 text-xs font-bold transition group shadow-gold-glow"
            title="Click to test order bell sound and activate audio alert"
          >
            <span className="flex items-center space-x-2">
              <Bell className="w-3.5 h-3.5 text-gold-400 group-hover:animate-bounce" />
              <span>Order Bell Alert</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-gold-400/20 text-[10px] font-mono font-bold text-gold-300">
              Test Bell
            </span>
          </button>

          {hotel && (
            <Link
              href={`/menu/${hotel.slug}`}
              target="_blank"
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#16171B] hover:bg-[#1B1D23] border border-white/[0.06] text-stone-300 text-xs font-semibold transition group"
            >
              <span>View Customer Menu</span>
              <ExternalLink className="w-3.5 h-3.5 text-bronze-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-[#121316]/95 backdrop-blur-xl border-b border-white/[0.07] px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-bronze-400/20 border border-bronze-400/40 flex items-center justify-center text-bronze-400 font-bold font-serif text-sm">
              <Utensils className="w-4 h-4" />
            </div>
            <div className="max-w-[180px] truncate">
              <span className="font-serif font-bold text-xs text-white block truncate">
                {hotel?.name}
              </span>
              <span className="text-[9px] text-bronze-400 uppercase tracking-wider font-semibold">
                Staff Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                unlockAudio();
                playOrderBell();
              }}
              className="p-2 rounded-xl bg-gold-400/10 border border-gold-400/30 text-gold-400 text-xs flex items-center justify-center"
              title="Test Order Bell Sound"
            >
              <Bell className="w-4 h-4" />
            </button>
            {hotel && (
              <Link
                href={`/menu/${hotel.slug}`}
                target="_blank"
                className="p-2 rounded-xl bg-[#16171B] border border-white/[0.06] text-bronze-400 text-xs"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-xl bg-[#16171B] border border-white/[0.06] text-stone-300"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-[#16171B] border-b border-white/[0.08] p-4 space-y-2 animate-fade-in">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-2xl text-xs font-semibold transition ${
                    isActive
                      ? 'bronze-btn text-white shadow-sm'
                      : 'text-stone-300 bg-[#121316]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-red-400 bg-red-500/10 text-xs font-semibold mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Floating Order Notification Toast & Bell Alert */}
        <OrderNotificationToast hotelId={hotel?.id} />

        {/* Page Main Content */}
        <main className="p-4 sm:p-6 lg:p-10 flex-1 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
