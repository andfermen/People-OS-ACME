// W1 · nodo "Emails": paso 6. Dos emails: dirección (sin datos individuales) y People (confidencial, con los enlaces para aprobar).
const cfg = $('Configuración').first().json;
const m = $('Motor').first().json;
let prop = null;
try { prop = $('Propuesta final').first().json; } catch (err) { return []; }

const sheet = `https://docs.google.com/spreadsheets/d/${cfg.sheet_id}/edit`;
const opciones = prop.alertas.filter(a => a.grupo);
const otras = prop.alertas.filter(a => !a.grupo);
const mapa = `<p>Mapa: 🔴 ${m.conteo.rojo || 0} · 🟡 ${m.conteo.ambar || 0} · 🟢 ${m.conteo.verde || 0} — <a href="${sheet}">ver hoja cobertura</a></p>`;
const aprobar = a => `<a href="${cfg.url_aprobar}?alerta=${a.alerta_id}" style="background:#1a73e8;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none">Aprobar ${a.alerta_id}</a>`;

const bloqueOpciones = conBoton => !opciones.length ? '' : `<h3>Decisión · cubrir el puesto (elegir una opción)</h3>${opciones.map(a => `
  <div style="border:1px solid #ddd;border-radius:6px;padding:10px;margin:8px 0">
    <b>${esc(a.accion)}</b><br><span>${esc(a.por_que)}</span><br><span style="color:#a50e0e">${esc(a.riesgo_si_no)}</span>
    ${conBoton ? `<p>${aprobar(a)}</p>` : ''}</div>`).join('')}`;
const bloqueOtras = conBoton => !otras.length ? '' : `<h3>${opciones.length ? 'Otras acciones' : 'Acciones propuestas'}</h3><ul>${otras.map(a => `
  <li><b>[${esc(a.prioridad)}] ${esc(a.accion)}</b><br>${esc(a.por_que)}${conBoton ? `<br>${aprobar(a)}` : ''}</li>`).join('')}</ul>`;

const direccion = html(`<h2>${esc(m.evento)}</h2><p>${esc(prop.resumen_direccion)}</p><h3>Funciones que empeoran</h3>${listaCambios(m.cambios.filter(c => c.cambio === 'empeora'))}
  ${mapa}${bloqueOpciones(false)}${bloqueOtras(false)}<p><i>Las acciones quedan pendientes de aprobación por People.</i></p>`);
const people = html(`<h2>CONFIDENCIAL People · ${esc(m.evento)}</h2>${prop.detalle_people ? `<p style="background:#fff4e5;padding:8px">${esc(prop.detalle_people)}</p>` : ''}
  ${mapa}${bloqueOpciones(true)}${bloqueOtras(true)}<p style="color:#888">Propuesta redactada por: ${esc(prop.fuente)}. Aprobar una opción descarta la otra y recalcula el mapa.</p>`);

return [{ json: {
  para: cfg.email_demo,
  asunto_direccion: `[Acme People OS] ${m.evento} · ${m.cambios.filter(c => c.cambio === 'empeora').length} función(es) empeoran`,
  html_direccion: direccion,
  asunto_people: `[Acme People OS] CONFIDENCIAL People · decisiones pendientes · ${m.evento}`,
  html_people: people,
} }];
