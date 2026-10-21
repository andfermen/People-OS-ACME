# Agentes · propuesta

Tres agentes que encajan en People OS. Comparten la regla del sistema: **la IA lee, propone y redacta; no decide sobre personas ni calcula el riesgo** (eso lo hacen las reglas de `definiciones/`).

| Agente | Para qué | Dónde vive | Estado |
|---|---|---|---|
| [Auditor de la demo](auditor-demo.md) | Encontrar antes del ensayo lo que fallaría o no cuadraría delante del CEO | Claude Code: `.claude/agents/auditor-demo.md` | **Construido** |
| [Asistente de People](asistente-people.md) | Responder preguntas en lenguaje natural sobre el mapa: "¿dónde somos frágiles?", "¿quién puede cubrir a Elena?" | n8n + API de Claude, sobre el Sheet | Propuesta |
| [Auditor de procesos de RRHH](auditor-procesos-rrhh.md) | Analizar cómo se hace hoy un proceso de RRHH y proponer cómo meterlo en el sistema | Claude Code: `.claude/agents/` | Propuesta |

## Por qué solo uno construido antes del viernes

El auditor protege la demo y no sale en ella: no añade riesgo en directo. Los otros dos son piezas nuevas: el asistente, dentro de la demo; el auditor de procesos, como herramienta para escalar. Se presentan como **siguiente paso** con su diseño, igual que la captura de skills (D-03).

## Cómo se usa el auditor

En Claude Code, dentro del proyecto: *"usa el agente auditor-demo"* o *"audita la demo antes del ensayo"*. Devuelve 🔴 bloqueantes, 🟡 a revisar y 🟢 comprobado, con qué hacer en cada caso. Se apoya en `npm run cifras`, que imprime las cifras que citan el guion y el plan calculadas con el motor, para comparar sin inventar.
