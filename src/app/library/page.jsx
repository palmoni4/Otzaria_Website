import Header from '@/components/Header'
import Hero from '@/components/Hero'
import Features from '@/components/Features'
import ContributeSection from '@/components/ContributeSection'
import Footer from '@/components/Footer'

export default function LibraryHome() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <ContributeSection />
      </main>
      <Footer />
    </div>
  )
}
