export type UserRole = 'patient' | 'professional' | 'individual'
export type UserPlan = 'gratuito' | 'professional' | 'patient' | 'individual'
export type PlanType = 'professional' | 'patient' | 'individual'

export interface Profile {
  id: string
  email: string
  nombre: string
  role: UserRole
  plan: UserPlan
  created_at: string
  professional_id?: string
  whatsapp?: string
  premium_until?: string
  trial_ends_at?: string
}

// ── Trial helpers ──────────────────────────────────────────────────────────────

/** True while the patient's free trial is still active */
export function isOnTrial(profile: Profile): boolean {
  if (!profile.trial_ends_at) return false
  return new Date(profile.trial_ends_at) > new Date()
}

/** Days remaining in trial (0 if expired or no trial) */
export function trialDaysLeft(profile: Profile): number {
  if (!profile.trial_ends_at) return 0
  const ms = new Date(profile.trial_ends_at).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

/** True if the user can access the app (paid OR on active trial) */
export function hasAccess(profile: Profile): boolean {
  return profile.plan !== 'gratuito' || isOnTrial(profile)
}

export interface NutritionalPlan {
  id: string
  user_id: string
  professional_id?: string
  objetivo: string
  kcal: number
  proteina: number
  carbohidrato: number
  grasa: number
  plan_json: Record<string, unknown>
  created_at: string
}

export interface DailyLog {
  id: string
  user_id: string
  fecha: string
  kcal: number
  proteina: number
  carbohidrato: number
  grasa: number
  adherencia: boolean
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
