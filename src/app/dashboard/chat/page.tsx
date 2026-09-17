'use client';

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
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
  Users,
  Utensils,
  AlertCircle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { formatTime, formatDate } from '@/lib/utils';
import { useSocket } from '@/lib/socket';
import { playStaffMessageChime, playChime } from '@/lib/audio';

interface TableChatSummary {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  isActive: boolean;
  activeOrder: {
    id: string;
    status: string;
    customerName: string | null;
    totalAmount: number;
    createdAt: string;
  } | null;
  latestMessage: {
    id: string;
    sender: 'customer' | 'staff';
    message: string;
    createdAt: string;
  } | null;
  messageCount: number;
  unreadCount: number;
}

interface ChatMessageItem {
  id: string;
  tableNumber?: string | null;
  orderId?: string | null;
  sender: 'customer' | 'staff';
  message: string;
  createdAt: string;
}

export default function HotelLiveChatCenter() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-xs text-slate-400">
          <RefreshCw className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-2 shadow-gold-glow" />
          Loading table chat inbox...
        </div>
      }
    >
      <HotelLiveChatContent />
    </Suspense>
  );
}

function HotelLiveChatContent() {
  const searchParams = useSearchParams();
  const initialTableParam = searchParams?.get('tableNumber') || '';

  const [tables, setTables] = useState<TableChatSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableChatSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [hotelId, setHotelId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const isSendingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  // 1. Fetch tables with chat summaries (sorted ascending from API)
  const fetchTableSummaries = async () => {
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
        const tableList: TableChatSummary[] = data.tables || [];
        setTables(tableList);

        if (initialTableParam) {
          const match = tableList.find((t) => t.tableNumber === initialTableParam);
          if (match) setSelectedTable(match);
        } else if (tableList.length > 0 && !selectedTable) {
          setSelectedTable(tableList[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load table chats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableSummaries();
  }, []);

  // 2. Fetch messages for the currently selected table
  const fetchTableMessages = async (tableNumber: string) => {
    try {
      setMessagesLoading(true);
      const res = await fetch(`/api/hotel/chat?tableNumber=${encodeURIComponent(tableNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedTable) return;
    fetchTableMessages(selectedTable.tableNumber);
  }, [selectedTable?.tableNumber]);

  // 3. Socket subscriptions
  useEffect(() => {
    if (!socket || !hotelId) return;

    socket.emit('join_hotel', hotelId);

    if (selectedTable) {
      socket.emit('join_table', {
        hotelId,
        tableNumber: selectedTable.tableNumber,
      });
    }

    const norm = (s?: string | null) => String(s || '').trim().toLowerCase().replace(/^table\s*/i, '');

    const handleNewMessage = (msg: ChatMessageItem) => {
      const msgTable = norm(msg.tableNumber);
      const selTable = norm(selectedTable?.tableNumber);

      // 1. If currently viewing this table, add message to chat view
      if (selectedTable && (msg.tableNumber === selectedTable.tableNumber || (msgTable && msgTable === selTable))) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // 2. Play audio alert if customer sent it
      if (msg.sender === 'customer') {
        try {
          playStaffMessageChime();
        } catch {}
      }

      // 3. Update table summary list preview
      setTables((prev) => {
        const matchingTable = prev.find(
          (t) => t.tableNumber === msg.tableNumber || (msgTable && norm(t.tableNumber) === msgTable)
        );

        // If message arrived for a table not currently in list, refresh table summaries
        if (!matchingTable && msg.tableNumber) {
          fetchTableSummaries();
          return prev;
        }

        return prev.map((t) => {
          if (t.tableNumber === msg.tableNumber || (msgTable && norm(t.tableNumber) === msgTable)) {
            const isCurrentlySelected = selectedTable && (selectedTable.tableNumber === t.tableNumber || selTable === norm(t.tableNumber));
            return {
              ...t,
              latestMessage: {
                id: msg.id,
                sender: msg.sender,
                message: msg.message,
                createdAt: msg.createdAt,
              },
              messageCount: t.messageCount + 1,
              unreadCount:
                msg.sender === 'customer' && !isCurrentlySelected
                  ? t.unreadCount + 1
                  : t.unreadCount,
            };
          }
          return t;
        });
      });
    };

    const handleNotification = (data: any) => {
      if (data?.message) {
        const msg: ChatMessageItem = {
          ...data.message,
          tableNumber: data.message.tableNumber || data.tableNumber,
          orderId: data.message.orderId || data.orderId,
        };
        handleNewMessage(msg);
      }
    };

    socket.on('chat_message', handleNewMessage);
    socket.on('chat_notification', handleNotification);

    return () => {
      socket.off('chat_message', handleNewMessage);
      socket.off('chat_notification', handleNotification);
    };
  }, [socket, hotelId, selectedTable?.tableNumber]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message from staff
  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || replyText).trim();
    if (!textToSend || !selectedTable || isSendingRef.current) return;

    try {
      isSendingRef.current = true;
      setIsSending(true);
      const res = await fetch('/api/hotel/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: selectedTable.tableNumber,
          message: textToSend,
          orderId: selectedTable.activeOrder?.id || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newMsg = data.message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setReplyText('');

        // Update table summary
        setTables((prev) =>
          prev.map((t) =>
            t.tableNumber === selectedTable.tableNumber
              ? {
                  ...t,
                  latestMessage: {
                    id: newMsg.id,
                    sender: 'staff',
                    message: newMsg.message,
                    createdAt: newMsg.createdAt,
                  },
                  messageCount: t.messageCount + 1,
                }
              : t
          )
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  };

  // Clear chat history for selected table
  const handleClearChat = async () => {
    if (!selectedTable) return;
    if (!confirm(`Clear all chat messages for Table #${selectedTable.tableNumber}?`)) return;

    try {
      const res = await fetch(`/api/hotel/chat?tableNumber=${encodeURIComponent(selectedTable.tableNumber)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages([]);
        setTables((prev) =>
          prev.map((t) =>
            t.tableNumber === selectedTable.tableNumber
              ? { ...t, latestMessage: null, messageCount: 0, unreadCount: 0 }
              : t
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };


  // Filter tables by search query
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase().trim();
    return tables.filter(
      (t) =>
        t.tableNumber.toLowerCase().includes(q) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.activeOrder?.customerName && t.activeOrder.customerName.toLowerCase().includes(q))
    );
  }, [tables, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-serif font-bold text-white">Live Table Chat</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-400/10 text-gold-400 border border-gold-400/20">
              Ascending Table Order
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Initiate conversations with any dining table before or after they order. Tables sync directly with your QR generator.
          </p>
        </div>

        <button
          onClick={fetchTableSummaries}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl dark-btn text-xs font-semibold text-stone-300 flex items-center space-x-2 hover:text-white"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold-400' : ''}`} />
          <span>Refresh Tables</span>
        </button>
      </div>

      {/* Main Chat Layout: Left Tables Sidebar (Ascending) + Right Chat Window */}
      <div className="flex-1 bg-[#0e0f12] border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row min-h-0">
        {/* ============================================================ */}
        {/* LEFT SIDEBAR: TABLES IN ASCENDING ORDER                      */}
        {/* ============================================================ */}
        <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col shrink-0 bg-[#121316]">
          {/* Search bar & count */}
          <div className="p-4 border-b border-white/[0.08] space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search table number or section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
              <span>{filteredTables.length} Tables Configured</span>
              <span className="text-gold-400 font-semibold text-[10px] uppercase tracking-wider">
                Sorted 1 → N
              </span>
            </div>
          </div>

          {/* Tables list (Natural Ascending Order) */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]">
            {loading && tables.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                <RefreshCw className="w-6 h-6 text-gold-400 animate-spin mx-auto mb-2" />
                Loading tables...
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                No tables found matching "{searchQuery}"
              </div>
            ) : (
              filteredTables.map((t) => {
                const isSelected = selectedTable?.tableNumber === t.tableNumber;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t)}
                    className={`w-full text-left p-4 transition-all flex items-start justify-between gap-3 relative ${
                      isSelected
                        ? 'bg-gradient-to-r from-gold-500/15 via-gold-500/5 to-transparent border-l-4 border-gold-400'
                        : 'hover:bg-stone-900/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      {/* Table Number & Section */}
                      <div className="flex items-center space-x-2">
                        <span className="font-serif font-black text-sm text-white">
                          Table #{t.tableNumber}
                        </span>
                        {t.name && (
                          <span className="text-[10px] font-semibold text-gold-400/90 px-2 py-0.2 rounded-full bg-gold-400/10 border border-gold-400/20 truncate max-w-[120px]">
                            {t.name}
                          </span>
                        )}
                      </div>

                      {/* Active Order status badge if diners are seated */}
                      {t.activeOrder ? (
                        <div className="mt-1 flex items-center space-x-1.5 text-[10px] font-semibold text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>
                            Active Order • {t.activeOrder.customerName || 'Diner'} (NPR {t.activeOrder.totalAmount})
                          </span>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center space-x-1 text-[10px] text-stone-500">
                          <Users className="w-3 h-3 text-stone-600" />
                          <span>Capacity: {t.capacity}</span>
                        </div>
                      )}

                      {/* Latest message snippet */}
                      <p className="text-xs text-stone-400 truncate mt-1.5 font-normal">
                        {t.latestMessage ? (
                          <span>
                            <strong className={t.latestMessage.sender === 'staff' ? 'text-gold-400' : 'text-stone-300'}>
                              {t.latestMessage.sender === 'staff' ? 'You: ' : 'Guest: '}
                            </strong>
                            {t.latestMessage.message}
                          </span>
                        ) : (
                          <span className="italic text-stone-500 text-[11px]">
                            No chat yet • Tap to start
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Timestamp & unread badge */}
                    <div className="flex flex-col items-end space-y-1.5 shrink-0">
                      {t.latestMessage && (
                        <span className="text-[10px] text-stone-500 font-mono">
                          {formatTime(t.latestMessage.createdAt)}
                        </span>
                      )}
                      {t.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-gold-400 text-black font-black text-[10px] flex items-center justify-center shadow-gold-glow">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT CHAT WINDOW: SELECTED TABLE LIVE CHAT                  */}
        {/* ============================================================ */}
        <div className="flex-1 flex flex-col bg-[#0b0c0e] min-w-0">
          {selectedTable ? (
            <>
              {/* Chat Window Top Bar */}
              <div className="p-4 px-6 border-b border-white/[0.08] bg-[#111216] flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-gold-400 font-serif font-black text-sm shrink-0">
                    #{selectedTable.tableNumber}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-serif font-bold text-white truncate">
                        Table #{selectedTable.tableNumber}
                      </h2>
                      {selectedTable.name && (
                        <span className="text-[11px] text-stone-400 font-normal">
                          • {selectedTable.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3 text-stone-500" />
                        <span>Seats {selectedTable.capacity}</span>
                      </span>
                      {selectedTable.activeOrder && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Active Order #{selectedTable.activeOrder.id.slice(-5).toUpperCase()}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {selectedTable.activeOrder && (
                    <a
                      href={`/order/${selectedTable.activeOrder.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl dark-btn text-xs font-semibold text-gold-400 flex items-center space-x-1.5 hover:border-gold-400/40"
                    >
                      <span>View Order</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {messages.length > 0 && (
                    <button
                      onClick={handleClearChat}
                      title="Clear chat history"
                      className="p-2 text-stone-500 hover:text-red-400 rounded-xl hover:bg-stone-900 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messagesLoading ? (
                  <div className="p-8 text-center text-xs text-stone-500">
                    <RefreshCw className="w-6 h-6 text-gold-400 animate-spin mx-auto mb-2" />
                    Loading conversation...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-20 text-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20 text-gold-400 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-serif font-bold text-white mb-1">
                      No Messages with Table #{selectedTable.tableNumber}
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      Type a message below to start the conversation with this table.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isStaff = m.sender === 'staff';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl p-3.5 shadow-md ${
                            isStaff
                              ? 'bg-gradient-to-r from-gold-500 to-gold-400 text-black rounded-tr-sm font-medium'
                              : 'bg-stone-900 border border-white/10 text-stone-100 rounded-tl-sm'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1 opacity-80 text-[10px] font-bold uppercase tracking-wider">
                            <span>{isStaff ? 'Staff • Reception' : `Table #${selectedTable.tableNumber}`}</span>
                          </div>
                          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                            {m.message}
                          </p>
                        </div>
                        <span className="text-[10px] text-stone-500 font-mono mt-1 px-1">
                          {formatTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Box */}
              <div className="p-4 px-6 border-t border-white/[0.08] bg-[#111216]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center space-x-3"
                >
                  <input
                    type="text"
                    placeholder={`Message Table #${selectedTable.tableNumber}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={isSending}
                    className="flex-1 px-4 py-3 bg-stone-900/90 border border-white/10 rounded-2xl text-xs sm:text-sm text-white placeholder-stone-500 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim() || isSending}
                    className="px-5 py-3 rounded-2xl gold-btn text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-gold-glow disabled:opacity-50 transition-all"
                  >
                    {isSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <Send className="w-4 h-4 text-black" />
                    )}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-stone-500">
              Select a table from the left to start live chat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
