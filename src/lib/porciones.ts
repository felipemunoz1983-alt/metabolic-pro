/**
 * Sistema de intercambios alimentarios para planificación por porciones.
 *
 * Estándar clínico chileno: 6 grupos de intercambio según INTA-UCH y la
 * práctica nutricional de Sochinut. Los valores macro de cada intercambio
 * son datos factuales de composición de alimentos (INTA Chile, USDA
 * FoodData Central, etiquetas oficiales chilenas).
 *
 * Filosofía: una "porción" dentro de un grupo aporta macros similares
 * (no exactamente iguales — error clínicamente aceptable ±15%) y es
 * intercambiable libremente. Esto le da al paciente flexibilidad para
 * elegir según gusto / disponibilidad / presupuesto.
 *
 * Referencias:
 *   - Atalah E, Castillo C. Manual de Alimentación y Nutrición. INTA-UCH.
 *   - Carrasco F. Nutrición Clínica. Sochinut.
 *   - MINSAL Guías Alimentarias para Chile 2022.
 *   - USDA FoodData Central (cross-validación).
 */

export type GrupoPorcion = 'lacteos' | 'frutas' | 'verduras' | 'cereales' | 'proteinas' | 'grasas'

export const GRUPO_PORCION_LABELS: Record<GrupoPorcion, { label: string; emoji: string; descKcal: number }> = {
  lacteos:   { label: 'Lácteos',          emoji: '🥛', descKcal: 90 },
  frutas:    { label: 'Frutas',           emoji: '🍎', descKcal: 60 },
  verduras:  { label: 'Verduras',         emoji: '🥦', descKcal: 25 },
  cereales:  { label: 'Cereales/Féculas', emoji: '🍞', descKcal: 80 },
  proteinas: { label: 'Proteínas',        emoji: '🍗', descKcal: 75 },
  grasas:    { label: 'Grasas',           emoji: '🥑', descKcal: 45 },
}

export interface IntercambioPorcion {
  /** Descripción genérica para el paciente (ej. "1 rebanada de pan integral") */
  alimento: string
  /** Gramos de la porción */
  gramos: number
  kcal: number
  p: number
  c: number
  g: number
  /** Ejemplo chileno específico (marca/producto local) — null si genérico */
  ejemploChileno?: string
  /** Notas clínicas: alergenos, sellos chilenos, contraindicaciones, etc. */
  notas?: string
}

/** Tablas de intercambios — macros por porción según INTA Chile + Sochinut + USDA.
 *  Cada intercambio dentro de un grupo aporta macros similares (±15%) para
 *  que sean libremente intercambiables sin afectar el target nutricional.
 *  Fuentes principales:
 *   - INTA-UCH: Tabla de Composición Química de Alimentos Chilenos (Atalah 2019, Schmidt-Hebbel)
 *   - Sochinut: Manual de Equivalentes Alimentarios
 *   - USDA FoodData Central (cross-reference)
 *
 *  Convención: cuando un alimento tiene macros que se escapan del grupo
 *  base (ej. salmón es proteína pero alta en grasa), va con `notas` que
 *  explican el ajuste. Para casos doble-grupo (legumbres = prot + cereal),
 *  el `notas` advierte que cuente también como otro grupo. */
