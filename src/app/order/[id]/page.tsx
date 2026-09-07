'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  ChefHat,
  MessageCircle,
  Star,
  Send,
  Sparkles,
  ArrowLeft,
  Phone,
  HelpCircle,
  AlertCircle,
  Receipt,
  Heart,
  ExternalLink,
  Edit3,
  XCircle,
  PlusCircle,
  RotateCcw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { OrderData, OrderItem, ChatMessageData } from '@/lib/types';
import { translations, Language } from '@/lib/i18n';
import { formatNPR, formatDate, formatTime } from '@/lib/utils';
import { useSocket } from '@/lib/socket';
import { playChime } from '@/lib/audio';

export default function OrderTrackingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mb-4 shadow-gold-glow" />
          <p className="text-sm font-semibold text-white">Loading Your Table Order...</p>
        </div>
      }
    >
      <OrderTrackingContent />
    </Suspense>
  );
}

function OrderTrackingContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [tableOrders, setTableOrders] = useState<OrderData[]>([]);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [lang, setLang] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Feedback state
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const t = translations[lang];

  useEffect(() => {
    async function fetchOrder() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/orders/${orderId}`);
        if (!res.ok) throw new Error('Order not found');
        const data = await res.json();
        setOrder(data.order);
        if (data.order.chatMessages) {
          setMessages(data.order.chatMessages);
        }
        if (data.order.feedback) {
          setFeedbackSubmitted(true);
          setRating(data.order.feedback.rating);
          setComment(data.order.feedback.comment || '');
        }

        // Fetch sibling rounds for this table
        if (data.order?.hotel?.slug && data.order?.tableNumber) {
          try {
            const actRes = await fetch(
              `/api/public/orders/active?hotelSlug=${encodeURIComponent(
                data.order.hotel.slug
              )}&tableNumber=${encodeURIComponent(data.order.tableNumber)}`
            );
            if (actRes.ok) {
              const actData = await actRes.json();
              if (actData.activeOrders) {
                setTableOrders(actData.activeOrders);
              }
            }
          } catch {}
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (orderId) fetchOrder();
  }, [orderId]);

  // Socket.io Listener
  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit('join_order', orderId);

    const handleStatusUpdate = (data: { status: string; order?: any }) => {
      setOrder((prev) => {
        if (!prev) return prev;
        return { ...prev, status: data.status as any };
      });
      playChime('order');

      if (data.status === 'done') {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    };

    const handleNewMessage = (msg: ChatMessageData) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender === 'staff') {
        playChime('message');
      }
    };

    socket.on('order_status_updated', handleStatusUpdate);
    socket.on('chat_message', handleNewMessage);

    return () => {
      socket.off('order_status_updated', handleStatusUpdate);
      socket.off('chat_message', handleNewMessage);
    };
  }, [socket, orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/public/chat/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, sender: 'customer' }),
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingFeedback) return;

    setIsSubmittingFeedback(true);
    try {
      const res = await fetch('/api/public/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          rating,
          comment,
          customerName: order?.customerName || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');

      setFeedbackSubmitted(true);
      playChime('success');
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      alert(err.message || 'Feedback submission failed');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      setIsCancelling(true);
      const res = await fetch(`/api/public/orders/${order.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order');
      }
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      setShowCancelModal(false);
      playChime('message');
    } catch (err: any) {
      alert(err.message || 'Could not cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mb-4 shadow-gold-glow" />
        <p className="text-sm font-semibold text-white">Loading Your Table Order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-serif font-bold text-white mb-2">Order Not Found</h2>
        <Link href="/" className="px-6 py-2 gold-btn rounded-xl text-xs font-bold mt-4">
          Return Home
        </Link>
      </div>
    );
  }

  let items: OrderItem[] = [];
  try {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  } catch {}

  const isDone = order.status === 'done';
  const isInProgress = order.status === 'in_progress';
  const isReceived = order.status === 'received';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-brandPink-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 bg-dark-950/80 backdrop-blur-xl border-b border-white/[0.08] px-4 py-3.5 flex items-center justify-between">
        <Link
          href={`/menu/${order.hotel?.slug || ''}`}
          className="flex items-center space-x-2 text-xs font-bold text-slate-300 hover:text-gold-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Menu</span>
        </Link>

        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-dark-900 border border-gold-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-serif font-bold text-gold-300">
            Table #{order.tableNumber}
          </span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Celebration Card (Matching PDF Page 9 when order is Done) */}
        {isDone ? (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0a1f16] via-[#0f2e22] to-[#071610] border-2 border-gold-500/50 p-6 sm:p-8 text-center shadow-gold-glow animate-fade-in">
            {/* Elegant Botanical Corner Icons */}
            <div className="absolute top-3 left-4 text-gold-400/70 text-xl">🌿</div>
            <div className="absolute top-3 right-4 text-gold-400/70 text-xl">🌿</div>
            <div className="absolute bottom-3 left-4 text-gold-400/70 text-xl">🌿</div>
            <div className="absolute bottom-3 right-4 text-gold-400/70 text-xl">🌿</div>

            {/* Inner Border Frame */}
            <div className="border border-gold-500/35 rounded-2xl py-8 px-4">
              <span className="text-[10px] uppercase tracking-[0.35em] text-gold-400 font-serif font-bold">
                DINING COMPLETED
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-extrabold gold-gradient-text mt-2 uppercase tracking-wider">
                Thank You
              </h2>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-300 mt-1 font-semibold">
                FOR DINING WITH US
              </p>
              <p className="text-xs text-emerald-300/90 mt-4 max-w-xs mx-auto leading-relaxed">
                {order.hotel?.name || 'Our team'} hopes you loved every single bite!
              </p>
            </div>
          </div>
        ) : (
          /* Live Order Stepper Status Card */
          <div className="bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-premium-card">
            <div className="flex items-center justify-between pb-4 border-b border-surface-border">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gold-400 font-bold">
                  {t.orderId} #{order.id.slice(-6).toUpperCase()}
                </span>
                <h1 className="text-lg font-serif font-extrabold text-white mt-0.5">
                  {order.hotel?.name || 'Hotel Order'}
                </h1>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block">{formatTime(order.createdAt)}</span>
                <span className="text-xs font-bold text-gold-400">{items.length} Dishes</span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="py-6">
              <div className="relative flex items-center justify-between">
                {/* Connector Line */}
                <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-dark-700 z-0">
                  <div
                    className="h-full bg-gradient-to-r from-gold-500 to-brandPink-500 transition-all duration-700 shadow-gold-glow"
                    style={{
                      width: isDone ? '100%' : isInProgress ? '50%' : '10%',
                    }}
                  />
                </div>

                {/* Step 1: Received */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                      isReceived || isInProgress || isDone
                        ? 'bg-gold-500 border-gold-300 text-black shadow-gold-glow'
                        : 'bg-dark-800 border-dark-600 text-slate-500'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 mt-2">
                    Received
                  </span>
                </div>

                {/* Step 2: Preparing */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                      isInProgress || isDone
                        ? 'bg-brandPink-500 border-brandPink-300 text-white shadow-pink-glow'
                        : 'bg-dark-800 border-dark-600 text-slate-500'
                    }`}
                  >
                    <ChefHat className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 mt-2">
                    Preparing
                  </span>
                </div>

                {/* Step 3: Served */}
                <div className="relative z-10 flex flex-col items-center">
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-300 text-black shadow-lg'
                        : 'bg-dark-800 border-dark-600 text-slate-500'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-200 mt-2">
                    Served
                  </span>
                </div>
              </div>

              {/* Status Description Banner */}
              <div className="mt-6 p-4 bg-dark-900/90 rounded-2xl border border-white/[0.08] text-center">
                <p className="text-xs font-semibold text-gold-300 leading-relaxed">
                  {isReceived && t.statusReceivedDesc}
                  {isInProgress && t.statusInProgressDesc}
                  {isDone && t.statusDoneDesc}
                  {isCancelled && 'This order was cancelled by the hotel.'}
                </p>
              </div>

              {/* Sibling Rounds for this Table */}
              {tableOrders.length > 1 && (
                <div className="mt-5 pt-4 border-t border-white/[0.06]">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider flex items-center justify-between">
                    <span>Table #{order.tableNumber} Dining Rounds ({tableOrders.length})</span>
                    <span className="text-[10px] text-gold-400 font-mono">Tap round to view</span>
                  </div>
                  <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                    {tableOrders.map((tOrder, idx) => {
                      const isCurrent = tOrder.id === order.id;
                      return (
                        <button
                          key={tOrder.id}
                          onClick={() => router.push(`/order/${tOrder.id}`)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
                            isCurrent
                              ? 'gold-btn text-black shadow-gold-glow'
                              : 'bg-dark-900 text-slate-300 border border-white/10 hover:border-gold-500/40'
                          }`}
                        >
                          <span>Round #{idx + 1}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-black ${
                              tOrder.status === 'received'
                                ? 'bg-gold-500/20 text-gold-300'
                                : tOrder.status === 'in_progress'
                                ? 'bg-brandPink-500/20 text-brandPink-300'
                                : tOrder.status === 'done'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {tOrder.status}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customer Actions: Edit / Cancel / Add More Dishes */}
              <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center gap-2.5">
                {isReceived && (
                  <>
                    <Link
                      href={`/menu/${order.hotel?.slug || ''}?table=${encodeURIComponent(
                        order.tableNumber
                      )}&editOrder=${order.id}`}
                      className="flex-1 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Dishes</span>
                    </Link>

                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center space-x-1.5 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}

                {!isCancelled && (
                  <Link
                    href={`/menu/${order.hotel?.slug || ''}?table=${encodeURIComponent(
                      order.tableNumber
                    )}`}
                    className="flex-1 py-2.5 rounded-xl gold-btn text-black text-xs font-extrabold flex items-center justify-center space-x-1.5 shadow-gold-glow hover:scale-[1.02] transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Add Extra Dishes (Round 2+)</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Live Receptionist Chat Section */}
        <div className="bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-premium-card">
          <div className="px-5 py-3.5 bg-dark-900 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-brandPink-500/20 text-brandPink-400 flex items-center justify-center border border-brandPink-500/30">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs sm:text-sm">
                  {t.liveChat}
                </h3>
                <p className="text-[10px] text-emerald-400 flex items-center space-x-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Receptionist / Staff Connected</span>
                </p>
              </div>
            </div>
          </div>

          {/* Chat Stream */}
          <div className="p-4 h-56 overflow-y-auto space-y-2.5 bg-dark-950/60">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
                <HelpCircle className="w-7 h-7 mb-1.5 text-slate-600 opacity-60" />
                <p>Have special requests for Table #{order.tableNumber}?</p>
                <p className="text-[11px] text-gold-400/80 mt-1">Send a message directly to reception below.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCustomer = msg.sender === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[9px] text-slate-500 mb-0.5 px-1 font-mono">
                      {isCustomer ? 'You' : 'Staff'} • {formatTime(msg.createdAt)}
                    </span>
                    <div
                      className={`max-w-[80%] px-4 py-2 rounded-2xl text-xs leading-relaxed ${
                        isCustomer
                          ? 'bg-brandPink-500 text-white rounded-br-none shadow-pink-glow font-medium'
                          : 'bg-dark-800 text-slate-200 border border-gold-500/30 rounded-bl-none'
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

          {/* Input Box */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-dark-900 border-t border-surface-border flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder={t.chatPlaceholder}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-dark-850 border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brandPink-500 transition"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="p-2.5 rounded-xl pink-btn disabled:opacity-40 shadow-pink-glow"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Post-Order Feedback / Rating Section */}
        <div className="bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-premium-card">
          <div className="flex items-center space-x-2 mb-3">
            <Heart className="w-5 h-5 text-brandPink-500" />
            <h3 className="font-serif font-bold text-white text-base">
              {t.leaveFeedback}
            </h3>
          </div>

          {feedbackSubmitted ? (
            <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-1.5" />
              <h4 className="font-bold text-sm text-white">Review Submitted</h4>
              <div className="flex items-center justify-center space-x-1 my-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= rating
                        ? 'fill-gold-400 text-gold-400'
                        : 'text-slate-600'
                    }`}
                  />
                ))}
              </div>
              {comment && <p className="text-xs text-slate-300 italic">"{comment}"</p>}
              <p className="text-[11px] text-emerald-400 mt-2">{t.feedbackSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <p className="text-xs text-slate-400">
                {t.rateYourExperience}
              </p>

              {/* 5-Star Interactive Selector */}
              <div className="flex items-center justify-center space-x-2 py-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'fill-gold-400 text-gold-400 drop-shadow-md'
                          : 'text-dark-600'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment Textarea */}
              <textarea
                rows={2}
                placeholder={t.feedbackPlaceholder}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-3.5 py-2 bg-dark-900 border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
              />

              <button
                type="submit"
                disabled={isSubmittingFeedback}
                className="w-full py-3 rounded-xl gold-btn text-xs font-extrabold shadow-gold-glow"
              >
                {isSubmittingFeedback ? t.submitting : t.submitFeedback}
              </button>
            </form>
          )}
        </div>

        {/* Ordered Items Summary */}
        <div className="bg-dark-850/90 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 shadow-premium-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-white text-base">Order Breakdown</h3>
            <span className="text-sm font-serif font-black text-gold-400">
              {formatNPR(order.totalAmount, lang === 'ne')}
            </span>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-md bg-dark-900 border border-surface-border flex items-center justify-center font-bold text-gold-400 text-[10px]">
                    {item.quantity}x
                  </span>
                  <span className="font-semibold text-slate-200">{item.name}</span>
                </div>
                <span className="font-bold text-slate-300">
                  {formatNPR(item.price * item.quantity, lang === 'ne')}
                </span>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-dark-900 rounded-xl border border-white/[0.06] text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Special Instructions: </span>
              {order.notes}
            </div>
          )}
        </div>
      </main>

      {/* Cancel Order Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-dark-900 border border-white/10 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-serif font-bold text-white">
                Cancel Table #{order.tableNumber} Order?
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Since the kitchen has not started cooking yet, you can cancel this order. Would you like to proceed?
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl dark-btn text-xs font-semibold text-slate-300"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition shadow-lg flex items-center justify-center space-x-1"
              >
                {isCancelling ? <span>Cancelling...</span> : <span>Yes, Cancel</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
