# People OS · Acme (prueba técnica)

> Contexto del proyecto para Claude Code. Léelo entero antes de cualquier tarea.

## 1. Qué es esto

Prueba técnica para un proceso de selección. El reto: **diseñar e implementar un sistema RRHH de una compañía apoyándose en IA y automatización.**

- Empresa: **Acme**, ficticia, inspirada en una fintech cripto española regulada. Estructura y áreas basadas en información pública de esa empresa; nombre, personas y datos inventados. **Todos los datos (personas, skills, salarios, encuestas) son ficticios.** En todo el repo la empresa se llama Acme. **La empresa real de referencia no se nombra en ningún archivo del repo** (es público).
- Contexto clave del CEO: la compañía (~160 personas) está en un **plan "AI first"**: objetivos de adopción, herramientas, formación y rediseño/reducción de equipos. **El rol al que opta Andrea es liderar People en esa transformación.** Por tanto la prueba no es solo "un sistema de RRHH": es la evidencia de cómo lideraría People en un plan AI first. El mapa de skills es el instrumento de ese plan (ver §6 "Lente AI first" y `docs/plan-ai-first-people.md`).
- Argumento meta: esta prueba se ha construido como trabajaría el departamento, **una persona + IA** (Claude Code, orquestador, API de Claude).
- Presentación: **en directo por Teams, al CEO.** Perfil técnico, pero evalúa criterio, pensamiento crítico, autonomía e **implementación real**.
- Lo que más pesa: **procesos funcionando de extremo a extremo.** No solo documentación.
- Cuenta Google de la demo: **Gmail personal de Andrea** (Sheets, Drive, Gmail y conexiones del orquestador). **No escribir esa dirección en el repo**: en archivos y flujos usar la variable `EMAIL_DEMO`. Todo lo de la demo vive en la carpeta de Drive `Acme People OS` y los emails salen con el prefijo `[Acme People OS]` en el asunto. Nunca guardar contraseñas ni claves de API en el repo.

## 2. Quién trabaja aquí y cómo

- **Andrea**: consultora de RRHH y organización. **No es desarrolladora.** Diseña, decide y presenta.
- **Claude Code**: genera datos, definiciones, prompts, flujos, cálculos y documentación.

Reglas de trabajo:
1. Antes de crear o cambiar algo relevante, explica en 2-3 líneas qué vas a hacer y por qué.
2. Pasos ejecutables y numerados cuando Andrea tenga que hacer algo fuera del repo (Make/n8n, Google, Telegram).
3. Nada que Andrea no pueda explicar y defender en directo. Simple > sofisticado.
4. Si algo es frágil para una demo en vivo, dilo y propón alternativa.
5. Todo en español. Commits pequeños y descriptivos.
6. Cada decisión relevante se registra en `docs/decisiones.md` (qué, alternativas, por qué).

## 3. Principio de arquitectura

**Separar QUÉ se hace (definiciones y reglas) de QUIÉN lo ejecuta (orquestador).** Cambiar un umbral del semáforo o la criticidad de una función = editar un archivo del repo, no rehacer un flujo.

| Capa | Qué contiene | Dónde |
|---|---|---|
| Definiciones | Taxonomía de skills, funciones y criticidad, reglas del semáforo, prompts | Este repo (`/definiciones`, `/prompts`) |
| Datos | Empleados, skills por persona, encuesta (agregada), bandas salariales | Google Sheets (fuente: CSV en `/datos`) |
| Cálculo | Cobertura, semáforo, key people: **determinista** | Nodo de código de n8n con la lógica de `calculo/cobertura.js` (D-04) |
| Ejecución | Flujos de captura, recálculo y avisos | n8n (ver §9) |
| Inteligencia | Normalizar skills desde texto libre, proponer acciones, redactar informes | API de Claude |
| Visualización | Mapa de calor y vistas de uso | Sheet con formato condicional → dashboard si hay tiempo |

Principios de diseño (argumentos para el CEO):
- **El riesgo se calcula, no se opina.** Cobertura, semáforo y key people salen de reglas explícitas. La IA captura datos y propone acciones; no decide el riesgo.
- **Key person se deduce, no se declara.** El sistema descubre dependencias que nadie había marcado.
- **Humano en el bucle.** El manager valida skills; People decide acciones. Requisito ético y regulatorio (el AI Act europeo trata la IA aplicada a decisiones de empleo como de alto riesgo).
- **Quién ve qué:** el empleado ve su perfil; el manager, su equipo; dirección y People, el agregado y el mapa completo. Nunca se comunica a un manager una "probabilidad de fuga" individual.
- **Un único registro de personas** para todos los procesos.

