import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, bookPath } = await req.json();

    if (action === 'hide_instructions' && bookPath) {
      
      const userId = session.user._id || session.user.id;

      await User.findByIdAndUpdate(userId, {
        $addToSet: { hiddenInstructionsBooks: bookPath } 
      });

      return NextResponse.json({ success: true, message: 'Preferences updated' });
    }

    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });

  } catch (error) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await User.findById(session.user._id || session.user.id);
    
    return NextResponse.json({ 
      success: true, 
      hiddenBooks: user.hiddenInstructionsBooks
    });

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
