'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Download, Printer, ExternalLink, RefreshCw, Copy, Check, Sparkles } from 'lucide-react';

export default function HotelQRGeneratorPage() {
  const [qrData, setQrData] = useState<{
    targetUrl: string;
    qrDataUrl: string;
    hotelName: string;
    tableNumber: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchQR = async () => {
    try {
      setLoading(true);
      // Fetches single master QR code for the restaurant menu
      const res = await fetch('/api/hotel/qr');
      if (res.ok) {
        const data = await res.json();
        setQrData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQR();
  }, []);

  const handleDownload = () => {
    if (!qrData?.qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrData.qrDataUrl;
    a.download = `${qrData.hotelName.toLowerCase().replace(/\s+/g, '-')}-menu-qr.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (!qrData?.targetUrl) return;
    navigator.clipboard.writeText(qrData.targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white">
            Restaurant Menu QR Code
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            One universal QR code for all tables. Diners scan this code, enter their table number, and order.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl dark-btn text-stone-300 text-xs font-semibold flex items-center space-x-2 hover:text-white"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied URL!' : 'Copy Menu Link'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="px-4 py-2.5 rounded-xl dark-btn text-gold-400 text-xs font-bold flex items-center space-x-2 hover:border-gold-500/40"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl gold-btn text-xs font-bold flex items-center space-x-2 shadow-gold-glow"
          >
            <Printer className="w-4 h-4" />
            <span>Print Table Stand</span>
          </button>
        </div>
      </div>

      {/* Info Callout Banner */}
      <div className="p-4 bg-stone-900/60 border border-white/[0.08] rounded-2xl print:hidden flex items-center justify-between text-xs text-stone-300">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center text-gold-400 flex-shrink-0">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white block">Universal Table QR Code</span>
            <span className="text-stone-400 text-[11px]">
              Print this identical card for all dining tables, terrace, or bar counters. Guests will enter their own table number when ordering.
            </span>
          </div>
        </div>
        {qrData?.targetUrl && (
          <a
            href={qrData.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-gold-400 text-xs font-semibold transition"
          >
            <span>Preview Menu</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Table Tent Display Card */}
      <div className="flex justify-center">
        <div
          id="printable-table-tent"
          className="w-full max-w-sm bg-gradient-to-b from-[#0e0f12] via-[#16171B] to-[#121316] border-2 border-gold-400/40 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden print:border-black print:bg-white print:text-black print:shadow-none"
        >
          {/* Gold decorative corners */}
          <div className="absolute top-3 left-4 text-gold-400/40 text-lg print:hidden">✦</div>
          <div className="absolute top-3 right-4 text-gold-400/40 text-lg print:hidden">✦</div>
          <div className="absolute bottom-3 left-4 text-gold-400/40 text-lg print:hidden">✦</div>
          <div className="absolute bottom-3 right-4 text-gold-400/40 text-lg print:hidden">✦</div>

          <div className="border border-gold-400/25 rounded-2xl p-6 print:border-black">
            <span className="text-[10px] uppercase tracking-[0.3em] text-gold-400 font-serif font-bold print:text-gray-800">
              SCAN • ORDER • LIVE CHAT
            </span>
            <h2 className="text-2xl font-serif font-bold text-white mt-1.5 uppercase tracking-wide print:text-black">
              {qrData?.hotelName || 'Restaurant Menu'}
            </h2>

            {/* Table Badge */}
            <div className="inline-block my-3 px-4 py-1 rounded-full bg-stone-900 border border-gold-400/40 text-gold-400 font-bold text-xs shadow-gold-glow print:border-black print:text-black print:bg-gray-100">
              DIGITAL TABLE MENU
            </div>

            {/* QR Code Container */}
            <div className="my-4 p-3.5 bg-white rounded-2xl shadow-2xl inline-block border-2 border-gold-400/40">
              {loading ? (
                <div className="w-56 h-56 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 text-gold-400 animate-spin" />
                </div>
              ) : qrData?.qrDataUrl ? (
                <img
                  src={qrData.qrDataUrl}
                  alt="Restaurant Menu QR Code"
                  className="w-56 h-56 object-contain rounded-xl"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-stone-500">
                  QR unavailable
                </div>
              )}
            </div>

            <p className="text-xs font-medium text-stone-200 mt-2 print:text-gray-700">
              Scan with your phone camera, enter your table number, and order instantly.
            </p>
            <p className="text-[10px] text-gold-400 font-serif font-semibold mt-3 print:text-gray-500">
              Powered by SmartMenu Nepal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
