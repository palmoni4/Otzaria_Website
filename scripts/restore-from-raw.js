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
    claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // הקישור הקריטי
    claimedAt: { type: Date },
    completedAt: { type: Date },
    imagePath: { type: String, required: true },
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

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Book = mongoose.models.Book || mongoose.model('Book', BookSchema);
const Page = mongoose.models.Page || mongoose.model('Page', PageSchema);
const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

// --- פונקציות עזר ---

function decodeFileName(encodedName) {
    if (!encodedName) return '';
    try {
        const uriComponent = encodedName.replace(/_/g, '%');
        return decodeURIComponent(uriComponent);
    } catch (e) { return encodedName; }
}

function parseContentFilename(filename) {
    let decoded = filename;
    if (filename.startsWith('_')) {
        decoded = decodeFileName(filename);
    }
    const match = decoded.match(/(.*?)[\s_]+(?:page|daf|amud|p)[\s_]*(\d+)/i);
    if (match) {
        return {
            bookName: match[1].replace(/_/g, ' ').trim(),
            pageNumber: parseInt(match[2])
        };
    }
    return null;
}

function extractValue(val) {
    if (val && typeof val === 'object') {
        if (val.$numberInt) return parseInt(val.$numberInt);
        if (val.$oid) return val.$oid;
        if (val.$date && val.$date.$numberLong) return new Date(parseInt(val.$date.$numberLong));
        if (val.$date) return new Date(val.$date);
    }
    return val;
}

function createHebrewSlug(name) {
    if (!name) return 'unknown-' + Date.now();
    return name.trim().replace(/\s+/g, '-').replace(/[^\w\u0590-\u05FF\-]/g, '');
}

async function loadDataFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return [];
    }
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        if (fileContent.trim().startsWith('[')) {
            return JSON.parse(fileContent);
        }
    } catch(e) {}

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
const userNameMap = new Map(); // Name (String) -> NewID (ObjectId) - מנגנון גיבוי
const contentMap = new Map();

