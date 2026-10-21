// Escenario 1 (baja) · nodo "Escrituras": paso 6. Junta las filas a escribir (baja, mapa, alertas) y el email a People.
// Un solo email: arriba lo que vería dirección (sin datos individuales); abajo, lo confidencial y los botones Aprobar.
const cfg = $('Configuración').first().json;
const m = $('Motor').first().json;
const prop = $('Propuesta final').first().json;
if (!prop.alertas.length) return [{ json: { filas: m.filas, email: null } }]; // ninguna función empeora: se actualiza el mapa, sin aviso

const sheet = `https://docs.google.com/spreadsheets/d/${cfg.sheet_id}/edit`;
const aprobar = a => `<a href="${cfg.url_aprobar}?alerta=${a.alerta_id}" style="background:#1a73e8;color:#fff;padding:4px 10px;border-radius:4px;text-decoration:none">Aprobar ${a.alerta_id}</a>`;
const opciones = prop.alertas.filter(a => a.grupo);
const otras = prop.alertas.filter(a => !a.grupo);
const tarjeta = a => `<div style="border:1px solid #ddd;border-radius:6px;padding:10px;margin:8px 0"><b>${esc(a.accion)}</b><br>${esc(a.por_que)}<br><span style="color:#a50e0e">${esc(a.riesgo_si_no)}</span><p>${aprobar(a)}</p></div>`;

const cuerpo = `<h2>${esc(m.evento)}</h2>
  <h3>Resumen (lo que vería dirección)</h3><p>${esc(prop.resumen_direccion)}</p>
  ${listaCambios(m.cambios.filter(c => c.cambio === 'empeora'))}
  <p>Mapa: 🔴 ${m.conteo.rojo || 0} · 🟡 ${m.conteo.ambar || 0} · 🟢 ${m.conteo.verde || 0} — <a href="${sheet}">ver hoja cobertura</a></p>
  ${opciones.length ? `<h3>Decisión · cubrir el puesto (elegir una opción)</h3>${opciones.map(tarjeta).join('')}` : ''}
  ${otras.length ? `<h3>${opciones.length ? 'Otras acciones' : 'Acciones propuestas'}</h3>${otras.map(tarjeta).join('')}` : ''}
  ${prop.detalle_people ? `<h3>Solo People (confidencial)</h3><p style="background:#fff4e5;padding:8px">${esc(prop.detalle_people)}</p>` : ''}
  <p style="color:#888">Propuesta redactada por: ${esc(prop.fuente)}. Aprobar una opción descarta la otra y recalcula el mapa.</p>`;

return [{ json: {
  filas: [...m.filas, ...prop.alertas.map(a => fila('alertas', a, COLS.alertas))],
  email: { para: cfg.email_demo, asunto: `[Acme People OS] CONFIDENCIAL People · ${m.evento} · ${m.cambios.filter(c => c.cambio === 'empeora').length} función(es) empeoran`, html: html(cuerpo) },
} }];
