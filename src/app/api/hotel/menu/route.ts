import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.menuItem.findMany({
      where: { hotelId: auth.hotelId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Hotel menu get error:', error);
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, name, price, imageUrl, description, isAvailable = true, is3dEnabled = false, modelUrl } = body;

    if (!category || !name || price === undefined) {
      return NextResponse.json(
        { error: 'Category, name, and price are required' },
        { status: 400 }
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        hotelId: auth.hotelId,
        category: category.trim(),
        name: name.trim(),
        price: parseFloat(price),
        imageUrl: imageUrl ? imageUrl.trim() : null,
        description: description ? description.trim() : null,
        isAvailable: Boolean(isAvailable),
        is3dEnabled: Boolean(is3dEnabled),
        modelUrl: modelUrl ? modelUrl.trim() : null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Hotel menu create error:', error);
    return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
  }
}
