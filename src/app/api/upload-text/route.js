import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Upload from '@/models/Upload';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file');
        const bookName = formData.get('bookName');

        if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

        // קריאת הטקסט מהקובץ
        const textContent = await file.text();

        await connectDB();

        const upload = await Upload.create({
            uploader: session.user.id,
            bookName,
            originalFileName: file.name,
            content: textContent,
            status: 'pending'
        });

        return NextResponse.json({ success: true, message: 'הועלה בהצלחה וממתין לאישור' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}