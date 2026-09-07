'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Hotel,
  Plus,
  ShieldCheck,
  Clock,
  AlertTriangle,
  ShoppingBag,
  TrendingUp,
  Search,
  Key,
  QrCode,
  Trash2,
  ExternalLink,
  RefreshCw,
  X,
  Copy,
  Check,
  CheckCircle2,
  Download,
  Sparkles,
} from 'lucide-react';
import { HotelData } from '@/lib/types';
import { formatNPR, formatDate } from '@/lib/utils';

export default function PlatformAdminDashboard() {
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [stats, setStats] = useState<{
    totalHotels: number;
    activeHotels: number;
    pendingHotels: number;
    expiredHotels: number;
    totalOrders: number;
    totalRevenue: number;
    totalMenuItems: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Hotel Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newHotelForm, setNewHotelForm] = useState({
    name: '',
    ownerEmail: '',
    phone: '',
    address: '',
    customSlug: '',
    initialPassword: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // New Hotel Created Success Modal
  const [createdHotelInfo, setCreatedHotelInfo] = useState<{
    hotel: HotelData;
    temporaryPassword: string;
  } | null>(null);

  // Reset Password Modal
  const [resetPasswordHotel, setResetPasswordHotel] = useState<HotelData | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordResetResult, setPasswordResetResult] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // View QR Modal
  const [selectedQRHotel, setSelectedQRHotel] = useState<{
    hotel: HotelData;
    qrDataUrl: string;
    targetUrl: string;
  } | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [hotelsRes, statsRes] = await Promise.all([
        fetch('/api/admin/hotels'),
        fetch('/api/admin/stats'),
      ]);

      if (hotelsRes.ok) {
        const hData = await hotelsRes.json();
        setHotels(hData.hotels || []);
      }

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHotelForm.name || !newHotelForm.ownerEmail) {
      alert('Hotel name and owner email are required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHotelForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create hotel');

      setIsAddModalOpen(false);
      setCreatedHotelInfo({
        hotel: data.hotel,
        temporaryPassword: data.temporaryPassword,
      });
      setNewHotelForm({
        name: '',
        ownerEmail: '',
        phone: '',
        address: '',
        customSlug: '',
        initialPassword: '',
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating hotel');
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (hotelId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setHotels((prev) =>
          prev.map((h) => (h.id === hotelId ? { ...h, status: newStatus as any } : h))
        );
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordHotel) return;

    setIsResetting(true);
    try {
      const res = await fetch(`/api/admin/hotels/${resetPasswordHotel.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: newPasswordInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordResetResult(data.newPassword);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleOpenQR = async (hotel: HotelData) => {
    setLoadingQR(true);
    try {
      const res = await fetch(`/api/admin/qr/${hotel.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedQRHotel({
          hotel,
          qrDataUrl: data.qrDataUrl,
          targetUrl: data.targetUrl,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQR(false);
    }
  };

  const handleDeleteHotel = async (hotelId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/hotels/${hotelId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setHotels((prev) => prev.filter((h) => h.id !== hotelId));
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredHotels = hotels.filter((h) => {
    const matchesStatus = statusFilter === 'all' || h.status === statusFilter;
    const matchesQuery =
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-white">
            Hotel & Restaurant Accounts
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Provision tenant accounts, toggle active subscriptions, and manage QR codes
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="px-4 py-2.5 rounded-xl dark-btn text-slate-300 text-xs font-semibold flex items-center space-x-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-xl gold-btn text-xs font-extrabold flex items-center space-x-2 shadow-gold-glow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hotel Account</span>
          </button>
        </div>
      </div>

      {/* Overview KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-5 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] shadow-premium-card">
            <span className="text-[11px] font-bold text-slate-400 block">Total Hotels</span>
            <span className="text-3xl font-serif font-black text-white mt-1 block">{stats.totalHotels}</span>
          </div>

          <div className="p-5 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-emerald-500/30 shadow-premium-card">
            <span className="text-[11px] font-bold text-emerald-400 block">Active Subscriptions</span>
            <span className="text-3xl font-serif font-black text-emerald-400 mt-1 block">{stats.activeHotels}</span>
          </div>

          <div className="p-5 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-yellow-500/30 shadow-premium-card">
            <span className="text-[11px] font-bold text-yellow-400 block">Pending Review</span>
            <span className="text-3xl font-serif font-black text-yellow-400 mt-1 block">{stats.pendingHotels}</span>
          </div>

          <div className="p-5 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-red-500/30 shadow-premium-card">
            <span className="text-[11px] font-bold text-red-400 block">Expired Accounts</span>
            <span className="text-3xl font-serif font-black text-red-400 mt-1 block">{stats.expiredHotels}</span>
          </div>

          <div className="p-5 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-brandPink-500/30 shadow-pink-glow">
            <span className="text-[11px] font-bold text-brandPink-400 block">Total Orders</span>
            <span className="text-3xl font-serif font-black text-white mt-1 block">{stats.totalOrders}</span>
          </div>

          <div className="p-5 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-gold-500/30 shadow-gold-glow">
            <span className="text-[11px] font-bold text-gold-400 block">Platform Volume</span>
            <span className="text-xl font-serif font-black text-gold-400 mt-1 block truncate">
              {formatNPR(stats.totalRevenue)}
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          {[
            { id: 'all', label: 'All Hotels' },
            { id: 'active', label: 'Active' },
            { id: 'pending', label: 'Pending' },
            { id: 'expired', label: 'Expired' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'gold-btn text-black shadow-gold-glow'
                  : 'dark-btn text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search hotel name, email, slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-dark-900 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 shadow-inner"
          />
        </div>
      </div>

      {/* Hotels Table */}
      <div className="bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-premium-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-dark-900/90 border-b border-surface-border text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Hotel / Restaurant</th>
                <th className="py-4 px-5">Owner Email & Phone</th>
                <th className="py-4 px-5">Subscription Status</th>
                <th className="py-4 px-5">Dishes / Orders</th>
                <th className="py-4 px-5">Onboarded</th>
                <th className="py-4 px-6 text-right">Admin Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredHotels.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-500">
                    No hotel accounts found
                  </td>
                </tr>
              ) : (
                filteredHotels.map((h) => (
                  <tr key={h.id} className="hover:bg-dark-800/50 transition">
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-dark-800 border border-gold-500/30 flex items-center justify-center font-bold text-gold-400 flex-shrink-0 shadow-inner">
                          <Hotel className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-serif font-bold text-white text-sm">{h.name}</div>
                          <div className="text-[11px] text-gold-400 font-mono">
                            /menu/{h.slug}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5">
                      <div className="text-slate-200 font-semibold">{h.ownerEmail}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{h.phone || 'No phone'}</div>
                    </td>

                    <td className="py-4 px-5">
                      <select
                        value={h.status}
                        onChange={(e) => handleStatusChange(h.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs border focus:outline-none cursor-pointer ${
                          h.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : h.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : 'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}
                      >
                        <option value="pending" className="bg-dark-900 text-yellow-300">
                          Pending
                        </option>
                        <option value="active" className="bg-dark-900 text-emerald-300">
                          Active
                        </option>
                        <option value="expired" className="bg-dark-900 text-red-300">
                          Expired
                        </option>
                      </select>
                    </td>

                    <td className="py-4 px-5">
                      <div className="text-slate-300">
                        <span className="font-bold text-white">{h._count?.orders || 0}</span> orders
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {h._count?.menuItems || 0} dishes on menu
                      </div>
                    </td>

                    <td className="py-4 px-5 text-slate-400 font-mono text-[11px]">
                      {formatDate(h.createdAt)}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenQR(h)}
                          title="Generate QR Code"
                          className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-gold-400 transition"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setResetPasswordHotel(h);
                            setNewPasswordInput('');
                            setPasswordResetResult(null);
                          }}
                          title="Reset Password"
                          className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 transition"
                        >
                          <Key className="w-4 h-4" />
                        </button>

                        <Link
                          href={`/menu/${h.slug}`}
                          target="_blank"
                          title="View Live Menu"
                          className="p-2 rounded-xl bg-dark-800 hover:bg-dark-750 text-slate-300 transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleDeleteHotel(h.id, h.name)}
                          title="Delete Hotel Account"
                          className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Hotel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-surface border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-dark-900 border-b border-surface-border flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Hotel className="w-5 h-5 text-gold-400" />
                <h2 className="font-serif font-extrabold text-white text-base">
                  Provision Hotel Account
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHotel} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Hotel / Restaurant Name <span className="text-brandPink-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pokhara Sekuwa & Lounge"
                  value={newHotelForm.name}
                  onChange={(e) => setNewHotelForm({ ...newHotelForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-gold-500 shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Owner Email Address <span className="text-brandPink-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@hotel.com"
                  value={newHotelForm.ownerEmail}
                  onChange={(e) => setNewHotelForm({ ...newHotelForm, ownerEmail: e.target.value })}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-gold-500 shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="98XXXXXXXX"
                    value={newHotelForm.phone}
                    onChange={(e) => setNewHotelForm({ ...newHotelForm, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-gold-500 shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Location / Address
                  </label>
                  <input
                    type="text"
                    placeholder="Lakeside, Pokhara"
                    value={newHotelForm.address}
                    onChange={(e) => setNewHotelForm({ ...newHotelForm, address: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-900 border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-gold-500 shadow-inner"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-dark-900 rounded-2xl border border-white/[0.06] text-xs text-slate-400">
                <span className="font-semibold text-gold-400">Automated Provisioning:</span>
                <p className="mt-1">
                  A custom URL slug and secure initial password will be auto-generated with status <strong>Pending</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-dark-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-6 py-2.5 rounded-xl gold-btn text-xs font-extrabold shadow-gold-glow"
                >
                  {isCreating ? 'Provisioning...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Created Hotel Modal */}
      {createdHotelInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface border border-gold-500/40 rounded-3xl shadow-gold-glow p-7 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3.5">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="font-serif font-extrabold text-white text-lg">
              Hotel Account Provisioned!
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Provide these login details to the restaurant owner:
            </p>

            <div className="my-5 p-4 bg-dark-900 rounded-2xl border border-white/[0.08] text-left space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block">Hotel:</span>
                <span className="font-serif font-bold text-white text-sm">{createdHotelInfo.hotel.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Login Email:</span>
                <span className="font-mono text-gold-400 font-bold">{createdHotelInfo.hotel.ownerEmail}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Temporary Password:</span>
                <span className="font-mono text-brandPink-400 text-base font-extrabold">
                  {createdHotelInfo.temporaryPassword}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Customer Menu URL:</span>
                <span className="font-mono text-slate-300">
                  /menu/{createdHotelInfo.hotel.slug}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                copyToClipboard(
                  `Hotel: ${createdHotelInfo.hotel.name}\nDashboard: ${window.location.origin}/dashboard/login\nEmail: ${createdHotelInfo.hotel.ownerEmail}\nPassword: ${createdHotelInfo.temporaryPassword}`
                );
              }}
              className="w-full py-3 rounded-2xl gold-btn text-xs font-bold flex items-center justify-center space-x-2 mb-2 shadow-gold-glow"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
            </button>

            <button
              onClick={() => setCreatedHotelInfo(null)}
              className="w-full py-2 rounded-xl bg-dark-800 text-slate-400 hover:text-white text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-surface border border-white/[0.1] rounded-3xl shadow-2xl p-7">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-surface-border">
              <h3 className="font-serif font-bold text-white text-base">
                Reset Password: {resetPasswordHotel.name}
              </h3>
              <button
                onClick={() => setResetPasswordHotel(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordResetResult ? (
              <div className="p-4 bg-dark-900 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">New Password Generated:</p>
                <div className="p-3 bg-dark-950 rounded-xl font-mono text-gold-400 font-extrabold text-base">
                  {passwordResetResult}
                </div>
                <button
                  onClick={() => copyToClipboard(passwordResetResult)}
                  className="px-5 py-2.5 rounded-xl gold-btn text-xs font-bold"
                >
                  {copied ? 'Copied!' : 'Copy Password'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter a new custom password, or leave empty to auto-generate a strong password.
                </p>
                <input
                  type="text"
                  placeholder="Optional custom password..."
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-900 border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                />
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-3 rounded-2xl gold-btn text-xs font-bold shadow-gold-glow"
                >
                  {isResetting ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedQRHotel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-surface border border-gold-500/40 rounded-3xl shadow-gold-glow p-7 text-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-white text-base">
                {selectedQRHotel.hotel.name} QR
              </h3>
              <button
                onClick={() => setSelectedQRHotel(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-3.5 bg-white rounded-2xl shadow-2xl inline-block">
              <img
                src={selectedQRHotel.qrDataUrl}
                alt="QR Code"
                className="w-56 h-56 object-contain rounded-xl"
              />
            </div>

            <p className="text-xs font-mono text-gold-400 break-all mb-4">
              {selectedQRHotel.targetUrl}
            </p>

            <div className="space-y-2">
              <a
                href={selectedQRHotel.qrDataUrl}
                download={`${selectedQRHotel.hotel.slug}-menu-qr.png`}
                className="w-full py-3 rounded-2xl gold-btn text-xs font-bold flex items-center justify-center space-x-2 block shadow-gold-glow"
              >
                <Download className="w-4 h-4" />
                <span>Download QR PNG</span>
              </a>

              <button
                onClick={() => setSelectedQRHotel(null)}
                className="w-full py-2 rounded-xl bg-dark-800 text-slate-400 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
