'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, ArrowRight, Volume2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { playOrderBell, unlockAudio } from '@/lib/audio';
import { OrderData, OrderItem } from '@/lib/types';
import { formatNPR, formatTime } from '@/lib/utils';

interface OrderAlertItem {
  id: string;
  tableNumber: string;
  customerName?: string | null;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string | Date;
}

export default function OrderNotificationToast({ hotelId }: { hotelId?: string }) {
  const { socket } = useSocket();
  const router = useRouter();
  const [activeAlerts, setActiveAlerts] = useState<OrderAlertItem[]>([]);
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const audioUnlockedRef = useRef(false);

  // Auto-unlock audio on first user touch/click anywhere on document
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!audioUnlockedRef.current) {
        unlockAudio();
        audioUnlockedRef.current = true;
      }
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    // Request browser system notification permission if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  // Listen for incoming orders via Socket.io
  useEffect(() => {
    if (!socket || !hotelId) return;

    socket.emit('join_hotel', hotelId);

    const handleNewOrder = (order: OrderData) => {
      // 1. Play ringing counter bell unless explicitly muted
      if (!isSoundMuted) {
        playOrderBell();
      }

      // 2. Parse ordered items
      let parsedItems: OrderItem[] = [];
      try {
        parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || [];
      } catch {
        parsedItems = [];
      }

      const alertItem: OrderAlertItem = {
        id: order.id,
        tableNumber: order.tableNumber,
        customerName: order.customerName,
        items: parsedItems,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt || new Date(),
      };

      // 3. Trigger Browser Desktop Push Notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const itemSummary = parsedItems.map((it) => `${it.quantity}x ${it.name}`).slice(0, 3).join(', ');
          new Notification(`🛎️ New Order: Table #${order.tableNumber}`, {
            body: `${order.customerName || 'Guest'} (${itemSummary}) - NPR ${order.totalAmount}`,
            icon: '/favicon.ico',
          });
        } catch {}
      }

      // 4. Append to active floating alerts
      setActiveAlerts((prev) => [alertItem, ...prev.slice(0, 4)]);

      // Auto-dismiss after 12 seconds
      setTimeout(() => {
        setActiveAlerts((prev) => prev.filter((a) => a.id !== order.id));
      }, 12000);
    };

    socket.on('new_order', handleNewOrder);

    return () => {
      socket.off('new_order', handleNewOrder);
    };
  }, [socket, hotelId, isSoundMuted]);

  const dismissAlert = (id: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const viewOrder = (tableNumber: string) => {
    router.push('/dashboard');
    setActiveAlerts([]);
  };

  const handleTestBell = () => {
    unlockAudio();
    playOrderBell();
  };

  if (activeAlerts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      {activeAlerts.map((alert) => {
        return (
          <div
            key={alert.id}
            className="pointer-events-auto bg-[#14151a] border-2 border-gold-400/60 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden animate-in slide-in-from-top duration-300 backdrop-blur-xl"
            style={{
              boxShadow: '0 20px 40px -15px rgba(234, 179, 8, 0.3), 0 0 25px rgba(234, 179, 8, 0.15)',
            }}
          >
            {/* Top golden progress animation bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-gold-400 to-amber-300 animate-pulse" />

            {/* Header with Table Badge & Dismiss */}
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gold-400/20 text-gold-300 border border-gold-400/40 flex items-center justify-center shrink-0 shadow-gold-glow animate-bounce">
                  <Bell className="w-5 h-5 fill-gold-400 text-gold-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-serif font-black uppercase tracking-wider text-gold-300 flex items-center space-x-1">
                      <span>NEW ORDER RECEIVED!</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-400">
                    {formatTime(alert.createdAt)} • Live Alert
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="px-3 py-1 rounded-xl bg-gold-500 text-black font-serif font-black text-xs shadow-gold-glow">
                  Table {alert.tableNumber}
                </span>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
                  title="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer & Ordered Items Breakdown */}
            <div className="bg-[#0b0c0e] rounded-2xl p-3 border border-white/5 mb-3 text-xs">
              <div className="flex items-center justify-between font-bold text-white mb-1.5">
                <span className="text-stone-300 truncate">
                  {alert.customerName ? `Guest: ${alert.customerName}` : 'Walk-in Guest'}
                </span>
                <span className="font-serif font-black text-emerald-400 text-sm whitespace-nowrap">
                  {formatNPR(alert.totalAmount)}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {alert.items.length > 0 ? (
                  alert.items.map((it, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-stone-900 border border-white/10 text-[11px] text-stone-200"
                    >
                      <span className="font-bold text-gold-400">{it.quantity}×</span>
                      <span className="truncate max-w-[130px]">{it.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-stone-400 text-[11px]">Food & Beverage Items</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                onClick={handleTestBell}
                className="text-[11px] text-stone-400 hover:text-gold-300 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-stone-900 transition"
                title="Ring service bell again"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Re-Ring Bell</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="px-3 py-1.5 rounded-xl dark-btn text-xs font-semibold text-stone-300 hover:text-white"
                >
                  Dismiss
                </button>

                <button
                  onClick={() => viewOrder(alert.tableNumber)}
                  className="px-4 py-1.5 rounded-xl gold-btn text-xs font-bold text-black flex items-center space-x-1.5 shadow-gold-glow"
                >
                  <span>View Order</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
