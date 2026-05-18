# Testing & QA — Centro Metabólico Pro

## Suite automatizada

**Framework**: Vitest (rápido, compatible Next 16, sin transpilación adicional).

```bash
npm test          # corre suite completa una vez
npm run test:watch  # modo watch durante desarrollo
npm run test:ui     # UI interactiva en navegador
```

### Cobertura actual

| Archivo | Tests | Cubre |
|---|---|---|
| `src/lib/foods.test.ts` | 29 | Helpers (estación, parse tiempo), integridad estructural de los 3 catálogos, tags clínicos en almuerzos/cenas |
| `src/lib/planGenerator.test.ts` | 27 | Estructura del plan, comidasPorDia dinámico, timing peri-entreno, opt-in snack/barra, filtros clínicos, sustitución yogur, robustez edge cases |
| `src/lib/smoke.test.ts` | 15 | 5 perfiles E2E reales: atleta hipertrofia, mujer vegana SIBO, entreno AM con opt-in, reflujo+3 comidas, paciente apurado/principiante. + coherencia matemática |
| **TOTAL** | **71** | |

### Bugs detectados y corregidos por los tests (no por el equipo)

1. **Beyond Burger faltaba `altoFODMAP: true`** — la proteína aislada de arveja + frijol mungo tiene perfil FODMAP no trivial. Test `todos los almuerzos con legumbres tienen altoFODMAP` lo detectó.

2. **`generarPlan` no filtraba por SIBO/intolerancias** — los filtros vivían solo en la UI (`MealChips`). Si el plan se generaba por otra vía (API directa, tests, futuras integraciones), los almuerzos con `altoFODMAP` se incluían igual. Test `el plan NO debe incluir almuerzos con altoFODMAP por SIBO` lo detectó.
   **Fix**: nueva función `filtrarClinico` aplicada en el pipeline del motor — defense-in-depth.

## Auditoría mobile (estática)

### ✅ Bien resuelto

- Todos los grids usan breakpoints responsivos (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`)
- Inputs numéricos usan `type="number"` correcto
- Botones toggle (Whey, etc.) tienen `aria-label`
- Selector de huevos usa `<button>` (keyboard accesible)
- Inputs tienen `focus:ring` para foco visible
- Tipografía base ≥ 12px en touch areas críticas

### ⚠️ Findings — pendientes de validar en dispositivo real

1. **Touch targets sub-44px**: muchos botones usan `py-1.5 px-1.5` (~28-32px alto). WCAG recomienda **44×44pt mínimo**. Aplica especialmente a:
   - Selector de cantidad de huevos (`w-8 h-8`)
   - Selectores de "Comidas por día" / "Habilidad culinaria" / "Presupuesto"
   - **Fix sugerido**: `py-2.5 min-h-[44px]` en mobile

2. **Texto `text-[10px]` o `text-[11px]`**: presente en disclaimers de alérgenos y badges de macros. Puede ser ilegible en pantallas pequeñas con baja agudeza visual.
   - **Fix sugerido**: subir a `text-[11px]` mínimo, o usar `text-xs` (12px)

3. **Selector de yogur con 6 fotos**: aunque ahora es `lg:grid-cols-4`, en mobile (`grid-cols-2`) ocupa 3 filas. Validar scroll natural.

4. **Toast en mobile**: posición `top-4 left-1/2` puede chocar con notch en iPhone X+. Validar `safe-area-inset-top`.

### 🆕 Mejoras de accesibilidad ya aplicadas

- Toast con `role="status"` + `aria-live="polite"` (anuncia cambios a screen readers)
- Toast visual marca `aria-hidden="true"` para no duplicar lectura
- Helper `sr-only` recomendado para iconos-solo (próxima iteración)

### Checklist QA dispositivo real (pendiente)

- [ ] iPhone 13/14 — Safari: scroll, touch targets, toast en safe area
- [ ] Android Pixel — Chrome: respuesta de toggles, performance del CatalogPicker
- [ ] Tablet — orientación portrait y landscape
- [ ] VoiceOver/TalkBack — flujo de selección de yogur, snack, barra
- [ ] Modo oscuro del SO — verificar contraste de banners (rosa, ámbar, esmeralda)

## Smoke test end-to-end

El archivo `src/lib/smoke.test.ts` simula 5 perfiles clínicos reales:

| # | Perfil | Validaciones clave |
|---|---|---|
| 1 | Hombre 30, hipertrofia, entreno PM | kcal > 2500, 5 comidas/día, once con badge post-entreno |
| 2 | Mujer 45, déficit, vegana, SIBO | kcal < TDEE, **no incluye altoFODMAP** (caso que detectó el bug) |
| 3 | Atleta entreno AM, snack+barra opt-in | snack/barra rotan en colación AM, badge post-entreno |
| 4 | Reflujo + intolerancias + 3 comidas | solo 3 meals/día, sin colación ni once, sin altaGrasa en cenas |
| 5 | Apurado + principiante + presupuesto bajo | no rompe con todos los filtros activos, macros válidos en todas las comidas |

Cada perfil ejercita el pipeline completo: `calcularNutricion → generarPlan → assertions sobre el resultado`.

## Cómo agregar tests para nuevos features

1. **Si tocas `foods.ts`**: agregar test en `foods.test.ts` validando los nuevos tags
2. **Si tocas `planGenerator.ts`**: agregar test en `planGenerator.test.ts` para la nueva lógica
3. **Si agregas un nuevo perfil clínico relevante**: nuevo smoke test en `smoke.test.ts`

Patrón recomendado:
```ts
import { baseForm } from './smoke.test'  // o crear helper local

it('mi caso clínico', () => {
  const form = baseForm({ /* overrides relevantes */ })
  const plan = generarPlan(form, 2000)
  expect(/* lo que importa clínicamente */).toBe(/* lo esperado */)
})
```

## CI/CD futuro (no implementado aún)

Recomendaciones para próxima sesión:

- [ ] GitHub Action que corre `npm test` en cada PR
- [ ] Vercel preview deploy bloquea si tests fallan
- [ ] Coverage threshold 80% en `src/lib/`
- [ ] Lint en pre-commit (husky + lint-staged)
