import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import Book from '@/models/Book';
import User from '@/models/User';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { bookPath, pageNumber } = await request.json();
        const userId = session.user.id; // שימוש ב-ID מהסשן המאובטח ולא מהבקשה!

        if (!userId) {
             return NextResponse.json({ success: false, error: 'User ID missing' }, { status: 450 });
        }

        await connectDB();

        const book = await Book.findOne({ slug: decodeURIComponent(bookPath) });
        if (!book) return NextResponse.json({ error: 'Book not found' }, { status: 404 });

        const page = await Page.findOne({ book: book._id, pageNumber });
        if (!page) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

        // בדיקה 1: אם העמוד בטיפול של מישהו אחר
        if (page.status === 'in-progress' && page.claimedBy && page.claimedBy.toString() !== userId) {
             return NextResponse.json({ success: false, error: 'העמוד כבר בטיפול ע"י משתמש אחר' }, { status: 409 });
        }

        // בדיקה 2: אם העמוד הושלם ע"י מישהו אחר
        if (page.status === 'completed' && page.claimedBy && page.claimedBy.toString() !== userId) {
            return NextResponse.json({ success: false, error: 'העמוד כבר הושלם ע"י משתמש אחר' }, { status: 409 });
        }

        // לוגיקה חדשה: אם הדף היה "הושלם" ועכשיו חוזר ל"בטיפול", נעדכן את מונה הספר
        const wasCompleted = page.status === 'completed';

        // עדכון סטטוס
        page.status = 'in-progress';
        page.claimedBy = new mongoose.Types.ObjectId(userId);
        page.claimedAt = new Date();
        // מאפסים את תאריך ההשלמה כי הוא חזר לעריכה
        page.completedAt = undefined; 
        await page.save();

        if (wasCompleted) {
            // מפחיתים 1 ממונה הדפים שהושלמו בספר
            await Book.findByIdAndUpdate(book._id, { $inc: { completedPages: -1 } });
        }

        // עדכון נקודות (אופציונלי)
        await User.findByIdAndUpdate(userId, { $inc: { points: 5 } });

        return NextResponse.json({ success: true, page });

    } catch (error) {
        console.error("Claim Page Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}