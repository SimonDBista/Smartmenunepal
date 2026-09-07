import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7days'; // 'today' | '7days' | 'month' | 'all'

    // Determine start date filter
    const now = new Date();
    let startDate: Date | null = null;
    let chartDays = 7;

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      chartDays = 1;
    } else if (range === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      chartDays = 7;
    } else if (range === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      chartDays = 30;
    } else if (range === 'all') {
      startDate = null; // all time
      chartDays = 30; // display last 30 days on daily trend chart
    }

    // 1. Fetch active orders matching hotel and date
    const orderWhere: any = { hotelId: auth.hotelId };
    if (startDate) {
      orderWhere.createdAt = { gte: startDate };
    }
    const currentOrders = await prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch settled historical sales matching hotel and date
    const saleWhere: any = { hotelId: auth.hotelId };
    if (startDate) {
      saleWhere.orderDate = { gte: startDate };
    }

    let historicalSales: any[] = [];
    const db = prisma as any;
    try {
      if (db.historicalSale?.findMany) {
        historicalSales = await db.historicalSale.findMany({
          where: saleWhere,
          orderBy: { orderDate: 'desc' },
        });
      } else {
        throw new Error('historicalSale is not available on active Prisma instance');
      }
    } catch {
      // Direct SQLite query fallback
      try {
        if (startDate) {
          historicalSales = await prisma.$queryRawUnsafe(
            `SELECT * FROM HistoricalSale WHERE hotelId = ? AND orderDate >= ? ORDER BY orderDate DESC`,
            auth.hotelId,
            startDate.toISOString()
          );
        } else {
          historicalSales = await prisma.$queryRawUnsafe(
            `SELECT * FROM HistoricalSale WHERE hotelId = ? ORDER BY orderDate DESC`,
            auth.hotelId
          );
        }
      } catch (rawErr) {
        console.warn('Raw query for HistoricalSale also failed (table may be empty or unmigrated):', rawErr);
        historicalSales = [];
      }
    }

    // Completed sales aggregation
    const activeDoneOrders = currentOrders.filter((o) => o.status === 'done');
    const activeCancelledOrders = currentOrders.filter((o) => o.status === 'cancelled');
    const activePendingOrders = currentOrders.filter(
      (o) => o.status === 'received' || o.status === 'in_progress'
    );

    const historicalTotal = historicalSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const activeDoneTotal = activeDoneOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const totalRevenue = activeDoneTotal + historicalTotal;
    const completedCount = activeDoneOrders.length + historicalSales.length;
    const totalOrdersCount = currentOrders.length + historicalSales.length;
    const pendingCount = activePendingOrders.length;
    const cancelledCount = activeCancelledOrders.length;
    const averageOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;

    // Top selling items aggregation from both active and historical
    const itemMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    function processItems(itemsJson: string) {
      try {
        const items = typeof itemsJson === 'string' ? JSON.parse(itemsJson) : itemsJson;
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            const key = (it.name || it.id || '').trim();
            if (!key) return;
            if (!itemMap[key]) {
              itemMap[key] = { name: it.name, quantity: 0, revenue: 0 };
            }
            const qty = Number(it.quantity) || 1;
            const price = Number(it.price) || 0;
            itemMap[key].quantity += qty;
            itemMap[key].revenue += qty * price;
          });
        }
      } catch {}
    }

    activeDoneOrders.forEach((o) => processItems(o.items));
    historicalSales.forEach((s) => processItems(s.items));

    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Group sales into daily trend buckets
    const daysMap: Record<string, { date: string; sales: number; count: number }> = {};

    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      daysMap[dateStr] = { date: dateStr, sales: 0, count: 0 };
    }

    // Populate active done orders into chart
    activeDoneOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (daysMap[dateStr]) {
        daysMap[dateStr].count += 1;
        daysMap[dateStr].sales += o.totalAmount;
      }
    });

    // Populate historical sales into chart
    historicalSales.forEach((s) => {
      const d = new Date(s.orderDate);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (daysMap[dateStr]) {
        daysMap[dateStr].count += 1;
        daysMap[dateStr].sales += s.totalAmount;
      }
    });

    const dailyTrends = Object.values(daysMap);

    return NextResponse.json({
      range,
      summary: {
        totalRevenue: Math.round(totalRevenue),
        totalOrdersCount,
        completedCount,
        pendingCount,
        cancelledCount,
        averageOrderValue: Math.round(averageOrderValue),
      },
      topItems,
      dailyTrends,
    });
  } catch (error) {
    console.error('Hotel reports error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
