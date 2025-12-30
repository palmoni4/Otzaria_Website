import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Upload from '@/models/Upload';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// טיפול בהעלאת קובץ טקסט ע"י משתמש (תואם ל-UI הישן)
export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file');
        const bookName = formData.get('bookName');

        // ולידציות
        if (!file || !bookName) return NextResponse.json({ error: 'Missing data' }, { status: 400 });
        if (!file.name.endsWith('.txt')) return NextResponse.json({ error: 'Only .txt files allowed' }, { status: 400 });

        const content = await file.text();

        await connectDB();

        // יצירת רשומה ב-DB
        const upload = await Upload.create({
            uploader: session.user.id,
            bookName: bookName,
            originalFileName: file.name,
            content: content,
            fileSize: file.size,
            lineCount: content.split('\n').length,
            status: 'pending'
        });

        // החזרת פורמט שה-UI הישן מצפה לו
        return NextResponse.json({ 
            success: true, 
            message: 'הספר הועלה בהצלחה',
            upload: {
                id: upload._id,
                bookName: upload.bookName,
                status: upload.status,
                uploadedAt: upload.createdAt
            }
        });

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ success: false, error: 'שגיאה בהעלאה' }, { status: 500 });
    }
}

// קבלת ההיסטוריה של המשתמש
export async function GET(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ success: true, uploads: [] }); // לא מחובר

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId'); // ה-UI שולח את זה, אבל עדיף להשתמש ב-Session לאבטחה

        // מוודאים שהמשתמש מבקש את המידע של עצמו (אלא אם הוא אדמין)
        if (userId && userId !== session.user.id && session.user.role !== 'admin') {
             return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await connectDB();
        
        const uploads = await Upload.find({ uploader: session.user.id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        return NextResponse.json({ 
            success: true, 
            uploads: uploads.map(u => ({
                id: u._id,
                bookName: u.bookName,
                uploadedAt: u.createdAt,
                status: u.status,
                fileName: u.originalFileName
            }))
        });

    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}