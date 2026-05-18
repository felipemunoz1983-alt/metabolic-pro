import { describe, it, expect } from 'vitest'
import {
  getCurrentSeason,
  parseTiempoMin,
  tiempoCocinarMax,
  YOGUR_TIPOS,
  SNACK_NUTREVO_TIPOS,
  BARRA_PROTEINA_TIPOS,
  desayunosOpts,
  almuerzosOpts,
  cenasOpts,
  colacionesOpts,
  getMealOption,
  type MealOption,
} from './foods'

describe('foods.ts — helpers', () => {
  describe('getCurrentSeason', () => {
    it('devuelve "frio" o "calor"', () => {
      const s = getCurrentSeason()
      expect(['frio', 'calor']).toContain(s)
    })

    it('mes 5 (mayo) en Chile = frio', () => {
      const original = Date.now
      Date.now = () => new Date(2026, 4, 17).getTime()  // mayo 17, 2026
      // re-import not needed; getCurrentSeason calls new Date() internally
      const realDate = Date
      global.Date = class extends realDate {
        constructor() {
          super()
          return new realDate(2026, 4, 17)
        }
      } as DateConstructor
      expect(getCurrentSeason()).toBe('frio')
      global.Date = realDate
      Date.now = original
    })

    it('mes 12 (diciembre) en Chile = calor', () => {
      const realDate = Date
      global.Date = class extends realDate {
        constructor() {
          super()
          return new realDate(2026, 11, 17)  // diciembre = mes 11 (0-indexed)
        }
      } as DateConstructor
      expect(getCurrentSeason()).toBe('calor')
      global.Date = realDate
    })
  })

  describe('parseTiempoMin', () => {
    it('parsea "20 min" → 20', () => {
      const opt = { tiempo: '20 min' } as MealOption
      expect(parseTiempoMin(opt)).toBe(20)
    })

    it('parsea "5 min + reposo 2h" → 5 (primer número)', () => {
      const opt = { tiempo: '5 min + reposo 2h' } as MealOption
      expect(parseTiempoMin(opt)).toBe(5)
    })

    it('respeta tiempoMin explícito si está presente', () => {
      const opt = { tiempo: '20 min', tiempoMin: 45 } as MealOption
      expect(parseTiempoMin(opt)).toBe(45)
    })

    it('default 30 cuando no hay tiempo', () => {
      const opt = {} as MealOption
      expect(parseTiempoMin(opt)).toBe(30)
    })
  })

  describe('tiempoCocinarMax', () => {
    it('mapea los rangos UI correctamente', () => {
      expect(tiempoCocinarMax('menos_15')).toBe(15)
      expect(tiempoCocinarMax('15_30')).toBe(30)
      expect(tiempoCocinarMax('30_60')).toBe(60)
      expect(tiempoCocinarMax('mas_60')).toBe(Infinity)
    })

    it('undefined → 30 (default razonable)', () => {
      expect(tiempoCocinarMax(undefined)).toBe(30)
    })
  })

  describe('getMealOption', () => {
    it('devuelve la opción por índice módulo', () => {
      const keys = ['pollo_arroz', 'salmon_quinoa']
      const r1 = getMealOption(almuerzosOpts, keys, 0)
      const r2 = getMealOption(almuerzosOpts, keys, 1)
      const r3 = getMealOption(almuerzosOpts, keys, 2)  // wrap
      expect(r1).toBe(almuerzosOpts.pollo_arroz)
      expect(r2).toBe(almuerzosOpts.salmon_quinoa)
      expect(r3).toBe(almuerzosOpts.pollo_arroz)
    })

    it('fallback al primer item del pool si keys vacío', () => {
      const r = getMealOption(almuerzosOpts, [], 0)
      expect(r).toBe(Object.values(almuerzosOpts)[0])
    })

    it('fallback si key no existe en pool', () => {
      const r = getMealOption(almuerzosOpts, ['inexistente'], 0)
      expect(r).toBe(Object.values(almuerzosOpts)[0])
    })
  })
})

