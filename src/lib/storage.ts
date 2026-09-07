import { promises as fs } from 'fs';
import path from 'path';

/**
 * Safely deletes a file from the server's public/uploads directory if it exists.
 * Prevents path traversal vulnerabilities.
 *
 * @param fileUrl Relative URL path (e.g. '/uploads/image-123.webp') or string
 */
export async function deleteUploadedFile(fileUrl?: string | null): Promise<boolean> {
  if (!fileUrl || typeof fileUrl !== 'string') return false;

  // Only delete files that are located inside our /uploads/ directory
  if (!fileUrl.startsWith('/uploads/') && !fileUrl.startsWith('uploads/')) {
    return false;
  }

  try {
    const fileName = path.basename(fileUrl);
    if (!fileName || fileName === '.' || fileName === '..') return false;

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const targetFilePath = path.join(uploadsDir, fileName);

    // Verify targetFilePath is strictly inside uploadsDir
    const resolvedPath = path.resolve(targetFilePath);
    const resolvedUploadsDir = path.resolve(uploadsDir);
    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      console.warn(`[Security] Attempted path traversal blocked: ${fileUrl}`);
      return false;
    }

    // Check if file exists and remove it
    await fs.unlink(resolvedPath);
    // console.log(`[Storage] Cleaned up file from VPS storage: ${fileName}`);
    return true;
  } catch (err: any) {
    // If file doesn't exist (ENOENT), ignore silently
    if (err.code !== 'ENOENT') {
      console.warn(`[Storage] Could not delete file ${fileUrl}:`, err.message);
    }
    return false;
  }
}
