# La demo en n8n: el adaptador HRIS y seis escenarios

Siete workflows, generados con `npm run n8n` (no se editan a mano en el repo: se cambian `calculo/` y `flujos/n8n/src/`). En el lienzo, unas notas de colores separan los bloques para explicarlo de izquierda a derecha.

**Quien prueba la demo no instala nada** (D-22): recibe el enlace del **panel**, una página que sirve n8n. Desde ahí abre los formularios, aprueba las decisiones, lee los emails que genera el sistema, pregunta al asistente y reinicia la demo. Los workflows se montan una vez.

| Workflow | Entradas | Qué hace |
|---|---|---|
| **HRIS · Google Sheets** (`HRIS-google-sheets.json`, D-24) | Lo llaman los demás | **El adaptador.** Es lo único que habla con el sistema de registro. Operaciones: **leer** (todas las hojas y el enlace al HRIS), **escribir** (cada fila a su hoja: actualizar, añadir, reescribir key-people), **cargar** (vaciar y volver a escribir, para el reinicio). Para usar Factorial o Bizneo, se cambia este workflow |
| **0 · Panel y reinicio** (`E0-panel-y-reinicio.json`, D-22) | **Abrir el panel** (`/webhook/acme-panel`) | Página de entrada: qué hacer ahora (según el estado), mapa en vivo, key people, decisiones con su botón *Aprobar*, el asistente y la **bandeja de People** (copia de cada email) |
| | **Reiniciar la demo** (`/webhook/acme-reiniciar`) | Baja de GitHub los CSV iniciales (`salidas/sheets/`), pide al HRIS que los cargue y vuelve al panel |
| **1 · Baja de Elena** (`E1-baja-de-elena.json`) | **Formulario baja** | Marca la baja, recalcula, calcula la vacante, Claude redacta la propuesta (si falla, por reglas), escribe en el HRIS y envía **un email a People**: arriba lo que vería dirección, abajo lo confidencial y los botones *Aprobar* |
| **1b · Aprobar decisión** (`E1b-aprobar-decision.json`, D-26) | **Botón Aprobar** (`/webhook/acme-aprobar`, desde el email y el panel) | Aprueba la alerta, descarta la otra opción de la misma decisión, aplica el cambio (plan de backup o movilidad), recalcula y responde con una página (con vuelta al panel) + email |
| **2 · Actualización de skill** (`E2-actualizacion-de-skill.json`) | **Formulario skill** | El manager valida un nivel: actualiza la skill, completa el plan de backup, recalcula y envía el email de cierre |
| **3 · Automatizaciones con calendario** (`E3-automatizaciones-calendario.json`, D-21) | **Cada lunes 8:00** | **Seguimiento de planes:** a los planes que llegan a su fecha, email al manager con el formulario skill rellenado; recordatorio a los 7 días; tras 2 avisos (o sin manager activo), alerta para People |
| | **Día 1 de cada mes 8:00** | **Centinela:** recalcula, detecta funciones frágiles y desde cuándo, validaciones de más de 6 meses y decisiones pendientes; Claude redacta el informe para dirección (si falla, por reglas) |
| | **Ejecutar ahora** (formulario) | Para la demo: lanza cualquiera de las dos. **Cuándo** simula el paso del tiempo: `hoy`, `+12`, `+13` o `+14 semanas` (o una fecha exacta) |
| **4 · Asistente de People** (`E4-asistente-people.json`, D-25) | **Pregunta** (`/webhook/acme-asistente`, desde el panel) | **El agente.** Claude decide qué herramientas del motor usar (mapa, buscar persona, simular una baja, candidatos para una función, madurez IA), en hasta 4 vueltas, y responde enseñando qué ha consultado. Solo lee |

Las reglas (semáforo, prioridad, señales, vacante, automatizaciones) las lee cada escenario de `salidas/n8n/definiciones.json`, que se genera desde `definiciones/reglas.yaml` (D-23). `npm run probar-n8n` ejecuta el código de todos los nodos contra un HRIS simulado y con Claude simulado, dos vueltas seguidas.

## Montaje automático (recomendado, ~10 min)

`npm run desplegar` sube los siete workflows por la API de n8n (D-28). Rellena las Configuraciones (ID del HRIS, email, URL de Aprobar y de los formularios), asigna las credenciales y activa los escenarios. Se puede repetir: actualiza cada workflow por su nombre, así que las URLs no cambian.