describe('Catálogos — integridad estructural', () => {
  describe('YOGUR_TIPOS', () => {
    it('cada entrada tiene todos los campos clínicos requeridos', () => {
      Object.entries(YOGUR_TIPOS).forEach(([key, info]) => {
        expect(info.label, `${key}.label`).toBeTruthy()
        expect(info.emoji, `${key}.emoji`).toBeTruthy()
        expect(info.item, `${key}.item`).toBeTruthy()
        expect(info.kcal, `${key}.kcal`).toBeGreaterThan(0)
        expect(info.p, `${key}.p`).toBeGreaterThanOrEqual(0)
        expect(info.foto, `${key}.foto`).toMatch(/^https?:\/\//)
        expect(typeof info.vegano, `${key}.vegano`).toBe('boolean')
        expect(typeof info.vegetariano, `${key}.vegetariano`).toBe('boolean')
        expect(Array.isArray(info.contiene), `${key}.contiene`).toBe(true)
      })
    })

    it('al menos un yogur es vegano (Loncoleche Vegetal)', () => {
      const veganos = Object.values(YOGUR_TIPOS).filter(y => y.vegano === true)
      expect(veganos.length).toBeGreaterThanOrEqual(1)
    })

    it('Loncoleche Vegetal contiene soya', () => {
      expect(YOGUR_TIPOS.loncoleche_vegetal.contiene).toContain('soya')
    })

    it('Danone Oikos contiene lactosa', () => {
      expect(YOGUR_TIPOS.griego.contiene).toContain('lactosa')
    })

    it('Colun Protein Plus es el más limpio (contiene vacío)', () => {
      expect(YOGUR_TIPOS.colun_protein.contiene.length).toBe(0)
    })
  })

  describe('SNACK_NUTREVO_TIPOS', () => {
    it('Moroketo y Volki son veganos', () => {
      expect(SNACK_NUTREVO_TIPOS.moroketo.vegano).toBe(true)
      expect(SNACK_NUTREVO_TIPOS.volki_coco.vegano).toBe(true)
    })

    it('Alfajor Activa2 contiene lactosa (whey)', () => {
      expect(SNACK_NUTREVO_TIPOS.alfajor_activa2.contiene).toContain('lactosa')
    })
  })

  describe('BARRA_PROTEINA_TIPOS', () => {
    it('ninguna barra es vegana (todas contienen leche)', () => {
      const veganas = Object.values(BARRA_PROTEINA_TIPOS).filter(b => (b.vegano as boolean) === true)
      expect(veganas.length).toBe(0)
    })

    it('todas las barras contienen lactosa', () => {
      Object.entries(BARRA_PROTEINA_TIPOS).forEach(([key, b]) => {
        expect(b.contiene, `${key} debe contener lactosa`).toContain('lactosa')
      })
    })
  })

  describe('Almuerzos y cenas — tags clínicos', () => {
    it('todos los almuerzos con legumbres tienen altoFODMAP true', () => {
      Object.entries(almuerzosOpts).forEach(([key, opt]) => {
        if (opt.contiene?.includes('legumbres')) {
          expect(opt.altoFODMAP, `${key} con legumbres debe ser altoFODMAP`).toBe(true)
        }
      })
    })

    it('todas las cenas con legumbres tienen altoFODMAP true', () => {
      Object.entries(cenasOpts).forEach(([key, opt]) => {
        if (opt.contiene?.includes('legumbres')) {
          expect(opt.altoFODMAP, `${key} con legumbres debe ser altoFODMAP`).toBe(true)
        }
      })
    })

    it('Beyond Burger tiene altaGrasa por sello chileno', () => {
      expect(almuerzosOpts.beyond_burger.altaGrasa).toBe(true)
    })

    it('sopas están etiquetadas como frio', () => {
      expect(cenasOpts.sopa_pollo.estacional).toBe('frio')
      expect(cenasOpts.sopa_lentejas.estacional).toBe('frio')
    })

    it('ensaladas y bowls fríos están etiquetados como calor', () => {
      expect(almuerzosOpts.ensalada_proteica_alm.estacional).toBe('calor')
      expect(cenasOpts.atun_ensalada.estacional).toBe('calor')
      expect(cenasOpts.bowl_lentejas_aguacate.estacional).toBe('calor')
    })
  })

  describe('Almuerzos y cenas — flag tieneCarne y consistencia', () => {
    it('cada comida con tieneCarne tiene carneTipo y carneGramosBase definidos', () => {
      [almuerzosOpts, cenasOpts].forEach(pool => {
        Object.entries(pool).forEach(([key, opt]) => {
          if (opt.tieneCarne) {
            expect(opt.carneTipo, `${key} debe tener carneTipo`).toBeDefined()
            expect(opt.carneGramosBase, `${key} debe tener carneGramosBase`).toBeGreaterThan(0)
          }
        })
      })
    })

    it('carneTipo es un valor válido del CARNE_MACROS_POR_GRAMO', () => {
      const tiposValidos = ['pollo', 'pavo', 'carne_roja', 'salmon', 'atun']
      ;[almuerzosOpts, cenasOpts].forEach(pool => {
        Object.entries(pool).forEach(([key, opt]) => {
          if (opt.carneTipo) {
            expect(tiposValidos, `${key} carneTipo`).toContain(opt.carneTipo)
          }
        })
      })
    })

    it('items contienen el gramaje base como texto "Ng"', () => {
      ;[almuerzosOpts, cenasOpts].forEach(pool => {
        Object.entries(pool).forEach(([key, opt]) => {
          if (opt.tieneCarne && opt.carneGramosBase) {
            const itemsText = opt.items.join(' ')
            const regex = new RegExp(`\\b${opt.carneGramosBase}\\s*g\\b`)
            expect(itemsText, `${key} items deben mencionar ${opt.carneGramosBase}g`).toMatch(regex)
          }
        })
      })
    })

    it('platos vegetarianos NO tienen tieneCarne', () => {
      ;[almuerzosOpts, cenasOpts].forEach(pool => {
        Object.entries(pool).forEach(([key, opt]) => {
          if (opt.tendencia?.includes('vegano')) {
            expect(opt.tieneCarne, `${key} vegano no debe tener tieneCarne`).toBeFalsy()
          }
        })
      })
    })
  })

  describe('Desayunos — flag whey', () => {
    it('hay al menos un desayuno con requiereWhey true', () => {
      const withWhey = Object.values(desayunosOpts).filter(d => d.requiereWhey)
      expect(withWhey.length).toBeGreaterThan(0)
    })
  })

  describe('Colaciones — ya no tienen branded (snack/barra solo via selectores)', () => {
    it('no existen keys de barras branded en colacionesOpts', () => {
      const branded = [
        'wild_protein_col',
        'protein_bite_bw_col',
        'twentys_hazelnut_col',
        'moroketo_col',
        'alfajor_keto_col',
        'snack_favorito',
        'barra_favorita',
      ]
      branded.forEach(k => {
        expect(colacionesOpts[k], `${k} debe estar eliminada de colacionesOpts`).toBeUndefined()
      })
    })

    it('colaciones naturales siguen presentes', () => {
      expect(colacionesOpts.yogur_frutossecos_am).toBeTruthy()
      expect(colacionesOpts.hummus_verduras).toBeTruthy()
      expect(colacionesOpts.fruta_proteina).toBeTruthy()
    })
  })
})