## 4. Estructura del repo

```
/
├── CLAUDE.md
├── README.md
├── .claude/agents/auditor-demo.md  # Agente de Claude Code: audita la demo antes de cada ensayo
├── agentes/                      # Fichas de los agentes (seguimiento y centinela, construidos; auditor de la demo; asistente y auditor de procesos, diseño)
├── docs/
│   ├── vision-procesos-rrhh.md   # Mapa 360º, qué se automatiza y qué no
│   ├── arquitectura.md           # Capas, flujo de datos, diagrama
│   ├── usos-mapa-cobertura.md    # Rotación, encuestas, revisión salarial  ← ya existe
│   ├── plan-ai-first-people.md   # Cómo lideraría People en el plan AI first (adopción, herramientas, formación, estructura)
│   ├── decisiones.md
│   ├── escalado.md               # Cómo se añade un proceso nuevo
│   └── guion-demo.md
├── definiciones/
│   ├── empresa.md                # Acme: áreas, tamaño, contexto (ficticio, inspirado en una fintech cripto española regulada)
│   ├── taxonomia-skills.yaml     # Skills hard/soft y descripción de niveles 1-4
│   ├── funciones.yaml            # Funciones por área, criticidad, skills requeridas, cobertura objetivo
│   ├── reglas-semaforo.md        # Cálculo de cobertura, semáforo y key people
│   ├── reglas-senales-rotacion.md
│   ├── reglas-agentes.md         # Cuándo actúan solos el seguimiento de planes y el centinela (D-21)
│   ├── catalogo-formacion.yaml
│   └── areas.yaml                # Área → división (agregación de encuestas)
├── calculo/
│   ├── cobertura.js              # Motor de referencia: semáforo, key people, candidatos, señales, escenarios
│   ├── demo.js                   # `npm run demo`: flujo 1-8 + opcional en local (plan B, D-12)
│   ├── verificar-casos.js        # `npm run verificar`: comprueba los casos de la demo
│   ├── exportar-sheets.js        # `npm run sheets`: genera las hojas del Sheet en salidas/sheets/
│   ├── generar-plantilla.js      # `npm run plantilla`: amplía la plantilla a 160 sin tocar los casos (D-13)
│   ├── cifras.js                 # `npm run cifras`: cifras que citan guion y plan (las usa el auditor)
│   ├── propuesta.js              # Propuesta por reglas, opciones de vacante y mensaje para Claude (demo y n8n)
│   ├── hojas.js                  # Filas de las hojas calculadas (export y n8n)
│   ├── agentes.js                # Agentes autónomos: seguimiento de planes y centinela (D-21)
│   ├── exportar-n8n.js           # `npm run n8n`: genera los 3 escenarios de n8n y salidas/n8n/definiciones.json (D-16, D-18, D-19, D-21)
│   └── exportar-video.js         # `npm run video`: datos del reproductor del vídeo desde el motor (D-20)
├── video/                        # Reproductor de la demo para grabar el vídeo + guion de locución (D-20)
├── salidas/sheets/               # CSV listos para importar + LEEME.md con los pasos
├── prompts/
│   ├── normalizar-skills.md      # Texto libre → taxonomía con nivel propuesto y evidencia
│   ├── proponer-acciones.md      # Rojo/ámbar → formar, mover, contratar
│   └── informe-direccion.md
├── datos/
│   ├── empleados.csv
│   ├── skills-empleados.csv
│   ├── bandas-salariales.csv
│   ├── planes-backup.csv         # Backups en desarrollo (lo escribe la aprobación del paso 8)
│   └── encuesta-clima-agregada.csv
└── flujos/
    └── n8n/
        ├── LEEME.md              # Montaje y ensayo del flujo principal
        ├── E1-baja-de-elena.json         # Escenario 1: baja + aprobar desde el email (generado)
        ├── E2-actualizacion-de-skill.json  # Escenario 2: el manager valida una skill, ámbar → verde (generado)
        ├── E3-agentes-autonomos.json  # Escenario 3: seguimiento de planes (lunes) y centinela (mensual) (generado, D-21)
        ├── src/                  # Código de los nodos + probar.js (`npm run probar-n8n`)
        └── test-captura-skills.json  # Prueba de captura (D-04)
```

## 5. Proceso central · Mapa de skills y cobertura de funciones

