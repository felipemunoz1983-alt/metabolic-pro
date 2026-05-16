// ── Catálogo oficial Nutrevo Chile ────────────────────────────────────────────
// Fuente: nutrevo.cl  |  Actualizado: 2026-05
// Integrado en: Asistente IA, Panel de Suplementos, Food Scanner

const NV_IMG = 'https://raw.githubusercontent.com/felipemunoz1983-alt/metabolic-pro/main/img/'

export type NutrievoCategory =
  | 'snack_proteico'
  | 'snack_keto'
  | 'suplemento_deportivo'
  | 'bienestar'
  | 'fermentado'
  | 'probiotico'

export type NutrievoGoal =
  | 'perdida_grasa'
  | 'masa_muscular'
  | 'rendimiento'
  | 'salud_digestiva'
  | 'bienestar_general'
  | 'keto'

export interface NutrievoProduct {
  id: string
  nombre: string
  categoria: NutrievoCategory
  precio: number           // CLP
  proteina?: number        // g por unidad/porción
  kcal?: number            // kcal por unidad/porción
  carbohidratos?: number   // g
  grasa?: number           // g
  fibra?: number           // g
  descripcion: string
  claimPorObjetivo?: Partial<Record<NutrievoGoal, string>> // claim personalizado según objetivo
  ingredientes: string[]
  beneficios: string[]
  objetivos: NutrievoGoal[]
  sinGluten: boolean
  sinLactosa: boolean
  vegano: boolean
  sinAzucarAnadida: boolean
  disponible: boolean
  url: string
  foto?: string            // URL de imagen del producto
  esDestacado?: boolean    // true = aparece en el panel Marketplace
}

