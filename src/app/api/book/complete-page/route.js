import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import Book from '@/models/Book';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pageId, bookId } = await request.json(); // ה-UI צריך לשלוח גם bookId או שנשלוף אותו
    await connectDB();

    // התחלת Session לטרנזקציה (מומלץ במונגו אם השרת תומך, אחרת רגיל)
    // לצורך פשטות נשתמש בפעולות רגילות

    // 1. עדכון הדף
    const page = await Page.findOneAndUpdate(
      { _id: pageId, claimedBy: session.user.id, status: 'in-progress' },
      { status: 'completed', completedAt: new Date() },
      { new: true }
    );

    if (!page) {
      return NextResponse.json({ error: 'Page update failed' }, { status: 400 });
    }

    // 2. עדכון מונה הספר (Atomic Increment) - פעולה מהירה ובטוחה
    await Book.findByIdAndUpdate(page.book, { $inc: { completedPages: 1 } });

    // 3. עדכון ניקוד משתמש
    await User.findByIdAndUpdate(session.user.id, { $inc: { points: 10 } });

    return NextResponse.json({ success: true, message: 'הושלם בהצלחה!' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}