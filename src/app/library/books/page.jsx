'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'

export default function LibraryBooksPage() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetch('/api/library/list')
      .then(res => res.json())
      .then(data => {
        if (data.success) setBooks(data.books)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const filteredBooks = books.filter(book => 
    book.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2" style={{ fontFamily: 'FrankRuehl, serif' }}>
              הספרייה
            </h1>
            <p className="text-gray-600">מאגר הספרים הזמינים לעריכה וקריאה</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="חפש ספר..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm"
            />
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              search
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-40">
            <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          </div>
        ) : filteredBooks.length === 0 ? (
           <div className="text-center py-20 text-gray-500">
               <span className="material-symbols-outlined text-6xl mb-4">library_books</span>
               <p className="text-xl">לא נמצאו ספרים</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredBooks.map(book => {
                const progress = book.totalPages > 0 ? (book.completedPages / book.totalPages) * 100 : 0;
                
                return (
                  <Link 
                    key={book.id} 
                    // שימוש ב-book.path שהוא ה-slug ששמרנו ב-DB
                    href={`/library/book/${book.path}`} 
                    className="group bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-[2/3] bg-gray-100 relative overflow-hidden">
                      {book.thumbnail ? (
                        <img 
                            src={book.thumbnail} 
                            alt={book.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 text-gray-400">
                            <span className="material-symbols-outlined text-6xl mb-2">auto_stories</span>
                            <span className="text-sm">אין תמונה</span>
                        </div>
                      )}
                      
                      {/* תווית קטגוריה */}
                      {book.category && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                              {book.category}
                          </div>
                      )}

                      {/* Progress Bar Overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200/50">
                        <div 
                            className="h-full bg-primary" 
                            style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4">
                        <h3 className="font-bold text-lg mb-1 text-foreground truncate" title={book.name}>{book.name}</h3>
                        <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
                            <span className="flex items-center gap-1" title="הושלמו">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                {book.completedPages}
                            </span>
                            <span className="flex items-center gap-1" title="סך הכל">
                                <span className="material-symbols-outlined text-sm">filter_none</span>
                                {book.totalPages}
                            </span>
                        </div>
                    </div>
                  </Link>
                );
            })}
          </div>
        )}
      </main>
      
    </div>
  )
}