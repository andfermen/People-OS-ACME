# Agentes, automatizaciones e IA que redacta

Las piezas de People OS, con las palabras usadas con precisión (`CLAUDE.md` §3):

| Tipo | Qué es | Quién decide |
|---|---|---|
| **Automatización con reglas** | Se dispara por un evento o por el calendario y decide con código determinista qué calcular y cuándo avisar | La regla, que está en `definiciones/reglas.yaml` y se puede auditar y repetir |
| **IA que redacta** | Claude convierte datos ya calculados en texto | Nadie: solo escribe. Si falla, el texto sale por reglas |
| **Agente** | Claude decide qué herramientas usar y en qué orden para responder | El modelo decide **qué consultar**; las cifras las calcula el motor |

Regla común: **nada decide sobre una persona.** Lo que fija riesgos y prioridades es una regla, porque tiene que poder auditarse (el AI Act trata la IA en decisiones de empleo como alto riesgo). El modelo razona solo donde no se decide nada sobre nadie.

Cómo se encadenan: **Riesgo** detecta → **Movilidad** calcula opciones → **Propuesta** las redacta → **People decide** → **Riesgo** recalcula → **Seguimiento** avisa al manager cuando toca → **Skills** cierra el ciclo → **Centinela** vigila cada mes. Y en cualquier momento, People pregunta al **Asistente**.

## El agente

| Pieza | Qué hace | Qué no hace | Dónde vive | Estado |
|---|---|---|---|---|
| [**Asistente de People**](asistente-people.md) | Responde preguntas ("¿qué pasa si se va Carmen?"). Claude elige entre cinco herramientas del motor (mapa, buscar persona, simular una baja, candidatos para una función, madurez IA), las encadena y responde enseñando qué ha consultado | Cambiar datos, ver salarios o señales, puntuar personas, decidir | Escenario 4 · `calculo/asistente.js` · `prompts/asistente-people.md` | **Construido** (D-25) |

## Automatizaciones con reglas

Arrancan con un evento: una baja, una aprobación o una validación.

| Pieza | Qué hace | Qué no hace | Dónde vive | Estado |
|---|---|---|---|---|
| **Riesgo** | Recalcula cobertura y semáforo por función, descubre las *key people* (también las ocultas, entre áreas), asigna prioridad y decide si una función se **cubre** o se **rediseña con IA** | Opinar: todo sale de `definiciones/reglas.yaml` | Nodo **Motor** (escenario 1) y los recálculos de los escenarios 2 y 3 · `calculo/cobertura.js` | **Construido** |
| **Movilidad** | Ante una vacante, calcula el perfil del puesto con lo que hacía la persona, busca candidatos internos, sus brechas, la formación que las cierra y el **coste organizativo** de moverlos | Elegir candidato: pone dos opciones con su coste | Nodo **Motor** · `calculo/cobertura.js` (`vacante`) | **Construido** |
| **Skills** | El manager valida un nivel → actualiza el HRIS, cierra el plan de backup si se alcanza el objetivo y recalcula | Subir un nivel por haber completado un curso | Escenario 2, nodo **Validar skill** | **Construido** |

Arrancan con el calendario, sin que nadie pulse nada (D-21). Reglas: [`definiciones/reglas-agentes.md`](../definiciones/reglas-agentes.md).

| Pieza | Qué hace | Qué no hace | Dónde vive | Estado |
|---|---|---|---|---|
| [Seguimiento de planes](seguimiento-planes.md) | Cada lunes: plan de backup que llega a su fecha → escribe al manager con el formulario de validación rellenado → recuerda a los 7 días → tras 2 avisos, alerta para People | Subir niveles, cerrar o cambiar planes | Escenario 3 · `calculo/agentes.js` | **Construido** |
| [Centinela de riesgo](centinela.md) | Día 1 de cada mes: recalcula, detecta funciones frágiles y desde cuándo, validaciones de más de 6 meses y decisiones pendientes; Claude redacta el informe para dirección | Decidir qué hacer con lo detectado; contar a dirección señales individuales | Escenario 3 · `calculo/agentes.js` | **Construido** |

## IA que redacta

| Pieza | Qué hace | Qué no hace | Dónde vive | Estado |
|---|---|---|---|---|
| **Propuesta** | Redacta para People las opciones (fuera o dentro), los planes de backup y las conversaciones de permanencia, con el porqué y el riesgo de no hacerlo. Separa lo que vería dirección de lo confidencial | Decidir: todo queda **pendiente** hasta que People aprueba. Si Claude falla, propuesta por reglas | Nodos **Claude propone** y **Propuesta final** · `prompts/proponer-acciones.md`, `calculo/propuesta.js` | **Construido** |
| **Informe del centinela** | Redacta el informe mensual para dirección con lo que detecta el centinela | Ver señales o salarios: no se le pasan | Nodo **Claude redacta el informe** · `prompts/informe-direccion.md` | **Construido** |

## Propuestos y de apoyo

| Pieza | Para qué | Dónde vive | Estado |
|---|---|---|---|
| [Auditor de la demo](auditor-demo.md) | Encontrar antes de enviar la demo lo que fallaría o no cuadraría | Claude Code: `.claude/agents/auditor-demo.md` | **Construido** (herramienta de trabajo, no forma parte del sistema) |
| [Auditor de procesos de RRHH](auditor-procesos-rrhh.md) | Analizar cómo se hace hoy un proceso de RRHH y proponer cómo meterlo en el sistema | Claude Code: `.claude/agents/` | Propuesta |

## Cómo se usa el auditor

En Claude Code, dentro del proyecto: *"usa el agente auditor-demo"* o *"audita la demo"*. Devuelve 🔴 bloqueantes, 🟡 a revisar y 🟢 comprobado, con qué hacer en cada caso. Se apoya en `npm run cifras`, que imprime las cifras que citan los documentos calculadas con el motor.
