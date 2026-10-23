# Vídeo de la demo (unos 5 min)

`reproductor.html` es un reproductor de la demo para grabarlo en vídeo: 8 escenas, 13 pasos (19 en la versión completa), 16:9. No sustituye a n8n: enseña **qué pasa** (el mapa, el email, las decisiones) y **por qué** (datos, reglas, agentes) sin saltar entre el Sheet, GitHub, n8n y Gmail (D-20).

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

1. `npm run video` (regenera `datos.js` y `guion.html`; reinicia `salidas/demo/`).
2. Abre `video/reproductor.html` en Chrome o Edge, a pantalla completa (F11).
3. **→ / espacio** siguiente · **←** anterior · **D** abre y cierra el panel *¿Qué ha pasado por debajo?* · **R** repite la animación del paso.
4. `reproductor.html#6` abre directamente el paso 6. `?captura` muestra cada paso sin animaciones (para capturas); `?panel` empieza con el panel abierto.

## Grabación: la forma sencilla (Clipchamp, escena a escena)

Clipchamp viene con Windows 11, es gratis y exporta sin marca de agua. Loom gratis no sirve: corta a 5 minutos.

**Prepara (una vez)**
1. Abre `video/reproductor.html` en Chrome o Edge, en pantalla completa (**F11**).
2. Abre `video/guion.html` donde puedas leerlo sin que salga en la grabación: otra pantalla, el móvil o una ventana pequeña al lado. Es el guion de abajo en letra grande.
3. Silencia notificaciones (*Configuración → Sistema → Notificaciones → No molestar*).

**Graba (8 tomas, una por escena, de 10 a 60 segundos)**
1. Abre **Clipchamp** → *Crear un vídeo nuevo* → *Grabar y crear* → **Pantalla**. Comparte la **pestaña** del reproductor y elige tu micrófono.
2. Coloca el reproductor al principio de la escena (la barra de la izquierda te lleva a cada una), pulsa **Grabar**, lee el bloque de esa escena avanzando con **→**, y **Detener**.
3. ¿Te has equivocado? *Volver a grabar* solo esa toma. ¿Bien? *Guardar y editar*: la toma se pone en la línea de tiempo.
4. Repite con la siguiente escena. Las tomas se colocan una detrás de otra.

**Exporta**
1. Si sobra algo al principio o al final de una toma, selecciónala en la línea de tiempo y arrastra el borde para recortarla.
2. **Exportar → 1080p**. Sale un MP4 listo para enviar.

Reglas para que quede bien: **D** (panel técnico) solo en los pasos marcados en el guion, y ciérralo antes de avanzar. Habla pausado: los tiempos del guion son orientativos. No hay narración sintética: la voz es la tuya.

*Alternativa sin edición:* la grabadora de la **Herramienta Recortes** (**Win + Mayús + R**, con micrófono activado) graba de un tirón y guarda el MP4 directamente; si te equivocas, hay que repetir entera.

## Guion de locución

Tiempos orientativos: unos 5 minutos en total. El texto es una guía para decirlo con tus palabras.

| Paso | Tiempo | Pantalla | Locución |
|---|---|---|---|
| **1 · Arquitectura** | | | |
| 1 | 0:00-0:25 | Capa de orquestación | "People OS no es un HRIS nuevo: es una capa encima. Las reglas viven en un repositorio, n8n las ejecuta sobre los datos del HRIS y las decisiones las toma siempre una persona. El riesgo se calcula; la IA redacta; People decide." |
| **2 · Situación inicial** | | | |
| 2 | 0:25-0:50 | Mapa de calor | "Este es el mapa de Acme: 160 personas y 24 funciones. Cuatro en rojo, tres en ámbar. Las key people no las ha marcado nadie: salen del cálculo. Lucía, analista de producto, sostiene sola el reporting AML de Compliance." |
| 3 | 0:50-1:15 | Foco en Custodia | "La prueba de reservas depende solo de Elena, la responsable de custodia. Y Elena tenía cuatro señales de salida. El sistema la tenía como prioridad 1 antes de que se fuera." |
| **3 · Elena comunica su salida** | | | |
| 4 | 1:15-1:25 | Formulario de baja | "Elena se va. People registra la baja; en producción, el aviso llegaría del HRIS." |
| **4 · Recalcular el riesgo** | | | |
| 5 | 1:25-1:55 | El mapa cambia ⚙ | "n8n recalcula con las mismas reglas. Gestión de claves pasa a rojo: solo queda Marcos, que se convierte en la nueva key person. La prueba de reservas se queda sin nadie." |
| **5 · Propuesta y decisión humana** | | | |
| 6 | 1:55-2:25 | Perfil y opciones A/B | "El agente de movilidad propone dos salidas con su coste: buscar fuera, dos o tres meses sin responsable; o mover a Marcos, que cumple tres de cinco skills pero concentraría todo el riesgo. El sistema no elige." |
| 7 | 2:25-2:45 | El email | "Todo llega a People en un email: arriba, lo que vería dirección; abajo, lo confidencial. Nada se ejecuta sin aprobación." |
| 8 | 2:45-3:10 | De rojo a ámbar | "People mueve a Marcos al puesto y aprueba un plan de backup para Javier, que está a un nivel. Con un plan activo, gestión de claves pasa de rojo a ámbar." |
| **6 · Tres meses después** | | | |
| 9 | 3:10-3:35 | El agente avisa al manager | "Doce semanas después, nadie tiene que acordarse: el agente de seguimiento ve que el plan de Javier ha llegado a su fecha y escribe a Marcos con el formulario de validación rellenado." |
| 10 | 3:35-3:55 | Vuelve a verde | "Marcos valida a Javier. Completar un curso no sube el nivel: lo confirma una persona. La función vuelve a verde, y la prueba de reservas sigue en rojo: el sistema no se engaña." |
| **7 · Agentes que trabajan solos** | | | |
| 11 | 3:55-4:25 | El centinela | "Y cada mes, el centinela recalcula sin que nadie lo pida y deja a dirección un informe: qué sigue frágil y qué decisión lleva semanas sin tomarse. Lo personal se queda en People." |
| **8 · Arquitectura y escalabilidad** | | | |
| 12 | 4:25-4:45 | Resto de procesos | "Las reglas viven en archivos, no en los flujos, y el mismo patrón sirve para el resto de People. Lo verde funciona hoy; lo demás está diseñado." |
| 13 | 4:45-5:05 | Cierre | "People OS ayuda a desarrollar, compartir y preservar las capacidades que necesita el negocio. Está construido como trabajaría el departamento: una persona más IA. Y lo podéis probar vosotros con el enlace del panel, sin instalar nada." |

La versión larga (19 pasos, unos 8 minutos y medio) sigue disponible: `reproductor.html?completo` añade el flujo de nodos de n8n, las key people antes y después, la aprobación de la opción B, el formulario de validación, el escalado del agente y el archivo `funciones.yaml`. No tiene guion propio: si la usas, improvisa esos pasos sobre la pantalla.
