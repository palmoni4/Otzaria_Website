import { forwardRef } from 'react'

const TextEditor = forwardRef(({
  content,
  leftColumn,
  rightColumn,
  twoColumns,
  rightColumnName,
  leftColumnName,
  handleAutoSave,
  handleColumnChange,
  setActiveTextarea,
  selectedFont,
  columnWidth,
  onColumnResizeStart
}, ref) => {
  return (
    <div
      ref={ref}
      className="flex flex-col overflow-auto p-4 editor-container text-editor-container"
      style={{ flex: 1 }}
      onWheel={(e) => e.stopPropagation()}
    >
      {twoColumns ? (
        <div className="flex flex-row h-full gap-0">
          <div 
            className="flex flex-col h-full" 
            style={{ width: `${columnWidth}%` }}
          >
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="material-symbols-outlined text-primary text-sm">article</span>
              <span className="text-sm font-bold text-on-surface">{rightColumnName}</span>
            </div>
            <textarea
              data-column="right"
              value={rightColumn}
              onChange={(e) => handleColumnChange('right', e.target.value)}
              onFocus={() => setActiveTextarea('right')}
              placeholder={`טקסט ${rightColumnName}...`}
              style={{ fontFamily: selectedFont }}
              className="flex-1 p-4 bg-white border-2 border-surface-variant rounded-lg resize-none focus:outline-none focus:border-primary transition-colors text-lg leading-relaxed"
              dir="rtl"
            />
          </div>

          <div
            className="w-2 hover:bg-primary/30 cursor-col-resize flex-shrink-0 transition-colors mx-1 rounded-full"
            onMouseDown={onColumnResizeStart}
          />

          <div className="flex flex-col h-full flex-1">
            <div className="flex items-center gap-2 mb-2 px-2">
              <span className="material-symbols-outlined text-primary text-sm">article</span>
              <span className="text-sm font-bold text-on-surface">{leftColumnName}</span>
            </div>
            <textarea
              data-column="left"
              value={leftColumn}
              onChange={(e) => handleColumnChange('left', e.target.value)}
              onFocus={() => setActiveTextarea('left')}
              placeholder={`טקסט ${leftColumnName}...`}
              style={{ fontFamily: selectedFont }}
              className="flex-1 p-4 bg-white border-2 border-surface-variant rounded-lg resize-none focus:outline-none focus:border-primary transition-colors text-lg leading-relaxed"
              dir="rtl"
            />
          </div>
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => handleAutoSave(e.target.value)}
          onFocus={() => setActiveTextarea(null)}
          placeholder="התחל להקליד את הטקסט מהעמוד כאן..."
          style={{ fontFamily: selectedFont }}
          className="w-full h-full p-4 bg-white border-2 border-surface-variant rounded-lg resize-none focus:outline-none focus:border-primary transition-colors text-lg leading-relaxed"
          dir="rtl"
        />
      )}
    </div>
  )
})

TextEditor.displayName = 'TextEditor'
export default TextEditor