export const NUTREVO_PRODUCTS: NutrievoProduct[] = [

  // ── PRODUCTOS DESTACADOS — Marketplace Centro Metabólico ─────────────────
  {
    id: 'alfajor-activa2',
    nombre: 'Alfajor Activa2',
    categoria: 'snack_proteico',
    precio: 3200,
    proteina: 15,
    kcal: 265,
    carbohidratos: 27,
    grasa: 9,
    descripcion: 'Alfajor proteico Activa2 de Nutrevo. Sin azúcar añadida, cobertura de chocolate y relleno cremoso. La colación que cuida tu progreso sin renunciar al sabor.',
    claimPorObjetivo: {
      perdida_grasa: 'Tu colación de media tarde sin culpa: 15g de proteína que frenan el hambre y cuidan el déficit.',
      masa_muscular: 'Post-entreno o colación: 15g de proteína para sostener la síntesis muscular durante el día.',
      rendimiento: 'Energía sostenida entre sesiones: carbohidratos de calidad y proteína para no llegar vacío al entreno.',
      bienestar_general: 'Disfruta un alfajor real sin azúcar añadida ni culpa — proteína incluida.',
    },
    ingredientes: ['Whey protein', 'Harina de avena', 'Alulosa', 'Cobertura de chocolate', 'Relleno cremoso'],
    beneficios: [
      'Sin azúcar añadida (alulosa)',
      '15g de proteína por unidad',
      'Sin preservantes artificiales',
      'Saciedad prolongada',
      'Alternativa saludable a snacks convencionales',
    ],
    objetivos: ['masa_muscular', 'perdida_grasa', 'rendimiento', 'bienestar_general'],
    sinGluten: false,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/alfajores-activa2/',
    foto: NV_IMG + 'nutrevo_activa2.jpg',
    esDestacado: true,
  },
  {
    id: 'moroketo-destacado',
    nombre: 'Moroketo de Proteínas',
    categoria: 'snack_keto',
    precio: 3700,
    proteina: 14,
    kcal: 210,
    carbohidratos: 4,
    grasa: 13,
    descripcion: 'Snack keto 100% vegetal. Proteína de arveja y arroz, almendra, coco, maní y chocolate 85%. Pack de 6 unidades. Bajo en carbos, alto en saciedad.',
    claimPorObjetivo: {
      perdida_grasa: 'El snack del déficit: keto, vegano y con 14g de proteína vegetal para cortar el hambre sin salirte del plan.',
      keto: 'Tu aliado keto diario: solo 4g de carbos, grasas saludables y proteína vegetal de calidad.',
      bienestar_general: 'Snack limpio, vegano y sin azúcar: proteína real con ingredientes que reconoces.',
      salud_digestiva: 'Sin gluten ni lactosa — snack fácil para digestiones sensibles.',
    },
    ingredientes: ['Aislado de proteína de arveja', 'Proteína de arroz', 'Harina de almendra', 'Harina de coco', 'Cacao', 'Maní', 'Chocolate 85%', 'Alulosa'],
    beneficios: [
      'Keto y 100% vegano',
      'Sin azúcar añadida',
      'Sin gluten y sin lactosa',
      '6 unidades por pack',
      'Proteína vegetal de alta calidad',
      'Solo 4g de carbohidratos',
    ],
    objetivos: ['perdida_grasa', 'keto', 'bienestar_general', 'salud_digestiva'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/moroketo-de-proteinas/',
    foto: NV_IMG + 'nutrevo_moroketo.jpg',
    esDestacado: true,
  },
  {
    id: 'volki-manjar',
    nombre: 'Volki de Manjar',
    categoria: 'snack_proteico',
    precio: 3500,
    proteina: 16,
    kcal: 245,
    carbohidratos: 22,
    grasa: 10,
    descripcion: 'Snack proteico de manjar chileno auténtico. El sabor de siempre con la proteína que necesitas — sin azúcar añadida. Hecho para disfrutar sin remordimiento.',
    claimPorObjetivo: {
      masa_muscular: '16g de proteína con el sabor de manjar que más te gusta — colación de ganancia sin culpa.',
      perdida_grasa: 'Satisface el antojo de dulce con 16g de proteína y sin azúcar añadida — el aliado del déficit.',
      rendimiento: 'Pre o post-entreno con sabor de verdad: proteína + carbohidratos para el músculo activo.',
      bienestar_general: 'Manjar sin azúcar añadida y con proteína real — snack chileno que cuida tu salud.',
    },
    ingredientes: ['Whey protein', 'Manjar sin azúcar', 'Harina de avena', 'Alulosa', 'Cobertura de chocolate'],
    beneficios: [
      '16g de proteína por unidad',
      'Sabor manjar auténtico',
      'Sin azúcar añadida (alulosa)',
      'Sin preservantes',
      'Alta saciedad',
    ],
    objetivos: ['masa_muscular', 'perdida_grasa', 'rendimiento', 'bienestar_general'],
    sinGluten: false,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/volki-de-manjar/',
    foto: NV_IMG + 'nutrevo_volki_manjar.jpg',
    esDestacado: true,
  },

  // ── SNACKS PROTEICOS ──────────────────────────────────────────────────────
  {
    id: 'alfajor-proteico',
    nombre: 'Alfajor de Proteínas',
    categoria: 'snack_proteico',
    precio: 3000,
    proteina: 12,
    descripcion: 'Alfajor proteico en 7 sabores (Burpee Blanco, Burpee Clásico, Double Under, Muscle Up Frambuesa, Muscle Up Manjar, Push Up Coco, Snatch Caramel). 80g por unidad.',
    ingredientes: ['Whey protein', 'Harina de avena', 'Alulosa', 'Cobertura de chocolate'],
    beneficios: [
      'Sin azúcar añadida',
      'Sin preservantes',
      'Saciedad prolongada',
      'Soporte muscular post-entreno',
      'Alternativa saludable a snacks convencionales',
    ],
    objetivos: ['masa_muscular', 'perdida_grasa', 'rendimiento'],
    sinGluten: false,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/alfajor-de-proteinas/',
  },
  {
    id: 'alfajor-keto-proteico',
    nombre: 'Alfajor Keto Proteico',
    categoria: 'snack_keto',
    precio: 3500,
    proteina: 21.5,
    descripcion: 'Alfajor keto con base de almendra y nuez. Alta proteína, bajo en carbohidratos. Ideal para déficit calórico y dieta cetogénica.',
    ingredientes: ['Harina de almendra', 'Nueces', 'Whey protein', 'Alulosa', 'Chocolate 85% cacao'],
    beneficios: [
      'Sin azúcar añadida',
      'Alta proteína (21.5g)',
      'Bajo en carbohidratos',
      'Alta saciedad por grasas saludables',
      'Apto para dieta keto',
    ],
    objetivos: ['perdida_grasa', 'keto'],
    sinGluten: true,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/alfajor-keto-proteico/',
  },
  {
    id: 'brownie-proteico-naranja-vegano',
    nombre: 'Brownie Proteico Naranja Vegano',
    categoria: 'snack_proteico',
    precio: 4900,
    proteina: 25,
    descripcion: 'Brownie proteico vegano con jugo de naranja natural. 100g por unidad. Apto para dietas plant-based.',
    ingredientes: ['Harina de avena integral', 'Proteína vegana', 'Jugo de naranja natural', 'Cacao'],
    beneficios: [
      '25g de proteína vegetal',
      'Sin productos de origen animal',
      'Sin azúcar añadida',
      'Fuente de fibra',
      'Alta densidad proteica',
    ],
    objetivos: ['masa_muscular', 'perdida_grasa', 'bienestar_general'],
    sinGluten: false,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/brownie-de-proteinas-naranja-vegano/',
  },
  {
    id: 'brownie-proteico-blanco',
    nombre: 'Brownie Protein Blanco',
    categoria: 'snack_proteico',
    precio: 4900,
    proteina: 25,
    descripcion: 'Brownie con whey protein, chocolate blanco premium, nueces y alulosa. 100g por unidad.',
    ingredientes: ['Whey protein', 'Harina de trigo integral', 'Chocolate blanco premium', 'Leche descremada', 'Huevo', 'Nueces', 'Alulosa'],
    beneficios: [
      '25g de proteína por unidad',
      'Sin azúcar añadida (alulosa)',
      'Rico en proteína de alta calidad',
      'Saciedad prolongada',
    ],
    objetivos: ['masa_muscular', 'perdida_grasa'],
    sinGluten: false,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/brownie-protein-blanco/',
  },
  {
    id: 'chocomax-protein',
    nombre: 'ChocoMax Protein',
    categoria: 'snack_proteico',
    precio: 3200,
    proteina: 19,
    descripcion: 'Snack proteico con almendra, avena, whey y cobertura de chocolate amargo 60% cacao. Bajo en azúcar.',
    ingredientes: ['Harina de almendra', 'Harina de avena', 'Whey protein', 'Huevo', 'Alulosa', 'Leche sin lactosa', 'Manjar sin azúcar', 'Chocolate 60% cacao'],
    beneficios: [
      '19g de proteína',
      'Bajo en azúcar',
      'Sin lactosa',
      'Antioxidantes del cacao',
    ],
    objetivos: ['masa_muscular', 'perdida_grasa', 'rendimiento'],
    sinGluten: false,
    sinLactosa: true,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/chocomax-protein/',
  },
  {
    id: 'moroketo',
    nombre: 'Moroketo de Proteínas',
    categoria: 'snack_keto',
    precio: 3700,
    descripcion: 'Snack keto y vegano. Aislado vegetal de arveja y arroz, almendra, coco, maní, chocolate 85% cacao. Pack 6 unidades (54g).',
    ingredientes: ['Aislado de proteína de arveja', 'Proteína de arroz', 'Harina de almendra', 'Harina de coco', 'Cacao', 'Maní', 'Chocolate 85% cacao', 'Alulosa'],
    beneficios: [
      'Keto y vegano',
      'Sin azúcar añadida',
      'Proteína vegetal de alta calidad',
      'Bajo en carbohidratos',
      '6 unidades por pack',
    ],
    objetivos: ['perdida_grasa', 'keto', 'bienestar_general'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/moroketo-de-proteinas/',
  },
  {
    id: 'power-barbell',
    nombre: 'Power Barbell Clásico',
    categoria: 'snack_proteico',
    precio: 3000,
    proteina: 15,
    descripcion: 'Barra proteica con chocolate belga 65%, nueces y mermelada de frambuesa sin azúcar. 80g. Sabores: chocolate-frambuesa y manjar-chocolate blanco.',
    ingredientes: ['Chocolate belga 65%', 'Nueces', 'Harina de trigo', 'Cacao amargo', 'Mermelada de frambuesa sin azúcar', 'Alulosa'],
    beneficios: [
      '15g de proteína por barra',
      'Sin azúcar añadida',
      'Grasas saludables de nueces',
      'Ideal como colación pre/post-entreno',
    ],
    objetivos: ['masa_muscular', 'rendimiento', 'perdida_grasa'],
    sinGluten: false,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/power-barbell-clasico/',
  },
  {
    id: 'galleton-keto',
    nombre: 'Galleta de Chocolate Keto',
    categoria: 'snack_keto',
    precio: 2600,
    kcal: 114,
    fibra: 2.7,
    descripcion: 'Galleta keto con almendras y cacao 85%. 114 kcal por unidad, solo 1.4g de azúcar, 2.7g de fibra. Sin azúcar añadida.',
    ingredientes: ['Almendras', 'Cacao 85%', 'Alulosa', 'Fibra de avena'],
    beneficios: [
      'Solo 114 kcal',
      'Mínimo impacto glucémico',
      'Rica en fibra',
      'Sin azúcar añadida',
      'Apto dieta keto',
    ],
    objetivos: ['perdida_grasa', 'keto'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/galleton-de-chocolate-keto/',
  },
  {
    id: 'galleton-keto-proteico',
    nombre: 'Galleta Keto Proteica',
    categoria: 'snack_keto',
    precio: 2590,
    proteina: 11.7,
    carbohidratos: 3.4,
    fibra: 8,
    descripcion: 'Galleta keto con proteína vegetal + albúmina. 11.7g proteína, 8g fibra, solo 3.4g carbohidratos. Sin gluten ni lactosa.',
    ingredientes: ['Harina de almendra', 'Proteínas vegetales', 'Albúmina', 'Fibra de avena', 'Fibra de coco', 'Cacao 100%', 'Chocolate 85%', 'Alulosa'],
    beneficios: [
      '11.7g de proteína',
      '8g de fibra por unidad',
      'Solo 3.4g de carbohidratos',
      'Sin gluten y sin lactosa',
      'Alta saciedad',
    ],
    objetivos: ['perdida_grasa', 'keto'],
    sinGluten: true,
    sinLactosa: true,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/galleton-keto-proteico/',
  },

  // ── SUPLEMENTOS DEPORTIVOS ─────────────────────────────────────────────────
  {
    id: 'whey-protein',
    nombre: 'Whey Protein',
    categoria: 'suplemento_deportivo',
    precio: 41990,
    proteina: 29,
    descripcion: 'Proteína de suero de leche. 29g de proteína por scoop con 3g de leucina. 700g por envase. Soporte muscular y saciedad.',
    ingredientes: ['Concentrado de proteína de suero de leche (whey)', 'Leucina', 'Saborizantes naturales'],
    beneficios: [
      '29g de proteína por porción',
      '3g de leucina para síntesis muscular',
      'Absorción rápida post-entreno',
      'Soporte muscular y saciedad',
      '700g por envase',
    ],
    objetivos: ['masa_muscular', 'rendimiento', 'perdida_grasa'],
    sinGluten: true,
    sinLactosa: false,
    vegano: false,
    sinAzucarAnadida: false,
    disponible: true,
    url: 'https://nutrevo.cl/producto/whey-protein/',
  },
  {
    id: 'iso100-dymatize',
    nombre: 'Whey ISO100 Dymatize',
    categoria: 'suplemento_deportivo',
    precio: 2700,
    proteina: 25,
    carbohidratos: 1,
    descripcion: 'Whey hidrolizada + aislada. 25g proteína, 1g carbos, <1g azúcar. Sin lactosa. Certificación INFORMED CHOICE. Sachet individual 30-33g. Sabores: Chocolate Gourmet, Cocoa Pebbles, Vainilla Gourmet.',
    ingredientes: ['Proteína de suero hidrolizada', 'Proteína de suero aislada', 'Saborizantes naturales'],
    beneficios: [
      '25g de proteína de máxima calidad',
      'Solo 1g de carbohidratos',
      'Sin lactosa',
      'Certificado INFORMED CHOICE (anti-doping)',
      'Formato sachet práctico',
      'Absorción ultrarrápida (hidrolizada)',
    ],
    objetivos: ['masa_muscular', 'rendimiento', 'perdida_grasa'],
    sinGluten: true,
    sinLactosa: true,
    vegano: false,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/whey-protein-iso100-dymatize/',
  },
  {
    id: 'creatina',
    nombre: 'Creatina',
    categoria: 'suplemento_deportivo',
    precio: 29900,
    descripcion: 'Creatina pura monohidratada. 300g por envase. Respaldada por evidencia científica para esfuerzos cortos de alta intensidad.',
    ingredientes: ['Creatina monohidratada'],
    beneficios: [
      'Mayor rendimiento en esfuerzos explosivos',
      'Soporte de ganancia muscular',
      'Respaldada por más de 500 estudios científicos',
      'Sin aditivos',
      '300g por envase',
    ],
    objetivos: ['masa_muscular', 'rendimiento'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: false,
    url: 'https://nutrevo.cl/producto/creatina/',
  },

  // ── BIENESTAR ─────────────────────────────────────────────────────────────
  {
    id: 'magnesio-triptofano',
    nombre: 'Magnesio + L-Triptófano',
    categoria: 'bienestar',
    precio: 22490,
    descripcion: 'Suplemento de 3 tipos de magnesio de alta absorción + L-triptófano para mejorar la calidad del sueño. 32g por envase. No genera habituación.',
    ingredientes: ['Glicinato de magnesio', 'Citrato de magnesio', 'Malato de magnesio', 'L-Triptófano'],
    beneficios: [
      'Mejora la calidad del sueño',
      'No genera habituación ni dependencia',
      '3 formas de magnesio de alta absorción',
      'L-triptófano precursor de serotonina y melatonina',
      'Reduce el estrés y la ansiedad nocturna',
    ],
    objetivos: ['bienestar_general', 'rendimiento'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: false,
    url: 'https://nutrevo.cl/producto/magnesio-l-triptofano/',
  },

  // ── FERMENTADOS ───────────────────────────────────────────────────────────
  {
    id: 'chucrut-tradicional',
    nombre: 'Chucrut Tradicional',
    categoria: 'fermentado',
    precio: 8990,
    descripcion: 'Chucrut artesanal fermentado crudo y vivo. Solo repollo verde y sal marina. Sin pasteurizar, sin aditivos, sin vinagre, sin azúcar, sin lácteos ni gluten.',
    ingredientes: ['Repollo verde', 'Sal marina'],
    beneficios: [
      'Probióticos naturales vivos',
      'Sin pasteurizar — máxima cantidad de bacterias beneficiosas',
      'Sin aditivos ni conservantes',
      'Mejora la microbiota intestinal',
      'Fuente natural de vitamina C y K',
    ],
    objetivos: ['salud_digestiva', 'bienestar_general'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/chucrut-tradicional/',
  },
  {
    id: 'tesoros-marinos',
    nombre: 'Tesoros Marinos',
    categoria: 'fermentado',
    precio: 8990,
    descripcion: 'Fermentado de repollo con cochayuyo, limón, cebolla y sal marina. Fermentación en frío. Sin aditivos. Certificado sin gluten. Requiere refrigeración — despacho local.',
    ingredientes: ['Repollo', 'Cochayuyo', 'Limón', 'Cebolla', 'Sal marina'],
    beneficios: [
      'Probióticos naturales del fermentado',
      'Yodo y minerales del cochayuyo',
      'Sin gluten certificado',
      'Fermentación en frío para conservar probióticos',
    ],
    objetivos: ['salud_digestiva', 'bienestar_general'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/tesoros-marinos/',
  },
  {
    id: 'verde-vivo',
    nombre: 'Verde Vivo',
    categoria: 'fermentado',
    precio: 8990,
    descripcion: 'Fermentado de repollo verde con albahaca, cilantro y ciboulette. Probióticos + prebióticos + enzimas + vitaminas A, C y K + fibra natural.',
    ingredientes: ['Repollo verde', 'Albahaca', 'Cilantro', 'Ciboulette', 'Sal marina'],
    beneficios: [
      'Probióticos + prebióticos + enzimas en un solo producto',
      'Vitaminas A, C y K naturales',
      'Fibra natural',
      'Sin aditivos',
      'Crudo y vivo',
    ],
    objetivos: ['salud_digestiva', 'bienestar_general'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: false,
    url: 'https://nutrevo.cl/producto/verde-vivo/',
  },

  // ── PROBIÓTICOS ───────────────────────────────────────────────────────────
  {
    id: 'yoggie-probiotico',
    nombre: 'Yoggie Probiótico',
    categoria: 'probiotico',
    precio: 1090,
    descripcion: 'Yogur probiótico a base de lupino. 6 cepas probióticas — 10 mil millones UFC por unidad. Sin lácteos, sin azúcar añadida. Sabores: vainilla, frutilla, chirimoya, coco natural. 14g por unidad.',
    ingredientes: ['Base de lupino', 'Stevia', 'Cultivos probióticos (L. plantarum, L. bulgaricus, S. thermophilus, L. paracasei, L. rhamnosus, Bacillus coagulans)'],
    beneficios: [
      '10 mil millones de UFC por unidad',
      '6 cepas probióticas validadas',
      'Sin lácteos (apto intolerantes)',
      'Sin azúcar añadida',
      'Formato individual conveniente',
    ],
    objetivos: ['salud_digestiva', 'bienestar_general'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: false,
    url: 'https://nutrevo.cl/producto/yoggie-probiotico/',
  },
  {
    id: 'yoggie-frutilla',
    nombre: 'Yoggie Frutilla Proteico',
    categoria: 'probiotico',
    precio: 1090,
    descripcion: 'Yogur probiótico a base de coco. Las mismas 6 cepas, 10 mil millones UFC. Sin lácteos ni azúcar añadida. Sabores: vainilla, banana, frutilla. 14g por unidad.',
    ingredientes: ['Base de coco', 'Stevia', 'Esencia natural de coco', 'Cultivos probióticos (L. plantarum, L. bulgaricus, S. thermophilus, L. paracasei, L. rhamnosus, Bacillus coagulans)'],
    beneficios: [
      '10 mil millones de UFC por unidad',
      '6 cepas probióticas',
      'Sin lácteos ni azúcar añadida',
      'Base de coco — sabor agradable',
      'Formato individual',
    ],
    objetivos: ['salud_digestiva', 'bienestar_general'],
    sinGluten: true,
    sinLactosa: true,
    vegano: true,
    sinAzucarAnadida: true,
    disponible: true,
    url: 'https://nutrevo.cl/producto/yoggie-frutilla-en-proteinas/',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getProductosDestacados(): NutrievoProduct[] {
  return NUTREVO_PRODUCTS.filter(p => p.esDestacado && p.disponible)
}

export function getProductsByGoal(goal: NutrievoGoal): NutrievoProduct[] {
  return NUTREVO_PRODUCTS.filter(p => p.objetivos.includes(goal) && p.disponible)
}

export function getProductsByCategory(cat: NutrievoCategory): NutrievoProduct[] {
  return NUTREVO_PRODUCTS.filter(p => p.categoria === cat)
}

/** Compact text summary for AI system prompts */
export function getNutrievoAIContext(): string {
  const lines = NUTREVO_PRODUCTS.map(p => {
    const macros = [
      p.proteina ? `${p.proteina}g proteína` : '',
      p.kcal ? `${p.kcal} kcal` : '',
      p.carbohidratos ? `${p.carbohidratos}g carbos` : '',
    ].filter(Boolean).join(', ')
    const tags = [
      p.sinGluten ? 'sin gluten' : '',
      p.sinLactosa ? 'sin lactosa' : '',
      p.vegano ? 'vegano' : '',
      p.sinAzucarAnadida ? 'sin azúcar añadida' : '',
      !p.disponible ? 'SIN STOCK' : '',
    ].filter(Boolean).join(', ')
    return `• ${p.nombre} ($${p.precio.toLocaleString('es-CL')} CLP)${macros ? ` — ${macros}` : ''}${tags ? ` | ${tags}` : ''}: ${p.descripcion}`
  }).join('\n')

  return `## Productos Nutrevo Chile (marca partner — recomiéndalos cuando sean pertinentes)
${lines}

Nota: Solo recomienda productos disponibles (sin "SIN STOCK"). Menciona siempre el precio en pesos chilenos. Si el paciente tiene intolerancia a lácteos, gluten u otra restricción, filtra productos compatibles. No hagas afirmaciones médicas absolutas — usa lenguaje como "puede contribuir a" o "es una buena fuente de".`
}

export const CATEGORY_LABELS: Record<NutrievoCategory, string> = {
  snack_proteico:       'Snack Proteico',
  snack_keto:           'Snack Keto',
  suplemento_deportivo: 'Suplemento Deportivo',
  bienestar:            'Bienestar',
  fermentado:           'Fermentado Vivo',
  probiotico:           'Probiótico',
}

export const GOAL_LABELS: Record<NutrievoGoal, string> = {
  perdida_grasa:    '🔥 Pérdida de grasa',
  masa_muscular:    '💪 Masa muscular',
  rendimiento:      '⚡ Rendimiento',
  salud_digestiva:  '🦠 Salud digestiva',
  bienestar_general:'✨ Bienestar general',
  keto:             '🥑 Dieta keto',
}
