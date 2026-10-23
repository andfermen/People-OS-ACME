# Seguimiento de planes · construido (automatización con calendario)

**Dónde vive:** n8n, escenario 3 ([`flujos/n8n/E3-automatizaciones-calendario.json`](../flujos/n8n/E3-automatizaciones-calendario.json)), nodo **Seguimiento**. Lógica en [`calculo/agentes.js`](../calculo/agentes.js) (`seguimientoPlanes`), reglas en [`definiciones/reglas-agentes.md`](../definiciones/reglas-agentes.md) §1 (D-21).

## Para qué

Un plan de backup solo reduce el riesgo si alguien comprueba, cuando toca, que la persona ha llegado al nivel. Con una sola persona en People, ese "cuando toca" se olvida. Esta automatización se encarga de que no se olvide: **pregunta al manager en el momento justo, insiste y, si no hay respuesta, se lo pasa a People.**

## Qué hace, solo

Cada lunes a las 8:00, sin que nadie lo lance:

1. **Lee** los planes activos (`planes-backup`), la plantilla y el catálogo de formación.
2. **Decide si toca** para cada plan: la fecha de revisión es la objetivo o, si no hay, el inicio más las semanas de su formación.
3. **Actúa** según lo que haya pasado antes:

| Situación | Lo que hace |
|---|---|
| El plan llega a su fecha | Email al manager con el **formulario de validación rellenado** (persona, skill, nivel objetivo, quién valida) |
| 7 días sin validar | Recordatorio al manager |
| 2 avisos sin validar | **Escala a People:** alerta `seguimiento` en la hoja `alertas` y email |
| El manager ya no está | Escala a People directamente: no escribe a quien se ha ido |
| Ya escalado | No insiste: lo lleva People |
| El manager valida | El plan sale solo del seguimiento (lo cierra el escenario 2) |

4. **Anota** su estado en `planes-backup` (`avisos`, `ultimo_aviso`) para no repetirse.

En la demo: Javier llega a las 12 semanas de mentoring → la automatización avisa a Marcos → Marcos valida desde el enlace → *Gestión de claves* vuelve a verde. El plan de Marcos nadie lo valida → recordatorio → escalado a People (`ALR-005`).

## Qué no hace

- **No sube niveles.** Completar un curso no es tener la skill: el nivel lo valida el manager.
- **No cierra ni cambia planes.** Ampliar, cambiar de backup o cancelar lo decide People.
- **No juzga a nadie.** Un manager que no responde no es un dato sobre esa persona: es una alerta operativa.

## Por qué así

- **Reglas, no IA:** decidir cuándo avisar es una fecha y un contador. No hace falta un modelo, y así se puede probar (`npm run probar-n8n`: aviso, no repetir, recordatorio, escalado, sin manager).
- **El estado en el HRIS, no en n8n:** si mañana cambia el orquestador, el seguimiento sigue donde estaba.
- **Reutiliza lo que hay:** el aviso enlaza al formulario del escenario 2, el mismo que usa el manager en cualquier otro momento.

## Cómo se prueba

- **En n8n:** formulario **Ejecutar ahora** → `seguimiento`, cuándo = `+12 semanas`. O desde el panel de la demo (escenario 0), que guía los pasos.
- **En local:** `npm run demo -- seguimiento +84`.
- **Muestra del email:** [`salidas/n8n/muestra-email-seguimiento.html`](../salidas/n8n/muestra-email-seguimiento.html).

## En producción

El email iría al buzón real del manager (de la hoja `empleados`); en la demo llega al buzón de la demo con su nombre en el asunto. El formulario pediría identificarse, para que solo el manager pueda validar.
