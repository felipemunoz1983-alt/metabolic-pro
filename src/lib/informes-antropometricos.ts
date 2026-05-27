/**
 * src/lib/informes-antropometricos.ts — Tipos y constantes compartidos.
 */

export type TipoInforme =
  | 'inbody'
  | 'isak'
  | 'dexa'
  | 'antropometria'
  | 'bioimpedancia'
  | 'otro'

export const TIPO_INFORME_LABELS: Record<TipoInforme, { label: string; emoji: string; desc: string }> = {
  inbody:        { label: 'InBody',         emoji: '⚖️',  desc: 'Bioimpedancia InBody (270/370/570/770)' },
  isak:          { label: 'ISAK',           emoji: '📐',  desc: 'Antropometría con perfil ISAK certificado' },
  dexa:          { label: 'DEXA',           emoji: '🦴',  desc: 'Absorciometría dual de rayos X' },
  antropometria: { label: 'Antropometría',  emoji: '📏',  desc: 'Medición manual con caliper y cinta' },
  bioimpedancia: { label: 'Bioimpedancia',  emoji: '⚡',  desc: 'Otras bioimpedancias (Tanita, OMRON, etc.)' },
  otro:          { label: 'Otro',           emoji: '📄',  desc: 'Otro tipo de evaluación clínica' },
}

export interface InformeAntropometrico {
  id:                    string
  paciente_id:           string
  profesional_id:        string
  storage_path:          string
  filename_original:     string | null
  file_size_bytes:       number | null
  mime_type:             string | null
  titulo:                string
  fecha_eval:            string  // ISO date
  tipo:                  TipoInforme
  metricas:              Record<string, number | string> | null
  notas:                 string | null
  visto_por_paciente_en: string | null  // ISO timestamp
  created_at:            string
  updated_at:            string
}

/** Tamaño máximo del archivo PDF (10 MB) — coincide con bucket.file_size_limit en SQL. */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Build the storage path: paciente_id/timestamp-slug.pdf */
export function buildStoragePath(pacienteId: string, originalFilename: string): string {
  const ts = new Date().toISOString().split('T')[0]
  // Slug: lowercase, sin acentos, solo alfanumérico + guiones
  const slug = originalFilename
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-80)  // cap length
  return `${pacienteId}/${ts}-${slug}`
}
