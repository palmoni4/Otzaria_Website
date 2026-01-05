import mongoose from 'mongoose';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// --- הגדרות ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתני סביבה
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const FILES_JSON_PATH = path.resolve(__dirname, '../files.json');
const MESSAGES_JSON_PATH = path.resolve(__dirname, '../messages.json');
const BACKUPS_JSON_PATH = path.resolve(__dirname, '../backups.json');

// --- סכמות (Mongoose Models) ---
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
    folderPath: { type: String },
}, { timestamps: true });

const PageSchema = new mongoose.Schema({
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
    pageNumber: { type: Number, required: true },
    content: { type: String, default: '' },
    status: { type: String, enum: ['available', 'in-progress', 'completed'], default: 'available' },
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    claimedAt: { type: Date },
    completedAt: { type: Date },
    imagePath: { type: String, required: true }, // כאן יישמר הקישור לגיטהאב
}, { timestamps: true });

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    subject: { type: String, default: 'ללא נושא' },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    replies: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      content: String,
      createdAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// מודלים (למניעת יצירה מחדש אם כבר קיימים בזיכרון)
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Book = mongoose.models.Book || mongoose.model('Book', BookSchema);
const Page = mongoose.models.Page || mongoose.model('Page', PageSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// --- פונקציות עזר ---

// מפענח שמות כמו _D7_90_D7... לעברית קריאה
function decodeFileName(encodedName) {
    if (!encodedName) return '';
    try {
        // המרה של _ ל-% כדי ש-decodeURIComponent יבין
        const uriComponent = encodedName.replace(/_/g, '%');
        return decodeURIComponent(uriComponent);
    } catch (e) { return encodedName; }
}

// ניקוי שם הקובץ כדי לחלץ שם ספר ומספר עמוד
function parseContentFilename(filename) {
    // דוגמה: _D7_90..._page_3.txt -> אחרי פענוח: "שם ספר page 3.txt"
    let decoded = filename;
    if (filename.startsWith('_')) {
        decoded = decodeFileName(filename);
    }
    
    // ניסיון לחלץ מספר עמוד
    // מחפשים דפוסים כמו "page_3", "page 3", "daf 3"
    const match = decoded.match(/(.*?)[\s_]+(?:page|daf|amud|p)[\s_]*(\d+)/i);
    
    if (match) {
        return {
            bookName: match[1].replace(/_/g, ' ').trim(),
            pageNumber: parseInt(match[2])
        };
    }
    return null;
}

// חילוץ ערכים מפורמט מונגו (Extended JSON)
function extractValue(val) {
    if (val && typeof val === 'object') {
        if (val.$numberInt) return parseInt(val.$numberInt);
        if (val.$oid) return val.$oid;
        if (val.$date && val.$date.$numberLong) return new Date(parseInt(val.$date.$numberLong));
        if (val.$date) return new Date(val.$date);
    }
    return val;
}

// יצירת slug (URL ידידותי)
function createHebrewSlug(name) {
    if (!name) return 'unknown-' + Date.now();
    return name.trim().replace(/\s+/g, '-').replace(/[^\w\u0590-\u05FF\-]/g, '');
}

// קריאת קובץ JSON (תומך גם במערך וגם ב-Line Delimited)
async function loadDataFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return [];
    }
    
    // נסיון לקרוא כ-JSON רגיל
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (fileContent.trim().startsWith('[')) {
            return JSON.parse(fileContent);
        }
    } catch(e) {}

    // קריאה שורה שורה (Line Delimited)
    const results = [];
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const doc = JSON.parse(line);
            results.push(doc);
        } catch (err) {}
    }
    return results;
}

// --- משתנים גלובליים למיפוי ---
const userMap = new Map(); // OldID (String) -> NewID (ObjectId)
const contentMap = new Map(); // "BookName|PageNum" -> Content String