1. En n8n, crea las tres credenciales (abajo) y una clave de API: *Settings → n8n API → Create an API key*.
2. En tu terminal: `npx @n8n/cli login` (pide la URL de tu instancia y la clave; se guardan en tu perfil, fuera del repo).
3. En la raíz del repo, crea `.n8n-demo.json` (no se sube a GitHub): `{ "sheet_id": "ID del Sheet", "email_demo": "tu buzón" }`.
4. `npm run desplegar -- --simular` para ver qué hará, y después `npm run desplegar`. Al final comprueba los formularios y el panel, y te da su enlace. Los workflows nuevos van al mismo proyecto que el HRIS (n8n no deja llamar a un subworkflow de otro proyecto).
5. `npm run ensayar` para recorrer la demo entera (abajo, *Antes de enviarlo*).

Si avisa de un nodo «sin credencial», ábrelo en n8n, asígnala y vuelve a lanzarlo. El montaje a mano sigue funcionando igual:

## Montaje a mano (una vez, ~40 min)

Credenciales: **Google Sheets OAuth2** (solo en el HRIS), la de **Claude** (tipo *Anthropic*: pega tu clave de API) y **Gmail OAuth2**. Para importar: *Workflows → ⋯ → Import from file*.

1. **HRIS · Google Sheets** (el primero: los demás lo llaman).
   1. **Configuración HRIS** → `sheet_id` = el ID del Sheet.
   2. Credencial de Google Sheets en todos los nodos verdes (n8n suele ponerla sola en todos al elegirla en el primero).
   3. Guarda y **actívalo** (n8n solo deja llamar a un subworkflow publicado). **Apunta su ID**: es lo que va después de `/workflow/` en la dirección del navegador.
2. **En cada escenario**, el nodo **Configuración** lleva `hris_workflow_id` = ese ID, y `email_demo` = el buzón de la demo.
3. **Escenario 1b.** Configuración → Gmail en **Enviar email** → guarda y **activa**. Apunta la **Production URL** del nodo **Botón Aprobar** (acaba en `/webhook/acme-aprobar`).
   **Escenario 1.** Configuración (y `url_aprobar` = esa URL) → credencial Anthropic en **Claude propone** → Gmail en **Enviar email** → guarda y **activa**. Apunta la Production URL del **Formulario baja**.
4. **Escenario 2.** Configuración → Gmail → guarda y activa. Apunta la Production URL del **Formulario skill**.
5. **Escenario 3.** Configuración (y `url_formulario_skill` = la URL del Formulario skill) → credencial Anthropic en **Claude redacta el informe** → Gmail → guarda y activa. Apunta la Production URL de **Ejecutar ahora**.
6. **Escenario 4.** Configuración → credencial Anthropic en los cuatro nodos **Claude razona 1-4** → guarda y activa.
7. **Escenario 0.** Configuración: `url_form_baja`, `url_form_skill`, `url_form_automatizaciones` (las tres URLs apuntadas) y, si quieres, `url_video` → guarda y **activa**. Las direcciones de *Aprobar*, *Reiniciar* y del asistente las calcula solo.
8. Nodo **Abrir el panel** → **Production URL** (acaba en `/webhook/acme-panel`): **este es el enlace que se envía**.
9. **En el Sheet** deben existir la hoja `bandeja` (cabecera `fecha, asunto, html`) y, en `planes-backup`, las columnas `avisos` y `ultimo_aviso`. Ya están creadas.

## Antes de enviarlo

0. `npm run ensayar`: hace el recorrido entero en tu n8n (formularios, botones, asistente), comprueba el panel en cada paso y deja la demo reiniciada. Envía los emails de verdad a `email_demo`.
1. Abre el panel en una **ventana de incógnito** y pulsa **Reiniciar la demo**: vuelve al panel con el paso 1 marcado como *ahora*.
2. Haz el recorrido completo una vez (abajo) y una pregunta al asistente. Después, **Reiniciar** otra vez.
3. **n8n:** comprueba hasta cuándo dura tu plan. Si caduca mientras alguien lo prueba, no funciona nada.
4. **Claude:** pon un límite de gasto mensual a la clave de API. Si se agota, la propuesta y el informe salen por reglas y el asistente dice que no puede responder.
5. *(Opcional)* Comparte el Sheet en **solo lectura**. Se verán todas las pestañas, también señales y salarios (ficticios); el README lo dice. Si no lo compartes, el enlace al HRIS del pie del panel pedirá acceso.
6. Envía: el enlace del panel, el vídeo y el repositorio.

