# La demo en n8n: dos escenarios

Dos workflows, generados con `npm run n8n` (no se editan a mano en el repo: se cambian `calculo/` y `flujos/n8n/src/`). El Sheet se lee y se escribe con **nodos nativos de Google Sheets**. En el lienzo, unas notas de colores separan los bloques para explicarlo de izquierda a derecha.

| Escenario | Entradas | Qué hace |
|---|---|---|
| **1 · Baja de Elena** (`E1-baja-de-elena.json`) | **Formulario baja** (id de la persona) | Marca la baja, recalcula, compara con el mapa actual, calcula la vacante, Claude redacta la propuesta (si falla, propuesta por reglas), escribe `cobertura`, `key-people`, `historico-semaforo` y `alertas`, y envía **un email a People**: arriba el resumen que vería dirección, abajo lo confidencial y los botones *Aprobar* |
| | **Botón Aprobar** (enlace del email) | Aprueba la alerta, descarta la otra opción de la misma decisión, aplica el cambio (plan de backup o movilidad), recalcula y responde con una página + email |
| **2 · Actualización de skill** (`E2-actualizacion-de-skill.json`) | **Formulario skill** (persona, skill, nivel, manager que valida) | Actualiza `skills-empleados`, completa el plan de backup, recalcula y envía el email de cierre: CUS-01 de ámbar a verde |

Bloques del escenario 1: **1 · Entradas** → **2 · Lee el Sheet** (definiciones y prompt del repo; empleados, skills, planes, alertas y cobertura del Sheet) → **3 · Calcula y propone** (arriba la baja, abajo la aprobación) → **4 · Escribe y avisa** (el nodo *¿A qué hoja?* manda cada fila a su hoja).

El cálculo es el mismo código que comprueba `npm run verificar`. `npm run probar-n8n` ejecuta el código de los nodos contra un Sheet simulado y recorre la demo entera, dos veces seguidas.

## Reiniciar la demo (fuera de n8n)

Antes de cada ensayo, pide a Claude Code: **"reinicia la demo"**. Vuelve a cargar en el Sheet las hojas `empleados`, `skills-empleados`, `planes-backup`, `cobertura`, `key-people` e `historico-semaforo` desde `salidas/sheets/` y vacía `alertas`.

## Montaje (Andrea, ~20 min)

Credenciales: la de **Google Sheets OAuth2** de la prueba (ahora sí vale: los nodos nativos la aceptan), la **Header Auth** de Claude y una de **Gmail**.

1. **Escenario 1.** En n8n: *Workflows → ⋯ → Import from file* → `flujos/n8n/E1-baja-de-elena.json`.
   1. Nodo **Configuración**: `sheet_id` = el ID del Sheet; `email_demo` = tu Gmail.
   2. Todos los nodos verdes de Google Sheets (**Leer …**, **Actualizar …**, **Guardar …**, **Añadir al histórico**, **Vaciar / Escribir key-people**): *Credential* → la de Google Sheets. n8n suele ponerla sola en todos al elegirla en el primero.
   3. **Claude propone** → la Header Auth de Claude. **Enviar email** → *Create new* → **Gmail OAuth2** con tu Gmail.
   4. Guarda y **activa** el workflow (*Active* / *Publish*).
   5. Nodo **Botón Aprobar** → pestaña **Production URL** → cópiala (acaba en `/webhook/acme-aprobar`) y pégala en **Configuración** → `url_aprobar`. Guarda otra vez.
   6. Copia la **Production URL** del **Formulario baja**: es la pantalla de la demo.
2. **Escenario 2.** Importa `flujos/n8n/E2-actualizacion-de-skill.json` → **Configuración** (`sheet_id`, `email_demo`) → la credencial de Google Sheets en los nodos verdes → Gmail en **Enviar email** → guarda y activa. Copia la **Production URL** del **Formulario skill**.

## Ensayo

1. "Reinicia la demo" (Claude Code). En el Sheet: `alertas` vacía, CUS-01 en verde.
2. **Formulario baja** → `E007`. En unos segundos: Elena `baja`, CUS-01 y CUS-02 en rojo, 4 alertas y un email `[Acme People OS] CONFIDENCIAL People …`.
3. En el email → *Aprobar ALR-002* (opción B, mover a Marcos). Página: ALR-002 aprobada, ALR-001 descartada. En el Sheet, Marcos es responsable de custodia y tiene un plan.
4. *Aprobar ALR-003* (backup de Javier) → **CUS-01 🔴 → 🟡**.
5. **Formulario skill** → `E009`, `gestion-claves`, `3`, `E008` ("tres meses después, Marcos valida a Javier") → email *Riesgo reducido*: **CUS-01 🟡 → 🟢**.

## Si falla

- **"This credential is configured to prevent use within an HTTP Request node":** ya no debería salir; si sale, el workflow importado es una versión antigua. Vuelve a importar.
- **401 en Claude:** la cabecera de la credencial debe llamarse `x-api-key`. Aunque falle, el flujo sigue con la propuesta por reglas (el email lo indica al pie).
- **Un nodo de Google Sheets no encuentra la hoja:** `sheet_id` mal copiado, o la credencial no es de la cuenta dueña del Sheet.
- **El formulario dice que no existe la persona o que ya está de baja:** reinicia la demo.
- **Los botones del email no hacen nada:** el escenario 1 no está activo o `url_aprobar` no es la *Production URL* del Botón Aprobar.
- **Aparece una columna `_hoja` en alguna hoja:** el nodo de escritura no tiene la opción de ignorar campos que no son columnas. En ese nodo: *Options* → *When an item has extra fields* (o parecido) → *Ignore them*. Avísame y lo ajusto en el generador.
- **Cambié una regla en `definiciones/` y n8n no la ve:** `npm run n8n`, commit y push. GitHub tarda hasta 5 minutos en servir la versión nueva.

## Fragilidad conocida (para decirlo si preguntan)

Los botones *Aprobar* son enlaces: quien tenga el email puede aprobar. Y el formulario de skill no comprueba que quien valida sea de verdad el manager. En la demo basta; en producción irían con identificación (login de People y del manager).
