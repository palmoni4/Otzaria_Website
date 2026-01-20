export default function EditorToolbar({
  pageNumber,
  totalPages,
  imageZoom,
  setImageZoom,
  ocrMethod,
  setOcrMethod,
  toggleSelectionMode,
  isSelectionMode,
  isOcrProcessing,
  selectionRect,
  handleOCRSelection,
  setSelectionRect,
  setIsSelectionMode,
  insertTag,
  setShowFindReplace,
  selectedFont,
  setSelectedFont,
  twoColumns,
  toggleColumns,
  layoutOrientation,
  setLayoutOrientation,
  setShowInfoDialog,
  setShowSettings,
  thumbnailUrl,
  isCollapsed,
  setIsCollapsed,
  isFullScreen,
  onToggleFullScreen
}) {
  const preventFocusLoss = (e) => {
    e.preventDefault();
  };

  // תצוגה במצב מקופל - מוצג תמיד (ללא opacity-0)
  if (isCollapsed) {
    return (
      <div 
        className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm h-3 hover:h-6 transition-all duration-200 flex justify-center items-start cursor-pointer group"
        onClick={() => setIsCollapsed(false)}
        title="הצג סרגל כלים"
      >
        <div className="bg-white/90 border-b border-x border-gray-200 rounded-b-md px-8 py-1 flex items-center justify-center shadow-sm">
           <span className="material-symbols-outlined text-sm text-gray-500">expand_more</span>
        </div>
      </div>
    );
  }

  return (
    // שינוי לוגיקה: sticky תמיד. אם מסך מלא - top-0, אחרת top-16 (מתחת להדר)
    <div className={`bg-white border-b border-gray-200 z-30 shadow-sm transition-all sticky ${isFullScreen ? 'top-0' : 'top-[65px]'}`}>
      <div className="container mx-auto px-4 py-1.5">
        <div className="flex items-center justify-between gap-2">
          {/* Left Side - Image Tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(prev => !prev)}
              className="p-1 h-7 w-7 rounded-md transition-colors flex items-center justify-center hover:bg-gray-100 text-gray-700"
              title="הגדרות OCR"
            >
              <span className="material-symbols-outlined text-sm">settings</span>
            </button>

            <div className="w-px h-5 bg-gray-200"></div>
            <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">עמוד {pageNumber} / {totalPages}</span>
            <div className="w-px h-5 bg-gray-200"></div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0 bg-gray-100 rounded-md p-0.5">
              <button onClick={() => setImageZoom(Math.max(25, imageZoom - 10))} className="w-7 h-7 hover:bg-white rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">zoom_out</span>
              </button>
              <span className="text-[10px] font-medium min-w-[2rem] text-center text-gray-700">{imageZoom}%</span>
              <button onClick={() => setImageZoom(Math.min(300, imageZoom + 10))} className="w-7 h-7 hover:bg-white rounded flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">zoom_in</span>
              </button>
              <button onClick={() => setImageZoom(100)} className="w-9 h-7 hover:bg-white rounded text-[10px] font-medium flex items-center justify-center">
                100%
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200"></div>

            {/* OCR Method Selector */}
            <div className="flex items-center gap-0 bg-gray-100 rounded-md p-0.5">
              <button 
                onClick={() => setOcrMethod('ocrwin')} 
                className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 h-7 ${ocrMethod === 'ocrwin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                title="כלי החיתוך של ווינדוס"
              >
                <span className="material-symbols-outlined text-sm">content_cut</span>
                <span className="hidden sm:inline">Win</span>
              </button>
              <button onClick={() => setOcrMethod('tesseract')} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 h-7 ${ocrMethod === 'tesseract' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <span className="material-symbols-outlined text-sm">text_fields</span>
                <span className="hidden sm:inline">OCR</span>
              </button>
              <button onClick={() => setOcrMethod('gemini')} className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 h-7 ${ocrMethod === 'gemini' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="w-3 h-3" />
                <span className="hidden sm:inline">Gemini</span>
              </button>
            </div>

            <button
              onClick={toggleSelectionMode}
              disabled={isOcrProcessing || !thumbnailUrl}
              className={`w-7 h-7 rounded-md border flex items-center justify-center ${isSelectionMode ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'} disabled:opacity-40`}
              title="זיהוי טקסט מאזור נבחר"
            >
              <span className={`material-symbols-outlined text-sm ${isOcrProcessing ? 'animate-spin' : ''}`}>
                {isOcrProcessing ? 'progress_activity' : 'document_scanner'}
              </span>
            </button>

            {selectionRect && (
              <>
                <button onClick={handleOCRSelection} disabled={isOcrProcessing} className="flex items-center gap-1.5 px-2 py-1 h-7 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span className="text-[10px] font-medium">זהה</span>
                </button>
                <button onClick={() => { setSelectionRect(null); setIsSelectionMode(false); }} className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </>
            )}

            <div className="w-px h-5 bg-gray-200"></div>
            <a href="https://aistudio.google.com/prompts/new_chat?model=gemini-3-pro-preview" target="_blank" rel="noopener noreferrer" className="w-7 h-7 hover:bg-gray-100 rounded-md flex items-center justify-center">
              <img src="https://www.gstatic.com/lamda/images/bard_sparkle_v2_advanced.svg" alt="Gemini" className="w-4 h-4" />
            </a>
          </div>

          {/* Right Side - Text Tools */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            <div className="flex items-center gap-0 bg-gray-100 rounded-md p-0.5">
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('b')} 
                className="w-7 h-7 hover:bg-white rounded flex items-center justify-center" 
                title="מודגש"
              >
                <span className="font-bold text-xs">B</span>
              </button>
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('i')} 
                className="w-7 h-7 hover:bg-white rounded flex items-center justify-center" 
                title="נטוי"
              >
                <span className="italic text-xs">I</span>
              </button>
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('u')} 
                className="w-7 h-7 hover:bg-white rounded flex items-center justify-center" 
                title="קו תחתון"
              >
                <span className="underline text-xs">U</span>
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200"></div>

            <div className="flex items-center gap-0 bg-gray-100 rounded-md p-0.5">
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('big')} 
                className="w-7 h-7 hover:bg-white rounded flex items-center justify-center text-xs font-medium"
              >
                A+
              </button>
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('small')} 
                className="w-7 h-7 hover:bg-white rounded flex items-center justify-center text-[10px] font-medium"
              >
                A-
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200"></div>

            <div className="flex items-center gap-0 bg-gray-100 rounded-md p-0.5">
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('h1')} 
                className="px-2 h-7 hover:bg-white rounded text-[10px] font-bold flex items-center justify-center"
              >
                H1
              </button>
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('h2')} 
                className="px-2 h-7 hover:bg-white rounded text-[10px] font-bold flex items-center justify-center"
              >
                H2
              </button>
              <button 
                onMouseDown={preventFocusLoss}
                onClick={() => insertTag('h3')} 
                className="px-2 h-7 hover:bg-white rounded text-[10px] font-bold flex items-center justify-center"
              >
                H3
              </button>
            </div>

            <div className="w-px h-5 bg-gray-200"></div>

            <button onClick={() => setShowFindReplace(true)} className="flex items-center gap-1 px-2 py-1 h-7 bg-white hover:bg-gray-50 rounded-md border border-gray-200">
              <span className="material-symbols-outlined text-sm">find_replace</span>
              <span className="text-[10px] font-medium">חיפוש</span>
            </button>

            <div className="w-px h-5 bg-gray-200"></div>

            <div className="relative">
              <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className="appearance-none pl-2 pr-6 h-7 bg-white border border-gray-200 rounded-md text-[10px] font-medium focus:outline-none hover:bg-gray-50 cursor-pointer w-24">
                <option value="monospace">Monospace</option>
                <option value="Arial">Arial</option>
                <option value="'Times New Roman'">Times New Roman</option>
                <option value="'Courier New'">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>
              <span className="material-symbols-outlined text-sm absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">expand_more</span>
            </div>

            <div className="w-px h-5 bg-gray-200"></div>

            <button onClick={toggleColumns} className="w-7 h-7 hover:bg-gray-100 rounded-md flex items-center justify-center" title={twoColumns ? 'איחוד לטור אחד' : 'פיצול לשני טורים'}>
              <span className="material-symbols-outlined text-sm" style={{ transform: 'rotate(90deg)' }}>{twoColumns ? 'unfold_less' : 'unfold_more'}</span>
            </button>

            <button onClick={() => {
              const newOrientation = layoutOrientation === 'vertical' ? 'horizontal' : 'vertical'
              setLayoutOrientation(newOrientation)
              localStorage.setItem('layoutOrientation', newOrientation)
            }} className="w-7 h-7 hover:bg-gray-100 rounded-md flex items-center justify-center" title={layoutOrientation === 'vertical' ? 'פריסה אנכית' : 'פריסה אופקית'}>
              <span className="material-symbols-outlined text-sm" style={{ transform: layoutOrientation === 'horizontal' ? 'rotate(90deg)' : 'none' }}>splitscreen</span>
            </button>

            <div className="w-px h-5 bg-gray-200"></div>

            <button onClick={() => setShowInfoDialog(true)} className="w-7 h-7 hover:bg-blue-50 text-blue-600 rounded-md flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">info</span>
            </button>

            <div className="w-px h-5 bg-gray-200"></div>

            {/* כפתור מסך מלא בסרגל */}
            <button 
                onClick={onToggleFullScreen}
                className="w-7 h-7 hover:bg-gray-100 text-gray-600 rounded-md flex items-center justify-center"
                title={isFullScreen ? "צא ממסך מלא" : "מסך מלא"}
            >
              <span className="material-symbols-outlined text-sm">
                {isFullScreen ? 'close_fullscreen' : 'fullscreen'}
              </span>
            </button>

            {/* כפתור קיפול סרגל */}
            <button 
                onClick={() => setIsCollapsed(true)} 
                className="w-7 h-7 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-md flex items-center justify-center mr-1"
                title="קפל סרגל כלים"
            >
              <span className="material-symbols-outlined text-sm">expand_less</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}