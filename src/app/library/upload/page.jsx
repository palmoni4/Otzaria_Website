// src/app/library/upload/page.jsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

export default function UploadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [file, setFile] = useState(null)
  const [bookName, setBookName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  if (status === 'unauthenticated') {
    router.push('/library/auth/login')
    return null
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      // מציע שם ספר לפי שם הקובץ
      if (!bookName) {
        setBookName(selectedFile.name.replace('.txt', ''))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file || !bookName) return

    setLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('bookName', bookName)

    try {
      // שימוש ב-API החדש של ה-Rewrite
      const res = await fetch('/api/upload-book', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'הספר הועלה בהצלחה! הוא יופיע ברשימה לאחר אישור מנהל.' })
        setFile(null)
        setBookName('')
      } else {
        setMessage({ type: 'error', text: data.error || 'שגיאה בהעלאה' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'שגיאת תקשורת' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'FrankRuehl, serif' }}>
              העלאת ספר חדש
            </h1>
            <p className="text-on-surface/70">
              תרום לקהילה על ידי העלאת טקסטים של ספרי קודש (קבצי TXT בלבד)
            </p>
          </div>

          <div className="glass p-8 rounded-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2">שם הספר</label>
                <input
                  type="text"
                  value={bookName}
                  onChange={(e) => setBookName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-surface-variant bg-surface focus:ring-2 focus:ring-primary outline-none"
                  placeholder="לדוגמה: מסילת ישרים"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">קובץ טקסט (TXT)</label>
                <div className="border-2 border-dashed border-surface-variant rounded-lg p-8 text-center hover:bg-surface/50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  {file ? (
                    <div className="text-primary font-bold flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">description</span>
                      {file.name}
                    </div>
                  ) : (
                    <div className="text-on-surface/60">
                      <span className="material-symbols-outlined text-4xl mb-2">upload_file</span>
                      <p>גרור קובץ לכאן או לחץ לבחירה</p>
                    </div>
                  )}
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !file}
                className="w-full py-3 bg-primary text-on-primary rounded-lg font-bold hover:bg-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <span className="material-symbols-outlined animate-spin">progress_activity</span>}
                {loading ? 'מעלה...' : 'העלה ספר'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}