import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';
import { OrderItem } from '@/lib/types';

function computeRawSubtotal(itemsStr: string | any[]): number {
  try {
    const items: OrderItem[] = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr;
    return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  } catch {
    return 0;
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, tableNumber, isTableBill, discountAmount = 0, discountPercent = 0, reason = '' } = body;

    const numDiscount = Math.max(0, parseFloat(String(discountAmount)) || 0);

    // ==========================================
    // CASE A: Table Bill (All active orders for table)
    // ==========================================
    if (isTableBill && tableNumber) {
      const orders = await prisma.order.findMany({
        where: {
          hotelId: auth.hotelId,
          tableNumber: String(tableNumber).trim(),
          status: { not: 'cancelled' },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (orders.length === 0) {
        return NextResponse.json({ error: 'No active orders found for this table' }, { status: 404 });
      }

      // Calculate total raw subtotal
      const rawSubtotals = orders.map((o) => computeRawSubtotal(o.items));
      const totalRaw = rawSubtotals.reduce((sum, val) => sum + val, 0);

      const cappedDiscount = Math.min(numDiscount, totalRaw);
      let remainingDiscountToDeduct = cappedDiscount;

      const updatedOrders = [];

      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        const raw = rawSubtotals[i];
        let ordDiscount = 0;

        if (i === orders.length - 1) {
          // Last order takes all remaining discount to ensure exact sum match
          ordDiscount = remainingDiscountToDeduct;
        } else if (totalRaw > 0) {
          ordDiscount = Math.round((raw / totalRaw) * cappedDiscount);
          if (ordDiscount > remainingDiscountToDeduct) {
            ordDiscount = remainingDiscountToDeduct;
          }
          remainingDiscountToDeduct -= ordDiscount;
        }

        const newTotal = Math.max(0, Math.round(raw - ordDiscount));

        // Format discount note
        let noteText = o.notes || '';
        if (cappedDiscount > 0) {
          const discountTag = `[Discount: NPR ${Math.round(cappedDiscount)}${discountPercent > 0 ? ` (${discountPercent}%)` : ''}${reason ? ` - ${reason}` : ''}]`;
          if (!noteText.includes('[Discount:')) {
            noteText = noteText ? `${noteText} ${discountTag}` : discountTag;
          }
        }

        const updated = await prisma.order.update({
          where: { id: o.id },
          data: {
            totalAmount: newTotal,
            discountAmount: ordDiscount,
            notes: noteText || null,
          },
        });

        updatedOrders.push(updated);
      }

      // Realtime notification
      try {
        const io = (global as any).io;
        if (io) {
          io.to(`hotel_${auth.hotelId}`).emit('orders_cleared'); // Triggers fresh order refetch
        }
      } catch (socketErr) {
        console.warn('Socket emit error in discount route:', socketErr);
      }

      return NextResponse.json({
        success: true,
        tableNumber,
        isTableBill: true,
        subtotal: totalRaw,
        discountAmount: cappedDiscount,
        totalPayable: Math.max(0, Math.round(totalRaw - cappedDiscount)),
        orders: updatedOrders,
      });
    }

    // ==========================================
    // CASE B: Single Order KOT / Receipt
    // ==========================================
    if (!orderId) {
      return NextResponse.json({ error: 'orderId or tableNumber is required' }, { status: 400 });
    }

    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, hotelId: auth.hotelId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const rawSubtotal = computeRawSubtotal(existingOrder.items);
    const orderSubtotal = rawSubtotal > 0 ? rawSubtotal : existingOrder.totalAmount;
    const cappedDiscount = Math.min(numDiscount, orderSubtotal);
    const newTotal = Math.max(0, Math.round(orderSubtotal - cappedDiscount));

    let noteText = existingOrder.notes || '';
    if (cappedDiscount > 0) {
      const discountTag = `[Discount: NPR ${Math.round(cappedDiscount)}${discountPercent > 0 ? ` (${discountPercent}%)` : ''}${reason ? ` - ${reason}` : ''}]`;
      if (!noteText.includes('[Discount:')) {
        noteText = noteText ? `${noteText} ${discountTag}` : discountTag;
      }
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        totalAmount: newTotal,
        discountAmount: cappedDiscount,
        notes: noteText || null,
      },
      include: {
        hotel: { select: { name: true, slug: true } },
        feedback: true,
      },
    });

    // Realtime notification
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`hotel_${auth.hotelId}`).emit('order_updated', {
          orderId: updated.id,
          status: updated.status,
          order: updated,
        });
        io.to(`order_${updated.id}`).emit('order_status_updated', {
          orderId: updated.id,
          status: updated.status,
          order: updated,
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit error in discount route:', socketErr);
    }

    return NextResponse.json({
      success: true,
      order: updated,
      subtotal: orderSubtotal,
      discountAmount: cappedDiscount,
      totalPayable: newTotal,
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    return NextResponse.json({ error: 'Failed to apply discount' }, { status: 500 });
  }
}
