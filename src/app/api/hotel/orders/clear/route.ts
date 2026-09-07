import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { tableNumber, allCompleted } = body;

    const whereClause: any = {
      hotelId: auth.hotelId,
    };

    if (tableNumber) {
      whereClause.tableNumber = String(tableNumber).trim();
      // Allow clearing done or cancelled orders for this table
      whereClause.status = { in: ['done', 'cancelled'] };
    } else {
      // Clear all finished/cancelled orders across the hotel
      whereClause.status = { in: ['done', 'cancelled'] };
    }

    const ordersToClear = await prisma.order.findMany({
      where: whereClause,
    });

    if (ordersToClear.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed orders found to clear.',
        clearedCount: 0,
        archivedCount: 0,
      });
    }

    // Filter fulfilled orders to save into permanent HistoricalSale ledger
    const fulfilledOrders = ordersToClear.filter((o) => o.status === 'done');

    let archivedCount = 0;
    if (fulfilledOrders.length > 0) {
      const salesData = fulfilledOrders.map((o) => ({
        id: 'hs_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        hotelId: auth.hotelId,
        orderId: o.id,
        tableNumber: o.tableNumber,
        customerName: o.customerName || null,
        customerPhone: o.customerPhone || null,
        totalAmount: o.totalAmount,
        items: typeof o.items === 'string' ? o.items : JSON.stringify(o.items),
        notes: o.notes || null,
        orderDate:
          o.createdAt instanceof Date
            ? o.createdAt.toISOString()
            : new Date(o.createdAt).toISOString(),
        settledAt: new Date().toISOString(),
      }));

      const db = prisma as any;
      let inserted = false;
      if (db.historicalSale?.createMany) {
        try {
          await db.historicalSale.createMany({
            data: salesData.map((s: any) => ({
              ...s,
              orderDate: new Date(s.orderDate),
              settledAt: new Date(s.settledAt),
            })),
          });
          inserted = true;
        } catch (cmErr) {
          console.warn('Prisma createMany failed, using raw SQLite fallback:', cmErr);
        }
      }

      if (!inserted) {
        // Direct SQLite insertion fallback
        for (const s of salesData) {
          await prisma.$executeRawUnsafe(
            `INSERT INTO HistoricalSale (id, hotelId, orderId, tableNumber, customerName, customerPhone, totalAmount, items, notes, orderDate, settledAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            s.id,
            s.hotelId,
            s.orderId,
            s.tableNumber,
            s.customerName,
            s.customerPhone,
            s.totalAmount,
            s.items,
            s.notes,
            s.orderDate,
            s.settledAt
          );
        }
      }
      archivedCount = salesData.length;
    }

    // Remove from active Order table (kitchen and active table feed)
    const orderIdsToDelete = ordersToClear.map((o) => o.id);
    const deleteResult = await prisma.order.deleteMany({
      where: {
        id: { in: orderIdsToDelete },
        hotelId: auth.hotelId,
      },
    });

    // Realtime notification via Socket.io
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`hotel_${auth.hotelId}`).emit('orders_cleared', {
          tableNumber,
          allCompleted: !!allCompleted,
          clearedOrderIds: orderIdsToDelete,
        });
      }
    } catch (socketErr) {
      console.warn('Socket clear emit error:', socketErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${deleteResult.count} order(s). ${archivedCount} recorded in sales ledger.`,
      clearedCount: deleteResult.count,
      archivedCount,
    });
  } catch (error: any) {
    console.error('Clear orders error:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear and archive orders',
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
