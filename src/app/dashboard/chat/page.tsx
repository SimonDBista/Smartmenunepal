'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  MessageSquare,
  Send,
  User,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { OrderData, ChatMessageData } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/utils';
import { useSocket } from '@/lib/socket';
import { playChime } from '@/lib/audio';

export default function HotelLiveChatCenter() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs text-slate-400">
          <RefreshCw className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-2 shadow-gold-glow" />
          Loading chat inbox...
        </div>
      }
    >
      <HotelLiveChatContent />
    </Suspense>
  );
}

function HotelLiveChatContent() {
  const searchParams = useSearchParams();
  const initialOrderId = searchParams?.get('orderId') || '';

  const [conversations, setConversations] = useState<OrderData[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [replyText, setReplyText] = useState('');
  const [hotelId, setHotelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/hotel/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setHotelId(meData.hotel.id);
      }

      const res = await fetch('/api/hotel/chat');
      if (res.ok) {
        const data = await res.json();
        const convs: OrderData[] = data.conversations || [];
        setConversations(convs);

        if (initialOrderId) {
          const match = convs.find((c) => c.id === initialOrderId);
          if (match) setSelectedOrder(match);
        } else if (convs.length > 0 && !selectedOrder) {
          setSelectedOrder(convs[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedOrder) return;

    async function fetchOrderMessages() {
      try {
        const res = await fetch(`/api/hotel/chat?orderId=${selectedOrder?.id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (err) {
        console.error(err);
      }
    }

    fetchOrderMessages();
  }, [selectedOrder]);

  useEffect(() => {
    if (!socket || !hotelId) return;

    socket.emit('join_hotel', hotelId);

    if (selectedOrder) {
      socket.emit('join_order', selectedOrder.id);
    }

    const handleChatNotification = (data: {
      orderId: string;
      tableNumber?: string;
      customerName?: string;
      message: ChatMessageData;
    }) => {
      if (selectedOrder && data.orderId === selectedOrder.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }

      if (data.message.sender === 'customer') {
        playChime('message');
      }

      fetchConversations();
    };

    socket.on('chat_notification', handleChatNotification);
    socket.on('chat_message', (msg: ChatMessageData) => {
      if (selectedOrder && msg.orderId === selectedOrder.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.off('chat_notification', handleChatNotification);
    };
  }, [socket, hotelId, selectedOrder]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedOrder || isSending) return;

    const messageText = replyText.trim();
    setReplyText('');
    setIsSending(true);

    try {
      const res = await fetch('/api/hotel/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          message: messageText,
        }),
      });

      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    return (
      c.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.customerName && c.customerName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-white">
            Table Live Chat Desk
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Realtime two-way messaging with dining guests
          </p>
        </div>

        <button
          onClick={fetchConversations}
          className="px-4 py-2 rounded-xl dark-btn text-slate-300 text-xs font-semibold flex items-center space-x-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync</span>
        </button>
      </div>

      {/* Main Split Chat Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 h-[660px] bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-premium-card">
        {/* Left Side: Conversations List */}
        <div className="md:col-span-1 border-r border-surface-border flex flex-col bg-dark-900/90">
          <div className="p-4 border-b border-surface-border">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search table or guest..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-dark-850 border border-white/[0.06] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 shadow-inner"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredConversations.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">
                No active conversations yet
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = selectedOrder?.id === conv.id;
                const lastMsg = conv.chatMessages?.[0];
                return (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedOrder(conv)}
                    className={`w-full p-4 text-left transition flex items-start space-x-3.5 ${
                      isSelected
                        ? 'bg-dark-800 border-l-4 border-gold-500 shadow-inner'
                        : 'hover:bg-dark-850/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-dark-950 border border-gold-500/30 flex items-center justify-center font-serif font-black text-xs text-gold-400 flex-shrink-0 shadow-inner">
                      T#{conv.tableNumber}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-white truncate">
                          {conv.customerName || `Table ${conv.tableNumber}`}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatTime(lastMsg.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 truncate mt-0.5 font-normal">
                        {lastMsg
                          ? `${lastMsg.sender === 'staff' ? 'You: ' : ''}${lastMsg.message}`
                          : 'Order placed'}
                      </p>

                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className="text-[9px] uppercase px-2 py-0.5 rounded-full bg-dark-950 text-slate-400 font-bold border border-white/[0.06]">
                          {conv.status}
                        </span>
                        <span className="text-[10px] text-gold-400 font-bold font-mono">
                          Order #{conv.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Thread */}
        <div className="md:col-span-2 flex flex-col justify-between bg-dark-950/60">
          {selectedOrder ? (
            <>
              {/* Thread Top Bar */}
              <div className="p-4 bg-dark-900/90 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brandPink-500 to-gold-500 flex items-center justify-center text-white font-serif font-black text-sm shadow-pink-glow">
                    #{selectedOrder.tableNumber}
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-sm text-white">
                      Table #{selectedOrder.tableNumber} — {selectedOrder.customerName || 'Dining Guest'}
                    </h2>
                    <p className="text-[11px] text-gold-400 font-medium font-mono">
                      Order ID: #{selectedOrder.id} • Status: {selectedOrder.status}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message History */}
              <div className="flex-1 p-5 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center">
                    <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-gold-400" />
                    <p className="font-semibold text-slate-400">No messages in this thread yet</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Type below to send a message to Table #{selectedOrder.tableNumber}
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isStaff = msg.sender === 'staff';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-500 mb-0.5 px-1 font-mono">
                          {isStaff ? 'Staff / Reception' : `Customer (Table #${selectedOrder.tableNumber})`}{' '}
                          • {formatTime(msg.createdAt)}
                        </span>
                        <div
                          className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isStaff
                              ? 'bg-gold-500 text-black font-semibold rounded-br-none shadow-gold-glow'
                              : 'bg-dark-850 text-slate-200 border border-white/[0.08] rounded-bl-none'
                          }`}
                        >
                          {msg.message}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Input Bar */}
              <form
                onSubmit={handleSendReply}
                className="p-4 bg-dark-900/90 border-t border-surface-border flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder={`Send reply to Table #${selectedOrder.tableNumber}...`}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-dark-850 border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="px-6 py-2.5 rounded-xl gold-btn text-xs font-bold flex items-center space-x-1.5 disabled:opacity-40 shadow-gold-glow"
                >
                  <Send className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs p-6 text-center">
              <MessageSquare className="w-12 h-12 mb-2 opacity-30 text-gold-400" />
              <h3 className="font-serif font-bold text-white text-base">Select a conversation</h3>
              <p className="text-slate-400 text-xs mt-1">
                Choose a table from the left list to start live chatting
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
