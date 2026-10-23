# La demo en n8n: cuatro escenarios

Cuatro workflows, generados con `npm run n8n` (no se editan a mano en el repo: se cambian `calculo/` y `flujos/n8n/src/`). El Sheet se lee y se escribe con **nodos nativos de Google Sheets**. En el lienzo, unas notas de colores separan los bloques para explicarlo de izquierda a derecha.

**Quien prueba la demo no instala nada** (D-22): recibe el enlace del **panel**, una página que sirve tu n8n. Desde ahí abre los formularios, aprueba las decisiones, lee los emails que genera el sistema y reinicia la demo. Solo tú montas los workflows, una vez.

| Escenario | Entradas | Qué hace |
|---|---|---|
| **0 · Panel y reinicio** (`E0-panel-y-reinicio.json`, D-22) | **Abrir el panel** (`/webhook/acme-panel`) | Página de entrada: qué hacer ahora (según el estado), mapa en vivo, key people, decisiones pendientes con su botón *Aprobar* y la **bandeja de People** (copia de cada email que ha enviado el sistema) |
| | **Reiniciar la demo** (`/webhook/acme-reiniciar`, botón del panel) | Baja de GitHub los CSV iniciales (`salidas/sheets/`), vacía las hojas, las vuelve a escribir y vuelve al panel. Sustituye al "reinicia la demo" de Claude Code |
| **1 · Baja de Elena** (`E1-baja-de-elena.json`) | **Formulario baja** (id de la persona) | Marca la baja, recalcula, compara con el mapa actual, calcula la vacante, Claude redacta la propuesta (si falla, propuesta por reglas), escribe `cobertura`, `key-people`, `historico-semaforo` y `alertas`, y envía **un email a People**: arriba el resumen que vería dirección, abajo lo confidencial y los botones *Aprobar* |
| | **Botón Aprobar** (`/webhook/acme-aprobar`, desde el email o el panel) | Aprueba la alerta, descarta la otra opción de la misma decisión, aplica el cambio (plan de backup o movilidad), recalcula y responde con una página (con vuelta al panel) + email |
| **2 · Actualización de skill** (`E2-actualizacion-de-skill.json`) | **Formulario skill** (persona, skill, nivel, manager que valida) | Actualiza `skills-empleados`, completa el plan de backup, recalcula y envía el email de cierre: CUS-01 de ámbar a verde |
| **3 · Agentes autónomos** (`E3-agentes-autonomos.json`, D-21) | **Cada lunes 8:00** | **Seguimiento de planes:** a los planes que llegan a su fecha, email al manager con el formulario skill rellenado; recordatorio a los 7 días; tras 2 avisos (o sin manager activo), alerta para People. Anota `avisos` y `ultimo_aviso` en `planes-backup` |
| | **Día 1 de cada mes 8:00** | **Centinela:** recalcula, guarda la foto, detecta funciones frágiles y desde cuándo, validaciones de más de 6 meses y decisiones pendientes; Claude redacta el informe para dirección (si falla, por reglas); un email a People |
| | **Ejecutar un agente ahora** (formulario) | Para la demo: lanza cualquiera de los dos. **Cuándo** simula el paso del tiempo: `hoy`, `+12`, `+13` o `+14 semanas` (o una fecha exacta) |

Todos los emails se guardan además en la hoja **`bandeja`**, que es lo que enseña el panel: la demo no depende de ningún buzón. Si Gmail falla, el flujo sigue.

El cálculo es el mismo código que comprueba `npm run verificar`. `npm run probar-n8n` ejecuta el código de los nodos contra un Sheet simulado y recorre la demo entera dos veces, con el panel y el reinicio.

## Montaje (Andrea, una vez, ~30 min)

Credenciales: **Google Sheets OAuth2**, la **Header Auth** de Claude (cabecera `x-api-key`) y **Gmail OAuth2**. En todos los nodos verdes de Google Sheets: *Credential* → la de Google Sheets (n8n suele ponerla sola en todos al elegirla en el primero).

1. **Escenario 1.** *Workflows → ⋯ → Import from file* → `E1-baja-de-elena.json`.
   1. **Configuración**: `sheet_id` = el ID del Sheet; `email_demo` = tu Gmail.
   2. Credenciales: Google Sheets en los nodos verdes, Header Auth en **Claude propone**, Gmail en **Enviar email**.
   3. Guarda y **activa**. Nodo **Botón Aprobar** → **Production URL** (acaba en `/webhook/acme-aprobar`) → pégala en **Configuración** → `url_aprobar`. Guarda otra vez.
   4. Apunta la **Production URL** del **Formulario baja**.
2. **Escenario 2.** Importa `E2-actualizacion-de-skill.json` → **Configuración** (`sheet_id`, `email_demo`) → credenciales → guarda y activa. Apunta la **Production URL** del **Formulario skill**.
3. **Escenario 3.** Importa `E3-agentes-autonomos.json` → **Configuración**: `sheet_id`, `email_demo` y `url_formulario_skill` = la URL del Formulario skill → credenciales (también **Leer histórico**; Header Auth en **Claude redacta el informe**) → guarda y activa. Apunta la **Production URL** de **Ejecutar un agente ahora**.
4. **Escenario 0.** Importa `E0-panel-y-reinicio.json` → **Configuración**: `sheet_id`, `url_form_baja`, `url_form_skill`, `url_form_agentes` (las tres URLs apuntadas) y, si quieres, `url_video` → credencial de Google Sheets en todos los nodos verdes → guarda y **activa**.
5. Nodo **Abrir el panel** → **Production URL** (acaba en `/webhook/acme-panel`): **este es el enlace que se envía**.
6. **En el Sheet** deben existir las hojas `bandeja` (cabecera `fecha, asunto, html`) y, en `planes-backup`, las columnas `avisos` y `ultimo_aviso`. Ya están creadas.

