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

    const { pageId } = await request.json();
    await connectDB();

    // קודם נבדוק מה היה הסטטוס הקודם
    const pageBefore = await Page.findOne({ _id: pageId, claimedBy: session.user.id });
    
    if (!pageBefore) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const wasCompleted = pageBefore.status === 'completed';

    // איפוס הדף
    await Page.findByIdAndUpdate(pageId, {
        status: 'available',
        $unset: { claimedBy: "", claimedAt: "", completedAt: "" }
    });

    // אם הדף היה גמור, צריך להקטין את המונה בספר
    if (wasCompleted) {
        await Book.findByIdAndUpdate(pageBefore.book, { $inc: { completedPages: -1 } });
    }

    return NextResponse.json({ success: true, message: 'הדף שוחרר' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}