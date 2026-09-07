import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminAuth, hashPassword } from '@/lib/auth';
import { generateSlug, generateTempPassword } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const auth = getAdminAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: any = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const hotels = await prisma.hotel.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        ownerEmail: true,
        phone: true,
        address: true,
        coverImage: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            menuItems: true,
            orders: true,
            feedback: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ hotels });
  } catch (error) {
    console.error('Admin hotels get error:', error);
    return NextResponse.json({ error: 'Failed to fetch hotels' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = getAdminAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const body = await request.json();
    const { name, ownerEmail, phone, address, customSlug, initialPassword } = body;

    if (!name || !ownerEmail) {
      return NextResponse.json(
        { error: 'Hotel name and owner email are required' },
        { status: 400 }
      );
    }

    const cleanEmail = ownerEmail.toLowerCase().trim();

    // Check if email already exists
    const existingEmail = await prisma.hotel.findUnique({
      where: { ownerEmail: cleanEmail },
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: 'A hotel with this owner email already exists' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let slug = customSlug ? generateSlug(customSlug) : generateSlug(name);
    let existingSlug = await prisma.hotel.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Password generation
    const plainPassword = initialPassword || generateTempPassword(8);
    const passwordHash = await hashPassword(plainPassword);

    const hotel = await prisma.hotel.create({
      data: {
        name: name.trim(),
        slug,
        ownerEmail: cleanEmail,
        passwordHash,
        phone: phone ? phone.trim() : null,
        address: address ? address.trim() : null,
        status: 'pending', // default pending as requested in the brief
      },
    });

    return NextResponse.json({
      success: true,
      hotel,
      temporaryPassword: plainPassword,
      message: 'Hotel account created successfully with pending status',
    });
  } catch (error) {
    console.error('Admin create hotel error:', error);
    return NextResponse.json({ error: 'Failed to create hotel' }, { status: 500 });
  }
}
