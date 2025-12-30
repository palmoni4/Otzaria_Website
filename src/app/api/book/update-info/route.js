import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { bookPath, editingInfo } = await request.json();
    await connectDB();

    // עדכון שדה editingInfo בספר
    const book = await Book.findOneAndUpdate(
        { slug: bookPath }, // או לפי ID אם ה-Client שולח ID
        { editingInfo },
        { new: true }
    );

    if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'המידע עודכן' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}