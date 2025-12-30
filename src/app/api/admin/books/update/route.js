import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { bookId, name, category, author, description } = await request.json();
    await connectDB();

    // בדיקה ששם הספר לא תפוס ע"י ספר אחר (אם השם השתנה)
    if (name) {
        const existing = await Book.findOne({ name, _id: { $ne: bookId } });
        if (existing) {
            return NextResponse.json({ error: 'שם הספר כבר קיים במערכת' }, { status: 400 });
        }
    }

    const updatedBook = await Book.findByIdAndUpdate(
        bookId,
        { name, category, author, description },
        { new: true }
    );

    if (!updatedBook) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

    return NextResponse.json({ success: true, book: updatedBook });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}