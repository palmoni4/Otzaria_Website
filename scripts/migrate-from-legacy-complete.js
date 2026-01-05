/**
 * scripts/migrate-from-legacy-complete.js
 * 
 * סקריפט מיגרציה מלא להעברת נתונים מפרויקט otzaria-editor (מבנה מבוסס קבצים במונגו)
 * לפרויקט otzaria-rewrite (מבנה רלציוני עם Mongoose).
 * 
 * הרצה:
 * 1. וודא ש-.env מכיל את MONGODB_URI (המסד החדש).
 * 2. הגדר את LEGACY_MONGODB_URI ב-.env או בקוד למטה.
 * 3. הרץ: node scripts/migrate-from-legacy-complete.js
 */

import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import slugify from 'slugify';
import dotenv from 'dotenv';
import path from 'path';

// טעינת משתני סביבה
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// --- הגדרות חיבור ---
const NEW_DB_URI = process.env.MONGODB_URI; // המסד החדש (מה-env של הפרויקט)
const OLD_DB_URI = process.env.LEGACY_MONGODB_URI || 'mongodb://127.0.0.1:27017/otzaria_legacy'; // שנה לכתובת הישנה שלך

if (!NEW_DB_URI || !OLD_DB_URI) {
    console.error('❌ Missing database URIs. Please check .env file.');
    process.exit(1);
}

// --- הגדרת המודלים של המערכת החדשה (Inline) ---
// אנו מגדירים אותם כאן כדי למנוע תלויות בקבצי הפרויקט בזמן ריצת סקריפט חיצוני
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    points: { type: Number, default: 0 },
}, { timestamps: true });

const BookSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    slug: { type: String, index: true },
    totalPages: { type: Number, default: 0 },
    completedPages: { type: Number, default: 0 },
    category: { type: String, default: 'כללי' },
    author: String,
    description: String,
    editingInfo: Object,
}, { timestamps: true });

const PageSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    pageNumber: { type: Number, required: true },
    content: { type: String, default: '' },
    isTwoColumns: { type: Boolean, default: false },
    rightColumn: { type: String, default: '' },
    leftColumn: { type: String, default: '' },
    rightColumnName: { type: String, default: 'חלק 1' },
    leftColumnName: { type: String, default: 'חלק 2' },
    status: { type: String, enum: ['available', 'in-progress', 'completed'], default: 'available' },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedAt: Date,
    completedAt: Date,
    imagePath: { type: String, required: true }
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    replies: [{
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

const UploadSchema = new mongoose.Schema({
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bookName: { type: String, required: true },
    originalFileName: String,
    content: String,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// יצירת המודלים
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Book = mongoose.models.Book || mongoose.model('Book', BookSchema);
const Page = mongoose.models.Page || mongoose.model('Page', PageSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);
const Upload = mongoose.models.Upload || mongoose.model('Upload', UploadSchema);

// מפות המרה (Old ID -> New ObjectId)
const userIdMap = new Map();
const bookIdMap = new Map(); // Book Name -> New ObjectId

// --- פונקציות עזר ---

function createSlug(text) {
    return slugify(text, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
}

// מנסה לפרמט תאריך, מחזיר null אם נכשל
function parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
}

// פירוק תוכן טקסט שנשמר בפורמט הישן (עם מפרידים לטורים)
function parsePageContent(textContent) {
    if (!textContent) return { content: '', isTwoColumns: false };

    const rightMatch = textContent.match(/=== (.+?) ===\n([\s\S]*?)\n\n=== (.+?) ===\n([\s\S]*)/);
    
    if (rightMatch) {
        return {
            content: '', // התוכן הגולמי נשמר מפוצל
            isTwoColumns: true,
            rightColumnName: rightMatch[1],
            rightColumn: rightMatch[2],
            leftColumnName: rightMatch[3],
            leftColumn: rightMatch[4]
        };
    }

    return {
        content: textContent,
        isTwoColumns: false,
        rightColumn: '',
        leftColumn: ''
    };
}

// --- הלוגיקה המרכזית ---

async function migrate() {
    let oldClient;
    try {
        console.log('🚀 Starting Migration Process...');
        
        // 1. חיבור למסד הישן (Native Client לקריאה מהירה)
        console.log('🔌 Connecting to LEGACY database...');
        oldClient = new MongoClient(OLD_DB_URI);
        await oldClient.connect();
        const oldDb = oldClient.db(); // משתמש ב-DB ברירת המחדל מה-URI
        console.log('✅ Connected to Legacy DB.');

        // 2. חיבור למסד החדש (Mongoose לשמירה וולידציה)
        console.log('🔌 Connecting to NEW database...');
        await mongoose.connect(NEW_DB_URI);
        console.log('✅ Connected to New DB.');

        // ניקוי המסד החדש (אופציונלי - השאר בהערה אם אתה רוצה להוסיף לקיים)
        console.log('🧹 Cleaning new database collections...');
        await User.deleteMany({});
        await Book.deleteMany({});
        await Page.deleteMany({});
        await Message.deleteMany({});
        await Upload.deleteMany({});
        console.log('✅ Cleaned.');

        // --- שלב 1: מיגרציית משתמשים ---
        console.log('\n👤 Migrating Users...');
        
        // שליפת קובץ users.json מהקולקשיין files של המסד הישן
        const usersFileDoc = await oldDb.collection('files').findOne({ path: 'data/users.json' });
        
        if (!usersFileDoc || !usersFileDoc.data) {
            console.warn('⚠️ No users found in legacy DB (data/users.json missing)');
        } else {
            const oldUsers = usersFileDoc.data;
            const newUsers = [];

            for (const u of oldUsers) {
                const newId = new mongoose.Types.ObjectId();
                userIdMap.set(u.id, newId); // שמירת מיפוי ID ישן -> חדש

                newUsers.push({
                    _id: newId,
                    name: u.name,
                    email: u.email,
                    password: u.password, // ה-Hash תואם (bcrypt)
                    role: u.role,
                    points: u.points || 0,
                    createdAt: parseDate(u.createdAt),
                    updatedAt: parseDate(u.updatedAt || u.createdAt)
                });
            }
            
            if (newUsers.length > 0) {
                await User.insertMany(newUsers);
            }
            console.log(`✅ Migrated ${newUsers.length} users.`);
        }

        // קבלת מנהל מערכת ברירת מחדל (למקרה של שדות חסרים)
        const defaultAdmin = await User.findOne({ role: 'admin' });
        const defaultAdminId = defaultAdmin?._id;

        // --- שלב 2: מיגרציית ספרים ודפים ---
        console.log('\n📚 Migrating Books and Pages...');

        // שליפת כל המסמכים שמתחילים ב-data/pages/ מהמסד הישן
        const pageFilesCursor = oldDb.collection('files').find({ 
            path: { $regex: '^data/pages/' } 
        });

        while (await pageFilesCursor.hasNext()) {
            const fileDoc = await pageFilesCursor.next();
            const bookName = path.basename(fileDoc.path, '.json');
            const pagesData = fileDoc.data; // המערך של הדפים

            if (!Array.isArray(pagesData)) continue;

            // יצירת הספר החדש
            const newBookId = new mongoose.Types.ObjectId();
            bookIdMap.set(bookName, newBookId);

            // ספירת עמודים
            const completedCount = pagesData.filter(p => p.status === 'completed').length;

            const newBook = {
                _id: newBookId,
                name: bookName,
                slug: createSlug(bookName),
                totalPages: pagesData.length,
                completedPages: completedCount,
                category: 'כללי', // קטגוריה ברירת מחדל
                createdAt: new Date(),
                updatedAt: new Date()
            };

            await Book.create(newBook);

            // עיבוד דפים
            const newPages = [];
            
            for (const p of pagesData) {
                // המרת ID של משתמש
                const claimerId = p.claimedById ? userIdMap.get(p.claimedById) : null;

                // ניסיון לשלוף תוכן טקסט אם קיים בקולקשיין files
                // ב-otzaria-editor התוכן נשמר ב-data/content/BookName_page_X.txt
                const contentPath = `data/content/${bookName.replace(/[^a-zA-Z0-9א-ת]/g, '_')}_page_${p.number}.txt`;
                let contentData = { content: '' };
                
                const contentDoc = await oldDb.collection('files').findOne({ path: contentPath });
                if (contentDoc && contentDoc.data) {
                    // המידע יכול להיות string או אובייקט תלוי בגרסה
                    const rawContent = typeof contentDoc.data === 'string' 
                        ? contentDoc.data 
                        : contentDoc.data.content || '';
                    
                    contentData = parsePageContent(rawContent);
                }

                newPages.push({
                    book: newBookId,
                    pageNumber: p.number,
                    status: p.status || 'available',
                    claimedBy: claimerId,
                    claimedAt: parseDate(p.claimedAt),
                    completedAt: parseDate(p.completedAt),
                    imagePath: p.thumbnail || '', // שימוש ב-URL הקיים (GitHub/Blob)
                    ...contentData // content, columns etc.
                });
            }

            // שמירת דפים ב-Bulk (יעיל יותר)
            if (newPages.length > 0) {
                await Page.insertMany(newPages);
            }
            
            process.stdout.write('.'); // אינדיקציה להתקדמות
        }
        console.log('\n✅ Books and Pages migration complete.');

        // --- שלב 3: מיגרציית הודעות ---
        console.log('\n💬 Migrating Messages...');
        
        // המסד הישן שמר הודעות ב-collection 'messages'
        const messagesCursor = oldDb.collection('messages').find({});
        const newMessages = [];

        while (await messagesCursor.hasNext()) {
            const msg = await messagesCursor.next();

            const senderId = userIdMap.get(msg.senderId) || defaultAdminId;
            const recipientId = msg.recipientId ? userIdMap.get(msg.recipientId) : null; // null = לכולם/אדמין

            // המרת תגובות
            const replies = (msg.replies || []).map(r => ({
                sender: userIdMap.get(r.senderId) || defaultAdminId,
                content: r.message || r.content,
                createdAt: parseDate(r.createdAt)
            })).filter(r => r.sender); // סנן אם אין שולח

            if (senderId) {
                newMessages.push({
                    sender: senderId,
                    recipient: recipientId,
                    subject: msg.subject || 'ללא נושא',
                    content: msg.message || msg.content || '',
                    isRead: msg.status === 'read' || msg.isRead,
                    replies: replies,
                    createdAt: parseDate(msg.createdAt),
                    updatedAt: parseDate(msg.updatedAt || msg.createdAt)
                });
            }
        }

        if (newMessages.length > 0) {
            await Message.insertMany(newMessages);
        }
        console.log(`✅ Migrated ${newMessages.length} messages.`);

        // --- שלב 4: מיגרציית Uploads ---
        console.log('\n📤 Migrating Uploads...');
        
        // קריאת המטא-דאטה של העלאות
        const uploadsMetaDoc = await oldDb.collection('files').findOne({ path: 'data/uploads-meta.json' });
        
        if (uploadsMetaDoc && Array.isArray(uploadsMetaDoc.data)) {
            const newUploads = [];

            for (const up of uploadsMetaDoc.data) {
                const uploaderId = userIdMap.get(up.uploadedById) || defaultAdminId;
                
                // קריאת תוכן הקובץ עצמו אם אפשר
                const uploadFilePath = `data/uploads/${up.fileName}`;
                const fileContentDoc = await oldDb.collection('files').findOne({ path: uploadFilePath });
                const content = fileContentDoc ? 
                    (typeof fileContentDoc.data === 'string' ? fileContentDoc.data : fileContentDoc.data.content) 
                    : '';

                if (uploaderId) {
                    newUploads.push({
                        uploader: uploaderId,
                        bookName: up.bookName,
                        originalFileName: up.originalFileName || up.fileName,
                        content: content,
                        status: up.status || 'pending',
                        reviewedBy: up.reviewedBy ? defaultAdminId : null, // אין לנו ID של הבודק הישן בקלות, נשים אדמין אם נבדק
                        createdAt: parseDate(up.uploadedAt),
                        updatedAt: parseDate(up.uploadedAt)
                    });
                }
            }

            if (newUploads.length > 0) {
                await Upload.insertMany(newUploads);
            }
            console.log(`✅ Migrated ${newUploads.length} uploads.`);
        } else {
            console.log('ℹ️ No uploads metadata found.');
        }

        console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');

    } catch (error) {
        console.error('\n❌ Migration Failed:', error);
    } finally {
        if (oldClient) await oldClient.close();
        await mongoose.disconnect();
        console.log('👋 Connections closed.');
    }
}

// הרצת המיגרציה
migrate();