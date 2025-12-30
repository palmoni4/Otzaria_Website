import { NextResponse } from 'next/server';
import { fromPath } from 'pdf2pic';
import path from 'path';
import fs from 'fs-extra';
import slugify from 'slugify';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Page from '@/models/Page';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// הגדרת נתיב השמירה הפיזי
// Nginx צריך להיות מוגדר להגיש את /var/www/otzaria/uploads בכתובת http://your-domain/uploads
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

export async function POST(request) {
  try {
    // 1. אבטחה - רק אדמין
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    
    const formData = await request.formData();
    const file = formData.get('pdf');
    const bookName = formData.get('bookName');
    const category = formData.get('category') || 'כללי';

    if (!file || !bookName) {
      return NextResponse.json({ success: false, error: 'חסרים נתונים' }, { status: 400 });
    }

    // 2. יצירת שם תיקייה ייחודי (Slug)
    const slug = slugify(bookName, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g }) + '-' + Date.now();
    const bookFolder = path.join(UPLOAD_ROOT, 'books', slug);
    
    // יצירת התיקייה הפיזית
    await fs.ensureDir(bookFolder);

    // 3. שמירת ה-PDF זמנית
    const pdfBuffer = Buffer.from(await file.arrayBuffer());
    const tempPdfPath = path.join(bookFolder, 'source.pdf');
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // 4. המרת PDF לתמונות
    const options = {
      density: 150, // איכות
      saveFilename: "page",
      savePath: bookFolder,
      format: "jpg",
      width: 1200,
      height: 1600 
    };

    const convert = fromPath(tempPdfPath, options);
    // המרה של כל העמודים (-1)
    const result = await convert.bulk(-1, { responseType: "image" });
    
    if (!result || result.length === 0) {
      throw new Error('Conversion failed');
    }

    // 5. יצירת הספר ב-DB
    const newBook = await Book.create({
      name: bookName,
      slug: slug,
      category: category,
      folderPath: `/uploads/books/${slug}`, // נתיב וירטואלי ל-WEB
      totalPages: result.length,
      completedPages: 0
    });

    // 6. יצירת העמודים ב-DB
    const pagesData = result.map((page, index) => ({
      book: newBook._id,
      pageNumber: index + 1,
      // הנתיב ש-Nginx יגיש
      imagePath: `/uploads/books/${slug}/page.${index + 1}.jpg`,
      status: 'available'
    }));

    await Page.insertMany(pagesData);

    // ניקוי ה-PDF המקורי לחסכון במקום (אופציונלי)
    await fs.remove(tempPdfPath); 

    return NextResponse.json({ 
      success: true, 
      message: 'הספר הועלה ועובד בהצלחה',
      bookId: newBook._id 
    });

  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}