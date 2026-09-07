import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { getAdminAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAdminAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const hotelId = params.id;
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, slug: true, status: true, phone: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const targetUrl = `${baseUrl}/menu/${hotel.slug}`;

    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      width: 600,
      margin: 2,
      color: {
        dark: '#0a0b0e',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    });

    return NextResponse.json({
      targetUrl,
      qrDataUrl,
      hotelName: hotel.name,
      slug: hotel.slug,
    });
  } catch (error) {
    console.error('Admin QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
