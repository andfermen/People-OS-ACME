# People OS · Acme (prueba técnica)

> Contexto del proyecto para Claude Code. Léelo entero antes de cualquier tarea.

## 1. Qué es esto

Prueba técnica para un proceso de selección. El reto: **diseñar e implementar un sistema que permita a una sola persona gestionar el 360º de RRHH de una compañía apoyándose en IA y automatización.**

- Empresa de referencia: **Acme**, fintech cripto española regulada **ficticia**. Nombre, estructura y áreas son inventados. **Todos los datos (personas, skills, salarios, encuestas) son ficticios.** Nunca usar datos reales.
- Presentación: **viernes, en directo por Teams, al CEO.** Perfil técnico, pero evalúa criterio, pensamiento crítico, autonomía e **implementación real**.
- Lo que más pesa: **procesos funcionando de extremo a extremo.** No solo documentación.

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
| Cálculo | Cobertura, semáforo, key people: **determinista** | Fórmulas en Sheets o nodo de código del orquestador (decidir mié) |
| Ejecución | Flujos de captura, recálculo y avisos | Make **o** n8n (ver §9) |
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
├── docs/
│   ├── vision-procesos-rrhh.md   # Mapa 360º, qué se automatiza y qué no
│   ├── arquitectura.md           # Capas, flujo de datos, diagrama
│   ├── usos-mapa-cobertura.md    # Rotación, encuestas, revisión salarial  ← ya existe
│   ├── decisiones.md
│   ├── escalado.md               # Cómo se añade un proceso nuevo
│   └── guion-demo.md
├── definiciones/
│   ├── empresa.md                # Áreas, tamaño, contexto (ficticio)
│   ├── taxonomia-skills.yaml     # Skills hard/soft y descripción de niveles 1-4
│   ├── funciones.yaml            # Funciones por área, criticidad, skills requeridas, cobertura objetivo
│   ├── reglas-semaforo.md        # Cálculo de cobertura, semáforo y key people
│   ├── reglas-senales-rotacion.md
│   ├── catalogo-formacion.yaml
│   └── areas.yaml                # Área → división (agregación de encuestas)
├── calculo/
│   ├── cobertura.js              # Motor de referencia: semáforo, key people, candidatos, señales, escenarios
│   ├── verificar-casos.js        # `npm run verificar`: comprueba los casos de la demo
│   └── exportar-sheets.js        # `npm run sheets`: genera las hojas del Sheet en salidas/sheets/
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
    ├── make/
    └── n8n/
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
| 4 | Por cada función que empeora: candidatos a backup (nivel requerido −1, con interés), formación del catálogo, señales de rotación de las key people restantes | Regla |
| 5 | Propuesta priorizada: qué hacer, con quién, por qué y riesgo de no hacerlo (`prompts/proponer-acciones.md`) | IA |
| 6 | Email a dirección + fila en hoja `alertas` + mapa actualizado | Orquestador |
| 7 | People aprueba una acción (ej. plan de backup) en la hoja `alertas` | Humano |
| 8 | La aprobación marca `backup_en_desarrollo` → vuelve al paso 1 → la función pasa de rojo a ámbar | Ciclo |

Segundo disparador: el mismo flujo, programado mensualmente, genera el **informe de riesgo para dirección** (`prompts/informe-direccion.md`).

Hojas necesarias en el Sheet: `empleados`, `skills-empleados`, `funciones`, `cobertura` (calculada), `historico-semaforo`, `alertas` (con columna `decision`: pendiente/aprobada/descartada), `catalogo-formacion`.

### Captura (explicada, no construida)
Respuesta a "¿de dónde salen los datos?": el empleado describe en texto libre qué hace → Claude normaliza contra `taxonomia-skills.yaml` (skill, nivel propuesto, evidencia) → el manager valida. El prompt `prompts/normalizar-skills.md` queda en el repo con 2-3 ejemplos de entrada/salida. Ejemplo en directo solo si sobra tiempo el jueves.

