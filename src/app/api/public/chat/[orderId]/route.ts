import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;

    const messages = await prisma.chatMessage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get chat error:', error);
    return NextResponse.json({ error: 'Failed to load chat messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId;
    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    const trimmedMessage = String(message).trim().slice(0, 1000);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, hotelId: true, tableNumber: true, customerName: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        hotelId: order.hotelId,
        orderId: order.id,
        sender: 'customer', // Public route is strictly for customer messages; staff uses authenticated hotel route
        message: trimmedMessage,
      },
    });

    // Realtime broadcast to rooms
    try {
      const io = (global as any).io;
      if (io) {
        // Emit to specific order chat room
        io.to(`order_${orderId}`).emit('chat_message', chatMessage);
        // Also notify hotel room
        io.to(`hotel_${order.hotelId}`).emit('chat_notification', {
          orderId,
          tableNumber: order.tableNumber,
          customerName: order.customerName,
          message: chatMessage,
        });
      }
    } catch (socketErr) {
      console.warn('Socket chat broadcast error:', socketErr);
    }

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (error) {
    console.error('Post chat error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