export const INTERCAMBIOS: Record<GrupoPorcion, IntercambioPorcion[]> = {
  // ─── LÁCTEOS (~90 kcal · 6g P · 10g C · 2g G) ──────────────────────────
  lacteos: [
    // Leches líquidas
    { alimento: '1 taza de leche descremada',           gramos: 200, kcal: 66,  p: 6.2, c: 9.6, g: 0.2, ejemploChileno: 'Soprole / Colun descremada 200ml' },
    { alimento: '1 taza de leche semidescremada',       gramos: 200, kcal: 92,  p: 6.6, c: 9.6, g: 3,   ejemploChileno: 'Colun 1.5% / Soprole Light' },
    { alimento: '1 taza de leche entera',                gramos: 200, kcal: 122, p: 6.4, c: 9.6, g: 6.6, ejemploChileno: 'Colun / Soprole / Surlat' },
    { alimento: '1 taza de leche sin lactosa',           gramos: 200, kcal: 70,  p: 6,   c: 10,  g: 0.4, ejemploChileno: 'Soprole Zero Lacto / Colun Cero Lactosa' },
    { alimento: '1 taza de kéfir natural',                gramos: 200, kcal: 90,  p: 6,   c: 9,   g: 3 },
    // Yogures
    { alimento: '1 yogur natural sin azúcar',            gramos: 150, kcal: 95,  p: 5,   c: 11,  g: 3,   ejemploChileno: 'Soprole Activia natural 150g' },
    { alimento: '1 yogur natural descremado',            gramos: 150, kcal: 65,  p: 6,   c: 9,   g: 0.2, ejemploChileno: 'Soprole / Loncoleche descremado' },
    { alimento: '1 yogur griego natural',                 gramos: 150, kcal: 143, p: 6.8, c: 15,  g: 5.5, ejemploChileno: 'Danone Oikos griego 150g' },
    { alimento: '1 yogur griego descremado',              gramos: 150, kcal: 87,  p: 11,  c: 6,   g: 0.4, ejemploChileno: 'Soprole Protein+ / Colun Protein Plus' },
    { alimento: '1 yogur con frutas',                     gramos: 150, kcal: 130, p: 5,   c: 22,  g: 2.5, notas: 'Mayor azúcar añadida — preferir natural cuando se pueda.' },
    { alimento: '1 yogur bebible',                         gramos: 200, kcal: 130, p: 6,   c: 22,  g: 1.5, ejemploChileno: 'Soprole / Colun bebible' },
    { alimento: '1 yogur de soya natural',                gramos: 150, kcal: 70,  p: 5,   c: 6,   g: 3,   notas: 'Apto vegano.' },
    // Quesos frescos / lights
    { alimento: '30g de queso fresco/cottage',           gramos: 30,  kcal: 50,  p: 6,   c: 1,   g: 3,   ejemploChileno: 'Quesillo Quillayes 30g' },
    { alimento: '30g de quesillo light',                  gramos: 30,  kcal: 30,  p: 5,   c: 1.5, g: 0.5, ejemploChileno: 'Quesillo Soprole Zero Lacto' },
    { alimento: '30g de ricotta',                          gramos: 30,  kcal: 45,  p: 3.5, c: 1,   g: 3 },
    { alimento: '30g de queso panela',                    gramos: 30,  kcal: 90,  p: 6,   c: 1,   g: 7,   notas: 'Más grasa — cuenta también como ½ porción de grasa.' },
    // Quesos maduros (alta grasa — doble grupo)
    { alimento: '30g de queso chanco',                    gramos: 30,  kcal: 105, p: 7,   c: 0.5, g: 8.5, notas: 'Alto en grasa saturada — cuenta como 1 lácteo + 1 grasa.' },
    { alimento: '30g de queso gauda',                     gramos: 30,  kcal: 105, p: 7,   c: 0.7, g: 8.4, notas: 'Alto en grasa saturada — cuenta como 1 lácteo + 1 grasa.' },
    { alimento: '30g de queso mantecoso',                 gramos: 30,  kcal: 105, p: 6.5, c: 1,   g: 8.6, notas: 'Alto en grasa saturada — cuenta como 1 lácteo + 1 grasa.' },
    // Bebidas vegetales
    { alimento: '1 vaso leche de almendras sin azúcar',  gramos: 200, kcal: 30,  p: 0.6, c: 1,   g: 2.4, notas: 'Apto vegano. Bajo en proteína — NO equivale en calidad proteica al lácteo.' },
    { alimento: '1 vaso leche de soya sin azúcar',        gramos: 200, kcal: 70,  p: 7,   c: 4,   g: 3.5, notas: 'Apto vegano. Mejor alternativa proteica vegetal.' },
    { alimento: '1 vaso leche de avena',                  gramos: 200, kcal: 90,  p: 2,   c: 16,  g: 1.5, notas: 'Apto vegano. Alto en CHO — cuenta como ½ lácteo + ½ cereal.' },
  ],

  // ─── FRUTAS (~60 kcal · 15g C) ─────────────────────────────────────────
  frutas: [
    { alimento: '1 manzana mediana',              gramos: 150, kcal: 78,  p: 0.4, c: 21, g: 0.3 },
    { alimento: '1 plátano chico',                 gramos: 100, kcal: 89,  p: 1.1, c: 23, g: 0.3 },
    { alimento: '1 naranja mediana',                gramos: 150, kcal: 71,  p: 1.4, c: 18, g: 0.2 },
    { alimento: '1 pera mediana',                    gramos: 150, kcal: 86,  p: 0.5, c: 23, g: 0.2 },
    { alimento: '1 taza de berries',                 gramos: 150, kcal: 81,  p: 1.5, c: 19, g: 0.6, notas: 'Frutillas, arándanos, frambuesas, moras.' },
    { alimento: '2 kiwis',                            gramos: 150, kcal: 92,  p: 1.7, c: 22, g: 0.8 },
    { alimento: '1 durazno mediano',                 gramos: 150, kcal: 59,  p: 1.4, c: 14, g: 0.4 },
    { alimento: '1 taza de melón en cubos',          gramos: 170, kcal: 58,  p: 1.4, c: 14, g: 0.3 },
    { alimento: '1 taza de sandía en cubos',          gramos: 200, kcal: 60,  p: 1.2, c: 15, g: 0.3, notas: 'Alta hidratación — IG moderado.' },
    { alimento: '1 racimo chico de uvas',             gramos: 100, kcal: 67,  p: 0.7, c: 16, g: 0.4 },
    { alimento: '15 cerezas',                          gramos: 150, kcal: 95,  p: 1.6, c: 24, g: 0.3, notas: 'Estacional.' },
    { alimento: '1 taza de piña en cubos',            gramos: 150, kcal: 75,  p: 0.8, c: 19, g: 0.2 },
    { alimento: '2 tazas de frutillas',                gramos: 200, kcal: 64,  p: 1.4, c: 15, g: 0.6 },
    { alimento: '3 damascos',                          gramos: 150, kcal: 72,  p: 2.1, c: 16, g: 0.6 },
    { alimento: '½ mango mediano',                     gramos: 150, kcal: 90,  p: 1.2, c: 22, g: 0.5 },
    { alimento: '½ chirimoya chica',                    gramos: 130, kcal: 96,  p: 1.8, c: 24, g: 0.9, ejemploChileno: 'Chirimoya chilena (estacional)' },
    { alimento: '2 tunas',                              gramos: 150, kcal: 60,  p: 1.3, c: 14, g: 0.7, notas: 'Fruta del cactus — alta en fibra.' },
    { alimento: '1 caqui/persimón',                    gramos: 150, kcal: 105, p: 0.9, c: 28, g: 0.3, notas: 'Más calórico — preferir media unidad si paciente en déficit.' },
    { alimento: '1 taza de papaya en cubos',           gramos: 150, kcal: 65,  p: 0.7, c: 16, g: 0.4 },
    { alimento: '3 higos frescos',                     gramos: 150, kcal: 105, p: 1.1, c: 27, g: 0.4 },
    { alimento: '1 pomelo/toronja',                    gramos: 200, kcal: 84,  p: 1.6, c: 21, g: 0.3, notas: 'Ojo: contraindicado con varios fármacos (estatinas, calcio-antagonistas).' },
    { alimento: '2 mandarinas',                        gramos: 180, kcal: 95,  p: 1.5, c: 24, g: 0.5 },
    { alimento: '3 maracuyás',                         gramos: 100, kcal: 97,  p: 2.2, c: 23, g: 0.7 },
    { alimento: '½ granada',                            gramos: 130, kcal: 110, p: 2.2, c: 25, g: 1.5 },
    { alimento: '3 ciruelas',                          gramos: 150, kcal: 70,  p: 1.1, c: 17, g: 0.4 },
    { alimento: '1 membrillo',                          gramos: 150, kcal: 84,  p: 0.6, c: 22, g: 0.2, notas: 'Generalmente cocido (compota sin azúcar).' },
    { alimento: '1 lúcuma chica',                       gramos: 80,  kcal: 80,  p: 1.5, c: 19, g: 0.4, ejemploChileno: 'Lúcuma chilena (postre tradicional)' },
    { alimento: '2 cdas de pasas',                      gramos: 25,  kcal: 75,  p: 0.7, c: 20, g: 0.1, notas: 'Fruta deshidratada — concentra azúcares.' },
  ],

  // ─── VERDURAS (~25 kcal · 5g C · libres en muchos planes) ──────────────
  verduras: [
    { alimento: '1 taza de lechuga',                   gramos: 50,  kcal: 8,  p: 0.7, c: 1.6, g: 0.1 },
    { alimento: '1 tomate mediano',                    gramos: 130, kcal: 23, p: 1.1, c: 5,   g: 0.3 },
    { alimento: '1 zanahoria mediana',                 gramos: 80,  kcal: 33, p: 0.8, c: 8,   g: 0.2 },
    { alimento: '½ taza de brócoli cocido',            gramos: 80,  kcal: 27, p: 2.3, c: 5,   g: 0.3 },
    { alimento: '1 taza de pepino picado',             gramos: 120, kcal: 19, p: 0.8, c: 4,   g: 0.1 },
    { alimento: '1 taza de zapallo italiano salteado', gramos: 130, kcal: 22, p: 1.6, c: 4,   g: 0.4 },
    { alimento: '1 taza de espinaca cruda',            gramos: 30,  kcal: 7,  p: 0.9, c: 1.1, g: 0.1 },
    { alimento: '1 taza de coliflor cocida',           gramos: 120, kcal: 29, p: 2.3, c: 5,   g: 0.6 },
    { alimento: '1 taza de acelga cocida',             gramos: 130, kcal: 26, p: 2.4, c: 5.4, g: 0.3 },
    { alimento: '1 taza de espárragos',                gramos: 130, kcal: 27, p: 3,   c: 5,   g: 0.2 },
    { alimento: '1 pimentón rojo',                     gramos: 130, kcal: 36, p: 1.3, c: 8,   g: 0.4 },
    { alimento: '1 taza de berenjena cocida',          gramos: 130, kcal: 28, p: 1.1, c: 7,   g: 0.2 },
    { alimento: '1 taza de repollo',                   gramos: 130, kcal: 33, p: 1.7, c: 7,   g: 0.1 },
    { alimento: '1 taza de repollo morado',            gramos: 130, kcal: 39, p: 1.8, c: 9,   g: 0.2 },
    { alimento: '½ taza de cebolla cocida',            gramos: 130, kcal: 52, p: 1.4, c: 12,  g: 0.1 },
    { alimento: '½ cebolla morada cruda',              gramos: 50,  kcal: 21, p: 0.6, c: 5,   g: 0.1 },
    { alimento: '1 taza de champiñones',               gramos: 150, kcal: 33, p: 4.6, c: 5,   g: 0.5 },
    { alimento: '1 taza de apio picado',               gramos: 130, kcal: 22, p: 1,   c: 4,   g: 0.2 },
    { alimento: '1 taza de rúcula',                    gramos: 50,  kcal: 12, p: 1.3, c: 2,   g: 0.4 },
    { alimento: '1 taza de kale',                      gramos: 50,  kcal: 25, p: 2.1, c: 4.5, g: 0.4, notas: 'Alta densidad nutricional. Mejor cocido si paciente con tiroides.' },
    { alimento: '1 taza de berro',                     gramos: 50,  kcal: 6,  p: 1.2, c: 0.7, g: 0.1 },
    { alimento: '5 rabanitos',                         gramos: 50,  kcal: 8,  p: 0.3, c: 1.7, g: 0.1 },
    { alimento: '1 taza de pepino dulce',              gramos: 100, kcal: 27, p: 0.5, c: 6,   g: 0.1, ejemploChileno: 'Pepino dulce chileno (Solanum muricatum)' },
    { alimento: '½ taza de palmitos en conserva',      gramos: 75,  kcal: 18, p: 1.6, c: 3,   g: 0.4 },
    { alimento: '1 taza de pimentón verde',            gramos: 130, kcal: 26, p: 1.1, c: 6,   g: 0.2 },
    { alimento: '1 taza de poroto verde cocido',       gramos: 125, kcal: 35, p: 1.9, c: 8,   g: 0.3 },
    { alimento: '½ alcachofa cocida',                  gramos: 80,  kcal: 38, p: 2.7, c: 8,   g: 0.1, notas: 'Estacional.' },
    { alimento: '1 betarraga cocida',                  gramos: 100, kcal: 43, p: 1.6, c: 10,  g: 0.2, notas: 'Más calórica — cuenta como ½ cereal si se consume seguido.' },
  ],

  // ─── CEREALES / FÉCULAS (~80 kcal · 15g C) ─────────────────────────────
  cereales: [
    // Panes
    { alimento: '1 rebanada de pan integral',          gramos: 31,  kcal: 84,  p: 3.3, c: 15.5, g: 1,    ejemploChileno: 'Pan Castaño Integral 1 rebanada' },
    { alimento: '½ marraqueta',                         gramos: 30,  kcal: 90,  p: 2.8, c: 18,   g: 0.5, ejemploChileno: 'Marraqueta clásica panadería' },
    { alimento: '1 hallulla pequeña',                  gramos: 35,  kcal: 105, p: 3,   c: 19,   g: 1.5, ejemploChileno: 'Hallulla típica chilena' },
    { alimento: '½ pan pita integral',                  gramos: 30,  kcal: 80,  p: 3,   c: 16,   g: 0.7 },
    { alimento: '1 rebanada de pan ciabatta integral',  gramos: 40,  kcal: 100, p: 4,   c: 18,   g: 1 },
    { alimento: '1 rebanada pan centeno integral',      gramos: 30,  kcal: 75,  p: 2.5, c: 15,   g: 1 },
    { alimento: '1 tostada integral',                   gramos: 20,  kcal: 75,  p: 2.5, c: 14,   g: 0.8 },
    { alimento: '1 tortilla de trigo',                  gramos: 30,  kcal: 95,  p: 3,   c: 17,   g: 1.5 },
    { alimento: '1 tortilla de maíz',                   gramos: 30,  kcal: 80,  p: 2.5, c: 15,   g: 1 },
    // Arroz / Fideos / Cereales
    { alimento: '⅓ taza de arroz blanco cocido',        gramos: 65,  kcal: 84,  p: 1.8, c: 18,   g: 0.2 },
    { alimento: '⅓ taza de arroz integral cocido',      gramos: 65,  kcal: 75,  p: 1.7, c: 15,   g: 0.6 },
    { alimento: '⅓ taza de fideos cocidos',             gramos: 55,  kcal: 87,  p: 3.2, c: 17,   g: 0.5 },
    { alimento: '⅓ taza de fideos integrales cocidos',  gramos: 55,  kcal: 75,  p: 3,   c: 15,   g: 0.8 },
    { alimento: '⅓ taza de quinoa cocida',              gramos: 65,  kcal: 78,  p: 2.9, c: 14,   g: 1.2 },
    { alimento: '⅓ taza de cuscús cocido',              gramos: 65,  kcal: 75,  p: 2.5, c: 16,   g: 0.1 },
    { alimento: '⅓ taza de mote de trigo',              gramos: 65,  kcal: 80,  p: 3,   c: 15,   g: 0.5, ejemploChileno: 'Mote típico chileno' },
    { alimento: '½ taza de polenta cocida',             gramos: 130, kcal: 88,  p: 2,   c: 18,   g: 0.6 },
    { alimento: '½ taza de avena cocida',               gramos: 120, kcal: 90,  p: 3.2, c: 16,   g: 1.8, notas: 'Apta sin gluten si avena certificada.' },
    { alimento: '3 cdas de salvado de avena',           gramos: 30,  kcal: 100, p: 5,   c: 17,   g: 2,   notas: 'Alta fibra soluble — ideal para colesterol y SII.' },
    { alimento: '4 cdas de cereal integral sin azúcar', gramos: 30,  kcal: 110, p: 3,   c: 22,   g: 1,   notas: 'Tipo all-bran, fitness sin azúcar.' },
    // Féculas (papa, camote, choclo)
    { alimento: '1 papa chica cocida',                   gramos: 100, kcal: 87,  p: 2,   c: 20,   g: 0.1 },
    { alimento: '1 camote/batata chico cocido',         gramos: 100, kcal: 86,  p: 1.6, c: 20,   g: 0.1 },
    { alimento: '½ choclo desgranado cocido',           gramos: 80,  kcal: 96,  p: 3.4, c: 19,   g: 1.2, ejemploChileno: 'Choclo chileno fresco o congelado' },
    { alimento: '1 taza de zapallo cocido',              gramos: 150, kcal: 75,  p: 2,   c: 18,   g: 0.3, ejemploChileno: 'Zapallo camote chileno' },
    { alimento: '½ taza de yuca/mandioca cocida',       gramos: 80,  kcal: 100, p: 0.5, c: 24,   g: 0.1 },
    // Galletas / otros
    { alimento: '6 galletas de soda',                    gramos: 25,  kcal: 109, p: 2.5, c: 17,   g: 3,   notas: 'Mayor en grasas saturadas — preferir pan integral.' },
    { alimento: '3 galletas integrales',                 gramos: 25,  kcal: 95,  p: 3,   c: 17,   g: 1.5, ejemploChileno: 'Costa Mini Chips integrales' },
    { alimento: '1 mote con huesillo (sin huesillo)',   gramos: 100, kcal: 100, p: 2,   c: 22,   g: 0.4, ejemploChileno: 'Mote ladera chileno (postre típico)' },
    { alimento: '½ taza de granola sin azúcar',          gramos: 25,  kcal: 110, p: 3,   c: 16,   g: 4,   notas: 'Más grasa — cuenta como 1 cereal + ½ grasa.' },
  ],

  // ─── PROTEÍNAS (~75 kcal · 7g P · bajas en grasa) ──────────────────────
  // NOTA: porción de 30g de carne magra = 1 intercambio. Para una comida real
  // se prescriben 4-6 intercambios (120-180g de carne cocida).
  proteinas: [
    // Aves
    { alimento: '30g de pollo cocido',                  gramos: 30,  kcal: 50,  p: 9,   c: 0,   g: 1.4, ejemploChileno: 'Super Pollo pechuga 30g' },
    { alimento: '30g de pavo magro',                    gramos: 30,  kcal: 36,  p: 7.5, c: 0,   g: 1,   notas: 'Pechuga sin piel — ideal en déficit.' },
    { alimento: '30g de jamón pavo light',              gramos: 30,  kcal: 30,  p: 6,   c: 0.5, g: 0.4, ejemploChileno: 'Pavo Mol / San Jorge light' },
    // Carnes rojas magras
    { alimento: '30g de carne vacuno magra',             gramos: 30,  kcal: 68,  p: 8,   c: 0,   g: 4,   ejemploChileno: 'Posta / Lomo liso 30g' },
    { alimento: '30g de cerdo magro (pulpa)',           gramos: 30,  kcal: 40,  p: 6,   c: 0,   g: 1.7, ejemploChileno: 'Pulpa de cerdo desgrasada' },
    { alimento: '30g de cordero magro',                  gramos: 30,  kcal: 60,  p: 7,   c: 0,   g: 3.5, notas: 'Mayor grasa — limitar a 1-2 veces por semana.' },
    { alimento: '30g de conejo',                         gramos: 30,  kcal: 43,  p: 6.5, c: 0,   g: 2,   notas: 'Carne magra premium.' },
    { alimento: '30g de hígado vacuno',                 gramos: 30,  kcal: 40,  p: 6,   c: 1.5, g: 1,   notas: 'Alta vitamina A y B12. Contraindicado en embarazo (>retinol).' },
    // Pescados blancos
    { alimento: '30g de pescado blanco',                gramos: 30,  kcal: 35,  p: 7,   c: 0,   g: 1,   ejemploChileno: 'Merluza austral 30g' },
    { alimento: '30g de merluza',                        gramos: 30,  kcal: 33,  p: 7,   c: 0,   g: 0.6, ejemploChileno: 'Merluza chilena fresca' },
    { alimento: '30g de reineta',                        gramos: 30,  kcal: 40,  p: 6.5, c: 0,   g: 1.5, ejemploChileno: 'Reineta chilena fresca' },
    { alimento: '30g de congrio',                        gramos: 30,  kcal: 35,  p: 7,   c: 0,   g: 0.7, ejemploChileno: 'Congrio dorado chileno' },
    // Pescados grasos (intercambio doble — alto omega-3)
    { alimento: '30g de salmón',                         gramos: 30,  kcal: 60,  p: 6,   c: 0,   g: 4,   ejemploChileno: 'Salmón Multiexport / AquaChile', notas: 'Alto omega-3. Cuenta como 1 prot + ½ grasa.' },
    { alimento: '30g de jurel en agua',                  gramos: 30,  kcal: 32,  p: 7,   c: 0,   g: 0.5, ejemploChileno: 'Jurel San José en agua' },
    { alimento: '30g de sardinas en agua',               gramos: 30,  kcal: 35,  p: 7,   c: 0,   g: 1,   notas: 'Alta omega-3 + calcio (espina).' },
    { alimento: '30g de atún en agua escurrido',         gramos: 30,  kcal: 31,  p: 7.8, c: 0,   g: 0.3, ejemploChileno: 'Robinson Crusoe atún en agua' },
    { alimento: '30g de atún en aceite escurrido',       gramos: 30,  kcal: 60,  p: 7,   c: 0,   g: 4,   notas: 'Cuenta como 1 prot + ½ grasa.' },
    // Mariscos chilenos
    { alimento: '60g de choritos cocidos',              gramos: 60,  kcal: 50,  p: 8,   c: 2,   g: 2,   ejemploChileno: 'Choritos chilenos al vapor' },
    { alimento: '50g de almejas',                        gramos: 50,  kcal: 42,  p: 7.5, c: 1.7, g: 0.8 },
    { alimento: '50g de machas',                         gramos: 50,  kcal: 47,  p: 8,   c: 1.7, g: 0.8, ejemploChileno: 'Machas chilenas (estacional)' },
    { alimento: '50g de locos',                          gramos: 50,  kcal: 67,  p: 12,  c: 1.7, g: 0.7, ejemploChileno: 'Locos chilenos (cuota anual)' },
    { alimento: '50g de camarones',                      gramos: 50,  kcal: 50,  p: 10,  c: 0,   g: 0.5 },
    { alimento: '50g de langostinos',                    gramos: 50,  kcal: 48,  p: 10,  c: 0,   g: 0.5 },
    // Huevos
    { alimento: '1 huevo entero',                        gramos: 50,  kcal: 78,  p: 6.2, c: 0.6, g: 5,   notas: 'Apto vegetariano.' },
    { alimento: '2 claras de huevo',                     gramos: 66,  kcal: 35,  p: 7.2, c: 0.4, g: 0,   notas: 'Sin colesterol — ideal en plan bajo grasa.' },
    // Lácteos altos en proteína
    { alimento: '30g de quesillo',                       gramos: 30,  kcal: 40,  p: 4,   c: 0.6, g: 2.4, ejemploChileno: 'Quesillo Quillayes 30g' },
    // Embutidos magros
    { alimento: '30g de salchicha pavo',                gramos: 30,  kcal: 50,  p: 5,   c: 1,   g: 3,   notas: 'Preferir sin nitritos. Limitar consumo.' },
    { alimento: '30g de jamón ahumado magro',            gramos: 30,  kcal: 35,  p: 6,   c: 0.5, g: 0.8 },
    // Vegetales / veganos
    { alimento: '½ taza de lentejas cocidas',           gramos: 100, kcal: 116, p: 9,   c: 20,  g: 0.4, notas: 'Apto vegano. Cuenta también como 1 cereal.' },
    { alimento: '½ taza de garbanzos cocidos',          gramos: 100, kcal: 164, p: 9,   c: 27,  g: 2.6, notas: 'Apto vegano. Cuenta como 1 prot + 1 cereal + ½ grasa.' },
    { alimento: '½ taza de porotos negros cocidos',     gramos: 100, kcal: 132, p: 9,   c: 24,  g: 0.5, notas: 'Apto vegano. Cuenta como 1 prot + 1 cereal.' },
    { alimento: '½ taza de porotos blancos cocidos',    gramos: 100, kcal: 139, p: 9,   c: 25,  g: 0.4, notas: 'Apto vegano. Cuenta como 1 prot + 1 cereal.' },
    { alimento: '½ taza de arvejas secas cocidas',      gramos: 90,  kcal: 110, p: 8,   c: 19,  g: 0.4, notas: 'Apto vegano. Cuenta como 1 prot + 1 cereal.' },
    { alimento: '100g de tofu firme',                    gramos: 100, kcal: 144, p: 17,  c: 2.8, g: 8.7, notas: 'Apto vegano. ~2 porciones por su densidad proteica.' },
    { alimento: '100g de tempeh',                        gramos: 100, kcal: 193, p: 20,  c: 9,   g: 11,  notas: 'Apto vegano. Fermentado — más digestivo. Cuenta como 2 prot + ½ grasa.' },
    { alimento: '100g de seitan',                        gramos: 100, kcal: 118, p: 21,  c: 4,   g: 1,   notas: 'Apto vegano (NO celíaco — alto gluten).' },
    // Suplementos
    { alimento: '1 scoop whey protein',                  gramos: 30,  kcal: 120, p: 24,  c: 3,   g: 1.5, ejemploChileno: 'ON Gold Standard / ISO 100 / Dymatize', notas: '~2 porciones por densidad. Apto vegetariano.' },
    { alimento: '1 scoop proteína vegetal',              gramos: 30,  kcal: 120, p: 22,  c: 4,   g: 1.5, ejemploChileno: 'ON Plant / Vegan Protein', notas: '~2 porciones. Apto vegano.' },
  ],

  // ─── GRASAS (~45 kcal · 5g G) ──────────────────────────────────────────
  grasas: [
    // Aceites
    { alimento: '1 cdta de aceite de oliva',           gramos: 5,   kcal: 45, p: 0,   c: 0,   g: 5 },
    { alimento: '1 cdta de aceite de canola',          gramos: 5,   kcal: 45, p: 0,   c: 0,   g: 5 },
    { alimento: '1 cdta de aceite de maravilla',       gramos: 5,   kcal: 45, p: 0,   c: 0,   g: 5 },
    { alimento: '1 cdta de aceite de coco',            gramos: 5,   kcal: 42, p: 0,   c: 0,   g: 4.7, notas: 'Alta grasa saturada — ocasional.' },
    { alimento: '1 cdta de aceite de sésamo',          gramos: 5,   kcal: 45, p: 0,   c: 0,   g: 5 },
    { alimento: '1 cdta de aceite de linaza',          gramos: 5,   kcal: 45, p: 0,   c: 0,   g: 5,   notas: 'Alto omega-3. NO calentar.' },
    // Frutas grasas
    { alimento: '¼ palta',                              gramos: 40,  kcal: 64, p: 0.8, c: 3.4, g: 5.9, ejemploChileno: 'Palta Hass chilena' },
    { alimento: '10 aceitunas',                         gramos: 35,  kcal: 41, p: 0.3, c: 1,   g: 3.8 },
    // Frutos secos
    { alimento: '10 maní sin sal',                      gramos: 10,  kcal: 57, p: 2.6, c: 1.6, g: 5 },
    { alimento: '6 almendras',                          gramos: 8,   kcal: 46, p: 1.7, c: 1.6, g: 4 },
    { alimento: '2 nueces',                              gramos: 8,   kcal: 52, p: 1.2, c: 1.1, g: 5.2 },
    { alimento: '5 avellanas',                          gramos: 10,  kcal: 63, p: 1.5, c: 1.7, g: 6.1 },
    { alimento: '4 pistachos',                          gramos: 8,   kcal: 46, p: 1.7, c: 2.2, g: 3.7 },
    { alimento: '4 castañas de cajú',                   gramos: 8,   kcal: 45, p: 1.5, c: 2.5, g: 3.5 },
    { alimento: '3 nueces de macadamia',                gramos: 10,  kcal: 72, p: 0.8, c: 1.4, g: 7.5, notas: 'Más calóricas — preferir 2 unidades.' },
    // Cremas / mantequillas
    { alimento: '1 cda de mantequilla de maní',         gramos: 15,  kcal: 95, p: 4,   c: 3,   g: 8,   notas: '100% maní sin azúcar añadida.' },
    { alimento: '1 cda de crema de almendras',          gramos: 15,  kcal: 90, p: 3.5, c: 4,   g: 8,   notas: 'Sin azúcar añadida.' },
    { alimento: '1 cdta de mantequilla',                gramos: 5,   kcal: 36, p: 0,   c: 0,   g: 4 },
    { alimento: '1 cda de mayonesa light',              gramos: 15,  kcal: 50, p: 0.1, c: 3,   g: 4,   notas: 'Preferir homemade con aceite de oliva.' },
    // Semillas
    { alimento: '1 cda de semillas de chía',            gramos: 12,  kcal: 58, p: 2,   c: 5,   g: 3.7, notas: 'Alta omega-3 + fibra.' },
    { alimento: '1 cda de linaza molida',               gramos: 10,  kcal: 53, p: 1.8, c: 2.9, g: 4.2, notas: 'Alta omega-3 + lignanos. Moler para absorción.' },
    { alimento: '1 cda de sésamo',                      gramos: 10,  kcal: 57, p: 1.8, c: 2.3, g: 5,   notas: 'Alta calcio.' },
    { alimento: '1 cda de semillas de zapallo',         gramos: 10,  kcal: 56, p: 2.5, c: 1.5, g: 5 },
    { alimento: '1 cda de semillas de girasol',         gramos: 10,  kcal: 58, p: 2,   c: 2,   g: 5 },
    // Coco
    { alimento: '2 cdas de chips de coco sin azúcar',   gramos: 10,  kcal: 65, p: 0.7, c: 2.5, g: 6 },
    { alimento: '1 cda de coco rallado sin azúcar',     gramos: 8,   kcal: 53, p: 0.5, c: 1.9, g: 5 },
  ],
}

