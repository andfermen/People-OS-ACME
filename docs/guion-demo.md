# Guion para enseñar la demo en n8n (25 min, si hay una sesión)

> **Para qué:** enseñar la demo en n8n en una sesión con el CEO, por ejemplo después de que haya visto el vídeo. El vídeo tiene su propio guion, más corto: `video/LEEME.md`.
> **Antes de empezar:** `npm run verificar` y `npm run probar-n8n` → todo en ✅. Abre el **panel** (escenario 0) y pulsa **Reiniciar la demo**. Ten abiertos el panel, el Sheet (hoja `cobertura`) y este guion: desde el panel se abren los formularios y se ven los emails en la bandeja. Montaje: `flujos/n8n/LEEME.md`.
> **Plan B (D-12):** si el orquestador falla, sigue en la terminal con el mismo flujo: `npm run demo -- reset` → `… baja E007` → `… aprobar ALR-002` (opción B) → `… aprobar ALR-003` (backup de Javier) → `… seguimiento +84` (el agente avisa a Marcos) → `… validar E009 gestion-claves 3 E008` → `… centinela +84` (informe para dirección). **Plan C:** el vídeo (`video/reproductor.html`).

| # | Bloque | Min | Qué enseñar | Frase clave |
|---|---|---|---|---|
| 1 | El problema | 2 | `docs/vision-procesos-rrhh.md`: qué se automatiza y qué no | "Automatizo lo calculable; la IA captura y redacta; yo decido y converso." |
| 2 | La pregunta | 1 | — | "Si mañana no viene una persona, ¿qué función queda descubierta? Y en un plan AI first: ¿qué funciones van a cambiar y quién está preparado?" |
| 3 | Arquitectura | 3 | Diagrama del README; abrir `funciones.yaml` y enseñar dónde cambiaría un objetivo (n8n lo vería tras `npm run n8n` y un commit) | "El riesgo se calcula, no se opina. Cambiar una regla es editar un archivo." |
| 4 | El mapa | 3 | Hoja `cobertura` y hoja `key-people` | Ver abajo |
| 5 | Demo: baja | 4 | Escenario 1 · formulario baja con E007 → el Sheet cambia → email a People | Ver abajo |
| 6 | Cierre del ciclo | 2 | En el email de People: aprobar la opción B y el backup de Javier → CUS-01 pasa a ámbar | "La IA propone; People decide; el sistema recalcula." |
| 7 | Automatizaciones y agente | 4 | Escenario 3 · seguimiento (+12 semanas) → Marcos valida a Javier → CUS-01 a verde · centinela e informe · escenario 4 · una pregunta al asistente | Ver abajo |
| 8 | Usos | 3 | Rotación, encuesta y revisión salarial | Ver abajo |
| 9 | Plan AI first y escalado | 2 | Hoja `madurez-ia`, escenario "se va Lucía", `docs/plan-ai-first-people.md`, `docs/escalado.md` | Ver abajo |
| 10 | Cierre | 1 | — | "Esta prueba la he construido como trabajaría el departamento: una persona + IA." |

## 4 · El mapa (estado inicial)

- 160 personas, 24 funciones: **4 en rojo, 3 en ámbar, 17 en verde.**
- **P1:** CUS-02 *Prueba de reservas*. Solo Elena Prieto (responsable de custodia) sabe hacerla.
- **Key person oculta:** Lucía Benítez, analista de datos **de Producto**, es la única que puede sacar el **reporting regulatorio AML de Compliance**. Nadie en Compliance la habría marcado. *"Este es el dato que no tenía nadie."*
- Ámbar con backup: CMP-03 *Comunicación de operaciones sospechosas*. Carmen tiene a Diego en un plan activo.
- Ámbar por debajo del objetivo: SEG-01 *Respuesta a incidentes*. Hay 2 personas y el objetivo es 3 por las guardias 24x7.
- Honestidad: PEO-01 *Gestión de personas* está en rojo, la propia función de People. *"Por eso todo está documentado en un repo y no en mi cabeza."*
- Captura de datos: enseñar `prompts/normalizar-skills.md`, ejemplo 2 (texto de Lucía). Ahí se ve que la captura **no** marca la dependencia; la descubre el cálculo.

