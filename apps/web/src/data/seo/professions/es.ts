import type { ProfessionCatalog } from '../types';

/**
 * Spanish profession content — adapted to Spanish hiring conventions
 * (carta de presentación, colegiación sanitaria, Plan General Contable,
 * FP y carnés profesionales, oposiciones e interinidades).
 */
export const professionsEs: ProfessionCatalog = {
  'software-developer': {
    name: 'Desarrollador de software',
    application: {
      slug: 'desarrollador-de-software',
      metaTitle: 'Candidatura de desarrollador: carta de presentación y CV',
      metaDescription:
        'Qué necesita una candidatura de desarrollador: palabras clave ATS, competencias, certificaciones, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de desarrollador de software',
      intro:
        'En los puestos de desarrollo, la carta rara vez decide por sí sola: los reclutadores y los sistemas de cribado buscan primero el stack, el tamaño de los proyectos y el impacto medible. Enumerar tecnologías te coloca junto a cientos de perfiles idénticos; decir qué asumiste y qué cambió, no.',
      atsKeywords: [
        'Desarrollo de software',
        'TypeScript',
        'Java',
        'Python',
        'API REST',
        'Microservicios',
        'CI/CD',
        'Docker',
        'Kubernetes',
        'Git',
        'Revisión de código',
        'Agile / Scrum',
        'Pruebas unitarias',
        'Cloud (AWS/Azure)',
      ],
      hardSkills: [
        {
          label: 'Un stack escrito como en la oferta',
          detail:
            'Lenguaje, framework, base de datos y nube, escritos exactamente como aparecen en el anuncio: «TypeScript» y «JavaScript» son dos palabras distintas para un parser.',
        },
        {
          label: 'Diseño de sistemas',
          detail:
            'A partir de tres años de experiencia se espera que diseñes interfaces y defiendas decisiones, no solo que cierres tareas.',
        },
        {
          label: 'Práctica de pruebas y despliegue',
          detail:
            'Pruebas unitarias y de integración, pipelines, revisión de código: la parte de tu trabajo que demuestra si tu código seguirá siendo mantenible dentro de seis meses.',
        },
        {
          label: 'Impacto medible',
          detail:
            'Tiempo de carga reducido a la mitad, menos errores, despliegues semanales convertidos en diarios. Una cifra de tu día a día vale más que cualquier adjetivo.',
        },
      ],
      softSkills: [
        'Explicar decisiones técnicas a perfiles no técnicos',
        'Dar feedback útil en revisiones de código',
        'Autonomía en equipos distribuidos',
        'Priorizar bajo presión de plazos',
        'Disposición a leer código ajeno',
      ],
      certifications: [
        'AWS Certified Developer – Associate',
        'Microsoft Certified: Azure Developer Associate',
        'Certified Kubernetes Application Developer (CKAD)',
        'Professional Scrum Developer (PSD I)',
      ],
      cvFocus: [
        {
          label: 'Proyectos, no listas de tareas',
          detail:
            'Dos o tres proyectos por puesto con contexto: tamaño del equipo, tu papel, tecnologías, resultado.',
        },
        {
          label: 'Un perfil de GitHub presentable',
          detail:
            'Un repositorio cuidado con un README real sustituye a un párrafo de autodescripción. Un perfil abandonado cuesta más que no poner enlace.',
        },
        {
          label: 'Competencias agrupadas por nivel',
          detail:
            'Separa lo que usas a diario de lo que probaste una vez: la entrevista técnica irá justo a esa frontera.',
        },
      ],
      coverLetterOpener:
        'Su oferta menciona la separación de un monolito en servicios: es exactamente lo que dirigí en [Empresa] para un equipo de ocho personas, llevando la frecuencia de despliegue de semanal a diaria.',
      mistakes: [
        {
          label: 'Una carta que repite el stack',
          detail:
            'El CV ya lo enumera. La carta debe explicar por qué ese producto, de una forma que ningún otro candidato pueda copiar.',
        },
        {
          label: 'Afirmar la seniority en lugar de demostrarla',
          detail:
            '«Senior» no convence a nadie. Liderar una migración, sostener el proceso de revisión o formar a los nuevos, sí.',
        },
        {
          label: 'Enviar la misma candidatura a todas partes',
          detail:
            'Sin referencia al producto, el perfil es intercambiable. Una sola frase concreta sobre su dominio te saca de la pila.',
        },
      ],
      faq: [
        {
          question: '¿Sigue siendo necesaria la carta de presentación?',
          answer:
            'En España, en consultoras y empresas grandes, sí. En startups y producto suele bastar el CV con el perfil de GitHub. Media página es el equilibrio: si falta, la candidatura parece incompleta; si es más larga, no se lee.',
        },
        {
          question: '¿Cuánto pesan las certificaciones frente a los proyectos?',
          answer:
            'Los proyectos ganan casi siempre. Las certificaciones cloud sirven sobre todo para entrar en un entorno donde aún no tienes producción que enseñar: abren la primera puerta, no sustituyen referencias.',
        },
        {
          question: '¿Debo incluir foto en el CV?',
          answer:
            'Sigue siendo habitual en España pero nunca es obligatoria, y en el sector tecnológico su ausencia no penaliza. Si envías el CV fuera de España, es preferible omitirla.',
        },
      ],
    },
    interview: {
      slug: 'desarrollador-de-software',
      metaTitle: 'Entrevista de desarrollador: preguntas frecuentes y respuestas',
      metaDescription:
        'Las preguntas habituales en una entrevista de desarrollo, qué evalúan realmente, cómo estructurar la respuesta y qué errores cuestan el puesto.',
      heading: 'Entrevista de trabajo para desarrollador de software',
      intro:
        'Un proceso de desarrollo suele tener tres partes: motivación, profundidad técnica y una prueba de código en directo o para casa. Rara vez se falla en el ejercicio: se falla resolviéndolo en silencio, cuando lo que se evalúa es el razonamiento.',
      questions: [
        {
          question: 'Cuéntame un problema técnico difícil que hayas resuelto.',
          why: 'Se evalúa si sabes acotar un problema y si entendiste la causa real o solo cambiaste cosas hasta que funcionó.',
          tip: 'Cuatro pasos: el síntoma, cómo lo acotaste, la causa real, qué cambiaste para que no vuelva a ocurrir.',
        },
        {
          question: '¿Por qué elegiste esa arquitectura?',
          why: 'No hay respuesta correcta: quieren saber si conoces las alternativas y si puedes nombrar los inconvenientes.',
          tip: 'Menciona la opción descartada y el motivo. Quien no encuentra ningún defecto en su propia solución no la ha puesto a prueba.',
        },
        {
          question: '¿Cómo garantizas que tu código sea mantenible?',
          why: 'Comprueba si piensas más allá del merge: pruebas, revisiones, documentación, nombres.',
          tip: 'Describe lo que hacía realmente tu último equipo, no principios de manual.',
        },
        {
          question: '¿Cómo abordas código que no has escrito tú?',
          why: 'El día a día es código heredado. Quieren saber si lo tocas con cuidado o si propones reescribirlo.',
          tip: 'Describe la red de seguridad que construyes primero: añadir pruebas, pasos pequeños, desplegar pronto.',
        },
        {
          question: 'Cuéntame un desacuerdo en una revisión de código.',
          why: 'Pregunta conductual: ¿puedes sostener una posición técnica sin dañar la relación de trabajo?',
          tip: 'Termina con el resultado y lo que aprendiste, también cuando fuiste tú quien cedió.',
        },
        {
          question: '¿Qué haces cuando una estimación deja de ser realista?',
          why: 'Va de comunicación con producto y con los interesados, no de técnica.',
          tip: 'Avisar pronto y ofrecer opciones — alcance, fecha, calidad — en lugar de trasladar solo el problema.',
        },
      ],
      redFlags: [
        'Programar en silencio durante la prueba: lo que se puntúa es el razonamiento.',
        'Hablar mal de equipos o bases de código anteriores.',
        'Responder «sí» de forma vaga a «¿conoces X?» en lugar de situar tu nivel con honestidad.',
      ],
      askThem: [
        '¿Cómo es el camino desde el merge hasta producción y cuánto tarda?',
        '¿Qué parte de un sprint se dedica a deuda técnica?',
        '¿Quién decide qué se construye y qué papel tiene ahí el equipo de desarrollo?',
      ],
      faq: [
        {
          question: '¿Cómo me preparo para la prueba de código?',
          answer:
            'Practica pensar en voz alta, no solo resolver. Coge un ejercicio de dificultad media y explica cada paso como si alguien estuviera sentado a tu lado: esa verbalización es lo que se puntúa en casi todos los procesos.',
        },
        {
          question: '¿Puedo usar herramientas de IA en una prueba para casa?',
          answer:
            'Pregúntalo. Muchas empresas ya lo permiten explícitamente y después cuestionan tus decisiones en la revisión. Usarla en silencio y no saber explicar el resultado es el peor escenario posible.',
        },
      ],
    },
  },

  nurse: {
    name: 'Enfermero',
    application: {
      slug: 'enfermero',
      metaTitle: 'Candidatura de enfermería: carta, CV y documentación',
      metaDescription:
        'Candidatura en enfermería: qué documentación es imprescindible, qué especialidad destacar, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de enfermería',
      intro:
        'En enfermería el mercado juega a tu favor, pero la candidatura sigue decidiendo en qué unidad entras y en qué condiciones. Una documentación completa y una especialidad claramente indicada pesan aquí más que cualquier giro de estilo.',
      atsKeywords: [
        'Enfermería',
        'Cuidados generales',
        'Plan de cuidados',
        'Administración de medicación',
        'Curas y heridas complejas',
        'Cuidados intensivos (UCI)',
        'Urgencias',
        'Cuidados paliativos',
        'Historia clínica electrónica',
        'Control de infecciones',
        'Registro de enfermería',
        'Tutorización de estudiantes',
      ],
      hardSkills: [
        {
          label: 'Título y colegiación',
          detail:
            'El título de Grado o Diplomatura en Enfermería y el número de colegiado se verifican antes que cualquier otra cosa.',
        },
        {
          label: 'La especialidad, no «enfermería»',
          detail:
            'UCI, urgencias, quirófano, oncología, geriatría o atención primaria: es el primer filtro que se aplica a tu expediente.',
        },
        {
          label: 'Historia clínica electrónica',
          detail:
            'Nombra el sistema que has utilizado (SELENE, Diraya, HP-HCIS, Millennium): reduce directamente el tiempo de adaptación.',
        },
        {
          label: 'Formación especializada',
          detail:
            'EIR, másteres oficiales, formación en heridas crónicas o cuidados paliativos: determinan puesto y retribución.',
        },
      ],
      softSkills: [
        'Resistencia al trabajo a turnos',
        'Comunicación con familias en situaciones críticas',
        'Trabajo con el equipo médico y de rehabilitación',
        'Serenidad ante un deterioro clínico',
        'Empatía sin desgaste personal',
      ],
      certifications: [
        'Grado en Enfermería y colegiación',
        'Especialidad vía EIR (cuidados intensivos, familiar y comunitaria, obstétrico-ginecológica)',
        'Máster o experto en heridas crónicas',
        'Formación en soporte vital avanzado (SVA)',
      ],
      cvFocus: [
        {
          label: 'Tipo de centro y tamaño de la unidad',
          detail:
            'Hospital universitario, comarcal, residencia, atención primaria — y el número de camas. Dice más que cualquier lista de tareas.',
        },
        {
          label: 'Documentación completa',
          detail:
            'Título, colegiación, vacunaciones y certificados de formación. Es la primera causa de que un expediente se quede parado.',
        },
        {
          label: 'Disponibilidad y jornada',
          detail: 'Jornada deseada, disponibilidad para noches y fines de semana y fecha de incorporación, en la primera página.',
        },
      ],
      coverLetterOpener:
        'Tras cuatro años en una UCI polivalente de doce camas quiero incorporarme a una unidad de cuidados paliativos: la disciplina que conocí durante mi formación de posgrado y que quiero ejercer a tiempo completo.',
      mistakes: [
        {
          label: 'Prometer enviar la documentación más tarde',
          detail:
            'Sin título verificable no puede formalizarse la contratación. Los expedientes incompletos se apartan en lugar de rechazarse.',
        },
        {
          label: 'Dejar la especialidad abierta',
          detail: '«Soy polivalente» se lee como «no sé qué quiero» y acaba en la lista de espera.',
        },
        {
          label: 'Escribir solo sobre la carga de trabajo',
          detail:
            'Todos los centros la conocen. Explicar en qué condiciones te quedarías transmite criterio, no agotamiento.',
        },
      ],
      faq: [
        {
          question: '¿Cómo presento una titulación obtenida en otro país?',
          answer:
            'Adjunta la credencial de homologación del ministerio o, si el trámite está en curso, el resguardo con el estado del expediente. Muchos centros contratan antes de la resolución final, pero necesitan el estado por escrito.',
        },
        {
          question: '¿Debo indicar mi número de colegiado?',
          answer:
            'Sí: la colegiación es obligatoria para ejercer y es un dato verificable que se espera encontrar. Omitirlo solo añade una ronda de correos antes de que alguien pueda tramitar tu expediente.',
        },
        {
          question: '¿Conviene indicar expectativas salariales?',
          answer:
            'En la sanidad pública no hace falta, porque se aplica la tabla retributiva: detalla con precisión antigüedad y formación especializada. En la privada y en las ETT sí se espera una horquilla.',
        },
      ],
    },
    interview: {
      slug: 'enfermero',
      metaTitle: 'Entrevista de enfermería: preguntas frecuentes y respuestas',
      metaDescription:
        'Preguntas habituales en una entrevista de enfermería, qué evalúan, cómo responder y qué preguntar a la supervisión de la unidad.',
      heading: 'Entrevista de trabajo en enfermería',
      intro:
        'La entrevista suele conducirla la supervisión de la unidad, a veces con una enfermera referente. Se evalúan menos conocimientos que actitudes: cómo priorizas bajo carga, cómo hablas con las familias y si encajarás en el equipo del turno.',
      questions: [
        {
          question: '¿Cómo prioriza cuando no puede atender a todos los pacientes?',
          why: 'La pregunta central de la profesión. Se busca triaje clínico, no resistencia.',
          tip: 'Describe tu orden de valoración, cuándo avisas y cómo lo registras, no que «siempre llegas a todo».',
        },
        {
          question: 'Cuénteme una conversación difícil con una familia.',
          why: 'Los conflictos con familiares desgastan a las unidades. Se escucha capacidad de desescalar.',
          tip: 'Escuchar, explicar la situación clínica, poner un límite, derivar — en ese orden.',
        },
        {
          question: '¿Qué hace si comete un error?',
          why: 'Cultura de seguridad: un centro que lo pregunta abiertamente quiere oír que se notifica.',
          tip: 'Asegurar al paciente, notificar de inmediato, registrar, declarar el evento adverso. Un caso real pesa más que una intención.',
        },
        {
          question: '¿Por qué deja su puesto actual?',
          why: 'Se comprueba si huyes de algo o vas hacia algo.',
          tip: 'Di qué buscas — especialidad, formación, fiabilidad del cuadrante — no qué hizo mal el empleador anterior.',
        },
        {
          question: '¿Cómo lleva las noches y los fines de semana?',
          why: 'Pura organización: una respuesta honesta ahorra un periodo de prueba fallido.',
          tip: 'Di con claridad qué puedes sostener. Poner ahora un límite es mejor que retirarte después.',
        },
        {
          question: '¿Cómo mantiene actualizada su práctica?',
          why: 'Los protocolos cambian y los centros exigentes preguntan expresamente.',
          tip: 'Cita formación concreta de los dos últimos años y cómo la trasladas a la unidad.',
        },
      ],
      redFlags: [
        'Hablar de compañeros o pacientes de un modo que vulnere el secreto profesional.',
        'Afirmar que nunca te ves desbordado.',
        'No preguntar nada sobre la unidad, el cuadrante o la acogida.',
      ],
      askThem: [
        '¿Cuál es la ratio real de personal en mañana, tarde y noche?',
        '¿Cuánto dura la acogida y quién la tutoriza?',
        '¿Qué estabilidad tiene el cuadrante y con qué frecuencia se llama a personal fuera de turno?',
      ],
      faq: [
        {
          question: '¿Se evalúan conocimientos clínicos?',
          answer:
            'A menudo, pero como caso práctico más que como examen: una situación aguda cuyo manejo debes describir. Reconocer los límites y decir cuándo avisas al médico cuenta más que una respuesta de manual.',
        },
        {
          question: '¿Puedo preguntar por las ratios y las sustituciones?',
          answer:
            'Sin duda: es la pregunta más informativa de la que dispones. Las unidades con un plan de sustituciones real responden con concreción; una respuesta evasiva es en sí misma un dato.',
        },
      ],
    },
  },

  'project-manager': {
    name: 'Jefe de proyecto',
    application: {
      slug: 'jefe-de-proyecto',
      metaTitle: 'Candidatura de jefe de proyecto: carta, CV e indicadores',
      metaDescription:
        'Candidatura en gestión de proyectos: qué cifras convencen, qué certificaciones cuentan, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de jefe de proyecto',
      intro:
        'La gestión de proyectos es la profesión en la que más se afirma y menos se demuestra. Indicar presupuesto, tamaño de equipo, duración y resultado de cada proyecto te sitúa por delante de la mayoría antes incluso de escribir una línea sobre metodología.',
      atsKeywords: [
        'Gestión de proyectos',
        'Dirección de proyectos',
        'Gestión de interesados',
        'Responsabilidad presupuestaria',
        'Gestión de riesgos',
        'Scrum',
        'Kanban',
        'PRINCE2',
        'Planificación e hitos',
        'Gestión de recursos',
        'Jira',
        'MS Project',
        'Gestión del cambio',
        'Comité de dirección',
      ],
      hardSkills: [
        {
          label: 'Las cifras del proyecto',
          detail:
            'Presupuesto, tamaño del equipo, duración y número de áreas implicadas: cuatro cifras que hacen creíble una descripción al instante.',
        },
        {
          label: 'Metodología con evidencia',
          detail:
            'Predictivo, ágil o híbrido: di qué has dirigido de verdad y dónde estaba el límite. «Ambos» sin ejemplo no vale nada.',
        },
        {
          label: 'Herramientas',
          detail: 'Jira, Confluence, MS Project, Smartsheet, Asana: los filtros ATS buscan literalmente estos nombres.',
        },
        {
          label: 'A quién reportabas',
          detail:
            'Un comité de seguimiento o la dirección general como interlocutor dice más de tu nivel que cualquier título.',
        },
      ],
      softSkills: [
        'Liderar sin autoridad jerárquica',
        'Mediar entre áreas de negocio',
        'Decidir en situación de incertidumbre',
        'Presentar ante dirección',
        'Decir que no a ampliaciones de alcance',
      ],
      certifications: [
        'PMP (Project Management Professional)',
        'PRINCE2 Practitioner',
        'Professional Scrum Master (PSM I/II)',
        'IPMA nivel C/D',
      ],
      cvFocus: [
        {
          label: 'Una lista de proyectos aparte',
          detail:
            'De tres a cinco proyectos de referencia con sector, volumen, rol y resultado, separados de la trayectoria cronológica.',
        },
        {
          label: 'Justificar un cambio de sector',
          detail:
            'La gestión de proyectos se considera transferible y rara vez se lee así. Di qué se traslada desde tu sector.',
        },
        {
          label: 'Resultado, no actividad',
          detail: '«Entregado en plazo y un 8 % por debajo de presupuesto» en lugar de «responsable de la coordinación».',
        },
      ],
      coverLetterOpener:
        'Durante dos años dirigí la implantación del ERP en [Empresa]: 1,4 M€ de presupuesto, seis centros, 40 personas implicadas — y una puesta en marcha sin parar la producción.',
      mistakes: [
        {
          label: 'Un catálogo de métodos en lugar de resultados',
          detail:
            'Una lista de marcos demuestra lecturas, no capacidad de entrega. Un proyecto con cifras pesa más.',
        },
        {
          label: 'Difuminar el propio papel',
          detail: '«Implantamos» deja abierto si dirigías o participabas. Di qué asumiste tú.',
        },
        {
          label: 'Ocultar los proyectos fallidos',
          detail:
            'Los entrevistadores con experiencia preguntan por uno deliberadamente. Un proyecto detenido con una lección suena más maduro que un historial impecable.',
        },
      ],
      faq: [
        {
          question: '¿Merece la pena certificarse en PMP o PRINCE2?',
          answer:
            'Ayuda sobre todo en grandes empresas, sector público y licitaciones, donde a veces es requisito formal. En organizaciones de producto pesan mucho más los proyectos de referencia. Quienes más ganan son los perfiles con poca trayectoria documentada.',
        },
        {
          question: '¿Cómo describo proyectos sujetos a confidencialidad?',
          answer:
            'Anonimiza al cliente e indica sector, orden de magnitud y resultado: «proveedor de automoción, 250 M€ de facturación, migración de 14 sistemas». Es admisible y más informativo que un nombre conocido sin contexto.',
        },
        {
          question: '¿Cómo paso de perfil técnico a jefe de proyecto?',
          answer:
            'Haz visibles las coordinaciones de paquete de trabajo, los roles de enlace y las sustituciones como líneas propias. La mayoría de transiciones se dan internamente o dentro del mismo sector, donde el conocimiento del negocio compensa el historial que falta.',
        },
      ],
    },
    interview: {
      slug: 'jefe-de-proyecto',
      metaTitle: 'Entrevista de jefe de proyecto: preguntas y respuestas',
      metaDescription:
        'Preguntas de entrevista en gestión de proyectos: escalado, ampliación de alcance y proyectos fallidos — qué evalúan y cómo responder.',
      heading: 'Entrevista de trabajo para jefe de proyecto',
      intro:
        'Casi todas las preguntas a un jefe de proyecto son conductuales. No se esperan conocimientos metodológicos sino un caso real, contado con una estructura que alguien ajeno pueda seguir.',
      questions: [
        {
          question: 'Cuénteme un proyecto que se le fue de las manos.',
          why: 'La pregunta más importante. Quieren saber si corriges pronto o si lo descubres en el hito.',
          tip: 'Cuándo lo viste, por qué señal, qué cambiaste y cuál fue el resultado. Elige uno real, no el más leve.',
        },
        {
          question: '¿Cómo gestiona la ampliación del alcance?',
          why: 'Comprueba si diriges las peticiones o solo las trasladas.',
          tip: 'Describe tu proceso de cambio: valorar, cuantificar el impacto en plazo y presupuesto, elevar la decisión — no rechazarla tú.',
        },
        {
          question: '¿Cómo lidera a un equipo sin autoridad jerárquica?',
          why: 'El núcleo del puesto: se escucha influencia por transparencia y fiabilidad.',
          tip: 'Da un ejemplo en el que ganaste a alguien que objetivamente no tenía tiempo para tu proyecto.',
        },
        {
          question: '¿Cuándo escala un problema y cómo?',
          why: 'Demasiado pronto parece debilidad, demasiado tarde imprudencia. Quieren tu umbral.',
          tip: 'Define el disparador — plazo, presupuesto o calidad insostenibles — y escala con una opción, no con un problema.',
        },
        {
          question: '¿Cómo decide entre dos interesados del mismo nivel?',
          why: 'Comprueba si llevas la decisión al lugar correcto.',
          tip: 'Hacer visibles los criterios, que decidan conjuntamente, dejar constancia.',
        },
        {
          question: '¿Cómo mide el éxito de un proyecto?',
          why: 'Distingue la lógica de entrega de la lógica de valor.',
          tip: 'Además de plazo, presupuesto y alcance, nombra el beneficio tras la puesta en marcha: adopción, horas ahorradas, incidencias evitadas.',
        },
      ],
      redFlags: [
        'Presentar solo proyectos exitosos.',
        'Atribuir cada retraso al negocio, a sistemas o al proveedor.',
        'No poder dar ni una cifra del propio proyecto cuando se pregunta.',
      ],
      askThem: [
        '¿Quién decide aquí la prioridad de los proyectos y con qué frecuencia cambia el orden?',
        '¿Cómo se articulan la organización por proyectos y la jerárquica?',
        '¿Qué proyecto ha fallado más recientemente y qué cambió la empresa después?',
      ],
      faq: [
        {
          question: '¿Debo recomendar una metodología en la entrevista?',
          answer:
            'Solo con un razonamiento tomado de su contexto. «Aquí iría a un híbrido, porque la entrega de hardware tiene fechas fijas mientras el software admite iteración» demuestra criterio. Un compromiso genérico con «lo ágil» suena poco examinado.',
        },
        {
          question: '¿Cómo afronto un caso práctico?',
          answer:
            'Pregunta antes de planificar. Los evaluadores puntúan casi siempre las preguntas de encuadre por encima del plan terminado: dibujar un cronograma de entrada es la forma más habitual de perder el ejercicio.',
        },
      ],
    },
  },

  'sales-representative': {
    name: 'Comercial',
    application: {
      slug: 'comercial',
      metaTitle: 'Candidatura comercial: carta, CV y cifras de ventas',
      metaDescription:
        'Candidatura de comercial: qué cifras destacar, qué palabras clave pasan los filtros, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de comercial',
      intro:
        'En ventas la candidatura es la primera muestra de trabajo: quien no sabe venderse a sí mismo no venderá nada más. Por eso se lee con dureza, y primero se lee buscando cifras.',
      atsKeywords: [
        'Ventas',
        'Captación de clientes',
        'Gestión de cartera',
        'Venta B2B',
        'Responsabilidad sobre facturación',
        'Cumplimiento de objetivos',
        'CRM (Salesforce, HubSpot)',
        'Gestión del embudo',
        'Negociación de contratos',
        'Venta cruzada',
        'Grandes cuentas',
        'Cualificación de oportunidades',
      ],
      hardSkills: [
        {
          label: 'Objetivo y cumplimiento',
          detail:
            'Objetivo anual, cumplimiento real y posición en el equipo. «112 % sobre un objetivo de 1,8 M€» es la línea más potente de tu candidatura.',
        },
        {
          label: 'Tipo de venta y ciclo',
          detail:
            'Entrante o saliente, captación o cartera, B2B o B2C, ticket medio y duración del ciclo: cada uno de estos puntos filtra.',
        },
        {
          label: 'Disciplina en el CRM',
          detail:
            'Nombra la herramienta y qué gestionabas en ella. Las direcciones comerciales preguntan casi siempre por el mantenimiento del embudo.',
        },
        {
          label: 'Sector y producto',
          detail:
            'Vender bienes de equipo complejos es otra profesión distinta de la venta transaccional rápida. Sitúate con claridad.',
        },
      ],
      softSkills: [
        'Encajar el rechazo en ciclos largos',
        'Escuchar en lugar de presentar',
        'Negociar hasta el cierre',
        'Organizarse solo en ruta',
        'Construir relaciones a lo largo de años',
      ],
      certifications: [
        'Grado Superior en Gestión de Ventas y Espacios Comerciales',
        'Salesforce Certified Administrator',
        'Formación en MEDDIC o SPIN Selling',
        'Formación en negociación (método Harvard)',
      ],
      cvFocus: [
        {
          label: 'Cifras en cada puesto',
          detail: 'Objetivo, cumplimiento, facturación gestionada y número de cuentas — en cada posición, no solo en la última.',
        },
        {
          label: 'Zona y disponibilidad para viajar',
          detail: 'Región, porcentaje de desplazamiento y carné de conducir deben verse en la primera página.',
        },
        {
          label: 'Explicar las etapas cortas',
          detail:
            'Los cambios son frecuentes en ventas y aun así se cuentan. Media frase sobre el motivo evita la suposición obvia.',
        },
      ],
      coverLetterOpener:
        'En tres años he llevado la zona sur de 1,2 a 2,1 M€ de facturación anual, principalmente con clientes nuevos del sector industrial y un ciclo medio de cierre de siete meses.',
      mistakes: [
        {
          label: 'Ninguna cifra',
          detail: 'Un CV comercial sin objetivos se lee como una señal de alarma: quien tiene buenos números los publica.',
        },
        {
          label: 'Adjetivos en lugar de cultura de venta',
          detail: '«Orientado al cliente y con alta capacidad de cierre» aparece en una de cada dos candidaturas y no dice nada.',
        },
        {
          label: 'Ninguna referencia a lo que venden',
          detail:
            'Las direcciones comerciales comprueban expresamente si has entendido el producto y a quién se dirige.',
        },
      ],
      faq: [
        {
          question: '¿Qué hago si no alcancé mis objetivos?',
          answer:
            'Indícalos igualmente, con contexto: mercado a la baja, cambio de gama, zona creada desde cero. Las cifras omitidas salen en la entrevista; las cifras explicadas demuestran que dominas tu embudo.',
        },
        {
          question: '¿Puedo citar clientes en la candidatura?',
          answer:
            'Las referencias públicas, sí. Para el resto basta con una descripción: «tres empresas del IBEX 35 en logística» es seguro y produce el mismo efecto.',
        },
        {
          question: '¿Cómo trato el tema del variable?',
          answer:
            'En la candidatura solo si piden expectativas, y entonces como paquete: fijo, variable y sobre qué se calculaba el variable. La proporción fijo/variable se habla en la entrevista, no en la carta.',
        },
      ],
    },
    interview: {
      slug: 'comercial',
      metaTitle: 'Entrevista comercial: preguntas frecuentes y respuestas',
      metaDescription:
        'Entrevista de ventas: objeciones, embudo, operaciones perdidas y role play — qué se evalúa y cómo responder con cifras.',
      heading: 'Entrevista de trabajo para comercial',
      intro:
        'Una entrevista comercial es en sí misma una entrevista de venta y se puntúa como tal. Casi todas incluyen una ronda de cifras y muchas una breve simulación en la que debes presentar o rebatir una objeción.',
      questions: [
        {
          question: '¿Cuáles han sido sus cifras en los últimos tres años?',
          why: 'La pregunta de apertura: se evalúan los números, pero también si llevas tus propios indicadores en la cabeza.',
          tip: 'Objetivo, cumplimiento y posición en el equipo — año por año. Dudar aquí es la peor respuesta.',
        },
        {
          question: 'Véndame este producto.',
          why: 'Se comprueba si preguntas antes de hablar.',
          tip: 'Empieza con tres preguntas de descubrimiento. Enumerar características de entrada hace perder el ejercicio.',
        },
        {
          question: '¿Cómo rebate la objeción «es demasiado caro»?',
          why: 'Comprueba si razonas en valor o en descuento.',
          tip: 'Pregunta con qué lo compara y construye el valor. Descontar como primera reacción se interpreta como debilidad.',
        },
        {
          question: '¿Cómo está su embudo ahora mismo?',
          why: 'Se evalúa el método: cuántas operaciones, en qué fase y con qué probabilidad.',
          tip: 'Describe tus fases y tu ratio de embudo sobre objetivo — lo habitual es un factor de 3 a 4.',
        },
        {
          question: 'Cuénteme una operación perdida.',
          why: 'Autoconocimiento: quien nunca pierde vende poco o no está siendo franco.',
          tip: 'El motivo, qué viste demasiado tarde y qué haces distinto desde entonces.',
        },
        {
          question: '¿Cómo capta clientes sin oportunidades entrantes?',
          why: 'Determina si sabes prospectar de verdad.',
          tip: 'Describe tu cadencia con concreción: investigación, primer contacto, seguimiento — con cifras de tu semana.',
        },
      ],
      redFlags: [
        'No conocer las propias cifras o responder de forma evasiva.',
        'Hablar en lugar de preguntar durante la simulación.',
        'Atribuir cada éxito al producto o al mercado.',
      ],
      askThem: [
        '¿Cómo se fija el objetivo y cuántas personas del equipo lo alcanzaron el año pasado?',
        '¿Cuál es la proporción entre fijo y variable y cuándo se liquida?',
        '¿De dónde vienen las oportunidades y cuánta prospección se espera?',
      ],
      faq: [
        {
          question: '¿Cómo me preparo para el role play?',
          answer:
            'Estudia su producto y su cliente objetivo y lleva cinco buenas preguntas de descubrimiento. El ejercicio casi nunca evalúa conocimiento de producto sino conducción de la conversación: preguntas primero, valor después.',
        },
        {
          question: '¿Debo «cerrar» en la entrevista?',
          answer:
            'Sí, en el sentido que se espera en ventas: pregunta con claridad por los siguientes pasos y los plazos al final. Un intento agresivo de cierre sobre el propio puesto, en cambio, suena impostado.',
        },
      ],
    },
  },

  accountant: {
    name: 'Contable',
    application: {
      slug: 'contable',
      metaTitle: 'Candidatura de contable: carta, CV y programas',
      metaDescription:
        'Candidatura en contabilidad: qué programas y titulaciones destacar, qué palabras clave filtran, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de contable',
      intro:
        'En contabilidad rara vez se filtra por personalidad y casi siempre por tres puntos: qué programas dominas, hasta dónde llegas solo en el cierre y bajo qué normativa. Sin respuesta en las primeras líneas, la candidatura se descarta.',
      atsKeywords: [
        'Contabilidad general',
        'Contabilidad de clientes',
        'Contabilidad de proveedores',
        'Cierre mensual',
        'Cierre anual y cuentas anuales',
        'Plan General Contable',
        'NIIF',
        'Modelo 303 / 390',
        'SAP FI',
        'Sage / A3 / Contaplus',
        'Inmovilizado',
        'Conciliaciones bancarias',
        'Provisiones y periodificaciones',
        'Apoyo a auditoría',
      ],
      hardSkills: [
        {
          label: 'Hasta dónde cierras en autonomía',
          detail:
            'Cierre mensual, trimestral o cuentas anuales completas — en autonomía o como apoyo. Es el criterio de selección decisivo.',
        },
        {
          label: 'Programa y módulo',
          detail:
            'SAP FI, Sage, A3, Navision, Holded — y el módulo. Un nombre de producto sin módulo dice muy poco.',
        },
        {
          label: 'Normativa contable',
          detail:
            'Plan General Contable, NIIF o ambos. Las candidaturas a grupos fallan a menudo porque falta la referencia a NIIF.',
        },
        {
          label: 'Fiscalidad y declaraciones',
          detail:
            'IVA, modelos 303, 347 y 390, inversión del sujeto pasivo, operaciones intracomunitarias: imprescindible en cuanto hay actividad internacional.',
        },
      ],
      softSkills: [
        'Rigor con volúmenes altos de documentos',
        'Cumplimiento de los plazos de cierre',
        'Trato con asesoría y auditores',
        'Discreción con datos salariales y financieros',
        'Paciencia ante las consultas de otras áreas',
      ],
      certifications: [
        'Grado en ADE o en Finanzas y Contabilidad',
        'Ciclo Formativo de Grado Superior en Administración y Finanzas',
        'Máster en Dirección Financiera o Fiscalidad',
        'Certificación en SAP FI o Sage',
      ],
      cvFocus: [
        {
          label: 'Tamaño de la empresa y volumen',
          detail:
            'Una pyme de 40 personas o un grupo con 12 sociedades: ese contexto determina cómo se lee toda tu experiencia.',
        },
        {
          label: 'Nombrar con precisión las tareas de cierre',
          detail: '«Apoyo en el cierre anual» y «elaboración del cierre anual» son dos puestos distintos.',
        },
        {
          label: 'Los programas en un bloque propio',
          detail: 'Herramientas, módulos y años de uso en forma de tabla: así es como se lee realmente.',
        },
      ],
      coverLetterOpener:
        'Desde hace cinco años elaboro el cierre mensual conforme al Plan General Contable para tres sociedades con unos 1.800 documentos al mes, y preparo las cuentas anuales de forma autónoma en SAP FI.',
      mistakes: [
        {
          label: 'Indicar solo «contabilidad»',
          detail:
            'Clientes, proveedores, inmovilizado y cierre son perfiles distintos. Sin diferenciar no encajas exactamente en ninguna oferta.',
        },
        {
          label: 'Declarar un programa sin profundidad',
          detail: '«Conocimientos de SAP» se comprueba en la entrevista. Nombra módulos y tareas o parecerá inflado.',
        },
        {
          label: 'Omitir la formación reciente',
          detail:
            'La normativa fiscal cambia cada año. Sin formación reciente se supone que trabajas con criterios antiguos.',
        },
      ],
      faq: [
        {
          question: '¿Cuánto pesa un máster frente a la experiencia?',
          answer:
            'Para puestos con responsabilidad de cierre, la formación de posgrado suele pedirse expresamente y es la mayor palanca salarial de la profesión. Para puestos de clientes o proveedores no es necesaria: pesan más el volumen y la soltura con el programa.',
        },
        {
          question: '¿Cuenta la experiencia en asesoría dentro de una empresa?',
          answer:
            'Sí, se lee como una base amplia que cubre muchos clientes y formas jurídicas. Añade qué sectores y qué tareas de cierre cubriste, o quedará demasiado genérica para valorarse.',
        },
        {
          question: '¿Debo indicar expectativas salariales?',
          answer:
            'Si la oferta lo pide, sí — omitirlo da sensación de candidatura incompleta. Ajusta la cifra al tamaño de la empresa y al nivel de responsabilidad de cierre, no solo a los años de experiencia.',
        },
      ],
    },
    interview: {
      slug: 'contable',
      metaTitle: 'Entrevista de contable: preguntas frecuentes y respuestas',
      metaDescription:
        'Entrevista en contabilidad: autonomía de cierre, descuadres, errores y programas — qué se evalúa y qué preguntar.',
      heading: 'Entrevista de trabajo para contable',
      intro:
        'Las entrevistas de contabilidad son más técnicas que la media: suele estar presente la dirección financiera, que comprueba con casos concretos tu autonomía real. Una parte técnica breve es la norma, no la excepción.',
      questions: [
        {
          question: '¿Qué cierres realiza de forma autónoma?',
          why: 'La pregunta de clasificación: determina el puesto y la banda salarial.',
          tip: 'Sé exacto: cierre mensual en autonomía, cuentas anuales como apoyo. Exagerar se detecta en el primer cierre.',
        },
        {
          question: '¿Cómo trata un descuadre en una conciliación?',
          why: 'Se evalúa el método, no la memoria.',
          tip: 'Describe tu proceso: acotar por periodo y cuenta, revisar los asientos, localizar el documento, documentar la corrección.',
        },
        {
          question: '¿Qué experiencia tiene con el PGC y con las NIIF?',
          why: 'Determina si eres empleable en un entorno de grupo.',
          tip: 'Cita diferencias concretas con las que hayas trabajado, por ejemplo provisiones o arrendamientos.',
        },
        {
          question: 'Cuénteme un error que haya cometido.',
          why: 'Más importante aquí que en otros perfiles: se busca a alguien que informe en lugar de corregir en silencio.',
          tip: 'Error, impacto, a quién avisaste, corrección, control implantado — en ese orden.',
        },
        {
          question: '¿Cómo se mantiene al día de los cambios normativos?',
          why: 'Se evalúa la iniciativa en una profesión cuyo marco cambia cada año.',
          tip: 'Cita fuentes y formación concretas, no «documentación profesional».',
        },
        {
          question: '¿Cómo trabaja bajo la presión del cierre?',
          why: 'La semana de cierre es la prueba de esfuerzo de la profesión.',
          tip: 'Describe tu secuencia y cómo consigues a tiempo la información de otras áreas.',
        },
      ],
      redFlags: [
        'Declarar conocimientos de programa que la parte técnica no confirma.',
        'Presentar los errores como culpa de otro departamento.',
        'No poder citar ninguna formación reciente.',
      ],
      askThem: [
        '¿Cuántas sociedades y qué volumen lleva el equipo y cómo se reparte el trabajo?',
        '¿Cómo es el cierre y cuántos días hábiles requiere actualmente?',
        '¿Qué sistemas se usan y hay migraciones previstas?',
      ],
      faq: [
        {
          question: '¿Hay prueba técnica?',
          answer:
            'Con frecuencia, y suele ser breve: algunos asientos, una periodificación o una cuestión de IVA. Se busca soltura básica, no nivel de oposición — espera supuestos estándar del propio puesto.',
        },
        {
          question: '¿Cómo explico el salto de la asesoría a la empresa?',
          answer:
            'Como búsqueda de profundidad en lugar de variedad: seguir una sociedad todo el año en vez de muchos expedientes en paralelo. Es la razón aceptada — evita apoyar la explicación solo en la carga de trabajo.',
        },
      ],
    },
  },

  'marketing-manager': {
    name: 'Responsable de marketing',
    application: {
      slug: 'responsable-de-marketing',
      metaTitle: 'Candidatura de marketing: carta de presentación, CV y KPI',
      metaDescription:
        'Candidatura de responsable de marketing: qué KPI convencen, qué canales y herramientas citar, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de responsable de marketing',
      intro:
        'Las candidaturas de marketing rara vez fallan por el diseño y casi siempre por la ausencia de cifras. Si indicas canal, presupuesto y resultado te leen como responsable; si enumeras campañas, como ejecutor.',
      atsKeywords: [
        'Marketing digital',
        'Gestión de campañas',
        'SEO',
        'SEM / Google Ads',
        'Marketing de contenidos',
        'Email marketing',
        'Redes sociales',
        'Automatización de marketing (HubSpot)',
        'Google Analytics 4',
        'Tasa de conversión',
        'CAC / ROAS',
        'Responsabilidad presupuestaria',
        'Gestión de marca',
        'Test A/B',
      ],
      hardSkills: [
        {
          label: 'KPI con punto de partida',
          detail:
            '«CAC reducido de 180 € a 120 €» dice más que cualquier porcentaje sin base. Da siempre las dos cifras.',
        },
        {
          label: 'Profundidad de canal antes que listas',
          detail:
            'Dos canales que gestionas de verdad valen más que ocho que has rozado. Indica el presupuesto que llevabas.',
        },
        {
          label: 'Herramientas y datos',
          detail: 'GA4, HubSpot, Salesforce Marketing Cloud, Looker Studio: los filtros buscan literalmente estos nombres.',
        },
        {
          label: 'B2B o B2C',
          detail:
            'Ciclos largos con maduración de oportunidades es otra profesión distinta del marketing de resultados en comercio electrónico.',
        },
      ],
      softSkills: [
        'Trabajar con ventas y con producto',
        'Dirigir agencias y colaboradores externos',
        'Priorizar con presupuesto limitado',
        'Defender resultados ante dirección',
        'Criterio editorial',
      ],
      certifications: [
        'Certificaciones de Google Ads (Search, Performance Max)',
        'Certificación de Google Analytics 4',
        'HubSpot Inbound Marketing / Marketing Software',
        'Máster en Marketing Digital',
      ],
      cvFocus: [
        {
          label: 'Un resultado por puesto',
          detail: 'Un indicador que se movió de forma demostrable gracias a tu trabajo. Con eso basta.',
        },
        {
          label: 'Presupuesto y tamaño del equipo',
          detail: 'Haber gestionado 30.000 € o 3 M€ determina el nivel de puesto para el que te leen.',
        },
        {
          label: 'Enlazar un portafolio',
          detail:
            'Dos o tres campañas con objetivo, ejecución y resultado, en página o PDF. Un enlace sustituye a una página de descripción.',
        },
      ],
      coverLetterOpener:
        'En [Empresa] gestioné un presupuesto de captación de 40.000 € mensuales y bajé el coste por oportunidad de 94 € a 61 € en dos trimestres, sin empeorar la tasa de cierre del equipo comercial.',
      mistakes: [
        {
          label: 'Creatividad sin efecto',
          detail: 'Una campaña bien ejecutada pero sin resultado no convence a ninguna dirección. Nombra siempre el objetivo.',
        },
        {
          label: 'Declarar demasiados canales',
          detail: 'Ser experto en todo se lee como no serlo en nada, y se deshace rápido en la entrevista.',
        },
        {
          label: 'Sobrediseñar la candidatura',
          detail:
            'Los diseños complejos suelen quedar ilegibles al pasar por un ATS. Un CV claro y un portafolio enlazado es la vía segura.',
        },
      ],
      faq: [
        {
          question: '¿Necesito un portafolio en marketing?',
          answer:
            'Para perfiles de contenido y creatividad sí; para perfiles de captación y analítica vale más un resumen de indicadores. En ambos casos basta un enlace: los adjuntos de más de 5 MB los rechazan muchos servidores de correo.',
        },
        {
          question: '¿Cómo trato KPI confidenciales?',
          answer:
            'Usa valores relativos: «tasa de conversión aumentada un 34 %» en lugar de la facturación absoluta. Cumple con la confidencialidad y es perfectamente suficiente para valorar tu trabajo.',
        },
        {
          question: '¿Se esperan competencias en IA?',
          answer:
            'Cada vez más, pero como herramienta y no como fin. Lo que convence es describir qué proceso aceleraste y cómo sigues garantizando la calidad.',
        },
      ],
    },
    interview: {
      slug: 'responsable-de-marketing',
      metaTitle: 'Entrevista de marketing: preguntas frecuentes y respuestas',
      metaDescription:
        'Entrevista de responsable de marketing: campañas, KPI, presupuesto y fracasos — qué se evalúa y cómo estructurar la respuesta.',
      heading: 'Entrevista de trabajo para responsable de marketing',
      intro:
        'Una entrevista de marketing desmonta casi siempre una campaña en detalle. Se espera que separes con limpieza objetivo, público, presupuesto, resultado y tu propia aportación — y ahí es donde tropieza la mayoría.',
      questions: [
        {
          question: 'Cuénteme una campaña de la que esté orgulloso.',
          why: 'Se evalúa si razonas en objetivos o en acciones.',
          tip: 'Objetivo, público, canal, presupuesto, resultado y tu parte — en ese orden, en dos minutos.',
        },
        {
          question: '¿Qué campaña fracasó y por qué?',
          why: 'El marketing es iterativo: quien nunca ha parado una campaña nunca ha probado de verdad.',
          tip: 'Nombra la hipótesis, qué la refutó y qué cambiaste después.',
        },
        {
          question: '¿Qué indicador mira a diario?',
          why: 'Distingue la gestión operativa del informe de fin de mes.',
          tip: 'Cita uno y justifica por qué representa mejor el negocio.',
        },
        {
          question: '¿Cómo mejoraría nuestro marketing?',
          why: 'Se evalúa la preparación: casi todos los candidatos responden en general.',
          tip: 'Dos observaciones concretas de su web o de sus anuncios, con razonamiento.',
        },
        {
          question: '¿Cómo trabaja con el equipo comercial?',
          why: 'La línea de fricción más habitual en B2B.',
          tip: 'Describe definiciones de oportunidad compartidas y retorno sobre la calidad, no solo traspasos.',
        },
        {
          question: '¿Cómo reparte un presupuesto limitado?',
          why: 'Se evalúan la priorización y la cultura de experimentación.',
          tip: 'Describe un reparto entre lo consolidado y las pruebas, con un criterio de corte.',
        },
      ],
      redFlags: [
        'Citar indicadores que luego no se saben reconstruir.',
        'Atribuirse todos los éxitos y culpar al presupuesto de todos los fracasos.',
        'No haber mirado el producto de la empresa antes de la entrevista.',
      ],
      askThem: [
        '¿Qué indicador decide aquí si el marketing funciona?',
        '¿Cómo se reparte el presupuesto entre marca y captación?',
        '¿Cómo colaboran marketing y ventas en la definición de oportunidad?',
      ],
      faq: [
        {
          question: '¿Debo preparar un caso práctico por iniciativa propia?',
          answer:
            'Si no se pide ninguno, bastan dos observaciones concretas sobre su marketing. Transmite preparación sin resultar presuntuoso — un plan completo no solicitado suele sonar poco informado.',
        },
        {
          question: '¿Cómo respondo sobre herramientas que no conozco?',
          answer:
            'Sitúate con honestidad y cita el equivalente: «HubSpot no lo he usado, pero sí Marketo en la misma función». Las herramientas se aprenden; una afirmación falsa se descubre en la primera semana.',
        },
      ],
    },
  },

  'data-analyst': {
    name: 'Analista de datos',
    application: {
      slug: 'analista-de-datos',
      metaTitle: 'Candidatura de analista de datos: carta, CV y competencias',
      metaDescription:
        'Candidatura de data analyst: qué herramientas y métodos citar, cómo demostrar impacto, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de analista de datos',
      intro:
        'A un analista no se le contrata por sus herramientas sino porque su análisis cambió una decisión. Todo el mundo declara SQL; la diferencia está en poder decir qué se hizo distinto después de tu trabajo.',
      atsKeywords: [
        'Análisis de datos',
        'SQL',
        'Python',
        'R',
        'Power BI',
        'Tableau',
        'Looker',
        'Visualización de datos',
        'ETL',
        'Almacén de datos',
        'dbt',
        'Test A/B',
        'Informes de KPI',
        'Estadística',
      ],
      hardSkills: [
        {
          label: 'SQL con profundidad real',
          detail:
            'Funciones de ventana, CTE, optimización de consultas. Casi todos los procesos incluyen una prueba de SQL, y el nivel superficial se nota al instante.',
        },
        {
          label: 'Una herramienta de BI de verdad',
          detail:
            'Power BI, Tableau o Looker — incluido el modelado de datos, no solo gráficos sobre una tabla ya hecha.',
        },
        {
          label: 'Criterio estadístico',
          detail: 'Significación, confianza, tamaño de muestra: la frontera entre informar y analizar.',
        },
        {
          label: 'Conocimiento del sector',
          detail:
            'Comercio electrónico, finanzas, logística o salud: conocer los indicadores del sector te hace útil desde el primer día.',
        },
      ],
      softSkills: [
        'Explicar hallazgos a públicos no analíticos',
        'Convertir preguntas vagas en preguntas respondibles',
        'Desconfiar del propio resultado',
        'Documentar los supuestos con limpieza',
        'Comunicar un resultado incómodo',
      ],
      certifications: [
        'Microsoft Certified: Power BI Data Analyst Associate',
        'Tableau Desktop Specialist',
        'Google Data Analytics Professional Certificate',
        'AWS Certified Data Engineer – Associate',
      ],
      cvFocus: [
        {
          label: 'Decisiones, no cuadros de mando',
          detail:
            '«El análisis de bajas llevó a rediseñar la acogida; cancelaciones un 18 % menos» en lugar de «creación de cuadros de mando».',
        },
        {
          label: 'Volumen y fuentes de datos',
          detail: 'El orden de magnitud y el número de sistemas conectados muestran en qué entorno trabajas.',
        },
        {
          label: 'Un ejemplo de trabajo público',
          detail: 'Un notebook o un panel público con una pregunta y una respuesta sustituye a muchas afirmaciones.',
        },
      ],
      coverLetterOpener:
        'Mi análisis de cohortes en [Empresa] mostró que el 60 % de las bajas se produce en los primeros 30 días; el rediseño de la acogida que siguió redujo la fuga de clientes un 18 % el trimestre siguiente.',
      mistakes: [
        {
          label: 'Una lista de herramientas en lugar de una pregunta',
          detail: 'Todos los candidatos tienen SQL y Python. Casi ninguno escribe la pregunta que respondió con ellos.',
        },
        {
          label: 'Confundir analista con científico de datos',
          detail:
            'Declarar modelos que nunca llegaron a producción lleva directamente a preguntas incómodas en la parte técnica.',
        },
        {
          label: 'Argumentar sin vínculo con el negocio',
          detail: 'Un análisis metodológicamente limpio pero sin uso visible no convence a ninguna área.',
        },
      ],
      faq: [
        {
          question: '¿Hace falta una carrera de estadística o informática?',
          answer:
            'No: los cambios de carrera son habituales en analítica. Lo que decide es una muestra de trabajo sólida: una pregunta real, bien resuelta y bien presentada. Sin titulación, la muestra pesa más, no la longitud de la candidatura.',
        },
        {
          question: '¿Cómo demuestro experiencia si los datos son confidenciales?',
          answer:
            'Describe pregunta, método e impacto sin cifras absolutas, y añade un proyecto con datos públicos. Esa combinación de práctica descrita y oficio verificable es la vía habitual.',
        },
        {
          question: '¿Cómo me preparo para la prueba de SQL?',
          answer:
            'Practica joins, agregaciones, funciones de ventana y CTE sobre un conjunto de datos real y con tiempo limitado. Casi todos los procesos incluyen una, y es el principal punto de descarte.',
        },
      ],
    },
    interview: {
      slug: 'analista-de-datos',
      metaTitle: 'Entrevista de analista de datos: preguntas y respuestas',
      metaDescription:
        'Entrevista de data analyst: prueba de SQL, caso práctico y preguntas conductuales — qué se evalúa y cómo responder.',
      heading: 'Entrevista de trabajo para analista de datos',
      intro:
        'El proceso suele tener tres fases: prueba de SQL, caso práctico con pregunta abierta y conversación con el área de negocio. La mayoría cae en el caso práctico — no por el análisis, sino por calcular antes de preguntar.',
      questions: [
        {
          question: 'Un indicador ha caído un 30 % de un día para otro. ¿Cómo procede?',
          why: 'La pregunta de diagnóstico clásica: evalúa método, no intuición.',
          tip: 'Descartar primero un problema de datos, luego segmentar — región, dispositivo, canal, cohorte — y después contrastar hipótesis.',
        },
        {
          question: '¿Cómo presenta un resultado que el negocio no quiere oír?',
          why: 'Se evalúan a la vez firmeza y comunicación.',
          tip: 'Resultado, método, incertidumbre, opciones. Un ejemplo real es lo que más peso tiene aquí.',
        },
        {
          question: '¿Cómo se asegura de que sus cifras son correctas?',
          why: 'La calidad del dato es el núcleo del puesto.',
          tip: 'Comprobaciones de coherencia, contraste con una segunda fuente, supuestos documentados — nómbralos con concreción.',
        },
        {
          question: 'Explique un test A/B a alguien sin formación estadística.',
          why: 'Se evalúa la capacidad de traducir.',
          tip: 'Sin jerga, y con un ejemplo tomado de su producto.',
        },
        {
          question: '¿En qué ha trabajado que cambiara una decisión?',
          why: 'Distingue informar de analizar.',
          tip: 'Nombra la decisión y quién la tomó, no el cuadro de mando.',
        },
        {
          question: '¿Cómo prioriza peticiones que compiten entre sí?',
          why: 'A un analista lo reclaman todas las áreas: priorizar es tarea diaria.',
          tip: 'Priorizar por relevancia para la decisión y por plazo, y pasar lo recurrente a autoservicio.',
        },
      ],
      redFlags: [
        'Empezar a calcular en el caso práctico sin aclarar la pregunta.',
        'Presentar una correlación como causa.',
        'Asumir supuestos sin enunciarlos.',
      ],
      askThem: [
        '¿Quién usa los análisis y qué decisiones dependen de ellos?',
        '¿Cómo está montada la arquitectura de datos y qué fiabilidad tienen las fuentes?',
        '¿El puesto es más de habilitar autoservicio o de análisis en profundidad?',
      ],
      faq: [
        {
          question: '¿Qué nivel suele tener la prueba de SQL?',
          answer:
            'Normalmente intermedio y con tiempo limitado: varios joins, una agregación y alguna función de ventana. Más frecuente que la dificultad es la trampa de no comprobar la coherencia del resultado — eso también puntúa.',
        },
        {
          question: '¿Qué me espera en el caso práctico?',
          answer:
            'Una pregunta de negocio abierta, del tipo «¿por qué baja la recompra?». Se esperan preguntas de encuadre, un enfoque y supuestos enunciados — no una cifra cerrada.',
        },
      ],
    },
  },

  teacher: {
    name: 'Profesor',
    application: {
      slug: 'profesor',
      metaTitle: 'Candidatura de profesor: carta de presentación y documentación',
      metaDescription:
        'Candidatura docente: oposiciones, listas de interinos y centros concertados o privados, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de profesor',
      intro:
        'En la docencia conviven dos vías que se leen de forma muy distinta: la pública, donde cuentan la especialidad, la nota de oposición y el baremo, y los centros concertados y privados, donde cuenta el encaje con el proyecto educativo del centro.',
      atsKeywords: [
        'Docencia',
        'Especialidad docente',
        'Oposiciones y listas de interinos',
        'Máster en formación del profesorado',
        'Programación didáctica',
        'Atención a la diversidad',
        'Gestión del aula',
        'Evaluación por competencias',
        'Necesidades educativas especiales',
        'Tutoría',
        'Relación con las familias',
        'Tecnología educativa',
      ],
      hardSkills: [
        {
          label: 'Especialidad y etapa',
          detail:
            'La especialidad y las etapas impartidas determinan casi todo. Ambas deben figurar en la primera línea.',
        },
        {
          label: 'Titulación y habilitación',
          detail:
            'Grado, máster en formación del profesorado, y para títulos extranjeros la credencial de homologación.',
        },
        {
          label: 'Experiencia con alumnado fuera de las prácticas',
          detail:
            'Sustituciones, refuerzo, academias, formación de adultos: todo lo que demuestre que sostienes un aula.',
        },
        {
          label: 'Cualificaciones complementarias',
          detail:
            'Bilingüismo, atención a la diversidad, tecnología educativa: exactamente lo que buscan las direcciones de centro.',
        },
      ],
      softSkills: [
        'Autoridad sin confrontación',
        'Entrevistas difíciles con familias',
        'Trabajo en el departamento',
        'Paciencia ante aulas heterogéneas',
        'Fiabilidad en la vida del centro',
      ],
      certifications: [
        'Máster Universitario en Formación del Profesorado (MAES)',
        'Habilitación lingüística para enseñanza bilingüe (B2/C1)',
        'Formación en atención a la diversidad',
        'Certificación en competencia digital docente',
      ],
      cvFocus: [
        {
          label: 'Tipo de centro y niveles',
          detail: 'Público, concertado o privado, y los niveles realmente impartidos.',
        },
        {
          label: 'Implicación más allá del aula',
          detail:
            'Actividades, salidas, proyectos, coordinaciones: en centros concertados y privados suele ser el factor decisivo.',
        },
        {
          label: 'Referencia al proyecto del centro',
          detail:
            'Bilingüe, pedagogías activas, itinerarios de FP: una frase basta para distinguirte de la candidatura estándar.',
        },
      ],
      coverLetterOpener:
        'Su sección bilingüe en la ESO encaja exactamente con mi perfil de inglés e historia: durante dos trimestres impartí historia en inglés en un grupo heterogéneo de segundo de la ESO.',
      mistakes: [
        {
          label: 'La misma carta para la administración y para el centro',
          detail:
            'La administración espera datos formales; la dirección del centro espera encaje con su proyecto. Hacen falta dos textos.',
        },
        {
          label: 'Principios pedagógicos en lugar de práctica',
          detail:
            'Media página de filosofía educativa no se lee. Una unidad didáctica descrita con su resultado, sí.',
        },
        {
          label: 'Documentación incompleta',
          detail:
            'Títulos, certificado de delitos de naturaleza sexual y méritos baremables: si falta uno, la incorporación se retrasa semanas.',
        },
      ],
      faq: [
        {
          question: '¿Cómo entro en la docencia desde otra profesión?',
          answer:
            'Con el máster de formación del profesorado y después por oposición o por las listas de interinos, cuyos plazos varían según comunidad autónoma. Lo que decide la vía es que tu titulación se corresponda con una especialidad; matemáticas, tecnología y las especialidades de FP tienen las mejores perspectivas.',
        },
        {
          question: '¿Me inscribo en listas o me presento directamente a los centros?',
          answer:
            'Normalmente ambas cosas: las listas para la pública, la candidatura directa para centros concertados y privados. La vía directa es más rápida, pero solo donde hay vacante publicada.',
        },
        {
          question: '¿Cuánto pesa la nota de oposición después?',
          answer:
            'Determina sobre todo el orden en la lista y el destino inicial. Para una vacante publicada en un centro concreto, el encaje con el proyecto y las cualificaciones complementarias pesan bastante más.',
        },
      ],
    },
    interview: {
      slug: 'profesor',
      metaTitle: 'Entrevista de profesor: preguntas frecuentes y respuestas',
      metaDescription:
        'Entrevista docente: gestión del aula, atención a la diversidad, familias y proyecto de centro — qué se evalúa y qué preguntar.',
      heading: 'Entrevista de trabajo para profesor',
      intro:
        'En centros concertados y privados la entrevista la conduce la dirección, a menudo con la jefatura de estudios. Se pregunta casi siempre por situaciones concretas, y con frecuencia hay una sesión observada que pesa más que la conversación.',
      questions: [
        {
          question: '¿Cómo gestiona un grupo que no se calma?',
          why: 'La gestión del aula es la competencia central: se buscan estructuras, no volumen de voz.',
          tip: 'Describe las rutinas y normas que estableces antes, no solo tu reacción en el momento.',
        },
        {
          question: '¿Cómo atiende la diversidad en un grupo heterogéneo?',
          why: 'El día a día de cualquier etapa. Se espera práctica, no teoría.',
          tip: 'Detalla una sesión con tareas graduadas: materiales, secuencia, resultado.',
        },
        {
          question: 'Cuénteme una entrevista difícil con una familia.',
          why: 'La relación con las familias consume mucho tiempo y desgasta a los equipos.',
          tip: 'Escuchar, separar los hechos de la emoción, acordar una actuación, dejar constancia.',
        },
        {
          question: '¿Por qué nuestro centro?',
          why: 'La pregunta decisiva en cualquier vacante concreta.',
          tip: 'Apóyate en el proyecto educativo, el carácter propio o un programa específico del centro.',
        },
        {
          question: '¿Cómo usa la tecnología en el aula?',
          why: 'Se comprueba que la herramienta está justificada didácticamente y no usada por sí misma.',
          tip: 'Un ejemplo en el que la herramienta permitió algo imposible de otro modo.',
        },
        {
          question: '¿Qué aportaría más allá de sus clases?',
          why: 'Los centros contratan compañeros que sostienen la vida del centro.',
          tip: 'Sé concreto — una actividad, una coordinación, un proyecto — y honesto sobre tu disponibilidad.',
        },
      ],
      redFlags: [
        'Atribuir los problemas de convivencia solo al alumnado o a las familias.',
        'No haber leído el proyecto educativo del centro.',
        'Hablar solo con consignas pedagógicas sin un solo ejemplo.',
      ],
      askThem: [
        '¿Cómo se organiza la acogida del profesorado nuevo?',
        '¿Cuáles son las prioridades del centro para los próximos dos cursos?',
        '¿Cómo se coordina el trabajo dentro del departamento?',
      ],
      faq: [
        {
          question: '¿Cómo es una sesión observada?',
          answer:
            'Suele ser una clase reducida con un grupo que no conoces, con el tema comunicado de antemano y una conversación posterior. Se valora más tu análisis de lo que funcionó y lo que no que una sesión sin fisuras.',
        },
        {
          question: '¿Se puede trabajar sin haber aprobado la oposición?',
          answer:
            'Sí, como interino en la pública o con contrato en centros concertados y privados, y es una vía de entrada habitual. La estabilidad es menor, pero permite acumular experiencia docente que después puntúa en el baremo.',
        },
      ],
    },
  },

  'office-administrator': {
    name: 'Administrativo',
    application: {
      slug: 'administrativo',
      metaTitle: 'Candidatura de administrativo: carta de presentación y CV',
      metaDescription:
        'Candidatura administrativa: qué tareas y programas citar, ejemplo de apertura y los errores que hacen intercambiable un currículum.',
      heading: 'Cómo escribir una candidatura de administrativo',
      intro:
        'Los puestos administrativos reciben más candidaturas que casi cualquier otro, y la mayoría son intercambiables. Describir tu ámbito real en vez de «tareas administrativas generales» ya te sitúa en el primer tercio.',
      atsKeywords: [
        'Gestión administrativa',
        'Administración de ventas',
        'Verificación de facturas',
        'Gestión de agendas',
        'Gastos de viaje',
        'Correspondencia',
        'Paquete Office / Excel',
        'ERP',
        'Grabación y mantenimiento de datos',
        'Elaboración de presupuestos',
        'Recepción y centralita',
        'Gestión documental',
      ],
      hardSkills: [
        {
          label: 'Tu ámbito real',
          detail:
            'Administración de ventas, facturación, gestión de personal o asistencia a dirección: trabajos muy distintos bajo el mismo título.',
        },
        {
          label: 'Excel más allá de lo básico',
          detail:
            'BUSCARV/BUSCARX, tablas dinámicas, filtros: es la competencia que más se comprueba en esta familia.',
        },
        {
          label: 'ERP y programas de gestión',
          detail:
            'SAP, Sage, A3, Navision o Holded, por su nombre: el tiempo de adaptación es un coste directo para la empresa.',
        },
        {
          label: 'Cifras de volumen',
          detail:
            'Pedidos por semana, facturas al mes, centros atendidos: es lo que hace concreta la «gestión administrativa».',
        },
      ],
      softSkills: [
        'Priorizar sin supervisión estrecha',
        'Mantener el trato correcto con interlocutores difíciles',
        'Cumplir plazos de forma fiable',
        'Discreción con datos de personal y contratos',
        'Anticiparse más allá de la propia tarea',
      ],
      certifications: [
        'Ciclo Formativo de Grado Superior en Administración y Finanzas',
        'Certificado de profesionalidad en actividades administrativas',
        'Certificación de Excel avanzado',
        'Formación en contabilidad o nóminas',
      ],
      cvFocus: [
        {
          label: 'Sector y tamaño de la empresa',
          detail: 'Taller, despacho profesional, industria o administración pública: el día a día no se parece en nada.',
        },
        {
          label: 'Los programas en un bloque propio',
          detail: 'Una lista breve con el nivel de uso se lee; un párrafo, no.',
        },
        {
          label: 'Una trayectoria sin huecos sin explicar',
          detail: 'En selección administrativa se revisa la cronología con detalle. Explica brevemente las interrupciones.',
        },
      ],
      coverLetterOpener:
        'En mi puesto actual tramito unos 120 pedidos de clientes por semana en Sage 200 — desde la grabación del pedido y el seguimiento de plazos hasta la facturación.',
      mistakes: [
        {
          label: '«Tareas administrativas generales»',
          detail: 'La fórmula más frecuente del sector y la que menos informa.',
        },
        {
          label: '«Buen manejo del paquete Office»',
          detail: 'Lo escribe todo el mundo. Di qué construyes realmente en Excel y te distinguirás al instante.',
        },
        {
          label: 'Una carta tipo sin referencia',
          detail: 'Con tantos candidatos, decide la frase que demuestra que has leído la oferta.',
        },
      ],
      faq: [
        {
          question: '¿Cómo destaco entre muchos candidatos?',
          answer:
            'Con concreción: volúmenes, programas y ámbito exacto. La mayoría de candidaturas del sector se quedan en lo genérico, así que tres datos precisos ya parecen por encima de la media.',
        },
        {
          question: '¿Cómo explico una reincorporación tras una pausa larga?',
          answer:
            'Con naturalidad y brevedad en la carta, sin justificarte, y una línea sobre la actualización — un curso de ofimática o de contabilidad. Un hueco callado genera más preguntas que uno nombrado.',
        },
        {
          question: '¿Sirve la candidatura espontánea?',
          answer:
            'Sí, especialmente en el ámbito administrativo, donde muchos puestos se cubren internamente o por recomendación. Indica el área concreta: una candidatura espontánea sin dirección rara vez se reenvía.',
        },
      ],
    },
    interview: {
      slug: 'administrativo',
      metaTitle: 'Entrevista de administrativo: preguntas y respuestas',
      metaDescription:
        'Entrevista administrativa: organización, Excel, priorización y confidencialidad — qué se evalúa y qué preguntar.',
      heading: 'Entrevista de trabajo para administrativo',
      intro:
        'La entrevista suele reunir al responsable directo y a alguien de recursos humanos. Se sondean la organización personal, el rigor y la resistencia a la carga con ejemplos concretos, y muchos procesos incluyen una prueba breve de Excel o de redacción.',
      questions: [
        {
          question: '¿Cómo se organiza cuando varias cosas son urgentes a la vez?',
          why: 'El núcleo del puesto: se espera un criterio reproducible, no aguante.',
          tip: 'Priorizar por plazo y consecuencia, avisar cuando algo se va a retrasar — con un ejemplo.',
        },
        {
          question: '¿Cómo evita cometer errores?',
          why: 'El rigor es el primer criterio en administración.',
          tip: 'Describe tu rutina de control: doble revisión, lista de comprobación, verificación antes de enviar.',
        },
        {
          question: '¿Qué funciones de Excel usa habitualmente?',
          why: 'La competencia más sobrevalorada en los currículums administrativos.',
          tip: 'Cita funciones concretas y para qué las usas. Sé honesto: suele haber prueba.',
        },
        {
          question: '¿Cómo gestiona una llamada de alguien molesto?',
          why: 'Se evalúan la desescalada y la fiabilidad del compromiso.',
          tip: 'Dejar terminar, reformular, comprometerse con un paso concreto y cumplirlo.',
        },
        {
          question: '¿Cómo trata la documentación confidencial?',
          why: 'Los puestos administrativos tocan datos de personal, contratos y nóminas.',
          tip: 'Cita práctica concreta: permisos de acceso, archivo cerrado, ninguna cesión sin autorización.',
        },
        {
          question: '¿Qué hace si su responsable no está localizable y hay que decidir?',
          why: 'Se evalúan autonomía y criterio.',
          tip: 'Marca el límite: qué decides tú, qué haces validar y cómo lo dejas registrado.',
        },
      ],
      redFlags: [
        'Declarar un nivel de Excel que la prueba no confirma.',
        'Responder a las preguntas de organización solo con «soy muy organizado».',
        'Hablar mal de responsables o compañeros anteriores.',
      ],
      askThem: [
        '¿Cómo se reparte el trabajo entre las personas del equipo?',
        '¿Qué programas se usan y cuánto dura la formación inicial?',
        '¿Cuáles serían las prioridades de los tres primeros meses?',
      ],
      faq: [
        {
          question: '¿Hay prueba?',
          answer:
            'Con frecuencia: un ejercicio corto de Excel, una prueba de redacción o una carta modelo. Rara vez superan los 30 minutos y buscan soltura básica, no conocimientos especializados.',
        },
        {
          question: '¿Puedo preguntar por el teletrabajo y el horario?',
          answer:
            'Sí, más adelante en la conversación: son cuestiones prácticas legítimas. Pregunta por lo que hace realmente el equipo en lugar de por lo que dice la política, y obtendrás la respuesta útil.',
        },
      ],
    },
  },

  'customer-service-agent': {
    name: 'Agente de atención al cliente',
    application: {
      slug: 'agente-atencion-al-cliente',
      metaTitle: 'Candidatura de atención al cliente: carta, CV e indicadores',
      metaDescription:
        'Candidatura de atención al cliente: qué indicadores y herramientas citar, ejemplo de apertura y errores que banalizan un perfil.',
      heading: 'Cómo escribir una candidatura de atención al cliente',
      intro:
        'En atención al cliente importa menos la trayectoria que la prueba de que sostienes una conversación bajo presión. Indica canal, volumen e indicadores de calidad y te sitúan al instante; el resto acaba en la pila general.',
      atsKeywords: [
        'Atención al cliente',
        'Servicio al cliente',
        'Soporte de primer nivel',
        'Soporte de segundo nivel',
        'Gestión de reclamaciones',
        'Gestión de escalados',
        'CRM (Salesforce, Zendesk)',
        'Sistema de tickets',
        'Llamadas entrantes / salientes',
        'Satisfacción del cliente (CSAT)',
        'Resolución en primer contacto',
        'Acuerdo de nivel de servicio',
      ],
      hardSkills: [
        {
          label: 'Canal y volumen',
          detail:
            'Teléfono, correo, chat o redes sociales — y cuántos contactos al día. 80 llamadas es otro trabajo distinto de 20 casos complejos.',
        },
        {
          label: 'Indicadores de servicio',
          detail:
            'CSAT, resolución en primer contacto, tiempo medio de gestión y cumplimiento del nivel de servicio: el idioma de cualquier dirección de servicio.',
        },
        {
          label: 'Herramientas',
          detail: 'Zendesk, Freshdesk, Salesforce Service Cloud, Intercom — por su nombre.',
        },
        {
          label: 'Profundidad de producto',
          detail:
            'Soporte técnico, seguros, energía o comercio electrónico: el conocimiento de producto determina adaptación y banda salarial.',
        },
      ],
      softSkills: [
        'Mantener la calma con clientes enfadados',
        'Escucha activa',
        'Explicar con claridad y sin jerga',
        'Resistencia a la alta cadencia',
        'Cumplir lo prometido',
      ],
      certifications: [
        'Certificado de profesionalidad en atención al cliente',
        'Salesforce Service Cloud Consultant',
        'ITIL Foundation (soporte técnico)',
        'Certificaciones de idiomas (B2/C1)',
      ],
      cvFocus: [
        {
          label: 'Indicadores en cada puesto',
          detail: 'Contactos al día, CSAT y resolución en primer contacto: es lo primero que se lee.',
        },
        {
          label: 'Idiomas con nivel',
          detail: 'En servicio internacional cada idioma adicional es una palanca salarial directa.',
        },
        {
          label: 'Disponibilidad horaria',
          detail: 'Muchos servicios funcionan por turnos: aclararlo pronto ahorra tiempo a ambas partes.',
        },
      ],
      coverLetterOpener:
        'En el sector energético atiendo unos 60 contactos diarios por teléfono y chat, con un 84 % de resolución en primer contacto y un CSAT de 4,6 sobre 5.',
      mistakes: [
        {
          label: 'Solo «amable y comunicativo»',
          detail: 'Aparece en prácticamente todas las candidaturas del sector. Un indicador vale más que cualquier adjetivo.',
        },
        {
          label: 'Ningún dato de volumen',
          detail: 'Sin número de contactos no se sabe si aguantas la carga, que es la pregunta central del puesto.',
        },
        {
          label: 'Ocultar la experiencia en reclamaciones',
          detail: 'Saber gestionar un escalado es la competencia más valiosa del área, no un defecto.',
        },
      ],
      faq: [
        {
          question: '¿Cuenta la experiencia en hostelería o comercio?',
          answer:
            'Sí, y suele infravalorarse. Tradúcela al lenguaje del servicio: clientes por turno, reclamaciones gestionadas, incidencias resueltas — así encaja directamente en el puesto.',
        },
        {
          question: '¿Cómo planteo el teletrabajo?',
          answer:
            'La atención al cliente es una de las funciones más organizadas en remoto, así que la pregunta se espera. Plantéala en la entrevista y no en la carta, y pregunta por el modelo real del equipo.',
        },
        {
          question: '¿Pesan más los idiomas que la experiencia sectorial?',
          answer:
            'En servicio internacional a menudo sí: un segundo idioma en B2/C1 abre puestos que de otro modo quedan cerrados. En soporte técnico pesa más el conocimiento de producto.',
        },
      ],
    },
    interview: {
      slug: 'agente-atencion-al-cliente',
      metaTitle: 'Entrevista de atención al cliente: preguntas y respuestas',
      metaDescription:
        'Entrevista de atención al cliente: escalados, carga e indicadores, normalmente con role play — qué se evalúa y cómo responder.',
      heading: 'Entrevista de trabajo en atención al cliente',
      intro:
        'Las entrevistas de servicio incluyen casi siempre una simulación: se te presenta un cliente enfadado y debes conducir la conversación. No se puntúa la solución sino que escuches primero y después te comprometas con algo que puedas cumplir.',
      questions: [
        {
          question: 'Un cliente está furioso y tiene razón. ¿Qué hace?',
          why: 'La situación de referencia del puesto.',
          tip: 'Dejar terminar, reconocer el fallo, ofrecer solución, comprometer un plazo y hacer seguimiento. Sin justificar a la empresa.',
        },
        {
          question: 'Un cliente exige algo que usted no puede conceder. ¿Cómo reacciona?',
          why: 'Se evalúa si sabes sostener un límite con calidez.',
          tip: 'No a la exigencia, sí a la necesidad: explica qué es posible y ofrece la alternativa con concreción.',
        },
        {
          question: '¿Cómo lleva un volumen alto de llamadas?',
          why: 'La rotación en el sector es alta; se busca una autoevaluación realista.',
          tip: 'Describe con honestidad cómo te recuperas entre llamadas y qué cadencia has sostenido de verdad.',
        },
        {
          question: '¿Cuál ha sido su escalado más difícil?',
          why: 'Se evalúa experiencia real, no teoría.',
          tip: 'Situación, tus pasos, resultado y qué cambiaste después.',
        },
        {
          question: '¿Cómo explica algo complejo a un cliente impaciente?',
          why: 'La claridad es la verdadera competencia técnica del área.',
          tip: 'Breve, sin jerga y con una comprobación de que ha quedado claro.',
        },
        {
          question: '¿Cómo sabe que ha tenido un buen día?',
          why: 'Muestra si trabajas con indicadores en la cabeza.',
          tip: 'Cita un indicador de calidad y otro de volumen, y por qué van juntos.',
        },
      ],
      redFlags: [
        'Ofrecer una solución en la simulación antes de haber escuchado.',
        'Hablar con desprecio de los clientes difíciles.',
        'Comprometerse con lo que no se podrá cumplir.',
      ],
      askThem: [
        '¿Cuántos contactos atiende aquí un agente al día?',
        '¿Cuánto dura la formación inicial y cómo se construye el conocimiento de producto?',
        '¿Cómo se mide el desempeño: por volumen, por calidad o por ambos?',
      ],
      faq: [
        {
          question: '¿Cómo funciona el role play?',
          answer:
            'Suelen ser cinco o diez minutos con una reclamación simulada. Se puntúan la escucha, la reformulación y la firmeza del compromiso — no que sepas la solución correcta.',
        },
        {
          question: '¿Puedo preguntar por los pluses de turno?',
          answer:
            'Sí, es completamente habitual en el sector y se responde con normalidad. Pregúntalo junto con la planificación de turnos y resolverás ambas cosas de una vez.',
        },
      ],
    },
  },

  electrician: {
    name: 'Electricista',
    application: {
      slug: 'electricista',
      metaTitle: 'Candidatura de electricista: carta, CV y certificaciones',
      metaDescription:
        'Candidatura de electricista: qué carnés y formación destacar, cómo nombrar tu especialidad, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de electricista',
      intro:
        'En el sector eléctrico las candidaturas se leen y se deciden rápido. Especialidad, carnés y carné de conducir van por delante de todo: una carta larga no compensa una acreditación que falta.',
      atsKeywords: [
        'Electricista',
        'Instalaciones eléctricas de baja tensión',
        'Mantenimiento industrial',
        'Automatización',
        'Montaje de cuadros eléctricos',
        'Programación de autómatas (Siemens S7)',
        'Reglamento electrotécnico (REBT)',
        'Prevención de riesgos eléctricos',
        'Localización de averías',
        'Mantenimiento preventivo',
        'Mediciones eléctricas',
        'Fotovoltaica',
      ],
      hardSkills: [
        {
          label: 'Nombra tu especialidad',
          detail:
            'Residencial, terciario, mantenimiento industrial o automatización: es el primer filtro que se aplica a tu perfil.',
        },
        {
          label: 'Carnés y acreditaciones',
          detail:
            'Carné de instalador en baja tensión (básica o especialista), formación de riesgo eléctrico según RD 614/2001, alta tensión — con fechas de validez.',
        },
        {
          label: 'Automatización',
          detail:
            'La experiencia en autómatas, sobre todo Siemens S7 / TIA Portal, es la mayor diferencia salarial en el ámbito industrial.',
        },
        {
          label: 'Carné de conducir y movilidad',
          detail:
            'En obra y en asistencia técnica el carné B es requisito de hecho. Si falta en el CV, se supone que no lo tienes.',
        },
      ],
      softSkills: [
        'Rigor en seguridad sin atajos',
        'Autonomía en obra',
        'Trato con el cliente en instalaciones ocupadas',
        'Registro limpio de las verificaciones',
        'Fiabilidad dentro del equipo',
      ],
      certifications: [
        'FP de Grado Medio en Instalaciones Eléctricas y Automáticas',
        'FP de Grado Superior en Sistemas Electrotécnicos y Automatizados',
        'Carné de instalador autorizado en baja tensión',
        'Formación en autómatas Siemens TIA Portal',
      ],
      cvFocus: [
        {
          label: 'Tipo de intervención',
          detail: 'Obra nueva, reforma, mantenimiento industrial o asistencia al cliente: días muy diferentes.',
        },
        {
          label: 'Instalaciones y fabricantes',
          detail: 'Cita tipos de instalación y autómatas concretos; las empresas buscan exactamente eso.',
        },
        {
          label: 'Adjunta las acreditaciones',
          detail: 'Titulación y carnés como anexo: sin ellos no se puede planificar tu incorporación a los trabajos.',
        },
      ],
      coverLetterOpener:
        'Desde hace seis años trabajo en mantenimiento en una planta alimentaria a tres turnos: localización de averías en líneas de envasado gobernadas por S7, verificaciones periódicas y modificaciones de cuadros.',
      mistakes: [
        {
          label: 'Escribir solo «electricista»',
          detail: 'Sin la especialidad, una empresa no puede valorar si encajas en el puesto.',
        },
        {
          label: 'Omitir los carnés',
          detail: 'Son el contenido más importante de la candidatura y fijan directamente tu categoría.',
        },
        {
          label: 'Una carta demasiado larga',
          detail:
            'En el sector se lee rápido. Media página con especialidad, experiencia y disponibilidad es más que suficiente.',
        },
      ],
      faq: [
        {
          question: '¿Hace falta carta de presentación en el sector?',
          answer:
            'Una versión breve sí: responde a por qué esa empresa y desde cuándo puedes incorporarte. Muchas deciden con el CV y los carnés, pero una candidatura sin carta parece enviada al azar.',
        },
        {
          question: '¿Puedo presentarme sin la titulación terminada?',
          answer:
            'Sí, como ayudante o peón, indicando tu experiencia y tu intención de completarla. Muchas empresas forman cuando la fiabilidad y el criterio de seguridad son visibles — cita tareas concretas para demostrarlo.',
        },
        {
          question: '¿Cuánto importa el carné de instalador?',
          answer:
            'Para firmar instalaciones, asumir responsabilidad y trabajar por cuenta propia es decisivo. Para puestos de ejecución y montaje pesan más las acreditaciones de seguridad y la experiencia con instalaciones.',
        },
      ],
    },
    interview: {
      slug: 'electricista',
      metaTitle: 'Entrevista de electricista: preguntas frecuentes y respuestas',
      metaDescription:
        'Entrevista en el sector eléctrico: seguridad, localización de averías y acreditaciones — qué se evalúa y qué preguntar a la empresa.',
      heading: 'Entrevista de trabajo para electricista',
      intro:
        'La entrevista suele conducirla directamente el responsable de obra o el propio empresario, y es corta y práctica. Se pregunta por las instalaciones que conoces, por tu método ante una avería y, sobre todo, por tu relación con las normas de seguridad bajo presión de plazos.',
      questions: [
        {
          question: '¿Cómo actúa ante una avería que no conoce?',
          why: 'La pregunta central: se busca acotación sistemática, no prueba y error.',
          tip: 'Recoger el síntoma, dejar la instalación en condiciones seguras, ir de la alimentación al receptor, medir en vez de suponer, registrar.',
        },
        {
          question: '¿Qué acreditaciones tiene?',
          why: 'Determina directamente la planificación y la categoría.',
          tip: 'Cita todas las vigentes con su fecha y lleva los certificados.',
        },
        {
          question: '¿Qué hace si le piden saltarse un paso de seguridad por el plazo?',
          why: 'La pregunta de actitud más importante del oficio.',
          tip: 'Sé tajante: las cinco reglas de oro no se negocian. Ofrece una alternativa en lugar de limitarte a negarte.',
        },
        {
          question: '¿Con qué autómatas ha trabajado?',
          why: 'Fija el tiempo de adaptación en un entorno industrial.',
          tip: 'Fabricante, gama y qué hacías realmente: leer, modificar o programar.',
        },
        {
          question: '¿Cómo trata con el cliente en su instalación?',
          why: 'En asistencia técnica el electricista es la cara de la empresa.',
          tip: 'Un ejemplo: explicar qué haces, cumplir la cita, dejar la zona limpia.',
        },
        {
          question: '¿Cómo documenta sus intervenciones?',
          why: 'Los certificados y actas tienen valor reglamentario.',
          tip: 'Describe con precisión qué registras y en qué sistema.',
        },
      ],
      redFlags: [
        'Dar a entender que la seguridad se negocia cuando la obra va con retraso.',
        'Declarar acreditaciones que no se pueden justificar.',
        'No preguntar nada sobre la planificación de trabajos o las guardias.',
      ],
      askThem: [
        '¿Cómo se reparte el trabajo entre obra, taller y asistencia al cliente?',
        '¿Hay guardias y cómo se retribuyen?',
        '¿Qué formación acompaña la empresa?',
      ],
      faq: [
        {
          question: '¿Debo llevar los certificados?',
          answer:
            'Sí — titulación, carnés y certificados de formación en riesgo eléctrico, en original o copia. Muchas empresas deciden en el momento y una acreditación que falta simplemente retrasa la oferta.',
        },
        {
          question: '¿Hay prueba práctica?',
          answer:
            'En algunas empresas sí, normalmente corta y en el taller: una medición, un esquema, una pequeña localización de avería. Se evalúan el método y el criterio de seguridad, no la velocidad.',
        },
      ],
    },
  },

  'warehouse-logistics': {
    name: 'Operario de logística',
    application: {
      slug: 'operario-de-logistica',
      metaTitle: 'Candidatura en logística: CV, carné de carretillero y sistemas',
      metaDescription:
        'Candidatura de operario de logística: qué carnés y sistemas citar, qué debe figurar en la carta, ejemplo de apertura y errores frecuentes.',
      heading: 'Cómo escribir una candidatura de operario de logística',
      intro:
        'En logística se decide rápido, a menudo en pocos días. Carné de carretillero, disponibilidad de turnos y el sistema de gestión de almacén utilizado son los tres datos que se buscan primero.',
      atsKeywords: [
        'Logística de almacén',
        'Preparación de pedidos',
        'Recepción de mercancía',
        'Expedición',
        'Inventario',
        'Carné de carretillero',
        'Carretilla contrapesada y retráctil',
        'Sistema de gestión de almacén (SGA)',
        'SAP EWM',
        'Control de stock',
        'Mercancías peligrosas (ADR)',
        'Paletizado y retractilado',
      ],
      hardSkills: [
        {
          label: 'Carnés y habilitaciones',
          detail:
            'Carné de carretillero según UNE 58451, transpaleta, retráctil, ADR — con fecha de validez. Sin ellos no se puede planificar tu incorporación.',
        },
        {
          label: 'Sistema de gestión de almacén',
          detail:
            'SAP EWM, Mecalux Easy WMS, terminales de radiofrecuencia, picking por voz: el dominio del sistema fija tu tiempo de adaptación.',
        },
        {
          label: 'El puesto dentro del almacén',
          detail:
            'Recepción, preparación, expedición o control de stock son perfiles distintos con exigencias distintas.',
        },
        {
          label: 'Cifras de rendimiento',
          detail: 'Líneas por hora, tasa de error, bultos por turno: los indicadores del sector.',
        },
      ],
      softSkills: [
        'Resistencia física en trabajo a turnos',
        'Rigor a alta cadencia',
        'Trabajo en equipo bajo presión de plazos',
        'Puntualidad y fiabilidad',
        'Atención a la seguridad',
      ],
      certifications: [
        'Certificado de profesionalidad en actividades auxiliares de almacén',
        'Carné de carretillero (UNE 58451)',
        'Formación ADR de mercancías peligrosas',
        'Formación en estiba y sujeción de cargas',
      ],
      cvFocus: [
        {
          label: 'Tipo y tamaño del almacén',
          detail:
            'Almacén de gran altura, cámara frigorífica, comercio electrónico o recambios: el ritmo y las exigencias cambian mucho.',
        },
        {
          label: 'Régimen de turnos',
          detail: 'Dos turnos, tres turnos, noche, fin de semana: suele ser el criterio decisivo.',
        },
        {
          label: 'Los carnés bien visibles',
          detail: 'Un bloque propio en la parte superior, no escondidos entre las experiencias.',
        },
      ],
      coverLetterOpener:
        'Desde hace cuatro años trabajo a tres turnos en una plataforma de distribución con unos 12.000 huecos de palé — preparación con terminal de radiofrecuencia en SAP EWM, carné de carretillero desde 2019 y formación en sujeción de cargas.',
      mistakes: [
        {
          label: 'Mencionar los carnés solo en el anexo',
          detail: 'Son el primer criterio de selección y deben aparecer en la primera página.',
        },
        {
          label: 'Dejar la disponibilidad de turnos sin concretar',
          detail: 'Cuando falta el dato se suele suponer indisponibilidad y la candidatura se descarta sola.',
        },
        {
          label: 'Resumirlo todo como «trabajo en almacén»',
          detail: 'Recepción y expedición son puestos distintos con indicadores distintos: diferéncialos.',
        },
      ],
      faq: [
        {
          question: '¿Puedo presentarme sin carné de carretillero?',
          answer:
            'Sí, y muchas empresas lo financian — indica expresamente que estás dispuesto a sacártelo. En puestos donde conducir es el núcleo del trabajo, en la práctica es un requisito.',
        },
        {
          question: '¿Qué nivel de español se espera?',
          answer:
            'El suficiente para seguir las instrucciones de seguridad y trabajar con el sistema, normalmente un nivel intermedio. Indica tu nivel con naturalidad: muchas plataformas son multilingües y valoran antes la fiabilidad que la fluidez.',
        },
        {
          question: '¿Perjudica haber trabajado por ETT?',
          answer:
            'No, en logística es la vía habitual hacia el contrato indefinido. Enumera las plataformas donde estuviste destinado: acreditan exactamente los sistemas y tipos de almacén que se buscan.',
        },
      ],
    },
    interview: {
      slug: 'operario-de-logistica',
      metaTitle: 'Entrevista en logística: preguntas frecuentes y respuestas',
      metaDescription:
        'Entrevista en almacén: turnos, precisión, seguridad y sistemas — qué se evalúa y qué preguntar.',
      heading: 'Entrevista de trabajo en logística',
      intro:
        'La entrevista suele ser corta y práctica, con el jefe de turno o el responsable de almacén. A menudo incluye una visita a la instalación — y esa visita forma parte de la evaluación, porque se observa en qué te fijas y qué preguntas.',
      questions: [
        {
          question: '¿Qué turnos puede cubrir?',
          why: 'En la práctica la pregunta más importante; a menudo decide por sí sola.',
          tip: 'Responde con claridad y honestidad. Poner ahora un límite es mejor que causar baja a las dos semanas.',
        },
        {
          question: '¿Cómo se asegura de preparar sin errores?',
          why: 'La tasa de error es el indicador de calidad central de cualquier plataforma.',
          tip: 'Cita una rutina concreta: escanear en lugar de comprobar a ojo, control en el puesto de embalaje, preguntar ante la duda.',
        },
        {
          question: '¿Qué hace si el stock no coincide con el sistema?',
          why: 'Se evalúa si informas o si corriges en silencio.',
          tip: 'Recontar, avisar, registrar la regularización en el sistema — nunca ajustar sin movimiento.',
        },
        {
          question: '¿Qué sistemas y equipos conoce?',
          why: 'Determina el tiempo de adaptación.',
          tip: 'Cita sistema, equipo y tarea — por ejemplo preparación con radiofrecuencia en SAP EWM.',
        },
        {
          question: '¿Cómo gestiona la presión antes del cierre de expediciones?',
          why: 'El punto de tensión diario del almacén.',
          tip: 'Priorizar, avisar pronto si va a ir justo y no recortar en seguridad.',
        },
        {
          question: '¿En qué se fija en materia de seguridad?',
          why: 'Los accidentes son la mayor partida de coste del sector.',
          tip: 'Cita cosas concretas: pasillos peatonales, sujeción de cargas, visibilidad al maniobrar, equipos de protección.',
        },
      ],
      redFlags: [
        'Aceptar turnos que después no se podrán sostener.',
        'Presentar un descuadre de stock como algo menor.',
        'Mostrarse indiferente durante la visita al almacén.',
      ],
      askThem: [
        '¿Cuál es el régimen de turnos y cómo se calculan los pluses?',
        '¿Qué indicadores se miden por persona?',
        '¿Cómo es la formación inicial y quién la acompaña?',
      ],
      faq: [
        {
          question: '¿Se comprueba el carné de carretillero en la entrevista?',
          answer:
            'Se verifica el certificado y algunas plataformas añaden una prueba corta de conducción. Llévalo siempre: sin acreditación no puedes conducir, por mucha experiencia que tengas.',
        },
        {
          question: '¿Cómo explico misiones cortas y seguidas por ETT?',
          answer:
            'Con naturalidad: las misiones las fija la empresa de trabajo temporal, no tú. Cita las plataformas y qué hacías en cada una — se lee como amplitud de experiencia, no como inestabilidad.',
        },
      ],
    },
  },
};
