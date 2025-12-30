import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Page from '@/models/Page';

export async function GET() {
    try {
        await connectDB();

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const stats = await Page.aggregate([
            {
                $match: {
                    status: 'completed',
                    completedAt: { $gte: sevenDaysAgo } // רק מהשבוע האחרון
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } } // מיון לפי תאריך
        ]);

        // המרה למבנה שהגרף ב-UI מצפה לו (מערך של ימים)
        const formattedData = fillMissingDays(stats);

        return NextResponse.json({ success: true, data: formattedData, total: stats.reduce((acc, curr) => acc + curr.count, 0) });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function fillMissingDays(data) {
    // לוגיקה למילוי ימים חסרים ב-0 כדי שהגרף יראה יפה
    // (קוד סטנדרטי של JS, אפשר להעתיק מהפרויקט הישן ולהתאים)
    // ...
    return data; 
}