'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export default function LibraryNotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* 404 Number */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mb-8"
            >
              <span className="text-9xl font-bold text-primary" style={{ fontFamily: 'FrankRuehl, serif' }}>
                404
              </span>
            </motion.div>

            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="mb-6"
            >
              <span className="material-symbols-outlined text-8xl text-primary/60">
                menu_book_off
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-4xl font-bold text-on-surface mb-4"
              style={{ fontFamily: 'FrankRuehl, serif' }}
            >
              הדף לא נמצא
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-xl text-on-surface/70 mb-8"
            >
              מצטערים, הדף שחיפשת בספריית אוצריא אינו קיים או הועבר למקום אחר
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/library"
                className="px-8 py-4 bg-primary text-on-primary rounded-lg text-lg font-medium hover:bg-accent transition-colors shadow-lg hover:shadow-xl"
              >
                חזרה לספרייה
              </Link>
              <Link
                href="/library/books"
                className="px-8 py-4 glass border-2 border-primary text-primary rounded-lg text-lg font-medium hover:bg-primary-container transition-colors"
              >
                לרשימת הספרים
              </Link>
            </motion.div>

            {/* Suggestions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 p-6 glass-strong rounded-xl"
            >
              <h3 className="text-lg font-bold text-on-surface mb-4">אולי תרצה לבקר ב:</h3>
              <div className="grid sm:grid-cols-2 gap-3 text-right">
                <Link href="/library/books" className="p-3 bg-surface-variant hover:bg-surface rounded-lg transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">library_books</span>
                  <span>רשימת הספרים</span>
                </Link>
                <Link href="/library/users" className="p-3 bg-surface-variant hover:bg-surface rounded-lg transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">group</span>
                  <span>משתמשים</span>
                </Link>
                <Link href="/library/upload" className="p-3 bg-surface-variant hover:bg-surface rounded-lg transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">upload</span>
                  <span>שליחת ספרים</span>
                </Link>
                <Link href="/" className="p-3 bg-surface-variant hover:bg-surface rounded-lg transition-colors flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">home</span>
                  <span>אוצריא - תוכנה</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
