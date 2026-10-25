# Asistente de People · construido (el agente)

**Dónde vive:** n8n, escenario 4 ([`flujos/n8n/E4-asistente-people.json`](../flujos/n8n/E4-asistente-people.json)), en `/webhook/acme-asistente`; se abre desde el panel. Herramientas en [`calculo/asistente.js`](../calculo/asistente.js), instrucciones en [`prompts/asistente-people.md`](../prompts/asistente-people.md) (D-25).

## Por qué es un agente y el resto no

En el resto del sistema, las reglas deciden y Claude solo redacta. Aquí **Claude decide qué hacer**: ante una pregunta elige qué herramientas usar, en qué orden y cuándo tiene bastante para responder. Las herramientas son del motor, así que **el modelo razona, pero las cifras no las pone él**.

## Qué hace

People pregunta en lenguaje natural. Por ejemplo, *"¿qué pasa si se va Carmen?"*:

1. Claude decide buscar a Carmen (`buscar_persona`) para tener su id, o va directo si ya lo tiene.
2. Decide simular su baja (`simular_baja`): qué funciones empeoran, quién pasa a ser key person y qué candidatos internos hay, con sus brechas. No se cambia nada en el HRIS.
3. Si le hace falta, mira los candidatos de la función afectada (`candidatos_para_funcion`).
4. Responde en pocas líneas, con las cifras de las herramientas y un "siguiente paso (decide People)".

La página enseña la respuesta y **cómo lo ha razonado**: cada herramienta que ha usado, con qué datos y qué le devolvió el motor.

| Herramienta | Devuelve |
|---|---|
| `consultar_mapa` | Funciones en rojo y ámbar con su prioridad y quién las sostiene; key people |
| `buscar_persona` | Rol, área, manager, skills validadas y dónde es key person |
| `simular_baja` | Qué empeora, nuevas key people, perfil del puesto y candidatos internos |
| `candidatos_para_funcion` | Skills que pide, quién la cubre, personas a un nivel (con interés) y formación |
| `madurez_ia` | Madurez IA por área, agregada (n ≥ 5) |

## Qué no hace

- **No cambia nada:** todas las herramientas leen. Para registrar una baja o aprobar, remite al panel.
- **No ve salarios, evaluaciones ni señales de rotación:** no hay herramienta que los devuelva, y el prompt manda negarse a estimar "quién se va a ir". `npm run probar-n8n` comprueba que ninguna herramienta los devuelve.
- **No decide:** propone el siguiente paso y dice que lo decide People.

## Cómo está montado

Un bucle de agente desplegado en n8n, de hasta 4 vueltas: **Claude razona k** (API de Claude con *tool use*) → **Herramientas k** (el motor ejecuta lo que pide) → **¿Sigue?** Cuando Claude responde sin pedir herramientas, sale a **Respuesta**. No usa nodos de agente de terceros: cada paso es visible en el lienzo y se puede probar sin la API (`probar-n8n` simula las respuestas de Claude).

## Límites

- **No es determinista:** qué consulta y cómo lo redacta puede variar; las cifras, no. Por eso enseña sus pasos.
- **Sin memoria entre preguntas:** cada pregunta empieza de cero.
- **Si Claude no responde**, la página lo dice y no inventa nada.
- Para ensayarlo, conviene hacer preguntas trampa: el salario de alguien, quién se va a ir. Tiene que negarse.
