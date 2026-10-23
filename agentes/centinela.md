# Centinela de riesgo · construido

**Dónde vive:** n8n, escenario 3 ([`flujos/n8n/E3-automatizaciones-calendario.json`](../flujos/n8n/E3-automatizaciones-calendario.json)), nodos **Centinela** → **Claude redacta el informe** → **Informe final**. Lógica en [`calculo/automatizaciones.js`](../calculo/automatizaciones.js) (`vigilar`, `informePorReglas`), reglas en [`definiciones/reglas-automatizaciones.md`](../definiciones/reglas-automatizaciones.md) §2, prompt en [`prompts/informe-direccion.md`](../prompts/informe-direccion.md) (D-21).

## Para qué

El mapa cambia cuando alguien registra algo. Pero el riesgo también crece **en silencio**: una función que lleva meses en rojo, una decisión que nadie toma, validaciones que envejecen. El centinela mira todo eso cada mes **sin que nadie se lo pida** y deja a dirección un informe listo para leer.

## Qué hace, solo

El día 1 de cada mes a las 8:00:

1. **Recalcula** el mapa con el motor y guarda la foto en `historico-semaforo`.
2. **Detecta**, con reglas:

| Qué | Cómo |
|---|---|
| Funciones frágiles y desde cuándo | P1 y P2, con los días que llevan en su color (racha en el histórico) |
| Cambios que nadie ha avisado | Comparación con el último recálculo |
| Validaciones caducadas | Skills validadas hace más de 6 meses que sostienen funciones críticas o importantes al límite |
| Planes que tocan validar | Las mismas fechas que el seguimiento de planes |
| Decisiones pendientes | Alertas sin decidir desde hace más de 7 días |
| Key people con señales | Señales de rotación media o alta (**solo para People**) |

3. **Pide a Claude** que redacte el informe para dirección con las secciones del prompt: en una frase, dónde somos frágiles, qué ha cambiado, dependencia de personas, qué estamos haciendo y qué necesitamos de dirección. Si Claude no responde, el informe sale **por reglas**, con las mismas secciones.
4. **Envía un email a People:** arriba, el informe para dirección, listo para reenviar; abajo, en un bloque aparte, lo confidencial.

En la demo detecta que *Prueba de reservas* sigue sin nadie, que la conversación de permanencia con Marcos (`ALR-004`) lleva semanas sin decidirse y que hay validaciones de skills de más de 6 meses en funciones críticas.

## Qué no hace

- **No calcula el riesgo con IA.** Claude recibe el riesgo ya calculado y lo explica; no lo reinterpreta.
- **No decide qué hacer.** Señala; deciden People y dirección.
- **No cuenta a dirección nada individual.** A Claude solo le llegan datos organizativos. De una key person con señales, dirección solo lee "en seguimiento por People"; las señales van en el bloque de People.

## Por qué así

- **Detectar es regla; redactar es IA.** Lo que hay que mirar está escrito y se puede probar; el texto, que es lo que más tiempo cuesta, lo hace Claude.
- **Nunca se queda en blanco:** sin API, el informe por reglas sale igual.
- **Privacidad por construcción:** el mensaje a Claude se arma sin señales ni salarios (`mensajeInforme`). La prueba lo comprueba: la parte de dirección no puede contener compa-ratio, probabilidad ni evaluaciones.

## Cómo se prueba

- **En n8n:** formulario **Ejecutar ahora** → `centinela`, cuándo = `hoy` o `+14 semanas`. El informe aparece en la bandeja del panel.
- **En local:** `npm run demo -- centinela +84` (deja el informe en `salidas/demo/`).
- **Muestra del email:** [`salidas/n8n/muestra-email-centinela.html`](../salidas/n8n/muestra-email-centinela.html).

## Siguiente paso

Pedir directamente a cada manager que revalide las skills caducadas de su equipo, con el mismo mecanismo de avisos que el seguimiento de planes.
