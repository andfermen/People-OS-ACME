# De la demo a producción

La demo está hecha para que cualquiera la pruebe con un enlace y sin instalar nada. Por eso tiene atajos: formularios en lugar de eventos del HRIS, enlaces sin identificación, un Sheet como HRIS y un botón para reiniciar. **La arquitectura no cambia al pasar a producción.** Cambian las piezas de los extremos: de dónde llegan los datos, quién puede pulsar qué y cómo se opera.

Cada workflow de n8n lleva en el lienzo una nota gris **«En producción»** con lo que cambiaría en él, y el panel tiene una sección **«Qué hay detrás»**. Este documento lo reúne capa por capa.

## Capa por capa

| Capa | En la demo | En producción | Lo que ya está preparado |
|---|---|---|---|
| **Definiciones** | `definiciones/` y `prompts/` en GitHub; n8n lee `main` | Cambios por *pull request* revisada por People; n8n lee una **versión etiquetada** (tag), no `main` | Las reglas ya son datos (D-23): cambiar un umbral no toca flujos |
| **Motor** | `calculo/`, el mismo código dentro de los nodos | Igual. `npm run verificar` y `npm run probar-n8n` en **integración continua**, obligatorios antes de cada cambio | Es determinista y tiene sus pruebas |
| **Orquestador** | Una instancia de n8n; los workflows se importan a mano | Entornos de **pruebas y real**; los workflows se despliegan desde el repo (API o CLI de n8n), nunca se editan en el lienzo; un *workflow de errores* avisa a People; reintentos | Los workflows se generan del repo (`npm run n8n`); nadie los edita a mano |
| **HRIS** | Google Sheets, leído y escrito solo por el adaptador | La **API del HRIS** de la compañía (Factorial, Bizneo). La baja llega como **evento** del HRIS (webhook), no por formulario | El adaptador (D-24): cambiar de HRIS es reescribir un subworkflow con las mismas tres operaciones |
| **IA** | API de Claude con una clave de la demo | Proveedor configurado **sin retención** de datos; modelo fijado por versión; registro de entradas y salidas; **batería de pruebas** antes de cambiar prompt o modelo; límite de gasto | Si Claude falla, la propuesta y el informe salen por reglas; el asistente solo lee y no ve salarios ni señales |
| **Personas** | Enlaces públicos para aprobar y validar | **SSO** de la compañía, permisos por rol y **registro de auditoría** de cada decisión | Ninguna decisión sobre una persona es automática: siempre aprueba People o valida el manager |
| **Avisos** | Todos los emails van al buzón de la demo y a la bandeja del panel | Cada email va a su destinatario, desde un dominio de la compañía; o un aviso en Slack o Teams | Los textos y destinatarios ya salen por rol (People, manager, dirección) |

## Acceso y decisiones

- **Identificación.** People, managers y dirección entran con el SSO de la compañía. El panel deja de ser público y muestra lo que corresponde a cada rol (`docs/arquitectura.md`, *Quién ve qué*).
- **Aprobar.** Se aprueba dentro de la herramienta o con un **enlace firmado, de un solo uso y con caducidad**, ligado a la persona que debe decidir. Hoy cualquiera con el enlace puede aprobar.
- **Validar skills.** Solo el manager de esa persona, identificado. Hoy el formulario no lo comprueba.
- **Auditoría.** Cada decisión guarda quién, cuándo, qué opción y qué información tenía delante.
- **Datos sensibles.** Señales de rotación, salarios y bandas en un almacén aparte, con acceso solo de People. En la demo son pestañas del mismo Sheet.
- **Concurrencia.** El doble clic ya está controlado: se mira el estado de la alerta antes de aplicarla. Con varias personas decidiendo a la vez, hace falta además un bloqueo por alerta en el HRIS.

## Operación

- **Secretos.** Claves y credenciales solo en el gestor de credenciales del orquestador; una clave de Claude por entorno, con límite de gasto y rotación. Ninguna en el repo (ya es así).
- **Errores.** Workflow de errores con aviso a People; reintentos en las llamadas al HRIS y a Claude; las automatizaciones con calendario no repiten avisos (ya es así: `avisos` y `ultimo_aviso`).
- **Observabilidad.** Un registro de cada ejecución (qué disparó, qué cambió en el mapa, qué se envió), para poder contestar «¿por qué recibí este aviso?».
- **Copias.** El HRIS es el registro; el histórico del semáforo y las alertas se exportan con copia periódica.
- **Escala.** A partir de unas 200 personas, Sheets se queda corto; con el HRIS real esto desaparece. Las definiciones y las reglas no cambian (`docs/escalado.md`).

## Orden de implantación

1. **Acceso:** SSO, roles, aprobaciones firmadas y auditoría.
2. **HRIS real:** el adaptador contra la API y la baja como evento.
3. **Operación:** entornos, integración continua, workflow de errores y registro de ejecuciones.
4. **Retirar los atajos de la demo:** reinicio, tiempo simulado, bandeja y buzón único.
