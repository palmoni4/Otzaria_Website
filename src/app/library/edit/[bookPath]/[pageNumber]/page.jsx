'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { getAvatarColor, getInitial } from '@/lib/avatar-colors'

export default function EditPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const bookPath = decodeURIComponent(params.bookPath)
  const pageNumber = parseInt(params.pageNumber)

  const [bookData, setBookData] = useState(null)
  const [pageData, setPageData] = useState(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [twoColumns, setTwoColumns] = useState(false)
  const [leftColumn, setLeftColumn] = useState('')
  const [rightColumn, setRightColumn] = useState('')
  const [activeTextarea, setActiveTextarea] = useState(null)
  const [selectedFont, setSelectedFont] = useState('monospace')
  const [showFindReplace, setShowFindReplace] = useState(false)
  const [findText, setFindText] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [isOcrProcessing, setIsOcrProcessing] = useState(false)
  const [showSplitDialog, setShowSplitDialog] = useState(false)
  const [rightColumnName, setRightColumnName] = useState('חלק 1')
  const [leftColumnName, setLeftColumnName] = useState('חלק 2')
  const [splitMode, setSplitMode] = useState('content') // 'content' או 'visual'
  const [isContentSplit, setIsContentSplit] = useState(false) // האם זה פיצול תוכן אמיתי
  const [imageZoom, setImageZoom] = useState(100) // אחוז זום של התמונה
  const [isSelectionMode, setIsSelectionMode] = useState(false) // מצב בחירת אזור
  const [selectionStart, setSelectionStart] = useState(null) // נקודת התחלה של הבחירה
  const [selectionEnd, setSelectionEnd] = useState(null) // נקודת סיום של הבחירה
  const [selectionRect, setSelectionRect] = useState(null) // מלבן הבחירה הסופי
  const [ocrMethod, setOcrMethod] = useState('tesseract') // 'tesseract' או 'gemini'
  const [showSettings, setShowSettings] = useState(false) // הצגת sidebar הגדרות
  const imageContainerRef = useRef(null) // ref לקונטיינר התמונה
  const autoScrollRef = useRef(null) // ref ל-interval של auto-scroll
  const [userApiKey, setUserApiKey] = useState('') // API key של המשתמש
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash') // מודל נבחר
  const [customPrompt, setCustomPrompt] = useState('The text is in Hebrew, written in Rashi script (traditional Hebrew font).\n\nTranscription guidelines:\n- Transcribe exactly what you see, letter by letter\n- Do NOT add nikud (vowel points) unless they appear in the image\n- Do NOT correct or "fix" words to make them more meaningful\n- Preserve the exact spelling, even if words seem unusual or abbreviated\n- In Rashi script: Final Mem (ם) looks like Samekh (ס), and Alef (א) looks like Het (ח) - be careful\n- Preserve all line breaks and spacing\n- Return only the Hebrew text without explanations')
  const [imagePanelWidth, setImagePanelWidth] = useState(50) // אחוז רוחב של פאנל התמונה
  const [isResizing, setIsResizing] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [layoutOrientation, setLayoutOrientation] = useState('vertical') // 'vertical' או 'horizontal'

  // טען הגדרות מ-localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key')
    const savedPrompt = localStorage.getItem('gemini_prompt')
    const savedModel = localStorage.getItem('gemini_model')
    const savedImagePanelWidth = localStorage.getItem('imagePanelWidth')
    const savedLayoutOrientation = localStorage.getItem('layoutOrientation')
    if (savedApiKey) setUserApiKey(savedApiKey)
    if (savedPrompt) setCustomPrompt(savedPrompt)
    if (savedModel) setSelectedModel(savedModel)
    if (savedImagePanelWidth) setImagePanelWidth(parseFloat(savedImagePanelWidth))
    if (savedLayoutOrientation) setLayoutOrientation(savedLayoutOrientation)
  }, [])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/library/auth/login')
    } else if (status === 'authenticated') {
      loadPageData()
    }
  }, [status, bookPath, pageNumber])

  // Update page title
  useEffect(() => {
    if (bookData?.name) {
      document.title = `ספריית אוצריא | עריכה: ${bookData.name} - עמוד ${pageNumber}`
    }
  }, [bookData, pageNumber])

  const loadPageData = async () => {
    try {
      setLoading(true)
      setError(null)

      // טען נתוני ספר - תיקון נתיב
      const bookResponse = await fetch(`/api/book-by-name?name=${encodeURIComponent(bookPath)}`)
      const bookResult = await bookResponse.json()

      if (bookResult.success) {
        setBookData(bookResult.book)
        const page = bookResult.pages.find(p => p.number === pageNumber)
        console.log('📄 Page data for edit:', page)
        console.log('🖼️ Thumbnail URL:', page?.thumbnail)
        setPageData(page)
      } else {
        setError(bookResult.error || 'שגיאה בטעינת הספר')
        return
      }

      // טען תוכן שמור - תיקון נתיב
      const contentResponse = await fetch(`/api/page-content?bookPath=${encodeURIComponent(bookPath)}&pageNumber=${pageNumber}`)
      const contentResult = await contentResponse.json()

      if (contentResult.success && contentResult.data) {
        const data = contentResult.data
        setContent(data.content || '')
        setLeftColumn(data.leftColumn || '')
        setRightColumn(data.rightColumn || '')
        setRightColumnName(data.rightColumnName || 'חלק 1')
        setLeftColumnName(data.leftColumnName || 'חלק 2')
        setTwoColumns(data.twoColumns || false)
      }
    } catch (err) {
      console.error('Error loading page:', err)
      setError(err.message || 'שגיאה בטעינת העמוד')
    } finally {
      setLoading(false)
    }
  }



  const handleAutoSave = (text) => {
    setContent(text)
    // שמירה אוטומטית לשרת
    debouncedSave(text, leftColumn, rightColumn, twoColumns)
  }

  const handleColumnChange = (column, newText) => {
    if (column === 'left') {
      setLeftColumn(newText)
      debouncedSave(content, newText, rightColumn, twoColumns)
    } else {
      setRightColumn(newText)
      debouncedSave(content, leftColumn, newText, twoColumns)
    }
  }

  // שמירה אוטומטית עם debounce
  const debouncedSave = (() => {
    let timeout
    return (contentText, leftText, rightText, twoCol, isContentSplitMode, rightName, leftName) => {
      clearTimeout(timeout)
      timeout = setTimeout(async () => {
        try {
          // תיקון נתיב API
          await fetch('/api/page-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookPath,
              pageNumber,
              content: contentText,
              leftColumn: leftText,
              rightColumn: rightText,
              twoColumns: twoCol,
              isContentSplit: isContentSplitMode ?? isContentSplit,
              rightColumnName: rightName ?? rightColumnName,
              leftColumnName: leftName ?? leftColumnName
            })
          })
          console.log('✅ Auto-saved')
        } catch (error) {
          console.error('Auto-save error:', error)
        }
      }, 2000) // שמירה אחרי 2 שניות של חוסר פעילות
    }
  })()

  const toggleColumns = () => {
    if (!twoColumns) {
      // הצג דיאלוג אישור לפני פיצול
      setShowSplitDialog(true)
    } else {
      // מעבר משניים לאחד - איחוד הטקסט (ללא רווחים מיותרים)
      const combinedText = rightColumn + leftColumn
      setContent(combinedText)
      setTwoColumns(false)

      // שמור מיד
      debouncedSave(combinedText, leftColumn, rightColumn, false)
    }
  }

  const confirmSplit = () => {
    // מעבר מטור אחד לשניים - פצל את הטקסט
    // אם יש כבר טקסט, הכל נכנס לחלק 1 (טור ימני)
    setRightColumn(content)
    setLeftColumn('')
    setTwoColumns(true)
    setIsContentSplit(splitMode === 'content')
    setShowSplitDialog(false)

    // שמור מיד
    debouncedSave(content, '', content, true, splitMode === 'content', rightColumnName, leftColumnName)
  }

  const handleFindReplace = (replaceAll = false) => {
    if (!findText) {
      alert('אנא הזן טקסט לחיפוש')
      return
    }

    // המר תווים מיוחדים
    const processedFindText = findText
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')

    const processedReplaceText = replaceText
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')

    let updatedContent = content
    let updatedLeft = leftColumn
    let updatedRight = rightColumn
    let count = 0

    if (twoColumns) {
      if (replaceAll) {
        const rightCount = (rightColumn.match(new RegExp(processedFindText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        const leftCount = (leftColumn.match(new RegExp(processedFindText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        count = rightCount + leftCount

        updatedRight = rightColumn.split(processedFindText).join(processedReplaceText)
        updatedLeft = leftColumn.split(processedFindText).join(processedReplaceText)
      } else {
        // החלפה ראשונה בלבד
        if (rightColumn.includes(processedFindText)) {
          updatedRight = rightColumn.replace(processedFindText, processedReplaceText)
          count = 1
        } else if (leftColumn.includes(processedFindText)) {
          updatedLeft = leftColumn.replace(processedFindText, processedReplaceText)
          count = 1
        }
      }

      setRightColumn(updatedRight)
      setLeftColumn(updatedLeft)
      debouncedSave(content, updatedLeft, updatedRight, twoColumns)
    } else {
      if (replaceAll) {
        count = (content.match(new RegExp(processedFindText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
        updatedContent = content.split(processedFindText).join(processedReplaceText)
      } else {
        if (content.includes(processedFindText)) {
          updatedContent = content.replace(processedFindText, processedReplaceText)
          count = 1
        }
      }

      setContent(updatedContent)
      debouncedSave(updatedContent, leftColumn, rightColumn, twoColumns)
    }

    if (count > 0) {
      alert(`✅ הוחלפו ${count} מופעים`)
    } else {
      alert('❌ לא נמצאו תוצאות')
    }
  }

  const getImageCoordinates = (e, img) => {
    const container = img.parentElement
    const containerRect = container.getBoundingClientRect()

    // קואורדינטות העכבר יחסית לקונטיינר
    const containerX = e.clientX - containerRect.left
    const containerY = e.clientY - containerRect.top

    // גודל התמונה המוצגת (אחרי scale)
    const scale = imageZoom / 100

    // בגלל RTL, התמונה מתחילה מימין (transformOrigin: 'top right')
    // צריך לחשב את המרחק מהקצה הימני של הקונטיינר
    const displayX = containerRect.width - containerX
    const displayY = containerY

    // המר לקואורדינטות של התמונה הטבעית
    const x = (displayX / scale)
    const y = (displayY / scale)

    return { x, y, displayX, displayY }
  }

  const handleContainerMouseDown = (e) => {
    if (!isSelectionMode) return

    // בדוק שזה לחיצה על התמונה ולא על overlay אחר
    if (e.target.classList.contains('selection-overlay')) return

    e.preventDefault()
    e.stopPropagation()

    // קבל את התמונה
    const container = e.currentTarget
    const img = container.querySelector('img')
    if (!img) return

    const coords = getImageCoordinates(e, img)

    // בדוק שהלחיצה היא בתוך התמונה
    const scale = imageZoom / 100
    const scaledWidth = img.naturalWidth * scale
    const scaledHeight = img.naturalHeight * scale

    if (coords.displayX < 0 || coords.displayY < 0 ||
      coords.displayX > scaledWidth || coords.displayY > scaledHeight) return

    setSelectionStart(coords)
    setSelectionEnd(coords)
    setSelectionRect(null)
  }

  const handleContainerMouseMove = (e) => {
    if (!isSelectionMode || !selectionStart) return

    e.preventDefault()
    e.stopPropagation()

    const container = e.currentTarget
    const img = container.querySelector('img')
    if (!img) return

    const coords = getImageCoordinates(e, img)
    setSelectionEnd(coords)

    // Auto-scroll כשמגיעים לקצוות
    const scrollContainer = imageContainerRef.current
    if (!scrollContainer) return

    const containerRect = scrollContainer.getBoundingClientRect()
    const mouseX = e.clientX
    const mouseY = e.clientY
    const scrollSpeed = 15
    const edgeThreshold = 50 // מרחק מהקצה שמפעיל גלילה

    // נקה interval קודם
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }

    let scrollX = 0
    let scrollY = 0

    // בדוק קרבה לקצוות - Y (מעלה/מטה)
    if (mouseY < containerRect.top + edgeThreshold) {
      scrollY = -scrollSpeed // גלול למעלה
    } else if (mouseY > containerRect.bottom - edgeThreshold) {
      scrollY = scrollSpeed // גלול למטה
    }

    // בדוק קרבה לקצוות - X (שמאל/ימין)
    if (mouseX < containerRect.left + edgeThreshold) {
      scrollX = -scrollSpeed // גלול שמאלה
    } else if (mouseX > containerRect.right - edgeThreshold) {
      scrollX = scrollSpeed // גלול ימינה
    }

    // אם צריך לגלול, הפעל interval
    if (scrollX !== 0 || scrollY !== 0) {
      autoScrollRef.current = setInterval(() => {
        // גלילה אופקית
        if (scrollX !== 0) {
          scrollContainer.scrollLeft += scrollX
        }
        // גלילה אנכית
        if (scrollY !== 0) {
          scrollContainer.scrollTop += scrollY
        }
      }, 16) // ~60fps
    }
  }

  const handleContainerMouseUp = (e) => {
    // נקה auto-scroll
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }

    if (!isSelectionMode || !selectionStart || !selectionEnd) return

    e.preventDefault()
    e.stopPropagation()

    const container = e.currentTarget
    const containerRect = container.getBoundingClientRect()

    // חשב את המלבן הסופי
    // displayX/Y הם כבר מהכיוון הנכון (מימין לשמאל)
    const minDisplayX = Math.min(selectionStart.displayX, selectionEnd.displayX)
    const maxDisplayX = Math.max(selectionStart.displayX, selectionEnd.displayX)
    const minDisplayY = Math.min(selectionStart.displayY, selectionEnd.displayY)
    const maxDisplayY = Math.max(selectionStart.displayY, selectionEnd.displayY)

    const displayWidth = maxDisplayX - minDisplayX
    const displayHeight = maxDisplayY - minDisplayY

    // בדוק שהמלבן לא קטן מדי
    if (displayWidth < 20 || displayHeight < 20) {
      setSelectionStart(null)
      setSelectionEnd(null)
      alert('⚠️ האזור קטן מדי. אנא בחר אזור גדול יותר')
      return
    }

    // קואורדינטות של התמונה המקורית (לפני scale)
    const minX = Math.min(selectionStart.x, selectionEnd.x)
    const maxX = Math.max(selectionStart.x, selectionEnd.x)
    const minY = Math.min(selectionStart.y, selectionEnd.y)
    const maxY = Math.max(selectionStart.y, selectionEnd.y)

    const rect = {
      // קואורדינטות תצוגה - מהקצה הימני של הקונטיינר
      displayX: containerRect.width - maxDisplayX,
      displayY: minDisplayY,
      displayWidth: displayWidth,
      displayHeight: displayHeight,
      // קואורדינטות של התמונה המקורית
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }

    setSelectionRect(rect)
    setSelectionStart(null)
    setSelectionEnd(null)
  }

  const toggleSelectionMode = () => {
    // נקה auto-scroll אם קיים
    if (autoScrollRef.current) {
      clearInterval(autoScrollRef.current)
      autoScrollRef.current = null
    }
    setIsSelectionMode(!isSelectionMode)
    setSelectionStart(null)
    setSelectionEnd(null)
    setSelectionRect(null)
  }

  const handleGeminiOCR = async (croppedBlob) => {
    // המר את ה-blob ל-base64
    const reader = new FileReader()
    const base64Promise = new Promise((resolve) => {
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1] // הסר את "data:image/jpeg;base64,"
        resolve(base64)
      }
      reader.readAsDataURL(croppedBlob)
    })

    const imageBase64 = await base64Promise

    // שלח ל-API - תיקון נתיב
    const response = await fetch('/api/gemini-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64,
        model: selectedModel,
        userApiKey: userApiKey || undefined,
        customPrompt: customPrompt || undefined
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Gemini OCR failed')
    }

    return result.text
  }

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', userApiKey)
    localStorage.setItem('gemini_prompt', customPrompt)
    localStorage.setItem('gemini_model', selectedModel)
    alert('✅ ההגדרות נשמרו')
  }

  const resetPrompt = () => {
    const defaultPrompt = 'The text is in Hebrew, written in Rashi script (traditional Hebrew font).\n\nTranscription guidelines:\n- Transcribe exactly what you see, letter by letter\n- Do NOT add nikud (vowel points) unless they appear in the image\n- Do NOT correct or "fix" words to make them more meaningful\n- Preserve the exact spelling, even if words seem unusual or abbreviated\n- In Rashi script: Final Mem (ם) looks like Samekh (ס), and Alef (א) looks like Het (ח) - be careful\n- Preserve all line breaks and spacing\n- Return only the Hebrew text without explanations'
    setCustomPrompt(defaultPrompt)
  }

  // קבל הנחיות עריכה מהספר או ברירת מחדל
  const getEditingInstructions = () => {
    // אם יש מידע עריכה שמור בספר, השתמש בו
    if (bookData?.editingInfo) {
      return bookData.editingInfo
    }

    // אחרת, השתמש בהנחיות ברירת מחדל
    const bookName = bookData?.name || ''

    // הנחיות ברירת מחדל
    const defaultInstructions = {
      title: 'הנחיות עריכה כלליות',
      sections: [
        {
          title: 'כללי',
          items: [
            'העתק את הטקסט בדיוק כפי שהוא מופיע בתמונה',
            'שמור על מבנה הפסקאות והשורות',
            'השתמש בכלי OCR לזיהוי אוטומטי של הטקסט'
          ]
        },
        {
          title: 'תיוג',
          items: [
            'השתמש בתגי <b> למילים מודגשות',
            'השתמש בתגי <h1>, <h2>, <h3> לכותרות',
            'השתמש בתגי <small> להערות שוליים'
          ]
        },
        {
          title: 'שמירה',
          items: [
            'הטקסט נשמר אוטומטית בזמן הקלדה',
            'אין צורך ללחוץ על כפתור שמירה',
            'השינויים נשמרים לצמיתות במסד הנתונים'
          ]
        }
      ]
    }

    // הנחיות ספציפיות לספרים
    if (bookName.includes('תלמוד') || bookName.includes('גמרא')) {
      return {
        title: 'הנחיות עריכה - תלמוד',
        sections: [
          {
            title: 'מבנה הדף',
            items: [
              'פצל את הדף לשני טורים: גמרא (ימין) ורש"י/תוספות (שמאל)',
              'השתמש בכפתור "שני טורים" לפיצול',
              'שם את הטורים בהתאם: "גמרא", "רש״י", "תוספות"'
            ]
          },
          {
            title: 'כתב רש"י',
            items: [
              'שים לב להבדלים בין אותיות דומות',
              'מ״ם סופית (ם) דומה לסמ״ך (ס)',
              'אל״ף (א) דומה לח״ית (ח)',
              'השתמש ב-Gemini OCR לדיוק טוב יותר'
            ]
          },
          {
            title: 'תיוג מיוחד',
            items: [
              'סמן שמות התנאים והאמוראים ב-<b>',
              'סמן כותרות סוגיות ב-<h2>',
              'הערות והגהות ב-<small>'
            ]
          }
        ]
      }
    }

    if (bookName.includes('משנה')) {
      return {
        title: 'הנחיות עריכה - משנה',
        sections: [
          {
            title: 'מבנה',
            items: [
              'כל משנה בפסקה נפרדת',
              'סמן מספרי משניות ב-<b>',
              'שמור על חלוקה למשניות'
            ]
          },
          {
            title: 'תיוג',
            items: [
              'שמות התנאים ב-<b>',
              'כותרות פרקים ב-<h2>',
              'פירושים והערות ב-<small>'
            ]
          }
        ]
      }
    }

    if (bookName.includes('תנ"ך') || bookName.includes('תורה') || bookName.includes('נביאים') || bookName.includes('כתובים')) {
      return {
        title: 'הנחיות עריכה - תנ"ך',
        sections: [
          {
            title: 'מבנה',
            items: [
              'כל פסוק בשורה נפרדת',
              'סמן מספרי פסוקים ב-<small>',
              'שמור על חלוקה לפרקים'
            ]
          },
          {
            title: 'ניקוד וטעמים',
            items: [
              'העתק את הניקוד והטעמים בדיוק',
              'שים לב למילים עם דגש',
              'שמור על מבנה הפסוקים'
            ]
          },
          {
            title: 'תיוג',
            items: [
              'כותרות פרקים ב-<h2>',
              'שמות פרשיות ב-<h1>',
              'הערות ופירושים ב-<small>'
            ]
          }
        ]
      }
    }

    // החזר הנחיות ברירת מחדל
    return defaultInstructions
  }

  // Resize handler
  const handleResizeStart = (e) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e) => {
      const container = document.querySelector('.split-container')
      if (!container) return

      const containerRect = container.getBoundingClientRect()

      let newSize
      if (layoutOrientation === 'horizontal') {
        // מצב אופקי - חשב לפי Y
        const mouseY = e.clientY - containerRect.top
        newSize = (mouseY / containerRect.height) * 100
      } else {
        // מצב אנכי - חשב מימין לשמאל (RTL)
        const mouseX = containerRect.right - e.clientX
        newSize = (mouseX / containerRect.width) * 100
      }

      // הגבל בין 20% ל-80%
      const clampedSize = Math.min(Math.max(newSize, 20), 80)
      setImagePanelWidth(clampedSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      // שמור את הרוחב ל-localStorage
      localStorage.setItem('imagePanelWidth', imagePanelWidth.toString())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, imagePanelWidth, layoutOrientation])



  const handleOCRSelection = async () => {
    if (!selectionRect) {
      alert('❌ אנא בחר אזור בתמונה תחילה')
      return
    }

    setIsOcrProcessing(true)

    try {
      

      const progressDiv = document.createElement('div')
      progressDiv.id = 'ocr-progress'
      progressDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-primary text-on-primary px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3'
      progressDiv.innerHTML = `
        <span class="material-symbols-outlined animate-spin">progress_activity</span>
        <span>מעבד OCR על האזור הנבחר... <span id="ocr-percent">0%</span></span>
      `
      document.body.appendChild(progressDiv)

      // תיקון: טען את התמונה ישירות כי היא מקומית
      const response = await fetch(thumbnailUrl)

      if (!response.ok) {
        throw new Error('Failed to load image')
      }

      const blob = await response.blob()

      // צור canvas וחתוך את האזור הנבחר
      const img = await createImageBitmap(blob)

      // השתמש בקואורדינטות המקוריות שכבר מחושבות נכון
      const canvas = document.createElement('canvas')
      canvas.width = selectionRect.width
      canvas.height = selectionRect.height
      const ctx = canvas.getContext('2d')

      // צייר רק את האזור הנבחר מהתמונה המקורית
      ctx.drawImage(
        img,
        selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height,
        0, 0, selectionRect.width, selectionRect.height
      )

      // המר ל-blob
      const croppedBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.95)
      })

      let extractedText = ''

      // הרץ OCR לפי השיטה שנבחרה
      if (ocrMethod === 'gemini') {
        // Gemini AI
        progressDiv.querySelector('span:last-child').innerHTML = `מעבד Gemini AI... <span id="ocr-percent">⏳</span>`
        extractedText = await handleGeminiOCR(croppedBlob)
      } else {
        // Tesseract OCR
        const Tesseract = (await import('tesseract.js')).default
        const result = await Tesseract.recognize(
          croppedBlob,
          'heb',
          {
            logger: (m) => {
              if (m.status === 'recognizing text') {
                const percent = Math.round(m.progress * 100)
                const percentEl = document.getElementById('ocr-percent')
                if (percentEl) percentEl.textContent = `${percent}%`
              }
            }
          }
        )
        extractedText = result.data.text.trim()
      }

      progressDiv.remove()

      extractedText = extractedText.trim()

      if (!extractedText) {
        alert('⚠️ לא זוהה טקסט באזור הנבחר')
        return
      }

      // הוסף את הטקסט לעורך
      if (twoColumns) {
        const newRightColumn = rightColumn + (rightColumn ? '\n\n' : '') + extractedText
        setRightColumn(newRightColumn)
        debouncedSave(content, leftColumn, newRightColumn, twoColumns)
      } else {
        const newContent = content + (content ? '\n\n' : '') + extractedText
        setContent(newContent)
        debouncedSave(newContent, leftColumn, rightColumn, twoColumns)
      }

      alert(`✅ OCR הושלם בהצלחה!\nזוהו ${extractedText.length} תווים`)

      // נקה את הבחירה
      setSelectionRect(null)
      setIsSelectionMode(false)

    } catch (error) {
      console.error('OCR Error:', error)
      alert('❌ שגיאה בעיבוד OCR: ' + error.message)

      const progressDiv = document.getElementById('ocr-progress')
      if (progressDiv) progressDiv.remove()
    } finally {
      setIsOcrProcessing(false)
    }
  }

  const insertTag = (tag) => {
    // זהה איזה textarea פעיל
    let currentText, column

    if (twoColumns) {
      // אם יש textarea פעיל, השתמש בו
      if (activeTextarea === 'left') {
        currentText = leftColumn
        column = 'left'
      } else if (activeTextarea === 'right') {
        currentText = rightColumn
        column = 'right'
      } else {
        // ברירת מחדל - טור ימין
        currentText = rightColumn
        column = 'right'
      }
    } else {
      currentText = content
      column = null
    }

    const textarea = column ? document.querySelector(`textarea[data-column="${column}"]`) : document.querySelector('textarea')

    if (!textarea) {
      console.log('No textarea found')
      return
    }

    // שמור את מיקום הגלילה הנוכחי
    const scrollTop = textarea.scrollTop
    const scrollLeft = textarea.scrollLeft

    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const selectedText = currentText.substring(start, end)
    const beforeText = currentText.substring(0, start)
    const afterText = currentText.substring(end)

    let newText = ''
    let insertedText = ''

    switch (tag) {
      case 'b':
        insertedText = `<b>${selectedText || 'טקסט מודגש'}</b>`
        break
      case 'i':
        insertedText = `<i>${selectedText || 'טקסט נטוי'}</i>`
        break
      case 'u':
        insertedText = `<u>${selectedText || 'טקסט עם קו תחתון'}</u>`
        break
      case 'big':
        insertedText = `<big>${selectedText || 'טקסט גדול'}</big>`
        break
      case 'small':
        insertedText = `<small>${selectedText || 'טקסט קטן'}</small>`
        break
      case 'h1':
        insertedText = `<h1>${selectedText || 'כותרת 1'}</h1>`
        break
      case 'h2':
        insertedText = `<h2>${selectedText || 'כותרת 2'}</h2>`
        break
      case 'h3':
        insertedText = `<h3>${selectedText || 'כותרת 3'}</h3>`
        break
      default:
        return
    }

    newText = beforeText + insertedText + afterText

    // עדכן את הטקסט המתאים
    if (column === 'left') {
      setLeftColumn(newText)
      debouncedSave(content, newText, rightColumn, twoColumns)
    } else if (column === 'right') {
      setRightColumn(newText)
      debouncedSave(content, leftColumn, newText, twoColumns)
    } else {
      setContent(newText)
      debouncedSave(newText, leftColumn, rightColumn, twoColumns)
    }

    // החזר פוקוס ל-textarea ושמור את מיקום הגלילה
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + insertedText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      // שחזר את מיקום הגלילה
      textarea.scrollTop = scrollTop
      textarea.scrollLeft = scrollLeft
    }, 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-6xl text-primary mb-4 block">
            progress_activity
          </span>
          <p className="text-on-surface/70">טוען עמוד...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center glass-strong p-8 rounded-2xl max-w-md">
          <span className="material-symbols-outlined text-6xl text-red-500 mb-4 block">
            error
          </span>
          <h2 className="text-2xl font-bold text-on-surface mb-2">שגיאה</h2>
          <p className="text-on-surface/70 mb-4">{error}</p>
          <Link
            href={`/library/book/${encodeURIComponent(bookPath)}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors"
          >
            <span className="material-symbols-outlined">arrow_forward</span>
            <span>חזרה לספר</span>
          </Link>
        </div>
      </div>
    )
  }

  const thumbnailUrl = pageData?.thumbnail

  return (
    <>
      <style jsx global>{`
        .overflow-auto::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .overflow-auto::-webkit-scrollbar-track {
          background: #e7e0d8;
          border-radius: 6px;
        }
        .overflow-auto::-webkit-scrollbar-thumb {
          background: #6b5d4f;
          border-radius: 6px;
        }
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: #5a4d3f;
        }
      `}</style>
      <div className="h-screen bg-background flex flex-col overflow-hidden" style={{
        cursor: isResizing ? 'col-resize' : 'default',
        userSelect: isResizing ? 'none' : 'auto'
      }}>
        {/* Header */}
        <header className="glass-strong border-b border-surface-variant sticky top-0 z-40">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/library" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <img src="/logo.png" alt="לוגו אוצריא" className="w-10 h-10" />
                  <span className="text-lg font-bold text-black" style={{ fontFamily: 'FrankRuehl, serif' }}>ספריית אוצריא</span>
                </Link>

                <div className="w-px h-8 bg-surface-variant"></div>

                <Link
                  href={`/library/book/${encodeURIComponent(bookPath)}`}
                  className="flex items-center gap-2 text-on-surface hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined">arrow_forward</span>
                  <span>חזרה לספר</span>
                </Link>
                <div className="w-px h-8 bg-surface-variant"></div>
                <div>
                  <h1 className="text-lg font-bold text-on-surface">
                    {bookData?.name} - עמוד {pageNumber}
                  </h1>
                  <p className="text-xs text-on-surface/60">עריכת טקסט</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>נשמר אוטומטית</span>
                </div>

                <Link
                  href="/library/dashboard"
                  className="flex items-center justify-center hover:opacity-80 transition-opacity"
                  title={session?.user?.name}
                >
                  <div
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-base shadow-md hover:shadow-lg transition-shadow"
                    style={{ backgroundColor: getAvatarColor(session?.user?.name || '') }}
                  >
                    {getInitial(session?.user?.name || '')}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Unified Toolbar - Fixed */}
        <div className="bg-white border-b border-gray-200 sticky top-16 z-30 shadow-sm">
          <div className="container mx-auto px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              {/* Left Side - Image Tools */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 h-8 rounded-lg transition-colors flex items-center ${showSettings ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  title="הגדרות OCR"
                >
                  <span className="material-symbols-outlined text-base">settings</span>
                </button>

                <div className="w-px h-6 bg-gray-200"></div>

                <span className="text-xs text-gray-500 font-medium">עמוד {pageNumber} מתוך {bookData?.totalPages}</span>

                <div className="w-px h-6 bg-gray-200"></div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setImageZoom(Math.max(25, imageZoom - 10))}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center"
                    title="הקטן תמונה"
                  >
                    <span className="material-symbols-outlined text-base">zoom_out</span>
                  </button>
                  <span className="text-xs font-medium min-w-[2.5rem] text-center text-gray-700">{imageZoom}%</span>
                  <button
                    onClick={() => setImageZoom(Math.min(300, imageZoom + 10))}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center"
                    title="הגדל תמונה"
                  >
                    <span className="material-symbols-outlined text-base">zoom_in</span>
                  </button>
                  <button
                    onClick={() => setImageZoom(100)}
                    className="w-12 h-8 hover:bg-white rounded-md transition-colors text-xs font-medium flex items-center justify-center"
                    title="איפוס זום"
                  >
                    100%
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200"></div>

                {/* OCR Method Selector */}
                <div className="flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setOcrMethod('tesseract')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 h-8 ${ocrMethod === 'tesseract'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                    title="Tesseract OCR - מהיר, עובד אופליין"
                  >
                    <span className="material-symbols-outlined text-base">text_fields</span>
                    <span>OCR</span>
                  </button>
                  <button
                    onClick={() => setOcrMethod('gemini')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 h-8 ${ocrMethod === 'gemini'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                    title="Gemini AI - מדויק יותר"
                  >
                    <img
                      src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg"
                      alt="Gemini"
                      className="w-3.5 h-3.5"
                    />
                    <span>Gemini</span>
                  </button>
                </div>

                <button
                  onClick={toggleSelectionMode}
                  disabled={isOcrProcessing || !thumbnailUrl}
                  className={`w-8 h-8 rounded-lg border transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${isSelectionMode
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  title={`זיהוי טקסט מאזור נבחר (${ocrMethod === 'gemini' ? 'Gemini AI' : 'Tesseract OCR'})`}
                >
                  <span className={`material-symbols-outlined text-base ${isOcrProcessing ? 'animate-spin' : ''}`}>
                    {isOcrProcessing ? 'progress_activity' : 'document_scanner'}
                  </span>
                </button>

                {selectionRect && (
                  <>
                    <button
                      onClick={handleOCRSelection}
                      disabled={isOcrProcessing}
                      className="flex items-center gap-2 px-3 py-1.5 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="זהה טקסט באזור הנבחר"
                    >
                      <span className="material-symbols-outlined text-base">
                        check_circle
                      </span>
                      <span className="text-xs font-medium">זהה אזור</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectionRect(null)
                        setIsSelectionMode(false)
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
                      title="בטל בחירה"
                    >
                      <span className="material-symbols-outlined text-base">
                        close
                      </span>
                    </button>
                  </>
                )}

                <div className="w-px h-6 bg-gray-200"></div>

                <a
                  href="https://aistudio.google.com/prompts/new_chat?model=gemini-3-pro-preview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 h-8 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
                  title="פתח Gemini AI"
                >
                  <img
                    src="https://www.gstatic.com/lamda/images/bard_sparkle_v2_advanced.svg"
                    alt="Gemini"
                    className="w-5 h-5"
                  />
                </a>
              </div>

              {/* Right Side - Text Tools */}
              <div className="flex items-center gap-2 flex-wrap">

                {/* Text Formatting Buttons */}
                <div className="flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => insertTag('b')}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center"
                    title="מודגש"
                  >
                    <span className="font-bold text-sm">B</span>
                  </button>
                  <button
                    onClick={() => insertTag('i')}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center"
                    title="נטוי"
                  >
                    <span className="italic text-sm">I</span>
                  </button>
                  <button
                    onClick={() => insertTag('u')}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center"
                    title="קו תחתון"
                  >
                    <span className="underline text-sm">U</span>
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200"></div>

                <div className="flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => insertTag('big')}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center text-sm font-medium"
                    title="גדול"
                  >
                    A+
                  </button>
                  <button
                    onClick={() => insertTag('small')}
                    className="w-8 h-8 hover:bg-white rounded-md transition-colors flex items-center justify-center text-xs font-medium"
                    title="קטן"
                  >
                    A-
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200"></div>

                <div className="flex items-center gap-0 bg-gray-100 rounded-lg p-0.5">
                  <button
                    onClick={() => insertTag('h1')}
                    className="px-2.5 h-8 hover:bg-white rounded-md transition-colors text-xs font-bold flex items-center justify-center"
                    title="כותרת 1"
                  >
                    H1
                  </button>
                  <button
                    onClick={() => insertTag('h2')}
                    className="px-2.5 h-8 hover:bg-white rounded-md transition-colors text-xs font-bold flex items-center justify-center"
                    title="כותרת 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => insertTag('h3')}
                    className="px-2.5 h-8 hover:bg-white rounded-md transition-colors text-xs font-bold flex items-center justify-center"
                    title="כותרת 3"
                  >
                    H3
                  </button>
                </div>

                <div className="w-px h-6 bg-gray-200"></div>

                <button
                  onClick={() => setShowFindReplace(true)}
                  className="flex items-center gap-2 px-3 py-1.5 h-8 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
                  title="חיפוש והחלפה"
                >
                  <span className="material-symbols-outlined text-base">find_replace</span>
                  <span className="text-xs font-medium">חיפוש</span>
                </button>

                <div className="w-px h-6 bg-gray-200"></div>

                <div className="relative">
                  <select
                    value={selectedFont}
                    className="appearance-none pl-3 pr-8 h-8 bg-white border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer hover:bg-gray-50"
                    onChange={(e) => setSelectedFont(e.target.value)}
                  >
                    <option value="monospace">Monospace</option>
                    <option value="Arial">Arial</option>
                    <option value="'Times New Roman'">Times New Roman</option>
                    <option value="'Courier New'">Courier New</option>
                    <option value="Georgia">Georgia</option>
                    <option value="Verdana">Verdana</option>
                  </select>
                  <span className="material-symbols-outlined text-base absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    expand_more
                  </span>
                </div>

                <div className="w-px h-6 bg-gray-200"></div>

                <button
                  onClick={toggleColumns}
                  className="w-8 h-8 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title={twoColumns ? 'איחוד לטור אחד' : 'פיצול לשני טורים'}
                >
                  <span
                    className="material-symbols-outlined text-base"
                    style={{ transform: 'rotate(90deg)' }}
                  >
                    {twoColumns ? 'unfold_less' : 'unfold_more'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    const newOrientation = layoutOrientation === 'vertical' ? 'horizontal' : 'vertical'
                    setLayoutOrientation(newOrientation)
                    localStorage.setItem('layoutOrientation', newOrientation)
                  }}
                  className="w-8 h-8 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
                  title={layoutOrientation === 'vertical' ? 'פריסה אנכית' : 'פריסה אופקית'}
                >
                  <span className="material-symbols-outlined text-base" style={{ transform: layoutOrientation === 'horizontal' ? 'rotate(90deg)' : 'none' }}>
                    splitscreen
                  </span>
                </button>

                <div className="w-px h-6 bg-gray-200"></div>

                <button
                  onClick={() => setShowInfoDialog(true)}
                  className="w-8 h-8 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors flex items-center justify-center"
                  title="הנחיות עריכה"
                >
                  <span className="material-symbols-outlined text-base">info</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Single Container */}
        <div className="flex-1 flex flex-col overflow-hidden p-6">
          <div className="glass-strong rounded-xl border border-surface-variant flex-1 flex flex-col overflow-hidden">
            {/* Split Content Area */}
            <div
              className="flex-1 flex overflow-hidden split-container"
              style={{
                position: 'relative',
                flexDirection: layoutOrientation === 'horizontal' ? 'column' : 'row'
              }}
            >
              {/* Image Side */}
              <div
                ref={imageContainerRef}
                className="overflow-auto p-4"
                style={{
                  width: layoutOrientation === 'horizontal' ? '100%' : `${imagePanelWidth}%`,
                  height: layoutOrientation === 'horizontal' ? `${imagePanelWidth}%` : 'auto',
                  overflow: 'auto',
                  flexShrink: 0,
                  scrollbarWidth: 'thin', // Firefox
                  scrollbarColor: '#6b5d4f #e7e0d8' // Firefox
                }}
                onWheel={(e) => {
                  const element = e.currentTarget
                  const atTop = element.scrollTop === 0
                  const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1

                  // אם גוללים למעלה והגענו לראש, או למטה והגענו לתחתית - עצור
                  if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                    e.preventDefault()
                  }

                  // תמיד עצור את ה-propagation
                  e.stopPropagation()
                }}
              >
                {thumbnailUrl ? (
                  <div
                    className="inline-block relative"
                    onMouseDown={handleContainerMouseDown}
                    onMouseMove={handleContainerMouseMove}
                    onMouseUp={handleContainerMouseUp}
                    style={{
                      cursor: isSelectionMode ? 'crosshair' : 'default'
                    }}
                  >
                    <img
                      src={thumbnailUrl}
                      alt={`עמוד ${pageNumber}`}
                      className="rounded-lg shadow-lg transition-all duration-200 select-none"
                      style={{
                        transform: `scale(${imageZoom / 100})`,
                        transformOrigin: 'top right',
                        maxWidth: 'none',
                        width: 'auto',
                        height: 'auto',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                        pointerEvents: 'none'
                      }}
                      onDragStart={(e) => e.preventDefault()}
                      onError={(e) => {
                        console.error('Failed to load image:', thumbnailUrl)
                        e.target.style.display = 'none'
                        e.target.parentElement.nextSibling.style.display = 'flex'
                      }}
                    />

                    {/* Selection Overlay - בזמן גרירה */}
                    {isSelectionMode && selectionStart && selectionEnd && (() => {
                      const container = imageContainerRef.current
                      if (!container) return null

                      const minDisplayX = Math.min(selectionStart.displayX, selectionEnd.displayX)
                      const maxDisplayX = Math.max(selectionStart.displayX, selectionEnd.displayX)
                      const minDisplayY = Math.min(selectionStart.displayY, selectionEnd.displayY)
                      const maxDisplayY = Math.max(selectionStart.displayY, selectionEnd.displayY)

                      return (
                        <div
                          className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none selection-overlay"
                          style={{
                            right: `${minDisplayX}px`,
                            top: `${minDisplayY}px`,
                            width: `${maxDisplayX - minDisplayX}px`,
                            height: `${maxDisplayY - minDisplayY}px`,
                          }}
                        />
                      )
                    })()}

                    {/* Selected Rectangle - אחרי שחרור העכבר */}
                    {selectionRect && (() => {
                      // חשב את הקואורדינטות המוצגות בזמן אמת לפי הזום הנוכחי
                      const scale = imageZoom / 100
                      const displayX = selectionRect.x * scale
                      const displayY = selectionRect.y * scale
                      const displayWidth = selectionRect.width * scale
                      const displayHeight = selectionRect.height * scale

                      return (
                        <div
                          className="absolute border-4 border-green-500 bg-green-500/10 pointer-events-none animate-pulse selection-overlay"
                          style={{
                            right: `${displayX}px`,
                            top: `${displayY}px`,
                            width: `${displayWidth}px`,
                            height: `${displayHeight}px`,
                          }}
                        >
                          <div className="absolute -top-8 right-0 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                            ✓ אזור נבחר - לחץ זהה אזור
                          </div>
                        </div>
                      )
                    })()}

                    {/* Selection Mode Indicator */}
                    {isSelectionMode && !selectionRect && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 animate-pulse">
                        <span className="material-symbols-outlined text-base">crop_free</span>
                        <span>גרור לבחירת אזור</span>
                      </div>
                    )}
                  </div>
                ) : null}
                <div
                  className="flex items-center justify-center min-h-full bg-surface rounded-lg"
                  style={{ display: thumbnailUrl ? 'none' : 'flex' }}
                >
                  <div className="text-center">
                    <span className="material-symbols-outlined text-9xl text-on-surface/20 block mb-4">
                      description
                    </span>
                    <p className="text-on-surface/60">אין תמונה זמינה</p>
                    <p className="text-xs text-on-surface/40 mt-2">(עמוד {pageNumber})</p>
                  </div>
                </div>
              </div>

              {/* Resizable Divider */}
              <div
                className={`relative flex items-center justify-center hover:bg-primary/10 transition-colors ${layoutOrientation === 'horizontal' ? 'cursor-row-resize' : 'cursor-col-resize'
                  }`}
                style={{
                  width: layoutOrientation === 'horizontal' ? '100%' : '8px',
                  height: layoutOrientation === 'horizontal' ? '8px' : 'auto',
                  flexShrink: 0,
                  userSelect: 'none',
                  backgroundColor: isResizing ? 'rgba(107, 93, 79, 0.2)' : 'transparent'
                }}
                onMouseDown={handleResizeStart}
              >
                <div
                  className="absolute bg-surface-variant rounded-full"
                  style={{
                    width: layoutOrientation === 'horizontal' ? '12px' : '1px',
                    height: layoutOrientation === 'horizontal' ? '1px' : '12px'
                  }}
                ></div>
              </div>

              {/* Text Editor Side */}
              <div
                className="flex flex-col overflow-auto p-4 editor-container"
                style={{
                  flex: 1,
                  scrollbarWidth: 'thin', // Firefox
                  scrollbarColor: '#6b5d4f #e7e0d8' // Firefox
                }}
                onWheel={(e) => {
                  const element = e.currentTarget
                  const atTop = element.scrollTop === 0
                  const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1

                  // אם גוללים למעלה והגענו לראש, או למטה והגענו לתחתית - עצור
                  if ((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom)) {
                    e.preventDefault()
                  }

                  // תמיד עצור את ה-propagation
                  e.stopPropagation()
                }}
              >
                {twoColumns ? (
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="flex flex-col h-full">
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
                    <div className="flex flex-col h-full">
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
                    placeholder="התחל להקליד את הטקסט מהעמוד כאן...&#10;&#10;הטקסט נשמר אוטומטית בזמן הקלדה."
                    style={{ fontFamily: selectedFont }}
                    className="w-full h-full p-4 bg-white border-2 border-surface-variant rounded-lg resize-none focus:outline-none focus:border-primary transition-colors text-lg leading-relaxed"
                    dir="rtl"
                  />
                )}
              </div>
            </div>

            {/* Stats Bar */}
            <div className="px-4 py-3 border-t border-surface-variant bg-surface/50">
              <div className="flex items-center justify-between text-sm text-on-surface/60">
                <div className="flex items-center gap-4">
                  {twoColumns ? (
                    <>
                      <span>ימין: {rightColumn.length} תווים</span>
                      <span>שמאל: {leftColumn.length} תווים</span>
                    </>
                  ) : (
                    <>
                      <span>תווים: {content.length}</span>
                      <span>מילים: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
                      <span>שורות: {content.split('\n').length}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>נשמר אוטומטית</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Find & Replace Dialog */}
        {showFindReplace && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowFindReplace(false)}>
            <div className="glass-strong rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">find_replace</span>
                  <span>חיפוש והחלפה</span>
                </h2>
                <button
                  onClick={() => setShowFindReplace(false)}
                  className="text-on-surface/50 hover:text-on-surface"
                >
                  <span className="material-symbols-outlined text-3xl">close</span>
                </button>
              </div>

              <div className="space-y-4">
                {/* Find Input */}
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">
                    חפש:
                  </label>
                  <input
                    type="text"
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    placeholder="הזן טקסט לחיפוש..."
                    className="w-full px-4 py-3 bg-white border-2 border-surface-variant rounded-lg focus:outline-none focus:border-primary transition-colors"
                    dir="rtl"
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setFindText(findText + '\\n')}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      title="שורה חדשה"
                    >
                      \n (אנטר)
                    </button>
                    <button
                      onClick={() => setFindText(findText + '\\t')}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      title="טאב"
                    >
                      \t (טאב)
                    </button>
                    <button
                      onClick={() => setFindText(findText + ' ')}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      title="רווח"
                    >
                      רווח
                    </button>
                  </div>
                </div>

                {/* Replace Input */}
                <div>
                  <label className="block text-sm font-bold text-on-surface mb-2">
                    החלף ב:
                  </label>
                  <input
                    type="text"
                    value={replaceText}
                    onChange={(e) => setReplaceText(e.target.value)}
                    placeholder="הזן טקסט חדש..."
                    className="w-full px-4 py-3 bg-white border-2 border-surface-variant rounded-lg focus:outline-none focus:border-primary transition-colors"
                    dir="rtl"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => setReplaceText(replaceText + '\\n')}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      title="שורה חדשה"
                    >
                      \n (אנטר)
                    </button>
                    <button
                      onClick={() => setReplaceText(replaceText + '\\t')}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      title="טאב"
                    >
                      \t (טאב)
                    </button>
                    <button
                      onClick={() => setReplaceText(replaceText + ' ')}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                      title="רווח"
                    >
                      רווח
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                  <div className="flex items-start gap-2 text-sm text-blue-800">
                    <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
                    <div>
                      <p className="font-bold mb-1">טיפים:</p>
                      <ul className="space-y-1">
                        <li>• החיפוש רגיש לאותיות גדולות/קטנות</li>
                        <li>• השתמש בכפתורים להוספת תווים מיוחדים</li>
                        <li>• או הקלד ידנית: <code className="bg-white px-1 rounded">\n</code> לאנטר, <code className="bg-white px-1 rounded">\t</code> לטאב</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => handleFindReplace(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors font-bold"
                  >
                    <span className="material-symbols-outlined">search</span>
                    <span>החלף ראשון</span>
                  </button>
                  <button
                    onClick={() => handleFindReplace(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
                  >
                    <span className="material-symbols-outlined">find_replace</span>
                    <span>החלף הכל</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowFindReplace(false)}
                  className="w-full px-4 py-3 border-2 border-surface-variant text-on-surface rounded-lg hover:bg-surface transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Split Dialog */}
        {showSplitDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="glass-strong rounded-2xl p-8 max-w-md w-full border-2 border-primary">
              <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-4xl text-primary">
                  splitscreen
                </span>
                <div>
                  <h3 className="text-2xl font-bold text-on-surface">פיצול עמוד</h3>
                  <p className="text-sm text-on-surface/60">חלק את העמוד לשני חלקים</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-3">
                    בחר סוג פיצול:
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-surface/50"
                      style={{ borderColor: splitMode === 'content' ? '#6b5d4f' : '#e7e0d8' }}
                    >
                      <input
                        type="radio"
                        name="splitMode"
                        value="content"
                        checked={splitMode === 'content'}
                        onChange={(e) => setSplitMode(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-primary text-sm">splitscreen</span>
                          <span className="font-bold text-on-surface">פיצול תוכן</span>
                        </div>
                        <p className="text-xs text-on-surface/70">
                          העמוד מכיל שני חלקים שונים. בהעלאה יישמרו עם כותרות.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors hover:bg-surface/50"
                      style={{ borderColor: splitMode === 'visual' ? '#6b5d4f' : '#e7e0d8' }}
                    >
                      <input
                        type="radio"
                        name="splitMode"
                        value="visual"
                        checked={splitMode === 'visual'}
                        onChange={(e) => setSplitMode(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="material-symbols-outlined text-blue-600 text-sm">visibility</span>
                          <span className="font-bold text-on-surface">חלוקה ויזואלית</span>
                        </div>
                        <p className="text-xs text-on-surface/70">
                          רק לנוחות העריכה. בהעלאה יאוחדו לטקסט אחד.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Column Names - only for content split */}
                {splitMode === 'content' && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        שם חלק 1 (טור ימני):
                      </label>
                      <input
                        type="text"
                        value={rightColumnName}
                        onChange={(e) => setRightColumnName(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface"
                        placeholder="לדוגמה: טור ראשי"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-on-surface mb-2">
                        שם חלק 2 (טור שמאלי):
                      </label>
                      <input
                        type="text"
                        value={leftColumnName}
                        onChange={(e) => setLeftColumnName(e.target.value)}
                        className="w-full px-4 py-2 border-2 border-surface-variant rounded-lg focus:outline-none focus:border-primary bg-white text-on-surface"
                        placeholder="לדוגמה: הערות"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmSplit}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors font-bold"
                >
                  <span className="material-symbols-outlined">splitscreen</span>
                  <span>פצל עמוד</span>
                </button>
                <button
                  onClick={() => setShowSplitDialog(false)}
                  className="flex-1 px-4 py-3 border-2 border-surface-variant text-on-surface rounded-lg hover:bg-surface transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Dialog */}
        {showInfoDialog && (() => {
          const instructions = getEditingInstructions()
          return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowInfoDialog(false)}>
              <div className="glass-strong rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-3xl">info</span>
                    <span>{instructions.title}</span>
                  </h2>
                  <button
                    onClick={() => setShowInfoDialog(false)}
                    className="text-on-surface/50 hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-3xl">close</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {instructions.sections.map((section, idx) => (
                    <div key={idx} className="bg-surface/30 rounded-xl p-4">
                      <h3 className="text-lg font-bold text-on-surface mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">check_circle</span>
                        {section.title}
                      </h3>
                      <ul className="space-y-2">
                        {section.items.map((item, itemIdx) => (
                          <li key={itemIdx} className="flex items-start gap-2 text-on-surface/80">
                            <span className="material-symbols-outlined text-sm text-primary mt-0.5">arrow_left</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-2 text-sm text-blue-800">
                    <span className="material-symbols-outlined text-blue-600 text-lg">lightbulb</span>
                    <div>
                      <p className="font-bold mb-1">טיפ:</p>
                      <p>השתמש בכלי OCR (Tesseract או Gemini) לזיהוי אוטומטי של הטקסט. ניתן לבחור אזור ספציפי בתמונה לזיהוי מדויק יותר.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowInfoDialog(false)}
                  className="w-full mt-6 px-4 py-3 bg-primary text-on-primary rounded-lg hover:bg-accent transition-colors font-bold"
                >
                  הבנתי, בואו נתחיל!
                </button>
              </div>
            </div>
          )
        })()}

        {/* Settings Sidebar */}
        {showSettings && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowSettings(false)}
            />

            {/* Sidebar */}
            <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined">settings</span>
                  הגדרות OCR
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* API Key Section */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 flex items-center gap-1">
                    Gemini API Key
                    <span className="text-gray-400 text-xs font-normal">(אופציונלי)</span>
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    יש מפתח ברירת מחדל. אם תרצה להשתמש במפתח שלך,
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline mr-1"
                    >
                      קבל מפתח חינם כאן
                    </a>
                  </p>
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="השאר ריק לשימוש במפתח ברירת מחדל"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                  {userApiKey ? (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      משתמש במפתח שלך
                    </p>
                  ) : (
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">info</span>
                      משתמש במפתח ברירת מחדל
                    </p>
                  )}
                </div>

                {/* Model Selection */}
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    בחירת מודל
                  </label>
                  <p className="text-xs text-gray-600 mb-3">
                    Flash - מהיר וזול (מומלץ) | Pro - מדויק יותר | 3 Pro - החדש ביותר (איטי)
                  </p>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (מומלץ)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                    <option value="gemini-3-pro-preview">Gemini 3 Pro (ניסיוני)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    נבחר: <span className="font-mono">{selectedModel}</span>
                  </p>
                </div>

                {/* Custom Prompt Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-900">
                      פרומפט מותאם אישית
                    </label>
                    <button
                      onClick={resetPrompt}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      איפוס לברירת מחדל
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">
                    ערוך את ההנחיות ל-Gemini AI. הפרומפט באנגלית עובד טוב יותר.
                  </p>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono resize-none"
                    dir="ltr"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {customPrompt.length} תווים
                  </p>
                </div>

                {/* Tips */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h3 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">lightbulb</span>
                    טיפים
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• יש מפתח ברירת מחדל - אין צורך להזין מפתח משלך</li>
                    <li>• אם תזין מפתח משלך, הוא נשמר בדפדפן בלבד</li>
                    <li>• 2.5 Flash - מהיר וזול, מומלץ לרוב המקרים</li>
                    <li>• 2.5 Pro - מדויק יותר | 3 Pro - ניסיוני ואיטי</li>
                    <li>• פרומפט באנגלית מייצר תוצאות טובות יותר</li>
                    <li>• ציין בפרומפט את סוג הטקסט (רשי, מרובע, וכו)</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
                >
                  <span className="material-symbols-outlined">save</span>
                  שמור הגדרות
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}