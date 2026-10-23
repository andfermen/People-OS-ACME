# Vídeo de la demo (unos 8 min)

`reproductor.html` es un reproductor de la demo para grabarlo en vídeo: 8 escenas, 19 pasos, 16:9. No sustituye a n8n: enseña **qué pasa** (el mapa, el email, las decisiones) y **por qué** (datos, reglas, agentes) sin saltar entre el Sheet, GitHub, n8n y Gmail (D-20).

## De dónde salen los datos

`npm run video` ejecuta el ciclo de la demo local (`calculo/demo.js`: baja de E007 → aprobar ALR-002 → aprobar ALR-003 → seguimiento a las 12 semanas → validar a Javier → seguimiento a las 13 y 14 semanas → centinela) con el **mismo motor** que usan n8n y `npm run verificar`, y guarda el resultado en `datos.js`. Ninguna cifra del reproductor está escrita a mano. También lee de los JSON de n8n los nodos del escenario 1 y los campos de los formularios.

Cada pantalla lleva una etiqueta arriba a la derecha:

| Etiqueta | Qué significa |
|---|---|
| 🟢 **Resultado real del motor** | Cifras, semáforos, alertas y planes calculados por el motor del repo |
| 🟣 **Representación visual** | Diagrama, animación del flujo o dibujo del formulario de n8n (con sus campos reales) |
| ⚪ **Estado según el README** | Procesos construidos frente a diseñados: lo diseñado no se presenta como hecho |

Una diferencia con n8n, dicha en la propia pantalla del email: el **texto** de la propuesta es el de la propuesta por reglas (el vídeo no llama a la API). En n8n lo redacta Claude; las acciones, los candidatos y las cifras son los mismos.

## Uso

1. `npm run video` (regenera `datos.js`; reinicia `salidas/demo/`).
2. Abre `video/reproductor.html` en Chrome o Edge, a pantalla completa (F11).
3. **→ / espacio** siguiente · **←** anterior · **D** abre y cierra el panel *¿Qué ha pasado por debajo?* · **R** repite la animación del paso.
4. `reproductor.html#6` abre directamente el paso 6. `?captura` muestra cada paso sin animaciones (para capturas); `?panel` empieza con el panel abierto.

## Grabación (OBS o Loom)

1. Resolución de la pantalla o de la captura: 1920×1080. El reproductor se escala solo y mantiene el 16:9.
2. OBS: fuente *Captura de ventana* del navegador (o Loom: *Solo pantalla*, pestaña actual). Micrófono a −12 dB aprox.
3. Ensaya una vez con el guion en otra pantalla. Graba de un tirón; si te equivocas, vuelve con ← y repite el paso (los cortes se hacen después).
4. El panel técnico (**D**) se abre solo en los pasos marcados con ⚙ en el guion, cuando vas a explicarlo, y se cierra antes de avanzar.
5. Exporta en MP4 (H.264). En Loom: *Download*. Revisa que se lean las cifras del mapa a 1080p.

No hay narración sintética: la voz es la tuya.

## Guion de locución

Tiempos orientativos: unos 8 minutos en total. El texto es una guía para decirlo con tus palabras.

