export default function OtzariaSoftwareFooter() {
  return (
    <footer className="bg-gradient-to-b from-surface to-surface-variant py-12 px-4 mt-20">
      <div className="container mx-auto max-w-6xl text-center">
        <p className="text-on-surface/80 mb-2">
          תוכנה זו נוצרה והוקדשה על ידי המפתחים והתורמים של פרויקט אוצריא
        </p>
        <p className="text-on-surface/60">
          קוד פתוח תחת רישיון Unlicense | 
          <a 
            href="https://github.com/sivan22/otzaria" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:text-accent transition-colors mr-2"
          >
            GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
