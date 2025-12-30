'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

export default function EditPage() {
    const { bookPath, pageNumber } = useParams() // bookPath is slug
    const router = useRouter()
    const { data: session, status } = useSession()
    
    const [loading, setLoading] = useState(true)
    const [pageData, setPageData] = useState(null)
    const [content, setContent] = useState('')
    const [isSaving, setIsSaving] = useState(false)
    const [isTwoColumns, setIsTwoColumns] = useState(false)
    const [rightCol, setRightCol] = useState('')
    const [leftCol, setLeftCol] = useState('')

    // טעינת נתונים ראשונית
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/library/auth/login');
        if (status !== 'authenticated') return;

        const loadData = async () => {
            try {
                // 1. קבלת פרטי העמוד (כולל תמונה)
                const bookRes = await fetch(`/api/book/${bookPath}`);
                const bookJson = await bookRes.json();
                const page = bookJson.pages.find(p => p.number === parseInt(pageNumber));
                
                if (!page) throw new Error('Page not found');
                setPageData(page);

                // 2. קבלת התוכן הקיים מה-DB
                const contentRes = await fetch(`/api/page-content?bookPath=${bookPath}&pageNumber=${pageNumber}`);
                const contentJson = await contentRes.json();
                
                if (contentJson.success && contentJson.data) {
                    setContent(contentJson.data.content);
                    setIsTwoColumns(contentJson.data.twoColumns);
                    setRightCol(contentJson.data.rightColumn);
                    setLeftCol(contentJson.data.leftColumn);
                }
            } catch (err) {
                console.error(err);
                alert('שגיאה בטעינת הנתונים');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [bookPath, pageNumber, status, router]);

    // שמירה אוטומטית (Debounce)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (!loading && pageData) {
                saveContent();
            }
        }, 2000); // שמירה כל 2 שניות ללא הקלדה

        return () => clearTimeout(timeoutId);
    }, [content, rightCol, leftCol, isTwoColumns]);

    const saveContent = async () => {
        setIsSaving(true);
        try {
            await fetch('/api/page-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookPath, // Slug
                    pageNumber: parseInt(pageNumber),
                    content,
                    twoColumns: isTwoColumns,
                    rightColumn: rightCol,
                    leftColumn: leftCol
                })
            });
        } catch (error) {
            console.error('Save failed', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleComplete = async () => {
        if (!confirm('האם סיימת לערוך את העמוד? הוא יסומן כהושלם.')) return;
        
        await saveContent(); // שמירה אחרונה
        
        try {
            const res = await fetch('/api/book/complete-page', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // צריך לשלוח את ה-ID האמיתי של העמוד, או שנשלוף אותו בשרת לפי bookPath+number
                    // כאן נשתמש ב-bookPath ונניח שהשרת מטפל בזה (ראה את ה-API למעלה)
                    // אבל ה-API הנוכחי ב-complete-page מצפה ל-pageId. נתקן אותו או נשתמש בלוגיקה מותאמת.
                    // לצורך הפשטות נניח שהשרת יודע לטפל בזה או שנשלח את הנתונים הנכונים.
                    // בוא נניח שה-API עודכן לקבל bookPath+pageNumber או שנתקן את ה-API.
                    // התיקון ל-API נמצא למטה ב"הערות נוספות".
                    pageId: pageData.id 
                })
            });
            
            if (res.ok) {
                router.push(`/library/book/${bookPath}`);
            }
        } catch (err) {
            alert('שגיאה בסיום');
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center">טוען עורך...</div>;

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 p-2 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href={`/library/book/${bookPath}`} className="flex items-center text-gray-600 hover:text-primary">
                        <span className="material-symbols-outlined">arrow_forward</span>
                        <span className="mr-1">חזרה לספר</span>
                    </Link>
                    <span className="font-bold text-lg">עמוד {pageNumber}</span>
                    {isSaving ? (
                        <span className="text-xs text-gray-400">שומר...</span>
                    ) : (
                        <span className="text-xs text-green-600">נשמר</span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsTwoColumns(!isTwoColumns)}
                        className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                    >
                        {isTwoColumns ? 'טור אחד' : 'שני טורים'}
                    </button>
                    <button 
                        onClick={handleComplete}
                        className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow-sm"
                    >
                        סיים עריכה
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Image Pane (Right/Left depending on preference, currently Left for split) */}
                <div className="w-1/2 bg-gray-800 p-4 overflow-auto flex items-center justify-center relative">
                    <img 
                        src={pageData.thumbnail} 
                        alt="Page Source" 
                        className="max-w-full shadow-lg"
                    />
                </div>

                {/* Editor Pane */}
                <div className="w-1/2 bg-white flex flex-col border-r border-gray-200">
                    {isTwoColumns ? (
                        <div className="flex-1 flex divide-x divide-x-reverse">
                            <textarea
                                value={rightCol}
                                onChange={e => setRightCol(e.target.value)}
                                className="w-1/2 h-full p-6 resize-none focus:outline-none text-lg leading-relaxed font-serif"
                                placeholder="טור ימני..."
                                dir="rtl"
                            />
                            <textarea
                                value={leftCol}
                                onChange={e => setLeftCol(e.target.value)}
                                className="w-1/2 h-full p-6 resize-none focus:outline-none text-lg leading-relaxed font-serif bg-gray-50"
                                placeholder="טור שמאלי..."
                                dir="rtl"
                            />
                        </div>
                    ) : (
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="w-full h-full p-8 resize-none focus:outline-none text-lg leading-relaxed font-serif"
                            placeholder="הקלד כאן את הטקסט..."
                            dir="rtl"
                        />
                    )}
                </div>
            </div>
        </div>
    )
}