export default function FindReplaceDialog({
  isOpen,
  onClose,
  findText,
  setFindText,
  replaceText,
  setReplaceText,
  handleFindReplace
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="flex flex-col bg-white glass-strong rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-surface-variant flex-shrink-0">
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">find_replace</span>
            <span>חיפוש והחלפה</span>
          </h2>
          <button onClick={onClose} className="text-on-surface/50 hover:text-on-surface hover:bg-surface-variant p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl block">close</span>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">חפש:</label>
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-surface-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              dir="rtl"
              autoFocus
              placeholder="הזן טקסט לחיפוש..."
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-on-surface mb-2">החלף ב:</label>
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-surface-variant rounded-lg focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              dir="rtl"
              placeholder="הזן טקסט להחלפה..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={() => handleFindReplace(false)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent font-bold transition-all hover:-translate-y-0.5 shadow-sm">
              <span className="material-symbols-outlined text-sm">find_replace</span>
              <span>החלף ראשון</span>
            </button>
            <button onClick={() => handleFindReplace(true)} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-all hover:-translate-y-0.5 shadow-sm">
              <span className="material-symbols-outlined text-sm">published_with_changes</span>
              <span>החלף הכל</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}