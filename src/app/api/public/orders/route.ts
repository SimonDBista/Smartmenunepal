import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelId, tableNumber, customerName, customerPhone, items, notes } = body;

    if (!hotelId || !tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required order details: hotel, table, and items' },
        { status: 400 }
      );
    }

    // Verify hotel exists and is active
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    if (hotel.status === 'expired') {
      return NextResponse.json(
        { error: 'This restaurant menu is currently inactive. Please contact staff.' },
        { status: 403 }
      );
    }

    // Extract item IDs and verify against database prices to prevent price manipulation
    const itemIds = items.map((i: any) => i.id).filter(Boolean);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        hotelId,
        id: { in: itemIds },
      },
    });
    const dbItemMap = new Map(dbItems.map((dbItem) => [dbItem.id, dbItem]));

    // Validate and sanitize items array
    const sanitizedItems = items.map((item: any) => {
      const dbItem = item.id ? dbItemMap.get(item.id) : null;
      // Use verified DB price if item exists in DB, otherwise sanitize positive client price
      const price = dbItem ? dbItem.price : Math.max(0, Number(item.price) || 0);
      const quantity = Math.min(100, Math.max(1, Math.floor(Number(item.quantity) || 1)));

      return {
        id: item.id || '',
        name: String(item.name || dbItem?.name || 'Item').slice(0, 100),
        price,
        quantity,
        notes: item.notes ? String(item.notes).slice(0, 200) : '',
      };
    });

    // Calculate verified total
    const totalAmount = sanitizedItems.reduce((sum: number, item: any) => {
      return sum + item.price * item.quantity;
    }, 0);

    const order = await prisma.order.create({
      data: {
        hotelId,
        tableNumber: String(tableNumber).trim().slice(0, 50),
        customerName: customerName ? String(customerName).trim().slice(0, 100) : null,
        customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 30) : null,
        items: JSON.stringify(sanitizedItems),
        totalAmount,
        notes: notes ? String(notes).trim().slice(0, 500) : null,
        status: 'received',
      },
      include: {
        hotel: {
          select: {
            name: true,
            slug: true,
            phone: true,
          },
        },
      },
    });

    // Realtime notification via Socket.io
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`hotel_${hotelId}`).emit('new_order', order);
      }
    } catch (socketErr) {
      console.warn('Socket emit error:', socketErr);
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to place order' }, { status: 500 });
  }
}
