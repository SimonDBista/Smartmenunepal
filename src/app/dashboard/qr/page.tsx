'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  QrCode,
  Download,
  Printer,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Trash2,
  Users,
  Search,
  Layers,
  Sparkles,
  AlertCircle,
  X,
  Compass,
  ArrowRight,
} from 'lucide-react';

interface TableQRItem {
  id: string;
  tableNumber: string;
  name: string | null;
  capacity: number;
  isActive: boolean;
  targetUrl: string;
  qrDataUrl: string;
  createdAt: string;
}

export default function HotelQRGeneratorPage() {
  const [activeTab, setActiveTab] = useState<'tables' | 'master'>('tables');

  // Per-Table State
  const [tables, setTables] = useState<TableQRItem[]>([]);
  const [hotelName, setHotelName] = useState('Restaurant Menu');
  const [hotelSlug, setHotelSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Master QR State
  const [masterQR, setMasterQR] = useState<{
    targetUrl: string;
    qrDataUrl: string;
    hotelName: string;
  } | null>(null);
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterCopied, setMasterCopied] = useState(false);

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [printTable, setPrintTable] = useState<TableQRItem | null>(null);
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  // Single Add Form
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [isSavingTable, setIsSavingTable] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Generator Form
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkStart, setBulkStart] = useState('1');
  const [bulkCount, setBulkCount] = useState('10');
  const [bulkSection, setBulkSection] = useState('Main Dining');
  const [bulkCapacity, setBulkCapacity] = useState('4');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Fetch all tables with QRs
  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/hotel/tables');
      if (res.ok) {
        const data = await res.json();
        setTables(data.tables || []);
        if (data.hotelName) setHotelName(data.hotelName);
        if (data.hotelSlug) setHotelSlug(data.hotelSlug);
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch master universal QR
  const fetchMasterQR = async () => {
    try {
      setMasterLoading(true);
      const res = await fetch('/api/hotel/qr');
      if (res.ok) {
        const data = await res.json();
        setMasterQR(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMasterLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchMasterQR();
  }, []);

  // Filtered tables
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase().trim();
    return tables.filter(
      (t) =>
        t.tableNumber.toLowerCase().includes(q) ||
        (t.name && t.name.toLowerCase().includes(q))
    );
  }, [tables, searchQuery]);

  // Single Table Creation
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) {
      setFormError('Table number or code is required');
      return;
    }

    try {
      setIsSavingTable(true);
      setFormError(null);
      const res = await fetch('/api/hotel/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: newTableNumber.trim(),
          name: newTableName.trim() || undefined,
          capacity: parseInt(newTableCapacity, 10) || 4,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to add table');
        return;
      }

      setNewTableNumber('');
      setNewTableName('');
      setNewTableCapacity('4');
      setIsAddModalOpen(false);
      await fetchTables();
    } catch (err: any) {
      setFormError(err?.message || 'Network error');
    } finally {
      setIsSavingTable(false);
    }
  };

  // Bulk Tables Creation
  const handleBulkGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsBulkSaving(true);
      setFormError(null);
      const res = await fetch('/api/hotel/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bulk: true,
          prefix: bulkPrefix,
          start: parseInt(bulkStart, 10) || 1,
          count: parseInt(bulkCount, 10) || 10,
          sectionName: bulkSection.trim() || undefined,
          capacity: parseInt(bulkCapacity, 10) || 4,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to generate tables');
        return;
      }

      setIsBulkModalOpen(false);
      await fetchTables();
    } catch (err: any) {
      setFormError(err?.message || 'Network error');
    } finally {
      setIsBulkSaving(false);
    }
  };

  // Delete Table
  const handleDeleteTable = async (id: string, tableNumber: string) => {
    if (!confirm(`Are you sure you want to delete Table "${tableNumber}"?`)) return;

    try {
      const res = await fetch(`/api/hotel/tables?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTables((prev) => prev.filter((t) => t.id !== id));
      } else {
        alert('Failed to delete table');
      }
    } catch (err) {
      console.error(err);
      alert('Error deleting table');
    }
  };

  // Download Single QR
  const handleDownload = (qrDataUrl: string, fileName: string) => {
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = fileName;
    a.click();
  };

  // Copy Link
  const handleCopy = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Trigger Print for Single Stand
  const triggerSinglePrint = (table: TableQRItem) => {
    setPrintTable(table);
    setIsBulkPrinting(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Trigger Print for All Stands
  const triggerBulkPrint = () => {
    setPrintTable(null);
    setIsBulkPrinting(true);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-serif font-bold text-white">Menu QR Codes & Tables</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold-400/10 text-gold-400 border border-gold-400/20">
              Per-Table QR
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Generate separate QR codes for each table. Guests scan their exact table stand to open the menu with verified table tracking.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 p-1 bg-stone-900/90 border border-white/10 rounded-2xl">
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'tables'
                ? 'bg-gold-500 text-black shadow-gold-glow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Table QRs ({tables.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === 'master'
                ? 'bg-gold-500 text-black shadow-gold-glow'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Master Menu QR</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: PER-TABLE QR CODES & MANAGEMENT                       */}
      {/* ============================================================ */}
      {activeTab === 'tables' && (
        <div className="space-y-6 print:hidden">
          {/* Action Bar & Quick Stats */}
          <div className="p-4 bg-stone-900/70 border border-white/[0.08] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search and Table Count */}
            <div className="flex items-center space-x-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search table number or section..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-stone-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                />
              </div>
              <span className="text-[11px] font-semibold text-stone-400 whitespace-nowrap px-2.5 py-1.5 bg-stone-800 rounded-lg border border-white/5">
                {filteredTables.length} {filteredTables.length === 1 ? 'Table' : 'Tables'}
              </span>
            </div>

            {/* Buttons: Add Table, Bulk Generate, Print All */}
            <div className="flex items-center flex-wrap gap-2.5">
              <button
                onClick={() => {
                  setFormError(null);
                  setIsAddModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl dark-btn text-stone-200 text-xs font-semibold flex items-center space-x-1.5 hover:text-white"
              >
                <Plus className="w-3.5 h-3.5 text-gold-400" />
                <span>Add Table</span>
              </button>

              <button
                onClick={() => {
                  setFormError(null);
                  setIsBulkModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl dark-btn text-gold-400 text-xs font-semibold flex items-center space-x-1.5 hover:border-gold-500/40"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bulk Generate</span>
              </button>

              <button
                onClick={triggerBulkPrint}
                disabled={tables.length === 0}
                className="px-4 py-2 rounded-xl gold-btn text-xs font-bold flex items-center space-x-2 shadow-gold-glow disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Print All Table Stands</span>
              </button>
            </div>
          </div>

          {/* Quick Notice Banner */}
          <div className="p-4 bg-gradient-to-r from-gold-500/10 via-stone-900 to-stone-900 border border-gold-500/20 rounded-2xl flex items-center justify-between text-xs text-stone-300">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400 flex-shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Unique Table QR Isolation</span>
                <span className="text-stone-400 text-[11px]">
                  Each table stand has its own unique QR code. When diners scan it, the system automatically detects their table number and locks it during ordering.
                </span>
              </div>
            </div>
            <button
              onClick={fetchTables}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-gold-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Table QR Cards Grid */}
          {loading ? (
            <div className="py-24 text-center">
              <RefreshCw className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold text-stone-400">Loading tables & generating QR codes...</p>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="p-12 text-center bg-stone-900/40 border border-dashed border-white/10 rounded-3xl">
              <QrCode className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No Tables Found</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto mb-4">
                {searchQuery
                  ? `No tables match your search "${searchQuery}".`
                  : 'Start by adding your dining tables or click Bulk Generate to create tables 1 to 10 in seconds.'}
              </p>
              <button
                onClick={() => setIsBulkModalOpen(true)}
                className="px-4 py-2 rounded-xl gold-btn text-xs font-bold inline-flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Bulk Generate Tables</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredTables.map((table) => (
                <div
                  key={table.id}
                  className="bg-[#111216] border border-white/[0.08] hover:border-gold-500/40 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-lg hover:shadow-gold-500/5 relative overflow-hidden"
                >
                  {/* Decorative top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gold-400/40 to-transparent opacity-0 group-hover:opacity-100 transition" />

                  {/* Header: Table Number, Section & Capacity */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gold-400 block">
                          {table.name || 'Dining Area'}
                        </span>
                        <h3 className="text-xl font-serif font-black text-white">
                          Table #{table.tableNumber}
                        </h3>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300 border border-white/5 flex items-center space-x-1">
                          <Users className="w-2.5 h-2.5 text-gold-400" />
                          <span>{table.capacity}</span>
                        </span>
                        <button
                          onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                          title="Delete Table"
                          className="p-1.5 text-stone-600 hover:text-red-400 rounded-lg hover:bg-stone-800/60 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-white p-3.5 rounded-2xl shadow-inner border border-gold-400/30 flex justify-center my-2 group-hover:border-gold-400 transition">
                      <img
                        src={table.qrDataUrl}
                        alt={`QR Code Table ${table.tableNumber}`}
                        className="w-44 h-44 object-contain rounded-lg"
                      />
                    </div>

                    {/* Direct URL preview */}
                    <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-stone-950/70 border border-white/5 flex items-center justify-between text-[11px] font-mono text-stone-400">
                      <span className="truncate max-w-[170px]">{table.targetUrl.replace(/^https?:\/\//, '')}</span>
                      <a
                        href={table.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Test Guest Menu"
                        className="text-gold-400 hover:text-gold-300 ml-1 flex-shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3.5 border-t border-white/[0.08] flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleCopy(table.targetUrl, table.id)}
                      title="Copy Direct Link"
                      className="p-2 rounded-xl bg-stone-900 border border-white/5 text-stone-300 hover:text-white hover:border-gold-400/30 transition text-xs flex items-center justify-center flex-1"
                    >
                      {copiedId === table.id ? (
                        <span className="text-[10px] font-bold text-emerald-400 flex items-center space-x-1">
                          <Check className="w-3 h-3" />
                          <span>Copied!</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-stone-300 flex items-center space-x-1">
                          <Copy className="w-3 h-3" />
                          <span>Link</span>
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() =>
                        handleDownload(
                          table.qrDataUrl,
                          `${hotelSlug || 'restaurant'}-table-${table.tableNumber}-qr.png`
                        )
                      }
                      title="Download PNG QR"
                      className="p-2 rounded-xl bg-stone-900 border border-white/5 text-gold-400 hover:text-gold-300 hover:border-gold-400/40 transition text-xs flex items-center justify-center space-x-1 flex-1 font-semibold"
                    >
                      <Download className="w-3 h-3" />
                      <span className="text-[10px]">PNG</span>
                    </button>

                    <button
                      onClick={() => triggerSinglePrint(table)}
                      title="Print Luxury Stand Card"
                      className="p-2 rounded-xl gold-btn text-xs font-bold flex items-center justify-center space-x-1 flex-1 shadow-gold-glow"
                    >
                      <Printer className="w-3 h-3" />
                      <span className="text-[10px]">Print</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: MASTER / GENERAL MENU QR                             */}
      {/* ============================================================ */}
      {activeTab === 'master' && (
        <div className="space-y-6 print:hidden">
          <div className="p-4 bg-stone-900/60 border border-white/[0.08] rounded-2xl flex items-center justify-between text-xs text-stone-300">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-gold-400 flex-shrink-0">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-white block">Universal Counter & Marketing QR</span>
                <span className="text-stone-400 text-[11px]">
                  Does not specify any table. Ideal for reception counters, takeout flyers, social media, or door stands. Diners enter their table manually.
                </span>
              </div>
            </div>
            {masterQR?.targetUrl && (
              <a
                href={masterQR.targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-gold-400 text-xs font-semibold transition"
              >
                <span>Preview</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-sm bg-gradient-to-b from-[#0e0f12] via-[#16171B] to-[#121316] border-2 border-gold-400/40 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
              <div className="border border-gold-400/25 rounded-2xl p-6">
                <span className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-serif font-bold">
                  SCAN • BROWSE • ORDER
                </span>
                <h2 className="text-2xl font-serif font-bold text-white mt-1.5 uppercase tracking-wide">
                  {masterQR?.hotelName || hotelName}
                </h2>

                <div className="inline-block my-3 px-4 py-1 rounded-full bg-stone-900 border border-gold-400/40 text-gold-400 font-bold text-xs shadow-gold-glow">
                  UNIVERSAL DIGITAL MENU
                </div>

                <div className="my-4 p-3.5 bg-white rounded-2xl shadow-2xl inline-block border-2 border-gold-400/40">
                  {masterLoading ? (
                    <div className="w-56 h-56 flex items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
                    </div>
                  ) : masterQR?.qrDataUrl ? (
                    <img
                      src={masterQR.qrDataUrl}
                      alt="Universal Menu QR Code"
                      className="w-56 h-56 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-500">
                      QR unavailable
                    </div>
                  )}
                </div>

                <p className="text-xs font-medium text-stone-200 mt-2">
                  Scan to browse our digital menu, 3D dishes, and place your order.
                </p>

                <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center space-x-3">
                  <button
                    onClick={() => {
                      if (!masterQR?.targetUrl) return;
                      navigator.clipboard.writeText(masterQR.targetUrl);
                      setMasterCopied(true);
                      setTimeout(() => setMasterCopied(false), 2000);
                    }}
                    className="px-3.5 py-2 rounded-xl dark-btn text-xs font-semibold text-stone-300 flex items-center space-x-1.5"
                  >
                    {masterCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{masterCopied ? 'Copied!' : 'Copy Link'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (!masterQR?.qrDataUrl) return;
                      handleDownload(masterQR.qrDataUrl, `${hotelSlug || 'restaurant'}-universal-qr.png`);
                    }}
                    className="px-3.5 py-2 rounded-xl gold-btn text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 1: ADD SINGLE TABLE                                    */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121316] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-white">Add New Dining Table</h3>
                <p className="text-[11px] text-stone-400">Creates a table and generates its unique QR link.</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Table Number or Code <span className="text-gold-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 15, T-09, Rooftop-VIP, Cabana-1"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  This exact label will be printed on the table stand and linked to guest orders.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Section / Area Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Terrace, Main Hall"
                    value={newTableName}
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="4"
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl dark-btn text-xs font-semibold text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingTable}
                  className="px-5 py-2.5 rounded-xl gold-btn text-xs font-bold flex items-center space-x-1.5 shadow-gold-glow disabled:opacity-50"
                >
                  {isSavingTable && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSavingTable ? 'Creating...' : 'Create Table'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: BULK TABLE GENERATOR                                */}
      {/* ============================================================ */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#121316] border border-white/10 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center text-gold-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-white">Bulk Table Generator</h3>
                <p className="text-[11px] text-stone-400">Generate a series of tables with 1 click.</p>
              </div>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleBulkGenerate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Start Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bulkStart}
                    onChange={(e) => setBulkStart(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    How Many Tables?
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bulkCount}
                    onChange={(e) => setBulkCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1">
                  Prefix (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 'T-' or 'Table ' (leave blank for 1, 2, 3...)"
                  value={bulkPrefix}
                  onChange={(e) => setBulkPrefix(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                />
                <span className="text-[10px] text-stone-500 mt-1 block">
                  Preview: {bulkPrefix}{bulkStart}, {bulkPrefix}{parseInt(bulkStart, 10) + 1} ... {bulkPrefix}{parseInt(bulkStart, 10) + parseInt(bulkCount, 10) - 1}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Section Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Main Dining"
                    value={bulkSection}
                    onChange={(e) => setBulkSection(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 focus:outline-none focus:border-gold-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={bulkCapacity}
                    onChange={(e) => setBulkCapacity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-900 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-gold-400"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl dark-btn text-xs font-semibold text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkSaving}
                  className="px-5 py-2.5 rounded-xl gold-btn text-xs font-bold flex items-center space-x-1.5 shadow-gold-glow disabled:opacity-50"
                >
                  {isBulkSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isBulkSaving ? 'Generating...' : `Generate ${bulkCount} Tables`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PRINT-ONLY AREA: SINGLE OR BULK TABLE TENT CARDS             */}
      {/* ============================================================ */}
      <div className="hidden print:block print:w-full">
        {/* Case A: Single Table Print */}
        {printTable && (
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="w-[340px] border-2 border-black rounded-3xl p-6 text-center text-black bg-white">
              <span className="text-[10px] uppercase tracking-[0.25em] font-bold text-gray-700 block">
                SCAN • ORDER • LIVE CHAT
              </span>
              <h2 className="text-xl font-serif font-black uppercase tracking-wide mt-1">
                {hotelName}
              </h2>

              <div className="my-3 py-1.5 px-4 rounded-full border border-black bg-gray-100 font-bold text-sm tracking-wider inline-block">
                TABLE #{printTable.tableNumber}
              </div>

              {printTable.name && (
                <span className="text-[11px] font-semibold text-gray-600 block mb-2">
                  {printTable.name} • Capacity: {printTable.capacity} Guests
                </span>
              )}

              <div className="my-3 p-3 border-2 border-black rounded-2xl inline-block bg-white">
                <img
                  src={printTable.qrDataUrl}
                  alt={`QR Code Table ${printTable.tableNumber}`}
                  className="w-52 h-52 object-contain"
                />
              </div>

              <p className="text-xs font-semibold text-gray-800 mt-2 leading-relaxed">
                Scan with your phone camera to view the menu, 3D dishes, and place your order.
              </p>
              <p className="text-[10px] font-bold text-gray-500 mt-3 uppercase tracking-wider">
                SmartMenu Nepal
              </p>
            </div>
          </div>
        )}

        {/* Case B: Bulk Print All Tables (Formatted 2-per-row sheet) */}
        {isBulkPrinting && (
          <div className="grid grid-cols-2 gap-6 p-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="border-2 border-black rounded-3xl p-5 text-center text-black bg-white flex flex-col justify-between break-inside-avoid page-break-inside-avoid my-2"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-gray-700 block">
                    SCAN • ORDER • LIVE CHAT
                  </span>
                  <h2 className="text-lg font-serif font-black uppercase tracking-wide mt-0.5 truncate">
                    {hotelName}
                  </h2>

                  <div className="my-2 py-1 px-4 rounded-full border border-black bg-gray-100 font-bold text-xs tracking-wider inline-block">
                    TABLE #{table.tableNumber}
                  </div>

                  {table.name && (
                    <span className="text-[10px] font-semibold text-gray-600 block mb-1">
                      {table.name}
                    </span>
                  )}
                </div>

                <div className="my-2 p-2 border-2 border-black rounded-xl inline-block mx-auto bg-white">
                  <img
                    src={table.qrDataUrl}
                    alt={`QR Code Table ${table.tableNumber}`}
                    className="w-40 h-40 object-contain"
                  />
                </div>

                <div>
                  <p className="text-[11px] font-semibold text-gray-800 mt-1 leading-snug">
                    Scan with phone camera to order directly.
                  </p>
                  <p className="text-[9px] font-bold text-gray-500 mt-1 uppercase tracking-wider">
                    SmartMenu Nepal
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
