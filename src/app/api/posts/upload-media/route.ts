import { NextResponse } from 'next/server';
import admin from '@/lib/firebase-admin';

/**
 * POST /api/posts/upload-media
 * Upload media files to Firebase Storage for use in scheduled posts
 * Accepts multipart form data with file(s)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const bucket = admin.storage().bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    );

    const uploadedFiles: {
      url: string;
      path: string;
      type: 'image' | 'video';
      name: string;
      size: number;
    }[] = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const storagePath = `posts-media/${timestamp}_${fileName}`;

      const fileRef = bucket.file(storagePath);

      await fileRef.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make file publicly readable
      await fileRef.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      const isVideo = file.type.startsWith('video/');

      uploadedFiles.push({
        url: publicUrl,
        path: storagePath,
        type: isVideo ? 'video' : 'image',
        name: file.name,
        size: buffer.length,
      });

      console.log(`Uploaded: ${file.name} → ${publicUrl}`);
    }

    return NextResponse.json({
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload media' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/posts/upload-media
 * List all uploaded media files
 */
export async function GET() {
  try {
    const bucket = admin.storage().bucket(
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    );

    const [files] = await bucket.getFiles({ prefix: 'posts-media/' });

    const mediaFiles = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          name: file.name.replace('posts-media/', ''),
          path: file.name,
          url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          type: metadata.contentType?.startsWith('video/') ? 'video' : 'image',
          size: parseInt(metadata.size as string),
          created: metadata.timeCreated,
        };
      })
    );

    return NextResponse.json({
      files: mediaFiles,
      count: mediaFiles.length,
    });
  } catch (error: any) {
    console.error('Error listing media:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list media' },
      { status: 500 }
    );
  }
}
