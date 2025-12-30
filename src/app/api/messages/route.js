import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// קבלת הודעות שלי
export async function GET(request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    await connectDB();
    
    // שליפת הודעות שנשלחו אלי או הודעות כלליות אם אני אדמין
    let query = { recipient: session.user.id };
    
    // אם רוצים שהמשתמש יראה גם הודעות שהוא שלח:
    // query = { $or: [{ recipient: session.user.id }, { sender: session.user.id }] };

    const messages = await Message.find(query)
        .populate('sender', 'name')
        .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, messages });
}

// שליחת הודעה
export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, content, recipientId } = await request.json();
    await connectDB();

    await Message.create({
        sender: session.user.id,
        recipient: recipientId || null, // null = למנהלים
        subject,
        content
    });

    return NextResponse.json({ success: true });
}