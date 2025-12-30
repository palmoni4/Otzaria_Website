import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { messageId, reply } = await request.json();
    await connectDB();

    await Message.findByIdAndUpdate(messageId, {
        $push: {
            replies: {
                sender: session.user.id,
                content: reply,
                createdAt: new Date()
            }
        },
        // אופציונלי: לסמן כנקרא או "נענה"
        isRead: true 
    });

    return NextResponse.json({ success: true });
}