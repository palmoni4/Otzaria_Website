'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function OtzariaSoftwareHeader() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/library', label: 'ספריית אוצריא' },
    { href: '/#download', label: 'הורדה' },
    { href: '/docs', label: 'מדריכים' },
    { href: '/faq', label: 'שאלות נפוצות' },
    { href: '/donate', label: 'תרומות' },
    { href: '/about', label: 'אודות' },
    { href: 'https://forum.otzaria.org', label: 'פורום' }
  ]

  return (
    <header className="sticky top-0 z-50 w-full glass-strong">
      <div className="container mx-auto flex h-16 items-center justify-between px-8">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity mr-4">
          <img src="/logo.png" alt="לוגו אוצריא" className="w-12 h-12" />
          <span className="text-xl font-bold text-black" style={{ fontFamily: 'FrankRuehl, serif' }}>אוצריא</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-on-surface hover:text-primary transition-colors font-medium ${
                pathname === link.href ? 'text-primary font-bold' : ''
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        
        <button className="md:hidden text-on-surface">
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>
    </header>
  )
}
