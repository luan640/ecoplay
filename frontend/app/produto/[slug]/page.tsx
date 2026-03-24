import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Star } from 'lucide-react'
import Header from '@/components/header'
import Footer from '@/components/footer'
import ProductImageGallery from '@/components/product-image-gallery'
import ProductBuyBox from '@/components/product-buy-box'
import ProductCarousel from '@/components/product-carousel'
import ProductReviews from '@/components/product-reviews'
import { fetchProductBySlug, fetchProducts, fetchShowcase } from '@/lib/api'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = await fetchProductBySlug(slug)
  if (!product) return { title: 'Produto não encontrado' }

  return {
    title: `${product.title} – Game Shop`,
    description: product.description,
  }
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = await fetchProductBySlug(slug)
  if (!product) notFound()

  const [productsResult, recentes] = await Promise.all([
    fetchProducts({ platform: product.platform ?? '', page: 1, page_size: 7 }),
    fetchShowcase('recentes'),
  ])

  const related = (productsResult.results ?? [])
    .filter((p) => p.id !== product.id)
    .slice(0, 6)

  const fullStars = Math.floor(product.rating)
  const hasHalf = product.rating % 1 >= 0.5

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      <Header />

      <main className="pt-[108px]">
        {/* Breadcrumb */}
        <div className="max-w-screen-xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-1.5 text-xs text-[#666666]" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-[#49e4e6] transition-colors">
              Início
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/" className="hover:text-[#49e4e6] transition-colors capitalize">
              {product.category === 'jogo' ? 'Jogos' : 'Consoles'}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/" className="hover:text-[#49e4e6] transition-colors">
              {product.platform}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#888888] line-clamp-1">{product.title}</span>
          </nav>
        </div>

        {/* Product Section */}
        <section className="max-w-screen-xl mx-auto px-4 pb-12" aria-label={product.title}>
          <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
            {/* Gallery */}
            <ProductImageGallery images={product.images} title={product.title} />

            {/* Buy Box */}
            <div className="flex flex-col gap-6">
              {/* Rating row */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5" aria-label={`Avaliação: ${product.rating} de 5`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= fullStars
                          ? 'fill-[#49e4e6] text-[#49e4e6]'
                          : s === fullStars + 1 && hasHalf
                          ? 'fill-[#49e4e6]/50 text-[#49e4e6]'
                          : 'fill-[#2e2e2e] text-[#2e2e2e]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[#49e4e6] text-sm font-bold">{product.rating.toFixed(1)}</span>
                <span className="text-[#555555] text-sm">({product.reviewCount} avaliações)</span>
              </div>

              <ProductBuyBox product={product} />
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="border-t border-[#2e2e2e]" />
        </div>

        {/* Description + Details */}
        <section className="max-w-screen-xl mx-auto px-4 py-10" aria-label="Informações do produto">
          <div className="grid md:grid-cols-2 gap-10">
            {/* Description */}
            <div>
              <h2 className="text-[#f5f5f5] text-xl font-black mb-4">
                Descrição
                <span className="block w-10 h-0.5 bg-[#49e4e6] mt-2" />
              </h2>
              <p className="text-[#aaaaaa] leading-relaxed text-sm">{product.description}</p>
            </div>

            {/* Details table */}
            <div>
              <h2 className="text-[#f5f5f5] text-xl font-black mb-4">
                Ficha técnica
                <span className="block w-10 h-0.5 bg-[#49e4e6] mt-2" />
              </h2>
              <dl className="divide-y divide-[#2e2e2e] border border-[#2e2e2e] rounded-2xl overflow-hidden">
                {product.details.map(({ label, value }) => (
                  <div key={label} className="flex items-start gap-4 px-5 py-3.5 odd:bg-[#141414] even:bg-[#1a1a1a]">
                    <dt className="text-[#888888] text-sm font-semibold w-36 flex-shrink-0">{label}</dt>
                    <dd className="text-[#f5f5f5] text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="border-t border-[#2e2e2e]" />
        </div>

        {/* Payment Methods */}
        <section className="max-w-screen-xl mx-auto px-4 py-10" aria-label="Formas de pagamento">
          <h2 className="text-[#f5f5f5] text-xl font-black mb-6">
            Formas de pagamento
            <span className="block w-10 h-0.5 bg-[#49e4e6] mt-2" />
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                method: 'PIX',
                detail: `${formatCurrency(product.pixPrice)} à vista`,
                highlight: true,
                badge: '5% de desconto',
              },
              {
                method: 'Cartão de crédito',
                detail: `${product.installments}x de ${formatCurrency(product.installmentPrice)} sem juros`,
                highlight: false,
                badge: 'Sem juros',
              },
              {
                method: 'Boleto bancário',
                detail: `${formatCurrency(product.pixPrice)} à vista`,
                highlight: false,
                badge: '5% de desconto',
              },
            ].map(({ method, detail, highlight, badge }) => (
              <div
                key={method}
                className={`rounded-2xl border p-5 flex flex-col gap-2 ${
                  highlight
                    ? 'border-[#22c55e]/40 bg-[#166534]/10'
                    : 'border-[#2e2e2e] bg-[#141414]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${highlight ? 'text-[#22c55e]' : 'text-[#f5f5f5]'}`}>
                    {method}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      highlight
                        ? 'bg-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-[#49e4e6]/10 text-[#49e4e6]'
                    }`}
                  >
                    {badge}
                  </span>
                </div>
                <span className="text-[#aaaaaa] text-sm">{detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Divider */}
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="border-t border-[#2e2e2e]" />
        </div>

        {/* Reviews */}
        <div className="max-w-screen-xl mx-auto px-4">
          <div className="border-t border-[#2e2e2e]" />
        </div>

        <ProductReviews productSlug={product.slug} />

        {/* Related Products */}
        {related.length > 0 && (
          <ProductCarousel
            id="relacionados"
            title="Você também pode gostar"
            subtitle={`Mais produtos de ${product.platform}`}
            products={related}
          />
        )}

        {/* Divider */}
        {recentes.length > 0 && (
          <div className="max-w-screen-xl mx-auto px-4">
            <div className="border-t border-[#2e2e2e]" />
          </div>
        )}

        {/* Recentes no site */}
        {recentes.length > 0 && (
          <ProductCarousel
            id="recentes"
            title="Recentes no site"
            subtitle="Adicionados nas últimas 24 horas"
            products={recentes}
          />
        )}
      </main>

      <Footer />
    </div>
  )
}
