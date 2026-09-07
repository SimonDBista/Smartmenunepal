import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
            address: true,
            coverImage: true,
          },
        },
        feedback: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

// Customer edit order (allowed only when status is 'received')
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { items, notes } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Order must contain at least one item' },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existing.status !== 'received') {
      return NextResponse.json(
        {
          error:
            'Order cannot be edited because the kitchen has already started cooking. Please ask your server or place an additional round.',
        },
        { status: 400 }
      );
    }

    // Extract item IDs and verify against database prices
    const itemIds = items.map((i: any) => i.id).filter(Boolean);
    const dbItems = await prisma.menuItem.findMany({
      where: {
        hotelId: existing.hotelId,
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
        name: String(item.name || dbItem?.name || 'Item').slice(0, 100),
        price,
        quantity,
        notes: item.notes ? String(item.notes).slice(0, 200) : '',
      };
    });

    // Recalculate total with verified prices
    const totalAmount = sanitizedItems.reduce((sum: number, item: any) => {
      return sum + item.price * item.quantity;
    }, 0);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        items: JSON.stringify(sanitizedItems),
        totalAmount,
        notes: notes !== undefined ? (notes ? String(notes).trim().slice(0, 500) : null) : existing.notes,
      },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
          },
        },
        feedback: true,
      },
    });

    // Realtime notification to staff and order room
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`order_${orderId}`).emit('order_status_updated', {
          orderId,
          status: updated.status,
          order: updated,
          isEdited: true,
        });
        io.to(`hotel_${existing.hotelId}`).emit('order_updated', {
          orderId,
          status: updated.status,
          order: updated,
          isEdited: true,
        });
      }
    } catch (socketErr) {
      console.warn('Socket order edit emit error:', socketErr);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Customer edit order error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

// Customer cancel order (allowed only when status is 'received')
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;

    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (existing.status !== 'received') {
      return NextResponse.json(
        {
          error:
            'Order cannot be cancelled because cooking has already started. Please speak with your server directly.',
        },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' },
      include: {
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            phone: true,
          },
        },
      },
    });

    // Realtime notification to staff & customer
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`order_${orderId}`).emit('order_status_updated', {
          orderId,
          status: 'cancelled',
          order: updated,
        });
        io.to(`hotel_${existing.hotelId}`).emit('order_updated', {
          orderId,
          status: 'cancelled',
          order: updated,
        });
      }
    } catch (socketErr) {
      console.warn('Socket order cancel emit error:', socketErr);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Customer cancel order error:', error);
    return NextResponse.json({ error: 'Failed to cancel order' }, { status: 500 });
  }
}
