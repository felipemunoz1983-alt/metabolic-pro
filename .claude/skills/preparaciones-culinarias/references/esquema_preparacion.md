# Esquema `opcion` extendido — definición completa

Este es el contrato de datos de la skill `preparaciones-culinarias`. **Extiende**
el objeto `opciones[]` que el plan de NutriApp Pro ya define en
`nutriapp-pro/references/schemas.md` (sección 2, Plan nutricional). Mantiene los
4 campos originales para ser backward-compatible y agrega lo culinario/nutricional.

## Por qué se extiende en vez de crear algo nuevo

La regla de NutriApp Pro es explícita: *"No inventes campos paralelos: si falta
algo, extiende el schema existente y deja nota en el changelog."* Una `opcion`
generada por esta skill debe poder pegarse directo en
`plan.tiempos_comida[].opciones[]` sin transformación. La app que sólo conoce los
4 campos originales sigue funcionando; la app actualizada aprovecha los nuevos.

## Campos

### Originales (de NutriApp Pro — obligatorios, no renombrar)

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | string | Nombre de la preparación |
| `preparacion` | string | Descripción en prosa: ingredientes + modo, en una frase usable |
| `porcion_casera` | string | Equivalente en medidas caseras chilenas |
| `notas_digestivas` | string \| null | Advertencia/ajuste digestivo, o `null` si no aplica |

### Extensión culinaria

| Campo | Tipo | Descripción |
|---|---|---|
| `ingredientes` | array | Lista de `{alimento, gramos, medida_casera}` |
| `pasos` | array[string] | Pasos de preparación, en orden |

### Extensión nutricional

| Campo | Tipo | Descripción |
|---|---|---|
| `aporte_porcion` | object | `{kcal, proteina_g, carbohidrato_g, grasa_g, fibra_g}` por porción |
| `fit_vs_target` | object \| null | `{proteina_pct, carbohidrato_pct, grasa_pct}` cobertura vs target del tiempo de comida |

### Extensión meta (filtros y experiencia)

| Campo | Tipo | Enum / formato |
|---|---|---|
| `meta.tiempo_min` | int | minutos de preparación |
| `meta.dificultad` | string | `facil` \| `media` \| `avanzada` |
| `meta.cocina` | string | `chilena` \| `mediterranea` \| `asiatica` \| `mexicana` \| `libre` |
| `meta.temporada` | array | subconjunto de `verano` `otono` `invierno` `primavera` |
| `meta.presupuesto` | string | `bajo` \| `medio` \| `alto` |
| `meta.apto_para` | array | tags libres: `sin_lacteos`, `sin_gluten`, `bajo_fodmap`, `vegetariano`, etc. |
| `meta.timing` | string | `ninguno` \| `pre_entreno` \| `post_entreno` |

## Ejemplo canónico

```json
{
  "nombre": "Salteado de pollo, quínoa y verduras",
  "preparacion": "Saltear 95 g de pechuga de pollo en cubos con 1 cdita de aceite de oliva; agregar 160 g de quínoa cocida y 100 g de zapallo italiano más 1/2 pimentón. Sazonar con limón, comino y cilantro.",
  "porcion_casera": "1.5 tazas de quínoa + 1 palma de pollo + 1.5 tazas de verduras",
  "notas_digestivas": "Bien tolerado post-entreno; bajo FODMAP si se modera el pimentón.",
  "ingredientes": [
    {"alimento": "pechuga de pollo", "gramos": 95, "medida_casera": "1 palma"},
    {"alimento": "quínoa cocida", "gramos": 160, "medida_casera": "1.5 tazas"},
    {"alimento": "zapallo italiano", "gramos": 100, "medida_casera": "3/4 taza"},
    {"alimento": "pimentón", "gramos": 60, "medida_casera": "1/2 unidad"},
    {"alimento": "aceite de oliva", "gramos": 4, "medida_casera": "1 cdita"}
  ],
  "pasos": [
    "Calentar el aceite a fuego medio-alto.",
    "Saltear el pollo en cubos 6-7 min hasta dorar.",
    "Agregar verduras y cocinar 4 min.",
    "Incorporar la quínoa cocida, sazonar y servir."
  ],
  "aporte_porcion": {"kcal": 420, "proteina_g": 38, "carbohidrato_g": 40, "grasa_g": 11, "fibra_g": 7},
  "fit_vs_target": {"proteina_pct": 101, "carbohidrato_pct": 98, "grasa_pct": 99},
  "meta": {
    "tiempo_min": 15,
    "dificultad": "facil",
    "cocina": "chilena",
    "temporada": ["otono", "invierno"],
    "presupuesto": "medio",
    "apto_para": ["sin_lacteos", "sin_gluten"],
    "timing": "post_entreno"
  }
}
```

## Nota de extensión sugerida (para el changelog de NutriApp Pro)

> | 1.1 | (fecha) | `opciones[]` del plan extendido por skill preparaciones-culinarias: + ingredientes, pasos, aporte_porcion, fit_vs_target, meta. Backward-compatible. |

## Validación antes de entregar

- Cada macro de `aporte_porcion` dentro de **±10 %** del target (revisar `fit_vs_target`).
- Ningún ingrediente en `alergias` ni `alimentos_rechazados` del paciente.
- `notas_digestivas` poblada si hay intolerancias/digestivo relevante.
- `meta.temporada` coherente con el mes actual si no se pidió lo contrario.
- kcal coherente con macros (el script valida con Atwater; desvío <8 %).
