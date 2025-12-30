import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import Book from '@/models/Book';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { 
        bookId, // שים לב: ב-Client נצטרך לשלוח ID או למצוא אותו לפי Slug
        pageNumber, 
        content, 
        leftColumn, 
        rightColumn, 
        twoColumns,
        isContentSplit, 
        rightColumnName, 
        leftColumnName 
    } = body;

    await connectDB();

    // עדכון העמוד
    // אנו מניחים שיש לך את ה-ID של העמוד או הספר. 
    // אם ה-Client שולח bookPath (slug), נמצא את הספר קודם.
    
    let query = {};
    if (body.pageId) {
        query = { _id: body.pageId };
    } else if (body.bookPath) {
        const book = await Book.findOne({ slug: decodeURIComponent(body.bookPath) });
        if (!book) throw new Error('Book not found');
        query = { book: book._id, pageNumber: pageNumber };
    }

    const updatedPage = await Page.findOneAndUpdate(
      query,
      {
        content,
        isTwoColumns: twoColumns,
        rightColumn,
        leftColumn,
        rightColumnName,
        leftColumnName,
        // אופציונלי: שמירת היסטוריה או לוג עריכה
      },
      { new: true }
    );

    if (!updatedPage) {
        return NextResponse.json({ success: false, error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'נשמר בהצלחה' });
  } catch (error) {
    console.error('Save Content Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
    // לוגיקה לקריאת תוכן (דומה ל-GET הקיים שלך ב-book/[id] אבל ספציפי לתוכן טקסט אם צריך בנפרד)
    // כרגע ה-route של book/[id] כבר מחזיר את המידע, אז אולי זה מיותר אלא אם כן תרצה טעינה בנפרד (Lazy loading של טקסט).
    return NextResponse.json({ success: true }); 
}