## 5 · Demo: "se va la responsable de custodia"

1. Escenario 1 · **formulario baja** → `E007`. El flujo marca a Elena como `baja` en `empleados` (enseñarlo en el Sheet).
2. El flujo recalcula (unos segundos). Resultado esperado (comprobado con `npm run cobertura -- --baja E007`):
   - **CUS-01** *Gestión de claves*: 🟢 → 🔴 (cobertura 2 → 1). Marcos Fuentes pasa a ser **key person**.
   - **CUS-02** *Prueba de reservas*: 🔴 → 🔴 (cobertura 1 → 0).
   - CUS-03 baja de 8 a 7 pero sigue en verde: **no genera alerta**.
3. Llega un email a People. Arriba, el **resumen que vería dirección**; empieza por **la decisión de cubrir el puesto**, con dos opciones:
   - **A · Buscar fuera:** perfil calculado (gestión de claves 3, conciliación on-chain 3, liderazgo…), 2-3 meses.
   - **B · Mover a Marcos Fuentes:** cumple 3 de 5. Le falta conciliación on-chain (curso FOR-04; el mentoring ya no es posible porque lo daba Elena) y liderazgo. **Coste organizativo:** ya es la única persona que firma claves; asumir el puesto concentra todo el riesgo en él. *"El sistema no elige: pone el coste de cada opción encima de la mesa."*
   - Además: backup de Javier Lozano (★ con interés) y conversación de permanencia con Marcos.
4. Remarcar: el resumen para dirección **no incluye** señales individuales ni salarios: decide People. Abajo, en un bloque **solo People**, los botones *Aprobar* y la nota: si Marcos asume el puesto con su salario actual, su compa-ratio en la banda del puesto sería 0,76.

## 6 · Cierre del ciclo

1. En el email: **Aprobar ALR-002** (opción B, mover a Marcos). Se abre una página de confirmación. En `alertas`, ALR-002 `aprobada` y ALR-001 pasa sola a `descartada`. Marcos pasa a responsable de custodia, el equipo depende de él y se abre su plan de conciliación on-chain. El mapa no cambia de color: *"Promover a alguien no crea skills nuevas."*
2. **Aprobar ALR-003** (plan de backup de Javier) → fila nueva en `planes-backup` → recálculo → **CUS-01 pasa de 🔴 a 🟡** (lo dicen la página y un email).
3. CUS-02 sigue en rojo (cobertura 0: un backup no basta). *"El sistema no se engaña: sin nadie que lo sepa hacer hoy, sigue en rojo."*

## 7 · Automatizaciones y agente

Hasta aquí, todo empieza con un clic. *"Lo que una persona sola no puede hacer es acordarse de todo. Eso lo hacen dos automatizaciones que arrancan con el calendario. Y para preguntar, un agente."* Reglas: `definiciones/reglas-agentes.md` (D-21).

1. **Seguimiento de planes · "tres meses después".** En n8n arranca solo cada lunes. En la demo: formulario **Ejecutar ahora** → `seguimiento`, cuándo = `+12 semanas`. Llegan dos avisos sin que People haga nada: a Marcos por el plan de Javier, y a Sergio (CEO de Acme) por el de Marcos. En `planes-backup`, `avisos = 1`.
2. En el aviso a Marcos → **Validar a Javier**: el formulario del escenario 2 llega rellenado (`E009`, `gestion-claves`, `3`, `E008`). Enviar → email *Riesgo reducido*: **CUS-01 pasa de 🟡 a 🟢**. *"Completar un curso no es tener la skill: el agente pregunta, la valida una persona."*
3. *(Si hay tiempo)* Mismo formulario con `+13` y `+14 semanas`: la automatización recuerda a Sergio y luego escala a People (alerta `ALR-005`). *"No cierra ni cambia el plan. Su trabajo es que nada se quede olvidado."*
4. **Centinela.** En n8n arranca el día 1 de cada mes. En la demo: `centinela`, `+14 semanas`. Email *Revisión … · informe para dirección*: arriba, el informe listo para reenviar (CUS-02 sigue sin nadie, la conversación de permanencia con Marcos sin decidir, validaciones de skills de más de 6 meses); abajo, solo People, las señales de rotación. *"A dirección le llega lo organizativo; lo personal se queda en People."*
5. **Asistente (el agente).** Desde el panel: *"¿Qué pasa si se va Carmen?"*. Claude decide buscarla, simular su baja y mirar candidatos; responde con esas cifras y la página enseña qué ha consultado. *"Aquí sí razona el modelo: decide qué consultar. Pero las cifras las pone el motor, y solo lee."* Si hay tiempo, una pregunta trampa: *"¿Cuánto cobra Marcos?"* → se niega.

