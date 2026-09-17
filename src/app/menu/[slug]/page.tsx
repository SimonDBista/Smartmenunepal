'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Globe,
  Sparkles,
  Phone,
  MapPin,
  Clock,
  Box,
  Check,
  ChevronRight,
  Utensils,
  Search,
  MessageCircle,
  AlertCircle,
  X,
  Flame,
  ArrowRight,
  ZoomIn,
  Send,
} from 'lucide-react';
import { MenuItemData, HotelData, OrderItem, OrderData } from '@/lib/types';
import { translations, Language } from '@/lib/i18n';
import { formatNPR, getCategoryDetails, formatTime } from '@/lib/utils';
import ThreeDViewerModal from '@/components/ThreeDViewerModal';
import ImageZoomModal from '@/components/ImageZoomModal';
import { playChime, playCustomerMessageChime } from '@/lib/audio';
import { useSocket } from '@/lib/socket';

export default function CustomerMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
          <div className="w-14 h-14 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mb-4" />
          <p className="text-sm font-semibold text-white">Loading Digital Menu...</p>
        </div>
      }
    >
      <CustomerMenuContent />
    </Suspense>
  );
}

function CustomerMenuContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const slug = params?.slug as string;
  const initialTable = searchParams?.get('table') || '';
  const editOrderId = searchParams?.get('editOrder');

  const [hotel, setHotel] = useState<HotelData | null>(null);
  const [items, setItems] = useState<MenuItemData[]>([]);
  const [mostOrderedItems, setMostOrderedItems] = useState<MenuItemData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [lang, setLang] = useState<Language>('en');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map of item id to popularity rank (1 = most ordered, 2 = 2nd, etc.)
  const itemRankMap = React.useMemo(() => {
    const map = new Map<string, number>();
    mostOrderedItems.forEach((item, index) => {
      map.set(item.id, index + 1);
    });
    return map;
  }, [mostOrderedItems]);

  // Cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState(initialTable);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit order & active table session states
  const [editingOrder, setEditingOrder] = useState<OrderData | null>(null);
  const [activeTableSession, setActiveTableSession] = useState<{
    hasActiveOrder: boolean;
    count: number;
    latestOrderId?: string;
    activeOrders?: any[];
  } | null>(null);

  // 3D Model Viewer Modal state
  const [threeDItem, setThreeDItem] = useState<{
    isOpen: boolean;
    name: string;
    modelUrl?: string | null;
    imageUrl?: string | null;
  }>({
    isOpen: false,
    name: '',
  });

  // Food Photo Zoom Modal state
  const [zoomItem, setZoomItem] = useState<{
    isOpen: boolean;
    name: string;
    imageUrl: string;
    price?: number;
    category?: string;
    description?: string | null;
    originalItem?: MenuItemData;
  }>({
    isOpen: false,
    name: '',
    imageUrl: '',
  });

  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Live Table Chat state
  const { socket } = useSocket();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [tableMessages, setTableMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [incomingStaffMessage, setIncomingStaffMessage] = useState<{
    id: string;
    message: string;
    createdAt: string | Date;
  } | null>(null);
  const isSendingChatRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const t = translations[lang];

  // Fetch table chat messages when tableNumber is set
  useEffect(() => {
    if (!slug || !tableNumber) return;

    async function loadTableChat() {
      try {
        const res = await fetch(
          `/api/public/chat/table?hotelSlug=${slug}&tableNumber=${encodeURIComponent(tableNumber)}`
        );
        if (res.ok) {
          const data = await res.json();
          setTableMessages(data.messages || []);
        }
      } catch (err) {
        console.error('Failed to load table chat:', err);
      }
    }

    loadTableChat();
  }, [slug, tableNumber]);

  // Join table socket room for real-time messages
  useEffect(() => {
    if (!socket || !hotel?.id || !tableNumber) return;

    socket.emit('join_table', {
      hotelId: hotel.id,
      tableNumber,
    });

    const handleNewMessage = (msg: any) => {
      if (msg.tableNumber === tableNumber) {
        setTableMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });

        if (msg.sender === 'staff') {
          try {
            playCustomerMessageChime();
          } catch {}
          if (!isChatOpen) {
            setUnreadChatCount((prev) => prev + 1);
            setIncomingStaffMessage({
              id: msg.id || String(Date.now()),
              message: msg.message,
              createdAt: msg.createdAt || new Date(),
            });
            setTimeout(() => {
              setIncomingStaffMessage((prev) => (prev?.id === msg.id ? null : prev));
            }, 8000);
          }
        }
      }
    };

    socket.on('chat_message', handleNewMessage);

    return () => {
      socket.off('chat_message', handleNewMessage);
    };
  }, [socket, hotel?.id, tableNumber, isChatOpen]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [tableMessages, isChatOpen]);

  // Send customer message to table chat
  const handleSendCustomerMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !tableNumber || isSendingChatRef.current) return;

    try {
      isSendingChatRef.current = true;
      setIsSendingChat(true);
      const text = chatInput.trim();
      const res = await fetch('/api/public/chat/table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelSlug: slug,
          tableNumber,
          message: text,
          customerName: customerName || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTableMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setChatInput('');
      }
    } catch (err) {
      console.error('Error sending chat:', err);
    } finally {
      isSendingChatRef.current = false;
      setIsSendingChat(false);
    }
  };

  useEffect(() => {
    async function fetchMenu() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/menu/${slug}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error('Hotel menu not found');
          throw new Error('Failed to load menu');
        }
        const data = await res.json();
        setHotel(data.hotel);
        setItems(data.items || []);
        setMostOrderedItems(data.mostOrderedItems || []);
        setCategories(data.categories || []);
      } catch (err: any) {
        setError(err.message || 'Error loading menu');
      } finally {
        setLoading(false);
      }
    }
    if (slug) fetchMenu();
  }, [slug]);

  useEffect(() => {
    if (initialTable) {
      setTableNumber(initialTable);
    }
  }, [initialTable]);

  // Check if active table orders exist whenever tableNumber changes
  useEffect(() => {
    if (!slug || !tableNumber.trim()) {
      setActiveTableSession(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/public/orders/active?hotelSlug=${encodeURIComponent(
            slug
          )}&tableNumber=${encodeURIComponent(tableNumber.trim())}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.hasActiveOrder) {
            setActiveTableSession({
              hasActiveOrder: true,
              count: data.count,
              latestOrderId: data.latestOrderId,
              activeOrders: data.activeOrders,
            });
            // Pre-fill customer name & phone from active session if empty
            if (data.activeOrders?.[0]) {
              const prev = data.activeOrders[0];
              if (!customerName && prev.customerName) setCustomerName(prev.customerName);
              if (!customerPhone && prev.customerPhone) setCustomerPhone(prev.customerPhone);
            }
          } else {
            setActiveTableSession(null);
          }
        }
      } catch (err) {
        console.error('Failed to check active orders:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug, tableNumber]);

  // If editOrderId is present, fetch and populate existing order to edit
  useEffect(() => {
    if (!editOrderId) return;
    async function loadOrderToEdit() {
      try {
        const res = await fetch(`/api/public/orders/${editOrderId}`);
        if (!res.ok) return;
        const data = await res.json();
        const order = data.order;
        if (!order) return;

        if (order.status !== 'received') {
          alert(
            'This order is already being prepared by the kitchen and cannot be modified. You can add more dishes as a new round!'
          );
          return;
        }

        setEditingOrder(order);
        setTableNumber(order.tableNumber || '');
        if (order.customerName) setCustomerName(order.customerName);
        if (order.customerPhone) setCustomerPhone(order.customerPhone);
        if (order.notes) setOrderNotes(order.notes);

        let parsedItems: OrderItem[] = [];
        try {
          parsedItems =
            typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        } catch {}

        if (parsedItems.length > 0) {
          setCart(parsedItems);
          setIsCartOpen(true);
        }
      } catch (err) {
        console.error('Failed to load order for edit:', err);
      }
    }
    loadOrderToEdit();
  }, [editOrderId]);

  const addToCart = (item: MenuItemData) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          imageUrl: item.imageUrl || undefined,
        },
      ];
    });

    playChime('message');
    showToast(`${item.name} ${t.addedToCart}!`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.id === itemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as OrderItem[];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) {
      alert('Please enter or verify your Table Number');
      return;
    }
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    try {
      setIsSubmitting(true);

      if (editingOrder) {
        // Update existing order before cooking starts
        const res = await fetch(`/api/public/orders/${editingOrder.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart,
            notes: orderNotes.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update order');
        }

        playChime('success');
        showToast('Order updated successfully!');
        router.push(`/order/${editingOrder.id}`);
        return;
      }

      // Normal order or Round 2+ for this table
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotel?.id,
          tableNumber: tableNumber.trim(),
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          items: cart,
          notes: orderNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Save to localStorage for quick restore
      try {
        localStorage.setItem(`last_order_${slug}`, data.order.id);
        localStorage.setItem(`last_table_${slug}`, tableNumber.trim());
      } catch {}

      playChime('success');
      router.push(`/order/${data.order.id}`);
    } catch (err: any) {
      alert(err.message || 'Could not place order. Please try again.');
      setIsSubmitting(false);
    }
  };

  const filteredItems = React.useMemo(() => {
    let list = items;
    if (activeCategory === 'most_ordered') {
      list = [...mostOrderedItems];
    } else if (activeCategory !== 'all') {
      list = items.filter((item) => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, mostOrderedItems, activeCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mb-4 shadow-gold-glow" />
        <h2 className="font-serif text-xl font-bold text-white mb-1">
          Loading Five-Star Menu...
        </h2>
        <p className="text-xs text-gold-400 font-semibold tracking-widest uppercase">Digitalize Nepal</p>
      </div>
    );
  }

  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-white mb-2">Menu Unavailable</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
          {error || 'The requested hotel menu could not be found or is currently offline.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 gold-btn rounded-xl text-xs font-bold shadow-gold-glow"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 selection:bg-gold-500 selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-dark-900/95 border border-gold-500/40 text-gold-300 text-xs font-bold rounded-full shadow-gold-glow backdrop-blur-xl flex items-center space-x-2 animate-slide-up">
          <Sparkles className="w-4 h-4 text-gold-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Incoming Staff Message Notification Toast */}
      {incomingStaffMessage && !isChatOpen && (
        <div className="fixed top-5 left-4 right-4 max-w-md mx-auto z-50 animate-slide-up">
          <div className="bg-[#14151a]/95 border-2 border-gold-400/80 rounded-3xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-gold-400/20 text-gold-400 border border-gold-400/40 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <span className="text-xs font-serif font-bold text-white block">
                    {lang === 'en' ? 'Staff Desk • Reception Reply' : 'होटल कर्मचारीको सन्देश'}
                  </span>
                  <span className="text-[10px] text-gold-400 font-semibold">
                    {formatTime(incomingStaffMessage.createdAt)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIncomingStaffMessage(null)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-200 bg-black/40 rounded-xl p-2.5 border border-white/5 line-clamp-2 leading-relaxed font-medium">
              &ldquo;{incomingStaffMessage.message}&rdquo;
            </p>

            <div className="flex items-center justify-end space-x-2 pt-0.5">
              <button
                onClick={() => setIncomingStaffMessage(null)}
                className="px-3 py-1.5 rounded-xl dark-btn text-xs font-semibold text-stone-400 hover:text-white"
              >
                {lang === 'en' ? 'Dismiss' : 'हटाउनुहोस्'}
              </button>
              <button
                onClick={() => {
                  setIncomingStaffMessage(null);
                  setIsChatOpen(true);
                }}
                className="px-4 py-1.5 rounded-xl gold-btn text-xs font-bold text-black flex items-center space-x-1 shadow-gold-glow"
              >
                <span>{lang === 'en' ? 'Open Chat' : 'च्याट खोल्नुहोस्'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Language Switcher */}
      <div className="fixed top-4 right-4 z-40">
        <button
          onClick={() => setLang(lang === 'en' ? 'ne' : 'en')}
          className="px-3.5 py-1.5 rounded-full bg-dark-900/90 border border-gold-500/30 text-xs font-bold text-gold-400 shadow-xl backdrop-blur-xl flex items-center space-x-1.5 hover:border-gold-400 transition"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{lang === 'en' ? 'नेपाली' : 'English'}</span>
        </button>
      </div>

      {/* Hero Header Banner (Luxury Five-Star Styling) */}
      <header className="relative w-full bg-gradient-to-b from-dark-950 via-dark-900 to-dark-950 border-b border-white/[0.08] px-4 pt-12 pb-10 text-center overflow-hidden">
        {/* Subtle decorative crest watermark */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-80 h-80 bg-gradient-to-b from-gold-500/15 via-gold-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto">
          {/* Welcome Tag */}
          <div className="inline-flex items-center space-x-2 text-[10px] uppercase tracking-[0.35em] text-gold-400 font-serif font-semibold mb-2">
            <span>✦</span>
            <span>{t.welcome}</span>
            <span>✦</span>
          </div>

          {/* Hotel Name */}
          <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-white uppercase tracking-wide leading-tight drop-shadow-md">
            {hotel.name}
          </h1>

          {/* Gold Decorative Ribbon Divider */}
          <div className="flex items-center justify-center space-x-3 my-3.5">
            <div className="h-[1px] w-14 bg-gradient-to-r from-transparent via-gold-500/60 to-gold-500" />
            <div className="px-3.5 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-[10px] font-serif uppercase tracking-[0.25em] text-gold-400">
              FINE DINING & SEKUWA
            </div>
            <div className="h-[1px] w-14 bg-gradient-to-l from-transparent via-gold-500/60 to-gold-500" />
          </div>

          {/* Active Table Number Tag */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-dark-950 border border-gold-400/40 shadow-gold-glow mb-4">
            <span className={`w-2 h-2 rounded-full ${initialTable ? 'bg-emerald-400' : 'bg-gold-400'} animate-pulse`} />
            <div className="text-xs font-bold text-white flex items-center space-x-1.5">
              <span>{t.table}:</span>
              {initialTable ? (
                <span className="text-gold-300 font-extrabold flex items-center space-x-1">
                  <span>#{tableNumber}</span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono">
                    Verified QR
                  </span>
                </span>
              ) : (
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Enter Table #"
                  className="w-24 bg-transparent text-xs font-bold text-gold-400 placeholder-gold-400/60 focus:outline-none border-b border-gold-400/30 focus:border-gold-400 text-center"
                />
              )}
            </div>
          </div>

          {/* Address & Phone Details */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-xs text-slate-400">
            {hotel.address && (
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-gold-400" />
                <span>{hotel.address}</span>
              </div>
            )}
            {hotel.phone && (
              <div className="flex items-center space-x-1.5">
                <Phone className="w-3.5 h-3.5 text-gold-400" />
                <a href={`tel:${hotel.phone}`} className="hover:text-gold-300 transition">
                  {hotel.phone}
                </a>
              </div>
            )}
            <div className="flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-gold-400" />
              <span>Open Everyday</span>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Order Banner */}
      {editingOrder && (
        <div className="max-w-4xl mx-auto px-4 mt-5">
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl backdrop-blur-xl animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white flex items-center space-x-2">
                  <span>Editing Order #{editingOrder.id.slice(-6).toUpperCase()}</span>
                  <span className="px-2 py-0.5 rounded-full bg-dark-900 text-amber-400 text-[10px] font-mono border border-amber-500/30">
                    Table #{editingOrder.tableNumber}
                  </span>
                </h4>
                <p className="text-[11px] text-amber-200/80 mt-0.5">
                  Add, remove, or adjust dishes. When ready, open your cart and tap Save Changes.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              <button
                onClick={() => setIsCartOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-md transition"
              >
                Review Cart ({cartItemCount})
              </button>
              <button
                onClick={() => {
                  setEditingOrder(null);
                  setCart([]);
                  router.push(`/menu/${slug}?table=${tableNumber}`);
                }}
                className="px-3 py-1.5 rounded-xl bg-dark-900/80 hover:bg-dark-900 text-slate-300 text-xs font-semibold border border-white/10 transition"
              >
                Cancel Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Table Session Banner (Continuity for same table) */}
      {!editingOrder && activeTableSession?.hasActiveOrder && (
        <div className="max-w-4xl mx-auto px-4 mt-5">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-dark-850 via-dark-900 to-dark-850 border border-gold-500/50 shadow-gold-glow flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-white font-serif flex items-center space-x-2">
                  <span>Table #{tableNumber} has an active dining session</span>
                  <span className="px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 text-[10px] font-bold border border-gold-500/30">
                    {activeTableSession.count} {activeTableSession.count === 1 ? 'Order' : 'Rounds'} Active
                  </span>
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Track kitchen status, chat with receptionist, or add more dishes to this table.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 self-end sm:self-auto">
              {activeTableSession.latestOrderId && (
                <Link
                  href={`/order/${activeTableSession.latestOrderId}`}
                  className="px-4 py-2 rounded-xl gold-btn text-black text-xs font-bold flex items-center space-x-1.5 shadow-md hover:scale-105 transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>View Order & Chat</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 mt-6">
        {/* Search Input */}
        <div className="relative mb-5">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              lang === 'en'
                ? 'Search dishes, drinks, sekuwa, momos...'
                : 'परिकारहरू, पेय पदार्थ खोज्नुहोस्...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-10 py-3 bg-dark-850/80 backdrop-blur-md border border-white/[0.08] rounded-2xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-gold-500/60 shadow-inner transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Most Ordered & Guest Favorites Spotlight Section */}
        {activeCategory === 'all' && !searchQuery.trim() && mostOrderedItems.length > 0 && (
          <section className="mb-8 animate-fade-in">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
                  <Flame className="w-4 h-4 animate-pulse text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-serif font-bold text-white text-sm sm:text-base tracking-wide flex items-center gap-1.5">
                      <span>{t.guestFavorites}</span>
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                      Hot
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-light">
                    {t.guestFavoritesDesc}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveCategory('most_ordered')}
                className="text-xs font-bold text-gold-400 hover:text-gold-300 flex items-center space-x-1 transition px-2.5 py-1 rounded-lg hover:bg-white/[0.04]"
              >
                <span>{t.all} ({mostOrderedItems.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal Scroll Cards */}
            <div className="flex items-stretch space-x-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory">
              {mostOrderedItems.slice(0, 6).map((item, idx) => {
                const inCartItem = cart.find((i) => i.id === item.id);
                const rank = idx + 1;
                return (
                  <div
                    key={`spotlight-${item.id}`}
                    className="snap-start shrink-0 w-[240px] sm:w-[260px] bg-dark-850/90 backdrop-blur-md border border-white/[0.08] hover:border-gold-500/40 rounded-3xl overflow-hidden shadow-premium-card flex flex-col justify-between group transition-all duration-300"
                  >
                    {/* Photo with badges */}
                    <div
                      onClick={() => {
                        if (item.imageUrl && !failedImages[item.id]) {
                          setZoomItem({
                            isOpen: true,
                            name: item.name,
                            imageUrl: item.imageUrl,
                            price: item.price,
                            category: item.category,
                            description: item.description,
                            originalItem: item,
                          });
                        }
                      }}
                      className={`relative w-full h-36 bg-dark-900 overflow-hidden ${
                        item.imageUrl && !failedImages[item.id] ? 'cursor-zoom-in group/photo' : ''
                      }`}
                    >
                      {item.imageUrl && !failedImages[item.id] ? (
                        <>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            loading="lazy"
                            onError={() => {
                              setFailedImages((prev) => ({ ...prev, [item.id]: true }));
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-dark-850 via-transparent to-transparent opacity-80" />
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-dark-900">
                          <Utensils className="w-8 h-8 mb-1 opacity-40" />
                          <span className="text-[10px]">Freshly Prepared</span>
                        </div>
                      )}

                      {/* Rank Badge */}
                      <div className="absolute top-2.5 left-2.5 z-10">
                        {rank === 1 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black border border-yellow-200 shadow-lg shadow-yellow-500/30 ring-1 ring-yellow-300 flex items-center space-x-1">
                            <Flame className="w-3 h-3 text-red-600 fill-red-600 animate-pulse" />
                            <span>#1 {t.bestseller}</span>
                          </span>
                        ) : rank === 2 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 border border-white shadow-lg flex items-center space-x-1">
                            <span>🥈 #2 {t.popularBadge}</span>
                          </span>
                        ) : rank === 3 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-700 to-orange-700 text-amber-100 border border-amber-500/50 shadow-lg flex items-center space-x-1">
                            <span>🥉 #3 {t.topPick}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur flex items-center space-x-1">
                            <Flame className="w-2.5 h-2.5 text-amber-400" />
                            <span>#{rank}</span>
                          </span>
                        )}
                      </div>

                      {/* 3D button if enabled */}
                      {item.is3dEnabled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setThreeDItem({
                              isOpen: true,
                              name: item.name,
                              modelUrl: item.modelUrl,
                              imageUrl: item.imageUrl,
                            });
                          }}
                          className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-gold-500/90 hover:bg-gold-500 text-black text-[9px] font-bold shadow-gold-glow backdrop-blur flex items-center space-x-1 transition z-10"
                        >
                          <Box className="w-2.5 h-2.5" />
                          <span>3D</span>
                        </button>
                      )}

                      {/* Social proof order count */}
                      {item.totalOrdered && item.totalOrdered > 0 && (
                        <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-bold text-amber-300 flex items-center space-x-1">
                          <Flame className="w-2.5 h-2.5 text-amber-400" />
                          <span>{item.totalOrdered} {t.ordersCount}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 flex flex-col justify-between flex-1">
                      <div>
                        <h4 className="font-serif font-bold text-white text-sm line-clamp-1 group-hover:text-gold-300 transition-colors">
                          {item.name}
                        </h4>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between">
                        <span className="text-base font-serif font-black text-gold-400">
                          {formatNPR(item.price, lang === 'ne')}
                        </span>

                        {item.isAvailable ? (
                          inCartItem ? (
                            <div className="flex items-center space-x-1.5 bg-dark-900 border border-gold-500/40 rounded-xl p-0.5 shadow-gold-glow">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-6 h-6 rounded-lg bg-dark-800 text-gold-400 flex items-center justify-center hover:bg-gold-500 hover:text-black transition"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-white px-1">
                                {inCartItem.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-6 h-6 rounded-lg bg-gold-500 text-black flex items-center justify-center hover:bg-gold-400 transition"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="px-3 py-1.5 rounded-xl gold-btn text-[11px] font-bold flex items-center space-x-1 shadow-sm"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{t.orderNow}</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                            {t.outOfStock}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Category Filter Pills (Horizontal Scroll) */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-3 scrollbar-none mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
              activeCategory === 'all'
                ? 'gold-btn text-black shadow-gold-glow'
                : 'dark-btn text-slate-300 hover:text-white'
            }`}
          >
            <span>🍽️</span>
            <span>{t.all}</span>
            <span className="opacity-70 text-[10px]">({items.length})</span>
          </button>

          {/* Quick Filter: Most Ordered / Bestseller */}
          {mostOrderedItems.length > 0 && (
            <button
              onClick={() =>
                setActiveCategory(activeCategory === 'most_ordered' ? 'all' : 'most_ordered')
              }
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center space-x-1.5 shadow-sm ${
                activeCategory === 'most_ordered'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-orange-500/30 border border-amber-300 ring-2 ring-amber-400/40'
                  : 'dark-btn text-amber-400 hover:text-amber-300 hover:border-amber-500/40'
              }`}
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  activeCategory === 'most_ordered'
                    ? 'animate-bounce text-yellow-200'
                    : 'text-amber-400'
                }`}
              />
              <span>{t.mostOrdered}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeCategory === 'most_ordered'
                    ? 'bg-black/40 text-yellow-200'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {mostOrderedItems.length}
              </span>
            </button>
          )}

          {categories.map((cat) => {
            const info = getCategoryDetails(cat, lang);
            const count = items.filter(
              (i) => i.category.toUpperCase() === cat.toUpperCase()
            ).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                  activeCategory === cat
                    ? 'gold-btn text-black shadow-gold-glow'
                    : 'dark-btn text-slate-300 hover:text-white'
                }`}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
                {count > 0 && (
                  <span className="opacity-70 text-[10px]">({count})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Most Ordered Active Banner */}
        {activeCategory === 'most_ordered' && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-gold-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs shadow-lg animate-fade-in">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Flame className="w-5 h-5 animate-pulse text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-serif font-black text-white text-sm">
                    {t.guestFavorites}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {filteredItems.length} {t.ordersCount}
                  </span>
                </div>
                <p className="text-stone-400 text-[11px] mt-0.5">
                  {t.guestFavoritesDesc}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveCategory('all')}
              className="text-[11px] font-bold text-amber-400 hover:text-white px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 hover:border-amber-400/40 whitespace-nowrap transition"
            >
              {t.all}
            </button>
          </div>
        )}

        {/* Menu Cards Bento Grid */}
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-dark-850/50 border border-white/[0.06] rounded-3xl backdrop-blur">
            <div className="text-4xl mb-3">
              {activeCategory === 'most_ordered'
                ? '🔥'
                : activeCategory !== 'all'
                ? getCategoryDetails(activeCategory, lang).icon
                : '🍽️'}
            </div>
            <p className="text-sm font-bold text-slate-200">
              {activeCategory === 'most_ordered'
                ? t.mostOrdered
                : activeCategory !== 'all'
                ? `No dishes in ${getCategoryDetails(activeCategory, lang).label} right now`
                : 'No dishes found'}
            </p>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Explore our other delicious freshly-prepared items!
            </p>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSearchQuery('');
              }}
              className="px-5 py-2 rounded-xl gold-btn text-xs font-bold shadow-gold-glow"
            >
              Browse All Items ({items.length})
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const inCartItem = cart.find((i) => i.id === item.id);
              return (
                <div
                  key={item.id}
                  className="group relative bg-dark-850/90 backdrop-blur-md border border-white/[0.08] hover:border-gold-500/40 rounded-3xl overflow-hidden shadow-premium-card transition-all duration-300 flex flex-col justify-between"
                >
                  {/* Photo Container - Click to Zoom & Look Around */}
                  <div
                    onClick={() => {
                      if (item.imageUrl && !failedImages[item.id]) {
                        setZoomItem({
                          isOpen: true,
                          name: item.name,
                          imageUrl: item.imageUrl,
                          price: item.price,
                          category: item.category,
                          description: item.description,
                          originalItem: item,
                        });
                      }
                    }}
                    className={`relative w-full h-48 bg-dark-900 overflow-hidden ${
                      item.imageUrl && !failedImages[item.id] ? 'cursor-zoom-in group/photo' : ''
                    }`}
                    title={
                      item.imageUrl && !failedImages[item.id]
                        ? 'Tap or click to zoom and move around the food picture'
                        : undefined
                    }
                  >
                    {item.imageUrl && !failedImages[item.id] ? (
                      <>
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          loading="lazy"
                          onError={() => {
                            setFailedImages((prev) => ({ ...prev, [item.id]: true }));
                          }}
                        />
                        {/* Hover / Tap Zoom badge */}
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold opacity-80 sm:opacity-0 sm:group-hover/photo:opacity-100 transition-opacity flex items-center space-x-1 shadow-lg pointer-events-none">
                          <ZoomIn className="w-3 h-3 text-gold-400" />
                          <span>Tap to Zoom</span>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 bg-dark-900">
                        <Utensils className="w-10 h-10 mb-1 opacity-40" />
                        <span className="text-[10px]">Freshly Prepared</span>
                      </div>
                    )}

                    {/* Gradient shade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-850 via-transparent to-transparent opacity-80" />

                    {/* Category Glass Tag */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-bold text-gold-400 flex items-center space-x-1 z-10">
                      <span>{getCategoryDetails(item.category, lang).icon}</span>
                      <span>{getCategoryDetails(item.category, lang).label}</span>
                    </div>

                    {/* Top Right Badges: Rank Badge & 3D Food Preview */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
                      {(() => {
                        const rank = itemRankMap.get(item.id);
                        if (rank === 1) {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black border border-yellow-200 shadow-lg shadow-yellow-500/30 ring-1 ring-yellow-300 flex items-center space-x-1">
                              <Flame className="w-3 h-3 text-red-600 fill-red-600 animate-pulse" />
                              <span>#1 {t.bestseller}</span>
                            </span>
                          );
                        }
                        if (rank === 2) {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-slate-200 to-slate-400 text-slate-950 border border-white shadow-lg flex items-center space-x-1">
                              <span>🥈 #2 {t.popularBadge}</span>
                            </span>
                          );
                        }
                        if (rank === 3) {
                          return (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-700 to-orange-700 text-amber-100 border border-amber-500/50 shadow-lg flex items-center space-x-1">
                              <span>🥉 #3 {t.topPick}</span>
                            </span>
                          );
                        }
                        if (rank && rank <= 5) {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-amber-300 border border-amber-500/30 backdrop-blur flex items-center space-x-1">
                              <Flame className="w-2.5 h-2.5 text-amber-400" />
                              <span>#{rank}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}

                      {item.is3dEnabled && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setThreeDItem({
                              isOpen: true,
                              name: item.name,
                              modelUrl: item.modelUrl,
                              imageUrl: item.imageUrl,
                            });
                          }}
                          className="px-2.5 py-1 rounded-full bg-gold-500/90 hover:bg-gold-500 text-black text-[10px] font-bold shadow-gold-glow backdrop-blur flex items-center space-x-1 transition"
                        >
                          <Box className="w-3 h-3" />
                          <span>{t.threeDPreview}</span>
                        </button>
                      )}
                    </div>

                    {/* Social proof order tag if ordered */}
                    {item.totalOrdered && item.totalOrdered > 0 && (
                      <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-[9px] font-bold text-amber-300 flex items-center space-x-1 pointer-events-none z-10">
                        <Flame className="w-2.5 h-2.5 text-amber-400" />
                        <span>{item.totalOrdered} {t.ordersCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Content Body */}
                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-white text-base leading-snug group-hover:text-gold-300 transition-colors">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed font-normal">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Price & Add to Cart Row */}
                    <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">
                          Price
                        </span>
                        <span className="text-lg font-serif font-black text-gold-400">
                          {formatNPR(item.price, lang === 'ne')}
                        </span>
                      </div>

                      {/* Quantity Controls or Order Now Button */}
                      {item.isAvailable ? (
                        inCartItem ? (
                          <div className="flex items-center space-x-2 bg-dark-900 border border-gold-500/40 rounded-xl p-1 shadow-gold-glow">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-7 h-7 rounded-lg bg-dark-800 text-gold-400 flex items-center justify-center hover:bg-gold-500 hover:text-black transition"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-xs font-bold text-white px-1.5">
                              {inCartItem.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-7 h-7 rounded-lg bg-gold-500 text-black flex items-center justify-center hover:bg-gold-400 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="px-4 py-2 rounded-xl gold-btn text-xs font-bold flex items-center space-x-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t.orderNow}</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
                          {t.outOfStock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-5 left-4 right-4 max-w-md mx-auto z-40 animate-slide-up">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full p-4 rounded-2xl gold-btn text-black flex items-center justify-between shadow-gold-glow border-t border-white/20"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center backdrop-blur">
                <ShoppingBag className="w-5 h-5 text-black" />
              </div>
              <div className="text-left">
                <div className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
                  {cartItemCount} {cartItemCount === 1 ? 'dish' : 'dishes'} in order
                </div>
                <div className="text-base font-serif font-black text-black">
                  {formatNPR(cartTotal, lang === 'ne')}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-xs font-bold bg-black text-gold-400 px-4 py-2 rounded-xl shadow-md">
              <span>{t.viewCart}</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Slide-Over Modal / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] bg-surface border border-white/[0.1] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-surface-border bg-dark-900 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h2 className="font-serif font-extrabold text-white text-lg">
                  {t.cart}
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 bg-dark-850 border border-surface-border rounded-2xl flex items-center justify-between gap-3 shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-xs sm:text-sm text-white truncate">
                      {item.name}
                    </h4>
                    <p className="text-xs text-gold-400 font-serif font-bold mt-0.5">
                      {formatNPR(item.price * item.quantity, lang === 'ne')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1.5 bg-dark-900 border border-surface-border rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 rounded-lg bg-dark-800 text-slate-300 flex items-center justify-center hover:bg-gold-500 hover:text-black transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-white px-1.5">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 rounded-lg bg-gold-500 text-black flex items-center justify-center hover:bg-gold-400 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Order Form Inputs */}
              <form onSubmit={handlePlaceOrder} className="pt-4 space-y-3.5">
                {editingOrder ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                    <span className="font-bold">
                      ✏️ Editing Order #{editingOrder.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-[10px] bg-dark-900 px-2 py-0.5 rounded text-amber-400 font-mono">
                      Table #{editingOrder.tableNumber}
                    </span>
                  </div>
                ) : activeTableSession?.hasActiveOrder ? (
                  <div className="p-3 bg-gold-500/10 border border-gold-500/30 rounded-xl text-xs text-gold-300 flex items-center justify-between">
                    <span className="font-bold">
                      ➕ Adding Round #{activeTableSession.count + 1}
                    </span>
                    <span className="text-[10px] bg-dark-900 px-2 py-0.5 rounded text-gold-400 font-mono">
                      Table #{tableNumber}
                    </span>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-300">
                        {t.tableNumber} <span className="text-gold-400 font-bold">*</span>
                      </label>
                      {initialTable && (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Verified Table QR</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1, 5, Terrace 2"
                      value={tableNumber}
                      readOnly={!!initialTable || !!editingOrder}
                      disabled={!!editingOrder}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none transition ${
                        initialTable
                          ? 'border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 cursor-not-allowed font-bold'
                          : 'bg-dark-900 border border-surface-border focus:border-gold-500'
                      } disabled:opacity-60`}
                    />
                    {initialTable && (
                      <span className="text-[10px] text-emerald-400/80 mt-1 block">
                        Locked to Table #{initialTable} from your scanned table stand.
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      {t.yourName}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aarav"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-dark-900 border border-surface-border rounded-xl text-xs text-white focus:outline-none focus:border-gold-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    {t.specialInstructions}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Extra spicy timur, less salt, please serve drinks first..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-dark-900 border border-surface-border rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500"
                  />
                </div>
              </form>
            </div>

            {/* Footer Total & Place Order */}
            <div className="p-6 bg-dark-900 border-t border-surface-border">
              <div className="flex items-center justify-between text-base font-extrabold text-white mb-4">
                <span>{t.total}:</span>
                <span className="text-gold-400 font-serif text-xl">
                  {formatNPR(cartTotal, lang === 'ne')}
                </span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 rounded-2xl gold-btn text-xs sm:text-sm font-extrabold flex items-center justify-center space-x-2 disabled:opacity-50 shadow-gold-glow text-black"
              >
                {isSubmitting ? (
                  <span>{editingOrder ? 'Updating Order...' : t.placingOrder}</span>
                ) : editingOrder ? (
                  <>
                    <span>Save Order Changes</span>
                    <Check className="w-4 h-4" />
                  </>
                ) : activeTableSession?.hasActiveOrder ? (
                  <>
                    <span>Submit Additional Order (Round {activeTableSession.count + 1})</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>{t.placeOrder}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Food Model Viewer Modal */}
      <ThreeDViewerModal
        isOpen={threeDItem.isOpen}
        onClose={() => setThreeDItem({ isOpen: false, name: '' })}
        itemName={threeDItem.name}
        modelUrl={threeDItem.modelUrl}
        imageUrl={threeDItem.imageUrl}
      />

      {/* Interactive Food Photo Zoom & Look Around Modal */}
      <ImageZoomModal
        isOpen={zoomItem.isOpen}
        onClose={() => setZoomItem((prev) => ({ ...prev, isOpen: false }))}
        imageUrl={zoomItem.imageUrl}
        itemName={zoomItem.name}
        price={zoomItem.price}
        category={zoomItem.category}
        description={zoomItem.description}
        onAddToCart={
          zoomItem.originalItem
            ? () => addToCart(zoomItem.originalItem!)
            : undefined
        }
      />

      {/* Floating Receptionist & Staff Live Chat Button */}
      {tableNumber && (
        <div className={`fixed z-40 ${cart.length > 0 ? 'bottom-24 right-4' : 'bottom-6 right-4'}`}>
          <button
            onClick={() => {
              setIsChatOpen(true);
              setUnreadChatCount(0);
            }}
            className="group px-4 py-2.5 rounded-full bg-[#121316]/95 border border-gold-400/50 shadow-2xl backdrop-blur-xl flex items-center space-x-2.5 hover:border-gold-400 hover:scale-105 transition-all text-xs font-bold text-white relative shadow-gold-glow"
          >
            <div className="relative">
              <MessageCircle className="w-4 h-4 text-gold-400" />
              {unreadChatCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
                  {unreadChatCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline">Staff Desk</span>
            <span className="px-1.5 py-0.5 rounded-md bg-stone-800 text-[10px] text-gold-300 font-mono">
              #{tableNumber}
            </span>
          </button>
        </div>
      )}

      {/* Table Live Chat Slide-Over Drawer */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md animate-fade-in p-0 sm:p-4">
          <div className="relative w-full max-w-lg h-[80vh] sm:h-[650px] bg-[#0e0f12] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-4 px-5 bg-[#121316] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-white flex items-center space-x-2">
                    <span>Receptionist & Staff Desk</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h3>
                  <span className="text-[10px] text-stone-400">
                    Live Chat connected to Table #{tableNumber}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Scroll Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3 bg-[#0a0b0d]">
              {tableMessages.length === 0 ? (
                <div className="py-16 text-center max-w-xs mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20 text-gold-400 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Direct Line to Hotel Staff
                  </h4>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    Have a question about a dish, need napkins, or want water? Send a message directly from Table #{tableNumber} and staff will respond promptly!
                  </p>
                </div>
              ) : (
                tableMessages.map((m) => {
                  const isCustomer = m.sender === 'customer';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-3 text-xs sm:text-sm ${
                          isCustomer
                            ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-black font-semibold rounded-tr-sm shadow-md'
                            : 'bg-stone-900 border border-white/10 text-stone-100 rounded-tl-sm'
                        }`}
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider block mb-1 opacity-75">
                          {isCustomer ? `Table #${tableNumber} (You)` : 'Staff • Reception'}
                        </span>
                        <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      </div>
                      <span className="text-[9px] text-stone-500 font-mono mt-1 px-1">
                        {formatTime(m.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3.5 px-4 bg-[#121316] border-t border-white/10">
              <form onSubmit={handleSendCustomerMessage} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Type a message to reception..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isSendingChat}
                  className="flex-1 px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isSendingChat}
                  className="px-4 py-2.5 rounded-xl gold-btn text-xs font-bold flex items-center space-x-1.5 shadow-gold-glow disabled:opacity-50 text-black"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
