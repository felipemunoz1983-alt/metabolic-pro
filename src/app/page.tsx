/**
 * Public landing page — shown to unauthenticated visitors at /
 * Server component (no auth, fully static-renderable).
 */
import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ─── Icons (inline SVG to avoid client bundle) ────────────────────────────────
function Icon({ d, size = 20, className, style }: { d: string; size?: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={style}>
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  check:   'M20 6 9 17l-5-5',
  flame:   'M8.5 14.5A2.5 2.5 0 0011 17c1.38 0 2.5-1.12 2.5-2.5 0-1-.57-1.88-1.4-2.33L9 11s.5-2 3-3.5c0 0-5 1-5 5.5 0 0-.5-1.5 1.5-3',
  brain:   'M9.5 2A2.5 2.5 0 0112 4.5v15a2.5 2.5 0 01-4.96-.44 2.5 2.5 0 01-2.96-3.08 3 3 0 01-.34-5.58 2.5 2.5 0 013.76-3.4zm5 0A2.5 2.5 0 0012 4.5v15a2.5 2.5 0 004.96-.44 2.5 2.5 0 002.96-3.08 3 3 0 00.34-5.58 2.5 2.5 0 00-3.76-3.4z',
  chart:   'M3 3v18h18M7 16l4-4 4 4 4-4',
  users:   'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m18-5a3 3 0 00-3-3m3 3a3 3 0 013-3M16 7a4 4 0 11-8 0 4 4 0 018 0m6 4a3 3 0 11-6 0 3 3 0 016 0',
  lock:    'M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zm-7 4v4M12 11V7a4 4 0 00-8 0v4',
  star:    'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  arrow:   'M5 12h14m-7-7 7 7-7 7',
  activity:'M22 12h-4l-3 9L9 3l-3 9H2',
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: ICONS.brain,
    title: 'Plan nutricional con IA clínica',
    desc: 'Motor Harris-Benedict + Cunningham con ajuste digestivo automático. No es una calculadora genérica.',
    color: 'text-[#29ABE2]',
    bg: 'bg-[#EAF4FB]',
  },
  {
    icon: ICONS.flame,
    title: 'Registro diario con racha',
    desc: 'Checklist de comidas, bienestar, peso y racha de días consecutivos. La app que hace que vuelvas todos los días.',
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  {
    icon: ICONS.chart,
    title: 'Dashboard de adherencia y progreso',
    desc: 'Evolución de peso, adherencia 30d, macros y alertas clínicas. Todo en una pantalla.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  {
    icon: ICONS.users,
    title: 'Panel profesional completo',
    desc: 'Gestiona pacientes, genera planes, monitorea adherencia y envía mensajes directos sin salir de la app.',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    icon: ICONS.brain,
    title: 'Asistente IA 24/7',
    desc: 'Chat nutricional basado en Claude. Responde dudas, sugiere sustituciones y adapta el plan en tiempo real.',
    color: 'text-[#29ABE2]',
    bg: 'bg-[#EAF4FB]',
  },
  {
    icon: ICONS.lock,
    title: 'Datos clínicos seguros',
    desc: 'Infraestructura con cifrado en tránsito y en reposo. Tus datos nunca se venden ni se comparten.',
    color: 'text-[#8BA5BE]',
    bg: 'bg-[#F0F6FA]',
  },
]

const PLANS = [
  {
    name: 'Plan Paciente',
    price: '7.000',
    sublabel: 'Con seguimiento de tu nutricionista',
    color: '#10b981',
    bg: 'bg-green-50',
    border: 'border-green-200',
    features: ['Registro diario', 'Plan de tu profesional', 'Asistente IA', 'Historial completo'],
  },
  {
    name: 'Plan Individual',
    price: '12.990',
    sublabel: 'Autónomo, sin necesitar profesional',
    color: '#8b5cf6',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    featured: true,
    features: ['Generador de plan propio', 'Registro diario + racha', 'Asistente IA', 'Alertas clínicas'],
  },
  {
    name: 'Plan Profesional',
    price: '14.990',
    sublabel: 'Para nutricionistas y clínicas',
    color: '#29ABE2',
    bg: 'bg-[#EAF4FB]',
    border: 'border-[#29ABE2]/30',
    features: ['Panel de pacientes', 'Dashboard de adherencia', 'Mensajes directos', 'Asistente IA'],
  },
]

const TESTIMONIALS = [
  {
    text: 'Llevo 3 meses con el plan individual. Lo que más valoro es tenerlo todo en un lugar: plan, registro y chat IA cuando tengo dudas.',
    name: 'Valentina R.',
    role: 'Santiago',
    initials: 'VR',
    grad: 'from-purple-400 to-purple-600',
  },
  {
    text: 'Mis pacientes se enganchan con el registro diario y la racha de días. La adherencia mejoró notablemente desde que los incorporé.',
    name: 'Nicolás C.',
    role: 'Nutricionista · Viña del Mar',
    initials: 'NC',
    grad: 'from-[#29ABE2] to-[#1a6fa0]',
  },
  {
    text: 'Antes usaba Excel para registrar lo que comía. Ahora tengo el plan personalizado, el chat y todo sincronizado. No volvería atrás.',
    name: 'Catalina M.',
    role: 'Concepción',
    initials: 'CM',
    grad: 'from-green-400 to-green-600',
  },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0C1F2C]">

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E2ECF4]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-lg flex items-center justify-center">
              <Icon d={ICONS.activity} size={14} className="text-white" />
            </div>
            <span className="font-black text-sm text-[#0C1F2C]">
              Centro Metabólico <span className="text-[#29ABE2]">Pro</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[#6B7C93] hover:text-[#0C1F2C] font-medium transition hidden sm:block"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold bg-[#29ABE2] text-white px-4 py-2 rounded-xl hover:bg-[#1a8fc2] transition"
            >
              Probar gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-[#060F1A] via-[#0C1F2C] to-[#0C3547] text-white">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#29ABE2]/15 border border-[#29ABE2]/30 text-[#29ABE2] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <Icon d={ICONS.star} size={12} />
            Prueba gratuita de 7 días — sin tarjeta de crédito
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
            Nutrición clínica<br />
            <span className="text-[#29ABE2]">inteligente para Chile</span>
          </h1>

          <p className="text-lg text-[#9EC8E0] max-w-2xl mx-auto leading-relaxed mb-10">
            Plan nutricional personalizado con motor clínico, registro diario con racha, asistente IA 24/7 y panel profesional — todo en una sola app.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 bg-[#29ABE2] text-white font-bold px-8 py-4 rounded-xl hover:bg-[#1a8fc2] transition text-base"
            >
              Comenzar gratis
              <Icon d={ICONS.arrow} size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/20 transition text-base border border-white/20"
            >
              Ya tengo cuenta
            </Link>
          </div>

          {/* Social proof strip */}
          <p className="mt-8 text-xs text-[#4A7A94]">
            Nutricionistas · Pacientes · Personas que quieren mejorar su alimentación
          </p>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="border-b border-[#E2ECF4] bg-[#F8FBFD]">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            {[
              { value: '3 planes', label: 'por rol: paciente, individual y profesional' },
              { value: '7 días',   label: 'de prueba gratuita completa, sin restricciones' },
              { value: '100%',     label: 'chileno · Transbank · datos en Chile' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl font-black text-[#0C3547]">{s.value}</p>
                <p className="text-[11px] text-[#8BA5BE] mt-1 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[#29ABE2] mb-3">Funciones</p>
          <h2 className="text-3xl font-black text-[#0C1F2C]">Todo lo que necesitas, nada que no necesitas</h2>
          <p className="text-[#6B7C93] mt-3 max-w-xl mx-auto text-sm leading-relaxed">
            Construida por nutricionistas y profesionales de la salud. No es una calculadora de calorías — es un sistema clínico completo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div key={i} className="bg-white border border-[#E2ECF4] rounded-2xl p-6 hover:shadow-md transition-shadow">
              <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4', f.bg)}>
                <Icon d={f.icon} size={20} className={f.color} />
              </div>
              <h3 className="font-bold text-[#0C1F2C] mb-2">{f.title}</h3>
              <p className="text-sm text-[#6B7C93] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── For who ── */}
      <section className="bg-[#F8FBFD] border-y border-[#E2ECF4]">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-[#29ABE2] mb-3">¿Para quién es?</p>
            <h2 className="text-3xl font-black text-[#0C1F2C]">Un plan para cada perfil</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: '🏥',
                title: 'Profesionales de salud',
                desc: 'Genera planes clínicos para tus pacientes, monitorea adherencia, recibe alertas de intervención y envía mensajes desde tu panel.',
                items: ['Panel de pacientes completo', 'Motor clínico Harris-Benedict', 'Alertas de baja adherencia', 'Mensajes directos'],
                color: '#29ABE2',
              },
              {
                emoji: '🙋',
                title: 'Pacientes',
                desc: 'Accede al plan que generó tu nutricionista, registra tu día, y mantén el seguimiento con tu profesional de salud.',
                items: ['Plan de tu nutricionista', 'Registro diario guiado', 'Chat con IA 24/7', 'Historial completo'],
                color: '#10b981',
              },
              {
                emoji: '💪',
                title: 'Usuarios individuales',
                desc: 'Genera tu propio plan, registra tu progreso y usa el asistente IA para adaptar tu alimentación sin depender de un profesional.',
                items: ['Generador de plan propio', 'Racha de días 🔥', 'Evolución de peso', 'Alertas clínicas IA'],
                color: '#8b5cf6',
              },
            ].map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-[#E2ECF4] p-6 shadow-sm">
                <div className="text-3xl mb-3">{p.emoji}</div>
                <h3 className="font-black text-[#0C1F2C] mb-2">{p.title}</h3>
                <p className="text-sm text-[#6B7C93] leading-relaxed mb-4">{p.desc}</p>
                <ul className="space-y-2">
                  {p.items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-[#0C1F2C]">
                      <Icon d={ICONS.check} size={14} style={{ color: p.color } as React.CSSProperties} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-[#29ABE2] mb-3">Precios</p>
          <h2 className="text-3xl font-black text-[#0C1F2C]">Simple y transparente</h2>
          <p className="text-[#6B7C93] mt-3 text-sm">
            7 días de prueba gratuita en todos los planes. Sin tarjeta de crédito.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={cn(
                'rounded-2xl border p-6 relative',
                plan.featured
                  ? 'bg-gradient-to-b from-[#0C1F2C] to-[#0C3547] text-white border-[#29ABE2]/30 shadow-xl'
                  : `bg-white ${plan.border}`
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#29ABE2] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                    Más popular
                  </span>
                </div>
              )}
              <p className={cn('text-xs font-bold mb-1', plan.featured ? 'text-[#29ABE2]' : 'text-[#8BA5BE]')}
                style={{ color: plan.featured ? '#29ABE2' : plan.color }}>
                {plan.name}
              </p>
              <div className="flex items-baseline gap-1 mb-1">
                <span className={cn('text-3xl font-black', plan.featured ? 'text-white' : 'text-[#0C1F2C]')}>
                  ${plan.price}
                </span>
                <span className={cn('text-xs', plan.featured ? 'text-[#4A7A94]' : 'text-[#8BA5BE]')}>/mes</span>
              </div>
              <p className={cn('text-[11px] mb-5', plan.featured ? 'text-[#4A7A94]' : 'text-[#8BA5BE]')}>
                {plan.sublabel}
              </p>
              <ul className="space-y-2 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Icon d={ICONS.check} size={13}
                      className={plan.featured ? 'text-[#29ABE2]' : ''}
                      style={!plan.featured ? { color: plan.color } as React.CSSProperties : undefined} />
                    <span className={plan.featured ? 'text-[#9EC8E0]' : 'text-[#6B7C93]'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={cn(
                  'block w-full text-center py-3 rounded-xl font-bold text-sm transition',
                  plan.featured
                    ? 'bg-[#29ABE2] text-white hover:bg-[#1a8fc2]'
                    : 'border-2 hover:opacity-80'
                )}
                style={!plan.featured ? { borderColor: plan.color, color: plan.color } as React.CSSProperties : undefined}
              >
                Comenzar gratis
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="bg-[#F8FBFD] border-y border-[#E2ECF4]">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-[#29ABE2] mb-3">Testimonios</p>
            <h2 className="text-3xl font-black text-[#0C1F2C]">Lo que dicen nuestros usuarios</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white border border-[#E2ECF4] rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <Icon key={s} d={ICONS.star} size={13} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-[#0C1F2C] leading-relaxed italic mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className={cn('w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white text-xs font-black', t.grad)}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#0C1F2C]">{t.name}</p>
                    <p className="text-[10px] text-[#8BA5BE]">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gradient-to-br from-[#060F1A] via-[#0C1F2C] to-[#0C3547]">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center text-white">
          <h2 className="text-3xl font-black mb-4">
            Tu plan nutricional<br />
            <span className="text-[#29ABE2]">empieza hoy</span>
          </h2>
          <p className="text-[#9EC8E0] text-sm mb-8 max-w-lg mx-auto leading-relaxed">
            7 días gratis, sin tarjeta de crédito. En 5 minutos tienes tu plan personalizado con motor clínico.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-[#29ABE2] text-white font-black px-10 py-4 rounded-xl hover:bg-[#1a8fc2] transition text-base"
          >
            Crear mi cuenta gratis
            <Icon d={ICONS.arrow} size={18} />
          </Link>
          <p className="text-[10px] text-[#4A7A94] mt-4">
            Sin tarjeta · Sin contrato · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E2ECF4] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] rounded-lg flex items-center justify-center">
              <Icon d={ICONS.activity} size={12} className="text-white" />
            </div>
            <span className="text-sm font-black text-[#0C1F2C]">
              Centro Metabólico <span className="text-[#29ABE2]">Pro</span>
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#8BA5BE]">
            <Link href="/login"    className="hover:text-[#0C1F2C] transition">Iniciar sesión</Link>
            <Link href="/register" className="hover:text-[#0C1F2C] transition">Registrarse</Link>
          </div>
          <p className="text-[10px] text-[#C8D8E4]">
            © {new Date().getFullYear()} Centro Metabólico Pro · Hecho en Chile 🇨🇱
          </p>
        </div>
      </footer>
    </div>
  )
}
