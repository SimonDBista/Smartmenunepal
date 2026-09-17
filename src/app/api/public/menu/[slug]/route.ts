import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    const hotel = await prisma.hotel.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        coverImage: true,
        status: true,
      },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const items = await prisma.menuItem.findMany({
      where: { hotelId: hotel.id },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Aggregate order sales quantities from active orders and historical sales
    const activeOrders = await prisma.order.findMany({
      where: {
        hotelId: hotel.id,
        status: { not: 'cancelled' },
      },
      select: { items: true },
    });

    let historicalSales: Array<{ items: string }> = [];
    try {
      const db = prisma as any;
      if (db.historicalSale?.findMany) {
        historicalSales = await db.historicalSale.findMany({
          where: { hotelId: hotel.id },
          select: { items: true },
        });
      }
    } catch {
      try {
        historicalSales = await prisma.$queryRawUnsafe(
          `SELECT items FROM HistoricalSale WHERE hotelId = ?`,
          hotel.id
        );
      } catch {
        historicalSales = [];
      }
    }

    const orderCountsById: Record<string, number> = {};
    const orderCountsByName: Record<string, number> = {};

    function processItemsList(itemsRaw: string | any[]) {
      try {
        const parsed = typeof itemsRaw === 'string' ? JSON.parse(itemsRaw) : itemsRaw;
        if (Array.isArray(parsed)) {
          parsed.forEach((it: any) => {
            const qty = Number(it.quantity) || 1;
            if (it.id) {
              orderCountsById[it.id] = (orderCountsById[it.id] || 0) + qty;
            }
            if (it.name) {
              const nameKey = it.name.trim().toLowerCase();
              orderCountsByName[nameKey] = (orderCountsByName[nameKey] || 0) + qty;
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

      return {
        ...item,
        totalOrdered,
      };
    });

    const mostOrderedItems = enrichedItems
      .filter((i) => (i.totalOrdered || 0) > 0 && i.isAvailable)
      .sort((a, b) => (b.totalOrdered || 0) - (a.totalOrdered || 0));

    // Group items by category
    const categoriesMap: Record<string, typeof enrichedItems> = {};
    enrichedItems.forEach((item) => {
      if (!categoriesMap[item.category]) {
        categoriesMap[item.category] = [];
      }
      categoriesMap[item.category].push(item);
    });

    // Standard system categories to always feature for customer navigation
    const standardCategories = [
      'BED ROOM',
      'DRINK',
      'SNAKS,CUISINE',
      'SNACKS',
      'CUISINE',
      'BREAKFAST',
      'FAST FOOD',
      'DESSERT',
      'SPECIALS',
    ];

    // Merge any custom categories created by this hotel
    const customCategories = Object.keys(categoriesMap).filter(
      (c) => !standardCategories.includes(c.toUpperCase())
    );

    const allCategories = [...standardCategories, ...customCategories];

    return NextResponse.json({
      hotel,
      items: enrichedItems,
      categories: allCategories,
      activeCategories: Object.keys(categoriesMap),
      groupedItems: categoriesMap,
      mostOrderedItems,
    });
  } catch (error) {
    console.error('Public menu error:', error);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}