/** Macros promedio por porción de cada grupo. Usado para distribuir el target
 *  nutricional total en # de porciones por grupo. */
export const MACROS_POR_GRUPO: Record<GrupoPorcion, { kcal: number; p: number; c: number; g: number }> = {
  lacteos:   { kcal: 90,  p: 6,  c: 10, g: 2 },
  frutas:    { kcal: 60,  p: 1,  c: 15, g: 0.3 },
  verduras:  { kcal: 25,  p: 1.5, c: 5,  g: 0.3 },
  cereales:  { kcal: 80,  p: 3,  c: 15, g: 1 },
  proteinas: { kcal: 75,  p: 7,  c: 0,  g: 4 },
  grasas:    { kcal: 45,  p: 0.3, c: 0.5, g: 5 },
}

export interface DistribucionPorciones {
  lacteos: number
  frutas: number
  verduras: number
  cereales: number
  proteinas: number
  grasas: number
  /** Macros totales que aporta esta distribución (para validar vs target) */
  totales: { kcal: number; p: number; c: number; g: number }
  /** Diferencia con el target (delta = aportado - target) */
  delta: { kcal: number; p: number; c: number; g: number }
}

/**
 * Distribuye el target nutricional en # de porciones por grupo.
 *
 * Algoritmo (basado en práctica clínica Sochinut):
 *  1. Fijar lácteos según objetivo (2 mantenimiento, 3 hipertrofia, 2 déficit)
 *  2. Fijar frutas según kcal target (2-4 porciones)
 *  3. Verduras libre (4 porciones recomendadas, no se cuentan estrictamente)
 *  4. Calcular proteínas restantes después de lácteos
 *  5. Calcular cereales con el CHO remanente
 *  6. Calcular grasas con la grasa remanente
 *
 * Los #s se redondean al entero o medio más cercano (intercambios son
 * unidades enteras o medias en la práctica clínica).
 */
