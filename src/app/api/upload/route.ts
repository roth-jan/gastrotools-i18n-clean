import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-utils';
import { uploadToS3, generateFileKey } from '@/lib/aws-s3';

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'menu', 'recipe', 'inventory'
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Datei zu groß (max 5MB)' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Ungültiger Dateityp' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique file key
    const fileKey = generateFileKey(file.name, type);

    // Upload to S3
    const result = await uploadToS3(
      buffer,
      fileKey,
      file.type,
      user.id
    );

    return NextResponse.json({
      success: true,
      fileKey: result.key,
      url: result.url
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Hochladen der Datei' },
      { status: 500 }
    );
  }
}

// Handle file download requests
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fileKey = searchParams.get('key');

    if (!fileKey) {
      return NextResponse.json(
        { error: 'Datei-Schlüssel fehlt' },
        { status: 400 }
      );
    }

    // Verify user owns this file
    if (!fileKey.includes(`users/${user.id}/`)) {
      return NextResponse.json(
        { error: 'Keine Berechtigung' },
        { status: 403 }
      );
    }

    // Generate signed URL for download
    const { getSignedDownloadUrl } = await import('@/lib/aws-s3');
    const url = await getSignedDownloadUrl(fileKey);

    return NextResponse.json({
      url,
      expiresIn: 3600 // 1 hour
    });

  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Datei' },
      { status: 500 }
    );
  }
}