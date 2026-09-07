import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const hotel = await prisma.hotel.findUnique({
      where: { id: auth.hotelId },
      select: { name: true, slug: true, status: true },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    let baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (!baseUrl) {
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
      const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
      baseUrl = `${proto}://${host}`;
    }
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
    console.error('QR generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
