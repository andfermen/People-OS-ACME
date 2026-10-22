# Agentes

Agentes que encajan en People OS. Comparten la regla del sistema: **la IA lee, propone y redacta; no decide sobre personas ni calcula el riesgo** (eso lo hacen las reglas de `definiciones/`).

## Dentro del sistema: agentes que actúan solos (D-21)

Los agentes del flujo principal (riesgo, movilidad, propuesta, skills) arrancan cuando alguien registra algo. Estos dos arrancan **con el calendario**, sin que nadie pulse nada. Actúan solos en lo operativo y nunca deciden sobre una persona. Reglas: [`definiciones/reglas-agentes.md`](../definiciones/reglas-agentes.md).

| Agente | Qué hace solo | Qué no hace | Dónde vive | Estado |
|---|---|---|---|---|
| **Seguimiento de planes** | Cada lunes: plan de backup que llega a su fecha → escribe al manager con el formulario de validación rellenado → recuerda a los 7 días → tras 2 avisos, alerta para People | Subir niveles, cerrar o cambiar planes | n8n, escenario 3 (`calculo/agentes.js`) | **Construido** |
| **Centinela de riesgo** | Día 1 de cada mes: recalcula, detecta funciones frágiles y desde cuándo, validaciones de más de 6 meses y decisiones pendientes; Claude redacta el informe para dirección | Decidir qué hacer con lo detectado; contar a dirección señales individuales | n8n, escenario 3 (`calculo/agentes.js`) | **Construido** |

## Alrededor del sistema

| Agente | Para qué | Dónde vive | Estado |
|---|---|---|---|
| [Auditor de la demo](auditor-demo.md) | Encontrar antes del ensayo lo que fallaría o no cuadraría delante del CEO | Claude Code: `.claude/agents/auditor-demo.md` | **Construido** |
| [Asistente de People](asistente-people.md) | Responder preguntas en lenguaje natural sobre el mapa: "¿dónde somos frágiles?", "¿quién puede cubrir a Elena?" | n8n + API de Claude, sobre el Sheet | Propuesta |
| [Auditor de procesos de RRHH](auditor-procesos-rrhh.md) | Analizar cómo se hace hoy un proceso de RRHH y proponer cómo meterlo en el sistema | Claude Code: `.claude/agents/` | Propuesta |

## Por qué el asistente y el auditor de procesos siguen en diseño

El auditor de la demo protege la demo y no sale en ella. El asistente es el agente más "agéntico" (el modelo elige qué consultar), pero también el más frágil para que el CEO lo pruebe solo: respuestas no deterministas y riesgo de privacidad. El auditor de procesos es una herramienta para escalar. Se presentan como **siguiente paso** con su diseño, igual que la captura de skills (D-03). Los dos agentes autónomos se construyeron antes porque reutilizan el motor y los escenarios, y sus decisiones son reglas que se pueden probar (D-21).

## Cómo se usa el auditor

En Claude Code, dentro del proyecto: *"usa el agente auditor-demo"* o *"audita la demo antes del ensayo"*. Devuelve 🔴 bloqueantes, 🟡 a revisar y 🟢 comprobado, con qué hacer en cada caso. Se apoya en `npm run cifras`, que imprime las cifras que citan el guion y el plan calculadas con el motor, para comparar sin inventar.
