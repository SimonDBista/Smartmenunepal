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
