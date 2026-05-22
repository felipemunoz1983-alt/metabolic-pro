'use client'

/**
 * WelcomePostRegister — modal de onboarding tras el primer login del paciente.
 *
 * Aparece sólo una vez (recordado en localStorage) y guía 2 pasos críticos
 * para que el paciente realmente reciba notificaciones cuando su plan esté listo:
 *
 *   1. Instalar la PWA en la pantalla principal
 *   2. Activar notificaciones push
 *
 * Cada paso se marca "✓ Listo" cuando se completa (detección automática vía
 * los hooks usePWAInstall y usePushNotifications). Si ambos pasos ya están
 * hechos o el navegador no los soporta, el modal NO se muestra.
 *
 * Se cierra:
 *  - automáticamente cuando ambos pasos están en estado completado
 *  - manualmente con "Continuar"
 * Cualquiera de los dos casos marca la key en localStorage para no volver.
 */

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Smartphone, Bell, ArrowRight, Loader2 } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'
import { usePushNotifications } from '@/hooks/usePushNotifications'

const DISMISSED_KEY = 'cmp_welcome_onboarding_done_v1'

interface Props {
  /** User id necesario para usePushNotifications */
  userId: string
  /** Si el paciente acaba de vincularse a un profesional (más relevante el push) */
  hasProfessional: boolean
}

