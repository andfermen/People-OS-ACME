// Escenario 4 · nodo "Respuesta": la página con la respuesta del asistente y cómo ha razonado (qué herramientas ha usado,
// con qué datos y qué le devolvió el motor). Así se ve que las cifras salen del motor y no del modelo.
const cfg = $('Configuración').first().json;
const o = $input.first().json;
const base = String(cfg.webhookUrl || '').replace(/acme-asistente.*$/, '');
const panel = base + 'acme-panel', asistente = base + 'acme-asistente';
const ejemplos = ['¿Qué pasa si se va Carmen?', '¿Dónde somos más frágiles ahora mismo?', '¿Quién podría cubrir la prueba de reservas?', '¿Qué área va peor en IA?'];
const formulario = `<form action="${asistente}" method="get" style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">
  <input name="pregunta" placeholder="Pregunta sobre cobertura, personas clave, candidatos o madurez IA" style="flex:1;min-width:240px;padding:9px 12px;border:1px solid #dde3ea;border-radius:8px;font:inherit">
  <button style="background:#3b5bdb;color:#fff;border:0;border-radius:8px;padding:9px 16px;font:inherit;cursor:pointer">Preguntar</button></form>
  <p style="font-size:13px;color:#5b6876">Ejemplos: ${ejemplos.map(e => `<a href="${asistente}?pregunta=${encodeURIComponent(e)}">${esc(e)}</a>`).join(' · ')}</p>`;

let cuerpo;
if (!o.pregunta) cuerpo = '<p>Escribe una pregunta. El asistente es un agente: decide qué consultar (el mapa, una persona, una baja simulada, candidatos, madurez IA) y responde con las cifras que le da el motor.</p>';
else if (o.final) cuerpo = `<div style="background:#fff;border:1px solid #dde3ea;border-radius:10px;padding:14px 18px">${mdAHtml(o.final)}</div>`;
else if (o.sigue) cuerpo = '<p>El asistente ha llegado al límite de pasos sin cerrar la respuesta. Abajo está lo que ha consultado; prueba a concretar la pregunta.</p>';
else cuerpo = `<p style="color:#a12d26">${esc(o.error || 'No hay respuesta.')}</p>`;

const traza = (o.traza || []).length ? `<h3>Cómo lo ha razonado</h3><ol>${o.traza.map(t => `<li><b>${esc(t.herramienta)}</b>(${esc(JSON.stringify(t.entrada))})${t.pensado ? `<br><i style="color:#5b6876">${esc(t.pensado.slice(0, 220))}</i>` : ''}<br>→ ${esc(t.resumen)}</li>`).join('')}</ol>
  <p style="font-size:13px;color:#5b6876">Claude elige qué herramienta usar y redacta; las cifras de cada paso las calcula el motor con las reglas de <code>definiciones/reglas.yaml</code>. Las herramientas solo leen y no devuelven salarios ni señales individuales.</p>` : '';

return [{ json: { html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asistente de People · Acme</title></head>
<body style="margin:0;background:#eef1f5;font-family:Inter,'Segoe UI',system-ui,sans-serif;color:#18212b;line-height:1.5"><div style="max-width:820px;margin:0 auto;padding:22px 18px">
<p><a href="${panel}">← Volver al panel</a> · <span style="background:#fdf3dc;color:#8a5a00;border-radius:99px;padding:3px 10px;font-size:12px">Datos ficticios · solo lectura</span></p>
<h2 style="margin:6px 0">Asistente de People <span style="font-size:13px;font-weight:400;color:#5b6876">· agente con herramientas</span></h2>
${o.pregunta ? `<p style="font-size:18px"><b>Pregunta:</b> ${esc(o.pregunta)}</p>` : ''}${cuerpo}${traza}${formulario}
</div></body></html>` } }];
