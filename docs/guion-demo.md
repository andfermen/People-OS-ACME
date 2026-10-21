# Guion de la demo (borrador, 20-25 min)

> Antes de empezar: `npm run verificar` → todos los casos en ✅. Ten abiertos el Sheet (hoja `cobertura`), el orquestador, el buzón de dirección y este guion.
> **Plan B (D-12):** si el orquestador falla, sigue en la terminal con el mismo flujo: `npm run demo -- reset` → `npm run demo -- baja E007` → `npm run demo -- aprobar ALR-001` → (opcional) `npm run demo -- validar E009 gestion-claves 3 E008`. Plan C: capturas y vídeo grabados el jueves.

| # | Bloque | Min | Qué enseñar | Frase clave |
|---|---|---|---|---|
| 1 | El problema | 2 | `docs/vision-procesos-rrhh.md`: qué se automatiza y qué no | "Automatizo lo calculable; la IA captura y redacta; yo decido y converso." |
| 2 | La pregunta | 2 | — | "Si mañana no viene una persona, ¿qué función queda descubierta?" |
| 3 | Arquitectura | 4 | Diagrama de `docs/arquitectura.md`; abrir `funciones.yaml` y cambiar un objetivo | "El riesgo se calcula, no se opina. Cambiar una regla es editar un archivo." |
| 4 | El mapa | 4 | Hoja `cobertura` y hoja `key-people` | Ver abajo |
| 5 | Demo: baja | 4 | Marcar a Elena (E007) como `baja` → flujo → email | Ver abajo |
| 6 | Cierre del ciclo | 2 | Aprobar la alerta del backup de Javier → CUS-01 pasa a ámbar | "La IA propone; People decide; el sistema recalcula." |
| 7 | Usos | 4 | Rotación, encuesta y revisión salarial | Ver abajo |
| 8 | Escalado y límites | 3 | `docs/escalado.md`, `docs/decisiones.md` | "Mide dependencia de skills, no de relaciones." |

## 4 · El mapa (estado inicial)

- 24 funciones: **4 en rojo, 3 en ámbar, 17 en verde.**
- **P1:** CUS-02 *Prueba de reservas*. Solo Elena Prieto (responsable de custodia) sabe hacerla.
- **Key person oculta:** Lucía Benítez, analista de datos **de Producto**, es la única que puede sacar el **reporting regulatorio AML de Compliance**. Nadie en Compliance la habría marcado. *"Este es el dato que no tenía nadie."*
- Ámbar con backup: CMP-03 *Comunicación de operaciones sospechosas*. Carmen tiene a Diego en un plan activo.
- Ámbar por debajo del objetivo: SEG-01 *Respuesta a incidentes*. Hay 2 personas y el objetivo es 3 por las guardias 24x7.
- Honestidad: PEO-01 *Gestión de personas* está en rojo, la propia función de People. *"Por eso todo está documentado en un repo y no en mi cabeza."*
- Captura de datos: enseñar `prompts/normalizar-skills.md`, ejemplo 2 (texto de Lucía). Ahí se ve que la captura **no** marca la dependencia; la descubre el cálculo.

## 5 · Demo: "se va la responsable de custodia"

1. En `empleados`, Elena (E007) → `estado = baja`.
2. El flujo recalcula. Resultado esperado (comprobado con `npm run cobertura -- --baja E007`):
   - **CUS-01** *Gestión de claves*: 🟢 → 🔴 (cobertura 2 → 1). Marcos Fuentes pasa a ser **key person**.
   - **CUS-02** *Prueba de reservas*: 🔴 → 🔴 (cobertura 1 → 0).
   - CUS-03 baja de 4 a 3 pero sigue en verde: **no genera alerta**.
3. Email a dirección con la propuesta: backup de Javier Lozano (★ con interés), conversación de permanencia con Marcos y vacante para la prueba de reservas.
4. Remarcar: el email a dirección **no incluye** señales individuales. Esas están solo en la hoja de People.

## 6 · Cierre del ciclo

1. En `alertas`: la fila "Plan de backup: Javier Lozano en gestión de claves" → `decision = aprobada`.
2. Se crea una fila en `planes-backup` → recálculo → **CUS-01 pasa de 🔴 a 🟡.**
3. CUS-02 sigue en rojo (cobertura 0: un backup no basta). *"El sistema no se engaña: sin nadie que lo sepa hacer hoy, sigue en rojo."*
4. **Opcional, "tres meses después":** Javier completa `FOR-01`. El sistema **propone** el nivel 3 y no lo sube solo. Marcos, su manager tras la baja, lo valida en `skills-empleados` (`nivel_validado = 3`, `validado_por = E008`). Recálculo → **CUS-01 pasa de 🟡 a 🟢** → email de cierre a dirección. *"Completar un curso no es tener la skill: la valida una persona."*

## 7 · Usos

- **Rotación:** Elena tenía 4 señales (compa-ratio 0,86, 22 meses sin revisión, clima de Mercados por debajo de la media, evaluación 5) y estaba en un rojo crítico. Era **prioridad 1** de la matriz *antes* de irse. *"El sistema lo habría avisado."*
- **Encuesta:** las key people puntúan **2,6 en carga sostenible frente a 3,4** del resto (n = 5, en el límite del anonimato). Custodia no se puede mostrar sola (n = 3) y se agrega a Mercados.
- **Revisión salarial:** para una key person con compa-ratio bajo, **bono de retención ligado a formar y validar a su backup**, no una subida que premie ser imprescindible.

## Preguntas probables

| Pregunta | Respuesta corta |
|---|---|
| ¿Y si las skills están mal? | Solo cuentan las validadas por el manager. Revisión semestral. Es el límite número 1 del sistema. |
| ¿La IA decide algo? | No. Captura y redacta. El riesgo es una regla y las acciones las aprueba People. |
| ¿Por qué no un modelo de predicción de fuga? | Por ética, por el AI Act y por los datos: con 46 personas no hay muestra. Las señales llevan a una conversación, no a una etiqueta. |
| ¿Escala? | Las definiciones sí. Sheets llega hasta ~200 personas; después, base de datos o HRIS. |
