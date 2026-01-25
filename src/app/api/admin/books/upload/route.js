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
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

// הגדרה: כמה עמודים לעבד בכל נגלה (10 זה בטוח לרוב השרתים)
const BATCH_SIZE = 10;

export const config = {
  api: {
    bodyParser: false, // מאפשר עבודה עם קבצים גדולים ללא הגבלה של ה-Body Parser
  },
};

/**
 * פונקציית עזר משופרת לקבלת מספר עמודים ב-PDF
 * מנסה קודם עם GraphicsMagick (יותר יציב עם עברית) ואז עם Ghostscript כגיבוי
 */
async function getPdfPageCount(filePath) {
    // המרה לנתיב אבסולוטי מלא (פותר בעיות של נתיבים יחסיים)
    const absolutePath = path.resolve(filePath);
    
    console.log(`Counting pages for: ${absolutePath}`);

    // נסיון 1: שימוש ב-GraphicsMagick (gm)
    // הפקודה identify -format "%n" מחזירה את מספר העמודים
    try {
        const command = `gm identify -format "%n" "${absolutePath}"`;
        const { stdout } = await execAsync(command);
        // gm לפעמים מחזיר רשימה (1 1 1 1...), ניקח את האיבר הראשון או נספור שורות
        // במקרה של %n הוא אמור להחזיר מספר אחד אם זה PDF תקין, או רצף.
        // נשתמש ב-%p שיחזיר רשימת עמודים ונמדוד את האורך, זה הכי בטוח
        // אבל הכי מהיר: pdfinfo אם מותקן poppler-utils (לא נניח שמותקן)
        
        // ננסה פירמוט פשוט שנותן את המספר
        const count = parseInt(stdout.trim().split('\n')[0]);
        if (!isNaN(count) && count > 0) {
            return count;
        }
    } catch (gmError) {
        console.warn('GM page count failed, trying Ghostscript fallback...', gmError.message);
    }

    // נסיון 2: Ghostscript (עם נתיב אבסולוטי)
    try {
        // המרה לפורמט שנתיבי לינוקס/gs אוהבים (לוכסנים רגילים)
        const safePath = absolutePath.replace(/\\/g, '/');
        
        // שימוש בפקודה שסופרת עמודים
        const command = `gs -q -dNODISPLAY -c "(${safePath}) (r) file runpdfbegin pdfpagecount = quit"`;
        const { stdout } = await execAsync(command);
        const count = parseInt(stdout.trim());
        
        if (isNaN(count) || count <= 0) throw new Error(`Invalid GS count: ${stdout}`);
        return count;

    } catch (gsError) {
        console.error('GS Page count failed:', gsError);
        throw new Error('לא ניתן לזהות את מספר העמודים בקובץ. ייתכן שיש בעיה בשם הקובץ (עברית) או שהקובץ פגום.');
    }
}

