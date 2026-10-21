# La demo en n8n: dos escenarios

Dos workflows, generados con `npm run n8n` (no se editan a mano en el repo: se cambian `calculo/` y `flujos/n8n/src/`).

| Escenario | Entradas | Qué hace |
|---|---|---|
| **1 · Baja de Elena** (`E1-baja-de-elena.json`) | **Formulario baja** (id de la persona) | Marca la baja, recalcula, compara con la última foto, calcula la vacante, Claude redacta la propuesta (si falla, propuesta por reglas), escribe `cobertura`, `key-people`, `historico-semaforo` y `alertas`, y envía 2 emails: dirección y People (confidencial, con botones *Aprobar*) |
| | **Botón Aprobar** (enlace del email de People) | Aprueba la alerta, descarta la otra opción de la misma decisión, aplica el cambio (plan de backup o movilidad), recalcula y responde con una página + email |
| | **Formulario reiniciar** | Deja el Sheet como al principio (plantilla, skills y planes del repo; alertas vacías; mapa inicial) para ensayar otra vez |
| **2 · Actualización de skill** (`E2-actualizacion-de-skill.json`) | **Formulario skill** (persona, skill, nivel, manager que valida) | Actualiza `skills-empleados`, completa el plan de backup, recalcula y envía el email de cierre: CUS-01 de ámbar a verde |

Las tres entradas del escenario 1 comparten la configuración y la lectura del Sheet; el nodo **¿Qué se ha pedido?** manda cada una a su rama. El cálculo es el mismo código que comprueba `npm run verificar`; `npm run probar-n8n` ejecuta el código de los nodos contra un Sheet simulado y recorre la demo entera, dos veces seguidas.

## Montaje (Andrea, ~30 min)

Necesitas las dos credenciales de la prueba (**Header Auth** de Claude y **Google Sheets OAuth2**) y una nueva de **Gmail**.

1. **Escenario 1.** En n8n: *Workflows → ⋯ → Import from file* → `flujos/n8n/E1-baja-de-elena.json`.
   1. Nodo **Configuración**: `sheet_id` = el ID del Sheet; `email_demo` = tu Gmail.
   2. Nodos **Leer Sheet**, **Escribir (baja)**, **Escribir (aprobación)** y **Escribir (reinicio)**: *Credential for Google Sheets OAuth2 API* → la de la prueba.
   3. **Claude propone** → la Header Auth de Claude.
   4. **Email a dirección**, **Email a People** y **Enviar resultado** → *Create new* → **Gmail OAuth2** con tu Gmail (créala una vez y reutilízala).
   5. Guarda y **activa** el workflow (*Active* / *Publish*).
   6. Abre el nodo **Botón Aprobar** → pestaña **Production URL** → cópiala (acaba en `/webhook/acme-aprobar`) y pégala en **Configuración** → `url_aprobar`. Guarda otra vez.
   7. Copia la **Production URL** de **Formulario baja** y de **Formulario reiniciar**: son las pantallas de la demo.
2. **Escenario 2.** Importa `flujos/n8n/E2-actualizacion-de-skill.json` → **Configuración** (`sheet_id`, `email_demo`) → credencial de Google Sheets en **Leer Sheet** y **Escribir en Sheet** → Gmail en **Enviar email** → guarda y activa. Copia la **Production URL** de **Formulario skill**.

## Ensayo

1. **Formulario reiniciar** → *Sí, reiniciar la demo*. En el Sheet: `alertas` vacía, CUS-01 en verde.
2. **Formulario baja** → `E007`. En unos segundos: Elena `baja`, CUS-01 y CUS-02 en rojo, 4 alertas, y 2 emails con el prefijo `[Acme People OS]`.
3. En el email **CONFIDENCIAL People** → *Aprobar ALR-002* (opción B, mover a Marcos). Página: ALR-002 aprobada, ALR-001 descartada. En el Sheet, Marcos es responsable de custodia y tiene un plan.
4. *Aprobar ALR-003* (backup de Javier) → **CUS-01 🔴 → 🟡**.
5. **Formulario skill** → `E009`, `gestion-claves`, `3`, `E008` ("tres meses después, Marcos valida a Javier") → email *Riesgo reducido*: **CUS-01 🟡 → 🟢**.
6. Para repetir: vuelta al paso 1.

## Si falla

- **401 en Claude:** la cabecera de la credencial debe llamarse `x-api-key`. Aunque falle, el flujo sigue con la propuesta por reglas (el email lo indica al pie).
- **403/404 en Leer Sheet:** `sheet_id` mal copiado o la credencial de Google no es de la cuenta dueña del Sheet.
- **El formulario dice que no existe la persona o que ya está de baja:** reinicia (paso 1).
- **Los botones del email no hacen nada:** el escenario 1 no está activo o `url_aprobar` no es la *Production URL* del Botón Aprobar.
- **El desvío manda a la rama equivocada:** abre la ejecución y mira el campo `accion` en la salida de **Configuración** (debe ser `baja`, `aprobar` o `reiniciar`).
- **Cambié una regla en `definiciones/` y n8n no la ve:** `npm run n8n`, commit y push. GitHub tarda hasta 5 minutos en servir la versión nueva.

## Fragilidad conocida (para decirlo si preguntan)

Los botones *Aprobar* son enlaces: quien tenga el email puede aprobar. Y el formulario de skill no comprueba que quien valida sea de verdad el manager. En la demo basta; en producción irían con identificación (login de People y del manager).