export function WelcomePostRegister({ userId, hasProfessional }: Props) {
  const [open, setOpen] = useState(false)
  const { installState, promptInstall } = usePWAInstall()
  const { supported: pushSupported, permission, subscribed, requesting, subscribe } = usePushNotifications(userId)

  // Sólo lo abrimos si:
  //   - aún no se marcó como hecho
  //   - el paciente está vinculado a un profesional (es donde tiene mayor valor)
  //   - hay al menos un paso pendiente
  /* eslint-disable react-hooks/set-state-in-effect -- one-shot mount decision based on browser APIs */
  useEffect(() => {
    if (!hasProfessional) return
    let dismissed = false
    try { dismissed = !!localStorage.getItem(DISMISSED_KEY) } catch { /* no storage */ }
    if (dismissed) return

    const installDone = installState === 'installed'
    const pushDone    = subscribed || permission === 'denied' || !pushSupported
    if (installDone && pushDone) return

    // Pequeño delay para no agredir al usuario apenas entra al dashboard
    const t = setTimeout(() => setOpen(true), 1500)
    return () => clearTimeout(t)
  }, [hasProfessional, installState, subscribed, permission, pushSupported])
  /* eslint-enable react-hooks/set-state-in-effect */

  const installDone = installState === 'installed'
  const pushDone    = subscribed
  const pushBlocked = permission === 'denied'
  const allDone     = installDone && (pushDone || pushBlocked || !pushSupported)

  // Cuando ambos pasos se completan, cerramos y persistimos.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- close on completion
  useEffect(() => {
    if (open && allDone) {
      try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* noop */ }
      const t = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(t)
    }
  }, [open, allDone])

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch { /* noop */ }
    setOpen(false)
  }

  async function handleInstall() {
    try { await promptInstall() } catch { /* user dismissed */ }
  }

  async function handleEnablePush() {
    if (requesting || subscribed) return
    try { await subscribe() } catch { /* user dismissed permission */ }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-4"
        onClick={dismiss}
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-[#29ABE2]/10 to-[#0C3547]/5 border-b border-[#E2ECF4]">
            <div className="w-10 h-1 bg-[#E2ECF4] rounded-full mx-auto mb-4 sm:hidden" />
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/60 text-[#8BA5BE] transition"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#29ABE2] to-[#1a6fa0] flex items-center justify-center text-2xl shadow-sm shadow-[#29ABE2]/30">
                🥗
              </div>
              <div>
                <p className="text-base font-black text-[#0C1F2C]">¡Bienvenido!</p>
                <p className="text-xs text-[#6B7C93]">2 pasos para no perderte tu plan</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {/* Paso 1: Instalar PWA */}
            <StepCard
              done={installDone}
              icon={<Smartphone size={20} className="text-[#29ABE2]" />}
              stepNumber={1}
              title="Instala la app"
              description={
                installState === 'ios'
                  ? 'Toca Compartir en Safari → "Agregar a pantalla de inicio"'
                  : installState === 'installed'
                  ? 'Ya está instalada en tu pantalla de inicio'
                  : 'Para acceso rápido y notificaciones desde la pantalla principal'
              }
              actionLabel={
                installState === 'installed' ? '✓ Listo'
                : installState === 'ios'     ? 'Ver instrucciones'
                : 'Instalar ahora'
              }
              actionDisabled={installState !== 'available'}
              onAction={handleInstall}
              hideAction={installState === 'installed' || installState === 'unsupported'}
            />

            {/* Paso 2: Activar push */}
            <StepCard
              done={pushDone}
              icon={<Bell size={20} className={pushDone ? 'text-emerald-500' : 'text-[#29ABE2]'} />}
              stepNumber={2}
              title="Activa las notificaciones"
              description={
                pushBlocked
                  ? 'Bloqueadas. Habilítalas desde los ajustes del navegador.'
                  : pushDone
                  ? 'Te avisaremos cuando tu plan esté listo y al inicio de cada día.'
                  : !pushSupported
                  ? 'Tu navegador no soporta notificaciones push.'
                  : 'Recibe un aviso instantáneo cuando tu profesional genere tu plan.'
              }
              actionLabel={
                requesting        ? 'Solicitando permiso...'
                : pushDone        ? '✓ Activadas'
                : pushBlocked     ? 'Bloqueadas'
                : !pushSupported  ? 'No disponible'
                                  : 'Activar'
              }
              actionDisabled={requesting || pushDone || pushBlocked || !pushSupported}
              onAction={handleEnablePush}
              loading={requesting}
              hideAction={pushDone || pushBlocked || !pushSupported}
            />

            {/* Footer CTA */}
            <button
              onClick={dismiss}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0C3547] to-[#145272] text-white font-bold text-sm hover:opacity-90 transition"
            >
              {allDone ? '¡Listo! Continuar' : 'Continuar de todos modos'}
              <ArrowRight size={14} />
            </button>
            <p className="text-[10px] text-center text-[#8BA5BE]">
              Podrás activar esto más tarde desde tu perfil.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── StepCard ────────────────────────────────────────────────────────────────
interface StepCardProps {
  done: boolean
  icon: React.ReactNode
  stepNumber: number
  title: string
  description: string
  actionLabel: string
  actionDisabled?: boolean
  onAction: () => void | Promise<void>
  loading?: boolean
  hideAction?: boolean
}

function StepCard({
  done, icon, stepNumber, title, description, actionLabel,
  actionDisabled, onAction, loading, hideAction,
}: StepCardProps) {
  return (
    <div
      className={`relative rounded-2xl border-2 p-4 transition-all ${
        done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#F8FBFD] border-[#E2ECF4]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          done ? 'bg-emerald-100' : 'bg-white border border-[#E2ECF4]'
        }`}>
          {done ? <CheckCircle size={20} className="text-emerald-500" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              done ? 'text-emerald-600' : 'text-[#8BA5BE]'
            }`}>
              Paso {stepNumber}
            </span>
            {done && <span className="text-[10px] text-emerald-600 font-bold">· Completado</span>}
          </div>
          <p className="text-sm font-bold text-[#0C1F2C] mb-1">{title}</p>
          <p className="text-xs text-[#6B7C93] leading-relaxed">{description}</p>
        </div>
      </div>
      {!hideAction && !done && (
        <button
          onClick={() => onAction()}
          disabled={actionDisabled}
          className="mt-3 w-full py-2.5 rounded-xl bg-[#29ABE2] text-white text-xs font-bold hover:bg-[#1a8fc2] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={12} className="animate-spin" />}
          {actionLabel}
        </button>
      )}
    </div>
  )
}
