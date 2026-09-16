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
    const tableNumber = searchParams.get('tableNumber');
    const orderId = searchParams.get('orderId');

    // Case 1: Specific table chat messages
    if (tableNumber) {
      const cleanTable = String(tableNumber).trim();

      // Find all order IDs belonging to this table
      const tableOrders = await prisma.order.findMany({
        where: { hotelId: auth.hotelId, tableNumber: cleanTable },
        select: { id: true },
      });
      const orderIds = tableOrders.map((o) => o.id);

      const messages = await prisma.chatMessage.findMany({
        where: {
          hotelId: auth.hotelId,
          OR: [
            { tableNumber: cleanTable },
            ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
          ],
        },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ messages });
    }

    // Case 2: Specific order chat messages
    if (orderId) {
      const messages = await prisma.chatMessage.findMany({
        where: { hotelId: auth.hotelId, orderId },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ messages });
    }

    // Case 3: List all tables in natural ascending order with their chat & order statuses
    let tables = await prisma.restaurantTable.findMany({
      where: { hotelId: auth.hotelId },
    });

    // If no tables exist yet, initialize default tables 1 to 8
    if (tables.length === 0) {
      const defaultTables = [
        { tableNumber: '1', name: 'Main Dining', capacity: 4 },
        { tableNumber: '2', name: 'Main Dining', capacity: 4 },
        { tableNumber: '3', name: 'Main Dining', capacity: 4 },
        { tableNumber: '4', name: 'Main Dining', capacity: 4 },
        { tableNumber: '5', name: 'Window Booth', capacity: 6 },
        { tableNumber: '6', name: 'Window Booth', capacity: 6 },
        { tableNumber: '7', name: 'Outdoor Terrace', capacity: 4 },
        { tableNumber: '8', name: 'Outdoor Terrace', capacity: 4 },
      ];
      for (const t of defaultTables) {
        await prisma.restaurantTable.create({
          data: {
            hotelId: auth.hotelId,
            tableNumber: t.tableNumber,
            name: t.name,
            capacity: t.capacity,
            isActive: true,
          },
        });
      }
      tables = await prisma.restaurantTable.findMany({
        where: { hotelId: auth.hotelId },
      });
    }

    // Fetch active orders to associate with tables
    const activeOrders = await prisma.order.findMany({
      where: {
        hotelId: auth.hotelId,
        status: { in: ['received', 'in_progress'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch latest chat message for each table
    const allMessages = await prisma.chatMessage.findMany({
      where: { hotelId: auth.hotelId },
      orderBy: { createdAt: 'desc' },
    });

    // Build map from orderId -> tableNumber
    const allOrders = await prisma.order.findMany({
      where: { hotelId: auth.hotelId },
      select: { id: true, tableNumber: true },
    });
    const orderTableMap: Record<string, string> = {};
    allOrders.forEach((o) => {
      if (o.tableNumber) orderTableMap[o.id] = String(o.tableNumber).trim();
    });

    // Ensure all tables that have active orders or chat messages are included
    const knownTableNumbers = new Set(tables.map((t) => t.tableNumber));
    const extraTables: Array<{ id: string; tableNumber: string; name: string | null; capacity: number; isActive: boolean }> = [];

    activeOrders.forEach((o) => {
      const tNum = String(o.tableNumber).trim();
      if (tNum && !knownTableNumbers.has(tNum)) {
        knownTableNumbers.add(tNum);
        extraTables.push({
          id: `extra_${tNum}`,
          tableNumber: tNum,
          name: 'Dining Area',
          capacity: 4,
          isActive: true,
        });
      }
    });

    allMessages.forEach((m) => {
      const tNum = m.tableNumber ? String(m.tableNumber).trim() : (m.orderId ? orderTableMap[m.orderId] : null);
      if (tNum && !knownTableNumbers.has(tNum)) {
        knownTableNumbers.add(tNum);
        extraTables.push({
          id: `extra_${tNum}`,
          tableNumber: tNum,
          name: 'Dining Area',
          capacity: 4,
          isActive: true,
        });
      }
    });

    const combinedTables = [...tables, ...extraTables];

    // Build table conversation items
    const tableConversations = combinedTables.map((t) => {
      // Find messages for this table (by tableNumber OR by matching orderId)
      const tableMsgs = allMessages.filter(
        (m) => m.tableNumber === t.tableNumber || (m.orderId && orderTableMap[m.orderId] === t.tableNumber)
      );
      const latestMessage = tableMsgs[0] || null;
      const unreadCount = tableMsgs.filter((m) => m.sender === 'customer').length;

      // Find active order for this table
      const activeOrder = activeOrders.find((o) => o.tableNumber === t.tableNumber) || null;

      return {
        id: t.id,
        tableNumber: t.tableNumber,
        name: t.name,
        capacity: t.capacity,
        isActive: t.isActive,
        activeOrder: activeOrder
          ? {
              id: activeOrder.id,
              status: activeOrder.status,
              customerName: activeOrder.customerName,
              totalAmount: activeOrder.totalAmount,
              createdAt: activeOrder.createdAt,
            }
          : null,
        latestMessage: latestMessage
          ? {
              id: latestMessage.id,
              sender: latestMessage.sender,
              message: latestMessage.message,
              createdAt: latestMessage.createdAt,
            }
          : null,
        messageCount: tableMsgs.length,
        unreadCount,
      };
    });

    // Sort tables in natural ascending order: 1, 2, 3 ... 9, 10, 11
    tableConversations.sort((a, b) =>
      a.tableNumber.localeCompare(b.tableNumber, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    );

    return NextResponse.json({
      hotelId: auth.hotelId,
      tables: tableConversations,
    });
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
    const { tableNumber, message, orderId } = body;

    if (!tableNumber || !String(tableNumber).trim()) {
      return NextResponse.json({ error: 'tableNumber is required' }, { status: 400 });
    }

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'message cannot be empty' }, { status: 400 });
    }

    const cleanTable = String(tableNumber).trim();
    const cleanMessage = String(message).trim().slice(0, 2000);

    // If orderId is provided, verify it belongs to hotel
    let verifiedOrderId: string | null = null;
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: { id: orderId, hotelId: auth.hotelId },
        select: { id: true },
      });
      if (order) verifiedOrderId = order.id;
    }

    // If orderId was not provided, see if there is an active order for this table
    if (!verifiedOrderId) {
      const activeOrder = await prisma.order.findFirst({
        where: {
          hotelId: auth.hotelId,
          tableNumber: cleanTable,
          status: { in: ['received', 'in_progress'] },
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      if (activeOrder) verifiedOrderId = activeOrder.id;
    }

    const chatMessage = await prisma.chatMessage.create({
      data: {
        hotelId: auth.hotelId,
        tableNumber: cleanTable,
        orderId: verifiedOrderId,
        sender: 'staff',
        message: cleanMessage,
      },
    });

    // Realtime broadcast via Socket.io
    try {
      const io = (global as any).io;
      if (io) {
        // Emit to table room
        io.to(`table_${auth.hotelId}_${cleanTable}`).emit('chat_message', chatMessage);

        // Emit to order room if linked
        if (verifiedOrderId) {
          io.to(`order_${verifiedOrderId}`).emit('chat_message', chatMessage);
        }

        // Notify hotel dashboard room for audio alert and list update
        io.to(`hotel_${auth.hotelId}`).emit('chat_notification', {
          tableNumber: cleanTable,
          orderId: verifiedOrderId,
          message: chatMessage,
        });
      }
    } catch (socketErr) {
      console.warn('Socket emit error:', socketErr);
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
    const tableNumber = searchParams.get('tableNumber');
    const orderId = searchParams.get('orderId');

    if (tableNumber) {
      await prisma.chatMessage.deleteMany({
        where: { hotelId: auth.hotelId, tableNumber: String(tableNumber).trim() },
      });
      return NextResponse.json({ success: true, message: `Chat cleared for Table ${tableNumber}` });
    }

    if (orderId) {
      await prisma.chatMessage.deleteMany({
        where: { hotelId: auth.hotelId, orderId },
      });
      return NextResponse.json({ success: true, message: 'Chat cleared for order' });
    }

    return NextResponse.json({ error: 'tableNumber or orderId parameter required' }, { status: 400 });
  } catch (error) {
    console.error('Hotel chat delete error:', error);
    return NextResponse.json({ error: 'Failed to delete chat messages' }, { status: 500 });
  }
}
