# Registro de decisiones

Cada decisión relevante del proyecto: qué se decide, qué alternativas había y por qué se eligió esta.

---

## D-01 · Separar definiciones (qué) de ejecución (quién)

- **Qué:** las reglas, umbrales, funciones, taxonomía y prompts viven en archivos del repo. El orquestador solo ejecuta.
- **Alternativas:** meter la lógica dentro de los flujos del orquestador.
- **Por qué:** para cambiar un umbral del semáforo o la criticidad de una función basta con editar un archivo, sin rehacer flujos. Las reglas se pueden leer, auditar y versionar, y el orquestador se puede cambiar sin perder la lógica.

## D-02 · Una función construida entera: el mapa de riesgo de People

- **Qué:** de todo el plano de People OS se construye de principio a fin una sola función, el mapa de riesgo: baja → recálculo → propuesta → aprobación → recálculo. Arranca con los perfiles de skills ya validados.
- **Alternativas:** construir varias áreas a la vez; construir también la captura de skills como flujo.
- **Por qué:** el valor para dirección está en responder *¿dónde somos frágiles?*, y una función entera que funciona vale más que varias a medias. El resto del plano está diseñado, y se dice así.

## D-03 · Captura de skills diseñada y probada, no integrada

- **Qué:** la captura (texto libre del empleado → Claude normaliza contra la taxonomía → el manager valida) está documentada con su prompt (`prompts/normalizar-skills.md`) y ejemplos, y probada en un workflow aparte (`flujos/n8n/test-captura-skills.json`). No forma parte del recorrido de la demo.
- **Alternativas:** formulario y flujo de captura completos dentro de la demo.
- **Por qué:** responde a "¿de dónde salen los datos?" sin desviar el recorrido principal, que necesita perfiles ya validados para enseñar el riesgo.

## D-04 · Orquestador: n8n

- **Qué:** el orquestador es **n8n** (cloud). Se eligió con una prueba real: el workflow `flujos/n8n/test-captura-skills.json` (formulario → Claude normaliza contra la taxonomía del repo → filas pendientes de validar) funcionó con el primer ejemplo.
- **Alternativas:** Make, más conocido por quien lo iba a montar y con menos riesgo, pero con el cálculo en fórmulas de Sheets.
- **Por qué:** se decidió con una prueba y no con una opinión. Los workflows de n8n son JSON versionable en el repo y tiene nodo de código, así que el cálculo es el mismo código verificado (`npm run verificar`) y no una segunda implementación en fórmulas.
- **Dato de la prueba:** Claude propuso niveles más prudentes que el ejemplo del prompt y en ambos casos dejó una pregunta para el manager. Refuerza el diseño: la IA propone, el manager valida.

## D-05 · Empresa ficticia "Acme"

- **Qué:** la empresa se llama Acme: una fintech cripto española regulada, ficticia.
- **Alternativas:** usar el nombre de una empresa real como referencia.
- **Por qué:** con un nombre ficticio no se puede confundir con datos reales de nadie, y es coherente con que todos los datos sean inventados. El sector (cripto, regulado) da casos de riesgo creíbles: custodia, AML/KYC, seguridad.

## D-06 · Columnas añadidas a `empleados.csv`

- **Qué:** `genero` y `meses_con_manager_actual`.
- **Alternativas:** no usarlas y dejar fuera la brecha retributiva y la señal de cambio de manager.
- **Por qué:** `genero` hace falta para revisar la brecha en la revisión salarial (directiva de transparencia retributiva). `meses_con_manager_actual` alimenta la señal S5 (cambio de contexto). Ninguna se usa para calcular el semáforo.

## D-07 · Planes de backup en un archivo propio (`planes-backup.csv`)

- **Qué:** un "backup en desarrollo" es una fila activa en `planes-backup` (persona, skill, función, formación, fechas, estado). Aprobar una alerta crea esa fila.
- **Alternativas:** una columna `backup_en_desarrollo` en `skills-empleados`.
- **Por qué:** el plan tiene fechas, formación y estado propios, y se ve qué alerta lo originó. Es lo que escribe la aprobación, lo que lee el recálculo y lo que persigue el seguimiento.

## D-08 · La cobertura cuenta a toda la compañía, no solo al área

- **Qué:** una persona cubre una skill sea cual sea su área.
- **Alternativas:** contar solo a las personas del área de la función.
- **Por qué:** es lo que permite descubrir **key people ocultas**, que son dependencias entre áreas (por ejemplo, el reporting AML de Compliance depende de una analista de Producto). Contar solo dentro del área las escondería.

