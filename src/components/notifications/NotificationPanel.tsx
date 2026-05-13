'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCheck, AlertTriangle, Info, CheckCircle2, AlertOctagon } from 'lucide-react'
import type { AppNotification, NotifLevel } from '@/lib/notifications'
import { cn } from '@/lib/utils'

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL: Record<NotifLevel, {
  icon: React.ElementType
  bg: string
  iconColor: string
  border: string
  dot: string
}> = {
  ok:      { icon: CheckCircle2,  bg: 'bg-emerald-50', iconColor: 'text-emerald-500', border: 'border-emerald-100', dot: 'bg-emerald-400' },
  info:    { icon: Info,          bg: 'bg-blue-50',    iconColor: 'text-blue-500',    border: 'border-blue-100',    dot: 'bg-blue-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-50',   iconColor: 'text-amber-500',   border: 'border-amber-100',   dot: 'bg-amber-400' },
  alert:   { icon: AlertOctagon,  bg: 'bg-red-50',     iconColor: 'text-red-500',     border: 'border-red-100',     dot: 'bg-red-500' },
}

// ─── Relative time ────────────────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60000)
  const hr   = Math.floor(diff / 3600000)
  const day  = Math.floor(diff / 86400000)
  if (min < 1)  return 'Ahora mismo'
  if (min < 60) return `Hace ${min} min`
  if (hr  < 24) return `Hace ${hr}h`
  return `Hace ${day}d`
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifRow({ notif, isRead }: { notif: AppNotification; isRead: boolean }) {
  const cfg = LEVEL[notif.level]
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={cn(
        'flex gap-3 p-3.5 rounded-xl border transition-all',
        cfg.bg, cfg.border,
        !isRead && 'ring-1 ring-offset-0',
        !isRead && notif.level === 'alert'   && 'ring-red-200',
        !isRead && notif.level === 'warning' && 'ring-amber-200',
        !isRead && notif.level === 'ok'      && 'ring-emerald-200',
        !isRead && notif.level === 'info'    && 'ring-blue-200',
        isRead && 'opacity-70'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon size={16} className={cfg.iconColor} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-[12px] font-bold leading-tight', isRead ? 'text-[#4A6070]' : 'text-[#0C1F2C]')}>
            {notif.title}
          </p>
          <span className="text-[10px] text-[#8BA5BE] font-medium flex-shrink-0 mt-0.5">
            {relativeTime(notif.time)}
          </span>
        </div>
        <p className={cn('text-[11px] mt-1 leading-relaxed', isRead ? 'text-[#8BA5BE]' : 'text-[#3D5A6C]')}>
          {notif.body}
        </p>
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-1', cfg.dot)} />
      )}
    </motion.div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#EAF4FB] to-[#D6E8F5] flex items-center justify-center mb-3">
        <Bell size={22} className="text-[#8BA5BE]" />
      </div>
      <p className="text-sm font-bold text-[#0C3547]">Sin notificaciones</p>
      <p className="text-xs text-[#8BA5BE] mt-1">Todo está al día por ahora.</p>
    </div>
  )
}

// ─── Panel principal ──────────────────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
  notifications: AppNotification[]
  readIds: Set<string>
  loading: boolean
  onMarkAllRead: () => void
}

export function NotificationPanel({ open, onClose, notifications, readIds, loading, onMarkAllRead }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handle(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [open, onClose])

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length
  const alerts  = notifications.filter(n => n.level === 'alert')
  const warnings = notifications.filter(n => n.level === 'warning')
  const rest    = notifications.filter(n => n.level !== 'alert' && n.level !== 'warning')
  const ordered = [...alerts, ...warnings, ...rest]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={cn(
            'absolute right-0 top-full mt-2 z-50',
            'w-[340px] max-w-[calc(100vw-16px)]',
            'bg-white border border-[#E2ECF4] rounded-2xl shadow-xl overflow-hidden',
          )}
          style={{ maxHeight: 'min(520px, calc(100vh - 80px))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#E2ECF4] bg-[#F8FBFD]">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#29ABE2]" />
              <span className="text-sm font-bold text-[#0C1F2C]">Notificaciones</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black bg-[#29ABE2] text-white px-1.5 py-0.5 rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-[10px] font-semibold text-[#8BA5BE] hover:text-[#29ABE2] px-2 py-1 rounded-lg hover:bg-[#EAF4FB] transition"
                >
                  <CheckCheck size={12} />
                  Marcar todas
                </button>
              )}
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-[#8BA5BE] hover:text-[#0C1F2C] hover:bg-[#F0F6FA] transition"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(520px - 52px)' }}>
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-[#F0F6FA] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : ordered.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="p-3 space-y-2">
                <AnimatePresence>
                  {ordered.map(notif => (
                    <NotifRow
                      key={notif.id}
                      notif={notif}
                      isRead={readIds.has(notif.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
