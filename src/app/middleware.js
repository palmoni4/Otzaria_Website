import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // הגנה על דפי אדמין - רק לבעלי תפקיד 'admin'
    if (path.startsWith('/library/admin')) {
      if (!token || token.role !== 'admin') {
        return NextResponse.redirect(new URL('/library/dashboard', req.url));
      }
    }

    // שאר הדפים המוגנים (מוגדרים ב-matcher) דורשים רק להיות מחובר,
    // וה-withAuth מטפל בזה אוטומטית.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token // מחזיר true אם יש טוקן
    },
    pages: {
      signIn: '/library/auth/login', // הפניה להתחברות
    }
  }
);

export const config = {
  matcher: [
    // רשימת הנתיבים שדורשים הגנה
    '/library/dashboard/:path*',
    '/library/admin/:path*',
    '/library/upload/:path*',
    '/library/edit/:path*',
    '/library/users/:path*',
    '/api/admin/:path*', // הגנה גם על ה-API של האדמין
    '/api/upload-text/:path*'
  ]
};