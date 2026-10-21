# Cómo lideraría People en el plan AI first

> Acme está en un plan *AI first*: objetivos de adopción, herramientas, formación y rediseño de equipos. Este documento explica cómo lo llevaría desde People con el sistema de esta prueba. Todos los datos son ficticios y salen del cálculo (`npm run cobertura`), no de estimaciones.

## La idea en una frase

**El mismo mapa de skills que dice dónde somos frágiles dice qué funciones va a cambiar la IA y quién está preparado.** No hace falta un sistema aparte para el plan: hace falta medir tres skills más y marcar cada función con su impacto.

## Punto de partida (lo que el sistema ya mide)

- **Madurez IA por área** (media 0-4 de uso diario, automatización y criterio; hoja `madurez-ia`): Ingeniería 2,6 · Producto 2,4 · Seguridad 2,1 · Marketing 1,9 · Exchange y trading 1,6 · Custodia y Legal 1,3 · Compliance y Finanzas 1,2 · CX 1,0.
- **114 de 160 personas** ya usan IA a diario (nivel ≥ 2). Pero solo **18 saben automatizar** un proceso (nivel ≥ 3), **todas en Ingeniería**. Esa es la brecha: la adopción existe y la capacidad de rediseñar el trabajo está concentrada en un área.
- **Impacto IA por función** (`funciones.yaml`): 6 funciones con impacto alto, 13 medio y 5 bajo. Las de impacto alto son KYC (CMP-01), reporting AML (CMP-04), desarrollo de plataforma (ING-01), atención al cliente (CX-01), marketing (MKT-01) y gestión de personas (PEO-01).
- **El cruce que importa:** CX tiene **31 personas, madurez 1,0 y una función de impacto alto**. Compliance tiene **20 personas, madurez 1,2 y dos funciones de impacto alto**. Ahí está el plan, no en "formar a todo el mundo en IA".
- **18 personas han declarado interés** en aprender automatización: es la cantera para recualificar.

## Las cuatro palancas

### 1. Adopción

| | |
|---|---|
| **Qué mide el sistema** | Madurez IA por área, recalculada cada vez que un manager valida skills. Nunca se publica un grupo de menos de 5 personas. |
| **Qué decide una persona** | Dirección fija el objetivo por área (no uno igual para todas). People propone la línea base y el ritmo. |
| **30 días** | Validar con los managers las skills de IA de su equipo (hoy son un dato inicial). Publicar la línea base por área. |
| **60 días** | Objetivo pactado con cada responsable de área, empezando por CX y Compliance. |
| **90 días** | Segunda medición: ¿ha subido la madurez donde había impacto alto? |

### 2. Herramientas

| | |
|---|---|
| **Qué mide el sistema** | Nada todavía: es la palanca de gobierno. El sistema da el ejemplo de cómo se usa la IA (propone, no decide). |
| **Qué decide una persona** | Dirección, con Seguridad, Legal y People: catálogo de herramientas aprobadas y reglas de uso. |
| **Reglas mínimas** | 1) Qué datos pueden entrar en cada herramienta (nunca datos de clientes, KYC ni salariales en herramientas no aprobadas). 2) Siempre una persona revisa lo que la IA produce antes de que llegue a un cliente o al supervisor. 3) Ningún uso de IA decide sobre una persona: el AI Act europeo trata como de alto riesgo la IA en decisiones de empleo. |
| **30 / 60 / 90 días** | Catálogo y reglas publicados · formación de 3 semanas en criterio (FOR-22) para quien use IA con datos sensibles · revisión de usos reales y ampliación del catálogo. |

### 3. Formación

| | |
|---|---|
| **Qué mide el sistema** | Quién está a un nivel de distancia, quién tiene interés declarado y qué formación del catálogo cierra la brecha (FOR-19 a FOR-22). |
| **Qué decide una persona** | People prioriza; el manager valida el nivel al terminar. **Completar un curso no sube el nivel**: lo valida una persona. |
| **Criterio** | Formación dirigida por el mapa: primero las áreas con impacto alto y madurez baja (CX, Compliance), primero las personas con interés. Ingeniería, con las 18 personas que ya automatizan, pone los mentores (FOR-21, "diseñar un flujo con agentes junto a Ingeniería", coste 0). |
| **30 / 60 / 90 días** | Primera cohorte de CX y Compliance en FOR-19 y FOR-20 · mentoring con Ingeniería para quien supere FOR-20 · primeras validaciones y nueva medición. |

### 4. Estructura

| | |
|---|---|
| **Qué mide el sistema** | Una regla explícita: **función en rojo con impacto IA alto → rediseñar y recualificar, no formar un backup en el proceso actual.** Hoy aplica al reporting AML (CMP-04) y a gestión de personas (PEO-01). |
| **Qué decide una persona** | Dirección decide los cambios de estructura, con el criterio escrito. People diseña la recualificación y la comunicación. |
| **Ejemplo** | Si se va Lucía, el reporting AML se queda sin nadie. El sistema no propone contratar a otra analista para hacer el informe igual: propone rediseñarlo con automatización y recualificar a Marta, que tiene interés declarado. Formar a alguien en un proceso que va a desaparecer es invertir en el pasado. |
| **30 / 60 / 90 días** | Rediseño de una primera función como piloto (CMP-04) · lecciones aprendidas y siguiente función · criterio de rediseño aprobado por dirección para el resto. |

## Gobierno: lo que el plan no hace

- **`impacto_ia` describe funciones, no personas.** Una lista de funciones con impacto alto puede leerse como una lista de despidos. Por eso: solo la ven dirección y People, el mapa no señala a nadie para salir y la regla es **recualificación antes que reducción**.
- **Si hay reducción, la decide dirección con un criterio documentado** y se comunica con transparencia. No la decide un modelo ni la sugiere el sistema.
- **La IA no decide sobre personas** en ningún paso: propone y redacta. El riesgo, el semáforo y los candidatos salen de reglas que se pueden leer y comprobar (`definiciones/reglas-semaforo.md`, `npm run verificar`).

## Por qué esto lo puede llevar una persona

Medir la madurez de 160 personas, cruzarla con 24 funciones y actualizarla cada vez que alguien aprende algo o se va no se puede hacer a mano. El sistema lo hace solo. A People le queda lo que no se automatiza: pactar objetivos con cada área, decidir prioridades y hablar con las personas. Esta prueba se ha construido así: una persona más IA.