Referencia de inspiración: la herramienta Opportunity de BBVA (vista del empleado: carrera y upskilling). **Nuestro enfoque añade la vista de organización: cobertura, dependencia y riesgo.** Mismo mapa, dos caras; construimos la de organización y presentamos la del empleado como extensión.

**Decisión: la demo se centra en el riesgo.** Los perfiles de skills se precargan ya validados. La captura no se construye como flujo (ver "Captura" abajo).

### Flujo principal · Riesgo de cobertura (extremo a extremo)

| # | Paso | Tipo |
|---|---|---|
| 1 | Cambio en la plantilla: baja, cambio de rol o plan de backup aprobado | Disparo |
| 2 | Recalcula cobertura, semáforo y key people | Regla |
| 3 | Compara con la foto anterior (`historico-semaforo`) y detecta funciones que empeoran o mejoran | Regla |
| 4 | Por cada función que empeora: candidatos a backup (nivel requerido −1, con interés), formación del catálogo, señales de rotación de las key people restantes. Si es una baja: perfil del puesto y candidatos internos con brechas y coste organizativo (D-15) | Regla |
| 5 | Propuesta priorizada: qué hacer, con quién, por qué y riesgo de no hacerlo (`prompts/proponer-acciones.md`) | IA |
| 6 | Email a dirección + fila en hoja `alertas` + mapa actualizado | Orquestador |
| 7 | People aprueba una acción en la hoja `alertas` (ej. opción A buscar fuera o B mover a Marcos; plan de backup de Javier) | Humano |
| 8 | La aprobación marca `backup_en_desarrollo` → vuelve al paso 1 → la función pasa de rojo a ámbar | Ciclo |

Segundo disparador: el mismo flujo, programado mensualmente, genera el **informe de riesgo para dirección** (`prompts/informe-direccion.md`).

Hojas necesarias en el Sheet: `empleados`, `skills-empleados`, `funciones`, `cobertura` (calculada), `historico-semaforo`, `alertas` (con columna `decision`: pendiente/aprobada/descartada), `catalogo-formacion`.

### Escenario 2 de n8n · Nueva skill adquirida (D-18)
Cierra la historia de la demo: rojo → ámbar → **verde**. Misma lógica del flujo principal, otro disparador.
1. El backup en desarrollo completa la formación (cambio en hoja `formacion` o texto libre del empleado).
2. El sistema **propone** el nuevo nivel (si es texto libre: `prompts/normalizar-skills.md`). Nunca sube el nivel automáticamente: completar un curso no equivale a tener la skill.
3. El manager valida en `skills-empleados` (`nivel_validado`, `validado_por`).
4. Vuelve al paso 2 del flujo principal → la función pasa a verde → email de cierre a dirección.

Dato de demo necesario: la persona elegida como backup de custodia con nivel requerido −1, interés declarado y una formación del catálogo asociada. **En los datos:** Javier Lozano (E009), `gestion-claves` nivel 2 (requerido 3), interés declarado, formación `FOR-01` (mentoring, 12 semanas).

### Escenario 3 de n8n · Agentes autónomos (D-21)
Agentes que actúan **sin que nadie pulse nada**, con reglas en `definiciones/reglas-agentes.md` y lógica en `calculo/agentes.js`. Actúan solos en lo operativo y nunca deciden sobre una persona.
- **Seguimiento de planes** (cada lunes): plan que llega a su fecha → email al manager con el formulario del escenario 2 rellenado → recordatorio a los 7 días → tras 2 avisos, alerta para People. Estado en `planes-backup` (`avisos`, `ultimo_aviso`).
- **Centinela** (día 1 de cada mes): recalcula, detecta funciones frágiles y desde cuándo, validaciones de más de 6 meses y decisiones pendientes → informe para dirección (Claude, `prompts/informe-direccion.md`; por reglas si falla) + bloque solo People.
- Formulario **Ejecutar un agente ahora** con fecha simulada para la demo.

### Captura (explicada, no construida)
Respuesta a "¿de dónde salen los datos?": el empleado describe en texto libre qué hace → Claude normaliza contra `taxonomia-skills.yaml` (skill, nivel propuesto, evidencia) → el manager valida. El prompt `prompts/normalizar-skills.md` queda en el repo con 2-3 ejemplos de entrada/salida. Ejemplo en directo solo si sobra tiempo el jueves.

