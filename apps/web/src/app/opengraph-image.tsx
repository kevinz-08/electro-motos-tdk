import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'H2R Online Store — Repuestos y Servicios para Motos en Colombia'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0f172a',
          padding: '80px',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            width: '80px',
            height: '6px',
            backgroundColor: '#0ea5e9',
            borderRadius: '3px',
            marginBottom: '36px',
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: '76px',
            fontWeight: '900',
            color: '#ffffff',
            lineHeight: 1.05,
            marginBottom: '28px',
          }}
        >
          H2R Online Store
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: '30px',
            color: '#94a3b8',
            lineHeight: 1.5,
            maxWidth: '720px',
          }}
        >
          Repuestos originales y servicio técnico para motos eléctricas y a gasolina en Colombia
        </div>

        {/* Bottom-right domain badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '80px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#0ea5e9',
            }}
          />
          <div style={{ fontSize: '22px', color: '#475569' }}>
            h2r-store.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
