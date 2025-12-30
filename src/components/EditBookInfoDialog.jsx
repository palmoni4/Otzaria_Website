'use client'

import { useState, useEffect } from 'react'

export default function EditBookInfoDialog({ book, onClose, onSave }) {
  const [title, setTitle] = useState('הנחיות עריכה')
  const [sections, setSections] = useState([
    { title: 'כללי', items: [''] }
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (book?.editingInfo) {
      setTitle(book.editingInfo.title || 'הנחיות עריכה')
      setSections(book.editingInfo.sections || [{ title: 'כללי', items: [''] }])
    }
  }, [book])

  const addSection = () => {
    setSections([...sections, { title: '', items: [''] }])
  }

  const removeSection = (index) => {
    setSections(sections.filter((_, i) => i !== index))
  }

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
          bookPath: book.path || book.name,
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

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-3xl">edit_note</span>
            <span>עריכת מידע - {book.name}</span>
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </div>

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
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="לדוגמה: הנחיות עריכה - תלמוד"
            />
          </div>

          {/* סעיפים */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-900">
                סעיפים
              </label>
              <button
                onClick={addSection}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>הוסף סעיף</span>
              </button>
            </div>

            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="כותרת הסעיף (לדוגמה: כללי, תיוג, שמירה)"
                    />
                    <button
                      onClick={() => removeSection(sectionIndex)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחק סעיף"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-gray-400">arrow_left</span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateItem(sectionIndex, itemIndex, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                          placeholder="הנחיה..."
                        />
                        <button
                          onClick={() => removeItem(sectionIndex, itemIndex)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="מחק הנחיה"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addItem(sectionIndex)}
                      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                <span>שומר...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                <span>שמור</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