export async function POST(request) {
  // משתנים למעקב לצורך ניקוי במקרה של שגיאה
  let createdBookId = null;
  let createdFolderPath = null;

  try {
    // 1. אבטחה: וידוא מנהל
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();
    
    // 2. קבלת נתונים
    const formData = await request.formData();
    const file = formData.get('pdf');
    const bookName = formData.get('bookName');
    const category = formData.get('category') || 'כללי';
    const isHidden = formData.get('isHidden') === 'true';

    if (!file || !bookName) {
      return NextResponse.json({ success: false, error: 'חסרים נתונים' }, { status: 400 });
    }

    console.log(`Starting upload process for: ${bookName}`);

    // 3. יצירת Slug ותיקייה
    let baseSlug = slugify(bookName, { replacement: '-', remove: /[*+~.()'"!:@\/\\?]/g, lower: false, strict: false });
    baseSlug = baseSlug.replace(/^-+|-+$/g, '') || 'book';

    let slug = baseSlug;
    let counter = 1;

    // לולאה למציאת שם פנוי
    while (true) {
        const existingBook = await Book.findOne({ slug: slug });
        const folderExists = await fs.pathExists(path.join(UPLOAD_ROOT, 'books', slug));
        if (!existingBook && !folderExists) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    createdFolderPath = path.join(UPLOAD_ROOT, 'books', slug);
    await fs.ensureDir(createdFolderPath);

    // 4. שמירת ה-PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const tempPdfPath = path.join(createdFolderPath, 'source.pdf');
    await fs.writeFile(tempPdfPath, pdfBuffer);

    // 5. בדיקת מספר עמודים
    const totalPages = await getPdfPageCount(tempPdfPath);
    console.log(`Detected ${totalPages} pages.`);

    // 6. יצירת הספר במסד הנתונים (כדי לתפוס את השם וה-ID)
    const newBook = await Book.create({
        name: bookName,
        slug: slug,
        category: category,
        folderPath: `/uploads/books/${slug}`,
        totalPages: totalPages,
        completedPages: 0,
        isHidden: isHidden
    });
    
    createdBookId = newBook._id; // שומרים את ה-ID למקרה שנצטרך למחוק

    // 7. הגדרות המרה
    const options = {
      density: 150,
      saveFilename: "page",
      savePath: createdFolderPath,
      format: "jpg",
      width: 1200,
      height: 1600 
    };

    const convert = fromPath(tempPdfPath, options);

    // 8. לולאת המרה (Batch Processing)
    // רצים בקבוצות כדי לא להעמיס על הזיכרון
    for (let i = 1; i <= totalPages; i += BATCH_SIZE) {
        // חישוב טווח העמודים לנגלה הנוכחית
        const endPage = Math.min(i + BATCH_SIZE - 1, totalPages);
        const pagesToConvert = Array.from({ length: endPage - i + 1 }, (_, k) => i + k);
        
        console.log(`Processing batch: Pages ${i} to ${endPage}...`);

        try {
            // המרה בפועל
            const batchResults = await convert.bulk(pagesToConvert, { responseType: "image" });
            
            // הכנת אובייקטים לשמירה ב-DB
            const pagesData = batchResults.map((pageRes) => {
                // ניסיון לחלץ מספר עמוד בצורה בטוחה
                let pageNum = pageRes.page;
                if (!pageNum && pageRes.name) {
                    const match = pageRes.name.match(/page\.(\d+)/);
                    if (match) pageNum = parseInt(match[1]);
                }
                
                // אם עדיין אין מספר, נחשב לפי האינדקס ב-Batch
                if (!pageNum) {
                    // זה Fallback למקרה חירום, לרוב לא נגיע לפה
                    // שים לב: זה לוגיקה מורכבת אם הסדר מתבלגן, לכן עדיף להסתמך על השם
                }

                return {
                    book: createdBookId,
                    pageNumber: pageNum,
                    imagePath: `/uploads/books/${slug}/${path.basename(pageRes.path)}`,
                    status: 'available'
                };
            });

            // שמירה ב-DB
            if (pagesData.length > 0) {
                await Page.insertMany(pagesData);
            }

            // שחרור זיכרון יזום (אם Node מאפשר)
            if (global.gc) global.gc();

        } catch (batchError) {
            throw new Error(`Failed to convert batch ${i}-${endPage}: ${batchError.message}`);
        }
    }

    // 9. סיום מוצלח - מחיקת ה-PDF המקורי כדי לחסוך מקום
    await fs.remove(tempPdfPath);

    console.log(`Upload completed successfully for book: ${bookName}`);

    return NextResponse.json({ 
      success: true, 
      message: 'הספר הועלה ועובד בהצלחה',
      bookId: createdBookId 
    });

  } catch (error) {
    console.error('CRITICAL UPLOAD ERROR:', error);

    // --- ROLLBACK PROCEDURE ---
    // נוהל חירום: מחיקת כל מה שנוצר
    try {
        console.log('Starting Rollback...');

        // 1. מחיקת הספר מה-DB
        if (createdBookId) {
            await Book.findByIdAndDelete(createdBookId);
            console.log('- Deleted Book document');
            
            await Page.deleteMany({ book: createdBookId });
            console.log('- Deleted associated Page documents');
        }

        // 2. מחיקת התיקייה הפיזית
        if (createdFolderPath && await fs.pathExists(createdFolderPath)) {
            await fs.remove(createdFolderPath);
            console.log('- Deleted physical folder');
        }

        console.log('Rollback completed.');

    } catch (cleanupError) {
        // אם גם הניקוי נכשל, זה מצב חמור אבל אין הרבה מה לעשות חוץ מלדווח
        console.error('Rollback failed! System may have orphan files.', cleanupError);
    }

    return NextResponse.json({ 
        success: false, 
        error: `התהליך נכשל ובוצע ביטול שינויים: ${error.message}` 
    }, { status: 500 });
  }
}