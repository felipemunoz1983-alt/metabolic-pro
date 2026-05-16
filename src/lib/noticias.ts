// ── Centro de Noticias Inteligente — Centro Metabólico Pro ────────────────────

import type { FormData } from './nutrition'

export type CategoriaNoticia =
  | 'composicion_corporal' | 'rendimiento' | 'recuperacion'
  | 'nutricion' | 'adherencia' | 'metabolismo' | 'suplementacion' | 'estacional'

export type TagPaciente =
  | 'obj_grasa' | 'obj_musculo' | 'obj_mantenimiento'
  | 'sexo_f' | 'sexo_m'
  | 'edad_40plus' | 'edad_50plus'
  | 'ej_fuerza' | 'ej_cardio' | 'ej_mixto' | 'ej_ninguno'
  | 'activo_alto' | 'activo_moderado' | 'activo_bajo'
  | 'dig_hinchazon' | 'dig_sii' | 'dig_sibo'
  | 'tend_vegano' | 'tend_vegetariano'
  | 'est_verano' | 'est_otono' | 'est_invierno' | 'est_primavera'
  // ── Composición corporal (InBody / ISAK) ──
  | 'masa_baja'          // masa muscular < umbral EWGSOP2 → sarcopenia, leucina, fuerza
  | 'masa_alta'          // masa muscular elevada → rendimiento, periodización
  | 'grasa_elevada'      // % grasa > umbral → visceral, déficit, adherencia
  | 'recomp_candidato'   // masa_baja + grasa_elevada → perfil recomposición corporal
  | 'sarcopenia_riesgo'  // masa < umbral + edad ≥ 40 → EWGSOP2 riesgo real

export interface Noticia {
  id: string
  titulo: string
  subtitulo: string
  categoria: CategoriaNoticia
  imagen: string
  tiempoLectura: number
  resumen: string
  cuerpo: string[]         // array de párrafos
  recomendacionPractica: string
  fuente: string
  evidencia: 'alta' | 'moderada' | 'emergente'
  esEvergreen: boolean
  pesoBase: number
  tagsRelevantes: TagPaciente[]
  tagsSecundarios: TagPaciente[]
}

export interface CategoriaConfig {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  icono: string
}

