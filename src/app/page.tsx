import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import ContributeSection from '@/components/ContributeSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* תפריט עליון */}
      <Header />
      
      <main className="flex-1">
        {/* אזור ראשי עם כותרת וכפתורים */}
        <Hero />
        
        {/* רשימת הפיצ'רים */}
        <Features />
        
        {/* קריאה לפעולה / תרומה */}
        <ContributeSection />
      </main>
      
      {/* תחתית הדף */}
      <Footer />
    </div>
  );
}