'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

// Components
import EditorHeader from '@/components/editor/EditorHeader'
import EditorToolbar from '@/components/editor/EditorToolbar'
import ImagePanel from '@/components/editor/ImagePanel'
import TextEditor from '@/components/editor/TextEditor'
import SettingsSidebar from '@/components/editor/SettingsSidebar'
import FindReplaceDialog from '@/components/editor/modals/FindReplaceDialog'
import SplitDialog from '@/components/editor/modals/SplitDialog'
import InfoDialog from '@/components/editor/modals/InfoDialog'

// Hooks
import { useAutoSave } from '@/hooks/useAutoSave'
import { useOCR } from '@/hooks/useOCR'

export default function EditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookPath = decodeURIComponent(params.bookPath)
  const pageNumber = parseInt(params.pageNumber)

  // Data State
  const [bookData, setBookData] = useState(null)
  const [pageData, setPageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Editor State
  const [content, setContent] = useState('')
  const [leftColumn, setLeftColumn] = useState('')
  const [rightColumn, setRightColumn] = useState('')
  const [twoColumns, setTwoColumns] = useState(false)
  const [activeTextarea, setActiveTextarea] = useState(null)
  const [selectedFont, setSelectedFont] = useState('monospace')
  
  // Layout State
  const [imageZoom, setImageZoom] = useState(100)
  const [layoutOrientation, setLayoutOrientation] = useState('vertical')
  const [imagePanelWidth, setImagePanelWidth] = useState(50)
  const [isResizing, setIsResizing] = useState(false)
  
  // Full Screen & Toolbar State
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false)

  // Split Logic State
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [rightColumnName, setRightColumnName] = useState('חלק 1')
  const [leftColumnName, setLeftColumnName] = useState('חלק 2')
  const [splitMode, setSplitMode] = useState('content')
  const [isContentSplit, setIsContentSplit] = useState(false)

  // Find & Replace State
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')

  // Selection & OCR State
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [selectionRect, setSelectionRect] = useState(null)
  const [ocrMethod, setOcrMethod] = useState('ocrwin')
  const { isProcessing: isOcrProcessing, performGeminiOCR, performTesseractOCR, performOCRWin } = useOCR()

  // Settings State
  const [showSettings, setShowSettings] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [userApiKey, setUserApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash')
  const [customPrompt, setCustomPrompt] = useState('The text is in Hebrew, written in Rashi script...') 

  // Auto Save Hook
  const { save: debouncedSave, status: saveStatus } = useAutoSave()

  // Load Settings
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key')
    const savedPrompt = localStorage.getItem('gemini_prompt')
    const savedModel = localStorage.getItem('gemini_model')
    const savedPanelWidth = localStorage.getItem('imagePanelWidth')
    const savedOrientation = localStorage.getItem('layoutOrientation')
    
    if (savedApiKey) setUserApiKey(savedApiKey)
    if (savedPrompt) setCustomPrompt(savedPrompt)
    if (savedModel) setSelectedModel(savedModel)
    if (savedPanelWidth) setImagePanelWidth(parseFloat(savedPanelWidth))
    if (savedOrientation) setLayoutOrientation(savedOrientation)
  }, [])

  // Full Screen Handler
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsToolbarCollapsed(true) // כיווץ אוטומטי בכניסה למסך מלא
      } else {
        if (document.exitFullscreen) await document.exitFullscreen()
        setIsToolbarCollapsed(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Listener for Full Screen changes (e.g. Esc key)
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullScreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange)
  }, [])

  // Auth & Load Data
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/library/auth/login')
    else if (status === 'authenticated') loadPageData()
  }, [status, bookPath, pageNumber])

  useEffect(() => {
    if (bookData?.name) document.title = `עריכה: ${bookData.name} - עמוד ${pageNumber}`
  }, [bookData, pageNumber])

  const loadPageData = async () => {
    try {
      setLoading(true)
      const bookRes = await fetch(`/api/book-by-name?name=${encodeURIComponent(bookPath)}`)
      const bookResult = await bookRes.json()

      if (bookResult.success) {
        setBookData(bookResult.book)
        setPageData(bookResult.pages.find(p => p.number === pageNumber))
      } else {
        throw new Error(bookResult.error)
      }

      const contentRes = await fetch(`/api/page-content?bookPath=${encodeURIComponent(bookPath)}&pageNumber=${pageNumber}`)
      const contentResult = await contentRes.json()

      if (contentResult.success && contentResult.data) {
        const { data } = contentResult
        setContent(data.content || '')
        setLeftColumn(data.leftColumn || '')
        setRightColumn(data.rightColumn || '')
        setRightColumnName(data.rightColumnName || 'חלק 1')
        setLeftColumnName(data.leftColumnName || 'חלק 2')
        setTwoColumns(data.twoColumns || false)
      }
    } catch (err) {
      setError(err.message || 'שגיאה בטעינה')
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---

  const handleAutoSaveWrapper = (newContent, left = leftColumn, right = rightColumn, two = twoColumns) => {
    debouncedSave({
      bookPath, pageNumber, content: newContent, leftColumn: left, rightColumn: right,
      twoColumns: two, isContentSplit, rightColumnName, leftColumnName
    })
  }

  const handleColumnChange = (column, newText) => {
    if (column === 'left') {
      setLeftColumn(newText)
      handleAutoSaveWrapper(content, newText, rightColumn, twoColumns)
    } else {
      setRightColumn(newText)
      handleAutoSaveWrapper(content, leftColumn, newText, twoColumns)
    }
  }

  const handleResizeStart = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  // Resize Effect
  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e) => {
      const container = document.querySelector('.split-container')
      if (!container) return
      const rect = container.getBoundingClientRect()
      let newSize = layoutOrientation === 'horizontal' 
        ? ((e.clientY - rect.top) / rect.height) * 100 
        : ((rect.right - e.clientX) / rect.width) * 100
      setImagePanelWidth(Math.min(Math.max(newSize, 20), 80))
    }
    const handleMouseUp = () => {
      setIsResizing(false)
      localStorage.setItem('imagePanelWidth', imagePanelWidth.toString())
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, layoutOrientation])

  const toggleColumns = () => {
    if (!twoColumns) setShowSplitDialog(true)
    else {
      const combined = rightColumn + leftColumn
      setContent(combined)
      setTwoColumns(false)
      handleAutoSaveWrapper(combined, leftColumn, rightColumn, false)
    }
  }

  const confirmSplit = () => {
    setRightColumn(content)
    setLeftColumn('')
    setTwoColumns(true)
    setIsContentSplit(splitMode === 'content')
    setShowSplitDialog(false)
    handleAutoSaveWrapper(content, '', content, true)
  }

  const handleFindReplace = (replaceAll = false) => {
    if (!findText) return alert('הזן טקסט לחיפוש');
    
    // פונקציית עזר להמרת ^13 למעבר שורה אמיתי
    const processPattern = (str) => str.replaceAll('^13', '\n');
    
    const pattern = processPattern(findText);
    const replacement = processPattern(replaceText);
    
    let totalOccurrences = 0;

    // פונקציה פנימית לביצוע ההחלפה וספירת המופעים
    const executeReplace = (text) => {
      if (!text || !pattern) return text;
      
      const parts = text.split(pattern);
      const count = parts.length - 1; // מספר הפעמים שהטקסט נמצא
      
      if (count === 0) return text;

      if (replaceAll) {
        totalOccurrences += count;
        return parts.join(replacement);
      } else {
        totalOccurrences += 1;
        return text.replace(pattern, replacement);
      }
    };

    if (twoColumns) {
      const newRight = executeReplace(rightColumn);
      const newLeft = executeReplace(leftColumn);
      
      if (totalOccurrences > 0) {
        setRightColumn(newRight);
        setLeftColumn(newLeft);
        handleAutoSaveWrapper(content, newLeft, newRight, true);
      }
    } else {
      const newContent = executeReplace(content);
      
      if (totalOccurrences > 0) {
        setContent(newContent);
        handleAutoSaveWrapper(newContent, leftColumn, rightColumn, false);
      }
    }

    // הודעת פידבק למשתמש
    if (totalOccurrences > 0) {
      alert(`ההחלפה בוצעה בהצלחה! הוחלפו ${totalOccurrences} מופעים.`);
    } else {
      alert('לא נמצאו תוצאות התואמות לחיפוש.');
    }
  };

  const insertTag = (tag) => {
    let activeEl = document.activeElement;

    if (!activeEl || activeEl.tagName !== 'TEXTAREA') {
        if (activeTextarea === 'left') {
            activeEl = document.querySelector('textarea[data-column="left"]');
        } else if (activeTextarea === 'right') {
            activeEl = document.querySelector('textarea[data-column="right"]');
        } else {
            activeEl = document.querySelector('.editor-container textarea');
        }
    }

    if (!activeEl || activeEl.tagName !== 'TEXTAREA') return;
    
    const start = activeEl.selectionStart;
    const end = activeEl.selectionEnd;
    const text = activeEl.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);
    
    let insertion = `<${tag}>${selected}</${tag}>`
    if (['h1', 'h2', 'h3'].includes(tag)) {
        insertion = `\n<${tag}>${selected}</${tag}>\n`
    }
    
    const newText = before + insertion + after;
    
    const col = activeEl.getAttribute('data-column');
    if (col === 'right') handleColumnChange('right', newText);
    else if (col === 'left') handleColumnChange('left', newText);
    else {
        setContent(newText);
        handleAutoSaveWrapper(newText);
    }
    
    setTimeout(() => {
        activeEl.focus();
        const newCursorPos = start + insertion.length;
        activeEl.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }

  const handleOCR = async () => {
    if (!selectionRect) return alert('בחר אזור')
    
    const response = await fetch(pageData.thumbnail)
    const blob = await response.blob()
    const img = await createImageBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = selectionRect.width
    canvas.height = selectionRect.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height, 0, 0, selectionRect.width, selectionRect.height)
    
    const croppedBlob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.95))
    
    try {
        let text = ''
        if (ocrMethod === 'gemini') {
            text = await performGeminiOCR(croppedBlob, userApiKey, selectedModel, customPrompt)
        } else if (ocrMethod === 'ocrwin') { // הוספת התנאי החדש
            text = await performOCRWin(croppedBlob)
        } else {
            text = await performTesseractOCR(croppedBlob)
        }
        
        if (!text) return alert('לא זוהה טקסט')
        
        if (twoColumns) {
            const newRight = rightColumn + '\n' + text
            setRightColumn(newRight)
            handleAutoSaveWrapper(content, leftColumn, newRight, true)
        } else {
            const newContent = content + '\n' + text
            setContent(newContent)
            handleAutoSaveWrapper(newContent)
        }
        setSelectionRect(null)
        setIsSelectionMode(false)
        alert('OCR הושלם')
    } catch (e) {
        alert('שגיאה ב-OCR: ' + e.message)
    }
  }

  const getInstructions = () => {
      return bookData?.editingInfo || { 
          title: 'הנחיות כלליות', 
          sections: [{ title: 'כללי', items: ['העתק במדויק'] }] 
      }
  }

  if (loading) return <div className="text-center p-20">טוען...</div>
  if (error) return <div className="text-center p-20 text-red-500">{error}</div>

  return (
    // השינוי העיקרי כאן: כשהמסך מלא, אנחנו מוסיפים fixed inset-0 z-50 כדי לכסות את כל המסך ולהסתיר את הפוטר הגלובלי
    <div 
      className={`bg-background flex flex-col overflow-hidden transition-all duration-300 ${
        isFullScreen ? 'fixed inset-0 z-[100] h-screen w-screen' : 'h-[calc(100vh-0px)]' 
      }`}
      style={{ cursor: isResizing ? 'col-resize' : 'default' }}
    >
      
      {/* כותרת עליונה - מוסתרת במסך מלא */}
      {!isFullScreen && (
        <EditorHeader 
          bookName={bookData?.name} 
          pageNumber={pageNumber} 
          bookPath={bookPath} 
          session={session} 
          saveStatus={saveStatus}
          onToggleFullScreen={toggleFullScreen}
        />
      )}
      
      {/* סרגל כלים */}
      <EditorToolbar 
        pageNumber={pageNumber} totalPages={bookData?.totalPages}
        imageZoom={imageZoom} setImageZoom={setImageZoom}
        ocrMethod={ocrMethod} setOcrMethod={setOcrMethod}
        isSelectionMode={isSelectionMode} toggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
        isOcrProcessing={isOcrProcessing} selectionRect={selectionRect}
        handleOCRSelection={handleOCR} setSelectionRect={setSelectionRect}
        setIsSelectionMode={setIsSelectionMode} insertTag={insertTag}
        setShowFindReplace={setShowFindReplace}
        selectedFont={selectedFont} setSelectedFont={setSelectedFont}
        twoColumns={twoColumns} toggleColumns={toggleColumns}
        layoutOrientation={layoutOrientation} setLayoutOrientation={setLayoutOrientation}
        setShowInfoDialog={setShowInfoDialog} setShowSettings={setShowSettings}
        thumbnailUrl={pageData?.thumbnail}
        isCollapsed={isToolbarCollapsed}
        setIsCollapsed={setIsToolbarCollapsed}
        isFullScreen={isFullScreen}
        onToggleFullScreen={toggleFullScreen}
      />

      {/* אזור העריכה המרכזי */}
      {/* הסרנו את ה-bg-black במסך מלא כדי לשמור על צבעים אחידים */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isFullScreen ? 'p-0' : 'p-6'}`}>
        <div className={`flex-1 flex flex-col overflow-hidden ${isFullScreen ? '' : 'glass-strong rounded-xl border border-surface-variant'}`}>
          
          <div className="flex-1 flex overflow-hidden split-container" style={{ flexDirection: layoutOrientation === 'horizontal' ? 'column' : 'row' }}>
            <ImagePanel 
              thumbnailUrl={pageData?.thumbnail} pageNumber={pageNumber}
              imageZoom={imageZoom} isSelectionMode={isSelectionMode}
              selectionStart={selectionStart} selectionEnd={selectionEnd}
              selectionRect={selectionRect}
              setSelectionStart={setSelectionStart} setSelectionEnd={setSelectionEnd}
              setSelectionRect={setSelectionRect}
              layoutOrientation={layoutOrientation} imagePanelWidth={imagePanelWidth}
              isResizing={isResizing} handleResizeStart={handleResizeStart}
            />

            <TextEditor 
              content={content} leftColumn={leftColumn} rightColumn={rightColumn}
              twoColumns={twoColumns} rightColumnName={rightColumnName} leftColumnName={leftColumnName}
              handleAutoSave={(txt) => { setContent(txt); handleAutoSaveWrapper(txt); }}
              handleColumnChange={handleColumnChange}
              setActiveTextarea={setActiveTextarea} selectedFont={selectedFont}
            />
          </div>
          
          {/* כותרת תחתונה של העורך - מוצגת תמיד, כולל במסך מלא */}
          <div className="px-4 py-3 border-t border-surface-variant bg-surface/50 text-sm flex justify-between items-center h-12 flex-shrink-0">
             <div className="flex gap-4">
                {twoColumns ? <span>ימין: {rightColumn.length}, שמאל: {leftColumn.length}</span> : <span>תווים: {content.length}</span>}
             </div>
             <div>
                {saveStatus === 'saved' && <span className="text-green-600 font-medium">נשמר אוטומטית</span>}
                {saveStatus === 'saving' && <span className="text-blue-600 font-medium">שומר...</span>}
                {saveStatus === 'error' && <span className="text-red-600 font-medium">שגיאה בשמירה</span>}
             </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SettingsSidebar 
        show={showSettings} onClose={() => setShowSettings(false)}
        userApiKey={userApiKey} setUserApiKey={setUserApiKey}
        selectedModel={selectedModel} setSelectedModel={setSelectedModel}
        customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
        saveSettings={() => { localStorage.setItem('gemini_api_key', userApiKey); alert('נשמר'); }}
        resetPrompt={() => setCustomPrompt('The text is in Hebrew, written in Rashi script...')}
      />
      
      <FindReplaceDialog 
        isOpen={showFindReplace} onClose={() => setShowFindReplace(false)}
        findText={findText} setFindText={setFindText}
        replaceText={replaceText} setReplaceText={setReplaceText}
        handleFindReplace={handleFindReplace}
      />

      <SplitDialog 
        isOpen={showSplitDialog} onClose={() => setShowSplitDialog(false)}
        splitMode={splitMode} setSplitMode={setSplitMode}
        rightColumnName={rightColumnName} setRightColumnName={setRightColumnName}
        leftColumnName={leftColumnName} setLeftColumnName={setLeftColumnName}
        confirmSplit={confirmSplit}
      />

      <InfoDialog 
        isOpen={showInfoDialog} onClose={() => setShowInfoDialog(false)}
        editingInstructions={getInstructions()}
      />
    </div>
  )
}