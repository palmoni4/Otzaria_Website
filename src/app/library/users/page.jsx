// src/app/library/users/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { getAvatarColor, getInitial } from '@/lib/avatar-colors'

export default function UsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // הגנה בסיסית - הפניה אם לא מחובר
    if (status === 'unauthenticated') {
      router.push('/library/auth/login')
      return
    }
    
    // אם המשתמש מחובר (בין אם אדמין ובין אם לא), טען את הרשימה
    // (ה-API יחליט איזה מידע להחזיר בהתאם להרשאות)
    if (status === 'authenticated') {
      loadUsers()
    }
  }, [status, router])

  const loadUsers = async () => {
    try {
      setLoading(true)
      // בפרויקט החדש ה-API נמצא בנתיב הזה
      const response = await fetch('/api/admin/users')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users)
      } else {
        // במקרה שאין הרשאת אדמין, ה-API עלול להחזיר שגיאה או רשימה ריקה
        setError(data.error || 'לא ניתן לטעון משתמשים')
      }
    } catch (err) {
      console.error(err)
      setError('שגיאה בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      const data = await res.json()
      
      if (data.success) {
        setUsers(users.filter(u => u._id !== userId))
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('שגיאה במחיקה')
    }
  }

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      const data = await res.json()
      
      if (data.success) {
        loadUsers() // רענון הנתונים
      }
    } catch (err) {
      alert('שגיאה בעדכון')
    }
  }

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">טוען...</div>
  }

  const isAdmin = session?.user?.role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-on-surface" style={{ fontFamily: 'FrankRuehl, serif' }}>
          משתמשים רשומים
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {users.map(user => (
            <div key={user._id} className="glass p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: getAvatarColor(user.name) }}
                >
                  {getInitial(user.name)}
                </div>
                <div>
                  <h3 className="font-bold">{user.name}</h3>
                  <p className="text-sm text-on-surface/60">{user.email}</p>
                  <div className="text-xs text-primary mt-1">
                    נקודות: {user.points || 0} | תפקיד: {user.role}
                  </div>
                </div>
              </div>

              {isAdmin && session?.user?.id !== user._id && (
                <div className="flex items-center gap-2">
                  <select 
                    value={user.role}
                    onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                    className="bg-surface border border-surface-variant rounded px-2 py-1 text-sm"
                  >
                    <option value="user">משתמש</option>
                    <option value="admin">מנהל</option>
                  </select>
                  
                  <button 
                    onClick={() => handleDelete(user._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="מחק משתמש"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}