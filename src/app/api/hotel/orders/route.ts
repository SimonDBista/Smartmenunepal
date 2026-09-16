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
    const status = searchParams.get('status');
    const tableNumber = searchParams.get('tableNumber');

    const whereClause: any = {
      hotelId: auth.hotelId,
    };

    if (status && status !== 'all') {
      whereClause.status = status;
    }

    if (tableNumber) {
      whereClause.tableNumber = tableNumber;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        feedback: true,
        _count: {
          select: { chatMessages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get hotel orders error:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tableNumber, customerName, customerPhone, items, notes } = body;

    if (!tableNumber || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Table number and order items are required' },
        { status: 400 }
      );
    }

    // Verify items against hotel menu to ensure price accuracy
    const itemIds = items.map((i: any) => i.id).filter(Boolean);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        hotelId: auth.hotelId,
        id: { in: itemIds },
      },
    });
    const dbItemMap = new Map(dbItems.map((dbItem) => [dbItem.id, dbItem]));

    const sanitizedItems = items.map((item: any) => {
      const dbItem = item.id ? dbItemMap.get(item.id) : null;
      const price = dbItem ? dbItem.price : Math.max(0, Number(item.price) || 0);
      const quantity = Math.min(100, Math.max(1, Math.floor(Number(item.quantity) || 1)));

      return {
        id: item.id || '',
        name: String(item.name || dbItem?.name || 'Dish').slice(0, 100),
        price,
        quantity,
        notes: item.notes ? String(item.notes).slice(0, 200) : '',
      };
    });

    const totalAmount = sanitizedItems.reduce((sum: number, item: any) => {
      return sum + item.price * item.quantity;
    }, 0);

    const order = await prisma.order.create({
      data: {
        hotelId: auth.hotelId,
        tableNumber: String(tableNumber).trim().slice(0, 50),
        customerName: customerName ? String(customerName).trim().slice(0, 100) : 'Dine-in Guest (Staff Order)',
        customerPhone: customerPhone ? String(customerPhone).trim().slice(0, 30) : null,
        items: JSON.stringify(sanitizedItems),
        totalAmount,
        notes: notes ? String(notes).trim().slice(0, 500) : null,
        status: 'received',
      },
      include: {
        feedback: true,
        _count: {
          select: { chatMessages: true },
        },
      },
    });

    // Broadcast realtime event via socket if available
    const globalAny = global as any;
    if (globalAny.io) {
      globalAny.io.to(`hotel_${auth.hotelId}`).emit('new_order', order);
      globalAny.io.to(`table_${auth.hotelId}_${order.tableNumber}`).emit('order_status', order);
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Create staff order error:', error);
    return NextResponse.json({ error: 'Failed to create staff order' }, { status: 500 });
  }
}

