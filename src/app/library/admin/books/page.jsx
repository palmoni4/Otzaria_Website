'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import AddBookDialog from '@/components/AddBookDialog'
import EditBookInfoDialog from '@/components/EditBookInfoDialog'

export default function AdminBooksPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddBook, setShowAddBook] = useState(false)
  const [editingBookInfo, setEditingBookInfo] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all') // הוספתי את זה כי זה היה חסר

  const [renamingBook, setRenamingBook] = useState(null)
  const [newName, setNewName] = useState('')

  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [selectedBooksToMerge, setSelectedBooksToMerge] = useState([]) 
  const [mergedBookName, setMergedBookName] = useState('')
  const [isMergedHidden, setIsMergedHidden] = useState(false)
  const [isMerging, setIsMerging] = useState(false)

  const loadBooks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/library/list')
      const data = await response.json()
      if (data.success) {
        setBooks(data.books)
      }
    } catch (error) {
      console.error('Error loading books:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
  }, [])

  const handleDeleteBook = async (bookId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הספר? כל העמודים והמידע יימחקו לצמיתות!')) return

    try {
      const response = await fetch('/api/admin/books/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId })
      })
      const result = await response.json()
      if (result.success) {
        setBooks(prev => prev.filter(b => b.id !== bookId)) 
        alert('הספר נמחק בהצלחה!')
      } else {
        alert(result.error || 'שגיאה במחיקה')
      }
    } catch (e) {
      alert('שגיאה במחיקת הספר')
    }
  }

  const toggleVisibility = async (bookId, currentHiddenStatus) => {
    try {
        const response = await fetch('/api/admin/books/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                bookId: bookId, 
                isHidden: !currentHiddenStatus 
            })
        });
        
        if (response.ok) {
            setBooks(prev => prev.map(b => 
                b.id === bookId ? { ...b, isHidden: !currentHiddenStatus } : b
            ));
        } else {
            alert('שגיאה בעדכון הסטטוס');
        }
    } catch (e) {
        alert('תקלה בתקשורת');
    }
  };

  const handleRenameSubmit = async () => {
    if (!newName.trim() || !renamingBook) return;

    try {
        const response = await fetch('/api/admin/books/update', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                bookId: renamingBook.id, 
                name: newName 
            })
        });

        if (response.ok) {
            setBooks(prev => prev.map(b => 
                b.id === renamingBook.id ? { ...b, name: newName } : b
            ));
            setRenamingBook(null);
            setNewName('');
        } else {
            alert('שגיאה בשינוי השם');
        }
    } catch (e) {
        alert('תקלה בתקשורת');
    }
  };

  const openRenameDialog = (book) => {
      setRenamingBook(book);
      setNewName(book.name);
  };

  const handleDownloadFullText = async (book) => {
    try {
        const response = await fetch(`/api/admin/books/export-text?bookId=${book.id}`);
        const result = await response.json();

        if (result.success) {
            const blob = new Blob([result.combinedText], { type: 'text/plain;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.download = `${book.name}_מלא.txt`;
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } else {
            alert('שגיאה בהפקת הקובץ: ' + (result.error || 'נסה שוב מאוחר יותר'));
        }
    } catch (e) {
        console.error('Download error:', e);
        alert('תקלה בתקשורת עם השרת');
    }
  };

  const addBookToMergeList = (book) => {
      if (!selectedBooksToMerge.find(b => b.id === book.id)) {
          setSelectedBooksToMerge(prev => [...prev, book]);
      }
  };

  const removeBookFromMergeList = (bookId) => {
      setSelectedBooksToMerge(prev => prev.filter(b => b.id !== bookId));
  };

  const moveBookOrder = (index, direction) => {
      const newDocs = [...selectedBooksToMerge];
      if (direction === 'up' && index > 0) {
          [newDocs[index], newDocs[index - 1]] = [newDocs[index - 1], newDocs[index]];
      } else if (direction === 'down' && index < newDocs.length - 1) {
          [newDocs[index], newDocs[index + 1]] = [newDocs[index + 1], newDocs[index]];
      }
      setSelectedBooksToMerge(newDocs);
  };

  const handleMergeSubmit = async () => {
      if (selectedBooksToMerge.length < 2) {
          alert('יש לבחור לפחות 2 ספרים למיזוג');
          return;
      }
      if (!mergedBookName.trim()) {
          alert('יש לבחור שם לספר המאוחד');
          return;
      }

      setIsMerging(true);
      try {
          const orderedBookIds = selectedBooksToMerge.map(b => b.id);
          
          const response = await fetch('/api/admin/books/merge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  bookIds: orderedBookIds,
                  newName: mergedBookName,
                  isHidden: isMergedHidden
              })
          });

          const result = await response.json();

          if (result.success) {
              alert('הספרים מוזגו בהצלחה!');
              setShowMergeDialog(false);
              setSelectedBooksToMerge([]);
              setMergedBookName('');
              setIsMergedHidden(false);
              loadBooks(); 
          } else {
              alert(result.error || 'שגיאה במיזוג הספרים');
          }
      } catch (e) {
          console.error(e);
          alert('שגיאה בתקשורת עם השרת');
      } finally {
          setIsMerging(false);
      }
  };

  const filteredBooks = books.filter(book => {  
    const matchesSearch = book.name.toLowerCase().includes(searchTerm.toLowerCase());  
    if (!matchesSearch) return false;  

    const total = book.totalPages || 0;  
    const completed = book.completedPages || 0;  

    switch (activeTab) {  
      case 'in_progress':  
        return completed > 0 && completed < total;  
      case 'hidden':  
        return book.isHidden;  
      case 'completed':  
        return total > 0 && completed >= total;  
      default:  
        return true;  
    }  
  });  

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  )

  return (
    <>
        <div className="glass-strong p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2 whitespace-nowrap">
                    <span className="material-symbols-outlined text-primary">menu_book</span>
                    ניהול ספרים
                </h2>
                <div className="relative w-full md:w-64">
                    <input 
                        type="text"
                        placeholder="חיפוש ספר..."
                        className="w-full border rounded-lg pr-8 pl-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <span className="material-symbols-outlined absolute right-2 top-2 text-gray-400 text-lg">search</span>
                </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
                <button
                    onClick={() => setShowMergeDialog(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-md w-full md:w-auto justify-center"
                >
                    <span className="material-symbols-outlined">call_merge</span>
                    <span className="font-bold">מיזוג ספרים</span>
                    <span className="text-xs opacity-80">(להשתמש רק על ספרים שלא התחילו טיפול)</span>
                </button>

                <button
                    onClick={() => setShowAddBook(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl hover:bg-accent transition-all shadow-md w-full md:w-auto justify-center"
                >
                    <span className="material-symbols-outlined">add_circle</span>
                    <span className="font-bold">הוסף ספר חדש</span>
                </button>
            </div>
        </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
            { id: 'all', label: 'כל הספרים' },
            { id: 'in_progress', label: 'בטיפול' },
            { id: 'hidden', label: 'מוסתרים' },
            { id: 'completed', label: 'הושלמו' },
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id 
                    ? 'bg-primary text-on-primary' 
                    : 'bg-white/50 text-gray-600 hover:bg-white/80'
                }`}
            >
                {tab.label}
            </button>
        ))}
      </div>

        {books.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
            <span className="material-symbols-outlined text-6xl mb-2">library_books</span>
            <p>אין ספרים במערכת עדיין</p>
            </div>
        ) : filteredBooks.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
                <p>לא נמצאו ספרים התואמים לחיפוש</p>
            </div>
        ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredBooks.map(book => {
                const isHidden = book.isHidden === true;
                const progress = book.totalPages > 0 ? Math.round((book.completedPages / book.totalPages) * 100) : 0;
                return (
                    <div key={book.id || book.path} className={`group glass p-0 rounded-xl border transition-all hover:shadow-lg overflow-hidden flex flex-col ${isHidden ? 'border-amber-200 bg-amber-50/30' : 'border-white/50'}`}>
                    <div className="bg-gradient-to-b from-primary/5 to-transparent p-4 flex items-start justify-between relative">
                        <div className="flex gap-3">
                            {book.thumbnail ? (
                            <Image
                                src={book.thumbnail}
                                alt={book.name}
                                width={50}
                                height={70}
                                className="rounded shadow-sm object-cover"
                            />
                            ) : (
                                <div className="w-[50px] h-[70px] bg-gray-200 rounded flex items-center justify-center text-gray-400">
                                    <span className="material-symbols-outlined text-2xl">book</span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-on-surface line-clamp-1 text-lg" title={book.name}>{book.name}</h3>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <span className="text-xs text-gray-500 bg-white/50 px-2 py-0.5 rounded-full border border-gray-100">
                                        {book.category || 'כללי'}
                                    </span>
                                    {isHidden && (
                                        <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">visibility_off</span>
                                            מוסתר
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => openRenameDialog(book)}
                            className="text-gray-400 hover:text-primary hover:bg-white/80 p-1.5 rounded-full transition-all"
                            title="שנה שם ספר"
                        >
                            <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                    </div>

                    <div className="p-4 pt-2 flex-1 flex flex-col">
                        <div className="mt-2 mb-4">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                                <span>התקדמות</span>
                                <span className="font-bold">{progress}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-center mt-1 text-gray-500">
                                {book.completedPages || 0} מתוך {book.totalPages || 0} עמודים הושלמו
                            </p>
                        </div>

                        <div className="mt-auto space-y-2">
                            {progress === 100 ? (
                                <button
                                     onClick={() => handleDownloadFullText(book)}
                                     className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-bold transition-all mb-1 shadow-sm"
                                     title="הורד את כל דפי הספר כקובץ טקסט אחד"
                                >
                                     <span className="material-symbols-outlined text-sm">download</span>
                                     הורד טקסט מאוחד
                                </button>
                            ) : (
                                <button
                                     onClick={() => handleDownloadFullText(book)}
                                     className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded text-xs transition-all mb-1"
                                     title="הורד את הטקסט הקיים (חלקי)"
                                 >
                                     <span className="material-symbols-outlined text-[16px]">download</span>
                                     <span>הורד טקסט חלקי</span>
                                </button>
                             )}

                            <div className="grid grid-cols-2 gap-2">
                                <Link
                                    href={`/library/book/${encodeURIComponent(book.path)}`}
                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    צפה
                                </Link>
                                <button
                                    onClick={() => setEditingBookInfo(book)}
                                    className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">edit_note</span>
                                    פרטים
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleVisibility(book.id, isHidden)}
                                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isHidden 
                                        ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                    }`}
                                    title={isHidden ? "הפוך לספר גלוי לכולם" : "הסתר ספר מהציבור"}
                                >
                                    <span className="material-symbols-outlined text-sm">
                                        {isHidden ? 'visibility_off' : 'visibility'}
                                    </span>
                                    <span>{isHidden ? 'מוסתר' : 'גלוי'}</span>
                                </button>

                                <button
                                    onClick={() => handleDeleteBook(book.id)}
                                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm transition-colors font-medium"
                                >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                    <span>מחק</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    </div>
                )
            })}
            </div>
        )}

        <AddBookDialog
            isOpen={showAddBook}
            onClose={() => setShowAddBook(false)}
            onBookAdded={loadBooks}
        />

        {editingBookInfo && (
            <EditBookInfoDialog
            book={editingBookInfo}
            onClose={() => setEditingBookInfo(null)}
            onSave={loadBooks}
            />
        )}
        </div>

        {renamingBook && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 h-screen w-screen">
                <div 
                    className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-gray-800">שינוי שם ספר</h3>
                        <button onClick={() => setRenamingBook(null)} className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 p-1">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">שם הספר החדש</label>
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-base"
                            autoFocus
                        />
                        
                        <div className="flex justify-end gap-3 mt-8">
                            <button 
                                onClick={() => setRenamingBook(null)}
                                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                            >
                                ביטול
                            </button>
                            <button 
                                onClick={handleRenameSubmit}
                                className="px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!newName.trim() || newName === renamingBook.name}
                            >
                                שמור שינויים
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showMergeDialog && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 h-screen w-screen">
                <div 
                    className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden relative flex flex-col h-[85vh]" 
                    onClick={e => e.stopPropagation()}
                >
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 p-2 rounded-full">
                                <span className="material-symbols-outlined text-purple-600">call_merge</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-xl text-gray-800">מיזוג ספרים</h3>
                                <p className="text-xs text-gray-500">בחר ספרים וסדר אותם לפי הסדר הרצוי</p>
                            </div>
                        </div>
                        <button onClick={() => setShowMergeDialog(false)} className="text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 p-1">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        <div className="w-full md:w-1/2 border-l p-4 flex flex-col bg-gray-50/50">
                            <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">library_books</span>
                                בחר ספרים להוספה
                            </h4>
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {books.map(book => {
                                    const isSelected = selectedBooksToMerge.some(b => b.id === book.id);
                                    if (isSelected) return null;

                                    return (
                                        <div 
                                            key={book.id}
                                            onClick={() => addBookToMergeList(book)}
                                            className="bg-white p-3 rounded-lg border hover:border-purple-300 hover:shadow-sm cursor-pointer transition-all flex items-center gap-3 group"
                                        >
                                            {book.thumbnail ? (
                                                <Image src={book.thumbnail} alt="" width={30} height={40} className="rounded object-cover shadow-sm" />
                                            ) : (
                                                <div className="w-[30px] h-[40px] bg-gray-100 rounded flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-gray-300 text-sm">book</span>
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-800 truncate">{book.name}</div>
                                                <div className="text-xs text-gray-500">{book.category}</div>
                                            </div>
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                                <span className="material-symbols-outlined text-sm">add</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="w-full md:w-1/2 p-4 flex flex-col bg-white">
                            <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">format_list_numbered</span>
                                סדר הספרים במיזוג ({selectedBooksToMerge.length})
                            </h4>

                            <div className="mb-4 space-y-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">שם הספר המאוחד החדש</label>
                                    <input 
                                        type="text" 
                                        value={mergedBookName}
                                        onChange={(e) => setMergedBookName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 outline-none text-base bg-purple-50/30"
                                        placeholder="לדוגמה: אוסף כתבים מלא"
                                    />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                    <input 
                                        type="checkbox" 
                                        checked={isMergedHidden}
                                        onChange={(e) => setIsMergedHidden(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 border-gray-300"
                                    />
                                    <span>הגדר את הספר המאוחד כ"מוסתר" (לא יוצג לציבור)</span>
                                </label>
                            </div>

                            {selectedBooksToMerge.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 m-2">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">playlist_add</span>
                                    <p className="text-sm">בחר ספרים מהרשימה מימין</p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar pb-4">
                                    {selectedBooksToMerge.map((book, index) => (
                                        <div key={book.id} className="bg-purple-50 border border-purple-100 p-3 rounded-lg flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                                            <div className="font-bold text-purple-300 text-lg w-6 text-center">{index + 1}</div>
                                            <div className="flex-1 min-w-0 font-medium text-sm text-gray-900 truncate">{book.name}</div>
                                            <div className="flex items-center gap-1 bg-white rounded-lg border shadow-sm p-1">
                                                <button onClick={() => moveBookOrder(index, 'up')} disabled={index === 0} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                                                    <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                                </button>
                                                <button onClick={() => moveBookOrder(index, 'down')} disabled={index === selectedBooksToMerge.length - 1} className="p-1 hover:bg-gray-100 rounded disabled:opacity-30">
                                                    <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                                </button>
                                                <button onClick={() => removeBookFromMergeList(book.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                        <button onClick={() => setShowMergeDialog(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors">ביטול</button>
                        <button 
                            onClick={handleMergeSubmit} 
                            disabled={selectedBooksToMerge.length < 2 || !mergedBookName.trim() || isMerging}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold shadow-md disabled:opacity-50 flex items-center gap-2"
                        >
                            {isMerging ? 'מבצע מיזוג...' : 'בצע מיזוג עכשיו'}
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  )

}