// --- הפונקציה הראשית ---
async function restore() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI in .env');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // 1. טעינת נתונים גולמיים
        console.log('📖 Reading backup files...');
        const rawFiles = await loadDataFromFile(FILES_JSON_PATH);
        const rawBackups = await loadDataFromFile(BACKUPS_JSON_PATH);
        const rawMessages = await loadDataFromFile(MESSAGES_JSON_PATH);
        
        // איחוד רשומות רלוונטיות
        const allRecords = [...rawFiles, ...rawBackups];

        // 2. מיפוי תוכן טקסט (Content Parsing)
        console.log('📝 Indexing text content...');
        rawFiles.forEach(f => {
            if (f.path && f.path.startsWith('data/content/') && f.data?.content) {
                const filename = path.basename(f.path);
                const parsed = parseContentFilename(filename);
                if (parsed) {
                    // מפתח ייחודי: שם ספר + מספר עמוד
                    const key = `${parsed.bookName}|${parsed.pageNumber}`;
                    contentMap.set(key, f.data.content);
                }
            }
        });
        console.log(`✅ Found ${contentMap.size} text pages.`);

        // 3. שחזור משתמשים (Users)
        console.log('👥 Restoring Users...');
        // מחפשים את הרשומה שמכילה את מערך המשתמשים
        const usersRecord = rawFiles.find(f => f.path === 'data/users.json');
        
        if (usersRecord && Array.isArray(usersRecord.data)) {
            for (const u of usersRecord.data) {
                const oldId = u.id; // ה-ID המקורי מהקובץ
                const email = u.email.toLowerCase().trim();
                
                // בדיקה אם המשתמש כבר קיים ב-DB
                let userDoc = await User.findOne({ email });
                
                if (!userDoc) {
                    // יצירה חדשה
                    userDoc = new User({
                        name: u.name,
                        email: email,
                        password: u.password, // הסיסמה המוצפנת נשמרת כמו שהיא
                        role: u.role || 'user',
                        points: extractValue(u.points) || 0,
                        createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
                        updatedAt: new Date()
                    });
                    await userDoc.save();
                } else {
                    // עדכון משתמש קיים
                    userDoc.points = extractValue(u.points) || userDoc.points;
                    userDoc.role = u.role || userDoc.role;
                    await userDoc.save();
                }
                
                // שמירה במפה לצורך קישור בהמשך
                userMap.set(oldId, userDoc._id);
            }
            console.log(`✅ Processed ${usersRecord.data.length} users.`);
        } else {
            console.warn('⚠️ No users found in files.json');
        }

        // 4. שחזור ספרים ודפים (Books & Pages)
        console.log('📚 Restoring Books and Pages...');
        
        // מבנה עזר לאיגוד כל הדפים לפי ספרים
        // pagesByBook[BookName][PageNum] = PageData
        const pagesByBook = {};

        // איסוף כל הדפים מכל הגיבויים
        allRecords.forEach(record => {
            if (record.path && record.path.startsWith('data/pages/')) {
                // שם הקובץ הוא שם הספר (למשל "חוות דעת.json")
                let bookName = path.basename(record.path, '.json');
                bookName = decodeFileName(bookName); // פענוח במקרה שזה מקודד

                if (!pagesByBook[bookName]) pagesByBook[bookName] = {};

                if (Array.isArray(record.data)) {
                    record.data.forEach(p => {
                        const pageNum = extractValue(p.number);
                        
                        // בדיקה אם הנתון הזה חדש יותר ממה שכבר יש לנו
                        const existing = pagesByBook[bookName][pageNum];
                        const newDate = p.updatedAt ? new Date(extractValue(p.updatedAt)) : new Date(0);
                        const oldDate = existing?.updatedAt ? new Date(existing.updatedAt) : new Date(0);

                        // אם אין או שהחדש יותר מעודכן -> דרוס
                        if (!existing || newDate >= oldDate) {
                            pagesByBook[bookName][pageNum] = {
                                ...p,
                                updatedAt: newDate
                            };
                        }
                    });
                }
            }
        });

        // יצירת הספרים והדפים בפועל
        for (const [bookName, pagesMap] of Object.entries(pagesByBook)) {
            // יצירת הספר
            const slug = createHebrewSlug(bookName);
            const totalPages = Object.keys(pagesMap).length;
            
            let book = await Book.findOne({ name: bookName });
            if (!book) {
                book = await Book.create({
                    name: bookName,
                    slug: slug,
                    totalPages: totalPages,
                    completedPages: 0, 
                    category: 'כללי',
                    folderPath: `/uploads/books/${slug}`
                });
            }

            // יצירת הדפים
            const pagesToInsert = [];
            let completedCount = 0;

            for (const [pageNumStr, pageData] of Object.entries(pagesMap)) {
                const pageNum = parseInt(pageNumStr);
                
                // המרת המשתמש שתפס את הדף
                let userId = null;
                const oldUserId = pageData.claimedById;
                if (oldUserId && userMap.has(oldUserId)) {
                    userId = userMap.get(oldUserId);
                }

                // שליפת התוכן מהמפה שיצרנו בשלב 2
                // מנסים מספר וריאציות של מפתח
                const contentKey = `${bookName}|${pageNum}`;
                const content = contentMap.get(contentKey) || '';

                // נתיב תמונה: שומרים את המקור (GitHub) אם קיים!
                let imagePath = pageData.thumbnail;
                if (!imagePath) {
                    // רק אם אין, יוצרים נתיב ברירת מחדל
                    imagePath = `/uploads/books/${slug}/page.${pageNum}.jpg`;
                }

                if (pageData.status === 'completed') completedCount++;

                pagesToInsert.push({
                    book: book._id,
                    pageNumber: pageNum,
                    content: content, // התוכן הטקסטואלי
                    status: pageData.status || 'available',
                    claimedBy: userId,
                    claimedAt: pageData.claimedAt ? new Date(extractValue(pageData.claimedAt)) : null,
                    completedAt: pageData.completedAt ? new Date(extractValue(pageData.completedAt)) : null,
                    imagePath: imagePath, // התמונה המקורית
                    createdAt: pageData.createdAt ? new Date(extractValue(pageData.createdAt)) : new Date(),
                    updatedAt: pageData.updatedAt || new Date()
                });
            }

            // מחיקת דפים ישנים של הספר והכנסת חדשים
            await Page.deleteMany({ book: book._id });
            if (pagesToInsert.length > 0) {
                await Page.insertMany(pagesToInsert);
            }

            // עדכון מונה השלמות בספר
            await Book.findByIdAndUpdate(book._id, { completedPages: completedCount });
            process.stdout.write('.');
        }
        console.log('\n✅ Books and Pages restored.');

        // 5. שחזור הודעות (Messages)
        if (rawMessages && rawMessages.length > 0) {
            console.log(`📨 Restoring ${rawMessages.length} messages...`);
            await Message.deleteMany({}); // איפוס הודעות

            const messagesToInsert = [];
            for (const msg of rawMessages) {
                const oldSenderId = extractValue(msg.senderId) || msg.senderId;
                const senderId = userMap.get(oldSenderId);
                
                // אם השולח לא נמצא (נמחק), נדלג או נקשר לאדמין
                if (!senderId) continue;

                // שחזור תגובות
                const replies = (msg.replies || []).map(r => {
                    const rOldSenderId = extractValue(r.senderId) || r.senderId;
                    const rSenderId = userMap.get(rOldSenderId);
                    if (!rSenderId) return null;
                    return {
                        sender: rSenderId,
                        content: r.message,
                        createdAt: r.createdAt ? new Date(extractValue(r.createdAt)) : new Date()
                    };
                }).filter(r => r !== null);

                messagesToInsert.push({
                    sender: senderId,
                    recipient: null, // הודעות מערכת בד"כ ללא נמען ספציפי או לאדמין
                    subject: msg.subject || 'ללא נושא',
                    content: msg.message,
                    isRead: !!msg.readAt,
                    replies: replies,
                    createdAt: msg.createdAt ? new Date(extractValue(msg.createdAt)) : new Date(),
                    updatedAt: msg.updatedAt ? new Date(extractValue(msg.updatedAt)) : new Date()
                });
            }
            
            if (messagesToInsert.length > 0) {
                await Message.insertMany(messagesToInsert);
            }
            console.log('✅ Messages restored.');
        }

        console.log('🎉 FULL RESTORE COMPLETE!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during restore:', error);
        process.exit(1);
    }
}

restore();