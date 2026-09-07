import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, rating, comment, customerName } = body;

    if (!orderId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Valid order ID and rating (1-5 stars) are required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, hotelId: true, tableNumber: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if feedback already exists
    const existingFeedback = await prisma.feedback.findUnique({
      where: { orderId },
    });

    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback has already been submitted for this order' },
        { status: 400 }
      );
    }

    const feedback = await prisma.feedback.create({
      data: {
        hotelId: order.hotelId,
        orderId: order.id,
        rating: Number(rating),
        comment: comment ? String(comment).trim() : null,
        customerName: customerName ? String(customerName).trim() : null,
      },
    });

    // Realtime notification to hotel
    try {
      const io = (global as any).io;
      if (io) {
        io.to(`hotel_${order.hotelId}`).emit('feedback_received', {
          ...feedback,
          order: { tableNumber: order.tableNumber },
        });
      }
    } catch (socketErr) {
      console.warn('Socket feedback emit error:', socketErr);
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}
