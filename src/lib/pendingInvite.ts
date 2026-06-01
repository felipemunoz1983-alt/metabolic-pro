/**
 * pendingInvite.ts
 *
 * Helper unificado para resolver el invite token pendiente desde MÚLTIPLES
 * fuentes en orden de prioridad. Antes solo se leía de localStorage, lo cual
 * fallaba cross-device: paciente abría email en celular pero se registraba en
 * laptop → localStorage vacío en la sesión nueva → trial 21d y vínculo
 * profesional perdidos.
 *
 * Fuentes en orden:
 *   1. URL query param ?invite=...  (sobrevive cross-device si Supabase
 *      preserva query en el redirect del confirm email).
 *   2. localStorage 'pendingInviteToken' (registro y confirmación en mismo device).
 *   3. sessionStorage 'pendingInviteToken' (fallback).
 *
 * IMPORTANTE: una vez consumido el token, llamar clearPendingInvite() para
 * evitar re-redención en visitas posteriores.
 */

const LS_KEY = 'pendingInviteToken'
const URL_PARAM = 'invite'

export interface PendingInvite {
  token:     string | null
  pro:       string | null
  role:      string
  nombre:    string
}

export function readPendingInvite(): PendingInvite {
  if (typeof window === 'undefined') {
    return { token: null, pro: null, role: 'individual', nombre: '' }
  }

  let token: string | null = null
  try {
    const params = new URLSearchParams(window.location.search)
    token = params.get(URL_PARAM)
  } catch { /* malformed URL */ }

  let pro: string | null = null
  let role = 'individual'
  let nombre = ''

  try {
    if (!token) {
      token = window.localStorage.getItem(LS_KEY)
        ?? window.sessionStorage.getItem(LS_KEY)
    }
    pro    = window.localStorage.getItem('pendingProfessionalId')
      ?? window.sessionStorage.getItem('pendingProfessionalId')
    role   = window.localStorage.getItem('pendingRole')
      ?? window.sessionStorage.getItem('pendingRole') ?? 'individual'
    nombre = window.localStorage.getItem('pendingNombre')
      ?? window.sessionStorage.getItem('pendingNombre') ?? ''
  } catch { /* storage no disponible */ }

  return { token, pro, role, nombre }
}

export function clearPendingInvite(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LS_KEY)
    window.localStorage.removeItem('pendingProfessionalId')
    window.localStorage.removeItem('pendingRole')
    window.localStorage.removeItem('pendingNombre')
    window.sessionStorage.removeItem(LS_KEY)
    window.sessionStorage.removeItem('pendingProfessionalId')
    window.sessionStorage.removeItem('pendingRole')
    window.sessionStorage.removeItem('pendingNombre')
    // También limpiar el query param de la URL si vino por ahí
    const params = new URLSearchParams(window.location.search)
    if (params.has(URL_PARAM)) {
      params.delete(URL_PARAM)
      const newSearch = params.toString()
      const newUrl = window.location.pathname
        + (newSearch ? `?${newSearch}` : '')
        + window.location.hash
      window.history.replaceState({}, '', newUrl)
    }
  } catch { /* noop */ }
}
