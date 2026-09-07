'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Award,
  RefreshCw,
  Printer,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { formatNPR } from '@/lib/utils';

export default function HotelReportsPage() {
  const [reports, setReports] = useState<{
    summary: {
      totalRevenue: number;
      totalOrdersCount: number;
      completedCount: number;
      pendingCount: number;
      cancelledCount: number;
      averageOrderValue: number;
    };
    topItems: Array<{ name: string; quantity: number; revenue: number }>;
    dailyTrends: Array<{ date: string; sales: number; count: number }>;
  } | null>(null);

  const [selectedRange, setSelectedRange] = useState<'today' | '7days' | 'month' | 'all'>('7days');
  const [loading, setLoading] = useState(true);

  const fetchReports = async (range: string = selectedRange) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/hotel/reports?range=${range}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(selectedRange);
  }, []);

  const handlePrintReport = () => {
    window.print();
  };

  if (loading || !reports) {
    return (
      <div className="p-16 text-center">
        <RefreshCw className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-2 shadow-gold-glow" />
        <p className="text-xs text-slate-400">Compiling financial performance metrics...</p>
      </div>
    );
  }

  const { summary, topItems, dailyTrends } = reports;
  const maxDailySale = Math.max(...dailyTrends.map((d) => d.sales), 100);

  return (
    <div className="space-y-8 print:p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-white">
            Sales & Analytics Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Realtime revenue analytics, settled sales ledger, and best-performing menu items
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchReports(selectedRange)}
            className="px-4 py-2.5 rounded-xl dark-btn text-slate-300 text-xs font-semibold flex items-center space-x-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="px-5 py-2.5 rounded-xl gold-btn text-xs font-bold flex items-center space-x-2 shadow-gold-glow"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Financial Report</span>
          </button>
        </div>
      </div>

      {/* Time Period Filter Tabs */}
      <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 scrollbar-none print:hidden">
        {[
          { id: 'today', label: "Today's Shift" },
          { id: '7days', label: 'Last 7 Days (Weekly)' },
          { id: 'month', label: 'Last Month (30 Days)' },
          { id: 'all', label: 'All-Time Records' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedRange(tab.id as any);
              fetchReports(tab.id);
            }}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-2 ${
              selectedRange === tab.id
                ? 'gold-btn text-black shadow-gold-glow scale-105'
                : 'dark-btn text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-6 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-gold-500/30 shadow-gold-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-400">
              Total Revenue
            </span>
            <div className="w-9 h-9 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-black text-white mt-3">
            {formatNPR(summary.totalRevenue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">From fulfilled orders</p>
        </div>

        {/* Total Orders */}
        <div className="p-6 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] shadow-premium-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Orders
            </span>
            <div className="w-9 h-9 rounded-2xl bg-dark-800 border border-white/[0.06] text-slate-300 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-black text-white mt-3">
            {summary.totalOrdersCount}
          </div>
          <p className="text-[11px] text-emerald-400 mt-1.5 font-medium">
            {summary.completedCount} completed ({summary.cancelledCount} cancelled)
          </p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="p-6 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-brandPink-500/30 shadow-pink-glow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-brandPink-400">
              Average Ticket Size
            </span>
            <div className="w-9 h-9 rounded-2xl bg-brandPink-500/20 text-brandPink-400 flex items-center justify-center border border-brandPink-500/30">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-black text-white mt-3">
            {formatNPR(summary.averageOrderValue)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Average revenue per dining table</p>
        </div>

        {/* Completion Rate */}
        <div className="p-6 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] shadow-premium-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Fulfillment Rate
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-serif font-black text-white mt-3">
            {summary.totalOrdersCount > 0
              ? `${Math.round((summary.completedCount / summary.totalOrdersCount) * 100)}%`
              : '100%'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5">Kitchen completion success</p>
        </div>
      </div>

      {/* 7-Day Revenue Trend Chart */}
      <div className="p-8 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] shadow-premium-card">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2.5">
            <Calendar className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-extrabold text-white text-lg">
              Revenue Performance ({
                selectedRange === 'today'
                  ? "Today's Shift"
                  : selectedRange === '7days'
                  ? 'Last 7 Days'
                  : selectedRange === 'month'
                  ? 'Last Month (30 Days)'
                  : 'All-Time Records'
              })
            </h3>
          </div>
        </div>

        <div className="h-60 flex items-end justify-between gap-3 pt-6 pb-2">
          {dailyTrends.map((d, idx) => {
            const heightPercent = (d.sales / maxDailySale) * 100;
            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="text-[10px] text-gold-400 font-bold mb-2 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
                  {formatNPR(d.sales)}
                </div>
                <div className="w-full max-w-[48px] bg-dark-900 rounded-t-2xl overflow-hidden flex items-end justify-center h-full border-t border-x border-white/[0.05]">
                  <div
                    className="w-full bg-gradient-to-t from-gold-600 via-gold-500 to-brandPink-500 rounded-t-2xl transition-all duration-700 group-hover:brightness-125 shadow-gold-glow"
                    style={{ height: `${Math.max(heightPercent, 8)}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-300 font-bold mt-2.5 truncate w-full text-center">
                  {d.date}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">
                  {d.count} {d.count === 1 ? 'order' : 'orders'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top 8 Selling Dishes */}
      <div className="p-8 rounded-3xl bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] shadow-premium-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2.5">
            <Award className="w-5 h-5 text-gold-400" />
            <h3 className="font-serif font-extrabold text-white text-lg">
              Top Selling Dishes & Beverages
            </h3>
          </div>
          <span className="text-xs text-slate-400">Ranked by customer orders</span>
        </div>

        {topItems.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500">
            No item sales data yet
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {topItems.map((item, idx) => (
              <div key={idx} className="py-3.5 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3.5">
                  <span
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-serif font-black text-xs ${
                      idx === 0
                        ? 'gold-btn text-black shadow-gold-glow'
                        : idx === 1
                        ? 'bg-slate-300 text-black'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-dark-800 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-serif font-bold text-white text-sm">{item.name}</span>
                </div>

                <div className="flex items-center space-x-6">
                  <span className="text-slate-400 font-medium">{item.quantity} portions</span>
                  <span className="font-serif font-black text-gold-400 min-w-[90px] text-right text-sm">
                    {formatNPR(item.revenue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