### Salidas
1. **Mapa de calor** áreas × funciones con semáforo.
2. **Lista de key people** calculada.
3. **Plan de upskilling dirigido al riesgo**: para cada función en rojo/ámbar, personas a un nivel de distancia con interés + formación del catálogo.
4. **Movilidad interna** (antes proceso aparte): candidatos internos para una vacante, con el coste organizativo de moverlos (¿deja una función en rojo?).
5. **Usos de gestión** → `docs/usos-mapa-cobertura.md`.
6. **Madurez IA por área**: nivel medio de las skills de IA por área, para priorizar el plan AI first de formación.

## 6. Semáforo de cobertura (definición de referencia, editable en `reglas-semaforo.md`)

- **Niveles de skill:** 1 básico · 2 autónomo · 3 avanzado · 4 referente.
- **Cobertura de una skill en una función** = nº de personas activas con nivel validado ≥ nivel mínimo requerido.
- **Cobertura de la función** = la menor de sus skills requeridas (eslabón más débil).
- **Criticidad de la función:** crítica / importante / soporte (en `funciones.yaml`).

| Semáforo | Regla |
|---|---|
| 🟢 Verde | Cobertura ≥ objetivo (por defecto 2) |
| 🟡 Ámbar | Cobertura = 1 **con** backup en desarrollo (alguien a 1 nivel con plan activo), o cobertura por debajo del objetivo pero ≥ 2 |
| 🔴 Rojo | Cobertura 0, o cobertura 1 **sin** backup en desarrollo |

- **Key person** = persona que es la única cobertura de una skill requerida en una función crítica o importante.
- **Prioridad** = semáforo × criticidad. Rojo en función crítica = prioridad 1.

### Lente AI first (cambios mínimos, mismo modelo)
1. **Skills de IA transversales en la taxonomía** (2-3, con niveles 1-4): uso de IA en el trabajo diario, automatización/agentes, criterio y verificación de resultados de IA. Así el mismo mapa mide la **madurez IA por área**.
2. **Campo `impacto_ia` en `funciones.yaml`** (alto/medio/bajo): cuánto va a transformar la IA esa función.
3. **Regla de decisión:** en una función roja con `impacto_ia` alto, la propuesta no es formar un backup en la forma actual de hacer el trabajo, sino **rediseñar la función con IA y recualificar**. Formar a alguien en un proceso que va a desaparecer es invertir en el pasado.
4. **Caso de demo:** al menos una función roja con `impacto_ia` alto, para que la propuesta de la IA sea distinta a la de custodia.
5. **Cautela de gobierno:** una lista de funciones con impacto IA alto puede leerse como "lista de despidos". El mapa no señala personas para salir: prioriza recualificación antes que reducción, se comunica con transparencia y las decisiones de estructura son de dirección con criterio documentado. Vista de `impacto_ia` solo para dirección y People.

### `docs/plan-ai-first-people.md` (contenido esperado, breve)
Cuatro palancas, cada una con qué mide el sistema, qué decide una persona y un horizonte 30/60/90 días:
- **Adopción:** madurez IA por área como línea base y objetivos por área.
- **Herramientas:** catálogo de herramientas aprobadas y reglas de uso (datos, privacidad, AI Act).
- **Formación:** upskilling dirigido por el mapa (riesgo + madurez IA), no formación genérica para todos.
- **Estructura:** rediseño de funciones con `impacto_ia` alto; recualificación antes que reducción; gestión del cambio y comunicación.

### Datos necesarios
- `empleados.csv`: `id, nombre, email, area, rol, nivel_puesto, manager_id, antiguedad_meses, ultima_evaluacion (1-5), skills_interes, banda_id, salario_ficticio, meses_desde_ultima_revision, estado (activo/baja)` + `genero`, `meses_con_manager_actual` (D-06)
- `planes-backup.csv`: `plan_id, empleado_id, skill_id, nivel_objetivo, funcion_id, formacion_id, fecha_inicio, fecha_objetivo, estado, origen` (D-07)
- `skills-empleados.csv`: `empleado_id, skill_id, nivel_declarado, nivel_validado, validado_por, fecha`
- `bandas-salariales.csv`: `banda_id, minimo, medio, maximo` (compa-ratio = salario / medio)
- `encuesta-clima-agregada.csv`: resultados ya agregados por segmento, con `n` (nunca respuestas individuales)

Plantilla ficticia: **~160 personas**, como la compañía real, para que el CEO reconozca su escala (también hace realista el umbral de anonimato n ≥ 5). Los casos de demo se construyen a mano (E001-E046); el resto se genera con `npm run plantilla`, con topes de nivel para no alterar los casos (D-13). Áreas: exchange/trading, custodia, compliance AML/KYC, legal/regulatorio, producto, ingeniería, seguridad, CX, finanzas, marketing, People.

