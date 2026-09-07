'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Smartphone,
  ChefHat,
  Globe,
  Box,
  ArrowRight,
  Utensils,
  Sparkles,
  Clock,
  ShieldCheck,
  ChevronRight,
  Activity,
  Star,
  QrCode,
} from 'lucide-react';
import FallingMicrogreens from '@/components/FallingMicrogreens';

export default function HomePage() {
  const [activeRoleTab, setActiveRoleTab] = useState<'customer' | 'staff'>('customer');

  return (
    <div className="min-h-screen bg-[#121316] text-stone-100 flex flex-col selection:bg-bronze-400 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#121316]/95 backdrop-blur-md border-b border-white/[0.08] px-6 lg:px-14 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl border border-bronze-400/40 bg-gradient-to-br from-bronze-400/20 to-transparent flex items-center justify-center text-bronze-400">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <span className="font-serif font-semibold text-stone-100 text-sm sm:text-base tracking-[0.16em] uppercase block leading-none">
              SmartMenu Nepal
            </span>
            <span className="text-[9px] text-bronze-400 font-medium tracking-[0.25em] uppercase mt-1 block">
              Smart Restaurant Suite
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold tracking-[0.16em] text-stone-400 uppercase">
          <a href="#features" className="hover:text-stone-100 transition">
            Platform
          </a>
          <a href="#experience" className="hover:text-stone-100 transition">
            Guest Experience
          </a>
          <a href="#operations" className="hover:text-stone-100 transition">
            Kitchen Live
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard/login"
            className="px-4 py-2 rounded-xl dark-outline-btn text-xs font-semibold tracking-wider uppercase transition"
          >
            Staff Login
          </Link>
          <Link
            href="/menu/sitan-dabaka-sekuwa?table=1"
            className="px-4 py-2 rounded-xl bronze-btn text-xs font-semibold tracking-wider uppercase text-white shadow-sm flex items-center space-x-1.5"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Demo Menu</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 pt-10 pb-16 lg:pt-14 lg:pb-24 text-left overflow-hidden border-b border-white/[0.06]">
        {/* Ambient atmospheric backlight */}
        <div className="absolute top-0 left-1/4 w-[700px] h-[350px] bg-bronze-400/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Realistic High-End White Ceramic Plate (Positioned matching reference exactly) */}
        <div className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden">
          <img
            src="/hero-plate.webp"
            alt="Artisan Seared Scallop with Puree and Microgreens"
            className="w-full h-full object-cover object-[80%_bottom] md:object-[82%_bottom] lg:object-right-bottom"
          />
          {/* Subtle edge fade gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#121316] via-transparent to-transparent opacity-80 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#121316] via-[#121316]/60 md:via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Dynamic Falling Microgreens Animation */}
        <FallingMicrogreens />

        <div className="max-w-7xl w-full mx-auto relative z-20">
          <div className="max-w-xl lg:max-w-2xl text-left">
            {/* Subtle Champagne Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-stone-900/90 border border-bronze-400/30 text-bronze-400 text-xs font-semibold mb-8 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-bronze-400 animate-pulse" />
              <span className="tracking-widest uppercase text-[10px]">
                Next-Generation Digital Hospitality
              </span>
              <span className="text-white/20">•</span>
              <span className="text-stone-400 text-[10px] font-normal">Contactless Table Dining</span>
            </div>

            {/* Main Title */}
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-[#FAF8F5] leading-[1.08] tracking-tight font-normal">
              Taste the <br />
              <span className="italic font-normal">Extraordinary.</span> <br />
              <span className="text-stone-300 font-serif text-3xl sm:text-5xl">
                Elevate Every Table.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-stone-400 text-sm sm:text-base mt-6 max-w-xl font-light leading-relaxed">
              A luxury digital dining and kitchen management platform designed for prestigious restaurants,
              boutique hotels, and modern lounges. Guests scan a tabletop QR code to explore curated dishes,
              order instantaneously, and communicate directly with staff.
            </p>

            {/* Call to action buttons */}
            <div className="mt-10 flex flex-wrap items-center justify-start gap-4">
              <Link
                href="/menu/sitan-dabaka-sekuwa?table=1"
                className="explore-menu-pill px-8 py-3.5 rounded-full text-xs font-bold tracking-[0.16em] uppercase text-charcoal-900 flex items-center space-x-2.5 shadow-md group"
              >
                <Smartphone className="w-4 h-4 text-charcoal-900" />
                <span>Explore Table Menu Demo</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/dashboard/login"
                className="px-6 py-3.5 rounded-full dark-outline-btn text-stone-200 text-xs font-semibold tracking-wider uppercase flex items-center space-x-2 transition"
              >
                <ChefHat className="w-4 h-4 text-bronze-400" />
                <span>Operations Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Metric Highlights Bar */}
      <div className="border-b border-white/[0.06] bg-[#121316] relative z-20 py-8 px-6 lg:px-14">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
          <div className="p-4 rounded-2xl bg-[#16171B]/90 backdrop-blur-md border border-white/[0.06]">
            <span className="text-xl sm:text-2xl font-serif text-stone-100 block">Instant</span>
            <span className="text-[11px] text-stone-400 font-medium">No App Download Needed</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#16171B]/90 backdrop-blur-md border border-white/[0.06]">
            <span className="text-xl sm:text-2xl font-serif text-bronze-400 block">Realtime</span>
            <span className="text-[11px] text-stone-400 font-medium">Instant Kitchen Alert</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#16171B]/90 backdrop-blur-md border border-white/[0.06]">
            <span className="text-xl sm:text-2xl font-serif text-stone-100 block">EN / NE</span>
            <span className="text-[11px] text-stone-400 font-medium">Bilingual Nepali Engine</span>
          </div>
          <div className="p-4 rounded-2xl bg-[#16171B]/90 backdrop-blur-md border border-white/[0.06]">
            <span className="text-xl sm:text-2xl font-serif text-stone-100 block">3D Food</span>
            <span className="text-[11px] text-stone-400 font-medium">Interactive Preview</span>
          </div>
        </div>
      </div>

      {/* Interactive Role Portals Section */}
      <section id="experience" className="max-w-6xl w-full mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.3em] text-bronze-400 font-semibold">
            Tailored Perspectives
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-stone-100 mt-2">
            Built for Discerning Guests & Busy Kitchens
          </h2>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex items-center justify-center p-1.5 bg-[#16171B] border border-white/[0.08] rounded-2xl max-w-sm mx-auto mb-10">
          {[
            { id: 'customer', label: '1. Diner Phone Menu', icon: Smartphone },
            { id: 'staff', label: '2. Kitchen Operations', icon: ChefHat },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeRoleTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveRoleTab(tab.id as any)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wider transition-all flex items-center justify-center space-x-2 ${
                  isActive
                    ? 'bronze-btn text-white shadow-sm'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Display Cards */}
        {activeRoleTab === 'customer' && (
          <div className="p-8 lg:p-12 rounded-3xl bg-[#16171B] border border-white/[0.08] shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-900 border border-bronze-400/30 text-bronze-400 text-xs font-medium">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Zero Friction Table Experience</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-normal text-stone-100 leading-snug">
                Elegantly Designed Tabletop Ordering & Real-Time Waiter Chat
              </h3>
              <p className="text-sm text-stone-400 leading-relaxed font-light">
                Guests scan their tabletop QR to immediately open the restaurant’s custom branded digital menu.
                No passwords, no app store downloads — just smooth browsing, custom notes, live updates, and direct chat.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-300">
                <div className="p-3.5 rounded-xl bg-[#121316] border border-white/[0.06] flex items-center space-x-2.5">
                  <Globe className="w-4 h-4 text-bronze-400" />
                  <span>English & Nepali Engine</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#121316] border border-white/[0.06] flex items-center space-x-2.5">
                  <Box className="w-4 h-4 text-bronze-400" />
                  <span>3D Food Interactive View</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#121316] border border-white/[0.06] flex items-center space-x-2.5">
                  <Activity className="w-4 h-4 text-bronze-400" />
                  <span>Live Status Progression</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#121316] border border-white/[0.06] flex items-center space-x-2.5">
                  <Star className="w-4 h-4 text-bronze-400" />
                  <span>Post-Dining Reviews</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/menu/sitan-dabaka-sekuwa?table=1"
                  className="px-6 py-3 rounded-xl bronze-btn text-xs font-semibold tracking-wider uppercase text-white inline-flex items-center space-x-2"
                >
                  <span>Experience Customer Menu Demo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Visual Preview Container */}
            <div className="p-6 rounded-2xl bg-[#121316] border border-white/[0.08] shadow-inner">
              <div className="text-center p-4 bg-[#16171B] rounded-2xl border border-white/[0.06] mb-4">
                <span className="text-[10px] uppercase font-serif text-bronze-400 tracking-widest block">
                  DEMO VENUE
                </span>
                <h4 className="font-serif font-bold text-stone-100 text-lg">
                  Sitan Dabaka Sekuwa Cornor
                </h4>
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-bronze-400/15 border border-bronze-400/30 text-bronze-400 text-[10px] font-bold">
                  TABLE #1 • LIVE MENU
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#18191F] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-stone-900 border border-white/10 flex items-center justify-center text-bronze-400 font-bold">
                      🍢
                    </div>
                    <div>
                      <span className="font-serif font-bold text-xs text-stone-100 block">
                        Special Mutton Sekuwa
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Charcoal-grilled Himalayan herbs
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-bronze-400">Rs. 550</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#18191F] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-stone-900 border border-white/10 flex items-center justify-center text-bronze-400 font-bold">
                      🥟
                    </div>
                    <div>
                      <span className="font-serif font-bold text-xs text-stone-100 block">
                        Chicken C-Momo
                      </span>
                      <span className="text-[10px] text-stone-400">
                        Spicy bell pepper and chilli glaze
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-bronze-400">Rs. 320</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeRoleTab === 'staff' && (
          <div className="p-8 lg:p-12 rounded-3xl bg-[#16171B] border border-white/[0.08] shadow-2xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center animate-fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-stone-900 border border-bronze-400/30 text-bronze-400 text-xs font-medium">
                <ChefHat className="w-3.5 h-3.5" />
                <span>Kitchen Display & Staff Hub</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-serif font-normal text-stone-100 leading-snug">
                Real-Time Order Audio Chimes, KOT Slips, and Instant Status Control
              </h3>
              <p className="text-sm text-stone-400 leading-relaxed font-light">
                Empower your kitchen staff and managers with immediate audio notifications the second a diner
                places an order, printable kitchen order tickets (KOT), and live table communications.
              </p>

              <div className="pt-2">
                <Link
                  href="/dashboard/login"
                  className="px-6 py-3 rounded-xl bronze-btn text-xs font-semibold tracking-wider uppercase text-white inline-flex items-center space-x-2"
                >
                  <span>Enter Operations Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#121316] border border-white/[0.08] shadow-inner">
              <div className="p-4 rounded-xl bg-[#18191F] border border-white/[0.06] mb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-bronze-400 font-bold uppercase tracking-wider block">
                    NEW ORDER ALERT • TABLE #3
                  </span>
                  <span className="text-sm font-serif font-bold text-stone-100">
                    2x Sekuwa Platter, 1x C-Momo
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  In Kitchen
                </span>
              </div>
              <p className="text-xs text-stone-500 text-center">
                Audio alerts fire automatically via WebSockets on kitchen screens.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-[#121316] border-t border-white/[0.08] py-8 text-center text-xs text-stone-500">
        <p>© {new Date().getFullYear()} SmartMenu Nepal. All rights reserved.</p>
      </footer>
    </div>
  );
}
