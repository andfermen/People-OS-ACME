# Asistente de People · propuesta

## Qué haría

People (o dirección) pregunta en lenguaje natural y el asistente responde **leyendo el mapa ya calculado**:

- "¿Dónde somos frágiles?" → funciones en rojo y ámbar por prioridad, con la key person de cada una.
- "¿Qué pasa si se va Carmen?" → lanza el mismo cálculo que el escenario "baja" (sin escribir nada) y resume qué cambia.
- "¿Quién podría cubrir a Elena?" → la vacante y los candidatos internos que ya calcula el motor (`vacante()`), con sus brechas.
- "¿Qué área va peor en IA?" → la hoja `madurez-ia`.

## Cómo

| Pieza | Qué es |
|---|---|
| Entrada | Formulario de n8n o chat (Telegram, como el asistente de onboarding de CLAUDE.md §8) |
| Herramientas del agente | Leer `cobertura`, `key-people`, `madurez-ia`, `alertas`; simular una baja con el motor (solo lectura) |
| Modelo | API de Claude con *tool use*: el modelo elige qué herramienta llamar; las cifras salen siempre de la herramienta |
| Salida | Respuesta corta + enlace a la hoja |

## Reglas

- **No calcula el riesgo:** pregunta al motor y cita lo que devuelve. Si no hay dato, lo dice.
- **Quién ve qué:** a dirección, sin señales de rotación ni salarios; a People, también eso, marcado como confidencial. Un manager no puede preguntar por la "probabilidad de fuga" de nadie.
- **No escribe nada:** para cambiar algo (registrar una baja, aprobar) remite a W1 o a los botones del email.

## Esfuerzo y riesgo

- **Esfuerzo:** 1-2 días (workflow con agente + 4 herramientas + pruebas de privacidad).
- **Riesgo en directo:** alto a dos días de la presentación: respuestas no deterministas y otra pieza que puede fallar.
- **Recomendación:** presentarlo como siguiente paso, con este diseño. Si se construye, probar antes que una pregunta de un manager sobre señales individuales se rechaza.
