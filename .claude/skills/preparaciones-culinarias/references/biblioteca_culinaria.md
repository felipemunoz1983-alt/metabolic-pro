# Biblioteca culinaria — técnicas, swaps y estacionalidad

Recurso para los Modos A (receta) y B (variantes). Consúltalo cuando necesites
sustituir un alimento por restricción, generar variantes con el mismo perfil de
macros, o ajustar a la temporada.

## 1. Swaps por intolerancia / digestivo

Mantén el macro dominante al sustituir. Deja siempre `notas_digestivas`.

| Si el paciente no tolera… | Reemplaza por… | Mantiene |
|---|---|---|
| Lácteos (lactosa) | Yogur sin lactosa, bebida de almendras, quesillo deslactosado | Proteína / calcio |
| Legumbres (FODMAP) | Pollo, pescado, tofu firme, quínoa | Proteína |
| Gluten | Arroz, quínoa, papa, camote, tortilla de maíz | Carbohidrato |
| Crucíferas (hinchazón) | Zapallo italiano, espinaca, lechuga, zanahoria cocida | Fibra suave |
| Cebolla/ajo (FODMAP) | Parte verde del cebollín, aceite de oliva infusionado, jengibre | Sabor base |
| Manzana/pera (fructosa) | Frutilla, arándano, naranja, plátano maduro firme | Fruta |

**Reglas bajo-FODMAP útiles** (para hinchazón frecuente o sospecha SIBO, sin diagnosticar):
- Porciones de fruta moderadas (1 unidad), preferir bajas en fructosa.
- Evitar legumbres en grandes cantidades; si se usan, bien cocidas y en porción acotada.
- Verduras mejor cocidas que crudas en la cena.
- Limitar lácteos altos en lactosa; preferir maduros/deslactosados.

## 2. Swaps por presupuesto

| Premium | Económico (mismo rol) |
|---|---|
| Salmón | Jurel, reineta, atún en lata |
| Quínoa | Arroz, avena, papa |
| Almendras | Maní |
| Yogur griego | Yogur natural batido + clara |
| Lomo de cerdo | Pollo trutro sin piel |

## 3. Variantes por cocina (mismo perfil, distinta experiencia)

Para Modo B. Toma una matriz proteína+CHO+vegetal y cámbiale la "gramática" de sabor:

| Cocina | Sazón / ácido | Grasa | Técnica típica |
|---|---|---|---|
| Chilena | Comino, ají de color, limón, cilantro | Aceite de oliva | Guiso, cazuela, salteado |
| Mediterránea | Orégano, limón, ajo, tomate | Oliva, aceitunas | Al horno, ensalada tibia |
| Asiática | Salsa de soya baja en sodio, jengibre, sésamo | Aceite de sésamo | Salteado wok, vapor |
| Mexicana | Comino, paprika, limón, cilantro | Palta | Bowl, fajita sin tortilla |

Ejemplo de una misma base (pollo + arroz/quínoa + verdura) en 3 cocinas:
1. **Chilena**: salteado con comino, pimentón y cilantro.
2. **Asiática**: salteado al wok con soya baja en sodio, jengibre y sésamo.
3. **Mediterránea**: al horno con limón, orégano y tomate cherry.

Los macros se mantienen porque los ingredientes estructurales son iguales; sólo cambian sazón y técnica (que aportan kcal mínimas si se controla la grasa añadida).

## 4. Variantes por técnica y textura

Cambiar la técnica cambia la experiencia sin tocar los macros estructurales:
- **Salteado** → rápido, textura firme.
- **Al horno** → más sabor tostado, menos atención.
- **Sopa/crema/guiso** → reconfortante, ideal en frío y para saciedad.
- **Ensalada tibia / bowl** → fresco, ideal en calor.
- **Wrap/colación fría** → portátil para oficina.

## 5. Estacionalidad (clave en Chile, estaciones marcadas)

Detecta el mes/temporada y filtra preparaciones. Por qué importa: nadie quiere
ensalada fría en julio en Santiago ni cazuela caliente en enero — la temperatura
de la preparación es un driver de adherencia subestimado.

| Temporada (hemisferio sur) | Meses | Preferir | Evitar |
|---|---|---|---|
| Verano | dic-feb | Bowls fríos, ensaladas, ceviche, gazpacho, frutas frescas, batidos | Guisos pesados, sopas calientes |
| Otoño | mar-may | Salteados tibios, cremas suaves, horneados | — |
| Invierno | jun-ago | Cazuelas, sopas, cremas, guisos, infusiones | Ensaladas frías como plato único |
| Primavera | sep-nov | Salteados, ensaladas tibias, parrilla magra | — |

Regla práctica: en frío, sube la proporción de preparaciones calientes y
reconfortantes (sopa/crema/guiso) manteniendo los macros. En calor, baja la
temperatura del plato (bowls, ensaladas, fríos) sin bajar la proteína.

## 6. Timing peri-entrenamiento

Si el paciente entrena y la preparación es para pre/post entreno:
- **Pre-entreno (1-2 h antes)**: CHO de digestión cómoda + proteína moderada, baja grasa y fibra para no pesar (ej. arroz + pollo + poca verdura).
- **Post-entreno (ventana ~1-2 h)**: proteína de buena disponibilidad (20-40 g) + CHO para reponer glucógeno (ej. yogur griego + fruta + avena, o pollo + quínoa). Marca `"timing": "post_entreno"` en el JSON.
