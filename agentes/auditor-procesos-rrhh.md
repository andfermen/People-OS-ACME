# Auditor de procesos de RRHH · propuesta

Adaptación del agente genérico de auditoría de procesos de pymes al 360º de RRHH de Acme. Responde a la pregunta de escalado del CEO: **"¿y cómo añades el siguiente proceso?"** (`docs/escalado.md`).

## Qué haría

Andrea describe cómo se hace hoy un proceso (onboarding, evaluación del desempeño, offboarding, revisión salarial…) con notas o un texto libre. El agente devuelve:

1. **Mapa del proceso actual**, paso a paso.
2. **Cuellos de botella**, con impacto alto/medio/bajo.
3. **Encaje en People OS:** qué pasos son **regla** (se calculan), cuáles **IA** (capturar o redactar), cuáles **humanos** (decidir o conversar), siguiendo el mapa de `docs/vision-procesos-rrhh.md`.
4. **Qué reutiliza:** el registro único de personas, el mapa de skills, el orquestador, los emails. Qué hay que añadir: hojas, definiciones, prompts.
5. **MVP de 3-5 días** con criterio de éxito, y el **caso de demo** que lo probaría (como `npm run verificar`).
6. **Qué falta validar** con quien hace hoy el proceso.

## Diferencias con el agente genérico

| Genérico (pymes) | People OS |
|---|---|
| Tres niveles de automatización (no-code, script, a medida) | Un solo camino: el de la arquitectura actual (definiciones en el repo, n8n, Claude). Simple > sofisticado |
| Cualquier proceso | Solo RRHH, con las reglas de privacidad del proyecto (n ≥ 5, sin puntuar personas, AI Act) |
| Propuesta para un cliente | Plan para añadir el proceso al sistema existente sin rehacer lo que funciona |

## Reglas

- No inventa datos del proceso: lo que no está en la descripción va a "qué falta validar".
- Ninguna decisión sobre personas pasa a la IA: si un paso lo exige, lo marca como humano.
- Una propuesta cada vez: no genera documentos sin que Andrea apruebe el anterior.

## Esfuerzo y riesgo

- **Esfuerzo:** medio día (definición del agente + una prueba con el onboarding de CLAUDE.md §8).
- **Riesgo en directo:** ninguno: no forma parte de la demo.
- **Recomendación:** construirlo después del viernes, o enseñarlo en el bloque de escalado si sobra tiempo, aplicado al onboarding.
