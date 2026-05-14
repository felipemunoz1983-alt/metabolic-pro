/**
 * /opengraph-image.tsx — Auto-detected by Next.js App Router.
 * Generates the og:image for the root (/) page at build/request time.
 * Served at /opengraph-image (Next.js handles the route automatically).
 *
 * Design: dark premium card — matching landing page branding.
 * 1200 × 630 px (standard OG size, also works for Twitter cards).
 */
import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt         = 'Centro Metabólico Pro — Nutrición clínica con IA'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: 'linear-gradient(135deg, #060F1A 0%, #0C1F2C 45%, #0C3547 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow blobs */}
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 400, height: 400,
          background: 'rgba(41,171,226,0.07)',
          borderRadius: '50%',
          filter: 'blur(60px)',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -60,
          width: 350, height: 350,
          background: 'rgba(41,171,226,0.05)',
          borderRadius: '50%',
          filter: 'blur(50px)',
        }} />

        {/* Content container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px 72px',
          width: '100%',
          height: '100%',
        }}>

          {/* Top: logo + tagline chip */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52,
                background: 'linear-gradient(135deg, #29ABE2, #1a6fa0)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(41,171,226,0.35)',
              }}>
                {/* Pulse icon — simplified SVG */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>
                  CENTRO METABÓLICO
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#29ABE2', letterSpacing: 3, textTransform: 'uppercase' }}>
                  PRO CLINICAL ENGINE
                </span>
              </div>
            </div>

            {/* Trial pill */}
            <div style={{
              background: 'rgba(41,171,226,0.12)',
              border: '1.5px solid rgba(41,171,226,0.35)',
              borderRadius: 100,
              padding: '8px 20px',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#29ABE2' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#29ABE2' }}>7 días gratis · Sin tarjeta</span>
            </div>
          </div>

          {/* Middle: headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              fontSize: 56, fontWeight: 900, color: '#fff',
              lineHeight: 1.1, letterSpacing: -1,
            }}>
              Nutrición clínica<br />
              <span style={{ color: '#29ABE2' }}>impulsada por IA</span>
            </div>
            <div style={{
              fontSize: 20, color: '#4A7A94', fontWeight: 400,
              maxWidth: 560, lineHeight: 1.5,
            }}>
              Planes nutricionales personalizados, seguimiento diario de adherencia
              y asistente inteligente para pacientes y profesionales.
            </div>
          </div>

          {/* Bottom: feature pills + URL */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            {/* Feature pills */}
            <div style={{ display: 'flex', gap: 10 }}>
              {[
                { icon: '🧮', label: 'Plan IA clínica' },
                { icon: '🔥', label: 'Racha diaria' },
                { icon: '📊', label: 'Dashboard' },
                { icon: '👨‍⚕️', label: 'Panel profesional' },
              ].map(f => (
                <div
                  key={f.label}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 10,
                    padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{f.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9EC8E0' }}>{f.label}</span>
                </div>
              ))}
            </div>

            {/* URL */}
            <span style={{ fontSize: 14, color: '#4A7A94', fontWeight: 600 }}>
              centrometabolico.cl
            </span>
          </div>

        </div>
      </div>
    ),
    { ...size }
  )
}
