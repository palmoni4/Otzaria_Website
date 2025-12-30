import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Page from '@/models/Page';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const name = searchParams.get('name');

        if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

        await connectDB();

        // חיפוש לפי שם מדויק (או Slug אם ה-UI שולח Slug)
        const book = await Book.findOne({ 
            $or: [{ name: name }, { slug: name }] 
        }).lean();

        if (!book) {
            return NextResponse.json({ error: 'Book not found' }, { status: 404 });
        }

        // שליפת עמודים (בדומה ל-book/[id])
        const pages = await Page.find({ book: book._id })
            .sort({ pageNumber: 1 })
            .select('pageNumber status imagePath claimedBy') // imagePath כבר מכיל את הנתיב המלא
            .populate('claimedBy', 'name')
            .lean();

        // התאמת פורמט למה שה-Frontend הישן מצפה
        const formattedPages = pages.map(p => ({
            number: p.pageNumber,
            status: p.status,
            thumbnail: p.imagePath, 
            claimedBy: p.claimedBy ? p.claimedBy.name : null,
            claimedById: p.claimedBy ? p.claimedBy._id : null
        }));

        return NextResponse.json({
            success: true,
            book: {
                name: book.name,
                path: book.slug,
                totalPages: book.totalPages,
                id: book._id
            },
            pages: formattedPages
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}