export function distribuirEnPorciones(
  kcalTarget: number,
  proteinaG: number,
  choG: number,
  grasaG: number,
  objetivo: 'perdida grasa' | 'mantenimiento' | 'hipertrofia',
): DistribucionPorciones {
  // 1. Fijar lácteos según objetivo
  const lacteos =
    objetivo === 'hipertrofia'   ? 3 :
    objetivo === 'perdida grasa' ? 2 :
                                    2

  // 2. Fijar frutas según kcal total
  const frutas =
    kcalTarget <= 1500 ? 2 :
    kcalTarget <  2300 ? 3 :
                          4

  // 3. Verduras (recomendación estándar 3-4, no se ajusta finamente)
  const verduras = 4

  // 4. Calcular CHO ya aportado por frutas + verduras + lácteos
  const choAportado = lacteos * MACROS_POR_GRUPO.lacteos.c + frutas * MACROS_POR_GRUPO.frutas.c + verduras * MACROS_POR_GRUPO.verduras.c
  const choRestante = Math.max(0, choG - choAportado)
  const cereales = Math.max(0, Math.round((choRestante / MACROS_POR_GRUPO.cereales.c) * 2) / 2)

  // 5. Calcular proteínas restantes (target - aportado por lácteos)
  const protAportadoPorLacteos = lacteos * MACROS_POR_GRUPO.lacteos.p
  const protAportadoPorCereales = cereales * MACROS_POR_GRUPO.cereales.p
  const protRestante = Math.max(0, proteinaG - protAportadoPorLacteos - protAportadoPorCereales)
  const proteinas = Math.max(0, Math.round((protRestante / MACROS_POR_GRUPO.proteinas.p) * 2) / 2)

  // 6. Calcular grasas restantes (target - aportado por todos los grupos)
  const grasaAportada =
    lacteos   * MACROS_POR_GRUPO.lacteos.g +
    cereales  * MACROS_POR_GRUPO.cereales.g +
    proteinas * MACROS_POR_GRUPO.proteinas.g +
    frutas    * MACROS_POR_GRUPO.frutas.g
  const grasaRestante = Math.max(0, grasaG - grasaAportada)
  const grasas = Math.max(0, Math.round((grasaRestante / MACROS_POR_GRUPO.grasas.g) * 2) / 2)

  // Macros totales con la distribución calculada
  const grupos: Record<GrupoPorcion, number> = { lacteos, frutas, verduras, cereales, proteinas, grasas }
  const totales = (Object.keys(grupos) as GrupoPorcion[]).reduce(
    (acc, grupo) => {
      const porciones = grupos[grupo]
      const m = MACROS_POR_GRUPO[grupo]
      return {
        kcal: acc.kcal + porciones * m.kcal,
        p:    acc.p    + porciones * m.p,
        c:    acc.c    + porciones * m.c,
        g:    acc.g    + porciones * m.g,
      }
    },
    { kcal: 0, p: 0, c: 0, g: 0 },
  )

  return {
    lacteos, frutas, verduras, cereales, proteinas, grasas,
    totales: {
      kcal: Math.round(totales.kcal),
      p:    Math.round(totales.p),
      c:    Math.round(totales.c),
      g:    Math.round(totales.g),
    },
    delta: {
      kcal: Math.round(totales.kcal - kcalTarget),
      p:    Math.round(totales.p    - proteinaG),
      c:    Math.round(totales.c    - choG),
      g:    Math.round(totales.g    - grasaG),
    },
  }
}

/** Modalidad de planificación elegida por el profesional. */
export type ModalidadPlan = 'menus' | 'porciones'

export const MODALIDAD_PLAN_LABELS: Record<ModalidadPlan, { label: string; emoji: string; desc: string }> = {
  menus:     { label: 'Plan por menús',     emoji: '🍽️', desc: 'Preparaciones específicas con foto, pasos e ingredientes. Más guiado.' },
  porciones: { label: 'Plan por porciones', emoji: '⚖️', desc: 'Intercambios alimentarios por grupos. Más flexible. Lista chilena INTA/Sochinut.' },
}