Casos que **deben existir** para la demo:
- Función crítica en rojo con key person evidente (ej. custodia).
- Función en ámbar con backup en desarrollo.
- Key person **oculta**: nadie la marcaría, el cálculo la descubre.
- Key person en rojo con compa-ratio < 0,9 y +18 meses sin revisión (caso de retención).
- Persona a un nivel de distancia con interés declarado (candidata a upskilling).
- **Escenario "baja"**: simular la salida de una persona y ver cómo cambia el mapa en directo.

## 7. Usos de gestión del mapa

Documentados en `docs/usos-mapa-cobertura.md`: riesgo de rotación no deseada en áreas críticas, segmentación de encuestas y revisión salarial. Al construir datos y vistas, respetar las reglas de ese documento (anonimato n ≥ 5, sin scoring individual de fuga, criterios retributivos objetivos).

## 8. Proceso 2 · Onboarding (secundario, pendiente de confirmar)

Solo si el proceso central está cerrado el jueves a mediodía. Versión mínima: alta → plan por rol + email día 0. Conexión con el mapa: la persona nueva entra en el Flujo A desde el día 1. El asistente Q&A sobre Oráculo (Telegram) queda como extensión.

## 9. Orquestador: n8n (decidido, D-04)

La prueba de captura (formulario → Claude → `captura-pendiente`) funcionó a la primera. Contexto de la decisión:
- **n8n** (cloud, prueba gratuita): encaja con el enunciado; los workflows son JSON que Claude Code genera y versiona en el repo; tiene nodo de código para el cálculo del semáforo. Riesgo: herramienta nueva en directo.
- **Make** (plan de pago): Andrea lo domina; menos riesgo. El cálculo iría en fórmulas de Sheets.
- **Test:** Claude Code genera un workflow n8n mínimo (formulario → Claude normaliza skills → Sheet). Si funciona en ~1 h → n8n. Si no → Make.

## 10. Plan

- [x] **Mar** · Repo + este archivo. Cuenta Google para la demo.
- [x] **Mié AM** · `empresa.md`, taxonomía, funciones, reglas, datos ficticios con los casos de §6, prompts.
- [x] **Mié** · Lente AI first: skills de IA en la taxonomía, `impacto_ia` en funciones, caso rojo con impacto alto (CMP-04), plantilla a 160 personas, `empresa.md` con la empresa de referencia (D-13, D-14).
- [x] **Mié mediodía** · Test n8n vs Make → **n8n** (D-04).
- [x] **Mié PM** · Cálculo de cobertura + semáforo + mapa de calor en el Sheet. Hoja `historico-semaforo` y `alertas`.
- [ ] **Jue AM** · Flujo principal pasos 1-8 en el orquestador (generado y probado: `flujos/n8n/`, D-16; falta montarlo en n8n y ensayar). Escenario "baja" y cierre del ciclo (aprobar backup → rojo a ámbar).
- [ ] **Jue PM** · Vistas de rotación/encuesta/salarial y madurez IA. ~~`plan-ai-first-people.md`~~ ✓. Prompt de captura con ejemplos. Ensayo, plan B (capturas + vídeo), `guion-demo.md`, `escalado.md`, README.
- [ ] **Vie** · Presentación.

## 11. Guion (borrador, 20-25 min)

1. El problema: RRHH 360º con una persona; qué se automatiza y qué no (2 min).
2. La pregunta del CEO: *¿dónde somos frágiles?* Y en un plan AI first, también: *¿qué funciones van a cambiar y quién está preparado?* (2 min).
3. Arquitectura y principios (4 min).
4. El mapa: semáforo, key people ocultas, de dónde salen los datos (captura explicada) (4 min).
5. Demo "se va la responsable de custodia": recálculo → rojo → email con propuesta (4 min).
6. Cierre del ciclo: aprobar plan de backup → custodia pasa a ámbar (2 min). Opcional: "tres meses después", el backup completa la formación, el manager valida → verde.
7. Usos: rotación, encuestas, revisión salarial (4 min).
8. Cómo lo usaría para liderar el plan AI first (adopción, herramientas, formación, estructura) y cómo escala al resto de People (3 min).
9. Cierre: "esta prueba la he construido como trabajaría el departamento: una persona + IA" (1 min).

## 12. Fuera de alcance

- Vista del empleado tipo carrera/roles (se explica como extensión).
- Candidatos externos, integraciones reales con HRIS/nómina.
- Modelos predictivos individuales de fuga.
- Producción: seguridad, permisos, RGPD completo (se mencionan, no se implementan).