| Paso | Tiempo | Pantalla | Locución |
|---|---|---|---|
| **1 · Arquitectura** | | | |
| 1 | 0:00-0:40 | Capa de orquestación | "People OS no es un HRIS nuevo. Es una capa encima: las definiciones viven en un repositorio, n8n las ejecuta, los datos de las personas están en el HRIS, que en la demo es un Google Sheets, y las decisiones las toma siempre una persona. El riesgo se calcula con reglas; la IA redacta; People decide." |
| **2 · Situación inicial** | | | |
| 2 | 0:40-1:15 | Mapa de calor | "Este es el mapa de Acme: 160 personas y 24 funciones. Cobertura es cuántas personas tienen hoy el nivel validado que pide cada función. Cuatro en rojo, tres en ámbar. A la derecha, las key people: nadie las ha marcado, salen del cálculo. Lucía, por ejemplo, es analista de producto y sostiene el reporting AML de Compliance." |
| 3 | 1:15-1:50 | Foco en Custodia ⚙ | "Custodia. La prueba de reservas depende solo de Elena, la responsable. Y Elena tenía cuatro señales: compa-ratio 0,86, 22 meses sin revisión, el clima de su área por debajo de la media y una evaluación de 5. El sistema la tenía como prioridad 1 antes de que se fuera." |
| **3 · Elena comunica su salida** | | | |
| 4 | 1:50-2:05 | Formulario de baja | "Elena comunica que se va. People la registra con su id. En producción, este evento llegaría del HRIS." |
| 5 | 2:05-2:35 | Nodos del escenario 1 | "Esto es lo que se pone en marcha en n8n, de izquierda a derecha: lee las definiciones de GitHub y los datos del Sheet, el motor calcula, Claude redacta la propuesta y cada resultado se escribe en su hoja. Ningún dato vive dentro de n8n." |
| **4 · Recalcular el riesgo** | | | |
| 6 | 2:35-3:15 | El mapa cambia ⚙ | "Mismas reglas, un dato distinto. Gestión de claves pasa de verde a rojo: quedaba Elena y Marcos; ahora solo Marcos. La prueba de reservas se queda sin nadie. Operativa de wallets también pierde a una persona, pero sigue en verde: no genera alerta. Solo avisa lo que cambia de color." |
| 7 | 3:15-3:35 | Key people antes/después | "Y aparece una dependencia nueva: Marcos es ahora la única persona que firma claves. El mapa no solo cuenta huecos; descubre a quién no podemos perder ahora." |
| **5 · Propuesta y decisión humana** | | | |
| 8 | 3:35-4:10 | Perfil y opciones A/B ⚙ | "El agente de movilidad calcula el perfil del puesto con lo que hacía Elena y busca dentro. Marcos cumple tres de cinco skills. Opción A, buscar fuera: dos o tres meses con siete personas sin responsable. Opción B, mover a Marcos: pero ya es la única cobertura de claves, y concentrar el puesto en él concentra el riesgo. El sistema no elige: pone el coste encima de la mesa." |
| 9 | 4:10-4:40 | El email ⚙ | "Todo llega a People en un email. Arriba, lo que vería dirección. Abajo, solo para People, lo confidencial: si Marcos asume el puesto con su salario, su compa-ratio sería 0,76. Nada se ejecuta sin aprobación." |
| 10 | 4:40-5:00 | Aprobar ALR-002 | "People elige la B. La A se descarta sola. Marcos pasa a responsable y se abre su plan de formación. El mapa no cambia de color: promover a alguien no crea skills." |
| 11 | 5:00-5:30 | Aprobar ALR-003 ⚙ | "Segunda decisión: plan de backup para Javier, que está a un nivel y tiene interés. Con un plan activo, gestión de claves pasa de rojo a ámbar. La prueba de reservas sigue en rojo: con cobertura cero, un plan no basta." |
| **6 · Tres meses después** | | | |
| 12 | 5:30-5:55 | El agente avisa al manager ⚙ | "Pasan doce semanas. Nadie tiene que acordarse: cada lunes, el agente de seguimiento revisa los planes y ve que el de Javier ha llegado a su fecha. Escribe a Marcos, su manager, con el formulario de validación ya rellenado. En la misma revisión avisa también a Sergio, el CEO de Acme, por el plan de Marcos." |
| 13 | 5:55-6:05 | Formulario de validación | "Marcos abre el enlace. Completar un curso no sube el nivel: lo valida él." |
| 14 | 6:05-6:30 | Vuelve a verde | "El plan se cierra, Javier ya cuenta como cobertura y la función vuelve a verde. Aquí está la historia completa de gestión de claves en el histórico. Y la prueba de reservas sigue en rojo: el sistema no se engaña." |
| **7 · Agentes que trabajan solos** | | | |
| 15 | 6:30-6:55 | Insiste y escala | "El plan de Marcos nadie lo valida. El agente recuerda a la semana siguiente y, tras dos avisos, abre una alerta para People. No cierra ni cambia el plan: eso lo decidimos nosotros. Su trabajo es que nada se quede olvidado." |
| 16 | 6:55-7:30 | El centinela ⚙ | "Y el día 1 de cada mes, el centinela recalcula el mapa sin que nadie lo pida y deja el informe para dirección: la prueba de reservas lleva semanas sin nadie, la conversación de permanencia con Marcos sigue sin decidirse y hay validaciones de skills de hace más de seis meses: el mapa vale lo que valga la validación. A dirección solo le llega lo organizativo; lo personal se queda en People." |
| **8 · Arquitectura y escalabilidad** | | | |
| 17 | 7:30-7:50 | funciones.yaml | "Las reglas no están dentro del flujo. Si dirección quiere tres personas en custodia, se cambia una línea de este archivo, y la siguiente ejecución ya lo aplica. El flujo no se toca." |
| 18 | 7:50-8:10 | Resto de procesos | "El mismo patrón sirve para el resto de People: definiciones, disparo, regla, IA si hay texto, aviso y decisión humana registrada. Lo verde funciona hoy; lo demás está diseñado. La baja que acabamos de ver ya es el offboarding." |
| 19 | 8:10-8:35 | Cierre | "People OS no solo automatiza procesos: ayuda a desarrollar, compartir y preservar las capacidades que necesita el negocio. Y está construido como trabajaría el departamento: una persona más IA. Todo lo que habéis visto lo podéis probar vosotros con el enlace del panel, sin instalar nada: el mismo sistema, funcionando." |

Si quieres quedarte en 8 minutos, el paso 15 se puede saltar: el paso 16 ya cuenta qué hacen los agentes solos.
