# Registro de decisiones

Formato: qué se decide, alternativas consideradas y por qué.

---

## D-01 · Separar definiciones (qué) de ejecución (quién)

- **Qué:** las reglas, umbrales, funciones, taxonomía y prompts viven en archivos del repo. El orquestador (Make o n8n) solo ejecuta.
- **Alternativas:** meter la lógica dentro de los flujos del orquestador.
- **Por qué:** para cambiar un umbral del semáforo o la criticidad de una función basta con editar un archivo, sin rehacer flujos. Las reglas se pueden leer, auditar y versionar. Además, el orquestador se puede cambiar sin perder la lógica.

## D-02 · Demo centrada en el riesgo, con perfiles precargados

- **Qué:** la demo arranca con los perfiles de skills ya validados y enseña el flujo de riesgo de principio a fin: baja → recálculo → propuesta → aprobación → recálculo.
- **Alternativas:** construir también la captura de skills como flujo en directo.
- **Por qué:** el valor para el CEO está en responder *¿dónde somos frágiles?* Con poco tiempo, un flujo completo que funcione vale más que dos a medias. Y la demo en directo depende de menos piezas.

## D-03 · Captura de skills explicada, no construida

- **Qué:** la captura (texto libre del empleado → Claude normaliza contra la taxonomía → el manager valida) se documenta con el prompt `prompts/normalizar-skills.md` y 2-3 ejemplos. No se construye como flujo.
- **Alternativas:** formulario y flujo de captura completos.
- **Por qué:** responde a "¿de dónde salen los datos?" sin restar tiempo al flujo central. Si sobra tiempo el jueves, se enseña un ejemplo en directo.

## D-04 · Make o n8n: pendiente

- **Qué:** el orquestador se elige el miércoles a mediodía, tras una prueba de 1 hora (formulario → Claude normaliza → Sheet).
- **Alternativas:** n8n (encaja con el enunciado, los workflows son JSON versionable y tiene nodo de código; es una herramienta nueva) o Make (Andrea lo domina, menos riesgo; el cálculo iría en fórmulas de Sheets).
- **Por qué:** se decide con una prueba real y no con una opinión. Si n8n funciona en ~1 h, n8n. Si no, Make.

## D-05 · Empresa ficticia "Acme"

- **Qué:** la empresa de la demo se llama Acme: una fintech cripto española regulada, ficticia.
- **Alternativas:** usar el nombre de una empresa real como referencia.
- **Por qué:** con un nombre ficticio no se puede confundir con datos reales de nadie. Es coherente con que todos los datos sean inventados y evita problemas de marca en la presentación. Mantenemos el sector (cripto, regulado) porque da casos de riesgo creíbles: custodia, AML/KYC, seguridad.

## D-06 · Columnas añadidas a `empleados.csv`

- **Qué:** se añaden `genero` y `meses_con_manager_actual`.
- **Alternativas:** no usarlas y dejar fuera la brecha retributiva y la señal de cambio de manager.
- **Por qué:** `genero` hace falta para revisar la brecha en la revisión salarial (directiva de transparencia retributiva). `meses_con_manager_actual` alimenta la señal S5 (cambio de contexto). Ninguna se usa para calcular el semáforo.

## D-07 · Planes de backup en un archivo propio (`planes-backup.csv`)

- **Qué:** un "backup en desarrollo" es una fila activa en `planes-backup` (persona, skill, función, formación, fechas, estado). Aprobar una alerta crea esa fila.
- **Alternativas:** una columna `backup_en_desarrollo` en `skills-empleados`.
- **Por qué:** el plan tiene fechas, formación y estado propios, y se ve qué alerta lo originó. Es el registro que el paso 8 del flujo escribe y que el recálculo lee.

## D-08 · La cobertura cuenta a toda la compañía, no solo al área

- **Qué:** una persona cubre una skill sea cual sea su área.
- **Alternativas:** contar solo a las personas del área de la función.
- **Por qué:** es lo que permite descubrir **key people ocultas**, que son dependencias entre áreas (por ejemplo, el reporting AML de Compliance depende de una analista de Producto). Contar solo dentro del área las escondería.

## D-09 · Semáforo calculado por skill; la función toma el peor

- **Qué:** cada skill requerida tiene su propio semáforo y la función toma el peor.
- **Alternativas:** aplicar la regla solo a la cobertura mínima de la función.
- **Por qué:** con dos skills a cobertura 1, un único plan de backup no debe dejar la función en ámbar. Además, para la demo es más fácil de explicar: "el eslabón más débil".

## D-10 · Motor de cálculo de referencia en JavaScript (`calculo/`)

