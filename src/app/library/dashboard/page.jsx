'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Header from '@/components/Header'
import ChangePasswordForm from '@/components/ChangePasswordForm'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    myPages: 0,
    completedPages: 0,
    inProgressPages: 0,
    points: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)
  const [showMessageForm, setShowMessageForm] = useState(false)
  const [messageSubject, setMessageSubject] = useState('')
  const [messageText, setMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [myMessages, setMyMessages] = useState([])
  const [showMyMessages, setShowMyMessages] = useState(false)
  const [replyingToMessageId, setReplyingToMessageId] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [notice, setNotice] = useState(null)
  const noticeTimeoutRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/library/auth/login')
    } else if (status === 'authenticated') {
      loadUserStats()
      loadMyMessages()
    }
  }, [status, router])

  const loadUserStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/stats')
      const result = await response.json()
      
      if (result.success) {
        setStats({
          myPages: result.stats?.myPages || 0,
          completedPages: result.stats?.completedPages || 0,
          inProgressPages: result.stats?.inProgressPages || 0,
          points: result.stats?.points || 0,
          recentActivity: result.stats?.recentActivity || []
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMyMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      const result = await response.json()
      
      if (result.success) {
        setMyMessages(result.messages)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const showNoticeWithTimeout = (type, text, duration = 5000) => {
    setNotice({ type, text })

    if (noticeTimeoutRef.current) {
      clearTimeout(noticeTimeoutRef.current)
      noticeTimeoutRef.current = null
    }

    if (duration) {
      noticeTimeoutRef.current = setTimeout(() => {
        setNotice(null)
        noticeTimeoutRef.current = null
      }, duration)
    }
  }

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        clearTimeout(noticeTimeoutRef.current)
      }
    }
  }, [])

  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageText.trim()) {
      showNoticeWithTimeout('error', 'נא למלא את כל השדות')
      return
    }

    try {
      setSendingMessage(true)
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: messageSubject,
          content: messageText,
          recipientId: null // null מסמן הודעה למנהלים
        })
      })

      const result = await response.json()
      if (result.success) {
        showNoticeWithTimeout('success', 'ההודעה נשלחה בהצלחה למנהלים')
        setMessageSubject('')
        setMessageText('')
        setShowMessageForm(false)
        loadMyMessages()
      } else {
        showNoticeWithTimeout('error', result.error || 'שגיאה בשליחת הודעה')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showNoticeWithTimeout('error', 'שגיאה בשליחת הודעה')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSendReply = async (messageId) => {
    if (!replyText.trim()) {
      showNoticeWithTimeout('error', 'נא לכתוב תגובה')
      return
    }

    try {
      setSendingReply(true)
      const response = await fetch('/api/messages/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, reply: replyText })
      })

      const result = await response.json()
      if (result.success) {
        showNoticeWithTimeout('success', 'התגובה נשלחה בהצלחה')
        setReplyText('')
        setReplyingToMessageId(null)
        loadMyMessages()
      } else {
        showNoticeWithTimeout('error', result.error || 'שגיאה בשליחת התגובה')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      showNoticeWithTimeout('error', 'שגיאה בשליחת התגובה')
    } finally {
      setSendingReply(false)
    }
  }

  const getReplySenderDisplayName = (reply) => {
    const currentUserId = session?.user?._id || session?.user?.id
    const replySenderId = reply?.sender
    if (currentUserId && replySenderId && String(currentUserId) === String(replySenderId)) {
      return 'אתה'
    }
    if (reply?.senderRole === 'admin') {
      return reply?.senderName || 'מנהל'
    }
    return reply?.senderName || 'משתמש'
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-6xl text-primary">
          progress_activity
        </span>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const isAdmin = session.user.role === 'admin'

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2 text-on-surface">
            שלום, {session.user.name}!
          </h1>
          <p className="text-on-surface/70 mb-8">
            ברוך הבא לאיזור האישי שלך
          </p>

          {notice && (
            <div
              className={`mb-8 p-4 rounded-lg flex items-start justify-between gap-4 ${
                notice.type === 'success'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}
              role={notice.type === 'error' ? 'alert' : 'status'}
            >
              <p className="font-medium">{notice.text}</p>
              <button
                onClick={() => setNotice(null)}
                className="p-1 rounded-lg hover:bg-black/5 transition-colors"
                aria-label="סגור הודעה"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="glass p-6 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-5xl text-blue-600">
                  edit_note
                </span>
                <div>
                  <p className="text-3xl font-bold text-on-surface">
                    {loading ? '...' : stats.inProgressPages}
                  </p>
                  <p className="text-on-surface/70">עמודים בטיפול</p>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-5xl text-green-600">
                  check_circle
                </span>
                <div>
                  <p className="text-3xl font-bold text-on-surface">
                    {loading ? '...' : stats.completedPages}
                  </p>
                  <p className="text-on-surface/70">עמודים שהושלמו</p>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-xl">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-5xl text-primary">
                  description
                </span>
                <div>
                  <p className="text-3xl font-bold text-on-surface">
                    {loading ? '...' : stats.myPages}
                  </p>
                  <p className="text-on-surface/70">סה״כ עמודים שלי</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-strong p-8 rounded-2xl mb-8">
            <h2 className="text-2xl font-bold mb-6 text-on-surface">פעולות מהירות</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/library/books" className="flex flex-col items-center gap-3 p-6 bg-primary-container rounded-xl hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-4xl text-primary">library_books</span>
                <span className="font-medium text-on-surface">הספרייה</span>
              </Link>

              <Link href="/library/upload" className="flex flex-col items-center gap-3 p-6 bg-primary-container rounded-xl hover:bg-primary/20 transition-all">
                <span className="material-symbols-outlined text-4xl text-primary">upload_file</span>
                <span className="font-medium text-on-surface">שליחת ספרים</span>
              </Link>

              <button 
                onClick={() => setShowMessageForm(true)}
                className="flex flex-col items-center gap-3 p-6 bg-primary-container rounded-xl hover:bg-primary/20 transition-all"
              >
                <span className="material-symbols-outlined text-4xl text-primary">mail</span>
                <span className="font-medium text-on-surface">שלח הודעה למנהלים</span>
              </button>

              <button 
                onClick={() => setShowMyMessages(true)}
                className="flex flex-col items-center gap-3 p-6 bg-primary-container rounded-xl hover:bg-primary/20 transition-all relative"
              >
                <span className="material-symbols-outlined text-4xl text-primary">inbox</span>
                <span className="font-medium text-on-surface">ההודעות שלי</span>
                {myMessages.filter(m => m.status === 'replied' && m.senderId === session?.user?.id).length > 0 && (
                  <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                    {myMessages.filter(m => m.status === 'replied' && m.senderId === session?.user?.id).length}
                  </span>
                )}
              </button>

              {isAdmin && (
                <Link href="/library/admin" className="flex flex-col items-center gap-3 p-6 bg-accent/20 rounded-xl hover:bg-accent/30 transition-all">
                  <span className="material-symbols-outlined text-4xl text-accent">admin_panel_settings</span>
                  <span className="font-medium text-on-surface">פאנל ניהול</span>
                </Link>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="glass-strong p-8 rounded-2xl mb-8">
            <h2 className="text-2xl font-bold mb-6 text-on-surface">העמודים שלי</h2>
            {loading ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">
                  progress_activity
                </span>
              </div>
            ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={`${activity.bookName}-${activity.pageNumber}`} className="flex items-center gap-4 p-4 bg-surface rounded-lg">
                    <span className={`material-symbols-outlined ${
                      activity.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {activity.status === 'completed' ? 'check_circle' : 'edit_note'}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-on-surface">
                        {activity.bookName} - עמוד {activity.pageNumber}
                      </p>
                      <p className="text-sm text-on-surface/60">
                        {activity.status === 'completed' ? 'הושלם' : 'בטיפול'} • {activity.date}
                      </p>
                    </div>
                    {activity.bookPath && activity.bookPath !== '#' && activity.pageNumber !== null && activity.pageNumber !== undefined ? (
                      <Link 
                        href={`/library/edit/${encodeURIComponent(activity.bookPath)}/${activity.pageNumber}`}
                        className="text-primary hover:text-accent"
                      >
                        <span className="material-symbols-outlined">arrow_back</span>
                      </Link>
                    ) : (
                      <span className="text-on-surface/30 cursor-not-allowed" title="לא ניתן לפתוח עמוד זה (ספר חסר)">
                        <span className="material-symbols-outlined">arrow_back</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-6xl text-on-surface/20 mb-4 block">
                  description
                </span>
                <p className="text-on-surface/60">עדיין לא תפסת עמודים לעריכה</p>
                <Link 
                  href="/library/books"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
                >
                  <span className="material-symbols-outlined">library_books</span>
                  <span>עבור לספרייה</span>
                </Link>
              </div>
            )}
          </div>

          {/* Change Password Section */}
          <ChangePasswordForm />
        </div>
      </div>

      {/* My Messages Modal - UPDATED STRUCTURE */}
      {showMyMessages && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowMyMessages(false)}
        >
          <div
            className="flex flex-col bg-white glass-strong rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-surface-variant flex items-center justify-between flex-shrink-0 bg-white/50 rounded-t-2xl">
              <h3 className="text-2xl font-bold text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-primary">inbox</span>
                ההודעות שלי
              </h3>
              <button
                onClick={() => setShowMyMessages(false)}
                className="p-2 hover:bg-surface-variant rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-2xl block text-on-surface">close</span>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {myMessages.length === 0 ? (
                <div className="text-center py-12">
                  <span className="material-symbols-outlined text-6xl text-on-surface/30 mb-4">
                    inbox
                  </span>
                  <p className="text-on-surface/60">אין הודעות עדיין</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myMessages.map(message => (
                    <div key={message.id} className="glass p-6 rounded-lg border border-surface-variant">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-xl font-bold text-on-surface mb-1">{message.subject}</h4>
                          <p className="text-sm text-on-surface/60">
                            {new Date(message.createdAt).toLocaleDateString('he-IL', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          message.status === 'replied' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {message.status === 'replied' ? 'נענה' : 'נשלח'}
                        </span>
                      </div>
                      
                      <p className="text-on-surface whitespace-pre-wrap mb-4">{message.content}</p>

                      {message.replies && message.replies.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-surface-variant">
                          <h5 className="font-bold text-on-surface mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-600">reply</span>
                            תגובות בשרשור:
                          </h5>
                          <div className="space-y-3">
                            {message.replies.map((reply, idx) => (
                              <div
                                key={reply?.id || idx}
                                className={`${reply?.senderRole === 'admin' ? 'bg-green-50 border border-green-100' : 'bg-surface border border-surface-variant'} p-4 rounded-lg`}
                              >
                                <p className="text-sm text-on-surface/60 mb-2">
                                  <span className="font-medium text-primary">{getReplySenderDisplayName(reply)}</span>
                                  <span className="mx-2">•</span>
                                  {new Date(reply.createdAt).toLocaleDateString('he-IL', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="text-on-surface whitespace-pre-wrap">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4">
                        {replyingToMessageId === message.id ? (
                          <div className="animate-in fade-in slide-in-from-top-2">
                            <textarea
                              className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface shadow-inner"
                              placeholder="כתוב תגובה..."
                              rows="4"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              disabled={sendingReply}
                              autoFocus
                            />
                            <div className="flex gap-3 mt-3 justify-end">
                              <button
                                onClick={() => {
                                  setReplyingToMessageId(null)
                                  setReplyText('')
                                }}
                                disabled={sendingReply}
                                className="px-6 py-2 glass rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-50 text-sm"
                              >
                                ביטול
                              </button>
                              <button
                                onClick={() => handleSendReply(message.id)}
                                disabled={sendingReply}
                                className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-sm"
                              >
                                <span className="material-symbols-outlined text-sm">send</span>
                                <span>{sendingReply ? 'שולח...' : 'שלח תגובה'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyingToMessageId(message.id)
                              setReplyText('')
                            }}
                            className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-surface-variant transition-colors text-sm font-medium border border-surface-variant"
                          >
                            <span className="material-symbols-outlined text-lg">reply</span>
                            <span>השב</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message Modal - UPDATED STRUCTURE */}
      {showMessageForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="flex flex-col bg-white glass-strong rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-surface-variant bg-white/50 rounded-t-2xl">
              <h3 className="text-2xl font-bold text-on-surface flex items-center gap-3">
                <span className="material-symbols-outlined text-3xl text-primary">mail</span>
                שלח הודעה למנהלים
              </h3>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">נושא</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="נושא ההודעה..."
                  className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface shadow-sm"
                  disabled={sendingMessage}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">הודעה</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="כתוב את ההודעה שלך כאן..."
                  className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface shadow-sm resize-none"
                  rows="8"
                  disabled={sendingMessage}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-surface-variant bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-md hover:-translate-y-0.5"
              >
                {sendingMessage ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    <span>שולח...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">send</span>
                    <span>שלח הודעה</span>
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowMessageForm(false)
                  setMessageSubject('')
                  setMessageText('')
                }}
                disabled={sendingMessage}
                className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}