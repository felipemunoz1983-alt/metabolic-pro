export type UserRole = 'patient' | 'professional'
export type UserPlan = 'gratuito' | 'premium'

export interface Profile {
  id: string
  email: string
  nombre: string
  role: UserRole
  plan: UserPlan
  created_at: string
  professional_id?: string
  whatsapp?: string
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
