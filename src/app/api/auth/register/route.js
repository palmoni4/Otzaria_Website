import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();
    
    await connectDB();

    // בדיקה אם משתמש קיים
    const existingUser = await User.findOne({ $or: [{ email }, { name }] });
    if (existingUser) {
      return NextResponse.json({ error: 'משתמש עם אימייל או שם זה כבר קיים' }, { status: 400 });
    }

    const hashedPassword = await hash(password, 12);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'user', // ברירת מחדל
      points: 0
    });

    return NextResponse.json({ message: 'המשתמש נוצר בהצלחה', user: { id: user._id, name: user.name, email: user.email } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}