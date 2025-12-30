import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Upload from '@/models/Upload';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  
  const uploads = await Upload.find({})
    .populate('uploader', 'name')
    .sort({ createdAt: -1 });

  // התאמה ל-UI
  const formattedUploads = uploads.map(u => ({
      id: u._id,
      bookName: u.bookName,
      fileName: u.originalFileName, // או נתיב להורדה
      uploadedBy: u.uploader?.name,
      uploadedAt: u.createdAt,
      status: u.status,
      // כאן אפשר להוסיף תוכן אם רוצים תצוגה מקדימה
  }));

  return NextResponse.json({ success: true, uploads: formattedUploads });
}