'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { getAvatarColor, getInitial } from '@/lib/avatar-colors'
import { useState, useEffect } from 'react'

export default function Header() {
  const { data: session } = useSession()
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      loadUnreadCount()
      // רענן כל 30 שניות
      const interval = setInterval(loadUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [session])

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/messages/list')
      const result = await response.json()
      if (result.success) {
        const unread = result.messages.filter(m => m.status === 'unread').length
        setUnreadMessages(unread)
      }
    } catch (error) {
      console.error('Error loading unread messages:', error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full glass-strong">
      <div className="container mx-auto flex h-16 items-center justify-between px-8">
        <Link href="/library" className="flex items-center gap-3 hover:opacity-80 transition-opacity mr-4">
          <Image src="/logo.png" alt="לוגו אוצריא" width={32} height={32} />
          <span className="text-xl font-bold text-black" style={{ fontFamily: 'FrankRuehl, serif' }}>ספריית אוצריא</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-on-surface hover:text-primary transition-colors font-medium">
            אוצריא
          </Link>
          <Link href="/library/books" className="text-on-surface hover:text-primary transition-colors">
            ספרייה
          </Link>
          <Link href="/library/users" className="text-on-surface hover:text-primary transition-colors">
            משתמשים
          </Link>
          <Link href="/library/upload" className="text-on-surface hover:text-primary transition-colors">
            שליחת ספרים
          </Link>
          
          {session ? (
            <div className="flex items-center gap-4">
              {session.user.role === 'admin' && (
                <Link href="/library/admin" className="flex items-center gap-2 text-accent hover:text-accent/80 transition-colors relative">
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <span>ניהול</span>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-2 -left-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              )}
              <Link 
                href="/library/dashboard" 
                className="flex items-center justify-center hover:opacity-80 transition-opacity"
                title={session.user.name}
              >
                <div 
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-base shadow-md hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: getAvatarColor(session.user.name) }}
                >
                  {getInitial(session.user.name)}
                </div>
              </Link>
              <button 
                onClick={() => signOut({ callbackUrl: '/library' })}
                className="flex items-center gap-2 px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary-container transition-colors"
              >
                <span className="material-symbols-outlined">logout</span>
                <span>התנתק</span>
              </button>
            </div>
          ) : (
            <Link href="/library/auth/login" className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors">
              <span className="material-symbols-outlined">login</span>
              <span>התחבר</span>
            </Link>
          )}
        </nav>
        
        <button className="md:hidden text-on-surface">
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>
    </header>
  )
}
