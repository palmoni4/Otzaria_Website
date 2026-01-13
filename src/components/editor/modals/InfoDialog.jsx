export default function InfoDialog({ isOpen, onClose, editingInstructions }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="flex flex-col bg-white glass-strong rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-variant flex-shrink-0 bg-white/50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-3xl">info</span>
            <span>{editingInstructions.title}</span>
          </h2>
          <button 
            onClick={onClose} 
            className="text-on-surface/50 hover:text-on-surface hover:bg-surface-variant p-2 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-2xl block">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="space-y-6">
            {editingInstructions.sections.map((section, idx) => (
              <div key={idx} className="bg-surface/50 border border-surface-variant rounded-xl p-5">
                <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2 border-b border-surface-variant/50 pb-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  {section.title}
                </h3>
                <ul className="space-y-3">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx} className="flex items-start gap-3 text-on-surface/90">
                      <span className="material-symbols-outlined text-sm text-primary mt-1 flex-shrink-0">arrow_left</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t border-surface-variant bg-surface/30 flex-shrink-0 rounded-b-2xl">
          <button 
            onClick={onClose} 
            className="w-full py-3 bg-primary text-on-primary rounded-lg hover:bg-accent font-bold transition-all hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">check</span>
            הבנתי, בואו נתחיל!
          </button>
        </div>
      </div>
    </div>
  )
}