export const CATEGORIA_CONFIG: Record<CategoriaNoticia, CategoriaConfig> = {
  composicion_corporal: { label: 'Composición corporal', bgColor: 'bg-blue-100', textColor: 'text-blue-800', borderColor: 'border-blue-200', icono: '⚖️' },
  rendimiento:          { label: 'Rendimiento',          bgColor: 'bg-orange-100', textColor: 'text-orange-800', borderColor: 'border-orange-200', icono: '🏃' },
  recuperacion:         { label: 'Recuperación',         bgColor: 'bg-violet-100', textColor: 'text-violet-800', borderColor: 'border-violet-200', icono: '🔋' },
  nutricion:            { label: 'Nutrición',            bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', borderColor: 'border-emerald-200', icono: '🥗' },
  adherencia:           { label: 'Adherencia',           bgColor: 'bg-teal-100', textColor: 'text-teal-800', borderColor: 'border-teal-200', icono: '🎯' },
  metabolismo:          { label: 'Metabolismo',          bgColor: 'bg-rose-100', textColor: 'text-rose-800', borderColor: 'border-rose-200', icono: '⚡' },
  suplementacion:       { label: 'Suplementación',       bgColor: 'bg-amber-100', textColor: 'text-amber-800', borderColor: 'border-amber-200', icono: '💊' },
  estacional:           { label: 'Estacional',           bgColor: 'bg-sky-100', textColor: 'text-sky-800', borderColor: 'border-sky-200', icono: '🌿' },
}

export const NOTICIAS: Noticia[] = [
  {
    id: 'ventana_anabolica',
    titulo: 'La ventana anabólica: cuándo importa y cuándo es mito',
    subtitulo: 'La ciencia revisó el concepto de los 30 minutos post-entreno. Lo que realmente importa.',
    categoria: 'nutricion',
    imagen: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'Durante años creímos que debíamos comer proteína en los primeros 30 minutos o "perder" el efecto anabólico. La ciencia actual tiene una respuesta más matizada y práctica.',
    cuerpo: [
      'El concepto de "ventana anabólica" fue popularizado en los años 90 y se convirtió en dogma del fitness. La idea era que existe un período mágico de 30-60 minutos post-entrenamiento donde el músculo es especialmente receptivo a la proteína. Consumirla fuera de ese período implicaba desperdiciar parte del estrés de entrenamiento.',
      'Una revisión sistemática de Aragon y Schoenfeld publicada en el Journal of the International Society of Sports Nutrition (2013), actualizada por el consenso ISSN 2022, matizó esta creencia. La síntesis proteica muscular permanece elevada entre 24 y 48 horas post-entrenamiento. El timing sí importa, pero dentro de las 2 horas siguientes, no en los primeros 30 minutos. Y solo es crítico si el paciente entrenó en ayunas o con muchas horas sin consumir proteína.',
      'Para la mayoría de los pacientes que comen 3-4 comidas al día con fuentes proteicas adecuadas, la distribución diaria total es lo que determina la síntesis muscular. En deportistas con dos sesiones diarias o atletas de élite, el timing cobra mayor relevancia. La simplificación práctica: si comiste bien antes de entrenar, tienes margen. Si entrenaste en ayunas, come proteína dentro de las 2 horas.',
    ],
    recomendacionPractica: 'Consume 20–40 g de proteína completa (huevo, pollo, whey) dentro de las 2 horas post-entreno si entrenaste en ayunas. Si comiste bien antes, el timing es secundario a tu distribución diaria total.',
    fuente: 'Aragon & Schoenfeld JISSN 2013 · ISSN Position Stand 2022',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 8,
    tagsRelevantes: ['obj_musculo', 'ej_fuerza', 'activo_alto'],
    tagsSecundarios: ['ej_mixto', 'activo_moderado'],
  },
  {
    id: 'sarcopenia',
    titulo: 'Sarcopenia: la pérdida de músculo que empieza antes de los 40',
    subtitulo: 'No es solo un problema de mayores. La ciencia muestra que el proceso comienza décadas antes.',
    categoria: 'composicion_corporal',
    imagen: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 4,
    resumen: 'Perdemos masa muscular desde los 30 años si no entrenamos. La sarcopenia afecta la calidad de vida, el metabolismo y la longevidad, y es altamente prevenible con las herramientas correctas.',
    cuerpo: [
      'La sarcopenia fue definida formalmente por el epidemiólogo Rosenberg en 1989 y actualizada en 2019 por el consenso europeo EWGSOP2. Se define como la pérdida progresiva de masa muscular asociada a baja fuerza y rendimiento físico reducido. Sus consecuencias van desde mayor riesgo de caídas y fracturas hasta resistencia a la insulina, peor calidad de vida y mayor mortalidad en enfermedades crónicas.',
      'Lo que sorprende a muchos pacientes es que la pérdida de masa muscular comienza de forma subclínica a partir de los 30-35 años. Sin entrenamiento de fuerza y proteína adecuada, perdemos aproximadamente un 3-5% de masa muscular por década. En mujeres, este proceso se acelera significativamente en la perimenopausia: la caída del estrógeno elimina uno de los mayores estímulos anabólicos naturales del organismo femenino.',
      'La buena noticia es que la sarcopenia es altamente prevenible y, en muchos casos, reversible. El entrenamiento de fuerza con sobrecarga progresiva y una ingesta proteica distribuida de 1.6-2.2 g/kg/día son las intervenciones con mayor evidencia (ESPEN 2023). La creatina monohidratada es la estrategia suplementaria con mejor soporte científico como adyuvante, especialmente en mayores de 50 años.',
    ],
    recomendacionPractica: 'Incluye al menos 2-3 sesiones de entrenamiento de fuerza a la semana y asegura 30-40 g de proteína en cada comida principal. Esta combinación es la inversión en salud con mayor retorno comprobado a largo plazo.',
    fuente: 'EWGSOP2 Cruz-Jentoft 2019 · ESPEN 2023 · Stokes et al. JISSN 2018',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 9,
    tagsRelevantes: ['masa_baja', 'sarcopenia_riesgo', 'edad_40plus', 'sexo_f', 'activo_bajo', 'obj_grasa'],
    tagsSecundarios: ['edad_50plus', 'activo_moderado', 'recomp_candidato'],
  },
  {
    id: 'creatina_2024',
    titulo: 'Creatina en 2025: qué dice la evidencia y para quién sirve realmente',
    subtitulo: 'El suplemento más estudiado del deporte despeja mitos y confirma beneficios concretos.',
    categoria: 'suplementacion',
    imagen: 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'La creatina monohidratada tiene décadas de evidencia de nivel A. No es solo para fisicoculturistas: deportistas recreativos, mujeres y mayores de 50 también se benefician.',
    cuerpo: [
      'La creatina monohidratada es el suplemento deportivo con mayor volumen de investigación científica publicada. El Position Stand de la ISSN (2021) confirma su seguridad y eficacia: mejora el rendimiento en ejercicios de alta intensidad, aumenta las adaptaciones al entrenamiento de fuerza, y no produce daño renal en personas sanas.',
      'El mecanismo es directo: la creatina aumenta las reservas de fosfocreatina intramuscular, permitiendo una resíntesis más rápida de ATP durante esfuerzos explosivos cortos. No es magia; es bioquímica. La dosis efectiva es 3-5 g diarios en toma continua, sin necesidad de fase de carga. Se puede tomar a cualquier hora del día, con o sin comida.',
      'Más allá del gym, la creatina está siendo investigada para funciones cognitivas, neuroprotección en adultos mayores y recuperación muscular post-lesión. En mujeres, la evidencia muestra que responden igual de bien que los hombres, con la misma dosis. Para personas mayores de 50, puede ser especialmente valiosa como complemento al entrenamiento de fuerza para contrarrestar la sarcopenia.',
    ],
    recomendacionPractica: '3-5 g de creatina monohidratada al día, sin fase de carga, cualquier horario. No requiere ciclado. Si entrenas con fuerza o quieres mejorar tu composición corporal, es el suplemento con mejor relación evidencia-costo disponible.',
    fuente: 'ISSN Position Stand Creatine 2021 · Antonio et al. JISSN 2021 · Candow et al. Nutrients 2022',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 8,
    tagsRelevantes: ['masa_baja', 'sarcopenia_riesgo', 'ej_fuerza', 'obj_musculo', 'activo_alto', 'activo_moderado'],
    tagsSecundarios: ['recomp_candidato', 'ej_mixto', 'edad_40plus'],
  },
  {
    id: 'sueno_composicion',
    titulo: 'Duermes mal y no sabes por qué te cuesta cambiar tu cuerpo',
    subtitulo: 'El sueño no es un lujo: es una variable nutricional tan importante como tus macros.',
    categoria: 'recuperacion',
    imagen: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'Dormir menos de 7 horas altera las hormonas del hambre, favorece la pérdida de músculo y dificulta la quema de grasa, independientemente de cómo comes y entrenas.',
    cuerpo: [
      'Un estudio clásico de Spiegel et al. publicado en PLOS Medicine demostró que dormir solo 5-6 horas durante dos semanas eleva la grelina (hormona del hambre) en un 28% y reduce la leptina (señal de saciedad) en un 18%. El resultado práctico: hambre constante, antojos de alimentos ricos en azúcar, y menor control sobre las elecciones alimentarias, todo con la misma dieta.',
      'Nedeltcheva et al. (2010) mostró un hallazgo aún más relevante para quienes están en déficit calórico: con 5.5 horas de sueño versus 8.5 horas, la proporción de masa grasa perdida se reduce a la mitad, y se pierde más músculo. Esto significa que dos personas con el mismo déficit calórico y el mismo entrenamiento pueden tener resultados completamente distintos según cómo duerman.',
      'El cortisol elevado por falta de sueño promueve la acumulación de grasa visceral y la resistencia a la insulina. En deportistas, el sueño insuficiente deteriora la síntesis proteica, alarga la recuperación muscular y aumenta el riesgo de lesiones. 7-9 horas de sueño de calidad no es negociable cuando el objetivo es la composición corporal.',
    ],
    recomendacionPractica: 'Prioriza 7-9 horas de sueño como variable nutricional no negociable. Si tienes restricción crónica de sueño, ajusta las expectativas de progreso y considera magnesio glicinato (300 mg) antes de dormir como apoyo.',
    fuente: 'Spiegel et al. PLoS Medicine 2004 · Nedeltcheva Ann Intern Med 2010',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 8,
    tagsRelevantes: ['obj_grasa', 'activo_moderado', 'activo_alto'],
    tagsSecundarios: ['obj_musculo', 'edad_40plus'],
  },
  {
    id: 'grasa_visceral',
    titulo: 'Grasa visceral: el marcador metabólico que no ves en la balanza',
    subtitulo: 'No toda la grasa es igual. La que rodea tus órganos internos tiene consecuencias distintas.',
    categoria: 'metabolismo',
    imagen: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 4,
    resumen: 'La grasa visceral produce citoquinas inflamatorias que afectan la insulina, el colesterol y el riesgo cardiovascular. Su reducción no siempre se refleja en el peso, pero sí en el perímetro de cintura.',
    cuerpo: [
      'La grasa corporal no es homogénea. La grasa subcutánea (bajo la piel) y la grasa visceral (que rodea hígado, páncreas e intestinos) tienen comportamientos metabólicos completamente distintos. La grasa visceral libera ácidos grasos libres directamente al hígado y produce citoquinas proinflamatorias como TNF-α e IL-6, contribuyendo a resistencia a la insulina, dislipidemia y mayor riesgo cardiovascular.',
      'La buena noticia es que la grasa visceral es metabólicamente más activa que la subcutánea, lo que la hace más sensible a las intervenciones. Un déficit calórico moderado (15-20% del TDEE) combinado con ejercicio aeróbico reduce preferentemente la grasa visceral antes que la subcutánea. El perímetro de cintura es un proxy clínico simple: valores >88 cm en mujeres y >102 cm en hombres indican acumulación de riesgo.',
      'La distribución de grasas tiene un fuerte componente hormonal. El cortisol crónico (por estrés o mala calidad de sueño) es uno de los principales promotores de grasa visceral. En mujeres en menopausia, la caída de estrógenos redistribuye la grasa desde la región glútea hacia el abdomen, un cambio que el entrenamiento de fuerza puede moderar.',
    ],
    recomendacionPractica: 'Mide tu cintura mensualmente como indicador de grasa visceral. Un déficit calórico moderado + caminata diaria de 30-45 min es el protocolo más estudiado para reducirla. Prioriza el manejo del estrés y el sueño como parte del tratamiento.',
    fuente: 'Tchernof & Després NEJM 2013 · Ross et al. Ann Intern Med 2020',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 7,
    tagsRelevantes: ['grasa_elevada', 'recomp_candidato', 'obj_grasa', 'activo_bajo', 'edad_40plus'],
    tagsSecundarios: ['obj_mantenimiento', 'sexo_m'],
  },
  {
    id: 'leucina_mtor',
    titulo: 'Leucina: el aminoácido que activa el interruptor del crecimiento muscular',
    subtitulo: 'No solo importa cuánta proteína comes, sino si activas el umbral de leucina en cada comida.',
    categoria: 'nutricion',
    imagen: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'La leucina actúa como sensor de aminoácidos para activar mTORC1, el regulador principal de la síntesis proteica muscular. Sin suficiente leucina por comida, la señal anabólica no se enciende.',
    cuerpo: [
      'mTORC1 (complejo 1 de la rapamicina en mamíferos) es el principal regulador de la síntesis proteica muscular. Norton y Layman demostraron en 2006 que la leucina funciona como el aminoácido "sensor" de este complejo: existe un umbral de aproximadamente 2.5-3 g de leucina por comida necesario para activar la síntesis proteica de forma óptima. Por debajo de ese umbral, la señal es subóptima aunque el total de proteína diaria sea adecuado.',
      'Esto tiene implicancias prácticas importantes. Las fuentes con mayor concentración de leucina son: proteína de suero de leche (whey, ~11% leucina), pollo y carne (8-9%), atún (7%), y soja (8%). Para activar el umbral con proteínas vegetales, generalmente se requiere consumir mayor cantidad, ya que tienen menor concentración y digestibilidad.',
      'En adultos mayores, este umbral puede ser más difícil de alcanzar debido al fenómeno de "resistencia anabólica": la respuesta del músculo a la leucina disminuye con la edad, requiriendo dosis más altas de proteína (30-40 g por comida) para obtener la misma señalización. Este es uno de los argumentos más sólidos para aumentar la ingesta proteica a partir de los 50 años.',
    ],
    recomendacionPractica: 'Asegura al menos 30 g de proteína de alta calidad en cada comida principal (equivale a ~100-120 g de pollo, 4 huevos o 1 scoop de whey + fuente alimentaria). La distribución equitativa entre comidas supera en eficacia a concentrar la proteína en una sola ingesta.',
    fuente: 'Norton & Layman JN 2006 · Devries & Phillips 2015 · van Loon 2017',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 7,
    tagsRelevantes: ['masa_baja', 'recomp_candidato', 'obj_musculo', 'ej_fuerza', 'edad_40plus'],
    tagsSecundarios: ['sarcopenia_riesgo', 'activo_alto', 'obj_mantenimiento'],
  },
  {
    id: 'mujeres_40',
    titulo: 'Mujeres después de los 40: lo que realmente cambia en tu metabolismo',
    subtitulo: 'Estrógeno, músculo, distribución de grasa y fuerza. Qué dice la ciencia y qué puedes hacer.',
    categoria: 'composicion_corporal',
    imagen: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 5,
    resumen: 'La perimenopausia no es solo calores y cambios de humor. Tiene consecuencias directas sobre la composición corporal, la insulina y el músculo que la nutrición y el entrenamiento pueden moderar.',
    cuerpo: [
      'El estrógeno tiene efectos anabólicos directos sobre el músculo esquelético: estimula la síntesis proteica, mejora la sensibilidad a la insulina y favorece la oxidación de grasas. Cuando los niveles caen durante la perimenopausia y menopausia, el músculo pierde uno de sus principales aliados hormonales. Santosa y Jensen (2008) documentaron que la redistribución adiposa en mujeres posmenopáusicas va desde la región glúteo-femoral hacia el compartimento visceral, un patrón más asociado a riesgo metabólico.',
      'La proteína cobra mayor protagonismo en esta etapa. Estudios publicados en Menopause muestran que mujeres perimenopáusicas con ingesta proteica >1.8 g/kg/día mantienen significativamente más masa muscular y menor acumulación de grasa visceral que quienes consumen las recomendaciones estándar (0.8 g/kg). La distribución proteica equitativa entre comidas es especialmente relevante dado el fenómeno de resistencia anabólica.',
      'El entrenamiento de fuerza es la intervención no farmacológica con mayor evidencia para esta etapa: mejora la densidad ósea, aumenta la masa muscular, mejora la sensibilidad a la insulina y reduce la grasa visceral. El ACSM recomienda al menos 2-3 sesiones semanales con sobrecarga progresiva. No es optativo: es terapéutico.',
    ],
    recomendacionPractica: 'En mujeres >40 años: proteína ≥1.8 g/kg/día distribuida en 3 comidas principales, entrenamiento de fuerza 2-3x/semana con sobrecarga progresiva, y suplementación con vitamina D + calcio si hay déficit documentado. Estos son los pilares con mayor evidencia para esta etapa.',
    fuente: 'Santosa & Jensen 2008 · ACSM Menopause Position Stand 2020 · Berin et al. Maturitas 2019',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 9,
    tagsRelevantes: ['sarcopenia_riesgo', 'sexo_f', 'edad_40plus', 'obj_grasa', 'obj_mantenimiento'],
    tagsSecundarios: ['masa_baja', 'edad_50plus', 'activo_bajo'],
  },
  {
    id: 'microbiota_rendimiento',
    titulo: 'Tu microbiota entrena contigo (y puede frenarte si la descuidas)',
    subtitulo: 'El intestino es el segundo cerebro del deportista. Lo que comes modela cómo te recuperas.',
    categoria: 'metabolismo',
    imagen: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 4,
    resumen: 'Los deportistas tienen una microbiota más diversa que los sedentarios, pero los hábitos alimentarios incorrectos pueden revertir esa ventaja y afectar la recuperación, la energía y la digestión.',
    cuerpo: [
      'La microbiota intestinal del deportista es cualitativamente distinta a la del sedentario: mayor diversidad de especies, mayor proporción de bacterias productoras de ácidos grasos de cadena corta (AGCC) como butirato, y mayor capacidad de síntesis de ciertos aminoácidos. Un estudio de Clark y Mach (2016) demostró que esta diferencia es bidireccional: el ejercicio modifica la microbiota, y la microbiota modifica la respuesta al ejercicio.',
      'Los AGCC producidos por fermentación de fibra no solo nutren el epitelio del colon; también actúan como señales metabólicas que influyen en la oxidación de grasas, la sensibilidad a la insulina y la regulación del apetito. Una microbiota pobre en diversidad —resultado de dietas bajas en fibra, uso frecuente de antibióticos o alta ingesta de ultraprocesados— genera más hinchazón, peor absorción de nutrientes y más fatiga post-ejercicio.',
      'Para el deportista con hinchazón frecuente, el primer paso es diagnóstico: ¿es FODMAP, intolerancia específica, disbiosis o dismotilidad? La solución no siempre es eliminar alimentos, sino diversificar la fibra y reducir el estrés. Probióticos con cepas estudiadas (Lactobacillus rhamnosus GG, Bifidobacterium longum) pueden ser un apoyo, pero la base es siempre la dieta.',
    ],
    recomendacionPractica: 'Incluye al menos 25-30 g de fibra al día de fuentes diversas (legumbres, verduras, frutas, avena). Añade alimentos fermentados (yogur, kéfir, chucrut) si los toleras. Reduce el consumo de ultraprocesados que alteran negativamente la diversidad microbiana.',
    fuente: 'Clark & Mach Front Nutr 2016 · IOC Consensus Statement 2018 · Mach & Fuster-Botella 2017',
    evidencia: 'moderada',
    esEvergreen: true,
    pesoBase: 6,
    tagsRelevantes: ['dig_hinchazon', 'dig_sii', 'dig_sibo'],
    tagsSecundarios: ['obj_grasa', 'tend_vegano'],
  },
  {
    id: 'carbohidratos_gym',
    titulo: 'Carbohidratos: el macronutriente más malentendido del fitness',
    subtitulo: 'No son el enemigo. Son el combustible principal del músculo que trabaja a alta intensidad.',
    categoria: 'rendimiento',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'El glucógeno muscular es el sustrato energético predominante en ejercicios de moderada a alta intensidad. Restricción innecesaria de carbohidratos reduce rendimiento y puede comprometer la recuperación.',
    cuerpo: [
      'El glucógeno muscular y hepático es el principal sustrato energético en ejercicios de intensidad >65% del VO₂máx. Un deportista con glucógeno bajo empieza a fatiga antes, pierde potencia, toma peores decisiones en deportes de equipo y tarda más en recuperarse. Burke et al. (2011) establecieron que la "disponibilidad de carbohidratos" —no el consumo total— es la variable determinante para el rendimiento.',
      'La periodización de carbohidratos —ajustar el consumo según el tipo e intensidad del entrenamiento— tiene evidencia creciente. En días de alta carga, los carbohidratos son aliados. En días de descanso o entrenamiento ligero, se pueden reducir sin penalizar el rendimiento. Este principio permite optimizar la señalización metabólica sin sacrificar la capacidad de trabajo.',
      'El miedo a los carbohidratos ha llevado a muchos pacientes activos a restricciones innecesarias que afectan el rendimiento, el humor, el sueño y la adherencia. No todos los carbohidratos son iguales, pero tampoco todos son el problema. La calidad y el timing importan más que la cantidad absoluta para la mayoría de las personas.',
    ],
    recomendacionPractica: 'En días de entrenamiento de alta intensidad: consume 1-2 g de carbohidratos/kg en las 2-4 horas previas. Post-entrenamiento: 1 g/kg junto con proteína acelera la resíntesis de glucógeno. No elimines carbohidratos —ajusta la cantidad al nivel de actividad de ese día.',
    fuente: 'Burke et al. J Sports Sci 2011 · ISSN Exercise & Nutrition 2021 · Thomas et al. AND/DC/ACSM 2016',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 7,
    tagsRelevantes: ['ej_cardio', 'ej_mixto', 'activo_alto'],
    tagsSecundarios: ['ej_fuerza', 'activo_moderado'],
  },
  {
    id: 'deficit_calorico',
    titulo: '¿Cuánto déficit calórico es demasiado? La respuesta importa más de lo que crees',
    subtitulo: 'Un déficit demasiado agresivo no acelera resultados: los compromete al costo del músculo y el metabolismo.',
    categoria: 'nutricion',
    imagen: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'El déficit calórico óptimo para perder grasa sin comprometer músculo ni metabolismo basal se sitúa entre el 15 y el 25% del gasto energético total. Más no es mejor.',
    cuerpo: [
      'Hall et al. (Cell Metabolism, 2012) demostraron mediante modelos matemáticos validados que el tejido perdido en una dieta hipocalórica depende críticamente de la magnitud del déficit. Con un déficit moderado (15-20%), la pérdida es predominantemente grasa. Con déficits >30%, aumenta progresivamente la proporción de masa muscular perdida, el metabolismo basal se deprime y los niveles de cortisol y grelina se elevan.',
      'Trexler et al. (JISSN, 2014) acuñaron el término "adaptación metabólica": el gasto energético total cae más de lo predecible por pérdida de masa corporal, especialmente en déficits agresivos y prolongados. Este es el mecanismo detrás del "efecto rebote": cuando el paciente vuelve a comer normalmente, recupera peso más rápido porque su metabolismo quedó deprimido.',
      'La proteína alta en déficit calórico (1.6-2.4 g/kg) es la estrategia más efectiva para preservar músculo durante la pérdida de grasa. Sumada a entrenamiento de fuerza, permite en muchos casos la recomposición corporal: perder grasa y ganar (o mantener) músculo simultáneamente, aunque el proceso es más lento que cuando se trabajan de forma aislada.',
    ],
    recomendacionPractica: 'Apunta a un déficit de 300-500 kcal/día (15-20% del TDEE). Mantén proteína en 1.8-2.2 g/kg/día. Espera pérdidas de 0.5-1% del peso corporal por semana. Más rápido que eso indica pérdida de músculo o deshidratación, no solo grasa.',
    fuente: 'Hall et al. Cell Metab 2012 · Trexler et al. JISSN 2014 · Helms et al. JISSN 2014',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 8,
    tagsRelevantes: ['grasa_elevada', 'recomp_candidato', 'obj_grasa', 'activo_bajo'],
    tagsSecundarios: ['activo_moderado', 'sexo_f'],
  },
  {
    id: 'todo_o_nada',
    titulo: 'El "todo o nada" destruye más planes nutricionales que la comida chatarra',
    subtitulo: 'La psicología de la alimentación es tan determinante como la bioquímica nutricional.',
    categoria: 'adherencia',
    imagen: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 4,
    resumen: 'El pensamiento dicotómico en alimentación —"lo arruiné, ya da igual"— es el predictor más consistente de baja adherencia a largo plazo. La flexibilidad cognitiva predice mejor el éxito que la perfección.',
    cuerpo: [
      'Teixeira et al. (2015) analizaron predictores de adherencia a largo plazo en intervenciones de pérdida de peso. La autonomía percibida, la flexibilidad cognitiva y la ausencia de pensamiento dicotómico resultaron más predictivos que la restricción calórica inicial o la motivación extrínseca. El paciente que se perdona un desvío y sigue adelante tiene mejores resultados a 12 meses que el que busca la perfección.',
      'El "efecto qué diablos" —estudiado por Polivy y Herman— explica lo que ocurre después de una "transgresión": el sujeto en restricción cognitiva interpreta cualquier desvío como un fracaso total y acelera el consumo de alimentos problemáticos porque "ya perdí el día". Este mecanismo no existe en personas con una relación flexible con la comida.',
      'La regla del 80/20 tiene base conductual: si el 80% de las elecciones alimentarias son de calidad, el 20% restante tiene un impacto biológico mínimo. La evidencia psicológica sugiere que dar espacio consciente para excepciones reduce el poder de atracción de los alimentos "prohibidos" y mejora la adherencia sostenida. La restricción rígida produce desinhibición y atracones cíclicos en un porcentaje significativo de pacientes.',
    ],
    recomendacionPractica: 'Cuando tengas un desvío, evalúa el impacto real (generalmente es mínimo) y retoma el siguiente tiempo de comida sin dramatizar. El progreso no lo mides por comidas perfectas: lo mides por semanas consistentes. Una comida nunca arruina un plan, igual que una ensalada no lo salva.',
    fuente: 'Teixeira et al. Int J Behav Nutr 2015 · Polivy & Herman J Abnorm Psychol 1985 · Linardon 2020',
    evidencia: 'moderada',
    esEvergreen: true,
    pesoBase: 8,
    tagsRelevantes: ['grasa_elevada', 'recomp_candidato', 'obj_grasa', 'activo_bajo'],
    tagsSecundarios: ['obj_musculo', 'sexo_f'],
  },
  {
    id: 'hidratacion',
    titulo: 'Hidratación: cuándo, cuánto y qué tomar según tu entrenamiento',
    subtitulo: 'Una deshidratación del 2% del peso corporal reduce el rendimiento hasta un 10%. No lo subestimes.',
    categoria: 'rendimiento',
    imagen: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'Hidratarse bien no es tomar agua cuando tienes sed. Es una estrategia proactiva antes, durante y después del ejercicio que impacta directamente en el rendimiento y la recuperación.',
    cuerpo: [
      'El Position Stand del ACSM (Sawka et al., 2007) establece que una pérdida del 2% del peso corporal por sudor es suficiente para reducir el rendimiento aeróbico entre un 5 y un 10%, aumentar la percepción del esfuerzo y deteriorar las funciones cognitivas. En condiciones de calor, estos efectos se manifiestan antes y son más pronunciados.',
      'La orina es el marcador de hidratación más práctico: amarillo claro a paja indica buena hidratación; amarillo oscuro o marrón indica déficit. La sed, por su parte, es una señal tardía: cuando la sientes, ya llevas un tiempo con déficit. La estrategia correcta es hidratación proactiva, no reactiva.',
      'En sesiones de más de 60 minutos o en condiciones de calor intenso, solo el agua puede no ser suficiente. El sodio perdido en el sudor (400-1000 mg por litro) necesita reposición para mantener el equilibrio electrolítico y evitar calambres. Bebidas deportivas con 500-700 mg de sodio por litro son adecuadas para estas condiciones; no son necesarias en entrenamientos cortos o de baja intensidad.',
    ],
    recomendacionPractica: 'Pre-entreno: 400-600 ml de agua en las 2h previas. Durante: 150-250 ml cada 15-20 min. Post-entreno: 1.5 L por cada kg de peso perdido durante el ejercicio. Si el entrenamiento supera 60 min, incluye electrolitos (sodio, potasio, magnesio).',
    fuente: 'Sawka et al. Med Sci Sports Exerc 2007 · ACSM Position Stand · Maughan & Shirreffs J Sports Sci 2010',
    evidencia: 'alta',
    esEvergreen: false,
    pesoBase: 6,
    tagsRelevantes: ['activo_alto', 'ej_cardio', 'est_verano'],
    tagsSecundarios: ['activo_moderado', 'ej_mixto'],
  },
  {
    id: 'omega3',
    titulo: 'Omega-3: mucho más que un antiinflamatorio para deportistas',
    subtitulo: 'EPA y DHA tienen roles directos en la síntesis muscular, la recuperación y la salud cardiovascular.',
    categoria: 'suplementacion',
    imagen: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'Los ácidos grasos omega-3 (EPA y DHA) reducen el daño muscular post-ejercicio, modulan la inflamación crónica y potencian la señalización anabólica cuando se combina con entrenamiento de fuerza.',
    cuerpo: [
      'Smith et al. (Med Sci Sports Exerc, 2011) demostraron que la suplementación con EPA+DHA (4 g/día durante 8 semanas) en adultos jóvenes activos aumentó la síntesis proteica miofibrilar post-ejercicio en un 30% comparado con placebo, aun sin cambios en la ingesta proteica total. El mecanismo implica la sensibilización de la vía mTOR a la leucina y otros aminoácidos esenciales.',
      'En términos de recuperación, los omega-3 compiten con el ácido araquidónico en la cascada del ácido araquidónico, produciendo resolovinas y protectinas, mediadores pro-resolución con menor potencia inflamatoria. El resultado práctico es una reducción del DOMS (dolor muscular de aparición tardía) y menor tiempo de recuperación entre sesiones intensas de entrenamiento.',
      'La dosis efectiva para efectos sobre composición corporal y recuperación es 2-4 g de EPA+DHA al día, preferiblemente con las comidas para mejorar la absorción. Fuentes marinas (salmón, sardinas, atún) son las más biodisponibles. Para veganos, el aceite de algas es la alternativa con EPA y DHA preformados, superior al aceite de linaza que aporta ALA (precursor, conversión limitada).',
    ],
    recomendacionPractica: 'Suplementa con 2-4 g de EPA+DHA al día con comidas. Prioriza fuentes marinas o aceite de algas para veganos. Los beneficios tardan 4-8 semanas en manifestarse: no evalúes el efecto antes de ese período.',
    fuente: 'Smith et al. Med Sci Sports 2011 · ISSN Omega-3 Review 2022 · Heileson & Funderburk J Strength Cond 2020',
    evidencia: 'moderada',
    esEvergreen: true,
    pesoBase: 7,
    tagsRelevantes: ['activo_alto', 'ej_fuerza', 'edad_40plus'],
    tagsSecundarios: ['ej_cardio', 'sexo_f'],
  },
  {
    id: 'vitamina_d',
    titulo: 'Vitamina D: por qué el 80% de los deportistas la tiene más baja de lo óptimo',
    subtitulo: 'Su déficit afecta la función muscular, el sistema inmune y la recuperación. Y es corregible.',
    categoria: 'suplementacion',
    imagen: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'La vitamina D no es solo un asunto de huesos. Modula la síntesis proteica muscular, la función inmune y la reducción de lesiones en deportistas. El invierno y las latitudes australes amplifican el déficit.',
    cuerpo: [
      'Farrokhyar et al. (2015) analizaron a deportistas de élite de múltiples disciplinas y encontraron que hasta el 77% tenían niveles de 25-OH vitamina D por debajo de los 75 nmol/L, considerados insuficientes para función muscular e inmune óptima. La síntesis cutánea —la principal fuente— depende de exposición solar directa en horarios y ángulos que en latitudes >35° (Chile central y sur) son insuficientes durante el invierno.',
      'Los receptores de vitamina D (VDR) están presentes en el músculo esquelético, el tejido inmune, el cerebro y casi todos los órganos. A nivel muscular, la vitamina D modula la expresión génica relacionada con síntesis proteica y la función de las fibras tipo II (las de mayor potencia y fuerza). Su déficit se asocia a mayor riesgo de lesiones musculares, fracturas por estrés y mayor susceptibilidad a infecciones del tracto respiratorio superior.',
      'La corrección del déficit no requiere dosis masivas. Para la mayoría de los deportistas, 1000-4000 UI al día de colecalciferol (vitamina D3) es suficiente para alcanzar y mantener niveles adecuados. La vitamina K2 mejora el destino del calcio movilizado. Medir la 25-OH vitamina D sérica antes de suplementar permite individualizar la dosis: algunos pacientes con déficit severo requieren dosis de carga bajo supervisión médica.',
    ],
    recomendacionPractica: 'Mide tu vitamina D sérica (25-OH vitamina D) al inicio del invierno. Si estás bajo 75 nmol/L, suplementa con 2000-4000 UI/día de D3 + K2. Re-evalúa a los 3 meses. En verano con exposición solar adecuada, puede reducirse la dosis.',
    fuente: 'Holick NEJM 2007 · Farrokhyar et al. Sports Med 2015 · Cannell et al. 2008',
    evidencia: 'moderada',
    esEvergreen: false,
    pesoBase: 6,
    tagsRelevantes: ['est_invierno', 'activo_alto', 'sexo_f'],
    tagsSecundarios: ['edad_40plus', 'activo_moderado'],
  },
  {
    id: 'proteina_vegetal',
    titulo: 'Proteínas vegetales: cómo combinarlas para no comprometer el músculo',
    subtitulo: 'La dieta vegana puede sostener la hipertrofia, pero requiere estrategia y mayor volumen proteico.',
    categoria: 'nutricion',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 4,
    resumen: 'Las proteínas vegetales tienen menor DIAAS y concentración de leucina, pero combinadas estratégicamente pueden alcanzar la misma efectividad que las animales para mantener y ganar músculo.',
    cuerpo: [
      'El DIAAS (Digestible Indispensable Amino Acid Score) es el índice actual más preciso para evaluar la calidad proteica. Las proteínas animales (suero de leche, huevo, pollo) tienen DIAAS >100, indicando que aportan todos los aminoácidos esenciales en cantidades suficientes. Las proteínas vegetales aisladas tienen DIAAS <100, aunque la soja es la excepción con valores cercanos a 100 en aislado.',
      'van Vliet et al. (2015) demostraron que la síntesis proteica muscular post-ejercicio es menor con proteína de soja que con whey a igual dosis. Sin embargo, estudios más recientes de Gorissen y Witard (2018) muestran que aumentando la dosis de proteínas vegetales (especialmente combinando legumbres + cereales para complementar el perfil de aminoácidos) se puede igualar la respuesta anabólica. La estrategia no es evitar proteínas vegetales, sino ajustar la cantidad.',
      'Para quienes siguen dieta vegana con objetivo de masa muscular: apunta a 1.8-2.4 g de proteína/kg/día (20-30% más que el estándar para compensar menor digestibilidad), prioriza soja, guisantes y arroz como fuentes principales, distribuye la proteína en 4-5 comidas para alcanzar el umbral de leucina en cada una, y considera proteína vegetal en polvo (guisante + arroz) como complemento práctico.',
    ],
    recomendacionPractica: 'Combina legumbres (alubias, lentejas, garbanzos) con cereales (arroz, avena, quinoa) en cada comida para completar el perfil de aminoácidos esenciales. Apunta a 35-45 g de proteína vegetal por comida principal para igualar el efecto anabólico de 25-30 g de proteína animal.',
    fuente: 'van Vliet et al. 2015 · Gorissen & Witard Nutrients 2018 · Messina et al. Nutrients 2022',
    evidencia: 'moderada',
    esEvergreen: true,
    pesoBase: 7,
    tagsRelevantes: ['tend_vegano', 'tend_vegetariano', 'obj_musculo'],
    tagsSecundarios: ['obj_mantenimiento', 'activo_moderado'],
  },
  {
    id: 'vo2max',
    titulo: 'VO₂máx: el indicador de longevidad que pocos pacientes conocen',
    subtitulo: 'La capacidad cardiorrespiratoria predice la mortalidad all-cause mejor que el colesterol o la presión arterial.',
    categoria: 'rendimiento',
    imagen: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 4,
    resumen: 'El VO₂máx cae un 10% por década sin entrenamiento específico. Mejorarlo es posible con HIIT y nutrición adecuada, y tiene uno de los mayores impactos en salud a largo plazo.',
    cuerpo: [
      'Lavie et al. (JACC, 2019) analizaron datos de más de 122.000 pacientes y encontraron que la capacidad cardiorrespiratoria (medida como VO₂máx) es el predictor individual más potente de mortalidad all-cause, superando al tabaquismo, la hipertensión y la diabetes. Pasar de "bajo" a "por encima de la media" en VO₂máx reduce el riesgo de muerte en 45%. El atleta de alto nivel tiene riesgo 5 veces menor que el sedentario de baja forma.',
      'El VO₂máx declina aproximadamente un 10% por década de vida sin entrenamiento cardiovascular específico. La buena noticia es que es altamente entrenable a cualquier edad: el HIIT (entrenamiento de intervalos de alta intensidad) produce mejoras de 10-20% en 8-12 semanas en personas previamente sedentarias o moderadamente activas. El volumen semanal de entrenamiento aeróbico también importa para la adaptación crónica.',
      'La nutrición periférica al VO₂máx se centra en disponibilidad de carbohidratos (glucógeno hepático y muscular como sustrato en intensidades >65% VO₂máx), hidratación adecuada, hierro sérico óptimo (el hierro es cofactor del transporte de oxígeno en hemoglobina) y nitrato dietético (presente en remolacha, espinaca) que mejora la eficiencia del oxígeno a nivel muscular.',
    ],
    recomendacionPractica: 'Incorpora 2 sesiones semanales de HIIT (ej: 4x4 min a 90-95% FCmáx, con 3 min de recuperación activa) sumadas a 150-200 min de ejercicio aeróbico moderado. Asegura hierro adecuado (medir ferritina si hay fatiga crónica) y consume remolacha o zumo de remolacha en días de alta exigencia.',
    fuente: 'Lavie et al. JACC 2019 · Rønnestad & Mujika Scand J Med Sci Sports 2014',
    evidencia: 'alta',
    esEvergreen: true,
    pesoBase: 6,
    tagsRelevantes: ['ej_cardio', 'ej_mixto', 'activo_alto'],
    tagsSecundarios: ['edad_40plus', 'activo_moderado'],
  },
  {
    id: 'magnesio',
    titulo: 'Magnesio: el mineral que tu cuerpo consume más cuando más lo necesitas',
    subtitulo: 'El estrés, el sudor intenso y el déficit nutricional lo agotan. Sus efectos son amplios y corregibles.',
    categoria: 'suplementacion',
    imagen: 'https://images.unsplash.com/photo-1470116945706-e6bf5d5a53ca?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'El magnesio es cofactor de más de 300 enzimas, incluyendo las de producción de ATP. Su déficit es frecuente en deportistas y se manifiesta como calambres, mal sueño y fatiga inexplicada.',
    cuerpo: [
      'Nielsen y Lukaski (Magnesium Research, 2006) documentaron que los deportistas tienen mayores requerimientos de magnesio que los sedentarios, debido a pérdidas por sudor y mayor demanda metabólica durante el ejercicio. Se estima que hasta el 50% de la población general no alcanza las ingestas recomendadas (310-420 mg/día), y en deportistas que no monitorizan su dieta la situación es probablemente peor.',
      'El magnesio participa directamente en la función muscular actuando como antagonista del calcio a nivel de los canales iónicos: regula la contracción y relajación muscular. Su déficit subclínico se asocia a mayor frecuencia de calambres, calidad de sueño deteriorada (el magnesio activa receptores GABA, reduciendo la excitabilidad neuronal) y peor recuperación post-esfuerzo.',
      'La forma del suplemento importa: el óxido de magnesio tiene baja biodisponibilidad (<10%). Las formas glicinato y citrato tienen absorción de 30-50% y son mejor toleradas gastrointestinalmente. La dosis habitual de suplementación es 300-400 mg/día, preferiblemente antes de dormir para aprovechar su efecto relajante. Los alimentos ricos en magnesio incluyen semillas de calabaza (520 mg/100g), espinaca, legumbres y cacao puro.',
    ],
    recomendacionPractica: 'Si tienes calambres frecuentes, mal sueño o fatiga post-entreno sin causa aparente, considera magnesio glicinato o citrato 300-400 mg antes de dormir durante 4-6 semanas. Evalúa el efecto antes de buscar otras causas.',
    fuente: 'Nielsen & Lukaski Magnesium Research 2006 · Garrison et al. Cochrane 2012',
    evidencia: 'moderada',
    esEvergreen: true,
    pesoBase: 6,
    tagsRelevantes: ['activo_alto', 'est_invierno', 'activo_moderado'],
    tagsSecundarios: ['sexo_f', 'edad_40plus'],
  },
  {
    id: 'invierno_inmunidad',
    titulo: 'Invierno: lo que tu dieta puede (y no puede) hacer por tus defensas',
    subtitulo: 'Vitamina C, D, zinc y proteína completa tienen evidencia real en inmunidad. Lo demás es marketing.',
    categoria: 'estacional',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=900&q=80',
    tiempoLectura: 3,
    resumen: 'El invierno trae mayor prevalencia de infecciones respiratorias. La nutrición tiene herramientas concretas para modular la respuesta inmune, pero también tiene límites que conviene conocer.',
    cuerpo: [
      'Hemilä y Chalker (Cochrane, 2013) revisaron más de 30 ensayos sobre vitamina C e infecciones respiratorias. Los resultados muestran que la suplementación no previene el resfriado en la población general, pero sí reduce su duración en un 8-14% y su severidad en deportistas sometidos a estrés físico intenso (donde sí hay evidencia de reducción de incidencia). Martineau et al. (BMJ, 2017) encontraron que la vitamina D reduce infecciones respiratorias agudas, especialmente en quienes parten desde niveles deficientes.',
      'El zinc es el otro nutriente con mayor evidencia inmunomoduladora. Lozenges (pastillas para disolver) con zinc acetato, tomados en las primeras 24 horas del inicio de síntomas, reducen la duración del resfriado hasta en un 40%. Fuentes alimentarias ricas: ostras (76 mg/100g), carne roja, semillas de calabaza. La suplementación crónica de zinc (>40 mg/día) puede interferir con la absorción de cobre.',
      'Un factor subestimado: el sobreentrenamiento y el déficit calórico crónico son inmunosupresores más relevantes que cualquier suplemento. El denominado "Open Window Theory" (Pedersen y Bruunsgaard) describe cómo el ejercicio de alta intensidad suprime temporalmente la inmunidad por 3-72 horas. La nutrición adecuada —proteína, carbohidratos y micronutrientes— reduce este período de vulnerabilidad.',
    ],
    recomendacionPractica: 'En invierno: asegura vitamina D3 (2000-4000 UI/día), zinc dietario suficiente, al menos 7 horas de sueño y proteína ≥1.4 g/kg para sostener la síntesis de anticuerpos. Si sientes síntomas, añade zinc acetato en las primeras 24 horas. Cuida el volumen de entrenamiento si estás bajo de kcal.',
    fuente: 'Hemilä & Chalker Cochrane 2013 · Martineau et al. BMJ 2017 · Pedersen & Bruunsgaard 1995',
    evidencia: 'moderada',
    esEvergreen: false,
    pesoBase: 5,
    tagsRelevantes: ['est_invierno', 'activo_moderado', 'activo_alto'],
    tagsSecundarios: ['edad_40plus', 'obj_mantenimiento'],
  },
]

export function getTagsPaciente(form: Partial<FormData>): Set<TagPaciente> {
  const tags = new Set<TagPaciente>()
  const isMale = form.sexo === 'masculino'
  const edad = form.edad ?? 0

  // ── Objetivo ──
  if (form.objetivo === 'perdida grasa')  tags.add('obj_grasa')
  if (form.objetivo === 'hipertrofia')    tags.add('obj_musculo')
  if (form.objetivo === 'mantenimiento')  tags.add('obj_mantenimiento')

  // ── Sexo ──
  if (form.sexo === 'femenino')  tags.add('sexo_f')
  if (form.sexo === 'masculino') tags.add('sexo_m')

  // ── Edad ──
  if (edad >= 40) tags.add('edad_40plus')
  if (edad >= 50) tags.add('edad_50plus')

  // ── Tipo de ejercicio ──
  if (form.tipoEjercicio === 'fuerza')  tags.add('ej_fuerza')
  if (form.tipoEjercicio === 'cardio')  tags.add('ej_cardio')
  if (form.tipoEjercicio === 'mixto')   tags.add('ej_mixto')
  if (form.tipoEjercicio === 'ninguno') tags.add('ej_ninguno')

  // ── Nivel de actividad ──
  const dias = form.diasEjercicio ?? 0
  if (dias >= 5)      tags.add('activo_alto')
  else if (dias >= 3) tags.add('activo_moderado')
  else                tags.add('activo_bajo')

  // ── Digestivo ──
  if (['frecuente','diaria'].includes(form.digHinchazon ?? '')) tags.add('dig_hinchazon')
  if (form.digDiag === 'si_sii' || form.digDiag === 'sospecha') tags.add('dig_sii')
  if (form.digDiag === 'si_sibo') tags.add('dig_sibo')

  // ── Tendencia alimentaria ──
  if (form.tendencia === 'vegano')       tags.add('tend_vegano')
  if (form.tendencia === 'vegetariano')  tags.add('tend_vegetariano')

  // ── Estacional — hemisferio sur (Chile) ──
  const mes = new Date().getMonth() // 0 = enero
  if ([5,6,7].includes(mes))        tags.add('est_verano')
  else if ([8,9,10].includes(mes))  tags.add('est_otono')
  else if ([11,0,1].includes(mes))  tags.add('est_invierno')
  else                              tags.add('est_primavera')

  // ── Composición corporal (InBody / ISAK) ──────────────────────────────────
  // Umbrales basados en EWGSOP2 (masa muscular esquelética) y referencia clínica de grasa
  // Hombre: masa_baja < 28 kg | masa_alta > 38 kg | grasa_elevada > 25%
  // Mujer:  masa_baja < 20 kg | masa_alta > 27 kg | grasa_elevada > 32%
  const cutoffMasaBaja = isMale ? 28 : 20
  const cutoffMasaAlta = isMale ? 38 : 27
  const cutoffGrasa    = isMale ? 0.25 : 0.32

  // Masa muscular en kg (directa desde InBody)
  const masa = form.masaMuscularKg
  let masaBaja = false
  let masaAlta = false
  if (masa !== undefined) {
    if (masa < cutoffMasaBaja) { tags.add('masa_baja'); masaBaja = true }
    else if (masa > cutoffMasaAlta) { tags.add('masa_alta'); masaAlta = true }
  }

  // Grasa corporal en kg (directa) — si no se ingresó, se estima desde % grasa × peso
  const grasaKg =
    form.grasaCorporalKg ??
    (form.porcentajeGrasa != null && form.peso ? form.peso * form.porcentajeGrasa / 100 : undefined)

  let grasaAlta = false
  if (grasaKg !== undefined && form.peso && form.peso > 0) {
    const pctGrasa = grasaKg / form.peso
    if (pctGrasa > cutoffGrasa) { tags.add('grasa_elevada'); grasaAlta = true }
  } else if (form.porcentajeGrasa !== undefined) {
    // Fallback si no hay peso pero sí % grasa
    if (form.porcentajeGrasa > (isMale ? 25 : 32)) { tags.add('grasa_elevada'); grasaAlta = true }
  }

  // Recomposición: baja masa + grasa elevada
  if (masaBaja && grasaAlta) tags.add('recomp_candidato')

  // Sarcopenia riesgo: baja masa + edad ≥ 40 (EWGSOP2 criterio clínico)
  if (masaBaja && edad >= 40) tags.add('sarcopenia_riesgo')

  return tags
}

function seededRandom(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return (Math.abs(h) % 1000) / 1000
}

function getWeekSeed(): string {
  const d = new Date()
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function getNoticiasPersonalizadas(form: Partial<FormData>, count = 3): Noticia[] {
  const tags = getTagsPaciente(form)
  const seed = getWeekSeed()
  const scored = NOTICIAS.map(n => {
    let score = n.pesoBase
    for (const t of n.tagsRelevantes)  if (tags.has(t)) score += 2
    for (const t of n.tagsSecundarios) if (tags.has(t)) score += 1
    score += seededRandom(n.id + seed) * 1.5
    return { n, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, count).map(x => x.n)
}

export function getAllNoticias(): Noticia[] {
  return [...NOTICIAS]
}
