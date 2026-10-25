# Reglas del semáforo de cobertura

> Fuente única de las reglas. El cálculo es **determinista**: con los mismos datos, siempre el mismo resultado. La IA no interviene aquí.
> Los valores marcados con ✏️ y la propia regla del semáforo (sus condiciones, en orden) están en `definiciones/reglas.yaml`, que es lo que lee el motor (D-23). Este documento explica qué significan y por qué.

## 1. Conceptos

| Concepto | Definición |
|---|---|
| Nivel de skill | 1 básico · 2 autónomo · 3 avanzado · 4 referente (`taxonomia-skills.yaml`) |
| Persona que cubre | Persona con `estado = activo` y `nivel_validado ≥ nivel mínimo` requerido. **Cuenta toda la compañía**, no solo el área de la función: así se ven las dependencias entre áreas. |
| Cobertura de una skill en una función | Nº de personas que la cubren |
| Cobertura de la función | La **menor** de sus skills requeridas (eslabón más débil) |
| Cobertura objetivo ✏️ | Por defecto 2. Se puede cambiar por función en `funciones.yaml` |
| Backup en desarrollo | Persona activa con un **plan de backup activo** para esa skill (`datos/planes-backup.csv`) y `nivel_validado = nivel mínimo − 1` |

Solo cuentan los niveles **validados** por el manager, nunca los declarados.

## 2. Semáforo

Se calcula primero **por cada skill requerida** y la función toma **el peor** de sus skills.

| Semáforo | Regla (por skill) |
|---|---|
| 🟢 Verde | Cobertura ≥ objetivo |
| 🟡 Ámbar | Cobertura ≥ 2 pero por debajo del objetivo, **o** cobertura = 1 **con** backup en desarrollo |
| 🔴 Rojo | Cobertura 0, **o** cobertura 1 **sin** backup en desarrollo |

Calcularlo por skill evita una trampa: en una función con dos skills a cobertura 1, un único plan de backup en una de ellas no debe ponerla en ámbar.

## 3. Key person

**Key person** = persona que es la **única cobertura** de una skill requerida en una función **crítica o importante**.

- No se declara: sale del cálculo. Es una **key person oculta** si su puesto es junior o intermedio, **o** si sostiene una función de **otra área**. Son los dos casos en los que nadie la marcaría a mano.
- Una key person sigue siéndolo aunque la función esté en ámbar por tener un backup en desarrollo. Deja de serlo cuando el backup alcanza el nivel requerido y se valida.
- En funciones de soporte no se marcan key people: la función sale en rojo, pero sin la alerta de persona.

## 4. Prioridad

Puntos: semáforo (rojo 3 · ámbar 2 · verde 0) × criticidad (crítica 3 · importante 2 · soporte 1).

| Prioridad | Puntos | Casos | Respuesta esperada |
|---|---|---|---|
| **P1** | 9 | Rojo en crítica | Esta semana |
| **P2** | 6 | Rojo en importante · ámbar en crítica | Este mes |
| **P3** | 3-4 | Rojo en soporte · ámbar en importante | Este trimestre |
| **P4** | 2 | Ámbar en soporte | Seguimiento |
| — | 0 | Verde | — |

## 5. Candidatos a backup

Para cada skill en rojo o ámbar, son candidatos las personas activas con `nivel_validado = nivel mínimo − 1`.

- Primero los que tienen la skill en `skills_interes` (**con interés**), después el resto.
- Se marca si el candidato **es key person en otra función**: moverlo o cargarlo puede abrir otro agujero (coste organizativo).
- Si no hay candidatos a un nivel de distancia, la propuesta tiene que valorar contratar.

## 6. Comparación con la foto anterior

En cada recálculo se guarda una foto en `historico-semaforo` (fecha, función, semáforo, cobertura). Una función **empeora** si su semáforo baja (verde → ámbar → rojo) o si, estando en ámbar o rojo, baja su cobertura (rojo con 1 → rojo con 0). Si sigue en verde aunque pierda cobertura, no cuenta como empeora. Solo las funciones que empeoran generan una alerta.

## 7. Respuesta: cubrir o rediseñar (lente AI first)

Acme está en un plan *AI first*. Cada función tiene un `impacto_ia` ✏️ (alto · medio · bajo) en `funciones.yaml`: cuánto va a transformar la IA esa función.

| Caso | Respuesta | Qué propone |
|---|---|---|
| Función en **rojo** con `impacto_ia = alto` | **Rediseñar** | Rediseñar la función con IA y automatización y **recualificar** a un candidato (formaciones `ia-*` del catálogo). Si nadie la cubre hoy, apoyo temporal mientras dura el rediseño. |
| Cualquier otro caso | **Cubrir** | Lo de siempre: backup, movilidad, contratar, retención (§5). |

Por qué: formar a alguien en un proceso que va a desaparecer es invertir en el pasado. La regla la aplica el cálculo, no la IA: la IA redacta la propuesta dentro de la respuesta que le llega.

Cautelas de gobierno:
- `impacto_ia` describe **funciones**, no personas. El mapa no señala a nadie para salir: **recualificación antes que reducción**.
- La vista de `impacto_ia` solo la ven dirección y People. Las decisiones de estructura son de dirección, con el criterio documentado.

## 8. Madurez IA por área

Media del nivel validado de las tres skills de IA (`ia-uso-diario`, `ia-automatizacion`, `ia-criterio`; sin la skill = 0) por área, y un índice que es la media de las tres. Sirve como línea base del plan AI first y para dirigir la formación.

- Un área con menos de 5 personas se agrupa en su división. Si aun así no llega a 5, no se publica: no se puede deducir el nivel de nadie.
- Las skills de IA todavía **no son requisito** de ninguna función: no cambian el semáforo.

## 9. Vacante y movilidad interna

Cuando una persona causa baja, además de recalcular el mapa, el sistema calcula **el puesto que deja**.

| Concepto | Regla ✏️ |
|---|---|
| Perfil del puesto | Las skills que la persona cubría en alguna función, con el nivel mínimo más alto que le pedían. Si tenía equipo, se añade `liderazgo` nivel 2. |
| Candidato interno | Persona activa que cumple **al menos la mitad** del perfil. Se ordenan por skills cumplidas y, a igualdad, por menos niveles de distancia. Se muestran como mucho 3. |
| Brechas | Para cada skill que le falta: nivel que tiene, nivel que necesita y formación del catálogo que la cierra. Un **mentoring interno no se propone si ya nadie cubre la skill** (no queda quien lo dé). |
| Coste organizativo | Si el candidato es key person, asumir el puesto **concentra el riesgo** en esa persona. |

La propuesta lleva **dos opciones excluyentes** con el mismo `grupo` en `alertas`: **A · buscar fuera** y **B · mover al primer candidato**. People aprueba una y la otra pasa a `descartada`.

Si se aprueba la B: el candidato asume rol, nivel de puesto y manager de quien se va; el equipo pasa a depender de él; y se abre un plan en `planes-backup` por cada brecha de un nivel con formación. El mapa se recalcula. Una función con cobertura 0 sigue en rojo aunque haya plan: el semáforo mide lo que hay hoy, no lo que habrá.

El compa-ratio del candidato frente a la banda del puesto que asumiría es dato de People: no aparece en el email a dirección.
