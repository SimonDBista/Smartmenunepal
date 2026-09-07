import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getHotelAuth } from '@/lib/auth';
import { deleteUploadedFile } from '@/lib/storage';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;
    const body = await request.json();
    const { category, name, price, imageUrl, description, isAvailable, is3dEnabled, modelUrl } = body;

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const newImageUrl = imageUrl !== undefined ? (imageUrl ? imageUrl.trim() : null) : existing.imageUrl;
    const newModelUrl = modelUrl !== undefined ? (modelUrl ? modelUrl.trim() : null) : existing.modelUrl;

    // If an image was replaced or cleared, delete the old file from VPS disk
    if (existing.imageUrl && existing.imageUrl !== newImageUrl) {
      await deleteUploadedFile(existing.imageUrl);
    }
    // If a 3D model was replaced or cleared, delete the old model from VPS disk
    if (existing.modelUrl && existing.modelUrl !== newModelUrl) {
      await deleteUploadedFile(existing.modelUrl);
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        category: category !== undefined ? category.trim() : existing.category,
        name: name !== undefined ? name.trim() : existing.name,
        price: price !== undefined ? parseFloat(price) : existing.price,
        imageUrl: newImageUrl,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existing.isAvailable,
        is3dEnabled: is3dEnabled !== undefined ? Boolean(is3dEnabled) : existing.is3dEnabled,
        modelUrl: newModelUrl,
      },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Update menu item error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;
    const { isAvailable } = await request.json();

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: { isAvailable: Boolean(isAvailable) },
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Toggle availability error:', error);
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getHotelAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;

    const existing = await prisma.menuItem.findFirst({
      where: { id: itemId, hotelId: auth.hotelId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Delete uploaded image and 3D model from VPS storage
    if (existing.imageUrl) {
      await deleteUploadedFile(existing.imageUrl);
    }
    if (existing.modelUrl) {
      await deleteUploadedFile(existing.modelUrl);
    }

    await prisma.menuItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}

