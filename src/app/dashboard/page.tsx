'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Clock,
  ChefHat,
  CheckCircle2,
  XCircle,
  Printer,
  MessageCircle,
  RefreshCw,
  Search,
  AlertCircle,
  Filter,
  Sparkles,
  Volume2,
  ArrowRight,
  Archive,
} from 'lucide-react';
import { OrderData, OrderItem } from '@/lib/types';
import { formatNPR, formatDate, formatTime } from '@/lib/utils';
import { useSocket } from '@/lib/socket';
import { playChime } from '@/lib/audio';
import ReceiptModal from '@/components/ReceiptModal';

export default function HotelOrdersDashboard() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tableSearch, setTableSearch] = useState<string>('');
  const [hotelId, setHotelId] = useState<string>('');
  const [hotelName, setHotelName] = useState<string>('Hotel');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<OrderData | null>(null);
  const [incomingAlert, setIncomingAlert] = useState<string | null>(null);
  const [clearConfirmModal, setClearConfirmModal] = useState<{
    isOpen: boolean;
    tableNumber?: string;
    count: number;
  } | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/hotel/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setHotelId(meData.hotel.id);
        setHotelName(meData.hotel.name);
      }

      const res = await fetch('/api/hotel/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Socket.io Realtime Listener
  useEffect(() => {
    if (!socket || !hotelId) return;

    socket.emit('join_hotel', hotelId);

    const handleNewOrder = (newOrder: OrderData) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      playChime('order');
      setIncomingAlert(`New incoming order for Table #${newOrder.tableNumber}!`);
      setTimeout(() => setIncomingAlert(null), 6000);
    };

    const handleOrderUpdated = (data: { orderId: string; status: string; order?: OrderData }) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === data.orderId ? { ...o, status: data.status as any } : o))
      );
    };

    const handleOrdersCleared = () => {
      fetchOrders();
    };

    socket.on('new_order', handleNewOrder);
    socket.on('order_updated', handleOrderUpdated);
    socket.on('orders_cleared', handleOrdersCleared);

    return () => {
      socket.off('new_order', handleNewOrder);
      socket.off('order_updated', handleOrderUpdated);
      socket.off('orders_cleared', handleOrdersCleared);
    };
  }, [socket, hotelId]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/hotel/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as any } : o))
        );
        playChime('message');
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleClearOrders = async (tableNumber?: string) => {
    try {
      setIsClearing(true);
      const res = await fetch('/api/hotel/orders/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableNumber || undefined,
          allCompleted: !tableNumber,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details ? `${data.error}: ${data.details}` : (data.error || 'Failed to clear orders'));
      }

      await fetchOrders();
      setClearConfirmModal(null);
      playChime('success');
    } catch (err: any) {
      alert(err.message || 'Error clearing orders');
    } finally {
      setIsClearing(false);
    }
  };

  // Group orders by table number for consolidated table boxes
  interface TableGroup {
    tableNumber: string;
    customerName?: string;
    customerPhone?: string;
    orders: OrderData[];
    totalAmount: number;
    latestCreatedAt: string | Date;
    hasReceived: boolean;
    hasInProgress: boolean;
    hasDone: boolean;
    allCancelled: boolean;
    allDone: boolean;
  }

  const tableGroups: TableGroup[] = React.useMemo(() => {
    const map = new Map<string, TableGroup>();

    // Sort chronologically (oldest to newest: Round 1, Round 2, ...)
    const sorted = [...orders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    for (const order of sorted) {
      const key = order.tableNumber.trim().toUpperCase();
      if (!map.has(key)) {
        map.set(key, {
          tableNumber: order.tableNumber,
          customerName: order.customerName || undefined,
          customerPhone: order.customerPhone || undefined,
          orders: [],
          totalAmount: 0,
          latestCreatedAt: order.createdAt,
          hasReceived: false,
          hasInProgress: false,
          hasDone: false,
          allCancelled: true,
          allDone: true,
        });
      }

      const group = map.get(key)!;
      group.orders.push(order);
      if (order.status !== 'cancelled') {
        group.totalAmount += order.totalAmount;
      }
      if (order.customerName) group.customerName = order.customerName;
      if (order.customerPhone) group.customerPhone = order.customerPhone;
      if (new Date(order.createdAt).getTime() > new Date(group.latestCreatedAt).getTime()) {
        group.latestCreatedAt = order.createdAt;
      }
      if (order.status === 'received') group.hasReceived = true;
      if (order.status === 'in_progress') group.hasInProgress = true;
      if (order.status === 'done') group.hasDone = true;
      if (order.status !== 'cancelled') group.allCancelled = false;
      if (order.status !== 'done' && order.status !== 'cancelled') group.allDone = false;
    }

    // Sort table groups: prioritize tables with new received orders, then in-kitchen, then newest
    return Array.from(map.values()).sort((a, b) => {
      if (a.hasReceived && !b.hasReceived) return -1;
      if (!a.hasReceived && b.hasReceived) return 1;
      if (a.hasInProgress && !b.hasInProgress) return -1;
      if (!a.hasInProgress && b.hasInProgress) return 1;
      return new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime();
    });
  }, [orders]);

  const filteredTableGroups = tableGroups.filter((group) => {
    let matchesStatus = true;
    if (statusFilter === 'received') {
      matchesStatus = group.hasReceived;
    } else if (statusFilter === 'in_progress') {
      matchesStatus = group.hasInProgress;
    } else if (statusFilter === 'done') {
      matchesStatus = group.allDone && group.hasDone;
    } else if (statusFilter === 'cancelled') {
      matchesStatus = group.allCancelled;
    }

    const matchesTable =
      !tableSearch ||
      group.tableNumber.toLowerCase().includes(tableSearch.toLowerCase()) ||
      (group.customerName &&
        group.customerName.toLowerCase().includes(tableSearch.toLowerCase()));

    return matchesStatus && matchesTable;
  });

  const receivedCount = orders.filter((o) => o.status === 'received').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress').length;
  const doneCount = orders.filter((o) => o.status === 'done').length;

  return (
    <div className="space-y-8">
      {/* Realtime Alert Banner */}
      {incomingAlert && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-brandPink-600 via-rose-500 to-gold-500 text-white font-bold text-xs sm:text-sm shadow-pink-glow flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-2.5">
            <Volume2 className="w-5 h-5 animate-pulse" />
            <span>{incomingAlert}</span>
          </div>
          <button
            onClick={() => setIncomingAlert(null)}
            className="text-xs bg-black/40 hover:bg-black/60 px-3 py-1 rounded-xl"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-extrabold text-white">
            Live Kitchen & Table Feed
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Realtime multi-round order stream grouped by table with automatic audio alerts
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          {doneCount > 0 && (
            <button
              onClick={() => setClearConfirmModal({ isOpen: true, count: doneCount })}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
              title="Settle bills and clear finished orders from the live kitchen screen"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Settle & Clear All ({doneCount})</span>
            </button>
          )}
          <button
            onClick={() => playChime('order')}
            title="Test audio chime"
            className="p-2.5 rounded-xl dark-btn text-gold-400 hover:border-gold-500/40 transition"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={fetchOrders}
            className="px-4 py-2.5 rounded-xl dark-btn text-xs font-bold flex items-center space-x-2 hover:border-white/20 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Orders</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-dark-850/90 border border-white/[0.08] shadow-premium-card flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-medium block">All Orders / Tables</span>
            <span className="text-3xl font-serif font-black text-white mt-1 block">
              {orders.length} <span className="text-xs font-sans text-slate-500">({tableGroups.length} tables)</span>
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-dark-800 border border-white/[0.06] text-slate-300 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-dark-850/90 border border-gold-500/30 shadow-gold-glow flex items-center justify-between">
          <div>
            <span className="text-xs text-gold-400 font-medium block">New / Received</span>
            <span className="text-3xl font-serif font-black text-gold-400 mt-1 block">{receivedCount}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gold-500/20 text-gold-400 flex items-center justify-center border border-gold-500/30">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-dark-850/90 border border-brandPink-500/30 shadow-pink-glow flex items-center justify-between">
          <div>
            <span className="text-xs text-brandPink-400 font-medium block">Cooking Now</span>
            <span className="text-3xl font-serif font-black text-brandPink-400 mt-1 block">{inProgressCount}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-brandPink-500/20 text-brandPink-400 flex items-center justify-center border border-brandPink-500/30">
            <ChefHat className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-dark-850/90 border border-emerald-500/30 shadow-premium-card flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-400 font-medium block">Served / Done</span>
            <span className="text-3xl font-serif font-black text-emerald-400 mt-1 block">{doneCount}</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Orders', count: orders.length },
            { id: 'received', label: 'Received (New)', count: receivedCount },
            { id: 'in_progress', label: 'In Kitchen', count: inProgressCount },
            { id: 'done', label: 'Completed', count: doneCount },
            { id: 'cancelled', label: 'Cancelled', count: orders.filter((o) => o.status === 'cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'gold-btn text-black shadow-gold-glow'
                  : 'dark-btn text-slate-400 hover:text-white'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search Table # or Guest..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-dark-900 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-gold-500 shadow-inner"
          />
        </div>
      </div>

      {/* Orders Grid / Feed */}
      {loading && orders.length === 0 ? (
        <div className="p-16 text-center">
          <div className="w-12 h-12 rounded-full border-4 border-gold-500/20 border-t-gold-500 animate-spin mx-auto mb-3 shadow-gold-glow" />
          <p className="text-xs text-slate-400 font-medium">Connecting kitchen live feed...</p>
        </div>
      ) : filteredTableGroups.length === 0 ? (
        <div className="p-16 text-center bg-dark-850/60 border border-white/[0.06] rounded-3xl backdrop-blur">
          <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto mb-2 opacity-50" />
          <h3 className="font-serif font-bold text-white text-base">No active orders found</h3>
          <p className="text-xs text-slate-400 mt-1">
            Incoming table orders placed by diners will stream here live.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTableGroups.map((group) => {
            return (
              <div
                key={group.tableNumber}
                className={`bg-dark-850/90 backdrop-blur-xl border rounded-3xl p-6 shadow-premium-card flex flex-col justify-between transition-all duration-300 ${
                  group.hasReceived
                    ? 'border-gold-500/60 shadow-gold-glow ring-1 ring-gold-500/40'
                    : group.hasInProgress
                    ? 'border-brandPink-500/50 shadow-pink-glow'
                    : group.allDone
                    ? 'border-emerald-500/30'
                    : 'border-white/[0.06] opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar: Table & Total */}
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                    <div className="flex items-center space-x-2.5">
                      <span className="px-3.5 py-1.5 rounded-full bg-dark-950 border border-gold-500/40 text-gold-300 font-serif font-black text-sm shadow-inner">
                        TABLE #{group.tableNumber}
                      </span>
                      {group.orders.length > 1 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-brandPink-500/20 to-gold-500/20 text-gold-300 text-[10px] font-extrabold uppercase border border-gold-500/30 animate-pulse">
                          🔥 {group.orders.length} Rounds
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                        Combined Bill
                      </span>
                      <span className="text-base font-serif font-black text-gold-400">
                        {formatNPR(group.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {(group.customerName || group.customerPhone) && (
                    <div className="py-2.5 text-xs text-slate-300 flex items-center justify-between border-b border-white/[0.06]">
                      <span>Guest: <strong>{group.customerName || 'Walk-in'}</strong></span>
                      {group.customerPhone && (
                        <span className="text-slate-400 font-mono">{group.customerPhone}</span>
                      )}
                    </div>
                  )}

                  {/* Multi-Order Rounds List inside SAME Customer Box */}
                  <div className="py-3.5 space-y-3.5 max-h-96 overflow-y-auto pr-1">
                    {group.orders.map((order, roundIdx) => {
                      let items: OrderItem[] = [];
                      try {
                        items =
                          typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                      } catch {}

                      const isRoundReceived = order.status === 'received';
                      const isRoundInProgress = order.status === 'in_progress';
                      const isRoundDone = order.status === 'done';
                      const isRoundCancelled = order.status === 'cancelled';

                      return (
                        <div
                          key={order.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isRoundReceived
                              ? 'bg-gold-500/[0.08] border-gold-500/40 shadow-gold-glow animate-pulse-gold'
                              : isRoundInProgress
                              ? 'bg-brandPink-500/[0.06] border-brandPink-500/30 shadow-pink-glow'
                              : isRoundDone
                              ? 'bg-emerald-500/[0.04] border-emerald-500/20'
                              : 'bg-dark-900/50 border-white/[0.06] opacity-60'
                          }`}
                        >
                          {/* Round Header */}
                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/[0.06]">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-serif font-extrabold text-white">
                                {roundIdx === 0
                                  ? '1st Order (Initial)'
                                  : roundIdx === 1
                                  ? '2nd Order (Add-on)'
                                  : `${roundIdx + 1}th Order (Add-on)`}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatTime(order.createdAt)}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full ${
                                isRoundReceived
                                  ? 'bg-gold-500/20 text-gold-300 border border-gold-500/40'
                                  : isRoundInProgress
                                  ? 'bg-brandPink-500/20 text-brandPink-300 border border-brandPink-500/40'
                                  : isRoundDone
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-red-500/20 text-red-300'
                              }`}
                            >
                              {order.status}
                            </span>
                          </div>

                          {/* Items List */}
                          <div className="space-y-1.5 py-1">
                            {items.map((item, idx) => (
                              <div key={idx} className="flex items-start justify-between text-xs">
                                <div className="flex-1 pr-2">
                                  <span className="font-serif font-black text-gold-400 mr-2">
                                    {item.quantity}x
                                  </span>
                                  <span className="text-slate-200 font-semibold">{item.name}</span>
                                  {item.notes && (
                                    <p className="text-[10px] text-brandPink-400 italic mt-0.5">
                                      • {item.notes}
                                    </p>
                                  )}
                                </div>
                                <span className="font-bold text-slate-300">
                                  {formatNPR(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Instructions */}
                          {order.notes && (
                            <div className="mt-2 p-2 bg-dark-950/80 border border-yellow-500/30 rounded-lg text-[11px] text-yellow-300">
                              <span className="font-bold">Instructions: </span>
                              {order.notes}
                            </div>
                          )}

                          {/* Round Subtotal & Status Action Buttons */}
                          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                            <div className="flex items-center space-x-1.5 flex-1">
                              {isRoundReceived && (
                                <>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'in_progress')}
                                    className="flex-1 py-1.5 px-3 rounded-xl gold-btn text-[11px] font-bold flex items-center justify-center space-x-1 shadow-gold-glow"
                                  >
                                    <ChefHat className="w-3.5 h-3.5" />
                                    <span>Start Cooking</span>
                                  </button>
                                  <button
                                    onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                    className="py-1.5 px-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-semibold"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}

                              {isRoundInProgress && (
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'done')}
                                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-extrabold flex items-center justify-center space-x-1 shadow transition"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark as Served</span>
                                </button>
                              )}

                              {isRoundDone && (
                                <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Served to Table</span>
                                </span>
                              )}

                              {isRoundCancelled && (
                                <span className="text-[11px] text-red-400 font-semibold">
                                  Order Cancelled
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() => setSelectedReceiptOrder(order)}
                              title={`Print KOT for Round #${roundIdx + 1}`}
                              className="py-1 px-2.5 rounded-xl dark-btn text-slate-300 text-[10px] font-semibold flex items-center space-x-1 hover:border-gold-500/40 transition shrink-0"
                            >
                              <Printer className="w-3 h-3 text-gold-400" />
                              <span>KOT</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Table Box Footer Actions */}
                <div className="pt-4 border-t border-white/[0.08] flex items-center space-x-2 w-full">
                  {/* Print Combined Bill for Table */}
                  <button
                    onClick={() => {
                      const allItems: OrderItem[] = [];
                      group.orders.forEach((ord, oIdx) => {
                        if (ord.status === 'cancelled') return;
                        try {
                          const its: OrderItem[] =
                            typeof ord.items === 'string' ? JSON.parse(ord.items) : ord.items;
                          its.forEach((it) => {
                            allItems.push({
                              ...it,
                              name: group.orders.length > 1 ? `[R${oIdx + 1}] ${it.name}` : it.name,
                            });
                          });
                        } catch {}
                      });

                      const combinedOrder: OrderData = {
                        ...group.orders[group.orders.length - 1],
                        tableNumber: group.tableNumber,
                        customerName: group.customerName || '',
                        customerPhone: group.customerPhone || '',
                        totalAmount: group.totalAmount,
                        items: JSON.stringify(allItems),
                      };
                      setSelectedReceiptOrder(combinedOrder);
                    }}
                    className="flex-1 py-2.5 rounded-xl dark-btn text-slate-200 text-xs font-bold flex items-center justify-center space-x-1.5 hover:border-gold-500/50 transition shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5 text-gold-400" />
                    <span>Print Table Bill</span>
                  </button>

                  {group.allDone && (
                    <button
                      onClick={() =>
                        setClearConfirmModal({
                          isOpen: true,
                          tableNumber: group.tableNumber,
                          count: group.orders.length,
                        })
                      }
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 text-xs font-bold flex items-center space-x-1.5 transition shrink-0"
                      title="Settle bill and clear Table from active feed"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Settle & Clear</span>
                    </button>
                  )}

                  <Link
                    href={`/dashboard/chat?orderId=${group.orders[group.orders.length - 1].id}`}
                    className="px-4 py-2.5 rounded-xl dark-btn text-brandPink-400 text-xs font-bold flex items-center space-x-1.5 hover:border-brandPink-500/50 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Settle & Clear Orders Confirmation Modal */}
      {clearConfirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-dark-900 border border-white/10 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Archive className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-white">
                {clearConfirmModal.tableNumber
                  ? `Settle & Clear Table #${clearConfirmModal.tableNumber}?`
                  : `Settle All Completed Orders (${clearConfirmModal.count})?`}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                This will remove the completed orders from your live kitchen & table screen.
              </p>
              <div className="mt-3.5 p-3.5 bg-dark-950 rounded-2xl border border-gold-500/20 text-[11px] text-gold-300/90 text-left flex items-start space-x-2.5">
                <Sparkles className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Financial History Safe:</strong> All revenue, item breakdowns, and billing amounts are permanently recorded in your <strong>Sales & Analytics Reports</strong> (Last 7 Days, Last Month, All Time).
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2.5 pt-2">
              <button
                onClick={() => setClearConfirmModal(null)}
                disabled={isClearing}
                className="flex-1 py-2.5 rounded-xl dark-btn text-xs font-semibold text-slate-300"
              >
                Keep on Screen
              </button>
              <button
                onClick={() => handleClearOrders(clearConfirmModal.tableNumber)}
                disabled={isClearing}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition shadow-gold-glow flex items-center justify-center space-x-1.5"
              >
                {isClearing ? (
                  <span>Clearing...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Settle</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      <ReceiptModal
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
        order={selectedReceiptOrder}
        hotelName={hotelName}
      />
    </div>
  );
}