## D-09 · Semáforo calculado por skill; la función toma el peor

- **Qué:** cada skill requerida tiene su propio semáforo y la función toma el peor.
- **Alternativas:** aplicar la regla solo a la cobertura mínima de la función.
- **Por qué:** con dos skills a cobertura 1, un único plan de backup no debe dejar la función en ámbar. Y es fácil de explicar: "el eslabón más débil".

## D-10 · Un solo motor de cálculo, en el repo (`calculo/`)

- **Qué:** `calculo/cobertura.js` implementa las reglas, `npm run verificar` comprueba que los datos producen los casos de la demo, y el mismo código va dentro de los nodos de n8n.
- **Alternativas:** construir el cálculo directamente en Sheets o en el orquestador.
- **Por qué:** una sola versión de la lógica, probada antes de cada cambio. Si mañana el orquestador no es n8n, el motor sirve igual.

## D-11 · "Formación completada" sin hoja nueva

- **Qué:** el plan de backup pasa a `estado = completado` cuando el manager valida el nuevo nivel en `skills-empleados`. No hay una hoja `formacion`.
- **Alternativas:** una hoja `formacion` aparte con el avance de cada curso.
- **Por qué:** una hoja menos que mantener y explicar. El plan ya tiene su formación asociada (`formacion_id`). Lo que cambia el semáforo es la **validación del manager**, no el curso: completar un curso no equivale a tener la skill.

## D-12 · El ciclo completo también en local (`npm run demo`)

- **Qué:** `calculo/demo.js` ejecuta en local todo el recorrido (baja → recálculo → propuesta → alertas → email → aprobación → seguimiento → validación → centinela), con el estado en `salidas/demo/`.
- **Alternativas:** depender solo de n8n para ver el proceso.
- **Por qué:** el proceso se puede comprobar sin orquestador, sin red y sin claves. Con `ANTHROPIC_API_KEY` redacta Claude; sin ella, la propuesta sale por reglas.

## D-13 · Acme a escala real (~160 personas)

- **Qué:** la estructura de Acme se inspira en una fintech cripto española regulada (no se nombra) y la plantilla tiene 160 personas. Las 46 que sostienen los casos de la demo están hechas a mano; las otras 114 se generan con `npm run plantilla` (semilla fija), con topes de nivel en las skills de los casos.
- **Alternativas:** una plantilla pequeña; generar las 160 desde cero.
- **Por qué:** la escala tiene que ser realista. Con 160 personas el umbral de anonimato (n ≥ 5) se puede aplicar de verdad: Custodia o Seguridad se pueden mostrar solas. Los topes mantienen intactos los casos (mismos colores, mismas key people), y `npm run verificar` lo comprueba. Además refuerza el mensaje: más personas no significa más cobertura.

## D-14 · Lente AI first sobre el mismo mapa

- **Qué:** tres skills de IA transversales (uso diario, automatización, criterio) medidas para toda la plantilla; un campo `impacto_ia` por función; y una regla: en rojo con impacto alto, la respuesta es **rediseñar con IA y recualificar**, no formar un backup. Salida: madurez IA por área (hoja `madurez-ia`).
- **Alternativas:** un sistema aparte para el plan AI first; que la IA decida en cada caso si rediseñar o cubrir.
- **Por qué:** el plan AI first necesita una línea base y criterio para formar y rediseñar, y el mapa de skills ya es ese instrumento: un modelo, no dos. La regla es explícita y la aplica el cálculo, coherente con "el riesgo se calcula, no se opina". Las skills de IA no son todavía requisito de ninguna función, para no mover el semáforo sin una decisión de dirección. Cautela: `impacto_ia` describe funciones, no personas.

## D-15 · Vacante con dos opciones: buscar fuera o mover dentro

- **Qué:** tras una baja, el sistema calcula el perfil del puesto que queda libre y propone dos opciones excluyentes en `alertas` (columna `grupo`): A, buscar fuera; B, mover al mejor candidato interno, con sus brechas, la formación que las cierra y el coste organizativo. Aprobar la B cambia rol, manager y equipo en `empleados` y abre planes de formación.
- **Alternativas:** solo recomendar contratar; dejar que la IA elija el candidato; una única recomendación.
- **Por qué:** cubrir un puesto es una decisión de People y dirección, no del sistema. Presentar dos opciones con datos (encaje, brechas, coste de mover a alguien que ya es key person) es lo que hace útil el mapa para decidir. El candidato y sus brechas los calcula una regla; la IA solo redacta. Un mentoring no se propone si nadie cubre ya la skill.

