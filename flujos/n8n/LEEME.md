# Flujo principal en n8n (pasos 1-8)

Tres workflows, generados con `npm run n8n` (no se editan a mano en el repo: se cambian `calculo/` y `flujos/n8n/src/`).

| Workflow | Disparo | Qué hace |
|---|---|---|
| **W1 · Baja → recalcular → avisar** | Formulario: id de la persona | Marca la baja, recalcula el mapa, compara con la última foto, calcula la vacante, Claude redacta la propuesta (si falla, propuesta por reglas), escribe `cobertura`, `key-people`, `historico-semaforo` y `alertas`, y envía 2 emails: dirección y People (confidencial, con botones *Aprobar*) |
| **W2 · Aprobar desde el email** | Clic en *Aprobar* (webhook) | Aprueba la alerta, descarta la otra opción de la misma decisión, aplica el cambio (plan de backup o movilidad), recalcula y responde con una página de confirmación + email |
| **W0 · Reiniciar demo** | Formulario | Deja el Sheet como al principio para ensayar otra vez |

El cálculo es el mismo código que comprueba `npm run verificar`. `npm run probar-n8n` ejecuta el código de los nodos contra un Sheet simulado y recorre la demo entera.

## Montaje (Andrea, ~30 min)

Necesitas las dos credenciales de la prueba (**Header Auth** de Claude y **Google Sheets OAuth2**) y una nueva de **Gmail**.

1. **W2 primero** (los demás necesitan su URL). En n8n: *Workflows → ⋯ → Import from file* → `flujos/n8n/W2-aprobar.json`.
   1. Nodo **Configuración**: `sheet_id` = el ID del Sheet; `email_demo` = tu Gmail. (`url_aprobar` no se usa en W2.)
   2. Nodos **Leer Sheet** y **Escribir en Sheet**: *Credential for Google Sheets OAuth2 API* → la de la prueba.
   3. Nodo **Email a People**: *Credential* → *Create new* → **Gmail OAuth2** → entra con tu Gmail.
   4. Guarda y **activa** el workflow (interruptor *Active* / *Publish*).
   5. Abre el nodo **Webhook** → pestaña **Production URL** → cópiala (acaba en `/webhook/acme-aprobar`).
2. **W1**: importa `flujos/n8n/W1-baja-recalcular-avisar.json`.
   1. **Configuración**: `sheet_id`, `email_demo` y `url_aprobar` = la Production URL del paso 1.5.
   2. **Leer Sheet** y **Escribir en Sheet** → credencial de Google Sheets. **Claude propone** → la Header Auth de Claude. **Email a dirección** y **Email a People** → la de Gmail.
   3. Guarda y **activa**. En el nodo **Formulario**, copia la **Production URL**: es la pantalla de la demo.
3. **W0**: importa `flujos/n8n/W0-reiniciar-demo.json` → **Configuración** (`sheet_id`) → credencial de Google Sheets en **Leer Sheet** y **Escribir en Sheet** → guarda y activa. Copia la Production URL del formulario.

## Ensayo

1. Formulario de **W0** → *Sí, reiniciar la demo*. En el Sheet: `alertas` vacía, CUS-01 en verde.
2. Formulario de **W1** → `E007`. En ~30 s: el Sheet cambia (Elena `baja`, CUS-01 y CUS-02 en rojo, 4 alertas) y llegan 2 emails con el prefijo `[Acme People OS]`.
3. En el email **CONFIDENCIAL People** → *Aprobar ALR-002* (opción B, mover a Marcos). Se abre una página: ALR-002 aprobada, ALR-001 descartada. En el Sheet, Marcos es responsable de custodia y tiene un plan en `planes-backup`.
4. *Aprobar ALR-003* (backup de Javier) → la página y un email dicen **CUS-01 🔴 → 🟡**.
5. Para repetir: vuelta al paso 1.

## Si falla

- **401 en Claude:** la cabecera de la credencial debe llamarse `x-api-key`. Aunque falle, el flujo sigue con la propuesta por reglas (el email lo indica al pie).
- **403/404 en Leer Sheet:** `sheet_id` mal copiado o la credencial de Google no es de la cuenta dueña del Sheet.
- **El formulario dice que no existe la persona o que ya está de baja:** usa W0 para reiniciar.
- **Los botones del email no hacen nada:** W2 no está activo o `url_aprobar` no es la *Production URL*.
- **Cambié una regla en `definiciones/` y n8n no la ve:** `npm run n8n`, commit y push. GitHub tarda hasta 5 minutos en servir la versión nueva.

## Fragilidad conocida (para decirlo si preguntan)

Los botones *Aprobar* son enlaces: quien tenga el email puede aprobar. En la demo basta; en producción iría con identificación (login de People) y el enlace caducaría.
