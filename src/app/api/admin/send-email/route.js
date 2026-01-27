import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request) {
    try {
        // 1. אבטחה: בדיקת הרשאות אדמין
        const session = await getServerSession(authOptions);
        
        if (!session || session.user?.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
        }

        // 2. קבלת הפרמטרים מהבקשה
        const body = await request.json();
        const { 
            to,       // מחרוזת או מערך של כתובות
            subject,  // נושא
            text,     // טקסט רגיל (אופציונלי אם יש HTML)
            html,     // תוכן מעוצב (אופציונלי)
            cc,       // עותק (אופציונלי)
            bcc,      // עותק נסתר (אופציונלי - מומלץ לשליחה המונית)
            replyTo   // כתובת למענה (אופציונלי)
        } = body;

        const isDev = process.env.NODE_ENV === 'development';

        // ולידציה בסיסית
        if ((!to && !bcc) || !subject || (!text && !html)) {
            return NextResponse.json({ 
                error: 'Missing required fields (to/bcc, subject, and content)' 
            }, { status: 400 });
        }

        // 3. הגדרת ה-Transporter של Nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },

            tls: {
                rejectUnauthorized: !(isDev), // מאשר תעודות לא מוכרות (כמו של נטפרי)
                ciphers: 'SSLv3' // לעיתים עוזר בבעיות תאימות
            }
        });

        // פונקציית עזר להמרת מערך למחרוזת (אם נשלח מערך)
        const formatRecipients = (recipients) => {
            if (Array.isArray(recipients)) {
                return recipients.join(', ');
            }
            return recipients;
        };

        // 4. בניית אובייקט המייל
        const mailOptions = {
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: formatRecipients(to),
            subject: subject,
            text: text || '', // גרסת טקסט פשוט (חשוב למניעת ספאם)
            html: html || text, // אם אין HTML, השתמש בטקסט (ולהפך אם הוגדר בנפרד)
        };

        // הוספת שדות אופציונליים רק אם קיימים
        if (cc) mailOptions.cc = formatRecipients(cc);
        if (bcc) mailOptions.bcc = formatRecipients(bcc);
        if (replyTo) mailOptions.replyTo = replyTo;

        // 5. שליחת המייל בפועל
        const info = await transporter.sendMail(mailOptions);

        console.log('Email sent successfully:', info.messageId);

        return NextResponse.json({ 
            success: true, 
            message: 'Email sent successfully',
            messageId: info.messageId 
        });

    } catch (error) {
        console.error('Email sending error:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to send email: ' + error.message 
        }, { status: 500 });
    }
}