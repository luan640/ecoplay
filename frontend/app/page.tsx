import Header from '@/components/header'
import HeroSection from '@/components/hero-section'
import PromoCards from '@/components/promo-cards'
import TrustBadges from '@/components/trust-badges'
import ProductCarousel from '@/components/product-carousel'
import NewsletterSection from '@/components/newsletter-section'
import Footer from '@/components/footer'
import { fetchAllShowcases } from '@/lib/api'

export default async function HomePage() {
  const showcases = await fetchAllShowcases()
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Fixed Header */}
      <Header />

      {/* Main content offset for fixed header */}
      <main className="pt-[108px]">
        {/* Hero Section */}
        <HeroSection />

        {/* Trust Badges */}
        <TrustBadges />

        {/* Promotional Cards */}
        <PromoCards />

        {/* Product Sections */}
        {showcases.map((showcase, i) => (
          <div key={showcase.id}>
            {i === 0 && (
              <div className="max-w-screen-xl mx-auto px-4">
                <div className="border-t border-[#2e2e2e]" role="separator" />
              </div>
            )}
            <ProductCarousel
              id={showcase.slug}
              title={showcase.title || showcase.name}
              subtitle={showcase.subtitle}
              products={showcase.products}
            />
            {i < showcases.length - 1 && (
              <div className="max-w-screen-xl mx-auto px-4">
                <div className="border-t border-[#2e2e2e]" role="separator" />
              </div>
            )}
          </div>
        ))}

        {/* Newsletter Banner */}
        <NewsletterSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

