import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    // שליפה סופר-מהירה (Lean מחזיר JSON טהור בלי מעטפת Mongoose)
    const books = await Book.find({})
      .select('name slug totalPages completedPages category updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const formattedBooks = books.map(book => ({
      id: book._id,
      name: book.name,
      path: book.slug, // תאימות ל-UI
      // נתיב תמונה אופטימלי (ניתן לשנות אם משתמשים ב-CDN)
      thumbnail: `/uploads/books/${book.slug}/page.1.jpg`, 
      totalPages: book.totalPages,
      completedPages: book.completedPages || 0,
      category: book.category || 'כללי',
      status: book.completedPages === book.totalPages ? 'completed' : 'in-progress'
    }));

    return NextResponse.json({ success: true, books: formattedBooks });

  } catch (error) {
    console.error('Library List Error:', error);
    return NextResponse.json({ success: false, error: 'שגיאה בטעינת הספרייה' }, { status: 500 });
  }
}