import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const feedbacks = await prisma.feedback.findMany({
      where: { hotelId: auth.hotelId },
      include: {
        order: {
          select: {
            tableNumber: true,
            totalAmount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Calculate rating distribution and average
    const total = feedbacks.length;
    const avgRating = total > 0 ? feedbacks.reduce((acc, f) => acc + f.rating, 0) / total : 0;
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach((f) => {
      if (counts[f.rating as keyof typeof counts] !== undefined) {
        counts[f.rating as keyof typeof counts]++;
      }
    });

    return NextResponse.json({
      feedbacks,
      stats: {
        total,
        avgRating: Number(avgRating.toFixed(1)),
        counts,
      },
    });
  } catch (error) {
    console.error('Get hotel feedback error:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('id');

    if (feedbackId) {
      await prisma.feedback.deleteMany({
        where: { id: feedbackId, hotelId: auth.hotelId },
      });
      return NextResponse.json({ success: true, message: 'Feedback deleted' });
    }

    return NextResponse.json({ error: 'Feedback ID required' }, { status: 400 });
  } catch (error) {
    console.error('Delete feedback error:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}

