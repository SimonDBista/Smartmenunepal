'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { MessageSquare, X, ArrowRight, Volume2, Sparkles, User } from 'lucide-react';
import { useSocket } from '@/lib/socket';
import { playStaffMessageChime, unlockAudio } from '@/lib/audio';
import { formatTime } from '@/lib/utils';

interface ChatAlertItem {
  id: string;
  tableNumber: string;
  customerName?: string | null;
  messageText: string;
  createdAt: string | Date;
}

export default function ChatNotificationToast({ hotelId }: { hotelId?: string }) {
  const { socket } = useSocket();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [alerts, setAlerts] = useState<ChatAlertItem[]>([]);
  const audioUnlockedRef = useRef(false);

  // Auto-unlock Web Audio API on user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!audioUnlockedRef.current) {
        unlockAudio();
        audioUnlockedRef.current = true;
      }
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

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

  useEffect(() => {
    if (!socket || !hotelId) return;

    socket.emit('join_hotel', hotelId);

    const handleChatNotification = (data: any) => {
      if (!data || !data.message) return;

      const msg = data.message;
      // Only alert staff for incoming messages from customers
      if (msg.sender !== 'customer') return;

      const rawTable = String(data.tableNumber || msg.tableNumber || '').trim();
      const currentActiveTable = searchParams?.get('table') || '';

      // 1. Play distinct staff message chime ("Ding-Dong!")
      playStaffMessageChime();

      // 2. Trigger browser system desktop notification if permitted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`💬 Message from Table #${rawTable || 'Guest'}`, {
            body: `${data.customerName || 'Guest'}: ${msg.message}`,
            icon: '/favicon.ico',
          });
        } catch {}
      }

      // 3. If currently actively viewing this table on /dashboard/chat, don't obstruct the screen
      if (pathname === '/dashboard/chat' && currentActiveTable && currentActiveTable.toLowerCase() === rawTable.toLowerCase()) {
        return;
      }

      const alertItem: ChatAlertItem = {
        id: msg.id || `${Date.now()}-${Math.random()}`,
        tableNumber: rawTable,
        customerName: data.customerName || `Table #${rawTable}`,
        messageText: msg.message,
        createdAt: msg.createdAt || new Date(),
      };

      // Append to floating alerts (limit to 3 concurrent)
      setAlerts((prev) => [alertItem, ...prev.slice(0, 2)]);

      // Auto dismiss after 9 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== alertItem.id));
      }, 9000);
    };

    socket.on('chat_notification', handleChatNotification);

    return () => {
      socket.off('chat_notification', handleChatNotification);
    };
  }, [socket, hotelId, pathname, searchParams]);

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const openTableChat = (tableNumber: string) => {
    router.push(`/dashboard/chat?table=${encodeURIComponent(tableNumber)}`);
    setAlerts([]);
  };

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-24 sm:top-5 right-5 z-50 flex flex-col gap-3 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="pointer-events-auto bg-[#141824]/95 border-2 border-cyan-400/60 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden animate-in slide-in-from-top duration-300 backdrop-blur-xl"
          style={{
            boxShadow: '0 20px 40px -15px rgba(6, 182, 212, 0.35), 0 0 25px rgba(6, 182, 212, 0.2)',
          }}
        >
          {/* Top cyan progress animated bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-300 to-blue-400 animate-pulse" />

          {/* Header with Table Badge & Dismiss */}
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 animate-bounce">
                <MessageSquare className="w-5 h-5 fill-cyan-400 text-cyan-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-serif font-black uppercase tracking-wider text-cyan-300 flex items-center space-x-1">
                    <span>CUSTOMER MESSAGE</span>
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Live
                  </span>
                </div>
                <span className="text-[11px] text-stone-400">
                  {formatTime(alert.createdAt)} • {alert.customerName || 'Table Guest'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-serif font-black text-xs shadow-md">
                Table {alert.tableNumber || 'Desk'}
              </span>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
                title="Dismiss message alert"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message Text Content */}
          <div className="bg-[#0b0e14] rounded-2xl p-3 border border-white/5 mb-3 text-xs">
            <div className="flex items-center space-x-1.5 text-stone-400 text-[10px] mb-1">
              <User className="w-3 h-3 text-cyan-400" />
              <span>{alert.customerName || 'Guest'} says:</span>
            </div>
            <p className="text-stone-100 font-medium text-xs sm:text-sm line-clamp-3 leading-relaxed">
              &ldquo;{alert.messageText}&rdquo;
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={() => {
                unlockAudio();
                playStaffMessageChime();
              }}
              className="text-[11px] text-stone-400 hover:text-cyan-300 flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-stone-900 transition"
              title="Re-play message alert chime"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Chime</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => dismissAlert(alert.id)}
                className="px-3 py-1.5 rounded-xl dark-btn text-xs font-semibold text-stone-300 hover:text-white"
              >
                Dismiss
              </button>

              <button
                onClick={() => openTableChat(alert.tableNumber)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-xs font-bold text-white flex items-center space-x-1.5 shadow-lg shadow-cyan-500/25 transition"
              >
                <span>Reply to Table</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
