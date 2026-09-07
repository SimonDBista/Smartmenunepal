import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { promises as fs } from 'fs';

export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathSegments = params.path || [];
    if (pathSegments.length === 0) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const requestedPath = path.resolve(uploadsDir, ...pathSegments);

    // Security check: ensure path does not escape uploads directory
    if (!requestedPath.startsWith(uploadsDir)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
      const stat = await fs.stat(requestedPath);
      if (!stat.isFile()) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(requestedPath);
    const ext = path.extname(requestedPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving uploaded file:', error);
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 });
  }
}