// --- הפונקציה הראשית ---
async function restore() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI in .env');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        // ניקוי המסד לפני שחזור (אופציונלי - בטל אם אתה רוצה רק לעדכן)
        console.log('🧹 Clearing old data...');
        await User.deleteMany({});
        await Book.deleteMany({});
        await Page.deleteMany({});
        await Message.deleteMany({});

        // 1. טעינת קבצים
        console.log('📖 Reading backup files...');
        const rawFiles = await loadDataFromFile(FILES_JSON_PATH);
        const rawBackups = await loadDataFromFile(BACKUPS_JSON_PATH);
        const rawMessages = await loadDataFromFile(MESSAGES_JSON_PATH);
        const allRecords = [...rawFiles, ...rawBackups];

        // 2. מיפוי תוכן
        console.log('📝 Indexing text content...');
        rawFiles.forEach(f => {
            if (f.path && f.path.startsWith('data/content/') && f.data?.content) {
                const filename = path.basename(f.path);
                const parsed = parseContentFilename(filename);
                if (parsed) {
                    const key = `${parsed.bookName}|${parsed.pageNumber}`;
                    contentMap.set(key, f.data.content);
                }
            }
        });

        // 3. שחזור משתמשים (Users)
        console.log('👥 Restoring Users...');
        const usersRecord = rawFiles.find(f => f.path === 'data/users.json');
        
        if (usersRecord && Array.isArray(usersRecord.data)) {
            for (const u of usersRecord.data) {
                // המרת ID למחרוזת בטוחה
                const oldId = String(u.id); 
                const email = u.email ? u.email.toLowerCase().trim() : `noemail_${oldId}@example.com`;
                const name = u.name ? u.name.trim() : 'Unknown';

                // יצירת משתמש
                const userDoc = await User.create({
                    name: name,
                    email: email,
                    password: u.password,
                    role: u.role || 'user',
                    points: extractValue(u.points) || 0,
                    createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
                    updatedAt: new Date()
                });
                
                // שמירה בשתי המפות לזיהוי ודאי
                userMap.set(oldId, userDoc._id);
                userNameMap.set(name, userDoc._id);
            }
            console.log(`✅ Restored ${userMap.size} users.`);
        }

        // 4. שחזור ספרים ודפים
        console.log('📚 Restoring Books and Pages...');
        const pagesByBook = {};

        allRecords.forEach(record => {
            if (record.path && record.path.startsWith('data/pages/')) {
                let bookName = path.basename(record.path, '.json');
                bookName = decodeFileName(bookName);

                if (!pagesByBook[bookName]) pagesByBook[bookName] = {};

                if (Array.isArray(record.data)) {
                    record.data.forEach(p => {
                        const pageNum = extractValue(p.number);
                        
                        // קבלת הגרסה העדכנית ביותר של הדף
                        const existing = pagesByBook[bookName][pageNum];
                        const newDate = p.updatedAt ? new Date(extractValue(p.updatedAt)) : new Date(0);
                        const oldDate = existing?.updatedAt ? new Date(existing.updatedAt) : new Date(0);

                        if (!existing || newDate >= oldDate) {
                            pagesByBook[bookName][pageNum] = { ...p, updatedAt: newDate };
                        }
                    });
                }
            }
        });

        // יצירה בפועל
        let totalPagesInserted = 0;
        let matchedUsersCount = 0;

        for (const [bookName, pagesMap] of Object.entries(pagesByBook)) {
            const slug = createHebrewSlug(bookName);
            
            const book = await Book.create({
                name: bookName,
                slug: slug,
                totalPages: Object.keys(pagesMap).length,
                completedPages: 0,
                category: 'כללי',
                folderPath: `/uploads/books/${slug}`
            });

            const pagesToInsert = [];
            let completedCount = 0;

            for (const [pageNumStr, pageData] of Object.entries(pagesMap)) {
                const pageNum = parseInt(pageNumStr);
                
                // --- השידוך הקריטי ---
                let userId = null;
                
                // 1. נסיון לפי ID
                if (pageData.claimedById) {
                    const idKey = String(pageData.claimedById);
                    if (userMap.has(idKey)) {
                        userId = userMap.get(idKey);
                    }
                }
                
                // 2. נסיון לפי שם (אם ID נכשל)
                if (!userId && pageData.claimedBy) {
                    const nameKey = pageData.claimedBy.trim();
                    if (userNameMap.has(nameKey)) {
                        userId = userNameMap.get(nameKey);
                    }
                }

                if (userId) matchedUsersCount++;

                // טיפול בנתיב התמונה (שמירה על הקישור לגיטהאב)
                let imagePath = pageData.thumbnail;
                if (!imagePath) {
                    imagePath = `/uploads/books/${slug}/page.${pageNum}.jpg`;
                }

                // טיפול בתוכן
                const contentKey = `${bookName}|${pageNum}`;
                const content = contentMap.get(contentKey) || '';

                if (pageData.status === 'completed') completedCount++;

                pagesToInsert.push({
                    book: book._id,
                    pageNumber: pageNum,
                    content: content,
                    status: pageData.status || 'available',
                    claimedBy: userId, // כאן נכנס ה-ObjectId האמיתי
                    claimedAt: pageData.claimedAt ? new Date(extractValue(pageData.claimedAt)) : null,
                    completedAt: pageData.completedAt ? new Date(extractValue(pageData.completedAt)) : null,
                    imagePath: imagePath,
                    createdAt: pageData.createdAt ? new Date(extractValue(pageData.createdAt)) : new Date(),
                    updatedAt: pageData.updatedAt || new Date()
                });
            }

            if (pagesToInsert.length > 0) {
                await Page.insertMany(pagesToInsert);
                totalPagesInserted += pagesToInsert.length;
            }

            await Book.findByIdAndUpdate(book._id, { completedPages: completedCount });
            process.stdout.write('.');
        }
        console.log(`\n✅ Inserted ${totalPagesInserted} pages.`);
        console.log(`✅ Successfully linked ${matchedUsersCount} pages to users.`);

        // 5. שחזור הודעות
        if (rawMessages && rawMessages.length > 0) {
            console.log(`📨 Restoring ${rawMessages.length} messages...`);
            const messagesToInsert = [];
            
            for (const msg of rawMessages) {
                const oldSenderId = String(extractValue(msg.senderId) || msg.senderId);
                const senderId = userMap.get(oldSenderId); // גם אם משתמש נמחק, אולי יש לנו ID?
                
                // כאן אנחנו חייבים senderId. אם לא מצאנו, נדלג.
                if (!senderId) continue;

                const replies = (msg.replies || []).map(r => {
                    const rOldId = String(extractValue(r.senderId) || r.senderId);
                    const rId = userMap.get(rOldId);
                    if (!rId) return null;
                    return {
                        sender: rId,
                        content: r.message,
                        createdAt: r.createdAt ? new Date(extractValue(r.createdAt)) : new Date()
                    };
                }).filter(Boolean);

                messagesToInsert.push({
                    sender: senderId,
                    recipient: null,
                    subject: msg.subject || 'הודעה משוחזרת',
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

        // --- בדיקת אימות סופית (Verification) ---
        console.log('\n📊 Verifying Data Integrity...');
        
        // בדיקת כמה דפים יש לכל משתמש בפועל ב-DB
        const stats = await Page.aggregate([
            { $match: { claimedBy: { $ne: null } } },
            { $group: { _id: "$claimedBy", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 } // הצגת 5 המובילים
        ]);

        console.log("🏆 Top 5 Users by Page Count (Verification):");
        for (const stat of stats) {
            const user = await User.findById(stat._id);
            if (user) {
                console.log(`   - ${user.name}: ${stat.count} pages`);
            } else {
                console.log(`   - Unknown User (${stat._id}): ${stat.count} pages`);
            }
        }

        if (stats.length === 0) {
            console.error("❌ CRITICAL WARNING: No pages are linked to users! Something went wrong with ID matching.");
        } else {
            console.log("✅ Data verification passed. Users have pages linked.");
        }

        console.log('🎉 FULL RESTORE COMPLETE!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error during restore:', error);
        process.exit(1);
    }
}

restore();