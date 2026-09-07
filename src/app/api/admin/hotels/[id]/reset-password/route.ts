import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminAuth, hashPassword } from '@/lib/auth';
import { generateTempPassword } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAdminAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const hotelId = params.id;
    const body = await request.json().catch(() => ({}));
    const { newPassword } = body;

    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!hotel) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const plainPassword = newPassword || generateTempPassword(8);
    const passwordHash = await hashPassword(plainPassword);

    await prisma.hotel.update({
      where: { id: hotelId },
      data: { passwordHash },
    });

    return NextResponse.json({
      success: true,
      newPassword: plainPassword,
      message: `Password for ${hotel.name} reset successfully`,
    });
  } catch (error) {
    console.error('Admin reset password error:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
