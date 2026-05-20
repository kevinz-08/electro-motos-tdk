import { ImageResponse } from 'next/og'
import { getCachedProductBySlug } from '@/lib/cache'

export const runtime = 'nodejs'
export const alt = 'Producto — H2R Online Store'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ slug: string }>
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

const FALLBACK = (
  <div
    style={{
      display: 'flex',
      width: '100%',
      height: '100%',
      backgroundColor: '#0f172a',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <div style={{ fontSize: '52px', fontWeight: '900', color: '#ffffff' }}>
      H2R Online Store
    </div>
  </div>
)

export default async function OgImage({ params }: Props) {
  const { slug } = await params
  const result = await getCachedProductBySlug(slug)

  if (!result.ok) {
    return new ImageResponse(FALLBACK, { width: 1200, height: 630 })
  }

  const product = result.value
  const imageUrl = product.images[0] ?? null
  const name =
    product.name.length > 55 ? product.name.slice(0, 52) + '…' : product.name

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        {/* Left panel — dark with product info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            padding: '56px 60px',
            backgroundColor: '#0f172a',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#0ea5e9',
              }}
            />
            <div
              style={{ fontSize: '20px', color: '#0ea5e9', fontWeight: '700' }}
            >
              H2R Online Store
            </div>
          </div>

          {/* Product info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div
              style={{
                fontSize: '46px',
                fontWeight: '900',
                color: '#ffffff',
                lineHeight: 1.15,
              }}
            >
              {name}
            </div>

            <div
              style={{ fontSize: '38px', fontWeight: '800', color: '#0ea5e9' }}
            >
              {formatCOP(product.price)}
            </div>

            {product.stock > 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#052e16',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  width: 'fit-content',
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                  }}
                />
                <div
                  style={{
                    fontSize: '20px',
                    color: '#10b981',
                    fontWeight: '600',
                  }}
                >
                  En stock
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#450a0a',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  width: 'fit-content',
                }}
              >
                <div
                  style={{
                    fontSize: '20px',
                    color: '#f87171',
                    fontWeight: '600',
                  }}
                >
                  Agotado
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right panel — product image */}
        <div
          style={{
            display: 'flex',
            width: '480px',
            backgroundColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name}
              style={{
                maxWidth: '400px',
                maxHeight: '400px',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div style={{ fontSize: '120px' }}>📦</div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
