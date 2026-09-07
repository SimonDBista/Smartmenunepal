import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;

    const hotel = await prisma.hotel.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        coverImage: true,
        status: true,
      },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const items = await prisma.menuItem.findMany({
      where: { hotelId: hotel.id },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group items by category
    const categoriesMap: Record<string, typeof items> = {};
    items.forEach((item) => {
      if (!categoriesMap[item.category]) {
        categoriesMap[item.category] = [];
      }
      categoriesMap[item.category].push(item);
    });

    // Standard system categories to always feature for customer navigation
    const standardCategories = [
      'BED ROOM',
      'DRINK',
      'SNAKS,CUISINE',
      'SNACKS',
      'CUISINE',
      'BREAKFAST',
      'FAST FOOD',
      'DESSERT',
      'SPECIALS',
    ];

    // Merge any custom categories created by this hotel
    const customCategories = Object.keys(categoriesMap).filter(
      (c) => !standardCategories.includes(c.toUpperCase())
    );

    const allCategories = [...standardCategories, ...customCategories];

    return NextResponse.json({
      hotel,
      items,
      categories: allCategories,
      activeCategories: Object.keys(categoriesMap),
      groupedItems: categoriesMap,
    });
  } catch (error) {
    console.error('Public menu error:', error);
    return NextResponse.json({ error: 'Failed to load menu' }, { status: 500 });
  }
}
