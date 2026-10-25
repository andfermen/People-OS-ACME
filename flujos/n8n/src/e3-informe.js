// Escenario 3 (automatizaciones con calendario) · nodo "Informe final": usa el informe de Claude; si falla, el informe por reglas.
// Un email a People: arriba el informe para dirección (listo para reenviar, sin datos individuales); abajo, solo People.
const cfg = $('Configuración').first().json;
const c = $('Centinela').first().json;
const res = $input.first().json;
const h = c.h;
let md, fuente = 'Claude';
try {
  md = res.content.find(b => b.type === 'text').text;
  if (!md || !md.trim()) throw new Error('vacío');
} catch (err) {
  md = c.reglas;
  fuente = 'reglas (Claude no disponible)';
}

const coma = s => String(s).replace(/(\d)\.(\d)/g, '$1,$2');
const lista = (xs, max = 8) => (xs.length ? `<ul>${xs.slice(0, max).map(x => `<li>${x}</li>`).join('')}${xs.length > max ? `<li>y ${xs.length - max} más (hoja skills-empleados)</li>` : ''}</ul>` : '<p>Nada.</p>');
const people = `
  <h4>Decisiones pendientes</h4>${lista(h.pendientes.map(a => `<b>${esc(a.alerta_id)}</b> ${esc(a.accion)} · ${a.dias} días sin decidir`))}
  <h4>Planes que tocan validar</h4>${lista(h.planes.filter(p => p.estado === 'toca validar').map(p => `${esc(p.plan_id)} ${esc(p.empleado)} · ${esc(p.skill)} · revisión ${esc(p.fecha_revision)} · ${p.avisos} aviso(s) al manager`))}
  <h4>Validaciones caducadas (más de ${h.umbrales.mesesValidacion} meses) en funciones al límite</h4>${lista(h.caducadas.map(v => `${esc(v.empleado)} · ${esc(v.skill)} (${esc(v.funcion_id)}) · validada el ${esc(v.fecha)} por ${esc(v.validado_por)}, hace ${v.meses} meses`))}
  <h4>Key people con señales de rotación</h4>${lista(h.senales.map(s => `${esc(s.nombre)} · ${s.senales.length} ${s.senales.length === 1 ? 'señal activa' : 'señales activas'} · nivel ${esc(s.nivel_senales)}: ${esc(coma(s.senales.join('; ')))}`))}`;

const cuerpo = `<h2>Revisión programada · ${esc(h.fecha)}</h2>
  <p>El centinela ha recalculado el mapa sin que nadie lo pidiera: 🔴 ${h.cuenta.rojo} · 🟡 ${h.cuenta.ambar} · 🟢 ${h.cuenta.verde}. <a href="${enlaceHris()}">Ver el mapa</a></p>
  <h3>Informe para dirección (listo para reenviar)</h3><div style="border-left:3px solid #1a73e8;padding-left:12px">${mdAHtml(md)}</div>
  <h3>Solo People (confidencial)</h3><div style="background:#fff4e5;padding:8px 12px">${people}</div>
  <p style="color:#888">Informe redactado por: ${esc(fuente)}. El riesgo lo calculan las reglas; el texto, la IA.</p>`;

return [{ json: { filas: c.filas, emails: [{
  para: cfg.email_demo,
  asunto: `[Acme People OS] Revisión ${h.fecha} · informe para dirección · 🔴 ${h.cuenta.rojo}${h.cambios.length ? ` · ${h.cambios.length} cambio(s)` : ''}`,
  html: html(cuerpo),
}], fuente } }];
