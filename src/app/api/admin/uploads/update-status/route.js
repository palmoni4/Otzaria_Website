import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Upload from '@/models/Upload';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { uploadId, status } = await request.json(); // 'approved' / 'rejected'
  
  await connectDB();

  const upload = await Upload.findByIdAndUpdate(
      uploadId,
      { 
          status, 
          reviewedBy: session.user.id 
      },
      { new: true }
  );

  return NextResponse.json({ success: true, upload });
}