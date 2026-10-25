# Reglas de señales de rotación

> Señales **objetivas** de riesgo de salida no deseada. Se cuentan, no se puntúa a la persona: **no es un modelo predictivo ni una probabilidad de fuga.** Solo People ve la vista individual, y la salida siempre es una conversación (*stay interview*), nunca una etiqueta.
> Uso y matriz completa: `docs/usos-mapa-cobertura.md` §1. Los umbrales ✏️ se cambian en `definiciones/reglas.yaml` (`senales_rotacion`).

## Señales

| # | Señal | Regla ✏️ | Dato |
|---|---|---|---|
| S1 | Posición salarial | compa-ratio < 0,90 | `salario_ficticio / medio` de su banda |
| S2 | Tiempo sin revisión | > 18 meses | `meses_desde_ultima_revision` |
| S3 | Clima del área | engagement del área < media de la compañía | `encuesta-clima-agregada.csv`. Si el área tiene n < 5, se usa su división (`empresa.md`) |
| S4 | Desempeño alto | `ultima_evaluacion` ≥ 4 | `empleados.csv` |
| S5 | Cambio de contexto | ≤ 6 meses con el manager actual | `meses_con_manager_actual` |

## Nivel de señales (orientativo) ✏️

| Señales activas | Nivel |
|---|---|
| 0-1 | Bajo |
| 2 | Medio |
| 3 o más | Alto |

## A quién se aplica

Solo a las **key people** y a las personas que cubren funciones en rojo o ámbar. Calcular señales a toda la plantilla no aporta nada al riesgo organizativo y aumenta la exposición de datos personales.

## Matriz de exposición (impacto × nivel de señales)

| Impacto \ Nivel de señales | Bajo | Medio | Alto |
|---|---|---|---|
| **Rojo (crítica o importante)** | Crear backup | Backup + conversación de permanencia | **Prioridad 1**: conversación esta semana + backup + revisión de condiciones |
| **Ámbar** | Seguir plan de backup | Acelerar backup | Conversación de permanencia + acelerar backup |
| **Verde** | — | Seguimiento normal | Conversación de permanencia (riesgo individual) |
