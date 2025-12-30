'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function LibraryPage() {
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
          <h1 className="text-3xl font-bold text-on-surface" style={{ fontFamily: 'FrankRuehl, serif' }}>
            הספרייה
          </h1>
          
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="חפש ספר..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pr-10 rounded-lg border border-surface-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              search
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredBooks.map(book => (
              <Link 
                key={book.id} 
                href={`/library/book/${book.path}`} // book.path הוא ה-slug
                className="glass p-4 rounded-xl hover:shadow-lg transition-all hover:-translate-y-1 group"
              >
                <div className="aspect-[3/4] bg-surface-variant rounded-lg mb-4 flex items-center justify-center relative overflow-hidden">
                  {book.thumbnail ? (
                    <img 
                        src={book.thumbnail} 
                        alt={book.name} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-6xl text-on-surface/20 group-hover:text-primary/50 transition-colors">
                      auto_stories
                    </span>
                  )}
                  
                  {/* Progress Bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-200">
                    <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(book.completedPages / book.totalPages) * 100}%` }}
                    />
                  </div>
                </div>
                
                <h3 className="font-bold text-lg mb-1 truncate">{book.name}</h3>
                <div className="flex justify-between text-sm text-on-surface/60">
                    <span>{book.category}</span>
                    <span>{book.completedPages} / {book.totalPages} דפים</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  )
}