# Arquitectura

## Principio

**Separar QUÉ se hace (definiciones y reglas) de QUIÉN lo ejecuta (orquestador)** (D-01). Cambiar un umbral o la criticidad de una función es editar un archivo, no rehacer un flujo.

## Capas

| Capa | Qué contiene | Dónde | Quién la cambia |
|---|---|---|---|
| Definiciones | Reglas y umbrales (`reglas.yaml`), taxonomía, funciones y criticidad, catálogo, prompts | Repo: `definiciones/`, `prompts/` | People |
| Datos (HRIS) | Empleados, skills, planes de backup, alertas, bandeja | Google Sheets, leído y escrito solo por el subworkflow **HRIS** (adaptador, D-24) | People y managers |
| Cálculo | Cobertura, semáforo, key people, candidatos, señales, con las reglas de `reglas.yaml` | `calculo/` (referencia) → nodos de código de n8n (D-04, D-23) | Nadie a mano: es **determinista** |
| Ejecución | Disparadores (eventos y calendario), recálculo, alertas, emails, panel | n8n: adaptador HRIS + escenarios 0 a 4 (D-04) | — |
| Inteligencia | Redactar (propuestas, informe) y, en el asistente, razonar sobre qué consultar | API de Claude | — |
| Visualización | Mapa, decisiones, bandeja de emails, asistente | Panel servido por n8n (escenario 0) y el Sheet | — |

## Flujo principal

```mermaid
flowchart LR
  A[Baja · formulario E1<br/>decisión aprobada · botón E1<br/>skill validada · formulario E2] --> B[Recalcular<br/>cobertura · semáforo · key people]
  B --> C{¿Empeora frente a<br/>historico-semaforo?}
  C -- no --> H[Guardar foto]
  C -- sí --> D[Candidatos a backup · formación · señales<br/>vacante: perfil y candidatos internos]
  D --> E[Claude propone acciones<br/>prompts/proponer-acciones.md]
  E --> F[Filas en alertas<br/>email a People: resumen para dirección + botones]
  F --> G[People aprueba<br/>botón del email o del panel]
  G -- aprobada --> P[planes-backup · cambio de rol<br/>la otra opción, descartada]
  P --> A
  B --> H
```

| Paso | Tipo | Lee | Escribe |
|---|---|---|---|
| 1 Disparo | Evento | `empleados`, `alertas` | — |
| 2 Recálculo | **Regla** | todas las hojas de datos + `definiciones/` | `cobertura`, `key-people` |
| 3 Comparación | **Regla** | `historico-semaforo` | foto nueva en `historico-semaforo` |
| 4 Contexto | **Regla** | `catalogo-formacion`, señales | — |
| 5 Propuesta | **IA** | salida de 2-4 | — |
| 6 Aviso | Orquestador (escenario 1) | — | `alertas` (pendiente, con `grupo` para opciones excluyentes), un email a People (resumen para dirección + bloque confidencial con botones) |
| 7 Decisión | **Humano** | email de People o panel (enlace) | `alertas.decision` (aprobada / descartada) |
| 8 Ciclo | Orquestador (escenario 1) | `alertas` | `planes-backup`, `empleados` (si es movilidad) → recálculo |

Cómo está montado en n8n (adaptador HRIS; escenario 0 · panel y reinicio; 1 · baja de Elena; 2 · actualización de skill; 3 · automatizaciones con calendario; 4 · asistente): `flujos/n8n/LEEME.md`, D-16, D-18, D-21, D-22, D-24 y D-25.

Segundo disparador (escenario 3, D-21): el calendario. Cada lunes, el **seguimiento de planes** avisa, recuerda y escala; el día 1 de cada mes, el **centinela** recalcula, detecta degradaciones y envía el informe para dirección (`prompts/informe-direccion.md`). Reglas: `definiciones/reglas-automatizaciones.md`.

## Dónde está la IA y dónde no

- **Sí:** convertir texto en datos (captura) y datos en texto (propuestas, informe). Y razonar en un solo sitio, el **asistente** (escenario 4): Claude elige qué herramientas del motor usar; las cifras las calcula el motor.
- **No:** el riesgo. Semáforo, prioridad y key people salen de reglas que están en `definiciones/reglas.yaml` (explicadas en `reglas-semaforo.md`) y se comprueban con `npm run verificar`. Si alguien pregunta "¿por qué está en rojo?", la respuesta es una regla, no una opinión del modelo.

## Quién ve qué

| Rol | Ve |
|---|---|
| Empleado | Su perfil de skills |
| Manager | Su equipo y el semáforo de sus funciones. **Nunca** señales de rotación |
| Dirección | Mapa completo, key people, propuestas (sin señales individuales) |
| People | Todo, incluida la hoja `senales-rotacion-PEOPLE` |

En la demo, con datos ficticios, las señales están en una pestaña aparte del mismo Sheet y quien lo abra la ve. En producción: archivos separados y permisos por rol (fuera de alcance, §12). Lo que sí está construido: el resumen para dirección y los avisos a managers no llevan señales individuales ni salarios.
