'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { useSession } from 'next-auth/react'

export default function BookViewPage() {
  const { id } = useParams() // זה ה-Slug
  const router = useRouter()
  const { data: session } = useSession()
  
  const [book, setBook] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/book/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBook(data.book)
          setPages(data.pages)
        } else {
          alert('שגיאה בטעינת הספר')
          router.push('/library/books')
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleClaimPage = async (pageNumber) => {
    if (!session) {
        router.push('/library/auth/login');
        return;
    }

    try {
        const res = await fetch('/api/book/claim-page', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                bookPath: id, // Slug
                pageNumber,
                userId: session.user.id
            })
        });
        const data = await res.json();
        
        if (data.success) {
            router.push(`/library/edit/${id}/${pageNumber}`);
        } else {
            alert(data.error);
        }
    } catch (error) {
        console.error(error);
        alert('שגיאה בתפיסת עמוד');
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">טוען...</div>
  if (!book) return null

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="bg-surface border-b border-surface-variant sticky top-16 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'FrankRuehl, serif' }}>
                {book.name}
            </h1>
            <div className="text-sm text-on-surface/70">
                סה"כ עמודים: {book.totalPages}
            </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            {pages.map(page => {
                const isMyPage = page.claimedBy === session?.user?.name;
                const statusColor = 
                    page.status === 'completed' ? 'bg-green-100 border-green-300' :
                    page.status === 'in-progress' ? (isMyPage ? 'bg-blue-100 border-blue-300' : 'bg-yellow-100 border-yellow-300') :
                    'bg-white border-surface-variant hover:border-primary';

                return (
                    <div key={page.number} className={`border-2 rounded-lg p-2 flex flex-col gap-2 transition-all ${statusColor}`}>
                        <div className="relative aspect-[3/4] bg-gray-100 rounded overflow-hidden group cursor-pointer"
                             onClick={() => window.open(page.thumbnail, '_blank')}>
                            {/* תצוגה מקדימה של התמונה */}
                            <img 
                                src={page.thumbnail} 
                                alt={`עמוד ${page.number}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 text-white drop-shadow-lg">visibility</span>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-center px-1">
                            <span className="font-bold text-sm">#{page.number}</span>
                            {page.status === 'completed' && <span className="material-symbols-outlined text-green-600 text-sm">check_circle</span>}
                            {page.status === 'in-progress' && <span className="material-symbols-outlined text-blue-600 text-sm">edit</span>}
                        </div>

                        {page.status === 'available' && (
                            <button 
                                onClick={() => handleClaimPage(page.number)}
                                className="w-full py-1 bg-primary text-on-primary text-xs rounded hover:bg-accent transition-colors"
                            >
                                ערוך
                            </button>
                        )}
                        
                        {page.status === 'in-progress' && isMyPage && (
                            <Link 
                                href={`/library/edit/${id}/${page.number}`}
                                className="w-full py-1 bg-blue-600 text-white text-center text-xs rounded hover:bg-blue-700 transition-colors"
                            >
                                המשך
                            </Link>
                        )}

                        {page.status === 'in-progress' && !isMyPage && (
                            <div className="text-xs text-center text-gray-500 truncate" title={page.claimedBy}>
                                בטיפול: {page.claimedBy}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
      </main>
    </div>
  )
}