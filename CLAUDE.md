# People OS · Acme

> Contexto técnico del proyecto para Claude Code y para quien trabaje en el repo. Léelo antes de cualquier tarea.

## 1. Qué es

Un sistema de People para una compañía de 160 personas, gestionado por una sola persona apoyada en automatización e IA. No es un HRIS nuevo: es una capa de **definiciones, reglas, automatizaciones y un agente** sobre el HRIS de la compañía.

- **Acme** es ficticia: una fintech cripto regulada (MiCA, sujeto obligado AML) en pleno plan *AI first*. **Todos los datos son inventados** (personas, skills, salarios, encuestas). No se usan nombres de empresas reales.
- Caso construido de principio a fin: **cobertura de funciones críticas y riesgo de salida** (la baja de Elena, responsable de custodia). El resto del 360º está diseñado: `README.md` parte 1 y `docs/vision-procesos-rrhh.md`.
- Se prueba sin instalar nada: el **panel** que sirve n8n (escenario 0). Hay también un vídeo (`video/`).

## 2. Principios

- **Separar qué se hace de quién lo ejecuta.** Las reglas y umbrales están en `definiciones/reglas.yaml`; las funciones, la taxonomía y el catálogo, en sus YAML; los prompts, en `prompts/`. n8n solo ejecuta. Cambiar una regla es editar un archivo (D-01, D-23).
- **El riesgo se calcula, no se opina.** Semáforo, prioridad, key people y candidatos salen del motor (`calculo/`), que es determinista y se verifica (`npm run verificar`).
- **La IA, donde aporta:** redacta (propuestas, informe) y, en el asistente, razona sobre qué consultar. Nunca decide sobre una persona ni calcula el riesgo.
- **Humano en el bucle:** el manager valida skills; People decide las acciones. El AI Act trata la IA en decisiones de empleo como alto riesgo.
- **Quién ve qué:** dirección y managers no reciben señales individuales ni salarios; no se puntúa a nadie ("probabilidad de fuga").
- **Un único registro de personas** y un único sitio que habla con él: el adaptador HRIS (D-24).

## 3. Vocabulario

- **Automatización con reglas:** se dispara por un evento o por el calendario y decide con código determinista (riesgo, movilidad, skills, seguimiento de planes, centinela).
- **IA que redacta:** Claude convierte datos ya calculados en texto (propuesta, informe para dirección). Si falla, el texto sale por reglas.
- **Agente:** Claude decide qué herramientas usar y en qué orden para responder (Asistente de People, escenario 4). Sus herramientas son del motor y de solo lectura.

## 4. Estructura

```
definiciones/   reglas.yaml (semáforo, prioridad, señales, vacante, automatizaciones) · funciones.yaml · taxonomia-skills.yaml
                catalogo-formacion.yaml · areas.yaml · empresa.md · reglas-*.md (qué significa cada regla y por qué)
prompts/        proponer-acciones.md · informe-direccion.md · asistente-people.md · normalizar-skills.md
calculo/        cobertura.js (motor) · propuesta.js · agentes.js (seguimiento y centinela) · asistente.js (herramientas del agente)
                hojas.js · demo.js · verificar-casos.js · cifras.js · exportar-*.js · generar-plantilla.js
datos/          CSV de origen (ficticios)
salidas/        sheets/ (lo que carga el HRIS) · n8n/definiciones.json (lo que lee n8n) · muestras de emails y panel
flujos/n8n/     HRIS-google-sheets.json (adaptador) · E0 panel y reinicio · E1 baja · E2 skill · E3 automatizaciones con calendario
                E4 asistente · src/ (código de los nodos + probar.js) · LEEME.md (montaje)
agentes/        qué hace cada pieza, qué no hace y dónde vive
docs/           arquitectura · decisiones (D-01…) · escalado · visión 360º · usos del mapa · plan AI first · guion
video/          reproductor de la demo, datos y guion de locución
```

## 5. Comandos

| Comando | Qué hace |
|---|---|
| `npm run verificar` | Los datos y las reglas producen los casos de la demo, y cambiar `reglas.yaml` cambia el resultado |
| `npm run probar-n8n` | Ejecuta el código de todos los workflows contra un HRIS simulado, dos vueltas, con Claude simulado |
| `npm run n8n` | Genera los workflows y `salidas/n8n/definiciones.json` (después: commit y push; n8n lo lee de GitHub) |
| `npm run sheets -- --fecha 2026-09-30` | Genera las hojas iniciales del HRIS en `salidas/sheets/` |
| `npm run demo -- <comando>` | El ciclo entero en local, sin n8n: `reset`, `baja`, `aprobar`, `validar`, `seguimiento`, `centinela` |
| `npm run video` | Datos del reproductor y guion del vídeo |
| `npm run cifras` | Cifras que citan los documentos, calculadas por el motor |

## 6. Cómo se cambia algo

- **Una regla o un umbral** (semáforo, prioridad, señales, vacante, cuándo avisan las automatizaciones): `definiciones/reglas.yaml` → `npm run verificar` → `npm run n8n` → commit y push. Sin tocar flujos.
- **Una función, su criticidad o su cobertura objetivo:** `definiciones/funciones.yaml`, mismo camino.
- **El HRIS** (de Google Sheets a Factorial o Bizneo): solo el subworkflow HRIS (`calculo/exportar-n8n.js`, bloque HRIS). Los escenarios no hablan con Sheets.
- **El código de un nodo:** `calculo/` o `flujos/n8n/src/`, nunca el JSON generado → `npm run n8n` → `npm run probar-n8n` → volver a importar el workflow en n8n.
- Cada decisión relevante se registra en `docs/decisiones.md` (qué, alternativas, por qué).

## 7. Convenciones

- Todo en español. Commits pequeños y descriptivos.
- Simple antes que sofisticado: nada que no se pueda explicar y defender.
- **Privacidad del repo (es público):** ningún email real (en flujos, la variable `email_demo`), ninguna clave de API, ningún ID de Sheet o de workflow (en los JSON van marcadores `PEGAR_…`). Los emails de la demo llevan el prefijo `[Acme People OS]`.
- Datos personales solo ficticios; agregados con n ≥ 5 (`reglas.yaml`, anonimato).

## 8. Fuera de alcance

Producción (login y permisos por rol, RGPD completo), integraciones reales con HRIS o nómina, candidatos externos, modelos predictivos individuales de fuga y la vista del empleado (carrera y roles). Se mencionan, no se implementan.
