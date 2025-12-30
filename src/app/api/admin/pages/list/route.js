import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const bookName = searchParams.get('book'); // ה-UI שולח שם ספר
  const userId = searchParams.get('userId');

  await connectDB();

  let query = {};
  if (status) query.status = status;
  if (userId) query.claimedBy = userId;
  
  // סינון לפי ספר דורש קודם למצוא את הספר (אם נשלח שם) או להשתמש ב-populate וסינון בצד שרת (פחות יעיל)
  // בגרסה יעילה, נניח שה-Client שולח bookId, אבל לתאימות ל-UI הישן:
  let pageQuery = Page.find(query)
    .sort({ updatedAt: -1 })
    .limit(100)
    .populate('book', 'name')
    .populate('claimedBy', 'name email');

  let pages = await pageQuery;

  // סינון ידני אם נשלח שם ספר (כי זה שדה בטבלה המקושרת)
  if (bookName) {
      pages = pages.filter(p => p.book?.name === bookName);
  }

  // התאמה לפורמט ה-UI הישן
  const formattedPages = pages.map(p => ({
      bookName: p.book?.name,
      number: p.pageNumber,
      status: p.status,
      claimedBy: p.claimedBy ? p.claimedBy.name : null,
      claimedById: p.claimedBy ? p.claimedBy._id : null,
      updatedAt: p.updatedAt,
      completedAt: p.completedAt
  }));

  return NextResponse.json({ success: true, pages: formattedPages });
}