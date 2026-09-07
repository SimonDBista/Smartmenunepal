import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;
    const body = await request.json();
    const { status } = body;

    const validStatuses = ['received', 'in_progress', 'done', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: received, in_progress, done, cancelled' },
        { status: 400 }
      );
    }

    const existing = await prisma.order.findFirst({
      where: { id: orderId, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        hotel: {
          select: { name: true, slug: true },
        },
        feedback: true,
      },
    });

    // Realtime notification to customer and dashboard rooms
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`order_${orderId}`).emit('order_status_updated', {
          orderId,
          status,
          order: updated,
        });
        io.to(`hotel_${auth.hotelId}`).emit('order_updated', {
          orderId,
          status,
          order: updated,
        });
      }
    } catch (socketErr) {
      console.warn('Socket status emit error:', socketErr);
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orderId = params.id;

    const existing = await prisma.order.findFirst({
      where: { id: orderId, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Delete associated feedback and chat messages first (if not cascading)
    await prisma.feedback.deleteMany({
      where: { orderId },
    });
    await prisma.chatMessage.deleteMany({
      where: { orderId },
    });

    // Delete the order itself to save database storage
    await prisma.order.delete({
      where: { id: orderId },
    });

    // Emit socket update
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`hotel_${auth.hotelId}`).emit('order_deleted', { orderId });
      }
    } catch (socketErr) {
      console.warn('Socket order_deleted emit error:', socketErr);
    }

    return NextResponse.json({ success: true, message: 'Order and associated records deleted' });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}

