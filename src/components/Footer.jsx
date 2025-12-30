import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-surface to-surface-variant py-16 px-4 mt-20">
      <div className="container mx-auto max-w-6xl">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="לוגו אוצריא" width={40} height={40} className="rounded-lg" />
              <span className="text-2xl font-bold text-primary" style={{ fontFamily: 'FrankRuehl, serif' }}>ספריית אוצריא</span>
            </div>
            <p className="text-on-surface/70 text-lg leading-relaxed mb-6">
              פלטפורמה משותפת לעריכה ושיתוף של ספרי קודש.<br />
              שימור המורשת התורנית והנגשתה לכל.
            </p>
            <div className="flex gap-3">
              <Link 
                href="/library" 
                className="px-6 py-2.5 bg-primary text-on-primary rounded-lg hover:bg-accent transition-all hover:scale-105 shadow-md font-medium"
              >
                לספרייה
              </Link>
              <Link 
                href="/upload" 
                className="px-6 py-2.5 bg-surface text-on-surface rounded-lg hover:bg-surface-variant transition-all border border-outline font-medium"
              >
                הוסף ספר
              </Link>
            </div>
          </div>
          
          {/* Quick Links - Internal */}
          <div>
            <h3 className="font-bold mb-4 text-on-surface text-lg">קישורים מהירים</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-on-surface/70 hover:text-primary transition-colors flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-sm">link</span>
                  אוצריא - תוכנה
                </Link>
              </li>
              <li>
                <Link href="/library" className="text-on-surface/70 hover:text-primary transition-colors flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-sm">link</span>
                  הספרייה
                </Link>
              </li>
              <li>
                <Link href="/library/users" className="text-on-surface/70 hover:text-primary transition-colors flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-sm">link</span>
                  משתמשים
                </Link>
              </li>
              <li>
                <Link href="/library/dashboard" className="text-on-surface/70 hover:text-primary transition-colors flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-sm">link</span>
                  איזור אישי
                </Link>
              </li>
            </ul>
          </div>

          {/* External Links */}
          <div>
            <h3 className="font-bold mb-4 text-on-surface text-lg">קישורים חיצוניים</h3>
            <ul className="space-y-3">
              <li>
                <a href="https://github.com/Y-PLONI/otzaria-library" target="_blank" rel="noopener noreferrer" className="text-on-surface/70 hover:text-primary transition-colors flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  GitHub - ספריית אוצריא
                </a>
              </li>
              <li>
                <a href="https://mitmachim.top/topic/90100/%D7%91%D7%A7%D7%A9%D7%94-%D7%94%D7%A4%D7%A8%D7%95%D7%99%D7%A7%D7%98-%D7%94%D7%A9%D7%99%D7%AA%D7%95%D7%A4%D7%99-%D7%94%D7%97%D7%93%D7%A9-%D7%9E%D7%91%D7%99%D7%AA-%D7%90%D7%95%D7%A6%D7%A8%D7%99%D7%90-%D7%95%D7%96%D7%99%D7%AA-%D7%94%D7%95%D7%A1%D7%A4%D7%AA-%D7%A1%D7%A4%D7%A8%D7%99%D7%9D-%D7%97%D7%A1%D7%A8%D7%99%D7%9D" target="_blank" rel="noopener noreferrer" className="text-on-surface/70 hover:text-primary transition-colors flex items-center gap-2 group">
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  מתמחים טופ
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-outline/20 pt-8 text-center">
          <p className="text-on-surface/60 text-sm">
            © {new Date().getFullYear()} ספריית אוצריא. כל הזכויות שמורות.
          </p>
        </div>
      </div>
    </footer>
  )
}