### Salidas
1. **Mapa de calor** áreas × funciones con semáforo.
2. **Lista de key people** calculada.
3. **Plan de upskilling dirigido al riesgo**: para cada función en rojo/ámbar, personas a un nivel de distancia con interés + formación del catálogo.
4. **Movilidad interna** (antes proceso aparte): candidatos internos para una vacante, con el coste organizativo de moverlos (¿deja una función en rojo?).
5. **Usos de gestión** → `docs/usos-mapa-cobertura.md`.

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

### Datos necesarios
- `empleados.csv`: `id, nombre, email, area, rol, nivel_puesto, manager_id, antiguedad_meses, ultima_evaluacion (1-5), skills_interes, banda_id, salario_ficticio, meses_desde_ultima_revision, estado (activo/baja)` + `genero`, `meses_con_manager_actual` (D-06)
- `planes-backup.csv`: `plan_id, empleado_id, skill_id, nivel_objetivo, funcion_id, formacion_id, fecha_inicio, fecha_objetivo, estado, origen` (D-07)
- `skills-empleados.csv`: `empleado_id, skill_id, nivel_declarado, nivel_validado, validado_por, fecha`
- `bandas-salariales.csv`: `banda_id, minimo, medio, maximo` (compa-ratio = salario / medio)
- `encuesta-clima-agregada.csv`: resultados ya agregados por segmento, con `n` (nunca respuestas individuales)

Plantilla ficticia: 40-50 personas en todas las áreas (exchange/trading, custodia, compliance AML/KYC, legal/regulatorio, producto, ingeniería, seguridad, CX, finanzas, marketing, People).

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

## 9. Decisión pendiente: Make o n8n

Decidir **miércoles a mediodía** con una prueba de 1 hora:
- **n8n** (cloud, prueba gratuita): encaja con el enunciado; los workflows son JSON que Claude Code genera y versiona en el repo; tiene nodo de código para el cálculo del semáforo. Riesgo: herramienta nueva en directo.
- **Make** (plan de pago): Andrea lo domina; menos riesgo. El cálculo iría en fórmulas de Sheets.
- **Test:** Claude Code genera un workflow n8n mínimo (formulario → Claude normaliza skills → Sheet). Si funciona en ~1 h → n8n. Si no → Make.

## 10. Plan

- [ ] **Mar** · ~~Repo + este archivo~~ ✓. Cuenta Google nueva para la demo (pendiente Andrea).
- [x] **Mié AM** · `empresa.md`, taxonomía, funciones, reglas, datos ficticios con los casos de §6, prompts.
- [ ] **Mié mediodía** · Test n8n vs Make → `decisiones.md`.
- [ ] **Mié PM** · Cálculo de cobertura + semáforo + mapa de calor en el Sheet. Hoja `historico-semaforo` y `alertas`.
- [ ] **Jue AM** · Flujo principal pasos 1-8 en el orquestador. Escenario "baja" y cierre del ciclo (aprobar backup → rojo a ámbar).
- [ ] **Jue PM** · Vistas de rotación/encuesta/salarial. Prompt de captura con ejemplos. Ensayo, plan B (capturas + vídeo), `guion-demo.md`, `escalado.md`, README.
- [ ] **Vie** · Presentación.

## 11. Guion (borrador, 20-25 min)

1. El problema: RRHH 360º con una persona; qué se automatiza y qué no (2 min).
2. La pregunta del CEO: *¿dónde somos frágiles?* (2 min).
3. Arquitectura y principios (4 min).
4. El mapa: semáforo, key people ocultas, de dónde salen los datos (captura explicada) (4 min).
5. Demo "se va la responsable de custodia": recálculo → rojo → email con propuesta (4 min).
6. Cierre del ciclo: aprobar plan de backup → custodia pasa a ámbar (2 min).
7. Usos: rotación, encuestas, revisión salarial (4 min).
8. Escalado al resto del departamento, límites y decisiones (3 min).

## 12. Fuera de alcance

- Vista del empleado tipo carrera/roles (se explica como extensión).
- Candidatos externos, integraciones reales con HRIS/nómina.
- Modelos predictivos individuales de fuga.
- Producción: seguridad, permisos, RGPD completo (se mencionan, no se implementan).
