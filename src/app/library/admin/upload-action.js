'use server'

import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { fromPath } from 'pdf2pic';
import path from 'path';
import fs from 'fs-extra';
import slugify from 'slugify';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Page from '@/models/Page';

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

export async function uploadBookAction(formData) {
  try {
    // 1. אבטחה - בדיקת סשן
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return { success: false, error: 'אין הרשאות ניהול' };
    }

    await connectDB();
    
    const file = formData.get('pdf');
    const bookName = formData.get('bookName');
    const category = formData.get('category') || 'כללי';

    if (!file || !bookName) {
      return { success: false, error: 'חסרים נתונים' };
    }

    // 2. יצירת שם תיקייה ייחודי (Slug)
    const slug = slugify(bookName, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }) + '-' + Date.now();
    const bookFolder = path.join(UPLOAD_ROOT, 'books', slug);
    
    // יצירת התיקייה הפיזית
    await fs.ensureDir(bookFolder);

    // 3. שמירת ה-PDF זמנית
    // ב-Server Action אנו מקבלים File object, צריך להמיר ל-Buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const tempPdfPath = path.join(bookFolder, 'source.pdf');
    
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // 4. המרת PDF לתמונות
    const options = {
      density: 150,
      saveFilename: "page",
      savePath: bookFolder,
      format: "jpg",
      width: 1200,
      height: 1600 
    };

    // המרה של כל העמודים (-1)
    const convert = fromPath(tempPdfPath, options);
    const result = await convert.bulk(-1, { responseType: "image" });
    
    if (!result || result.length === 0) {
      throw new Error('Conversion failed');
    }

    // 5. יצירת הספר ב-DB
    const newBook = await Book.create({
      name: bookName,
      slug: slug,
      category: category,
      folderPath: `/uploads/books/${slug}`,
      totalPages: result.length,
      completedPages: 0
    });

    // 6. יצירת העמודים ב-DB
    const pagesData = result.map((page, index) => ({
      book: newBook._id,
      pageNumber: index + 1,
      imagePath: `/uploads/books/${slug}/page.${index + 1}.jpg`,
      status: 'available'
    }));

    await Page.insertMany(pagesData);

    // ניקוי
    await fs.remove(tempPdfPath); 

    // המרה לאובייקט פשוט כי אי אפשר להחזיר אובייקט Mongoose מורכב ב-Server Action
    return { 
      success: true, 
      message: 'הספר הועלה ועובד בהצלחה',
      bookId: newBook._id.toString() 
    };

  } catch (error) {
    console.error('Upload Error:', error);
    return { success: false, error: error.message };
  }
}