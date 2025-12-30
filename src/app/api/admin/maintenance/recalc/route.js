import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await connectDB();

    // 1. עדכון מספר עמודים כולל בכל ספר (למקרה שמחקו/הוסיפו עמודים ידנית)
    // הערה: פעולה זו יכולה להיות כבדה אם יש המון ספרים, עדיף להריץ ברקע או על ספר ספציפי.
    // כאן נדגים עדכון פשוט.
    
    const books = await Book.find({});
    let updatedCount = 0;

    for (const book of books) {
        const actualPages = await Page.countDocuments({ book: book._id });
        if (book.totalPages !== actualPages) {
            book.totalPages = actualPages;
            await book.save();
            updatedCount++;
        }
    }

    return NextResponse.json({ 
        success: true, 
        message: `בוצע רענון נתונים. עודכנו ${updatedCount} ספרים.` 
    });
}