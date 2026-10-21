# Usos de gestión del mapa de cobertura

> Cómo convertir el semáforo de cobertura en decisiones de People. Va en `docs/` del repo.

## Punto de partida

El mapa responde a **una** pregunta: *si esta persona no está mañana, ¿qué función queda descubierta?* Mide **impacto**, no probabilidad. Por eso, para usarlo en rotación, encuestas o salarios, siempre se cruza con otra fuente. Usado solo, el mapa no dice quién se va a ir ni a quién hay que subir el sueldo.

Variables que aporta el mapa a cualquier análisis:

| Variable | Valores | Nivel |
|---|---|---|
| Semáforo de la función | verde / ámbar / rojo | función |
| Criticidad de la función | crítica / importante / soporte | función |
| Key person | sí / no | persona (vista restringida) |
| Backup en desarrollo | sí / no | persona |

---

## 1. Riesgo de rotación no deseada en áreas críticas

### Lógica
**Exposición = impacto × probabilidad.**
- **Impacto** lo da el mapa: semáforo × criticidad. Una salida en una función crítica en rojo es prioridad 1.
- **Probabilidad** se aproxima con señales objetivas, no con un modelo predictivo:

| Señal | Umbral de referencia (editable) |
|---|---|
| Posición salarial | compa-ratio < 0,90 |
| Tiempo sin revisión | > 18 meses |
| Clima del área | engagement del área por debajo de la media de la compañía |
| Desempeño | evaluación alta (4-5): son los primeros en recibir ofertas |
| Cambios de contexto | cambio reciente de manager o reorganización |

Nº de señales activas: 0-1 baja · 2 media · 3+ alta.

### Matriz de exposición

| | Probabilidad baja | Probabilidad media | Probabilidad alta |
|---|---|---|---|
| **Rojo crítica** | Crear backup | Backup + conversación de permanencia | **Prioridad 1**: conversación esta semana + backup + revisión de condiciones |
| **Ámbar** | Seguir plan de backup | Acelerar backup | Conversación de permanencia + acelerar backup |
| **Verde** | — | Seguimiento normal | Conversación de permanencia (riesgo individual, no organizativo) |

### Salida del sistema
Lista priorizada para People con: función afectada, semáforo, señales activas y acción recomendada. **La salida es una conversación, no una etiqueta.**

### Reglas
- No se calcula ni se comunica una "probabilidad de fuga" individual a managers. La vista individual es solo para People.
- Las señales son orientativas: se validan en una conversación (*stay interview*), no se actúa sobre la persona solo por el dato.
- La acción estructural siempre es la misma: **reducir la dependencia** (backup), no solo retener a la persona.

---

## 2. Variable de segmentación en encuestas de clima

### Para qué
Contrastar hipótesis que el mapa permite formular y que una encuesta normal no ve:
- **"El coste de ser imprescindible":** ¿las key people tienen más carga, menos desarrollo y menos desconexión que el resto?
- **¿Las funciones en rojo tienen peor clima?** Si es así, el riesgo se retroalimenta: poca cobertura → sobrecarga → salidas → menos cobertura.
- **¿Los backups en desarrollo perciben el plan como oportunidad o como carga extra?**

### Cómo
- La encuesta **no pregunta** "¿eres key person?". People cruza los resultados con el mapa por `empleado_id` en un entorno controlado y solo publica agregados.
- Segmentos: semáforo de la función, criticidad, key person sí/no, backup en desarrollo sí/no.
- Dimensiones a mirar: engagement/eNPS, carga de trabajo, intención de permanencia, oportunidades de desarrollo, relación con el manager.

### Reglas de anonimato
- **Mínimo 5 respuestas** por segmento para mostrar un resultado. Si no se llega, se agrega a un nivel superior (área → división → compañía).
- El segmento "key person" se reporta **solo a nivel compañía**: en un área pequeña, "las key people de custodia" pueden ser una persona identificable.
- Nunca se combinan dos segmentos si el cruce baja de 5.

### Salida
Comparativa key people vs resto y por semáforo, con brecha por dimensión. Una brecha negativa en carga o desarrollo en key people es un aviso de rotación futura y alimenta la matriz del punto 1.

---

## 3. Revisión salarial

### Papel del mapa
Es **un input más**, no el criterio. Ayuda a priorizar cuando el presupuesto no da para todos, pero no sustituye a desempeño ni a posición en banda.

### Matriz de priorización

| | Compa-ratio < 0,90 | 0,90-1,10 | > 1,10 |
|---|---|---|---|
| **Key person en función crítica, buen desempeño** | Prioridad alta | Prioridad media | Sin subida salarial; otras palancas |
| **Función en rojo/ámbar, no key person** | Prioridad media | Normal | Normal |
| **Resto** | Según desempeño | Según desempeño | Según desempeño |

### Cautelas (pensamiento crítico)
1. **Pagar escasez no elimina la fragilidad.** Subir el sueldo a una key person reduce la probabilidad de que se vaya, no el impacto si se va. Toda subida por criticidad va acompañada de un plan de backup.
2. **Palanca alternativa: bono de retención ligado a transferir conocimiento.** Se cobra al formar y validar a un backup. Alinea el interés de la persona con reducir el riesgo, en vez de premiar ser imprescindible.
3. **Igualdad retributiva.** "Criticidad/escasez" solo es un factor válido si está documentado, es objetivo y se aplica igual a todos. Hay que revisar la brecha por género dentro de cada decisión. Con la directiva europea de transparencia retributiva, cualquier diferencia debe poder explicarse con criterios neutros.
4. **Efecto perverso a vigilar:** si ser key person sube el sueldo, nadie tiene incentivo a formar backups. Por eso la palanca del punto 2 pesa más que la subida.

### Salida
Propuesta priorizada para el comité de compensación: persona, función, semáforo, compa-ratio, desempeño, palanca recomendada (subida / bono de retención / otras) y plan de backup asociado.

---

## Cadencia

| Qué | Cuándo |
|---|---|
| Recálculo del mapa | Automático ante altas, bajas o validación de skills; completo mensual |
| Revisión de exposición a rotación | Mensual (People) y trimestral con dirección |
| Cruce con encuesta | Tras cada encuesta de clima |
| Input a revisión salarial | En cada ciclo de revisión |
| Validación de skills por managers | Semestral |

## Límites del enfoque

- El mapa es tan bueno como la validación de skills. Sin revisión periódica de managers, envejece y da falsa seguridad.
- Mide dependencia de skills, no de relaciones (clientes, reguladores, conocimiento tácito). Ese riesgo se captura en la conversación con el manager, no en el dato.
- Con plantillas pequeñas, muchos análisis quedarán por debajo del umbral de anonimato. Es correcto que sea así.
