'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import AddBookDialog from '@/components/AddBookDialog'
import EditBookInfoDialog from '@/components/EditBookInfoDialog'

export default function AdminClient({ session }) {
    const [users, setUsers] = useState([])
    const [books, setBooks] = useState([])
    const [uploads, setUploads] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('users')
    const [editingUser, setEditingUser] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [showAddBook, setShowAddBook] = useState(false)
    const [pages, setPages] = useState([])
    const [pagesFilter, setPagesFilter] = useState({ status: '', book: '', userId: '' })
    const [editingPage, setEditingPage] = useState(null)
    const [messages, setMessages] = useState([])
    const [selectedMessage, setSelectedMessage] = useState(null)
    const [replyText, setReplyText] = useState('')
    const [showSendMessageDialog, setShowSendMessageDialog] = useState(false)
    const [newMessageRecipient, setNewMessageRecipient] = useState('all')
    const [newMessageSubject, setNewMessageSubject] = useState('')
    const [newMessageText, setNewMessageText] = useState('')
    const [sendingNewMessage, setSendingNewMessage] = useState(false)
    const [editingBookInfo, setEditingBookInfo] = useState(null)

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (activeTab === 'pages') {
            loadPages()
        } else if (activeTab === 'messages') {
            loadMessages()
        }
    }, [activeTab, pagesFilter])

    const loadData = async (retryCount = 0) => {
        try {
            setLoading(true)
            console.log('📊 Loading admin data...')

            const [usersRes, booksRes, uploadsRes] = await Promise.all([
                fetch('/api/users/list'),
                fetch('/api/library/list'),
                fetch('/api/admin/uploads/list')
            ])

            const usersData = await usersRes.json()
            const booksData = await booksRes.json()
            const uploadsData = await uploadsRes.json()

            console.log('📚 Books response:', booksData)
            console.log('👥 Users response:', usersData)
            console.log('📤 Uploads response:', uploadsData)

            if (usersData.success) setUsers(usersData.users)
            if (booksData.success) {
                console.log(`✅ Setting ${booksData.books.length} books`)
                setBooks(booksData.books)

                // אם אין ספרים ועדיין לא ניסינו retry, נסה שוב
                if (booksData.books.length === 0 && retryCount < 2) {
                    console.log(`🔄 No books found, retrying (${retryCount + 1}/2)...`)
                    setLoading(false)
                    setTimeout(() => loadData(retryCount + 1), 1500)
                    return
                }
            } else {
                console.error('❌ Books API failed:', booksData.error)
            }
            if (uploadsData.success) setUploads(uploadsData.uploads)
        } catch (error) {
            console.error('❌ Error loading data:', error)

            // אם יש שגיאה ועדיין לא ניסינו retry, נסה שוב
            if (retryCount < 2) {
                console.log(`🔄 Error occurred, retrying (${retryCount + 1}/2)...`)
                setLoading(false)
                setTimeout(() => loadData(retryCount + 1), 1500)
                return
            }
        } finally {
            setLoading(false)
        }
    }

    const loadPages = async () => {
        try {
            const params = new URLSearchParams()
            if (pagesFilter.status) params.append('status', pagesFilter.status)
            if (pagesFilter.book) params.append('book', pagesFilter.book)
            if (pagesFilter.userId) params.append('userId', pagesFilter.userId)

            const response = await fetch(`/api/admin/pages/list?${params}`)
            const data = await response.json()

            if (data.success) {
                setPages(data.pages)
            }
        } catch (error) {
            console.error('Error loading pages:', error)
        }
    }

    const loadMessages = async () => {
        try {
            const response = await fetch('/api/messages/list')
            const data = await response.json()

            if (data.success) {
                setMessages(data.messages)
            }
        } catch (error) {
            console.error('Error loading messages:', error)
        }
    }

    const handleReplyToMessage = async (messageId) => {
        if (!replyText.trim()) {
            alert('נא להזין תגובה')
            return
        }

        try {
            const response = await fetch('/api/messages/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, reply: replyText })
            })

            const result = await response.json()
            if (result.success) {
                alert('התגובה נשלחה בהצלחה!')
                setReplyText('')
                loadMessages()
                setSelectedMessage(null)
            } else {
                alert(result.error || 'שגיאה בשליחת תגובה')
            }
        } catch (error) {
            console.error('Error replying to message:', error)
            alert('שגיאה בשליחת תגובה')
        }
    }

    const handleMarkAsRead = async (messageId) => {
        try {
            const response = await fetch('/api/messages/mark-read', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            })

            const result = await response.json()
            if (result.success) {
                loadMessages()
            }
        } catch (error) {
            console.error('Error marking message as read:', error)
        }
    }

    const handleDeleteMessage = async (messageId) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את ההודעה?')) {
            return
        }

        try {
            const response = await fetch('/api/messages/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId })
            })

            const result = await response.json()
            if (result.success) {
                alert('ההודעה נמחקה בהצלחה')
                loadMessages()
            } else {
                alert(result.error || 'שגיאה במחיקת הודעה')
            }
        } catch (error) {
            console.error('Error deleting message:', error)
            alert('שגיאה במחיקת הודעה')
        }
    }

    const handleSendNewMessage = async () => {
        if (!newMessageSubject.trim() || !newMessageText.trim()) {
            alert('נא למלא את כל השדות')
            return
        }

        try {
            setSendingNewMessage(true)
            const response = await fetch('/api/messages/send-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipientId: newMessageRecipient === 'all' ? null : newMessageRecipient,
                    subject: newMessageSubject,
                    message: newMessageText,
                    sendToAll: newMessageRecipient === 'all'
                })
            })

            const result = await response.json()
            if (result.success) {
                alert(result.message)
                setNewMessageSubject('')
                setNewMessageText('')
                setNewMessageRecipient('all')
                setShowSendMessageDialog(false)
                loadMessages()
            } else {
                alert(result.error || 'שגיאה בשליחת הודעה')
            }
        } catch (error) {
            console.error('Error sending message:', error)
            alert('שגיאה בשליחת הודעה')
        } finally {
            setSendingNewMessage(false)
        }
    }

    const handleUpdatePage = async (bookName, pageNumber, updates) => {
        try {
            const response = await fetch('/api/admin/pages/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookName, pageNumber, updates })
            })

            const result = await response.json()
            if (result.success) {
                loadPages()
                setEditingPage(null)
                alert('העמוד עודכן בהצלחה!')
            } else {
                alert(result.error || 'שגיאה בעדכון עמוד')
            }
        } catch (error) {
            console.error('Error updating page:', error)
            alert('שגיאה בעדכון עמוד')
        }
    }

    const handleDeleteUser = async (userId) => {
        try {
            const response = await fetch('/api/admin/users/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            })

            const result = await response.json()
            if (result.success) {
                setUsers(users.filter(u => u.id !== userId))
                setDeleteConfirm(null)
            } else {
                alert(result.error || 'שגיאה במחיקת משתמש')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            alert('שגיאה במחיקת משתמש')
        }
    }

    const handleUpdateUser = async (userId, updates) => {
        try {
            // וודא שנקודות הן מספר
            const cleanUpdates = { ...updates }
            if (cleanUpdates.points !== undefined) {
                cleanUpdates.points = parseInt(cleanUpdates.points) || 0
            }

            const response = await fetch('/api/admin/users/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, updates: cleanUpdates })
            })

            const result = await response.json()
            if (result.success) {
                // עדכן את המשתמש עם הנתונים שחזרו מהשרת
                setUsers(users.map(u => u.id === userId ? result.user : u))
                setEditingUser(null)
                alert('המשתמש עודכן בהצלחה!')
            } else {
                alert(result.error || 'שגיאה בעדכון משתמש')
            }
        } catch (error) {
            console.error('Error updating user:', error)
            alert('שגיאה בעדכון משתמש')
        }
    }

    const handleDeleteBook = async (bookPath) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את הספר? פעולה זו אינה הפיכה!')) {
            return
        }

        try {
            const response = await fetch('/api/admin/books/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookPath })
            })

            const result = await response.json()
            if (result.success) {
                // עדכן את הרשימה מיד
                setBooks(books.filter(b => b.path !== bookPath && b.name !== bookPath && b.id !== bookPath))

                // רענן גם את הנתונים מהשרת
                const booksRes = await fetch('/api/library/list?refresh=true')
                const booksData = await booksRes.json()
                if (booksData.success) {
                    setBooks(booksData.books)
                }

                alert('הספר נמחק בהצלחה!')
            } else {
                alert(result.error || 'שגיאה במחיקת ספר')
            }
        } catch (error) {
            console.error('Error deleting book:', error)
            alert('שגיאה במחיקת ספר')
        }
    }

    const handleUpdateUploadStatus = async (uploadId, status) => {
        try {
            const response = await fetch('/api/admin/uploads/update-status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uploadId, status })
            })

            const result = await response.json()
            if (result.success) {
                setUploads(uploads.map(u => u.id === uploadId ? { ...u, status } : u))
                alert(`ההעלאה ${status === 'approved' ? 'אושרה' : 'נדחתה'} בהצלחה!`)
            } else {
                alert(result.error || 'שגיאה בעדכון סטטוס')
            }
        } catch (error) {
            console.error('Error updating upload status:', error)
            alert('שגיאה בעדכון סטטוס')
        }
    }

    const handleApproveAllPending = async () => {
        const pendingUploads = uploads.filter(u => u.status === 'pending')

        if (pendingUploads.length === 0) {
            alert('אין העלאות ממתינות לאישור')
            return
        }

        if (!confirm(`האם אתה בטוח שברצונך לאשר ${pendingUploads.length} העלאות?`)) {
            return
        }

        try {
            let successCount = 0
            let failCount = 0

            for (const upload of pendingUploads) {
                try {
                    const response = await fetch('/api/admin/uploads/update-status', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ uploadId: upload.id, status: 'approved' })
                    })

                    const result = await response.json()
                    if (result.success) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (error) {
                    console.error('Error approving upload:', upload.id, error)
                    failCount++
                }
            }

            // רענן את הרשימה
            const uploadsRes = await fetch('/api/admin/uploads/list')
            const uploadsData = await uploadsRes.json()
            if (uploadsData.success) {
                setUploads(uploadsData.uploads)
            }

            alert(`אושרו ${successCount} העלאות בהצלחה!${failCount > 0 ? ` (${failCount} נכשלו)` : ''}`)
        } catch (error) {
            console.error('Error approving all uploads:', error)
            alert('שגיאה באישור ההעלאות')
        }
    }

    const handleDownloadAllPending = async () => {
        const pendingUploads = uploads.filter(u => u.status === 'pending' && u.fileName)

        if (pendingUploads.length === 0) {
            alert('אין קבצים להורדה')
            return
        }

        if (!confirm(`האם אתה בטוח שברצונך להוריד ${pendingUploads.length} קבצים?`)) {
            return
        }

        try {
            let successCount = 0
            let failCount = 0

            for (const upload of pendingUploads) {
                try {
                    // יצירת קישור להורדה
                    const link = document.createElement('a')
                    link.href = `/api/download/${upload.fileName}`
                    link.download = upload.originalFileName || upload.fileName
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)

                    successCount++

                    // המתנה קצרה בין הורדות כדי לא להציף את הדפדפן
                    await new Promise(resolve => setTimeout(resolve, 300))
                } catch (error) {
                    console.error('Error downloading file:', upload.fileName, error)
                    failCount++
                }
            }

            alert(`הורדו ${successCount} קבצים בהצלחה!${failCount > 0 ? ` (${failCount} נכשלו)` : ''}`)
        } catch (error) {
            console.error('Error downloading all files:', error)
            alert('שגיאה בהורדת הקבצים')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-6xl text-primary">
                    progress_activity
                </span>
            </div>
        )
    }

    const totalPages = books.reduce((sum, book) => sum + (book.totalPages || 0), 0)
    const completedPages = books.reduce((sum, book) => sum + (book.completedPages || 0), 0)
    const totalPoints = users.reduce((sum, user) => sum + (user.points || 0), 0)

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Header />

            <main className="flex-1">
                <div className="container mx-auto px-4 py-12">
                    <div className="max-w-7xl mx-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-4xl font-bold text-on-surface flex items-center gap-3">
                                    <span className="material-symbols-outlined text-5xl text-accent">
                                        admin_panel_settings
                                    </span>
                                    פאנל ניהול
                                </h1>
                                <p className="text-on-surface/60 mt-2">ניהול מלא של המערכת</p>
                            </div>
                            <div className="flex gap-3">
                                {session.user.name === 'admin' && (
                                    <a
                                        href="/api/admin/export-backup"
                                        download
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                        title="הורד גיבוי מלא (רק למשתמש admin)"
                                    >
                                        <span className="material-symbols-outlined">download</span>
                                        <span>גיבוי מלא</span>
                                    </a>
                                )}
                                <Link
                                    href="/library/dashboard"
                                    className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-surface-variant transition-colors"
                                >
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                    <span>חזרה לדשבורד</span>
                                </Link>
                            </div>
                        </div>

                        {/* Stats Overview */}
                        <div className="grid md:grid-cols-5 gap-4 mb-8">
                            <div className="glass p-6 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-blue-600">
                                        group
                                    </span>
                                    <div>
                                        <p className="text-3xl font-bold text-on-surface">{users.length}</p>
                                        <p className="text-on-surface/70 text-sm">משתמשים</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-green-600">
                                        menu_book
                                    </span>
                                    <div>
                                        <p className="text-3xl font-bold text-on-surface">{books.length}</p>
                                        <p className="text-on-surface/70 text-sm">ספרים</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-purple-600">
                                        description
                                    </span>
                                    <div>
                                        <p className="text-3xl font-bold text-on-surface">{totalPages}</p>
                                        <p className="text-on-surface/70 text-sm">עמודים</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-yellow-600">
                                        star
                                    </span>
                                    <div>
                                        <p className="text-3xl font-bold text-on-surface">{totalPoints.toLocaleString()}</p>
                                        <p className="text-on-surface/70 text-sm">נקודות</p>
                                    </div>
                                </div>
                            </div>

                            <div className="glass p-6 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-4xl text-orange-600">
                                        upload_file
                                    </span>
                                    <div>
                                        <p className="text-3xl font-bold text-on-surface">{uploads?.length || 0}</p>
                                        <p className="text-on-surface/70 text-sm">העלאות</p>
                                        {uploads?.filter(u => u.status === 'pending').length > 0 && (
                                            <p className="text-xs text-orange-600 font-bold">
                                                {uploads.filter(u => u.status === 'pending').length} ממתינות
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'users'
                                    ? 'bg-primary text-on-primary'
                                    : 'glass text-on-surface hover:bg-surface-variant'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">group</span>
                                    משתמשים
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('books')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'books'
                                    ? 'bg-primary text-on-primary'
                                    : 'glass text-on-surface hover:bg-surface-variant'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">menu_book</span>
                                    ספרים
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('uploads')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'uploads'
                                    ? 'bg-primary text-on-primary'
                                    : 'glass text-on-surface hover:bg-surface-variant'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">upload_file</span>
                                    העלאות ({uploads?.filter(u => u.status === 'pending').length || 0})
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('pages')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'pages'
                                    ? 'bg-primary text-on-primary'
                                    : 'glass text-on-surface hover:bg-surface-variant'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">description</span>
                                    עמודים
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'stats'
                                    ? 'bg-primary text-on-primary'
                                    : 'glass text-on-surface hover:bg-surface-variant'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">analytics</span>
                                    סטטיסטיקות
                                </span>
                            </button>
                            <button
                                onClick={() => setActiveTab('messages')}
                                className={`px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'messages'
                                    ? 'bg-primary text-on-primary'
                                    : 'glass text-on-surface hover:bg-surface-variant'
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    <span className="material-symbols-outlined">mail</span>
                                    הודעות ({messages.filter(m => m.status === 'unread').length})
                                </span>
                            </button>
                        </div>

                        {/* Content */}
                        {activeTab === 'users' && (
                            <div className="glass-strong p-6 rounded-xl">
                                <h2 className="text-2xl font-bold mb-6 text-on-surface">ניהול משתמשים</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-surface-variant">
                                                <th className="text-right p-4 text-on-surface">שם</th>
                                                <th className="text-right p-4 text-on-surface">אימייל</th>
                                                <th className="text-right p-4 text-on-surface">תפקיד</th>
                                                <th className="text-right p-4 text-on-surface">נקודות</th>
                                                <th className="text-right p-4 text-on-surface">עמודים</th>
                                                <th className="text-right p-4 text-on-surface">תאריך הצטרפות</th>
                                                <th className="text-right p-4 text-on-surface">פעולות</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map(user => (
                                                <tr key={user.id} className="border-b border-surface-variant/50 hover:bg-surface-variant/30">
                                                    <td className="p-4">
                                                        {editingUser?.id === user.id ? (
                                                            <input
                                                                type="text"
                                                                value={editingUser.name}
                                                                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                                                className="px-2 py-1 border rounded bg-background text-on-surface"
                                                            />
                                                        ) : (
                                                            <span className="font-medium text-on-surface">{user.name}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-on-surface/70">{user.email}</td>
                                                    <td className="p-4">
                                                        {editingUser?.id === user.id ? (
                                                            <select
                                                                value={editingUser.role}
                                                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                                                className="px-2 py-1 border rounded bg-background text-on-surface"
                                                            >
                                                                <option value="user">משתמש</option>
                                                                <option value="admin">מנהל</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`px-3 py-1 rounded-full text-sm ${user.role === 'admin'
                                                                ? 'bg-accent/20 text-accent'
                                                                : 'bg-primary/20 text-primary'
                                                                }`}>
                                                                {user.role === 'admin' ? 'מנהל' : 'משתמש'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        {editingUser?.id === user.id ? (
                                                            <input
                                                                type="number"
                                                                value={editingUser.points || 0}
                                                                onChange={(e) => setEditingUser({ ...editingUser, points: parseInt(e.target.value) || 0 })}
                                                                className="px-2 py-1 border rounded bg-background text-on-surface w-24"
                                                                min="0"
                                                            />
                                                        ) : (
                                                            <span className="text-on-surface font-bold">{user.points?.toLocaleString() || 0}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-on-surface">{user.completedPages || 0}</td>
                                                    <td className="p-4 text-on-surface/70 text-sm">
                                                        {new Date(user.createdAt).toLocaleDateString('he-IL')}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            {editingUser?.id === user.id ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdateUser(user.id, {
                                                                            name: editingUser.name,
                                                                            role: editingUser.role,
                                                                            points: editingUser.points
                                                                        })}
                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                                                                        title="שמור"
                                                                    >
                                                                        <span className="material-symbols-outlined">check</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingUser(null)}
                                                                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                                                                        title="ביטול"
                                                                    >
                                                                        <span className="material-symbols-outlined">close</span>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => setEditingUser(user)}
                                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                                        title="ערוך"
                                                                    >
                                                                        <span className="material-symbols-outlined">edit</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteConfirm(user.id)}
                                                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                                                        title="מחק"
                                                                        disabled={user.id === session.user.id}
                                                                    >
                                                                        <span className="material-symbols-outlined">delete</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'books' && (
                            <div className="glass-strong p-6 rounded-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-on-surface">ניהול ספרים</h2>
                                    <button
                                        onClick={() => setShowAddBook(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <span className="material-symbols-outlined">add</span>
                                        <span>הוסף ספר</span>
                                    </button>
                                </div>
                                {books.length === 0 ? (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-6xl text-on-surface/30 mb-4">
                                            menu_book
                                        </span>
                                        <p className="text-on-surface/60">אין ספרים במערכת</p>
                                        <button
                                            onClick={() => {
                                                console.log('🔄 Reloading books...')
                                                loadData()
                                            }}
                                            className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
                                        >
                                            רענן
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {books.map(book => (
                                            <div key={book.path} className="glass p-4 rounded-lg">
                                                <div className="flex items-start gap-3">
                                                    {book.thumbnail && (
                                                        <Image
                                                            src={book.thumbnail}
                                                            alt={book.name}
                                                            width={60}
                                                            height={80}
                                                            className="rounded object-cover"
                                                        />
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-on-surface mb-1 truncate">{book.name}</h3>
                                                        <p className="text-sm text-on-surface/60 mb-2">
                                                            {book.completedPages || 0} / {book.totalPages || 0} עמודים
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <Link
                                                                href={`/book/${book.path}`}
                                                                className="text-sm text-primary hover:text-accent"
                                                            >
                                                                צפה
                                                            </Link>
                                                            <button
                                                                onClick={() => setEditingBookInfo(book)}
                                                                className="text-sm text-blue-600 hover:text-blue-800"
                                                            >
                                                                הוסף מידע
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteBook(book.path)}
                                                                className="text-sm text-red-600 hover:text-red-800"
                                                            >
                                                                מחק
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'uploads' && (
                            <div className="glass-strong p-6 rounded-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-on-surface">העלאות משתמשים</h2>
                                    <div className="flex gap-3">
                                        {uploads?.filter(u => u.status === 'pending' && u.fileName).length > 0 && (
                                            <button
                                                onClick={handleDownloadAllPending}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                <span className="material-symbols-outlined">download</span>
                                                <span>הורד הכל ({uploads.filter(u => u.status === 'pending' && u.fileName).length})</span>
                                            </button>
                                        )}
                                        {uploads?.filter(u => u.status === 'pending').length > 0 && (
                                            <button
                                                onClick={handleApproveAllPending}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                            >
                                                <span className="material-symbols-outlined">done_all</span>
                                                <span>אשר הכל ({uploads.filter(u => u.status === 'pending').length})</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {!uploads || uploads.length === 0 ? (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-6xl text-on-surface/30 mb-4">
                                            upload_file
                                        </span>
                                        <p className="text-on-surface/60">אין העלאות עדיין</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {uploads.map(upload => (
                                            <div key={upload.id} className="glass p-6 rounded-lg">
                                                <div className="flex items-start gap-4">
                                                    <span className="material-symbols-outlined text-5xl text-primary">
                                                        description
                                                    </span>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div>
                                                                <h3 className="text-xl font-bold text-on-surface mb-1">
                                                                    {upload.bookName}
                                                                </h3>
                                                                <p className="text-sm text-on-surface/60">
                                                                    הועלה על ידי: <span className="font-medium">{upload.uploadedBy}</span>
                                                                </p>
                                                            </div>
                                                            <span className={`px-4 py-2 rounded-full text-sm font-bold ${upload.status === 'approved'
                                                                ? 'bg-green-100 text-green-800'
                                                                : upload.status === 'rejected'
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {upload.status === 'approved' ? '✓ אושר' : upload.status === 'rejected' ? '✗ נדחה' : '⏳ ממתין'}
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                                                            <div>
                                                                <span className="text-on-surface/60">שם קובץ:</span>
                                                                <p className="font-medium text-on-surface">{upload.originalFileName}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-on-surface/60">גודל:</span>
                                                                <p className="font-medium text-on-surface">
                                                                    {(upload.fileSize / 1024).toFixed(2)} KB
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <span className="text-on-surface/60">שורות:</span>
                                                                <p className="font-medium text-on-surface">{upload.lineCount?.toLocaleString()}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-on-surface/60">תאריך:</span>
                                                                <p className="font-medium text-on-surface">
                                                                    {new Date(upload.uploadedAt).toLocaleDateString('he-IL', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        year: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-3 flex-wrap">
                                                            {upload.fileName ? (
                                                                <>
                                                                    <a
                                                                        href={`/api/download/${upload.fileName}`}
                                                                        download={upload.originalFileName}
                                                                        onClick={(e) => {
                                                                            // בדוק אם הקובץ קיים
                                                                            fetch(`/api/download/${upload.fileName}`)
                                                                                .then(res => {
                                                                                    if (!res.ok) {
                                                                                        e.preventDefault()
                                                                                        alert('הקובץ לא נמצא במערכת. ייתכן שהוא הועלה לפני המעבר ל-MongoDB.')
                                                                                    }
                                                                                })
                                                                                .catch(() => {
                                                                                    e.preventDefault()
                                                                                    alert('שגיאה בגישה לקובץ')
                                                                                })
                                                                        }}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined">download</span>
                                                                        <span>הורד קובץ</span>
                                                                    </a>
                                                                    <span className="text-xs text-on-surface/60">
                                                                        {upload.fileName}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-sm text-red-600 px-4 py-2 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined">error</span>
                                                                    <span>שם קובץ חסר במטא-דאטה</span>
                                                                </span>
                                                            )}
                                                            {upload.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdateUploadStatus(upload.id, 'approved')}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined">check_circle</span>
                                                                        <span>אשר</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleUpdateUploadStatus(upload.id, 'rejected')}
                                                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                                    >
                                                                        <span className="material-symbols-outlined">cancel</span>
                                                                        <span>דחה</span>
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'pages' && (
                            <div className="glass-strong p-6 rounded-xl">
                                <h2 className="text-2xl font-bold mb-6 text-on-surface">ניהול עמודים</h2>

                                {/* Filters */}
                                <div className="grid md:grid-cols-3 gap-4 mb-6">
                                    <select
                                        value={pagesFilter.status}
                                        onChange={(e) => setPagesFilter({ ...pagesFilter, status: e.target.value })}
                                        className="px-4 py-2 border border-surface-variant rounded-lg bg-white text-on-surface"
                                    >
                                        <option value="">כל הסטטוסים</option>
                                        <option value="available">זמין</option>
                                        <option value="in-progress">בטיפול</option>
                                        <option value="completed">הושלם</option>
                                    </select>

                                    <select
                                        value={pagesFilter.book}
                                        onChange={(e) => setPagesFilter({ ...pagesFilter, book: e.target.value })}
                                        className="px-4 py-2 border border-surface-variant rounded-lg bg-white text-on-surface"
                                    >
                                        <option value="">כל הספרים</option>
                                        {books.map(book => (
                                            <option key={book.id} value={book.name}>{book.name}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={pagesFilter.userId}
                                        onChange={(e) => setPagesFilter({ ...pagesFilter, userId: e.target.value })}
                                        className="px-4 py-2 border border-surface-variant rounded-lg bg-white text-on-surface"
                                    >
                                        <option value="">כל המשתמשים</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Pages Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-surface-variant">
                                                <th className="text-right p-4 text-on-surface">ספר</th>
                                                <th className="text-right p-4 text-on-surface">עמוד</th>
                                                <th className="text-right p-4 text-on-surface">סטטוס</th>
                                                <th className="text-right p-4 text-on-surface">משתמש</th>
                                                <th className="text-right p-4 text-on-surface">תאריך</th>
                                                <th className="text-right p-4 text-on-surface">פעולות</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {pages.map(page => (
                                                <tr key={`${page.bookName}-${page.number}`} className="border-b border-surface-variant/50 hover:bg-surface-variant/30">
                                                    <td className="p-4 text-on-surface">{page.bookName}</td>
                                                    <td className="p-4 text-on-surface font-bold">{page.number}</td>
                                                    <td className="p-4">
                                                        {editingPage?.bookName === page.bookName && editingPage?.number === page.number ? (
                                                            <select
                                                                value={editingPage.status}
                                                                onChange={(e) => setEditingPage({ ...editingPage, status: e.target.value })}
                                                                className="px-2 py-1 border rounded bg-background text-on-surface"
                                                            >
                                                                <option value="available">זמין</option>
                                                                <option value="in-progress">בטיפול</option>
                                                                <option value="completed">הושלם</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`px-3 py-1 rounded-full text-sm ${page.status === 'completed'
                                                                ? 'bg-green-100 text-green-800'
                                                                : page.status === 'in-progress'
                                                                    ? 'bg-blue-100 text-blue-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {page.status === 'completed' ? 'הושלם' : page.status === 'in-progress' ? 'בטיפול' : 'זמין'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-4 text-on-surface">{page.claimedBy || '-'}</td>
                                                    <td className="p-4 text-on-surface/70 text-sm">
                                                        {page.completedAt
                                                            ? new Date(page.completedAt).toLocaleDateString('he-IL')
                                                            : page.claimedAt
                                                                ? new Date(page.claimedAt).toLocaleDateString('he-IL')
                                                                : '-'
                                                        }
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            {editingPage?.bookName === page.bookName && editingPage?.number === page.number ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleUpdatePage(page.bookName, page.number, { status: editingPage.status })}
                                                                        className="p-2 text-green-600 hover:bg-green-50 rounded"
                                                                        title="שמור"
                                                                    >
                                                                        <span className="material-symbols-outlined">check</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingPage(null)}
                                                                        className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                                                                        title="ביטול"
                                                                    >
                                                                        <span className="material-symbols-outlined">close</span>
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => setEditingPage(page)}
                                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                                                                        title="ערוך"
                                                                    >
                                                                        <span className="material-symbols-outlined">edit</span>
                                                                    </button>
                                                                    {page.status !== 'available' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (confirm('האם לשחרר את העמוד?')) {
                                                                                    handleUpdatePage(page.bookName, page.number, { status: 'available' })
                                                                                }
                                                                            }}
                                                                            className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                                                                            title="שחרר עמוד"
                                                                        >
                                                                            <span className="material-symbols-outlined">lock_open</span>
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {pages.length === 0 && (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-6xl text-on-surface/30 mb-4">
                                            description
                                        </span>
                                        <p className="text-on-surface/60">אין עמודים להצגה</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'messages' && (
                            <div className="glass-strong p-6 rounded-xl">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-2xl font-bold text-on-surface">הודעות משתמשים</h2>
                                    <button
                                        onClick={() => setShowSendMessageDialog(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <span className="material-symbols-outlined">send</span>
                                        <span>שלח הודעה חדשה</span>
                                    </button>
                                </div>
                                {messages.length === 0 ? (
                                    <div className="text-center py-12">
                                        <span className="material-symbols-outlined text-6xl text-on-surface/30 mb-4">
                                            mail
                                        </span>
                                        <p className="text-on-surface/60">אין הודעות עדיין</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {messages.map(message => (
                                            <div key={message.id} className={`glass p-6 rounded-lg ${message.status === 'unread' ? 'border-2 border-primary' : ''}`}>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="text-xl font-bold text-on-surface">{message.subject}</h3>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${message.status === 'unread'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : message.status === 'replied'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {message.status === 'unread' ? 'חדש' : message.status === 'replied' ? 'נענה' : 'נקרא'}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-on-surface/60 mb-3">
                                                            מאת: <span className="font-medium">{message.senderName}</span> ({message.senderEmail})
                                                            <span className="mx-2">•</span>
                                                            {new Date(message.createdAt).toLocaleDateString('he-IL', {
                                                                day: 'numeric',
                                                                month: 'short',
                                                                year: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </p>
                                                        <p className="text-on-surface whitespace-pre-wrap">{message.message}</p>
                                                    </div>
                                                </div>

                                                {/* Replies */}
                                                {message.replies && message.replies.length > 0 && (
                                                    <div className="mt-4 mr-8 space-y-3">
                                                        <h4 className="font-bold text-on-surface">תגובות:</h4>
                                                        {message.replies.map((reply, idx) => (
                                                            <div key={idx} className="bg-surface p-4 rounded-lg">
                                                                <p className="text-sm text-on-surface/60 mb-2">
                                                                    <span className="font-medium">{reply.senderName}</span>
                                                                    <span className="mx-2">•</span>
                                                                    {new Date(reply.createdAt).toLocaleDateString('he-IL', {
                                                                        day: 'numeric',
                                                                        month: 'short',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </p>
                                                                <p className="text-on-surface whitespace-pre-wrap">{reply.message}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reply Form */}
                                                {selectedMessage === message.id ? (
                                                    <div className="mt-4 mr-8">
                                                        <textarea
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            placeholder="כתוב תגובה..."
                                                            className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface mb-3"
                                                            rows="4"
                                                        />
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={() => handleReplyToMessage(message.id)}
                                                                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined">send</span>
                                                                <span>שלח תגובה</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedMessage(null)
                                                                    setReplyText('')
                                                                }}
                                                                className="px-4 py-2 glass rounded-lg hover:bg-surface-variant transition-colors"
                                                            >
                                                                ביטול
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-3 mt-4">
                                                        <button
                                                            onClick={() => setSelectedMessage(message.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined">reply</span>
                                                            <span>השב</span>
                                                        </button>
                                                        {message.status === 'unread' && (
                                                            <button
                                                                onClick={() => handleMarkAsRead(message.id)}
                                                                className="flex items-center gap-2 px-4 py-2 glass rounded-lg hover:bg-surface-variant transition-colors"
                                                            >
                                                                <span className="material-symbols-outlined">mark_email_read</span>
                                                                <span>סמן כנקרא</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteMessage(message.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                            <span>מחק</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div className="space-y-6">
                                <div className="glass-strong p-6 rounded-xl">
                                    <h2 className="text-2xl font-bold mb-6 text-on-surface">סטטיסטיקות כלליות</h2>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-4 bg-surface rounded-lg">
                                            <span className="text-on-surface">אחוז השלמת עמודים</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-surface rounded-lg">
                                            <span className="text-on-surface">ממוצע נקודות למשתמש</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {users.length > 0 ? Math.round(totalPoints / users.length) : 0}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-surface rounded-lg">
                                            <span className="text-on-surface">ממוצע עמודים לספר</span>
                                            <span className="text-2xl font-bold text-primary">
                                                {books.length > 0 ? Math.round(totalPages / books.length) : 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="glass-strong p-6 rounded-xl">
                                    <h2 className="text-2xl font-bold mb-6 text-on-surface">משתמשים מובילים</h2>
                                    <div className="space-y-3">
                                        {users
                                            .sort((a, b) => (b.points || 0) - (a.points || 0))
                                            .slice(0, 10)
                                            .map((user, index) => (
                                                <div key={user.id} className="flex items-center gap-4 p-3 bg-surface rounded-lg">
                                                    <span className="text-2xl font-bold text-primary w-8">{index + 1}</span>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-on-surface">{user.name}</p>
                                                        <p className="text-sm text-on-surface/60">{user.completedPages || 0} עמודים</p>
                                                    </div>
                                                    <span className="text-xl font-bold text-primary">
                                                        {user.points?.toLocaleString() || 0}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="glass-strong p-8 rounded-2xl max-w-md mx-4">
                        <h3 className="text-2xl font-bold mb-4 text-on-surface">אישור מחיקה</h3>
                        <p className="text-on-surface/70 mb-6">
                            האם אתה בטוח שברצונך למחוק את המשתמש? פעולה זו אינה הפיכה!
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDeleteUser(deleteConfirm)}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                                מחק
                            </button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-3 glass rounded-lg hover:bg-surface-variant"
                            >
                                ביטול
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Book Modal - New Component */}
            <AddBookDialog
                isOpen={showAddBook}
                onClose={() => setShowAddBook(false)}
                onBookAdded={() => loadData()}
            />

            {/* Edit Book Info Dialog */}
            {editingBookInfo && (
                <EditBookInfoDialog
                    book={editingBookInfo}
                    onClose={() => setEditingBookInfo(null)}
                    onSave={() => loadData()}
                />
            )}

            {/* Send Message Dialog */}
            {showSendMessageDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="glass-strong p-8 rounded-2xl max-w-2xl w-full">
                        <h3 className="text-2xl font-bold mb-6 text-on-surface flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-primary">send</span>
                            שלח הודעה למשתמשים
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">נמען</label>
                                <select
                                    value={newMessageRecipient}
                                    onChange={(e) => setNewMessageRecipient(e.target.value)}
                                    className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface"
                                    disabled={sendingNewMessage}
                                >
                                    <option value="all">כל המשתמשים</option>
                                    {users.filter(u => u.role !== 'admin').map(user => (
                                        <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">נושא</label>
                                <input
                                    type="text"
                                    value={newMessageSubject}
                                    onChange={(e) => setNewMessageSubject(e.target.value)}
                                    placeholder="נושא ההודעה..."
                                    className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface"
                                    disabled={sendingNewMessage}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-on-surface mb-2">הודעה</label>
                                <textarea
                                    value={newMessageText}
                                    onChange={(e) => setNewMessageText(e.target.value)}
                                    placeholder="כתוב את ההודעה שלך כאן..."
                                    className="w-full px-4 py-3 border border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface"
                                    rows="8"
                                    disabled={sendingNewMessage}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleSendNewMessage}
                                disabled={sendingNewMessage}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <span className="material-symbols-outlined">send</span>
                                <span>{sendingNewMessage ? 'שולח...' : 'שלח הודעה'}</span>
                            </button>
                            <button
                                onClick={() => {
                                    setShowSendMessageDialog(false)
                                    setNewMessageSubject('')
                                    setNewMessageText('')
                                    setNewMessageRecipient('all')
                                }}
                                disabled={sendingNewMessage}
                                className="px-6 py-3 glass rounded-lg hover:bg-surface-variant transition-colors disabled:opacity-50"
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
