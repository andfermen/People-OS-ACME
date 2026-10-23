# Reglas de las automatizaciones con calendario

> Dos automatizaciones que actúan **sin que nadie pulse nada** (D-21). Deciden **cuándo** actuar y **qué** detectar con reglas explícitas; **nunca deciden sobre una persona**: no suben niveles, no cierran planes, no aprueban acciones. No son agentes en sentido estricto: no razonan, aplican reglas (el agente es el asistente, D-25). Los valores ✏️ se cambian en `definiciones/reglas.yaml` (`automatizaciones`).
> Ejecución: escenario 3 de n8n (`flujos/n8n/E3-automatizaciones-calendario.json`). En local: `npm run demo -- seguimiento|centinela [fecha]`.

## Qué hace solo y qué no

| | Lo hace la automatización, sola | Lo decide una persona |
|---|---|---|
| **Seguimiento de planes** | Detectar que un plan ha llegado a su fecha, escribir al manager, recordar, abrir una alerta para People | Validar el nivel (manager); replantear o cerrar el plan (People) |
| **Centinela de riesgo** | Recalcular el mapa, detectar degradaciones y pendientes, redactar el informe para dirección (Claude) | Qué hacer con lo detectado (People y dirección) |

## 1. Seguimiento de planes de backup

**Cuándo:** cada lunes a las 8:00.

| Regla | Valor ✏️ |
|---|---|
| Fecha de revisión de un plan | `fecha_objetivo`; si no tiene, `fecha_inicio` + semanas de su formación (`catalogo-formacion.yaml`) |
| Primer aviso al manager | El lunes en que hoy ≥ fecha de revisión y el plan sigue `activo` |
| Recordatorio | Si han pasado **7 días** desde el último aviso y el nivel sigue sin validarse |
| Escalado a People | Tras **2 avisos** sin validar: alerta `seguimiento` en la hoja `alertas` (`grupo = SEG-<plan>`) y email a People |
| Sin manager activo | Si el manager de la persona ya no está (por ejemplo, Elena tras su baja), no hay a quién avisar: escala directamente a People |
| Después de escalar | No vuelve a avisar: el plan lo lleva People |
| Plan validado | Sale solo: el escenario 2 lo marca `completado` al validar el nivel objetivo |

- El aviso lleva el **formulario del escenario 2 rellenado** (persona, skill, nivel objetivo, manager). El manager confirma o no; la automatización no sube niveles.
- El estado del seguimiento vive en `planes-backup`: `avisos` y `ultimo_aviso`.

## 2. Centinela de riesgo

**Cuándo:** el día 1 de cada mes a las 8:00. Es el "segundo disparador" del flujo principal: el calendario en lugar de un evento.

Recalcula el mapa, guarda la foto en `historico-semaforo` y detecta:

| Qué detecta | Regla ✏️ |
|---|---|
| Funciones frágiles y desde cuándo | P1 y P2, con los días que llevan en su color (racha en `historico-semaforo`) |
| Cambios que nadie ha avisado | Comparación con el último recálculo (hoja `cobertura`) |
| Validaciones caducadas | Skills validadas hace **más de 6 meses** que sostienen una función crítica o importante con cobertura ≤ objetivo. El mapa vale lo que valga la validación (README §8) |
| Planes que tocan validar | Mismas fechas que el seguimiento |
| Decisiones pendientes | Alertas `pendiente` desde hace **más de 7 días** |
| Key people con señales (solo People) | Señales de rotación con probabilidad media o alta (`reglas-senales-rotacion.md`) |

**Salida:** un email a People. Arriba, el **informe para dirección** (`prompts/informe-direccion.md`, redactado por Claude; si falla, por reglas), listo para reenviar. Abajo, **solo People**: pendientes, planes, validaciones caducadas y key people con señales. A dirección solo le llega "en seguimiento por People", nunca el porqué.

## Para la demo

El formulario **Ejecutar ahora** del escenario 3 lanza cualquiera de los dos con el tiempo simulado: **cuándo** = `hoy`, `+12`, `+13` o `+14 semanas` (+12 semanas es cuando el plan de Javier llega a su fecha), o una fecha exacta.
