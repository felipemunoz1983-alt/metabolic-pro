// ── Base de alimentos · Centro Metabólico Pro ──

const IMG = 'https://raw.githubusercontent.com/felipemunoz1983-alt/metabolic-pro/main/img/'
const USP = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&h=600&fit=crop&q=90&auto=format`

export interface MealOption {
  label: string
  items: string[]
  baseKcal: number
  p: number
  c: number
  g: number
  foto?: string
  tiempo?: string
  pasos?: string[]
  alergenosNota?: string  // aviso alérgenos (barras proteicas)
  /** Tendencia alimentaria. undefined = compatible con ambas. */
  tendencia?: ('omnivoro' | 'vegetariano' | 'vegano')[]
  /** Sellos chilenos de advertencia nutricional (p.ej. "Alto en Grasas Saturadas") */
  sellos?: string[]
  tieneHuevo?: boolean      // muestra selector de cantidad de huevos en PlanGenerator
  eggsDefault?: number      // cantidad de huevos por defecto de la receta
  requiereWhey?: boolean    // true = solo incluir si el profesional indica proteína en polvo
  tieneYogur?: boolean      // muestra selector de tipo de yogur en PlanGenerator
}

// ─── Tipos de yogur disponibles ───────────────────────────────────────────────
export const YOGUR_TIPOS = {
  griego: {
    label: 'Yogur griego natural',
    emoji: '🥛',
    // item que se sustituye en la receta (150g)
    item: '150g yogur griego natural sin azúcar',
    // macros por 150g (valores de referencia para ajuste)
    kcal: 130, p: 17, c: 6, g: 5,
    badge: '17g prot · Clásico',
    alergenosNota: undefined as string | undefined,
    foto: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
  },
  fullpro: {
    label: 'FullPro Protein Loncoleche',
    emoji: '💪',
    item: 'Yogur FullPro Protein Loncoleche 150g (frutilla)',
    // Fuente: etiqueta oficial 150g — 112.5 kcal · 18g prot · 7.5g CH · 1.2g G · sin lactosa
    kcal: 113, p: 18, c: 8, g: 1,
    badge: '18g prot · Sin lactosa · Bajo en grasa',
    alergenosNota: '⚠️ FullPro Loncoleche · Puede contener trazas de almendra, pasas, nuez, soya y gluten (avena).',
    foto: 'https://jumbocl.vtexassets.com/arquivos/ids/485106-900-900?width=900&height=900&aspect=true',
  },
  soprole_power: {
    label: 'Soprole Protein+ Power',
    emoji: '⚡',
    item: 'Yogur Soprole Protein+ Power 155g (frutilla)',
    // Fuente: etiqueta oficial 155g — 130 kcal · 16g prot · 11g CH · 2g G · sin lactosa · sin gluten · libre de sellos
    kcal: 130, p: 16, c: 11, g: 2,
    badge: '16g prot · Sin lactosa · Con Magnesio · Libre sellos',
    alergenosNota: '⚠️ Soprole Protein+ Power · Elaborado en líneas que también procesan nueces.',
    foto: 'https://www.soprole.cl/public/storage/imagenes/banners/202604011757power%20frutilla.png',
  },
} as const

export type YogurTipo = keyof typeof YOGUR_TIPOS

export interface UltraOption {
  label: string
  porcion: string
  kcal: number
  p: number
  c: number
  g: number
  foto?: string
  sellos?: string[]
  alergenos?: string[]
}

// ─── DESAYUNOS ────────────────────────────────────────────────────────────────
export const desayunosOpts: Record<string, MealOption> = {
  avena_platano: {
    label: 'Avena natural + plátano',
    items: ['80g avena en hojuelas', '1 plátano mediano', '200ml leche descremada', '1 cdta canela o miel'],
    baseKcal: 360, p: 14, c: 62, g: 7,
    foto: USP('1638813133218-4367bd8123f6'),
    tiempo: '10 min',
    pasos: [
      'Calentar 200ml de leche en una olla a fuego medio.',
      'Agregar 80g de avena y revolver continuamente 3-4 minutos hasta espesar.',
      'Servir en un tazón y decorar con el plátano cortado en rodajas.',
      'Opcional: agregar canela molida, miel o stevia al gusto.',
    ],
  },
  avena_proteica: {
    label: 'Avena proteica + plátano',
    items: ['80g avena en hojuelas', '1 scoop proteína en polvo', '1 plátano mediano', '200ml leche descremada'],
    baseKcal: 480, p: 38, c: 62, g: 7,
    requiereWhey: true,
    foto: USP('1638813133218-4367bd8123f6'), // tazón de avena con frutas encima, foto real
    tiempo: '10 min',
    pasos: [
      'Calentar 200ml de leche en una olla a fuego medio.',
      'Agregar 80g de avena y revolver continuamente 3-4 minutos hasta espesar.',
      'Apagar el fuego e incorporar el scoop de proteína; mezclar bien hasta disolver.',
      'Servir en un tazón y decorar con el plátano cortado en rodajas.',
      'Opcional: agregar canela molida o stevia al gusto.',
    ],
  },
  huevos_tostadas: {
    label: 'Omelette proteico + pan integral',
    items: ['3 huevos enteros', '2 claras adicionales', 'Espinaca y champiñones', '1 rebanada pan integral', '1 cdta aceite de oliva'],
    baseKcal: 420, p: 28, c: 35, g: 18, tieneHuevo: true, eggsDefault: 3,
    foto: IMG + 'omelette_pan_integral.jfif',
    tiempo: '12 min',
    pasos: [
      'Batido: mezclar huevos + claras con sal y pimienta hasta homogeneizar.',
      'Base vegetal: saltear champiñones y espinaca 2-3 min en la sartén con aceite. Reduce el agua y evita que el omelette quede aguado.',
      'Cocción: verter el huevo batido sobre las verduras en sartén antiadherente a fuego medio-bajo.',
      'Armado: cuando los bordes cuajen, doblar el omelette por la mitad.',
      'Acompañar con 1 rebanada de pan integral tostado.',
    ],
  },
  tostadas_palta: {
    label: 'Pan integral + palta + huevo pochado',
    items: ['2 tostadas pan integral', '½ palta madura', '2 huevos pochados', 'Café o té sin azúcar'],
    baseKcal: 460, p: 22, c: 40, g: 22, tieneHuevo: true, eggsDefault: 2,
    foto: IMG + 'Pan_palta_huevo_pochado.jfif',
    tiempo: '15 min',
    pasos: [
      'Tostadas: tostar 2 rebanadas de pan integral hasta dorar levemente. El tostado reduce el índice glicémico.',
      'Palta: aplastar con tenedor, sazonar con sal, pimienta y unas gotas de limón. El limón evita la oxidación.',
      'Pochado: hervir agua con un chorrito de vinagre blanco. Formar un remolino y verter el huevo sin cáscara. Cocinar 3 minutos.',
      'Armado: untar la palta sobre las tostadas y colocar el huevo pochado encima.',
      'Café: acompañar con café o té sin azúcar para completar el desayuno sin sumar calorías.',
    ],
  },
  yogur_granola: {
    label: 'Yogur griego + berries + semillas',
    items: ['150g yogur griego natural', '½ taza berries (arándanos, frambuesas o frutillas)', '1 cda chía o linaza', '10-15 almendras naturales'],
    baseKcal: 380, p: 20, c: 50, g: 8,
    tieneYogur: true,
    foto: IMG + 'Yogurt_griego_con_berries_semillas.jfif',
    tiempo: '5 min',
    pasos: [
      'Base: verter el yogur griego en un bowl. El yogur griego tiene el doble de proteína que el yogur común.',
      'Berries: agregar ½ taza de berries encima del yogur. Aportan antioxidantes y fibra soluble.',
      'Semillas: espolvorear 1 cda de chía o linaza. La chía absorbe líquido y prolonga la saciedad.',
      'Almendras: agregar las almendras enteras o picadas.',
      'Sin cocción. Preparación en menos de 5 minutos. Ideal para llevar.',
    ],
  },
  batido_proteico: {
    label: 'Batido proteico + frutos secos',
    items: ['1 scoop proteína en polvo', '1 plátano congelado', '200ml leche', '30g nueces o almendras', '1 cdta mantequilla de maní'],
    baseKcal: 490, p: 35, c: 42, g: 18,
    requiereWhey: true,
    foto: USP('1622597468620-656aa1f981ea'), // batido proteico de frutilla en vaso transparente
    tiempo: '5 min',
    pasos: [
      'Colocar todos los ingredientes en la licuadora: leche, plátano congelado, proteína y frutos secos.',
      'Licuar a velocidad alta por 60 segundos hasta obtener una mezcla homogénea.',
      'Probar la consistencia: si queda muy espeso, agregar un poco más de leche.',
      'Servir inmediatamente para evitar que el plátano oxide la mezcla.',
      'Opcional: agregar canela o cacao en polvo para variedad de sabor.',
    ],
  },
  chia_pudding: {
    label: 'Chía pudding + yogur proteico',
    items: ['2 cdas semillas de chía (~20g)', '150g yogur alto en proteínas', '1 fruta a elección', 'Canela o vainilla sin azúcar'],
    baseKcal: 430, p: 24, c: 58, g: 10,
    tieneYogur: true,
    foto: IMG + 'chia_pudding.jfif',
    tiempo: '5 min + reposo 2h',
    pasos: [
      'Mezcla: combinar semillas de chía con el yogur en un frasco o recipiente con tapa. La chía absorbe hasta 12 veces su peso en líquido.',
      'Reposo: refrigerar mínimo 2 horas o toda la noche. Las semillas gelifican y el pudding toma consistencia.',
      'Preparar la noche anterior ahorra tiempo en la mañana.',
      'Fruta: al servir, cortar la fruta fresca y colocarla encima del pudding.',
      'Espolvorear canela o agregar vainilla para mayor sabor. Consumir frío directamente del frasco.',
    ],
  },
  tostadas_ricotta: {
    label: 'Tostadas + ricotta + miel + nueces',
    items: ['2 tostadas de pan integral', '80-100g ricotta', '1 cdta miel', '10 nueces enteras o picadas'],
    baseKcal: 400, p: 18, c: 48, g: 14,
    foto: IMG + 'tostadas_ricotta_miel_nueces.jfif',
    tiempo: '8 min',
    pasos: [
      'Tostadas: tostar 2 rebanadas de pan integral hasta lograr superficie dorada y crujiente. El tostado reduce el índice glicémico.',
      'Ricotta: esparcir generosamente 80-100g de ricotta sobre cada tostada aún caliente. La ricotta aporta caseína de absorción lenta.',
      'Miel: agregar 1 cdta de miel distribuida sobre la ricotta. No exceder la porción indicada.',
      'Nueces: colocar las nueces encima, enteras o picadas gruesas para mayor textura.',
      'Servir inmediatamente. La combinación cremoso + crujiente + dulce mejora la adherencia al desayuno.',
    ],
  },
  cottage_frutas: {
    label: 'Cottage + frutas + semillas',
    items: ['150-200g cottage', '1 fruta a elección (berries, kiwi, durazno)', '1 cda semillas (chía, linaza o sésamo)', 'Canela o ralladura de limón'],
    baseKcal: 360, p: 22, c: 42, g: 10,
    foto: IMG + 'cottage_frutas_semillas.jfif',
    tiempo: '5 min',
    pasos: [
      'Base: colocar 150-200g de cottage en un bowl. La caseína del cottage se digiere lentamente → mayor control de apetito.',
      'Fruta: cortar la fruta en trozos y agregar encima. Aporta fibra y micronutrientes que complementan el perfil proteico.',
      'Semillas: espolvorear 1 cda de semillas sobre la preparación. Suman fibra soluble que potencia el efecto saciante.',
      'Sabor: añadir canela o ralladura de limón para elevar el sabor sin agregar calorías.',
      'Consumir de inmediato o refrigerar hasta 1 hora. Ideal para preparar rápido en la mañana.',
    ],
  },
}

// ─── COLACIONES MAÑANA y ONCE (mismo pool) ────────────────────────────────────
export const colacionesOpts: Record<string, MealOption> = {
  yogur_frutossecos_am: {
    label: 'Yogur griego + frutos secos',
    items: ['150g yogur griego sin azúcar', '20g mix frutos secos (nueces, almendras)', '1 fruta pequeña'],
    baseKcal: 230, p: 14, c: 22, g: 10,
    tieneYogur: true,
    foto: IMG + 'Yogurt_griego_con_berries_semillas.jfif',
    tiempo: '3 min',
    pasos: [
      'Verter el yogur griego en un bowl o tazón.',
      'Agregar la fruta pequeña cortada en trozos encima del yogur.',
      'Distribuir los frutos secos sobre la mezcla.',
      'Sin cocción. Listo para consumir en menos de 3 minutos.',
    ],
  },
  fruta_proteina: {
    label: 'Fruta + batido de proteína',
    items: ['1 scoop proteína en polvo', '200ml agua o leche', '1 fruta mediana'],
    baseKcal: 210, p: 26, c: 22, g: 2,
    foto: USP('1622597468620-656aa1f981ea'), // batido proteico en vaso, colación
    tiempo: '3 min',
    pasos: [
      'Mezclar el scoop de proteína con el agua o leche en una botella shaker.',
      'Agitar vigorosamente por 20-30 segundos hasta disolver bien.',
      'Consumir junto a la fruta mediana como acompañamiento sólido.',
      'Ideal como colación post-entrenamiento o entre comidas.',
    ],
  },
  cottage_nueces: {
    label: 'Queso cottage + nueces',
    items: ['150g queso cottage', '20g nueces', '½ taza frutillas o arándanos'],
    baseKcal: 200, p: 18, c: 8, g: 11,
    foto: IMG + 'cottage_frutas_semillas.jfif',
    tiempo: '4 min',
    pasos: [
      'Colocar el cottage en un bowl pequeño.',
      'Agregar las frutillas o arándanos encima.',
      'Distribuir las nueces sobre la mezcla.',
      'Consumir de inmediato. Colación alta en proteína y grasas saludables.',
    ],
  },
  tostadas_ricotta_col: {
    label: 'Tostada integral + ricotta',
    items: ['1 rebanada pan integral', '40g ricotta', '1 cdta miel', '5 nueces'],
    baseKcal: 190, p: 8, c: 24, g: 7,
    foto: IMG + 'tostadas_ricotta_miel_nueces.jfif',
    tiempo: '5 min',
    pasos: [
      'Tostar 1 rebanada de pan integral.',
      'Esparcir la ricotta sobre la tostada caliente.',
      'Agregar la miel y las nueces encima.',
      'Consumir inmediatamente para aprovechar la textura crujiente.',
    ],
  },
  barra_fruta: {
    label: 'Barra de cereal + fruta',
    items: ['1 barra de cereal integral sin azúcar añadida', '1 fruta mediana', 'Té o infusión sin azúcar'],
    baseKcal: 180, p: 5, c: 36, g: 4,
    foto: USP('1504708706948-13d6cbba4062'), // mix de berries y frutos secos, snack saludable
    tiempo: '2 min',
    pasos: [
      'Opción rápida: barra de cereal + fruta para llevar.',
      'Acompañar con té o infusión sin azúcar.',
      'Ideal cuando no hay tiempo de preparar colación elaborada.',
    ],
  },
  // ── Barras proteicas (con disclaimer de alérgenos) ──
  wild_protein_col: {
    label: '💪 Barra Wild Protein',
    items: ['1 barra Wild Protein (45g)', '200ml agua o infusión'],
    baseKcal: 173, p: 15, c: 17, g: 5,  // fuente: etiqueta oficial 1 porción 45g (Sabor Caramelo)
    foto: USP('1490474418585-ba9bad8fd0ea'),
    tiempo: '0 min',
    pasos: [
      'Consumir directamente como colación portátil.',
      'Ideal post-entrenamiento o como snack de media mañana.',
      'Refrigerar en verano para mejor textura.',
    ],
    alergenosNota: '⚠️ Wild Protein · Contiene maní, leche, soya. Elaborado en líneas que también procesan gluten, nueces, sulfitos.',
  },
  protein_bite_bw_col: {
    label: '🍫 Protein Bite Black & White',
    items: ['1 barra Protein Bite Black & White (55g)', '200ml agua o infusión'],
    // Fuente: etiqueta oficial 1 porción 55g — Your Goal Smart Nutrition
    // Energía: 161 kcal · Proteínas: 21g · Carbs disponibles: 2.6g · Grasa: 7.4g · Fibra: 3.2g
    baseKcal: 161, p: 21, c: 3, g: 7,
    foto: 'https://hausnusse.cl/cdn/shop/files/Black2.png?v=1692795895',
    tiempo: '0 min',
    pasos: [
      'Consumir directamente como colación portátil de alta proteína.',
      'Sin azúcar añadida. Baja en carbohidratos disponibles (2.6g/porción).',
      'Ideal como snack de media mañana o media tarde en planes de pérdida de grasa e hipertrofia.',
      'Refrigerar en verano para mejor textura del chocolate blanco.',
    ],
    alergenosNota: '⚠️ Protein Bite · Contiene leche, soya. Elaborado en líneas que procesan huevo y maní. Fenilcetonúricos: contiene fenilalanina (sucralosa).',
  },
  twentys_hazelnut_col: {
    label: "🔵 Twenty's Hazelnut Praline",
    items: ["1 barra Twenty's Hazelnut Praline (60g)", '200ml agua o infusión'],
    // Fuente: etiqueta oficial 1 porción 60g — Your Goal Smart Nutrition
    // Energía: 152 kcal · Proteínas: 19.4g · Carbs disp.: 5.5g · Grasa: 5.8g · Fibra: 14.3g
    baseKcal: 152, p: 19, c: 6, g: 6,
    foto: 'https://www.mixgreen.cl/cdn/shop/files/13363a.jpg?v=1724272525',
    tiempo: '0 min',
    pasos: [
      'Consumir directamente como colación portátil de alta proteína y fibra.',
      '19g de proteína de leche + 14g de fibra dietética por barra — alta saciedad.',
      'Sin azúcar añadida · Sin gluten · Low carb garantizado.',
      'Sabor avellana con cobertura de chocolate blanco y nibs de cacao crujientes.',
      'Ideal para planes hipocalóricos, hiperproteicos o bajos en carbohidratos.',
    ],
    alergenosNota: '⚠️ Twenty\'s · Contiene leche, soya (lecitinas), avellana. Elaborado en líneas que procesan huevo, maní, nueces y sulfitos.',
  },
  moroketo_col: {
    label: '🍪 Galletón Moroketo Proteína',
    items: ['1 galletón Moroketo (45g)', 'Té o infusión sin azúcar'],
    baseKcal: 231, p: 36, c: 0, g: 19,
    foto: USP('1490474418585-ba9bad8fd0ea'),
    tiempo: '0 min',
    pasos: [
      'Consumir directo como colación sólida.',
      'Sin gluten · Chocolate 85% cacao · Sin azúcar añadida.',
      'Combinar con una infusión sin azúcar para mayor saciedad.',
    ],
    alergenosNota: '✅ Moroketo Proteína · Sin gluten · Chocolate 85% cacao · Sin azúcar añadida.',
  },
  alfajor_keto_col: {
    label: '🍫 Alfajor Keto Nutrevo',
    items: ['1 alfajor Keto Nutrevo (65g)', '200ml agua'],
    baseKcal: 297, p: 33, c: 0, g: 21,
    foto: USP('1490474418585-ba9bad8fd0ea'),
    tiempo: '0 min',
    pasos: [
      'Consumir directamente como colación keto/proteica.',
      'Bajo en carbohidratos. Ideal para planes de pérdida de grasa.',
      'Conservar en lugar fresco y seco.',
    ],
    alergenosNota: '⚠️ Alfajor Keto · Contiene leche, soya, huevo. Revisar etiqueta si hay alergias.',
  },

  hummus_verduras: {
    label: 'Hummus + bastones de verdura',
    items: ['80g hummus', 'Bastones de zanahoria, apio y pepino', '5 galletas integrales'],
    baseKcal: 215, p: 8, c: 26, g: 9,
    foto: USP('1637949385162-e416fb15b2ce'), // bowl de hummus con garnish de aceite, foto real
    tiempo: '5 min',
    pasos: [
      'Lavar y cortar las verduras en bastones del mismo tamaño.',
      'Colocar el hummus en un bol pequeño al centro del plato.',
      'Disponer los bastones de verdura y galletas alrededor del hummus.',
      'Colación alta en fibra y grasas saludables del garbanzo.',
    ],
  },
}

// ─── ALMUERZOS ────────────────────────────────────────────────────────────────
export const almuerzosOpts: Record<string, MealOption> = {
  pollo_arroz: {
    label: 'Pollo a la plancha + arroz integral + ensalada',
    items: ['200g pechuga pollo a la plancha', '150g arroz integral cocido', 'Ensalada de tomate, pepino y lechuga', '1 cda aceite de oliva'],
    baseKcal: 580, p: 52, c: 58, g: 12,
    foto: IMG + 'pollo_plancha_arroz_ensalada.jfif',
    tendencia: ['omnivoro'],
    tiempo: '30 min',
    pasos: [
      'Pollo: sazonar la pechuga con sal, pimienta, ajo en polvo y gotas de limón. Cocinar 6-7 min por lado en plancha caliente con spray de aceite. El sellado a fuego alto retiene los jugos.',
      'Arroz: cocinar en 2 tazas de agua con pizca de sal. Llevar a hervor, bajar a fuego bajo y tapar 18-20 min. El arroz integral aporta fibra y menor índice glicémico.',
      'Ensalada: cortar tomate y pepino. Aliñar con 1 cda de aceite de oliva, sal y limón. El aceite mejora la absorción de licopeno del tomate.',
      'Reposo: dejar reposar el pollo 2 min antes de cortar para que los jugos se redistribuyan.',
      'Armado: servir el pollo junto al arroz y la ensalada al costado.',
    ],
  },
  carne_papas: {
    label: 'Carne magra + papas cocidas + ensalada',
    items: ['150g carne magra (posta, lomo o filete)', '1 papa mediana cocida con cáscara', 'Ensalada de lechuga, tomate y pepino', '1 cdta aceite de oliva'],
    baseKcal: 590, p: 46, c: 54, g: 16,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    tiempo: '30 min',
    pasos: [
      'Papa: lavar y cocinar entera con cáscara en agua hirviendo con sal 20-25 min. La cáscara conserva nutrientes y reduce el índice glicémico.',
      'Carne: sazonar con sal, pimienta, ajo y limón. Cocinar en plancha bien caliente 4-5 min por lado según grosor. La carne magra aporta proteína de alto valor biológico sin exceso calórico.',
      'Reposo: dejar reposar la carne 2-3 min antes de cortar para redistribuir los jugos.',
      'Ensalada: cortar las verduras en trozos medianos. Aliñar con aceite, sal y limón.',
      'Armado: servir la carne junto a la papa partida y la ensalada al costado.',
    ],
  },
  salmon_quinoa: {
    label: 'Salmón al horno + quinoa + verduras',
    items: ['200g salmón fresco', '100g quinoa cocida', '150g verduras salteadas (zapallo, pimentón, espinaca)', '1 cdta aceite de oliva'],
    baseKcal: 600, p: 48, c: 42, g: 20,
    foto: IMG + 'salmon_quinoa.webp',
    tendencia: ['omnivoro'],
    tiempo: '30 min',
    pasos: [
      'Quinoa: lavar en colador fino bajo agua fría. Cocinar en 2 tazas de agua con sal a fuego medio-bajo 15 min tapado. La quinoa es proteína completa con índice glicémico bajo.',
      'Salmón: sazonar con sal, pimienta, ajo y limón. Cocinar en sartén 3-4 min por lado hasta que el centro esté opaco pero jugoso. Aporta EPA y DHA con efecto antiinflamatorio.',
      'Reposo: retirar el salmón y dejar reposar 2 min antes de servir.',
      'Verduras: en la misma sartén, saltear las verduras 3-4 min a fuego alto con ajo y sal.',
      'Armado: servir la quinoa como base, el salmón encima y las verduras al costado. Finalizar con limón.',
    ],
  },
  ensalada_proteica_alm: {
    label: 'Ensalada proteica de pollo + huevo + palta',
    // Macros base por porción: 150g pollo (250kcal/47g prot/0g CH/5g G) + 1 huevo (78kcal/6g P/0.6g CH/5g G)
    // + ½ palta (120kcal/1.5g P/6g CH/11g G) + verduras (60kcal/2g P/12g CH/0.5g G)
    // + 100g quinoa cocida (120kcal/4g P/21g CH/2g G) + 1 cda aceite oliva (90kcal/0/0/10g G)
    // Total: 718 kcal · 60g prot · 40g CH · 34g grasa
    items: ['150g pollo a la plancha en tiras', '1 huevo duro o pochado', '½ palta en láminas', '100g quinoa cocida', 'Mix de verduras: lechuga, tomate cherry, pepino, zanahoria', '1 cda aceite de oliva'],
    baseKcal: 718, p: 60, c: 40, g: 34, tieneHuevo: true, eggsDefault: 1,
    foto: IMG + 'ensalada_proteica.webp',
    tendencia: ['omnivoro'],
    tiempo: '25 min',
    pasos: [
      'Quinoa: enjuagar bien y cocinar en proporción 1:2 con agua. Hervir 15 min a fuego bajo. Escurrir y dejar enfriar.',
      'Pollo: sazonar con sal, pimienta y limón. Cocinar en plancha 5-6 min por lado. Dejar reposar 2 min y cortar en tiras.',
      'Huevo: cocinar a elección: duro (10 min) o pochado (agua con vinagre, 3 min). El huevo aporta proteína de alto valor biológico y vitamina D.',
      'Palta: cortar en láminas justo antes de servir para evitar oxidación. Aporta ácido oleico que mejora absorción de vitaminas liposolubles.',
      'Verduras: lavar y secar el mix. Cortar tomate cherry, pepino y zanahoria rallada.',
      'Armado: disponer la quinoa como base, agregar las verduras, el pollo, huevo y palta. Aliñar con aceite de oliva y limón.',
    ],
  },
  arroz_huevo_saltado: {
    label: 'Arroz saltado con huevo y verduras',
    items: ['160g arroz cocido (idealmente frío del día anterior)', '2-3 huevos enteros', 'Verduras a gusto: zanahoria, zapallo, pimentón', '1 cdta aceite + salsa de soya opcional'],
    baseKcal: 550, p: 32, c: 70, g: 14, tieneHuevo: true, eggsDefault: 2,
    foto: IMG + 'salteado_de_arroz_con_huevo.webp',
    tendencia: ['vegetariano'],
    tiempo: '15 min',
    pasos: [
      'Arroz: usar arroz frío del día anterior. El almidón retrogradado del arroz frío tiene menor índice glicémico y saltea mejor.',
      'Verduras: cortar en trozos pequeños y uniformes. Calentar aceite en wok a fuego alto. Saltear 3-4 min hasta tiernas con textura.',
      'Huevos: empujar verduras al borde. Verter los huevos batidos al centro. Revolver hasta ¾ de cocción.',
      'Integrar: agregar el arroz frío y mezclar continuamente 2-3 min hasta que esté caliente.',
      'Sazonar con sal, pimienta y salsa de soya si usas. Servir de inmediato.',
    ],
  },
  legumbres_arroz: {
    label: 'Porotos / lentejas + arroz integral',
    items: ['200g porotos o lentejas cocidas', '100g arroz integral cocido', 'Sofrito de tomate, cebolla y ajo', 'Ensalada mixta'],
    baseKcal: 550, p: 30, c: 80, g: 8,
    foto: USP('1503838922633-d7892c7a2bc0'), // porotos/lentejas en bol con cuchara, foto real
    tendencia: ['vegetariano', 'vegano'],
    tiempo: '25 min',
    pasos: [
      'Sofrito: saltear cebolla y ajo picados en aceite hasta transparentar. Agregar tomate y cocinar 5 min.',
      'Legumbres: agregar las legumbres ya cocidas al sofrito. Mezclar y sazonar con sal, comino y orégano.',
      'Arroz: cocinar aparte en agua con sal. El arroz integral se cocina en 18-20 min a fuego bajo tapado.',
      'Armado: servir las legumbres junto al arroz y la ensalada mixta al costado.',
    ],
  },
  pavo_papas: {
    label: 'Pechuga de pavo + papas + ensalada',
    items: ['200g pechuga pavo a la plancha', '150g papas cocidas con perejil', 'Ensalada de pepino y tomate', '1 cdta aceite de oliva'],
    baseKcal: 560, p: 48, c: 52, g: 11,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    tiempo: '25 min',
    pasos: [
      'Papas: cocer con cáscara en agua hirviendo con sal 20 min. Escurrir y espolvorear perejil fresco.',
      'Pavo: sazonar con sal, pimienta y ajo. Cocinar en plancha caliente 5-6 min por lado hasta dorar.',
      'Reposo: dejar reposar el pavo 2 min antes de cortar.',
      'Ensalada: cortar pepino y tomate. Aliñar con aceite, sal y limón.',
      'Armado: servir el pavo con las papas y la ensalada al costado.',
    ],
  },
  tofu_quinoa: {
    label: 'Tofu salteado + quinoa + verduras',
    items: ['180g tofu firme', '100g quinoa cocida', '150g verduras salteadas (pimentón, zapallo, champiñones)', '1 cdta aceite de oliva + salsa de soya reducida en sodio'],
    baseKcal: 540, p: 34, c: 46, g: 18,
    foto: USP('1546069930-d8b9-4567-86b8-2f814bbb4f08'),
    tiempo: '25 min',
    tendencia: ['vegetariano', 'vegano'],
    pasos: [
      'Quinoa: lavar bajo agua fría en colador fino. Cocinar en 2 tazas de agua con sal a fuego bajo 15 min tapado. Reposar 5 min antes de esponjar con tenedor.',
      'Tofu: cortar en cubos de 2cm. Secar con papel absorbente para eliminar el exceso de agua — así queda crocante al saltear.',
      'Saltear el tofu en aceite caliente a fuego alto 4-5 min por lado hasta dorar. Agregar 1 cdta salsa de soya al final.',
      'Verduras: en la misma sartén, saltear pimentón, zapallo y champiñones 3-4 min. El champiñón aporta umami natural.',
      'Armado: servir la quinoa como base, el tofu encima y las verduras al costado. El tofu aporta proteína completa de origen vegetal.',
    ],
  },
  bowl_garbanzos: {
    label: 'Bowl de garbanzos + vegetales asados',
    items: ['200g garbanzos cocidos', '150g vegetales asados (zanahoria, berenjena, zapallo)', '1 cda tahini o aceite de oliva', '80g arroz integral o pan pita integral'],
    baseKcal: 560, p: 28, c: 72, g: 12,
    foto: USP('1512621776951-a52572ce91c9'),
    tiempo: '30 min',
    tendencia: ['vegetariano', 'vegano'],
    pasos: [
      'Vegetales: cortar en trozos medianos, mezclar con aceite, sal y comino. Asar a 200°C por 20-25 min hasta caramelizar.',
      'Garbanzos: si son de lata, enjuagar bien. Si son secos, remojar 12h y hervir 45 min. Los garbanzos aportan 15g de proteína por 100g.',
      'Arroz: cocinar en agua con sal a fuego bajo 18-20 min tapado.',
      'Salsa: mezclar tahini con limón, ajo y agua hasta lograr consistencia cremosa.',
      'Armado: colocar el arroz como base, los garbanzos y vegetales asados encima. Bañar con la salsa de tahini.',
    ],
  },
  curry_garbanzos: {
    label: 'Curry de garbanzos + arroz integral',
    items: ['200g garbanzos cocidos', '150g arroz integral cocido', 'Leche de coco 100ml + curry en polvo', '150g espinaca y tomate cherry', '1 cdta aceite de coco o de oliva'],
    baseKcal: 560, p: 26, c: 74, g: 14,
    foto: USP('1565557981-d9a55e1b9e6c'),
    tiempo: '25 min',
    tendencia: ['vegetariano', 'vegano'],
    pasos: [
      'Sofrito: calentar aceite en sartén profunda. Saltear cebolla y ajo 3 min hasta transparentar.',
      'Especias: agregar 1 cdta curry, cúrcuma y comino. Tostar 1 min sin quemar — libera aromas y activa los polifenoles.',
      'Garbanzos: incorporar los garbanzos cocidos y el tomate cherry. Revolver bien.',
      'Leche de coco: agregar los 100ml y llevar a fuego suave 8-10 min hasta que la salsa espese.',
      'Espinaca: añadir al final, cocinar 2 min. Servir sobre el arroz integral. La cúrcuma tiene efecto antiinflamatorio documentado.',
    ],
  },
  vegetal_burger_abuelo: {
    label: 'Vegetal Burger Porotos Negros + papas',
    items: ['100g medallón vegetal (porotos negros + zapallo italiano)', '200g papas cocidas con cáscara', '2 tazas ensalada mixta (lechuga, tomate, pepino, pimentón)', '1 cdta aceite de oliva + mostaza sin azúcar'],
    baseKcal: 350, p: 13, c: 55, g: 10,
    foto: IMG + 'vegetal_burguer_abuelo.jpg',
    tiempo: '25 min',
    tendencia: ['vegetariano', 'vegano'],
    alergenosNota: 'Ingredientes: Porotos negros, Agua, Cebolla, Aceite de soya, Zapallo italiano (5%), Champiñones, Pimentón rojo, Harina de trigo (gluten), Metilcelulosa, Sal, Extracto de levadura, Maltodextrina, Aceite de maravilla, Aceite de canola, Saborizante idéntico a natural, Dióxido de silicio amorfo. Puede contener trazas de huevo, leche y alimentos cárnicos. Contiene gluten (harina de trigo) — no apto para celíacos.',
    pasos: [
      'Sartén o plancha: cocinar el medallón congelado directo a fuego medio-alto, 4-5 min por lado sin presionar. No descongelar antes — cocinar directo da mejor textura.',
      'Papas: cocer con cáscara en agua hirviendo 20-22 min o al microondas 8 min. Sazonar con sal y hierbas al gusto.',
      'Ensalada: lavar y secar las verduras. Trozar tomate, pepino y pimentón. Aliñar con aceite, sal y limón justo antes de servir.',
      'Armado: servir el medallón con las papas y la ensalada. Aporta 7.7 g de proteína vegetal (porotos negros) por medallón.',
      'Nota: el medallón puede presentar color morado/rosado natural por los porotos negros — es normal y no indica carne cruda.',
    ],
  },
  beyond_burger: {
    label: 'Beyond Burger + ensalada + papas',
    items: ['85g Beyond Burger (1 medallón vegetal)', '2 tazas ensalada mixta (lechuga, tomate, pepino)', '150g papas cocidas o asadas', '1 cdta aceite de oliva + mostaza o ketchup sin azúcar'],
    baseKcal: 560, p: 30, c: 54, g: 20,
    foto: IMG + 'beyond_burguer.jpg',
    tiempo: '20 min',
    tendencia: ['vegetariano', 'vegano'],
    sellos: ['Alto en Grasas Saturadas (5,1 g/porción)'],
    alergenosNota: 'Ingredientes: Agua, Aislado de proteína de arveja, Aceite de canola, Aceite de coco refinado, Proteína de arroz, Almidón de papa, Saborizantes naturales vegetales, Levadura seca, Proteína de frijol mungo, Metilcelulosa, Extracto de manzana, Extracto de granada, Extracto de levadura, Cloruro de potasio, Sal, Extracto de betarraga, Concentrado de jugo de limón, Lecitina de maravilla, Extracto licopeno de tomate, Aceite de maravilla, Glicerina vegetal, Maltodextrina, Ácido ascórbico, Vinagre. Sin gluten · Sin soya · Sin mariscos · Sin lácteos · Sin huevo. Elaborado en planta que también procesa soya y gluten.',
    pasos: [
      'Sartén o plancha: calentar a fuego alto sin aceite. Cocinar el medallón 3 min por lado hasta dorar. No presionar para que retenga los jugos.',
      'Papas: cocer con cáscara en agua hirviendo 20 min o en microondas 8 min. Sazonar con sal y hierbas.',
      'Ensalada: lavar y secar las verduras. Aliñar con aceite de oliva, sal y limón justo antes de servir.',
      'Armado: servir el Beyond Burger junto a las papas y la ensalada. Aporta 15,3 g de proteína vegetal completa (arveja + arroz) por porción.',
      'Nota: el color rosado al centro es normal — se debe al extracto de betarraga, no indica carne cruda.',
    ],
  },
}

// ─── CENAS ────────────────────────────────────────────────────────────────────
export const cenasOpts: Record<string, MealOption> = {
  pollo_verduras: {
    label: 'Pechuga de pollo + verduras al vapor',
    items: ['150g pechuga pollo a la plancha', '200g mix verduras al vapor (brócoli, zanahorias, zapallito)', '1 cdta aceite de oliva', 'Limón y ajo'],
    baseKcal: 320, p: 40, c: 16, g: 9,
    foto: IMG + 'pollo_plancha_arroz_ensalada.jfif',
    tendencia: ['omnivoro'],
    tiempo: '20 min',
    pasos: [
      'Pollo: sazonar con sal, pimienta, ajo y limón. Cocinar en plancha 6-7 min por lado.',
      'Verduras: colocar en vaporera o colador sobre agua hirviendo. Tapar y cocinar 8-10 min hasta tiernas pero firmes.',
      'Alternativa horno: disponer las verduras en una fuente, rociar con aceite y sal, hornear 15 min a 200°C.',
      'Reposo: dejar reposar el pollo 2 min antes de cortar en tiras.',
      'Servir el pollo con las verduras al vapor. Aliñar con limón y aceite de oliva.',
    ],
  },
  huevos_ensalada: {
    label: 'Omelette de huevos + ensalada verde',
    items: ['3 huevos enteros', 'Espinacas, champiñones y tomate', 'Ensalada de hojas verdes', '1 cdta aceite de oliva'],
    baseKcal: 310, p: 28, c: 10, g: 18, tieneHuevo: true, eggsDefault: 3,
    foto: IMG + 'omelette_pan_integral.jfif',
    tendencia: ['vegetariano'],
    tiempo: '12 min',
    pasos: [
      'Batido: mezclar los 3 huevos con sal y pimienta hasta homogeneizar.',
      'Verduras: saltear espinaca y champiñones 2 min en sartén con unas gotas de aceite.',
      'Cocción: verter los huevos sobre las verduras en sartén a fuego medio-bajo. Cuando los bordes cuajen, doblar el omelette.',
      'Ensalada: lavar las hojas verdes y aliñar con aceite, sal y limón.',
      'Servir el omelette junto a la ensalada verde.',
    ],
  },
  atun_ensalada: {
    label: 'Ensalada proteica de atún + huevo + palta',
    items: ['150g atún en agua escurrido', '1 huevo duro', '¼ palta', 'Lechuga, tomate cherry, pepino, zanahoria rallada'],
    baseKcal: 330, p: 36, c: 12, g: 14, tieneHuevo: true, eggsDefault: 1,
    foto: IMG + 'ensalada_proteica.webp',
    tendencia: ['omnivoro'],
    tiempo: '15 min',
    pasos: [
      'Atún: escurrir bien la lata. El atún en agua aporta 26g de proteína por 100g con solo 1g de grasa.',
      'Huevo: cocinar duro 10 min en agua hirviendo. Pelar y cortar en mitades.',
      'Palta: cortar en láminas justo antes de servir. Aporta grasas monoinsaturadas saludables.',
      'Verduras: lavar y cortar tomate cherry, pepino y zanahoria. Las verduras crudas conservan vitamina C y folato.',
      'Armado: disponer verduras como base, agregar atún, huevo y palta. Aliñar con aceite de oliva y limón.',
    ],
  },
  salmon_brocoli: {
    label: 'Salmón al horno + brócoli al vapor',
    items: ['150g salmón al horno', '200g brócoli al vapor', '1 cdta aceite de oliva', 'Ajo y limón al gusto'],
    baseKcal: 340, p: 38, c: 8, g: 16,
    foto: IMG + 'salmon_quinoa.webp',
    tendencia: ['omnivoro'],
    tiempo: '20 min',
    pasos: [
      'Salmón: sazonar con sal, pimienta, ajo y limón. Cocinar en sartén 3-4 min por lado hasta que el centro esté opaco pero jugoso.',
      'Brócoli: colocar en vaporera sobre agua hirviendo 8-10 min. Debe quedar tierno pero con textura.',
      'Alternativa: hornear salmón a 180°C por 12-15 min cubierto con papel aluminio.',
      'Reposo: retirar el salmón y dejar reposar 2 min.',
      'Servir el salmón junto al brócoli. Finalizar con gotas de limón y aceite.',
    ],
  },
  carne_zapallo: {
    label: 'Carne magra + zapallo italiano + ensalada',
    items: ['150g bistec magro a la plancha', '200g zapallo italiano salteado', 'Ensalada de hojas verdes', 'Sal, pimienta y ajo al gusto'],
    baseKcal: 310, p: 35, c: 14, g: 11,
    foto: IMG + 'carne_con_papas..webp',
    tendencia: ['omnivoro'],
    tiempo: '20 min',
    pasos: [
      'Carne: sazonar con sal, pimienta y ajo. Cocinar en plancha bien caliente 4-5 min por lado.',
      'Reposo: dejar reposar 2-3 min antes de cortar para redistribuir los jugos.',
      'Zapallo: cortar en rodajas de 1cm. Saltear en sartén con unas gotas de aceite y ajo 4-5 min hasta dorar.',
      'Ensalada: lavar hojas verdes y aliñar con limón y sal.',
      'Servir la carne con el zapallo salteado y la ensalada al costado.',
    ],
  },
  sopa_pollo: {
    label: 'Sopa de pollo y verduras',
    items: ['150g pollo desmenuzado', 'Zanahoria, apio, puerro y papas', 'Caldo natural bajo en sodio', 'Perejil fresco al gusto'],
    baseKcal: 290, p: 30, c: 22, g: 6,
    foto: USP('1627366422957-3efa9c6df0fc'), // sopa con carne en bol blanco, foto real
    tendencia: ['omnivoro'],
    tiempo: '35 min',
    pasos: [
      'Caldo: calentar 1 litro de caldo de pollo en una olla grande a fuego medio.',
      'Verduras: pelar y cortar en trozos medianos zanahoria, puerro, apio y papa. Agregar al caldo.',
      'Cocinar 20-25 min hasta que las verduras estén tiernas.',
      'Pollo: agregar el pollo desmenuzado (puede ser cocido o crudo: si crudo, agregar desde el inicio).',
      'Rectificar sal. Servir caliente con perejil fresco picado.',
    ],
  },
  sopa_lentejas: {
    label: 'Sopa de lentejas + verduras',
    items: ['200g lentejas cocidas', 'Zanahoria, apio, tomate y espinaca', 'Caldo vegetal bajo en sodio', '1 rebanada pan integral'],
    baseKcal: 310, p: 22, c: 38, g: 5,
    foto: USP('1547592166-9a59b8dddb7f'),
    tiempo: '30 min',
    tendencia: ['vegetariano', 'vegano'],
    pasos: [
      'Sofrito: saltear cebolla, ajo y zanahoria en una olla con pizca de aceite 3-4 min.',
      'Tomate: agregar tomate picado, cocinar 5 min hasta ablandar.',
      'Lentejas: agregar las lentejas ya cocidas y el caldo vegetal. Llevar a hervor y cocinar 10-15 min a fuego bajo.',
      'Espinaca: agregar al final, cocinar 2 min más. La espinaca aporta hierro no hemo que se absorbe mejor con el limón.',
      'Servir caliente con 1 rebanada de pan integral. Exprimir limón antes de consumir para mejorar absorción del hierro.',
    ],
  },
  ensalada_garbanzos: {
    label: 'Ensalada de garbanzos + palta + huevo',
    items: ['150g garbanzos cocidos', '½ palta en láminas', '2 huevos duros', 'Lechuga, tomate cherry, pepino y zanahoria rallada', '1 cdta aceite de oliva + limón'],
    baseKcal: 390, p: 26, c: 32, g: 18,
    foto: USP('1512621776951-a52572ce91c9'),
    tiempo: '15 min',
    tendencia: ['vegetariano'],
    pasos: [
      'Huevos: cocinar duros 10 min en agua hirviendo. Pelar y cortar en mitades.',
      'Garbanzos: si son de lata, enjuagar y escurrir. Secar levemente para que absorban el aliño.',
      'Palta: cortar en láminas justo antes de servir para evitar oxidación.',
      'Verduras: lavar y cortar tomate cherry, pepino y zanahoria. Disponer en bowl grande.',
      'Armado: agregar garbanzos, huevo y palta sobre las verduras. Aliñar con aceite de oliva, limón y sal.',
    ],
  },
  wok_tofu_vegano: {
    label: 'Wok de tofu + verduras + fideos integrales',
    items: ['180g tofu firme en cubos', '100g fideos integrales o de arroz cocidos', '150g verduras (brócoli, pimentón, zanahoria, champiñones)', '1 cdta aceite de sésamo + salsa de soya'],
    baseKcal: 320, p: 24, c: 34, g: 10,
    foto: USP('1546069930-d8b9-4567-86b8-2f814bbb4f08'),
    tiempo: '20 min',
    tendencia: ['vegetariano', 'vegano'],
    pasos: [
      'Tofu: cortar en cubos de 2cm, secar con papel absorbente. Saltear en wok caliente con aceite 4-5 min por lado hasta dorar y crocante.',
      'Verduras: retirar el tofu, saltear brócoli, pimentón y zanahoria a fuego alto 3-4 min. Agregar champiñones los últimos 2 min.',
      'Fideos: incorporar los fideos ya cocidos. Mezclar continuamente 2 min.',
      'Salsa: agregar salsa de soya y aceite de sésamo. El sésamo aporta calcio biodisponible importante en dietas veganas.',
      'Reincorporar el tofu, mezclar y servir de inmediato.',
    ],
  },
  bowl_lentejas_aguacate: {
    label: 'Bowl de lentejas + aguacate + tomate',
    items: ['200g lentejas cocidas', '½ aguacate en láminas', 'Tomate cherry, pepino y rúcula', '1 cdta aceite de oliva + limón + cúrcuma'],
    baseKcal: 360, p: 22, c: 34, g: 14,
    foto: USP('1547592166-9a59b8dddb7f'),
    tiempo: '10 min',
    tendencia: ['vegetariano', 'vegano'],
    pasos: [
      'Lentejas: usar cocidas (lata o cocción previa). Escurrir y sazonar con sal, comino y limón.',
      'Verduras: cortar tomate cherry por la mitad, rodajas de pepino y lavar la rúcula.',
      'Aguacate: cortar en láminas justo antes de servir. Aporta grasas monoinsaturadas y potasio.',
      'Armado: disponer las verduras y rúcula como base, las lentejas al centro y el aguacate encima.',
      'Aliño: mezclar aceite de oliva, limón y pizca de cúrcuma. Verter sobre el bowl. Sin cocción — listo en 10 minutos.',
    ],
  },
}

// ─── ULTRA PROCESADOS ─────────────────────────────────────────────────────────
export const ultraProcOpts: Record<string, UltraOption> = {
  chips_papas: {
    label: '🍟 Papas fritas snack',
    porcion: '1 paquete pequeño (28g)',
    kcal: 536, p: 7, c: 53, g: 34,
    sellos: ['Alto en grasas saturadas', 'Alto en sodio'],
  },
  galletas_dulces: {
    label: '🍪 Galletitas Mini Costa Limón',
    porcion: '1 bolsa (35g)',
    kcal: 173, p: 1.8, c: 25.8, g: 6.9,
    sellos: ['Alto en azúcares (8.8g)', 'Alto en grasas saturadas (3.8g)', 'Alto en calorías', 'Contiene grasas trans (0.1g)', 'Alto en sodio (137.6mg)'],
  },
  chocolate_leche: {
    label: '🍫 Chocolate Trencito Nestlé',
    porcion: '6 cuadritos (25g) · 6 porciones por envase',
    kcal: 137, p: 2.1, c: 15, g: 7.6,
    sellos: ['Alto en azúcares (13.1g)', 'Alto en grasas saturadas (4.8g)', 'Contiene grasas trans (0.15g)'],
    alergenos: ['Leche', 'Soya', 'Puede contener nueces y derivados'],
  },
  bebida_cola: {
    label: '🥤 Bebida cola/gaseosa',
    porcion: '1 lata (355ml)',
    kcal: 150, p: 0, c: 40, g: 0,
    sellos: ['Alto en azúcares'],
  },
  helado: {
    label: '🍦 Sandwich Helado Vainilla (Great Value)',
    porcion: '1 sándwich (68ml) · 16 unidades por caja',
    kcal: 100, p: 2, c: 17, g: 3.5,
    sellos: ['Alto en azúcares (8g)', 'Alto en sodio (70mg)', 'Alto en calorías'],
    alergenos: ['Leche'],
  },
  doritos: {
    label: '🌽 Doritos Sabor Queso',
    porcion: '1 porción (25g) · 6 porciones por envase (150g)',
    kcal: 128, p: 1.5, c: 16, g: 6.3,
    sellos: ['Alto en sodio (197mg por porción)', 'Alto en carbohidratos (16g)', 'Grasas saturadas (0.7g)'],
    alergenos: ['Leche (queso, sólidos de leche)'],
  },
  kuchen: {
    label: '🎂 Kuchen/Pastel',
    porcion: '1 trozo (80g)',
    kcal: 350, p: 5, c: 40, g: 19,
    sellos: ['Alto en azúcares', 'Alto en grasas saturadas'],
    alergenos: ['Gluten', 'Huevo', 'Leche'],
  },
  gomitas: {
    label: '🍬 Gomitas/Dulces',
    porcion: '1 porción (30g)',
    kcal: 320, p: 6, c: 74, g: 0,
    sellos: ['Alto en azúcares'],
  },
  barra_cereal_azucar: {
    label: '🍫 Barra de cereal azucarada',
    porcion: '1 barra (35g)',
    kcal: 400, p: 4, c: 65, g: 14,
    sellos: ['Alto en azúcares'],
  },
  nuggets: {
    label: '🍗 Nuggets fritos',
    porcion: '6 unidades (100g)',
    kcal: 297, p: 15, c: 17, g: 18,
    sellos: ['Alto en sodio', 'Alto en grasas saturadas'],
  },
  chocolate_sahne_nuss: {
    label: '🍫 Chocolate Sahne-Nuss con Almendras',
    porcion: '2 cuadritos (31g) · 5 porciones por envase',
    kcal: 173, p: 3.5, c: 14.5, g: 11.2,
    sellos: ['Alto en azúcares (13.6g)', 'Alto en grasas saturadas (4.8g)', 'Contiene colesterol (5mg)'],
    alergenos: ['Almendras', 'Soya (lecitina)', 'Leche'],
  },
  donuts: {
    label: '🍩 Donuts de chocolate',
    porcion: '5 unidades (36g)',
    kcal: 522, p: 5, c: 66, g: 27,
    sellos: ['Alto en azúcares', 'Alto en grasas saturadas', 'Alto en calorías'],
    alergenos: ['Gluten', 'Leche', 'Soya', 'Huevo'],
  },
  chomp_bombon: {
    label: '🍦 Bombón Helado Chomp Frambuesa (Savory)',
    porcion: '5 bombones (75ml) · 3 porciones por envase (225ml)',
    kcal: 213, p: 0.8, c: 18.8, g: 15,
    sellos: ['Alto en azúcares (16.5g)', 'Alto en grasas saturadas (11.3g)', 'Alto en calorías', 'Contiene grasas trans (0.1g)'],
    alergenos: ['Leche'],
  },
}

// ─── Helper: obtener option con fallback ──────────────────────────────────────
export function getMealOption(
  pool: Record<string, MealOption>,
  keys: string[],
  index: number,
): MealOption {
  if (!keys || keys.length === 0) {
    return Object.values(pool)[0]
  }
  const key = keys[index % keys.length]
  return pool[key] ?? Object.values(pool)[0]
}
