// app/api/upload-files/route.js
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
export const runtime = 'nodejs';
// You'll need to install formidable or another multipart/form-data parser if you don't use Next.js's native FormData handling in latest versions.
// For Next.js 13/14 App Router, Request.formData() handles this, but for larger files or complex parsing, a library might be needed.
// For simpler cases, directly using request.formData() is sufficient.

// Placeholder for your actual S3/Cloud Storage client initialization
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// export const config = {
//   api: {
//     bodyParser: false, // Disable Next.js body parser for file uploads
//   },
// };

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files'); // 'files' is the name of the input field in the frontend

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }

    const uploadedFileUrls = [];

    // Ensure uploads directory exists (public/uploads/assignments)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'assignments');
    await fs.mkdir(uploadsDir, { recursive: true });

    const { origin } = new URL(request.url);

    for (const file of files) {
      if (!file.name) {
          console.warn("Skipping file without a name:", file);
          continue; // Skip items that are not actual files (e.g., empty parts of formData)
      }

      try {
        // If running on a read-only filesystem (e.g., some serverless envs), bail out with a helpful message
        if (process.env.VERCEL) {
          throw new Error('Local filesystem uploads are not supported on this hosting environment. Please configure cloud storage (e.g., S3).');
        }

        // Save to local filesystem under public/uploads/assignments
        const rawName = path.basename(file.name);
        const safeBase = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
        const filePath = path.join(uploadsDir, uniqueName);

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);

        const publicUrl = `${origin}/uploads/assignments/${uniqueName}`;
        uploadedFileUrls.push(publicUrl);
        console.log(`Saved upload: ${file.name} -> ${publicUrl}`);
      } catch (e) {
        // Surface a friendly error, especially for read-only FS
        if (e && (e.code === 'EROFS' || e.code === 'EPERM')) {
          return NextResponse.json({
            error: 'File storage is read-only in this environment. Configure S3 (or another cloud storage) or run locally.',
            details: String(e.message || e)
          }, { status: 500 });
        }
        return NextResponse.json({ error: e?.message || 'Failed to save file.' }, { status: 500 });
      }
    }

    return NextResponse.json({ message: 'Files uploaded successfully.', fileUrls: uploadedFileUrls }, { status: 200 });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ error: 'Failed to upload files.' }, { status: 500 });
  }
}