## 8 · Usos

- **Rotación:** Elena tenía 4 señales (compa-ratio 0,86, 22 meses sin revisión, clima de Custodia por debajo de la media, evaluación 5) y estaba en un rojo crítico. Era **prioridad 1** de la matriz *antes* de irse. *"El sistema lo habría avisado."*
- **Encuesta:** las key people puntúan **2,6 en carga sostenible frente a 3,3** del resto (n = 5, en el límite del anonimato). Custodia es el área con peor clima (3,2 frente a 3,7 de media). People (n = 1) no se muestra sola y se agrega a Corporativo.
- **Revisión salarial:** para una key person con compa-ratio bajo, **bono de retención ligado a formar y validar a su backup**, no una subida que premie ser imprescindible.

## 9 · Plan AI first: el mismo mapa, otra pregunta

- **Madurez IA por área** (hoja `madurez-ia`): Ingeniería 2,6 y Producto 2,4 frente a Compliance 1,2 y CX 1,0 (media 0-4 de uso diario, automatización y criterio). *"La formación en IA no es igual para todos: empieza donde la madurez es baja y el impacto alto."*
- **Escenario "se va Lucía"** (`npm run demo -- baja E022`): el reporting AML (CMP-04) pasa de cobertura 1 a 0. Como su `impacto_ia` es alto, la propuesta **no** es formar a alguien en SQL para seguir haciendo el informe a mano: es **rediseñar el reporting con IA y recualificar a Marta** (con interés declarado en automatización), con apoyo temporal mientras tanto. *"Formar a alguien en un proceso que va a desaparecer es invertir en el pasado."*
- Contraste: en custodia (impacto bajo) la propuesta sigue siendo un backup. **La regla decide cuál de las dos**, no la IA.
- Cautela: la vista de `impacto_ia` solo la ven dirección y People. No es una lista de despidos: recualificación antes que reducción.

## Preguntas probables

| Pregunta | Respuesta corta |
|---|---|
| ¿Y si las skills están mal? | Solo cuentan las validadas por el manager. Revisión semestral, y el centinela marca cada mes las validaciones de más de 6 meses. Es el límite número 1 del sistema. |
| ¿La IA decide algo? | Sobre personas, no. Redacta, y en el asistente decide qué consultar. El riesgo es una regla y las acciones las aprueba People. |
| ¿Qué hace el sistema solo? | Vigilar, recordar, escalar e informar: el seguimiento de planes y el centinela. Son automatizaciones: deciden **cuándo** actuar con reglas; no suben niveles ni cierran planes. |
| ¿Y si el manager no responde? | El seguimiento le recuerda a los 7 días y, tras 2 avisos, abre una alerta para People. Si el manager ya no está, escala directamente. |
| ¿Dónde están los agentes? | Uno, el asistente: Claude razona con herramientas del motor. El resto son automatizaciones con reglas, a propósito: lo que fija riesgos o prioridades tiene que poder auditarse y repetirse (AI Act). El modelo razona solo donde no se decide nada sobre nadie. |
| ¿Por qué no un modelo de predicción de fuga? | Por ética, por el AI Act y por los datos: con 160 personas y pocas salidas al año no hay muestra. Las señales llevan a una conversación, no a una etiqueta. |
| ¿Escala? | Las definiciones sí. Sheets llega hasta ~200 personas; después, base de datos o HRIS. |
