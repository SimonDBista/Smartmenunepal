'use client';

import React from 'react';
import { X, Printer, CheckCircle2 } from 'lucide-react';
import { OrderData, OrderItem } from '@/lib/types';
import { formatNPR, formatDate } from '@/lib/utils';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderData | null;
  hotelName?: string;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  order,
  hotelName = 'Fine Dining Restaurant',
}: ReceiptModalProps) {
  if (!isOpen || !order) return null;

  let items: OrderItem[] = [];
  try {
    items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
  } catch {}

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="relative w-full max-w-md bg-white text-stone-900 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-full border border-stone-200">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#121316] text-stone-100 border-b border-white/[0.08] print:hidden">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-bronze-400" />
            <span className="font-serif font-semibold text-xs tracking-wider uppercase">
              Order Receipt / KOT Slip
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bronze-btn text-white text-xs font-semibold rounded-lg transition"
            >
              Print Slip
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Body */}
        <div className="p-6 font-mono text-xs leading-relaxed" id="printable-receipt">
          {/* Header */}
          <div className="text-center border-b-2 border-dashed border-stone-300 pb-4 mb-4">
            <h2 className="text-base font-serif font-bold tracking-widest uppercase text-stone-900">
              {hotelName}
            </h2>
            <p className="text-[11px] text-stone-500 mt-1">Guest Table Order</p>
            <div className="mt-2.5 inline-block px-3 py-0.5 bg-stone-100 rounded-full border border-stone-200 text-xs font-bold text-stone-800">
              TABLE #{order.tableNumber}
            </div>
          </div>

          {/* Meta Info */}
          <div className="text-[11px] text-stone-600 space-y-1 mb-4">
            <div className="flex justify-between">
              <span>Order ID:</span>
              <span className="font-bold font-mono text-stone-900">
                #{order.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
            {order.customerName && (
              <div className="flex justify-between">
                <span>Guest:</span>
                <span className="font-medium text-stone-900">{order.customerName}</span>
              </div>
            )}
            {order.customerPhone && (
              <div className="flex justify-between">
                <span>Phone:</span>
                <span>{order.customerPhone}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="uppercase font-bold text-stone-900">{order.status}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="border-t-2 border-dashed border-stone-300 pt-3 mb-4">
            <div className="flex justify-between text-[10px] font-bold text-stone-400 uppercase pb-2 border-b border-stone-200">
              <span className="w-8">Qty</span>
              <span className="flex-1 px-2">Item</span>
              <span className="text-right">Price</span>
            </div>
            <div className="divide-y divide-stone-100 py-1">
              {items.map((item, idx) => (
                <div key={idx} className="py-2 text-[11px]">
                  <div className="flex justify-between items-start font-medium">
                    <span className="w-8 font-bold text-stone-900">{item.quantity}x</span>
                    <span className="flex-1 px-2 text-stone-800">{item.name}</span>
                    <span className="text-right text-stone-900 font-semibold">
                      {formatNPR(item.price * item.quantity)}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[10px] text-amber-700 pl-8 mt-0.5 italic">
                      Note: {item.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Special Order Notes */}
          {order.notes && (
            <div className="p-2.5 bg-stone-50 border border-stone-200 rounded text-[11px] text-stone-700 mb-4">
              <span className="font-bold">Instructions: </span>
              {order.notes}
            </div>
          )}

          {/* Total */}
          <div className="border-t-2 border-dashed border-stone-400 pt-3 space-y-1.5">
            <div className="flex justify-between text-sm font-bold text-stone-900">
              <span>TOTAL AMOUNT:</span>
              <span className="font-serif text-base">{formatNPR(order.totalAmount)}</span>
            </div>
          </div>

          {/* Footer Barcode / Thank You */}
          <div className="text-center pt-6 mt-4 border-t border-stone-200 text-[11px] text-stone-500">
            <p className="font-semibold text-stone-800">Thank You For Dining With Us!</p>
            <p className="text-[10px] mt-0.5">Please visit us again soon.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