## D-16 · El código de n8n sale del repo

- **Qué:** los workflows de n8n no se editan en el lienzo: los genera `npm run n8n` a partir del motor (`calculo/`) y de `flujos/n8n/src/`. Las definiciones, las reglas y los prompts se leen en cada ejecución de `salidas/n8n/definiciones.json`, servido por GitHub. La baja entra por un formulario y People aprueba con un enlace.
- **Alternativas:** construir los flujos a mano en n8n (dos versiones de la lógica que se desincronizan); disparar con cambios en el Sheet (el disparador de Google Sheets consulta cada minuto).
- **Por qué:** una sola versión del cálculo, verificada (`npm run verificar`) y probada dentro de los nodos (`npm run probar-n8n`). Cambiar una regla es editar `definiciones/`, no rehacer un flujo (D-01). Formulario y enlace responden al instante.

## D-17 · Un agente de Claude Code para el control de calidad del repo

- **Qué:** `auditor-demo` (`.claude/agents/`) ejecuta las pruebas, comprueba que los archivos generados y GitHub están al día, compara las cifras que citan los documentos con `npm run cifras`, revisa privacidad y coherencia entre documentos y código, y devuelve una lista priorizada. El auditor de procesos de RRHH queda diseñado en `agentes/`.
- **Alternativas:** revisar a mano después de cada cambio.
- **Por qué:** con una persona orquestando, el control de calidad también se orquesta. Solo lee (no arregla ni sube nada) y no calcula cifras: las compara con la salida del motor, para no inventar.

## D-18 · Dos historias en n8n: "se va Elena" y "tres meses después"

- **Qué:** el recorrido se cuenta en dos historias. **Escenario 1 · Baja de Elena:** la baja recalcula y propone; People aprueba (escenario 1b, D-26). **Escenario 2 · Actualización de skill:** el manager valida un nivel nuevo → se completa el plan → recálculo → email de cierre (gestión de claves de ámbar a verde).
- **Alternativas:** un solo flujo largo; flujos sin aprobación humana.
- **Por qué:** se entiende como dos momentos del negocio, sin perder la decisión de People ni el paso a verde. `npm run probar-n8n` repite el recorrido dos veces seguidas para comprobar que se puede reiniciar.

## D-19 · Un email a People: lo de dirección arriba, lo confidencial aparte

- **Qué:** cada baja genera **un solo email a People**: arriba, el resumen que podría ver dirección (sin señales individuales ni salarios); abajo, en un bloque aparte, lo confidencial y los botones *Aprobar*. El HRIS se escribe hoja por hoja, por su clave (`id`, `alerta_id`, `plan_id`, `funcion_id`).
- **Alternativas:** dos emails separados; un solo resumen sin bloque confidencial.
- **Por qué:** People decide con toda la información en un sitio, y lo que puede reenviar a dirección está ya separado de lo que no. Bandas, encuesta y prompts van en `definiciones.json` porque no cambian en la demo.

## D-20 · Vídeo de la demo con un reproductor alimentado por el motor

- **Qué:** quien recibe la demo ve primero un vídeo y después la prueba por su cuenta (D-22). El vídeo se graba sobre `video/reproductor.html`, que recorre la historia en 9 escenas (de qué es People OS al cierre) con un panel *¿Qué ha pasado por debajo?* (datos, reglas, cálculo). Sus datos los genera `npm run video` ejecutando el ciclo de `calculo/demo.js` con el mismo motor que n8n; también lee de los JSON de n8n los nodos y los formularios. Cada pantalla se etiqueta como resultado real, representación visual o mapa de procesos.
- **Alternativas:** grabar n8n, el Sheet y Gmail (cuatro herramientas y saltos de pantalla, la arquitectura no se ve); una presentación con capturas (sin ejecución).
- **Por qué:** quien recibe la demo tiene que entender, sin nadie delante, qué pasa y por qué. Un único HTML sin dependencias, con las cifras sacadas del motor y no escritas a mano, no puede contradecir a la demo real. Límite: el texto de la propuesta en el vídeo es el de reglas (sin API); en n8n lo redacta Claude con los mismos datos, y la pantalla lo dice.

## D-21 · Automatizaciones con calendario: seguimiento de planes y centinela

