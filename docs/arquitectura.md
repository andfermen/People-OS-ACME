# Arquitectura

## Principio

**Separar QUÉ se hace (definiciones y reglas) de QUIÉN lo ejecuta (orquestador)** (D-01). Cambiar un umbral o la criticidad de una función es editar un archivo, no rehacer un flujo.

## Capas

| Capa | Qué contiene | Dónde | Quién la cambia |
|---|---|---|---|
| Definiciones | Taxonomía, funciones y criticidad, reglas, catálogo, prompts | Repo: `definiciones/`, `prompts/` | People |
| Datos | Empleados, skills, bandas, planes de backup, encuesta agregada | Google Sheets (origen: `datos/`) | People y managers |
| Cálculo | Cobertura, semáforo, key people, candidatos, señales | `calculo/cobertura.js` (referencia) → nodo de código de n8n (D-04) | Nadie a mano: es **determinista** |
| Ejecución | Disparadores, recálculo, alertas, emails | n8n (D-04) | — |
| Inteligencia | Normalizar skills, proponer acciones, informe | API de Claude | — |
| Visualización | Mapa de calor, key people, vistas de uso | Hoja `cobertura` con formato condicional | — |

## Flujo principal

```mermaid
flowchart LR
  A[Cambio en la plantilla<br/>baja · cambio de rol · backup aprobado] --> B[Recalcular<br/>cobertura · semáforo · key people]
  B --> C{¿Empeora frente a<br/>historico-semaforo?}
  C -- no --> H[Guardar foto]
  C -- sí --> D[Candidatos a backup<br/>formación · señales]
  D --> E[Claude propone acciones<br/>prompts/proponer-acciones.md]
  E --> F[Email a dirección<br/>+ fila en alertas]
  F --> G[People decide<br/>en hoja alertas]
  G -- aprobada --> P[Fila en planes-backup]
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
| 6 Aviso | Orquestador | — | `alertas` (pendiente), email |
| 7 Decisión | **Humano** | `alertas` | `alertas.decision` |
| 8 Ciclo | Orquestador | `alertas` | `planes-backup` → vuelve al paso 1 |

Segundo disparador: mensual → mismo cálculo → `prompts/informe-direccion.md` → email a dirección.

## Dónde está la IA y dónde no

- **Sí:** convertir texto en datos (captura) y datos en texto (propuestas, informe).
- **No:** el riesgo. Semáforo, prioridad y key people salen de reglas que se pueden leer en `definiciones/reglas-semaforo.md` y comprobar con `npm run verificar`. Si el CEO pregunta "¿por qué está en rojo?", la respuesta es una regla, no una opinión del modelo.

## Quién ve qué

| Rol | Ve |
|---|---|
| Empleado | Su perfil de skills |
| Manager | Su equipo y el semáforo de sus funciones. **Nunca** señales de rotación |
| Dirección | Mapa completo, key people, propuestas (sin señales individuales) |
| People | Todo, incluida la hoja `senales-rotacion-PEOPLE` |

En la demo, el control de acceso se representa con una hoja protegida. En producción: archivos separados y permisos por rol (fuera de alcance, §12).