- **Qué:** `calculo/cobertura.js` implementa las reglas tal y como están escritas. `npm run verificar` comprueba que los datos producen los casos de la demo.
- **Alternativas:** construir el cálculo directamente en Sheets o en el orquestador, sin referencia.
- **Por qué:** permite comprobar los datos y las reglas antes de construir el flujo y detectar errores antes del ensayo. Con n8n, el mismo código va en el nodo de código. Con Make, sirve para comprobar que las fórmulas de Sheets dan el mismo resultado. La decisión de D-04 sigue abierta.

## D-11 · "Formación completada" sin hoja nueva

- **Qué:** para el flujo opcional (nueva skill adquirida), el plan de backup pasa a `estado = completado` en `planes-backup` cuando el manager valida el nuevo nivel en `skills-empleados`. No se crea una hoja `formacion`.
- **Alternativas:** una hoja `formacion` aparte con el avance de cada curso.
- **Por qué:** una hoja menos que mantener y explicar. El plan ya tiene su formación asociada (`formacion_id`). Lo que cambia el semáforo es la **validación del manager**, no el curso: completar un curso no equivale a tener la skill.

## D-12 · Demo local como plan B (`npm run demo`)

- **Qué:** `calculo/demo.js` ejecuta en local los pasos 1-8 y el opcional (baja → recálculo → propuesta → alertas → email → aprobación → recálculo → validación → verde), con el estado en `salidas/demo/`.
- **Alternativas:** plan B solo con capturas y vídeo.
- **Por qué:** si el orquestador falla en directo, el proceso se sigue viendo funcionar de verdad. Con `ANTHROPIC_API_KEY` redacta Claude; sin ella, una propuesta por reglas, para que la demo no dependa de la red ni de la API.

## D-13 · Acme inspirada en Bit2Me, a escala real (~160 personas)

- **Qué:** Acme sigue siendo ficticia (D-05), pero su estructura se inspira en Bit2Me y la plantilla pasa de 46 a 160 personas. Las 46 hechas a mano se conservan; las otras 114 se generan con `npm run plantilla` (semilla fija), con topes de nivel en las skills de los casos de la demo.
- **Alternativas:** quedarse en 46 personas; generar las 160 desde cero.
- **Por qué:** el CEO tiene que reconocer la escala de su compañía, y con 160 el umbral de anonimato (n ≥ 5) es realista: Custodia o Seguridad ya se pueden mostrar solas. Conservar las 46 y poner topes mantiene intactos los casos de la demo: el mapa de riesgo sale igual (mismos colores, mismas 5 key people), y `npm run verificar` lo comprueba. Además refuerza el mensaje: más personas no significa más cobertura.

## D-14 · Lente AI first sobre el mismo mapa

- **Qué:** tres skills de IA transversales (uso diario, automatización, criterio) medidas para toda la plantilla; un campo `impacto_ia` por función; y una regla: en rojo con impacto alto, la respuesta es **rediseñar con IA y recualificar**, no formar un backup. Nueva salida: madurez IA por área (hoja `madurez-ia`).
- **Alternativas:** un sistema aparte para el plan AI first; que la IA decida en cada caso si rediseñar o cubrir.
- **Por qué:** el plan AI first necesita una línea base y criterio para formar y rediseñar, y el mapa de skills ya es ese instrumento: un modelo, no dos. La regla es explícita y la aplica el cálculo, coherente con "el riesgo se calcula, no se opina". Las skills de IA no son todavía requisito de ninguna función, para no mover el semáforo sin una decisión de dirección. Caso de demo: el reporting AML (CMP-04), que depende de Lucía. Cautela: `impacto_ia` describe funciones, no personas; solo lo ven dirección y People.

## D-15 · Vacante con dos opciones: buscar fuera o mover dentro

- **Qué:** tras una baja, el sistema calcula el perfil del puesto que queda libre y propone dos opciones excluyentes en `alertas` (columna `grupo`): A, buscar fuera; B, mover al mejor candidato interno, con sus brechas, la formación que las cierra y el coste organizativo. Aprobar la B cambia rol, manager y equipo en `empleados` y abre planes de formación. Junto a la decisión siguen el backup de Javier y la conversación de permanencia.
- **Alternativas:** solo recomendar contratar; dejar que la IA elija el candidato; una única recomendación en lugar de dos opciones.
- **Por qué:** cubrir un puesto es una decisión de People y dirección, no del sistema. Presentar dos opciones con datos (encaje, brechas, coste de mover a alguien que ya es key person) es lo que hace útil el mapa para decidir. El candidato y sus brechas los calcula una regla; la IA solo redacta. Es la salida "movilidad interna" de CLAUDE.md §5. Nueva regla: un mentoring no se propone si nadie cubre ya la skill (FOR-03 lo daba Elena).
