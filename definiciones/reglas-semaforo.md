# Reglas del semáforo de cobertura

> Fuente única de las reglas. El cálculo es **determinista**: con los mismos datos, siempre el mismo resultado. La IA no interviene aquí.
> Los umbrales editables están marcados con ✏️.

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

- No se declara: sale del cálculo. Si la persona no es manager ni "senior" y el cálculo la marca, es una **key person oculta**.
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

En cada recálculo se guarda una foto en `historico-semaforo` (fecha, función, semáforo, cobertura). Una función **empeora** si su semáforo baja (verde → ámbar → rojo) o si baja su cobertura con el mismo color. Solo las funciones que empeoran generan una alerta.
