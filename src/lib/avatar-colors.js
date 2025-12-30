// פונקציה ליצירת צבע ייחודי לכל משתמש לפי השם
export function getAvatarColor(name) {
  if (!name) return '#6b5d4f' // צבע ברירת מחדל
  
  // מערך צבעים יפים ומגוונים
  const colors = [
    '#FF6B6B', // אדום
    '#4ECDC4', // טורקיז
    '#45B7D1', // כחול בהיר
    '#FFA07A', // כתום בהיר
    '#98D8C8', // ירוק מנטה
    '#F7DC6F', // צהוב
    '#BB8FCE', // סגול בהיר
    '#85C1E2', // כחול שמיים
    '#F8B739', // כתום זהב
    '#52B788', // ירוק
    '#E63946', // אדום כהה
    '#457B9D', // כחול כהה
    '#F77F00', // כתום
    '#06FFA5', // ירוק ניאון
    '#C77DFF', // סגול
    '#FF006E', // ורוד
    '#8338EC', // סגול כהה
    '#3A86FF', // כחול
    '#FB5607', // כתום אדום
    '#FFBE0B', // צהוב זהב
  ]
  
  // חישוב hash מהשם
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
    hash = hash & hash // המרה ל-32bit integer
  }
  
  // בחירת צבע לפי ה-hash
  const index = Math.abs(hash) % colors.length
  return colors[index]
}

// פונקציה לקבלת האות הראשונה
export function getInitial(name) {
  if (!name) return 'U'
  return name.charAt(0).toUpperCase()
}