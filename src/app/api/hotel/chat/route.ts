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
    const orderId = searchParams.get('orderId');

    if (orderId) {
      // Get chat messages for specific order
      const messages = await prisma.chatMessage.findMany({
        where: { hotelId: auth.hotelId, orderId },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ messages });
    }

    // List recent active conversations / orders with chats
    const ordersWithChats = await prisma.order.findMany({
      where: {
        hotelId: auth.hotelId,
        chatMessages: { some: {} },
      },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { chatMessages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ conversations: ordersWithChats });
  } catch (error) {
    console.error('Hotel chat get error:', error);
    return NextResponse.json({ error: 'Failed to fetch chat messages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, message } = body;

    if (!orderId || !message || !message.trim()) {
      return NextResponse.json(
        { error: 'OrderId and message are required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, hotelId: auth.hotelId },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        hotelId: auth.hotelId,
        orderId: order.id,
        sender: 'staff',
        message: message.trim(),
      },
    });

    // Realtime broadcast to customer & hotel rooms
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`order_${orderId}`).emit('chat_message', chatMessage);
        io.to(`hotel_${auth.hotelId}`).emit('chat_notification', {
          orderId,
          tableNumber: order.tableNumber,
          customerName: order.customerName,
          message: chatMessage,
        });
      }
    } catch (socketErr) {
      console.warn('Socket chat staff emit error:', socketErr);
    }

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (error) {
    console.error('Hotel chat post error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (orderId) {
      await prisma.chatMessage.deleteMany({
        where: { orderId, hotelId: auth.hotelId },
      });
      return NextResponse.json({ success: true, message: 'Chat messages cleared' });
    }

    return NextResponse.json({ error: 'orderId parameter required' }, { status: 400 });
  } catch (error) {
    console.error('Hotel chat delete error:', error);
    return NextResponse.json({ error: 'Failed to delete chat messages' }, { status: 500 });
  }
}

