'use client'

import { useState, useEffect, useRef } from 'react'
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
  
  const [swapPanels, setSwapPanels] = useState(false)
  const [isOCRBlocking, setIsOCRBlocking] = useState(false)
  const cancelOCRRef = useRef(false)
   
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
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  // Auto Save Hook
  const { save: debouncedSave, status: saveStatus } = useAutoSave()

  // Load Settings
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key')
    const savedPrompt = localStorage.getItem('gemini_prompt')
    const savedModel = localStorage.getItem('gemini_model')
    const savedPanelWidth = localStorage.getItem('imagePanelWidth')
    const savedOrientation = localStorage.getItem('layoutOrientation')
    const savedSwap = localStorage.getItem('swapPanels')
    const savedFont = localStorage.getItem('selectedFont')
    
    if (savedApiKey) setUserApiKey(savedApiKey)
    if (savedPrompt) setCustomPrompt(savedPrompt)
    if (savedModel) setSelectedModel(savedModel)
    if (savedPanelWidth) setImagePanelWidth(parseFloat(savedPanelWidth))
    if (savedOrientation) setLayoutOrientation(savedOrientation)
    if (savedSwap) setSwapPanels(savedSwap === 'true')
    if (savedFont) setSelectedFont(savedFont)
  }, [])

  // Full Screen Handler
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        setIsToolbarCollapsed(true) 
      } else {
        if (document.exitFullscreen) await document.exitFullscreen()
        setIsToolbarCollapsed(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Listener for Full Screen changes
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
      setError(null) // איפוס שגיאות קודמות
      
      // שליפת פרטי הספר (לצורך הכותרת וכו')
      const bookRes = await fetch(`/api/book/${encodeURIComponent(bookPath)}`)
      const bookResult = await bookRes.json()

      if (bookResult.success) {
        setBookData(bookResult.book)
        if (bookResult.pages && bookResult.pages.length > 0) {
           const foundPage = bookResult.pages.find(p => p.number === pageNumber);
           if (foundPage) {
             setPageData(foundPage);
           }
        }
      } else {
        throw new Error(bookResult.error)
      }

      // שליפת תוכן העמוד - כאן תתבצע בדיקת ההרשאות בשרת
      const contentRes = await fetch(`/api/page-content?bookPath=${encodeURIComponent(bookPath)}&pageNumber=${pageNumber}`)
      
      // טיפול ספציפי בשגיאת הרשאות (403)
      if (contentRes.status === 403) {
          const errorData = await contentRes.json();
          throw new Error(errorData.error || 'אין לך הרשאה לערוך דף זה');
      }

      const contentResult = await contentRes.json()

      if (contentResult.success && contentResult.data) {
        const { data } = contentResult
        
        // עדכון נתונים לעורך
        setPageData(prev => ({...prev, ...data})); // מיזוג נתונים
        setContent(data.content || '')
        setLeftColumn(data.leftColumn || '')
        setRightColumn(data.rightColumn || '')
        setRightColumnName(data.rightColumnName || 'חלק 1')
        setLeftColumnName(data.leftColumnName || 'חלק 2')
        setTwoColumns(data.twoColumns || false)
      } else {
          throw new Error(contentResult.error || 'שגיאה בטעינת תוכן העמוד');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'שגיאה בטעינה')
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---

  const handleFontChange = (newFont) => {
    setSelectedFont(newFont)
    localStorage.setItem('selectedFont', newFont)
  }

  const togglePanelOrder = () => {
    const newState = !swapPanels
    setSwapPanels(newState)
    localStorage.setItem('swapPanels', newState.toString())
  }

  const handleRemoveDigits = () => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את כל הספרות (0-9) מהטקסט?')) return;

    const regex = /[0-9]/g; 

    if (twoColumns) {
      const newRight = rightColumn.replace(regex, '');
      const newLeft = leftColumn.replace(regex, '');
      
      setRightColumn(newRight);
      setLeftColumn(newLeft);
      handleAutoSaveWrapper(content, newLeft, newRight, true);
    } else {
      const newContent = content.replace(regex, '');
      setContent(newContent);
      handleAutoSaveWrapper(newContent, leftColumn, rightColumn, false);
    }
  };

  const handleAutoSaveWrapper = (newContent, left = leftColumn, right = rightColumn, two = twoColumns) => {
    debouncedSave({
      bookPath, pageNumber, content: newContent, leftColumn: left, rightColumn: right,
      twoColumns: two, isContentSplit, rightColumnName, leftColumnName
    })
  }

  const handleFinishClick = () => {
    if (!session) return alert('שגיאה: אינך מחובר');
    handleAutoSaveWrapper(content, leftColumn, rightColumn, twoColumns);
    setShowUploadDialog(true);
  }
const completePageLogic = async () => {
    try {
      const safeBookId = bookData?.id || bookData?._id;
      
      const safePageId = pageData?.id || pageData?._id;

      if (!safePageId || !safeBookId) {
        alert('שגיאה: חסר מזהה עמוד או ספר. נסה לרענן את העמוד.');
        return;
      }

      const response = await fetch(`/api/book/complete-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          pageId: safePageId, 
          bookId: safeBookId 
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        router.push(`/library/book/${encodeURIComponent(bookPath)}`);
      } else {
        alert(`❌ שגיאה מהשרת: ${result.error}`);
      }
    } catch (error) {
      console.error('Error completing page:', error);
      alert('❌ שגיאה בסימון העמוד כהושלם');
    }
  };
  const handleUploadConfirm = async () => {
    try {
      let textContent = '';
      if (twoColumns) {
         textContent = `${rightColumnName}:\n${rightColumn}\n\n${leftColumnName}:\n${leftColumn}`;
      } else {
         textContent = content;
      }

      if (!textContent.trim()) {
        alert('❌ העמוד ריק, אין מה להעלות');
        return;
      }

      const cleanBookName = bookPath.replace(/[^a-zA-Z0-9א-ת]/g, '_'); 
      const fileName = `${cleanBookName}_page_${pageNumber}.txt`;

      const blob = new Blob([textContent], { type: 'text/plain' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('bookName', `${bookPath} - עמוד ${pageNumber}`);
      
      const userId = session.user._id || session.user.id;
      formData.append('userId', userId);
      formData.append('userName', session.user.name);

      const response = await fetch('/api/upload-book', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        alert('✅ הטקסט הועלה בהצלחה! מסמן כהושלם.');
        await completePageLogic(); // קריאה לפונקציית הסיום
      } else {
        alert(`❌ שגיאה בהעלאה: ${result.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error uploading text:', error);
      alert('❌ שגיאה בתהליך ההעלאה');
    }
  };

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

  useEffect(() => {
    if (!isResizing) return
    const handleMouseMove = (e) => {
      const container = document.querySelector('.split-container')
      if (!container) return
      const rect = container.getBoundingClientRect()
      
      let newSize 
      if (layoutOrientation === 'horizontal') {
        // בפריסה אופקית (תמונה למעלה/למטה)
        newSize = swapPanels 
          ? ((rect.bottom - e.clientY) / rect.height) * 100 // תמונה למטה: מרחק מהתחתית
          : ((e.clientY - rect.top) / rect.height) * 100    // תמונה למעלה: מרחק מהלמעלה
      } else {
        // בפריסה אנכית (ימין/שמאל) - מותאם ל-RTL
        if (swapPanels) { 
            // פאנל התמונה בצד שמאל (בגלל row-reverse ב-RTL)
            newSize = ((e.clientX - rect.left) / rect.width) * 100
        } else { 
            // פאנל התמונה בצד ימין (ברירת מחדל ב-RTL)
            // החישוב צריך להיות המרחק מהקצה הימני
            newSize = ((rect.right - e.clientX) / rect.width) * 100
        }
      }
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
  }, [isResizing, layoutOrientation, swapPanels])

  const toggleColumns = () => {
    if (!twoColumns) setShowSplitDialog(true)
    else {
      const combined = rightColumn + leftColumn
      setContent(combined)
      setTwoColumns(false)
      handleAutoSaveWrapper(combined, leftColumn, rightColumn, false)
    }
  }

  const handleDownloadImage = async () => {
    if (!pageData?.thumbnail) return alert('אין תמונה להורדה');
    
    try {
      const response = await fetch(pageData.thumbnail);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const cleanBookName = bookData?.name?.replace(/[^a-zA-Z0-9א-ת]/g, '_') || 'book';
      link.download = `${cleanBookName}_page_${pageNumber}.${(blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      window.open(pageData.thumbnail, '_blank');
    }
  };

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
    
    const processPattern = (str) => str.replaceAll('^13', '\n');
    
    const pattern = processPattern(findText);
    const replacement = processPattern(replaceText);
    
    let totalOccurrences = 0;

    const executeReplace = (text) => {
      if (!text || !pattern) return text;
      
      const parts = text.split(pattern);
      const count = parts.length - 1; 
      
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
    
    cancelOCRRef.current = false
    setIsOCRBlocking(true)

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
        
        if (cancelOCRRef.current) return

        if (ocrMethod === 'gemini') {
            text = await performGeminiOCR(croppedBlob, userApiKey, selectedModel, customPrompt)
        } else if (ocrMethod === 'ocrwin') { 
            text = await performOCRWin(croppedBlob)
        } else {
            text = await performTesseractOCR(croppedBlob)
        }
        
        if (cancelOCRRef.current) {
            console.log('OCR process was cancelled by user')
            return
        }

        if (!text) {
             setIsOCRBlocking(false)
             return alert('לא זוהה טקסט')
        }
        
        // עדכון הטקסט
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

    } catch (e) {
        if (!cancelOCRRef.current) {
            alert('שגיאה ב-OCR: ' + e.message)
        }
    } finally {
        setIsOCRBlocking(false)
    }
  }

  const handleCancelOCR = () => {
      cancelOCRRef.current = true
      setIsOCRBlocking(false)
  }

  const getInstructions = () => {
      return bookData?.editingInfo || { 
          title: 'הנחיות כלליות', 
          sections: [{ title: 'כללי', items: ['העתק במדויק'] }] 
      }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined animate-spin text-6xl text-primary mb-4 block">
          progress_activity
        </span>
        <p className="text-on-surface/70">טוען נתונים...</p>
      </div>
    </div>
  )

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center glass-strong p-10 rounded-2xl max-w-lg w-full shadow-xl border border-red-100">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-red-500">
              lock
            </span>
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-3">אין גישה לדף זה</h2>
          <p className="text-on-surface/70 mb-8 text-lg leading-relaxed">{error}</p>
          <div className="flex gap-4 justify-center">
            <Link 
              href={`/library/book/${encodeURIComponent(bookPath)}`}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl hover:bg-accent transition-colors font-medium flex items-center gap-2"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              חזרה לרשימת הדפים
            </Link>
            <Link 
              href="/library/dashboard"
              className="px-6 py-3 bg-surface text-on-surface border border-outline rounded-xl hover:bg-surface-variant transition-colors font-medium"
            >
              האיזור האישי
            </Link>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div 
      className={`bg-background flex flex-col overflow-hidden transition-all duration-300 ${
        isFullScreen ? 'fixed inset-0 z-[100] h-screen w-screen' : 'h-[calc(100vh-0px)]' 
      }`}
      style={{ cursor: isResizing ? 'col-resize' : 'default' }}
    >
      
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
      
      <EditorToolbar 
        pageNumber={pageNumber} totalPages={bookData?.totalPages}
        imageZoom={imageZoom} setImageZoom={setImageZoom}
        ocrMethod={ocrMethod} setOcrMethod={setOcrMethod}
        isSelectionMode={isSelectionMode} toggleSelectionMode={() => setIsSelectionMode(!isSelectionMode)}
        isOcrProcessing={isOcrProcessing} selectionRect={selectionRect}
        handleOCRSelection={handleOCR} setSelectionRect={setSelectionRect}
        setIsSelectionMode={setIsSelectionMode} insertTag={insertTag}
        setShowFindReplace={setShowFindReplace}
        selectedFont={selectedFont} setSelectedFont={handleFontChange}
        twoColumns={twoColumns} toggleColumns={toggleColumns}
        layoutOrientation={layoutOrientation} setLayoutOrientation={setLayoutOrientation}
        swapPanels={swapPanels}
        handleDownloadImage={handleDownloadImage}
        togglePanelOrder={togglePanelOrder}
        handleRemoveDigits={handleRemoveDigits}
        handleFinish={handleFinishClick} // מעבירים את פונקציית פתיחת הדיאלוג
        setShowInfoDialog={setShowInfoDialog} setShowSettings={setShowSettings}
        thumbnailUrl={pageData?.thumbnail}
        isCollapsed={isToolbarCollapsed}
        setIsCollapsed={setIsToolbarCollapsed}
        isFullScreen={isFullScreen}
        onToggleFullScreen={toggleFullScreen}
      />

      <div className={`flex-1 flex flex-col overflow-hidden ${isFullScreen ? 'p-0' : 'p-6'}`}>
        <div className={`flex-1 flex flex-col overflow-hidden ${isFullScreen ? '' : 'glass-strong rounded-xl border border-surface-variant'}`}>
          
          <div 
            className="flex-1 flex overflow-hidden split-container" 
            style={{ 
                flexDirection: layoutOrientation === 'horizontal' 
                  ? (swapPanels ? 'column-reverse' : 'column') 
                  : (swapPanels ? 'row-reverse' : 'row') 
            }}
          >
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

      {isOCRBlocking && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300">
          <div className="bg-white/10 border border-white/20 p-8 rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur-md">
            
            <div className="relative w-16 h-16 mb-6">
              <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-t-purple-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin reverse-spin opacity-70" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
            </div>

            <h3 className="text-white text-xl font-bold mb-2 tracking-wide">מזהה טקסט...</h3>
            <p className="text-gray-300 text-sm mb-6">אנא המתן, הפעולה עשויה לקחת מספר שניות</p>

            <button 
              onClick={handleCancelOCR}
              className="px-6 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-200 border border-red-500/50 rounded-full transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              ביטול
            </button>
          </div>
        </div>
      )}

      {showUploadDialog && (
        <UploadDialog
          pageNumber={pageNumber}
          onConfirm={handleUploadConfirm}
          onCancel={() => setShowUploadDialog(false)}
        />
      )}
    </div>
  )
}

function UploadDialog({ pageNumber, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4" onClick={onCancel}>
      <div className="glass-strong bg-white rounded-2xl p-8 max-w-md w-full border border-gray-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-4xl text-green-600">
              upload_file
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            סיום עבודה על עמוד {pageNumber}
          </h2>
          <p className="text-gray-600">
            האם ברצונך להעלות את הטקסט שערכת למערכת?
          </p>
        </div>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 mt-0.5">
              info
            </span>
            <div className="text-sm text-blue-800">
              <p className="font-bold mb-1">מה יקרה?</p>
              <ul className="space-y-1">
                <li>• הטקסט שערכת יועלה כקובץ חדש</li>
                <li>• הקובץ יישלח לאישור מנהל</li>
                <li>• העמוד יסומן כהושלם</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
          >
            <span className="material-symbols-outlined">upload</span>
            <span>כן, העלה את הטקסט</span>
          </button>
          <button
            onClick={onCancel}
            className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
        
      </div>
    </div>
  )
}