- **Qué:** el escenario 3 tiene dos automatizaciones que arrancan con el calendario, no con un clic. **Seguimiento de planes** (cada lunes): cuando un plan de backup llega a su fecha, escribe al manager con el formulario de validación rellenado, le recuerda a los 7 días y, tras 2 avisos, abre una alerta para People; su estado vive en `planes-backup` (`avisos`, `ultimo_aviso`). **Centinela** (día 1 de cada mes): recalcula, guarda la foto, detecta funciones frágiles y desde cuándo, validaciones de más de 6 meses y decisiones pendientes, y envía el informe para dirección (Claude con `prompts/informe-direccion.md`; por reglas si falla) con un bloque aparte solo para People. Un formulario las lanza con una fecha simulada para la demo. Umbrales en `reglas.yaml` (D-23), lógica en `calculo/automatizaciones.js`.
- **Alternativas:** dejar que alguien se acuerde de perseguir a los managers y de revisar el mapa cada mes; resolverlo con un agente (no determinista donde hace falta una regla).
- **Por qué:** cierran los huecos reales del proceso: nadie persigue a los managers para validar, y nadie mira cada mes si algo se degrada en silencio. Deciden **cuándo** actuar y **qué** detectar con reglas; no suben niveles, no cierran planes y no cuentan a dirección señales individuales.

## D-22 · La demo se prueba sin instalar nada: panel y reinicio en n8n

- **Qué:** quien recibe la demo solo abre un enlace. El escenario 0 sirve un **panel** (`/webhook/acme-panel`) que lee el HRIS en cada visita: qué hacer ahora según el estado, mapa en vivo, key people, decisiones pendientes con su botón *Aprobar*, el asistente y una **bandeja de People** con la copia de cada email (hoja `bandeja`). El mismo escenario **reinicia** la demo desde los CSV iniciales del repo (`salidas/sheets/`). Si Gmail falla, el flujo sigue: la copia está en la bandeja.
- **Alternativas:** que la persona instale los workflows (cuenta de n8n, credenciales, copiar el Sheet: se evaluaría el manual, no el sistema); mandar los emails a la dirección que escriba en un formulario (depende de su buzón y del spam); una web aparte con su propio estado (podría contradecir al HRIS).
- **Por qué:** tiene que funcionar sin nadie delante. El panel no calcula nada: enseña lo que ya está en el HRIS, así que no puede contradecir a los flujos. La bandeja quita la dependencia de un buzón y deja ver lo que llega a People y a los managers. Riesgos asumidos y avisados en el panel: los enlaces son públicos y dos personas a la vez comparten datos (se arregla con *Reiniciar*).

## D-23 · Las reglas son datos: `definiciones/reglas.yaml`

- **Qué:** el semáforo (una lista de condiciones que se evalúan en orden: verde si cobertura ≥ objetivo; ámbar si ≥ 2, o 1 con backup en desarrollo; si no, rojo), la prioridad (puntos y niveles P1-P4), la regla de rediseño con IA, quién es key person y cuándo es oculta, las señales de rotación, el anonimato, la vacante y los umbrales de las automatizaciones están en `definiciones/reglas.yaml`. El motor los lee de ahí; n8n, de `definiciones.json`. `npm run verificar` comprueba que cambiar una regla del YAML cambia el resultado sin tocar el motor.
- **Alternativas:** umbrales como constantes en el código, documentados aparte; un lenguaje de reglas general o expresiones evaluadas (más potente, más difícil de leer y de auditar).
- **Por qué:** "cambiar una regla es editar un archivo" tiene que ser literal. Un YAML pequeño, con las condiciones en el orden en que se aplican, lo puede leer y cambiar People, y el motor solo lo interpreta. Los `.md` de `definiciones/` explican qué significa cada regla y por qué.

## D-24 · Un adaptador para el HRIS

- **Qué:** un subworkflow **HRIS · Google Sheets** es lo único que habla con el sistema de registro, con tres operaciones: **leer** (todas las hojas y el enlace al HRIS), **escribir** (cada fila a su hoja por su clave) y **cargar** (vaciar y escribir, para el reinicio). Los escenarios lo llaman con un nodo *Execute Workflow* y no tienen nodos de Google Sheets; el ID del Sheet solo está en el adaptador. `probar-n8n` comprueba que ningún escenario habla con Sheets.
- **Alternativas:** nodos de Sheets en cada escenario (cambiar de HRIS sería tocarlos todos); una API intermedia propia (otra pieza que mantener).
- **Por qué:** pasar a Factorial o Bizneo es reescribir los nodos de lectura y escritura de un solo subworkflow, manteniendo las tres operaciones y la forma de lo que devuelven. Los escenarios no cambian.

