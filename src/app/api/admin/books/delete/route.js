import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Page from '@/models/Page';
import fs from 'fs-extra';
import path from 'path';

export async function DELETE(request) {
    try {
        // ... בדיקת הרשאות אדמין (חובה!) ...

        const { bookId } = await request.json();
        await connectDB();

        const book = await Book.findById(bookId);
        if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // 1. מחיקת קבצים פיזיים
        // book.folderPath שמרנו כ- /uploads/books/slug
        // נמיר לנתיב מלא במערכת ההפעלה
        const fullPath = path.join(process.cwd(), 'public', book.folderPath); 
        // הערה: בפרודקשן הנתיב עשוי להיות שונה (/var/www/...) תלוי בקונפיגורציה ב-POST upload

        if (await fs.pathExists(fullPath)) {
            await fs.remove(fullPath);
        }

        // 2. מחיקת עמודים
        await Page.deleteMany({ book: bookId });

        // 3. מחיקת הספר
        await Book.findByIdAndDelete(bookId);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}