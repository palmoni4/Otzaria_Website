import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// קבלת כל המשתמשים
export async function GET() {
    // ... בדיקת אדמין ...
    await connectDB();
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }); // ללא סיסמאות
    return NextResponse.json({ success: true, users });
}

// עדכון תפקיד/פרטים
export async function PUT(request) {
    // ... בדיקת אדמין ...
    const { userId, role, points } = await request.json();
    await connectDB();
    
    await User.findByIdAndUpdate(userId, { role, points });
    return NextResponse.json({ success: true });
}

// מחיקת משתמש
export async function DELETE(request) {
    // ... בדיקת אדמין ...
    const { userId } = await request.json();
    await connectDB();
    
    await User.findByIdAndDelete(userId);
    return NextResponse.json({ success: true });
}