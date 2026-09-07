import { NextRequest, NextResponse } from 'next/server';
import { getHotelAuth, getAdminAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const hotelAuth = getHotelAuth(request);
    const adminAuth = getAdminAuth(request);

    if (!hotelAuth && !adminAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Size limit: 30MB
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 30MB limit' },
        { status: 400 }
      );
    }

    // Determine extension & validate type
    const originalName = file.name || 'upload';
    const ext = path.extname(originalName).toLowerCase();
    const isImage =
      (file.type.startsWith('image/') && !file.type.includes('svg')) ||
      ['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext);
    const is3DModel =
      file.type.includes('gltf') ||
      file.type.includes('model') ||
      ['.glb', '.gltf'].includes(ext);

    if (!isImage && !is3DModel) {
      return NextResponse.json(
        { error: 'Invalid file format. Please upload a standard photo (JPG, PNG, WEBP) or 3D model (.glb).' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);
    const originalSize = file.size;

    let finalBuffer = originalBuffer;
    let finalExt = ext || (isImage ? '.jpg' : '.glb');
    let wasCompressed = false;

    // Apply Sharp compression & optimization for images
    if (isImage) {
      try {
        finalBuffer = await sharp(originalBuffer)
          .rotate() // Auto-orient based on mobile camera EXIF data
          .resize({
            width: 1400,
            height: 1400,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .webp({ quality: 80, effort: 4 })
          .toBuffer();

        finalExt = '.webp';
        wasCompressed = true;
      } catch (sharpErr) {
        console.warn('Sharp compression fallback to original buffer:', sharpErr);
        finalBuffer = originalBuffer;
      }
    }

    const compressedSize = finalBuffer.length;
    const compressionRatio =
      originalSize > 0 && wasCompressed
        ? `${Math.max(0, Math.round((1 - compressedSize / originalSize) * 100))}%`
        : '0%';

    // Generate safe unique filename
    const safeBaseName = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalFileName = `${safeBaseName}-${uniqueSuffix}${finalExt}`;

    // Ensure public/uploads folder exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, finalFileName);
    await fs.writeFile(filePath, finalBuffer);

    const publicUrl = `/uploads/${finalFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: finalFileName,
      originalSize,
      size: compressedSize,
      wasCompressed,
      compressionRatio,
      type: wasCompressed ? 'image/webp' : file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
