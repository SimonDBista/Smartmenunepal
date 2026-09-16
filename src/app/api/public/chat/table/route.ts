import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hotelSlug = searchParams.get('hotelSlug');
    const tableNumber = searchParams.get('tableNumber');

    if (!hotelSlug || !tableNumber) {
      return NextResponse.json(
        { error: 'hotelSlug and tableNumber are required' },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug.toLowerCase().trim() },
      select: { id: true, name: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const cleanTable = String(tableNumber).trim();

    const messages = await prisma.chatMessage.findMany({
      where: {
        hotelId: hotel.id,
        tableNumber: cleanTable,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      hotelId: hotel.id,
      hotelName: hotel.name,
      messages,
    });
  } catch (error) {
    console.error('Public table chat GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table chat' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hotelSlug, tableNumber, message, customerName } = body;

    if (!hotelSlug || !tableNumber || !message || !String(message).trim()) {
      return NextResponse.json(
        { error: 'hotelSlug, tableNumber, and message are required' },
        { status: 400 }
      );
    }

    const hotel = await prisma.hotel.findUnique({
      where: { slug: hotelSlug.toLowerCase().trim() },
      select: { id: true, name: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const cleanTable = String(tableNumber).trim();
    const cleanMessage = String(message).trim().slice(0, 1000);

    // Check if there is an active order for this table
    const activeOrder = await prisma.order.findFirst({
      where: {
        hotelId: hotel.id,
        tableNumber: cleanTable,
        status: { in: ['received', 'in_progress'] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, customerName: true },
    });

    const chatMessage = await prisma.chatMessage.create({
      data: {
        hotelId: hotel.id,
        tableNumber: cleanTable,
        orderId: activeOrder ? activeOrder.id : null,
        sender: 'customer',
        message: cleanMessage,
      },
    });

    // Realtime broadcast via Socket.io
    try {
      const io = (global as any).io;
      if (io) {
        // Emit to table room
        io.to(`table_${hotel.id}_${cleanTable}`).emit('chat_message', chatMessage);

        if (activeOrder?.id) {
          io.to(`order_${activeOrder.id}`).emit('chat_message', chatMessage);
        }

        // Send notification to hotel dashboard staff
        io.to(`hotel_${hotel.id}`).emit('chat_notification', {
          tableNumber: cleanTable,
          orderId: activeOrder?.id || null,
          customerName: customerName || activeOrder?.customerName || `Guest at Table #${cleanTable}`,
          message: chatMessage,
        });
      }
    } catch (socketErr) {
      console.warn('Socket broadcast error:', socketErr);
    }

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (error) {
    console.error('Public table chat POST error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
