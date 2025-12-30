import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { recipientId, subject, message, sendToAll } = await request.json();
    await connectDB();

    if (sendToAll) {
      // שליפה של כל המשתמשים (למעט האדמין עצמו והבוטים אם יש)
      const users = await User.find({ role: { $ne: 'admin' } }).select('_id');
      
      // יצירת הודעות ב-Bulk ליעילות
      const messages = users.map(user => ({
        sender: session.user.id,
        recipient: user._id,
        subject,
        content: message,
        isRead: false
      }));

      await Message.insertMany(messages);
      
      return NextResponse.json({ 
        success: true, 
        message: `נשלח בהצלחה ל-${users.length} משתמשים` 
      });

    } else {
      // שליחה למשתמש ספציפי
      if (!recipientId) return NextResponse.json({ error: 'Missing recipient' }, { status: 400 });

      await Message.create({
        sender: session.user.id,
        recipient: recipientId,
        subject,
        content: message
      });

      return NextResponse.json({ success: true, message: 'נשלח בהצלחה' });
    }

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}