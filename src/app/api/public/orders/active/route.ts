import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelId = searchParams.get('hotelId');
    const hotelSlug = searchParams.get('hotelSlug');
    const tableNumber = searchParams.get('tableNumber')?.trim();

    if ((!hotelId && !hotelSlug) || !tableNumber) {
      return NextResponse.json(
        { error: 'hotelId or hotelSlug, and tableNumber are required' },
        { status: 400 }
      );
    }

    let targetHotelId = hotelId;
    if (!targetHotelId && hotelSlug) {
      const hotel = await prisma.hotel.findUnique({
        where: { slug: hotelSlug },
        select: { id: true },
      });
      if (!hotel) {
        return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
      }
      targetHotelId = hotel.id;
    }

    // Look for active orders in the last 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const activeOrders = await prisma.order.findMany({
      where: {
        hotelId: targetHotelId!,
        tableNumber,
        status: { in: ['received', 'in_progress'] },
        createdAt: { gte: twelveHoursAgo },
      },
      include: {
        _count: {
          select: { chatMessages: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (activeOrders.length === 0) {
      return NextResponse.json({
        hasActiveOrder: false,
        activeOrders: [],
        count: 0,
      });
    }

    const latestOrder = activeOrders[activeOrders.length - 1];

    return NextResponse.json({
      hasActiveOrder: true,
      count: activeOrders.length,
      latestOrderId: latestOrder.id,
      activeOrders,
    });
  } catch (error) {
    console.error('Check active order error:', error);
    return NextResponse.json(
      { error: 'Failed to check active orders' },
      { status: 500 }
    );
  }
}
