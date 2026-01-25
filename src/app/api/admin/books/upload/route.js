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

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    
    const formData = await request.formData();
    const file = formData.get('pdf');
    const bookName = formData.get('bookName');
    const category = formData.get('category') || 'כללי';
    const isHidden = formData.get('isHidden') === 'true';

    if (!file || !bookName) {
      return NextResponse.json({ success: false, error: 'חסרים נתונים' }, { status: 400 });
    }

    // --- מכאן והלאה: אותו קוד בדיוק כמו ב-Server Action המקורי ---

    // יצירת שם תיקייה (Slug)
    let baseSlug = slugify(bookName, {
        replacement: '-',  
        remove: /[*+~.()'"!:@\/\\?]/g, 
        lower: false,      
        strict: false      
    });
    baseSlug = baseSlug.replace(/^-+|-+$/g, '') || 'book';

    let slug = baseSlug;
    let counter = 1;

    while (true) {
        const existingBook = await Book.findOne({ slug: slug });
        const folderExists = await fs.pathExists(path.join(UPLOAD_ROOT, 'books', slug));
        if (!existingBook && !folderExists) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    const bookFolder = path.join(UPLOAD_ROOT, 'books', slug);
    await fs.ensureDir(bookFolder);

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const tempPdfPath = path.join(bookFolder, 'source.pdf');
    await fs.writeFile(tempPdfPath, pdfBuffer);

    const options = {
      density: 150,
      saveFilename: "page",
      savePath: bookFolder,
      format: "jpg",
      width: 1200,
      height: 1600 
    };

    const convert = fromPath(tempPdfPath, options);
    // שימוש ב-bulk כפי שביקשת (שים לב שזה צורך הרבה זיכרון בקבצים גדולים)
    const result = await convert.bulk(-1, { responseType: "image" });
    
    if (!result || result.length === 0) {
      throw new Error('Conversion failed');
    }

    const newBook = await Book.create({
      name: bookName,
      slug: slug,
      category: category,
      folderPath: `/uploads/books/${slug}`,
      totalPages: result.length,
      completedPages: 0,
      isHidden: isHidden
    });

    const pagesData = result.map((page, index) => ({
      book: newBook._id,
      pageNumber: index + 1,
      imagePath: `/uploads/books/${slug}/page.${index + 1}.jpg`,
      status: 'available'
    }));

    await Page.insertMany(pagesData);
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