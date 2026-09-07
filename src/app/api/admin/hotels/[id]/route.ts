import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminAuth } from '@/lib/auth';
import { deleteUploadedFile } from '@/lib/storage';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAdminAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const hotelId = params.id;
    const body = await request.json();
    const { status, name, phone, address, coverImage } = body;

    const existing = await prisma.hotel.findUnique({
      where: { id: hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) {
      const validStatuses = ['pending', 'active', 'expired'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
    if (address !== undefined) updateData.address = address ? address.trim() : null;
    if (coverImage !== undefined) {
      const newCoverImage = coverImage ? coverImage.trim() : null;
      if (existing.coverImage && existing.coverImage !== newCoverImage) {
        await deleteUploadedFile(existing.coverImage);
      }
      updateData.coverImage = newCoverImage;
    }

    const updated = await prisma.hotel.update({
      where: { id: hotelId },
      data: updateData,
    });

    return NextResponse.json({ success: true, hotel: updated });
  } catch (error) {
    console.error('Admin update hotel error:', error);
    return NextResponse.json({ error: 'Failed to update hotel' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAdminAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized admin access' }, { status: 401 });
    }

    const hotelId = params.id;

    const existing = await prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        menuItems: {
          select: { imageUrl: true, modelUrl: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 });
    }

    // Clean up hotel cover image
    if (existing.coverImage) {
      await deleteUploadedFile(existing.coverImage);
    }

    // Clean up all menu item images and models belonging to this hotel
    for (const item of existing.menuItems) {
      if (item.imageUrl) await deleteUploadedFile(item.imageUrl);
      if (item.modelUrl) await deleteUploadedFile(item.modelUrl);
    }

    await prisma.hotel.delete({
      where: { id: hotelId },
    });

    return NextResponse.json({ success: true, message: 'Hotel deleted successfully' });
  } catch (error) {
    console.error('Admin delete hotel error:', error);
    return NextResponse.json({ error: 'Failed to delete hotel' }, { status: 500 });
  }
}