## Recorrido (lo mismo que guía el panel)

1. **Formulario baja** → `E007`. En el panel: Elena de baja, CUS-01 y CUS-02 en rojo, 4 decisiones pendientes y el primer email en la bandeja.
2. **Aprobar ALR-002** (opción B, mover a Marcos). ALR-001 se descarta sola; Marcos pasa a responsable de custodia.
3. **Aprobar ALR-003** (backup de Javier) → **CUS-01 🔴 → 🟡**.
4. **Ejecutar ahora** → `seguimiento`, `+12 semanas`. En la bandeja, dos avisos: a Marcos por Javier y a Sergio por Marcos.
5. En el aviso a Marcos → **Validar a Javier** (o Formulario skill: `E009`, `gestion-claves`, `3`, `E008`) → **CUS-01 🟡 → 🟢**.
6. *(Opcional)* `seguimiento` con `+13` y `+14 semanas`: recordatorio a Sergio y escalado a People (`ALR-005`).
7. `centinela`, `+14 semanas` → en la bandeja, el informe para dirección con el bloque solo People.
8. **Asistente:** *¿Qué pasa si se va Carmen?* → la respuesta y cómo lo ha razonado. Y una trampa: *¿Cuánto cobra Marcos?* → se niega.

Mismo recorrido sin n8n (sin el asistente, que necesita la API): `npm run demo -- reset`, `… baja E007`, `… aprobar ALR-002`, `… aprobar ALR-003`, `… seguimiento +84`, `… validar E009 gestion-claves 3 E008`, `… seguimiento +91`, `… seguimiento +98`, `… centinela +98`.

## Si falla

- **"Workflow is not active and cannot be executed":** el HRIS no está activo; actívalo.
- **"Workflow could not be started" o un escenario no lee nada:** `hris_workflow_id` vacío o mal copiado en su Configuración, o el HRIS no tiene la credencial de Google Sheets.
- **El panel dice "falta configurar la URL":** falta pegar esa Production URL en la **Configuración** del escenario 0.
- **Reiniciar tarda o da error:** baja los CSV de GitHub (`raw.githubusercontent.com`); si GitHub no responde, se puede repetir. Como alternativa, pide a Claude Code "reinicia la demo".
- **401 en Claude:** la credencial de los nodos Claude debe ser de tipo *Anthropic* y con una clave válida. La propuesta y el informe siguen por reglas; el asistente lo dice en su página.
- **Un nodo de Google Sheets no encuentra la hoja:** `sheet_id` mal copiado en el HRIS, la credencial no es de la cuenta dueña del Sheet, o falta la hoja `bandeja`.
- **El formulario dice que no existe la persona o que ya está de baja:** pulsa **Reiniciar** en el panel.
- **Los botones Aprobar del email no hacen nada:** el escenario 1b no está activo, o `url_aprobar` (en el escenario 1) no es la *Production URL* del Botón Aprobar (los del panel salen solos).
- **El seguimiento no avisa de nada:** "cuándo" es anterior a la revisión del plan (Javier: aprobación + 12 semanas), o ya avisó hace menos de 7 días.
- **El formulario skill llega vacío desde el aviso:** n8n rellena los campos con los parámetros de la URL solo si su versión lo admite; si no, los datos están en el propio aviso y en el panel.
- **Aparece una columna `_hoja` u `operacion` en alguna hoja:** el nodo de escritura del HRIS no ignora los campos que no son columnas. En ese nodo: *Options* → *When an item has extra fields* → *Ignore them*.
- **Cambié una regla en `definiciones/` y n8n no la ve:** `npm run n8n`, commit y push. GitHub tarda hasta 5 minutos en servir la versión nueva.

## Fragilidad conocida (para decirlo si preguntan)

- El panel, los botones *Aprobar*, el asistente y el reinicio son enlaces públicos: quien tenga el enlace puede usarlos. El formulario de skill no comprueba que quien valida sea el manager. En producción irían con identificación (login de People y del manager). Todo lo que cambiaría en producción: `docs/produccion.md` y la nota gris de cada lienzo.
- Si dos personas prueban a la vez, comparten el HRIS: el panel lo avisa y **Reiniciar** lo deja como al principio.
- En la demo, todos los emails van al buzón de la demo (`email_demo`) y a la bandeja del panel; los empleados ficticios no tienen buzón.
- El asistente no es determinista: qué consulta y cómo lo redacta puede variar; las cifras salen siempre del motor.
