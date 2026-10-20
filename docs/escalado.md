# Escalado · Cómo crece el sistema

## Cambiar algo del proceso actual (sin tocar flujos)

| Quiero… | Edito | Comprobación |
|---|---|---|
| Subir el objetivo de cobertura de una función | `definiciones/funciones.yaml` → `cobertura_objetivo` | `npm run cobertura` |
| Cambiar la criticidad de una función | `funciones.yaml` → `criticidad` | `npm run cobertura` |
| Añadir una función o un área | `funciones.yaml` (+ `areas.yaml` si es un área nueva) | `npm run cobertura` |
| Añadir una skill | `definiciones/taxonomia-skills.yaml` | — |
| Cambiar un umbral de rotación | `calculo/cobertura.js` → `UMBRALES` y `reglas-senales-rotacion.md` | `npm run verificar` |
| Cambiar el tono o las reglas de las propuestas | `prompts/proponer-acciones.md` | Una ejecución de prueba |

Después: `npm run sheets` y volver a importar las hojas cambiadas, o leerlas desde el repo si el orquestador lo hace.

## Añadir un proceso nuevo (receta)

Cada proceso se construye con las mismas cuatro piezas:

1. **Definiciones** en `definiciones/`: qué reglas, umbrales y catálogos usa. Sin lógica dentro del flujo.
2. **Datos** sobre el **registro único de personas** (`empleados`). Nunca una lista de personas paralela.
3. **Regla determinista** para todo lo que decide prioridades o riesgos, con su comprobación en `calculo/`.
4. **Flujo** en el orquestador: disparo → regla → (IA si hay texto) → aviso → **decisión humana registrada**.

### Ejemplo: onboarding (proceso 2)

| Pieza | Contenido |
|---|---|
| Definiciones | `definiciones/onboarding.yaml`: plan por rol (semana 1, mes 1, mes 3) y skills objetivo por rol |
| Datos | Fila nueva en `empleados` (estado `activo`) |
| Regla | Las skills objetivo del rol entran en `skills-empleados` como objetivo, y la persona aparece en el mapa desde el día 1 |
| Flujo | Alta → plan por rol → email del día 0 (Claude lo personaliza) → recordatorio al manager para validar skills el día 90 |

## Límites al crecer

- **Más de ~200 personas:** Sheets se queda corto. Habría que pasar los datos a una base de datos o a un HRIS. Las definiciones y las reglas no cambian.
- **Validación de skills:** el mapa vale lo que valga la validación. Hay que mantener la cadencia semestral con los managers, y el sistema puede recordarla.
- **Anonimato:** con equipos pequeños muchos cortes de encuesta no llegan a n ≥ 5. Es correcto: se agrega a división o a compañía.
