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
