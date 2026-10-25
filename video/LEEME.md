# Reproductor de la demo

El vídeo de la demo (unos 2:40) está grabado sobre `reproductor.html`. El reproductor sirve también para recorrer la demo a tu ritmo: 9 escenas, 15 pasos (21 en la versión completa), 16:9. No sustituye a n8n: enseña **qué pasa** (el mapa, el email, las decisiones) y **por qué** (datos, reglas, cálculo) sin saltar entre el Sheet, GitHub, n8n y Gmail (D-20).

## De dónde salen los datos

`npm run video` ejecuta el ciclo de la demo local (`calculo/demo.js`: baja de E007 → aprobar ALR-002 → aprobar ALR-003 → seguimiento a las 12 semanas → validar a Javier → seguimiento a las 13 y 14 semanas → centinela) con el **mismo motor** que usan n8n y `npm run verificar`, y guarda el resultado en `datos.js`. Ninguna cifra del reproductor está escrita a mano. También lee de los JSON de n8n los nodos del escenario 1 y los campos de los formularios.

Cada pantalla lleva una etiqueta arriba a la derecha:

| Etiqueta | Qué significa |
|---|---|
| 🟢 **Resultado real del motor** | Cifras, semáforos, alertas y planes calculados por el motor del repo |
| 🟣 **Representación visual** | Diagrama, animación del flujo o dibujo del formulario de n8n (con sus campos reales) |
| ⚪ **Mapa de procesos** | Procesos construidos frente a diseñados: lo diseñado no se presenta como hecho |

Una diferencia con n8n, dicha en la propia pantalla del email: el **texto** de la propuesta es el de la propuesta por reglas (el vídeo no llama a la API). En n8n lo redacta Claude; las acciones, los candidatos y las cifras son los mismos.

## Uso

1. `npm run video` (regenera `datos.js` y reinicia `salidas/demo/`).
2. Abre `video/reproductor.html` en Chrome o Edge, a pantalla completa (F11).
3. **→ / espacio** siguiente · **←** anterior · **D** abre y cierra el panel *¿Qué ha pasado por debajo?* · **R** repite la animación del paso.
4. `reproductor.html#6` abre directamente el paso 6. `?captura` muestra cada paso sin animaciones (para capturas); `?panel` empieza con el panel abierto.

La versión larga (21 pasos) sigue disponible: `reproductor.html?completo` añade el flujo de nodos de n8n, las key people antes y después, la aprobación de la opción B, el formulario de validación, el escalado del seguimiento y el archivo `funciones.yaml`.
