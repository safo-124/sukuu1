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

    const useS3 = !!process.env.S3_BUCKET_NAME && !!process.env.AWS_REGION && !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY;
    let s3Client = null;
    let PutObjectCommand = null;
    if (useS3) {
      const mod = await import('@aws-sdk/client-s3');
      const { S3Client, PutObjectCommand: POC } = mod;
      PutObjectCommand = POC;
      s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
    }

    // Ensure uploads directory exists (public/uploads/assignments) for local fallback
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'assignments');
    if (!useS3) {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const reqUrl = new URL(request.url);
    const originOverride = process.env.UPLOADS_BASE_URL; // e.g., https://cdn.example.com
    const origin = originOverride || `${reqUrl.origin}`;

    for (const file of files) {
      if (!file.name) {
          console.warn("Skipping file without a name:", file);
          continue; // Skip items that are not actual files (e.g., empty parts of formData)
      }

      try {
        const rawName = path.basename(file.name);
        const safeBase = rawName.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
        const buffer = Buffer.from(await file.arrayBuffer());

        if (useS3 && s3Client) {
          const key = `assignments/${uniqueName}`;
          const put = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream',
            ACL: process.env.S3_OBJECT_ACL || 'public-read',
          });
          await s3Client.send(put);

          const customDomain = process.env.S3_PUBLIC_BASE_URL; // optional e.g., https://cdn.example.com
          const region = process.env.AWS_REGION;
          const bucket = process.env.S3_BUCKET_NAME;
          const s3Url = customDomain || `https://${bucket}.s3.${region}.amazonaws.com`;
          const publicUrl = `${s3Url}/${key}`;
          uploadedFileUrls.push(publicUrl);
          console.log(`Uploaded to S3: ${file.name} -> ${publicUrl}`);
        } else {
          // If running on a read-only filesystem (e.g., serverless), bail out with a helpful message
          if (process.env.VERCEL) {
            throw new Error('Local filesystem uploads are not supported on this hosting environment. Please configure cloud storage (e.g., S3).');
          }
          // Save to local filesystem under public/uploads/assignments
          const filePath = path.join(uploadsDir, uniqueName);
          await fs.writeFile(filePath, buffer);
          const publicUrl = `${origin}/uploads/assignments/${uniqueName}`;
          uploadedFileUrls.push(publicUrl);
          console.log(`Saved upload: ${file.name} -> ${publicUrl}`);
        }
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