## D-25 · Un agente, acotado: el Asistente de People

- **Qué:** escenario 4. People pregunta en lenguaje natural; Claude decide qué herramientas usar (`consultar_mapa`, `buscar_persona`, `simular_baja`, `candidatos_para_funcion`, `madurez_ia`, en `calculo/asistente.js`), en hasta 4 vueltas, y responde. La página enseña qué ha consultado y qué devolvió el motor. Solo lee; ninguna herramienta devuelve salarios, bandas, evaluaciones ni señales, y el prompt (`prompts/asistente-people.md`) manda negarse a estimar quién se va a ir. El bucle está desplegado en nodos (Claude razona → Herramientas → ¿sigue?) para que sea visible y se pueda probar sin la API. El vocabulario está fijado (`CLAUDE.md` §3): **automatización con reglas**, **IA que redacta** y **agente**.
- **Alternativas:** no tener ningún agente; el nodo *AI Agent* de n8n (menos visible y más difícil de probar sin n8n); dar al agente herramientas que escriban (más vistoso y peligroso).
- **Por qué:** el razonamiento del modelo se pone donde aporta y donde no se decide sobre nadie: consultar y explicar. Lo que fija riesgos sigue siendo una regla auditable. Riesgos asumidos: respuestas no deterministas (las cifras sí lo son) y una pieza más que depende de la API; si falla, lo dice.

## D-26 · El botón Aprobar, en su propio workflow (escenario 1b)

- **Qué:** el escenario 1 tiene el formulario de baja (recalcula, propone y envía el email a People) y el botón *Aprobar* es un workflow propio, **1b · Aprobar decisión**, con la misma lectura y escritura a través del HRIS y la URL `/webhook/acme-aprobar`.
- **Alternativas:** las dos entradas en un workflow, respondiendo al botón sin página (se pierde la vuelta al panel).
- **Por qué:** n8n no admite un nodo *Respond to Webhook* en un workflow que tiene un *Form Trigger*. Separarlos es lo más simple y cada workflow cuenta una sola cosa en el lienzo. `probar-n8n` comprueba que no se mezclan.

## D-27 · La arquitectura se ve desde la demo, y lo que falta para producción, también

- **Qué:** el panel enseña el **estado del montaje** (HRIS conectado, columnas del seguimiento, URLs de los formularios), abierto solo si algo falla, y una sección **«Qué hay detrás»** con las seis capas y cómo sería cada una en producción. Cada workflow lleva en el lienzo una nota gris **«En producción»**, generada desde `calculo/exportar-n8n.js`. `docs/produccion.md` lo reúne. `probar-n8n` comprueba que las notas y la sección están.
- **Alternativas:** dejarlo solo en el README (quien prueba la demo no lo lee); implementar parte de producción (SSO, enlaces firmados) en la demo (más piezas que pueden fallar cuando alguien la prueba solo).
- **Por qué:** la demo tiene atajos a propósito, y conviene que se vea que son atajos y no la arquitectura. Quien la prueba ve en el mismo sitio lo que funciona y lo que cambiaría.

## D-28 · Los workflows se despliegan desde el repo, por la API de n8n

- **Qué:** `npm run desplegar` (`calculo/desplegar-n8n.js`) crea o actualiza los siete workflows por la API pública de n8n, en orden (el HRIS primero), rellena cada Configuración, asigna las credenciales, los activa y comprueba que los formularios y el panel responden. `npm run ensayar` recorre después la demo entera en la instancia real y comprueba el panel en cada paso. La URL y la clave de la instancia las guarda la CLI oficial (`@n8n/cli login`) en el perfil del usuario; el ID del Sheet y el email, un `.n8n-demo.json` fuera de Git. El montaje a mano está documentado como alternativa.
- **Alternativas:** importar a mano (siete archivos y unas quince URLs e IDs que copiar de un sitio a otro); un paquete `.n8np` de la CLI (solo se genera exportando desde una instancia ya montada y llevaría dentro datos que no pueden ir en un repo público).
- **Por qué:** casi todo lo que se pegaría a mano se puede calcular (las URLs de los formularios salen de su `webhookId`, la de Aprobar de su ruta), y lo que no (el ID del HRIS) lo devuelve la API al crearlo. Es como se haría en producción: el repo manda y n8n se despliega desde él.
