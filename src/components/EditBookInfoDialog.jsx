'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function EditBookInfoDialog({ book, onClose, onSave }) {
  const [title, setTitle] = useState('הנחיות עריכה')
  const [sections, setSections] = useState([
    { title: 'כללי', items: [''] }
  ])
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (book?.editingInfo) {
      setTitle(book.editingInfo.title || 'הנחיות עריכה')
      setSections(book.editingInfo.sections || [{ title: 'כללי', items: [''] }])
    }
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'unset' }
  }, [book])

  if (!book || !mounted) return null

  // Helper functions
  const addSection = () => setSections([...sections, { title: '', items: [''] }])
  const removeSection = (index) => setSections(sections.filter((_, i) => i !== index))
  const updateSectionTitle = (index, newTitle) => {
    const newSections = [...sections]
    newSections[index].title = newTitle
    setSections(newSections)
  }
  const addItem = (sectionIndex) => {
    const newSections = [...sections]
    newSections[sectionIndex].items.push('')
    setSections(newSections)
  }
  const removeItem = (sectionIndex, itemIndex) => {
    const newSections = [...sections]
    newSections[sectionIndex].items = newSections[sectionIndex].items.filter((_, i) => i !== itemIndex)
    setSections(newSections)
  }
  const updateItem = (sectionIndex, itemIndex, newValue) => {
    const newSections = [...sections]
    newSections[sectionIndex].items[itemIndex] = newValue
    setSections(newSections)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const editingInfo = {
        title,
        sections: sections.filter(s => s.title && s.items.some(i => i.trim()))
      }

      const response = await fetch('/api/book/update-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id || book._id, 
          editingInfo
        })
      })

      const result = await response.json()

      if (result.success) {
        alert('✅ המידע נשמר בהצלחה!')
        onSave()
        onClose()
      } else {
        alert('❌ שגיאה: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving book info:', error)
      alert('❌ שגיאה בשמירת המידע')
    } finally {
      setSaving(false)
    }
  }

  if (!book) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="flex flex-col bg-white rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh]" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-3xl">edit_note</span>
            <span>עריכת מידע - {book.name}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl block">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="space-y-6">
            {/* כותרת ראשית */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                כותרת ראשית
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="לדוגמה: הנחיות עריכה - תלמוד"
              />
            </div>

            {/* סעיפים */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-900">
                  סעיפים
                </label>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>הוסף סעיף</span>
                </button>
              </div>

              <div className="space-y-4">
                {sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="bg-gray-50 border border-gray-200 rounded-xl p-4 transition-all hover:border-blue-200 hover:shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                        placeholder="כותרת הסעיף (לדוגמה: כללי, תיוג, שמירה)"
                      />
                      <button
                        onClick={() => removeSection(sectionIndex)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="מחק סעיף"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>

                    <div className="space-y-2 pr-4 border-r-2 border-gray-200">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-gray-400">arrow_left</span>
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                            placeholder="הנחיה..."
                          />
                          <button
                            onClick={() => removeItem(sectionIndex, itemIndex)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="מחק הנחיה"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addItem(sectionIndex)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mt-2"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>הוסף הנחיה</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold disabled:opacity-70 shadow-md hover:-translate-y-0.5 transform"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <span>שומר...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                <span>שמור שינויים</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}