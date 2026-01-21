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

    const { pageId, bookId } = await request.json();
    await connectDB();

    // 1. שליפת הדף כדי לבדוק את הסטטוס הנוכחי שלו
    const page = await Page.findOne({ 
        _id: pageId, 
        claimedBy: session.user._id 
    });

    if (!page) {
        return NextResponse.json({ error: 'Page not found or unauthorized' }, { status: 404 });
    }

    // בדיקה שהדף במצב שמאפשר סיום (בטיפול או כבר הושלם ורוצים לעדכן שוב)
    if (page.status !== 'in-progress' && page.status !== 'completed') {
         return NextResponse.json({ error: 'Cannot complete page in current status' }, { status: 400 });
    }

    const wasAlreadyCompleted = page.status === 'completed';

    // 2. עדכון הסטטוס והזמן
    page.status = 'completed';
    page.completedAt = new Date();
    
    // שמירת השינויים ב-Page
    await page.save();
    
    // ביצוע Populate ידני או שליפה מחדש כדי להחזיר את פרטי המשתמש ל-Client
    await page.populate('claimedBy', 'name email');

    // 3. עדכון מונה הספר וניקוד המשתמש - רק אם הדף לא היה גמור קודם!
    // זה מונע כפל נקודות במקרה של תיקון דף קיים
    if (!wasAlreadyCompleted) {
        await Book.findByIdAndUpdate(page.book, { $inc: { completedPages: 1 } });
        await User.findByIdAndUpdate(session.user._id, { $inc: { points: 10 } });
    }

    // החזרת העמוד המעודכן בפורמט שהלקוח מצפה לו
    return NextResponse.json({ 
        success: true, 
        message: 'הושלם בהצלחה!',
        page: { 
            id: page._id,
            number: page.pageNumber,
            status: page.status,
            thumbnail: page.imagePath,
            claimedBy: page.claimedBy ? page.claimedBy.name : null,
            claimedById: page.claimedBy ? page.claimedBy._id : null,
            claimedAt: page.claimedAt,
            completedAt: page.completedAt
        }
    });

  } catch (error) {
    console.error('Complete Page Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}