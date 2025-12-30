import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import Book from '@/models/Book';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        
        if (!query) return NextResponse.json({ results: [] });

        await connectDB();

        // חיפוש טקסט מלא במונגו
        const pages = await Page.find(
            { $text: { $search: query } },
            { score: { $meta: "textScore" } } // ציון רלוונטיות
        )
        .sort({ score: { $meta: "textScore" } })
        .limit(50)
        .populate('book', 'name slug'); // שליפת שם הספר

        // עיבוד התוצאות לפורמט נוח ל-UI
        const results = pages.map(page => ({
            bookName: page.book.name,
            bookSlug: page.book.slug,
            pageNumber: page.pageNumber,
            snippet: getSnippet(page.content || page.rightColumn + " " + page.leftColumn, query),
            score: page.score
        }));

        return NextResponse.json({ success: true, results });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// פונקציית עזר לחיתוך הטקסט סביב מילת החיפוש
function getSnippet(text, query) {
    if (!text) return '';
    const index = text.indexOf(query); // פשוט לצורך הדוגמה, עדיף Regex
    if (index === -1) return text.substring(0, 100) + '...';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + 50 + query.length);
    return '...' + text.substring(start, end) + '...';
}