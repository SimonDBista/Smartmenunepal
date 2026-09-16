import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.menuItem.findMany({
      where: { hotelId: auth.hotelId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });

    // Aggregate order sales quantities from active orders and historical sales
    const activeOrders = await prisma.order.findMany({
      where: {
        hotelId: auth.hotelId,
        status: { not: 'cancelled' },
      },
      select: { items: true },
    });

    let historicalSales: Array<{ items: string }> = [];
    try {
      const db = prisma as any;
      if (db.historicalSale?.findMany) {
        historicalSales = await db.historicalSale.findMany({
          where: { hotelId: auth.hotelId },
          select: { items: true },
        });
      }
    } catch {
      try {
        historicalSales = await prisma.$queryRawUnsafe(
          `SELECT items FROM HistoricalSale WHERE hotelId = ?`,
          auth.hotelId
        );
      } catch {
        historicalSales = [];
      }
    }

    const orderCountsById: Record<string, number> = {};
    const orderCountsByName: Record<string, number> = {};
    const orderRevenueById: Record<string, number> = {};
    const orderRevenueByName: Record<string, number> = {};

    function processItemsList(itemsRaw: string | any[]) {
      try {
        const parsed = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;
        if (Array.isArray(parsed)) {
          parsed.forEach((it: any) => {
            const qty = Number(it.quantity) || 1;
            const price = Number(it.price) || 0;
            if (it.id) {
              orderCountsById[it.id] = (orderCountsById[it.id] || 0) + qty;
              orderRevenueById[it.id] = (orderRevenueById[it.id] || 0) + qty * price;
            }
            if (it.name) {
              const nameKey = it.name.trim().toLowerCase();
              orderCountsByName[nameKey] = (orderCountsByName[nameKey] || 0) + qty;
              orderRevenueByName[nameKey] = (orderRevenueByName[nameKey] || 0) + qty * price;
            }
          });
        }
      } catch {}
    }

    activeOrders.forEach((o) => processItemsList(o.items));
    historicalSales.forEach((s) => processItemsList(s.items));

    const enrichedItems = items.map((item) => {
      const nameKey = item.name.trim().toLowerCase();
      const countById = orderCountsById[item.id] || 0;
      const countByName = orderCountsByName[nameKey] || 0;
      const totalOrdered = Math.max(countById, countByName);

      const revById = orderRevenueById[item.id] || 0;
      const revByName = orderRevenueByName[nameKey] || 0;
      const totalRevenue = Math.max(revById, revByName);

      return {
        ...item,
        totalOrdered,
        totalRevenue,
      };
    });

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    console.error('Hotel menu get error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, name, price, imageUrl, description, isAvailable = true, is3dEnabled = false, modelUrl } = body;

    if (!category || !name || price === undefined) {
      return NextResponse.json(
        { error: 'Category, name, and price are required' },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        hotelId: auth.hotelId,
        category: category.trim(),
        name: name.trim(),
        price: parseFloat(price),
        imageUrl: imageUrl ? imageUrl.trim() : null,
        description: description ? description.trim() : null,
        isAvailable: Boolean(isAvailable),
        is3dEnabled: Boolean(is3dEnabled),
        modelUrl: modelUrl ? modelUrl.trim() : null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Hotel menu create error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