## Antes de enviarlo

1. Abre el panel en una **ventana de incógnito** y pulsa **Reiniciar la demo**: vuelve al panel con el paso 1 marcado como *ahora*.
2. Haz el recorrido completo una vez (abajo). Después, **Reiniciar** otra vez.
3. **n8n:** comprueba hasta cuándo dura tu plan. Si la prueba gratuita caduca mientras alguien lo prueba, no funciona nada: paga un mes del plan básico si hace falta.
4. **Claude:** pon un límite de gasto mensual a la clave de API. Si se agota, la demo sigue con la propuesta por reglas.
5. *(Opcional)* Comparte el Sheet en **solo lectura** con enlace: el panel ya enseña el mapa, pero el Sheet es el "HRIS" y un perfil técnico querrá verlo. Se verán todas las pestañas, también señales y salarios (ficticios); el README lo dice. Si no lo compartes, el enlace al Sheet del pie del panel pedirá acceso.
6. Envía: el enlace del panel, el vídeo y el repositorio.

## Recorrido (lo mismo que guía el panel)

1. **Formulario baja** → `E007`. En el panel: Elena de baja, CUS-01 y CUS-02 en rojo, 4 decisiones pendientes y el primer email en la bandeja.
2. **Aprobar ALR-002** (opción B, mover a Marcos). ALR-001 se descarta sola; Marcos pasa a responsable de custodia.
3. **Aprobar ALR-003** (backup de Javier) → **CUS-01 🔴 → 🟡**.
4. **Ejecutar un agente ahora** → `seguimiento`, `+12 semanas`. En la bandeja, dos avisos: a Marcos por Javier y a Sergio por Marcos.
5. En el aviso a Marcos → **Validar a Javier** (o Formulario skill: `E009`, `gestion-claves`, `3`, `E008`) → **CUS-01 🟡 → 🟢**.
6. *(Opcional)* `seguimiento` con `+13` y `+14 semanas`: recordatorio a Sergio y escalado a People (`ALR-005`).
7. `centinela`, `+14 semanas` → en la bandeja, el informe para dirección con el bloque solo People.

Mismo recorrido sin n8n: `npm run demo -- reset`, `… baja E007`, `… aprobar ALR-002`, `… aprobar ALR-003`, `… seguimiento +84`, `… validar E009 gestion-claves 3 E008`, `… seguimiento +91`, `… seguimiento +98`, `… centinela +98`.

## Si falla

- **El panel da error o sale en blanco:** el escenario 0 no está activo, o algún nodo de Sheets no tiene credencial. Revisa las ejecuciones del escenario 0 en n8n.
- **El panel dice "falta configurar la URL":** falta pegar esa Production URL en la **Configuración** del escenario 0.
- **Reiniciar tarda o da error:** baja los CSV de GitHub (`raw.githubusercontent.com`); si GitHub no responde, se puede repetir. Como alternativa, pide a Claude Code "reinicia la demo".
- **401 en Claude:** la cabecera de la credencial debe llamarse `x-api-key`. Aunque falle, el flujo sigue con la propuesta por reglas (el email lo indica al pie).
- **Un nodo de Google Sheets no encuentra la hoja:** `sheet_id` mal copiado, la credencial no es de la cuenta dueña del Sheet, o falta la hoja `bandeja`.
- **El formulario dice que no existe la persona o que ya está de baja:** pulsa **Reiniciar** en el panel.
- **Los botones Aprobar no hacen nada:** el escenario 1 no está activo, o `url_aprobar` no es la *Production URL* del Botón Aprobar (para los del email; los del panel salen solos).
- **El agente de seguimiento no avisa de nada:** "cuándo" es anterior a la revisión del plan (Javier: aprobación + 12 semanas), o ya avisó hace menos de 7 días.
- **El formulario skill llega vacío desde el aviso:** n8n rellena los campos con los parámetros de la URL solo si su versión lo admite; si no, los datos están en el propio aviso y en el panel.
- **Aparece una columna `_hoja` en alguna hoja:** el nodo de escritura no ignora los campos que no son columnas. En ese nodo: *Options* → *When an item has extra fields* → *Ignore them*.
- **Cambié una regla en `definiciones/` y n8n no la ve:** `npm run n8n`, commit y push. GitHub tarda hasta 5 minutos en servir la versión nueva.

## Fragilidad conocida (para decirlo si preguntan)

- El panel, los botones *Aprobar* y el reinicio son enlaces públicos: quien tenga el enlace puede usarlos. El formulario de skill no comprueba que quien valida sea el manager. En la demo basta; en producción irían con identificación (login de People y del manager).
- Si dos personas prueban a la vez, comparten el Sheet: el panel lo avisa y **Reiniciar** lo deja como al principio.
- En la demo, todos los emails van al buzón de la demo (`email_demo`) y a la bandeja del panel; los empleados ficticios no tienen buzón. En producción, cada email sale al destinatario real de la hoja `empleados`.
