// Automatizaciones con calendario (D-21): seguimiento de planes de backup y centinela de riesgo. No son agentes: aplican reglas.
// Implementa definiciones/reglas-agentes.md con los umbrales de definiciones/reglas.yaml (automatizaciones). Deterministas: deciden CUÁNDO actuar y QUÉ detectar; nunca deciden sobre una persona.
// Sin dependencias: lo usan la demo local (demo.js), el vídeo (exportar-video.js) y los nodos de código de n8n (exportar-n8n.js).

// Umbrales con nombres cortos, leídos de reglas.yaml (automatizaciones): seguimiento y centinela
const umbralesAutomatizaciones = reglas => ({
  diasEntreAvisos: reglas.automatizaciones.seguimiento.dias_entre_avisos,
  avisosAntesDeEscalar: reglas.automatizaciones.seguimiento.avisos_antes_de_escalar,
  mesesValidacion: reglas.automatizaciones.centinela.meses_validacion,
  diasDecisionPendiente: reglas.automatizaciones.centinela.dias_decision_pendiente,
});

const dias = (desde, hasta) => Math.round((Date.parse(hasta) - Date.parse(desde)) / 864e5);
const sumarDias = (fecha, n) => new Date(Date.parse(fecha) + n * 864e5).toISOString().slice(0, 10);
const fechaValida = f => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !isNaN(Date.parse(f));

// Fecha en que toca comprobar un plan: la objetivo si la tiene; si no, el inicio más la duración de su formación
function fechaRevision(plan, catalogo) {
  if (fechaValida(plan.fecha_objetivo)) return plan.fecha_objetivo;
  const f = catalogo.find(c => c.id === plan.formacion_id);
  return fechaValida(plan.fecha_inicio) && f ? sumarDias(plan.fecha_inicio, f.semanas * 7) : '';
}

// ---------- Seguimiento de planes ----------
// Para cada plan activo que ha llegado a su fecha: avisa al manager, le recuerda cada 7 días y, tras 2 avisos, escala a People.
// Devuelve las acciones; no escribe nada. avisos y ultimo_aviso viven en la hoja planes-backup.
function seguimientoPlanes(datos, hoy) {
  const U = umbralesAutomatizaciones(datos.reglas);
  const persona = id => datos.empleados.find(e => e.id === id);
  const acciones = [];
  for (const p of datos.planes.filter(x => x.estado === 'activo')) {
    const revision = fechaRevision(p, datos.catalogo);
    if (!revision || hoy < revision) continue; // aún en curso
    const avisos = +p.avisos || 0;
    if (avisos > U.avisosAntesDeEscalar) continue; // ya escalado: lo lleva People
    if (avisos && fechaValida(p.ultimo_aviso) && dias(p.ultimo_aviso, hoy) < U.diasEntreAvisos) continue; // avisado hace poco
    const e = persona(p.empleado_id);
    if (!e || e.estado !== 'activo') continue;
    const m = persona(e.manager_id);
    const sinManager = !m || m.estado !== 'activo'; // p. ej. su manager se ha ido: no hay a quién avisar, va directo a People
    const nivel = datos.skills.find(s => s.empleado_id === e.id && s.skill_id === p.skill_id)?.nivel_validado || 0;
    acciones.push({
      tipo: sinManager || avisos >= U.avisosAntesDeEscalar ? 'escalar' : avisos ? 'recordatorio' : 'aviso', sin_manager: sinManager,
      plan_id: p.plan_id, funcion_id: p.funcion_id, skill_id: p.skill_id, nivel_actual: +nivel, nivel_objetivo: +p.nivel_objetivo, formacion_id: p.formacion_id,
      empleado: { id: e.id, nombre: e.nombre }, manager: m ? { id: m.id, nombre: m.nombre } : null,
      fecha_revision: revision, dias_desde_revision: dias(revision, hoy), avisos: sinManager ? U.avisosAntesDeEscalar + 1 : avisos + 1,
      motivo: sinManager ? `${e.nombre} no tiene un manager activo que pueda validar${m ? ` (${m.nombre} ya no está)` : ''}`
        : `${m.nombre} ha recibido ${avisos} avisos y no ha validado el nivel`,
    });
  }
  return acciones;
}

// ---------- Centinela de riesgo ----------
// Revisión programada: qué está frágil y desde cuándo, qué se ha degradado sin que nadie lo avise y qué está pendiente.
// r = calcular(datos); cambios = comparar(foto anterior, r); historico y alertas = filas de sus hojas.
function vigilar(datos, r, cambios, historico, alertas, hoy) {
  const U = umbralesAutomatizaciones(datos.reglas);
  const nombre = id => datos.empleados.find(e => e.id === id)?.nombre || id;
  // Desde cuándo está cada función en su color actual (racha en el histórico)
  const desde = f => {
    const h = historico.filter(x => x.funcion_id === f.id).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
    let d = '';
    for (const x of h) if (x.semaforo !== f.semaforo) d = ''; else if (!d) d = x.fecha;
    return d;
  };
  const fragiles = r.funciones.filter(f => f.prioridad === 'P1' || f.prioridad === 'P2').map(f => {
    const d = desde(f);
    return { id: f.id, nombre: f.nombre, area: f.area, semaforo: f.semaforo, prioridad: f.prioridad, cobertura: f.cobertura, objetivo: f.objetivo, desde: d, dias: d ? dias(d, hoy) : null,
      cubren: f.skills.reduce((a, b) => (b.cobertura < a.cobertura ? b : a)).personas.map(nombre) };
  });
  // Validaciones caducadas que sostienen funciones críticas o importantes al límite de su cobertura
  const limite = sumarDias(hoy, -Math.round(U.mesesValidacion * 30.44));
  const caducadas = [];
  for (const f of r.funciones.filter(x => x.criticidad !== 'soporte')) for (const s of f.skills.filter(x => x.cobertura <= f.objetivo)) for (const id of s.personas) {
    const v = datos.skills.find(x => x.empleado_id === id && x.skill_id === s.skill);
    if (v && fechaValida(v.fecha) && v.fecha < limite) caducadas.push({ funcion_id: f.id, skill: s.skill, empleado: nombre(id), validado_por: v.validado_por, fecha: v.fecha, meses: Math.floor(dias(v.fecha, hoy) / 30.44) });
  }
  const planes = datos.planes.filter(p => p.estado === 'activo').map(p => {
    const rev = fechaRevision(p, datos.catalogo);
    return { plan_id: p.plan_id, empleado: nombre(p.empleado_id), skill: p.skill_id, funcion_id: p.funcion_id, formacion_id: p.formacion_id, fecha_revision: rev,
      estado: rev && hoy >= rev ? 'toca validar' : 'en curso', avisos: +p.avisos || 0 };
  });
  const pendientes = alertas.filter(a => a.decision === 'pendiente' && fechaValida(a.fecha) && dias(a.fecha, hoy) >= U.diasDecisionPendiente)
    .map(a => ({ alerta_id: a.alerta_id, accion: a.accion, prioridad: a.prioridad, fecha: a.fecha, dias: dias(a.fecha, hoy) }));
  // Solo People: key people con señales de rotación (nunca va al informe de dirección)
  const kp = new Set(r.key_people.map(k => k.id));
  const senales = r.senales_rotacion.filter(s => kp.has(s.id) && s.probabilidad !== 'baja');
  const cuenta = r.funciones.reduce((m, f) => ((m[f.semaforo] = (m[f.semaforo] || 0) + 1), m), { rojo: 0, ambar: 0, verde: 0 });
  // A dirección solo le llega "en seguimiento por People", sin el porqué (prompts/informe-direccion.md, regla 3)
  return { fecha: hoy, umbrales: U, cuenta, cambios, fragiles, key_people: r.key_people.map(k => ({ nombre: k.nombre, rol: k.rol, oculta: k.oculta, funciones: k.funciones.map(f => f.funcion), seguimiento: senales.some(s => s.id === k.id) })),
    caducadas, planes, pendientes, senales };
}

// Mensaje para Claude (prompts/informe-direccion.md): solo datos agregados y organizativos, sin señales ni salarios
function mensajeInforme(h, user) {
  const t = {
    fecha: h.fecha,
    mapa: [`Rojo ${h.cuenta.rojo} · ámbar ${h.cuenta.ambar} · verde ${h.cuenta.verde}`, ...h.fragiles.map(f => `${f.id} ${f.nombre} (${f.area}): ${f.semaforo} ${f.prioridad}, cobertura ${f.cobertura}/${f.objetivo}${f.dias != null ? `, en ${f.semaforo} desde ${f.desde} (${f.dias} días)` : ''}`)].join('\n'),
    key_people: h.key_people.map(k => `${k.nombre} · ${k.rol} · ${k.funciones.join(', ')}${k.oculta ? ' · oculta' : ''}${k.seguimiento ? ' · en seguimiento por People' : ''}`).join('\n'),
    cambios_mes: h.cambios.length ? h.cambios.map(c => `${c.id} ${c.nombre}: ${c.de} → ${c.a} (${c.cambio})`).join('\n') : 'Sin cambios respecto al último recálculo.',
    planes_backup: h.planes.map(p => `${p.plan_id} ${p.empleado} · ${p.skill} (${p.funcion_id}) · revisión ${p.fecha_revision || 'sin fecha'} · ${p.estado}`).join('\n') || 'Ninguno.',
    alertas_mes: [...h.pendientes.map(a => `${a.alerta_id} ${a.accion}: pendiente desde hace ${a.dias} días`),
      ...(h.caducadas.length ? [`${h.caducadas.length} validaciones de skills con más de ${h.umbrales.mesesValidacion} meses sostienen funciones al límite`] : [])].join('\n') || 'Ninguna.',
  };
  return user.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in t ? t[k] : m));
}

// Informe por reglas, con las secciones del prompt: si Claude no responde, el informe sale igual
function informePorReglas(h) {
  const p1 = h.fragiles.filter(f => f.prioridad === 'P1');
  const lin = xs => xs.map(x => `- ${x}`).join('\n');
  return [
    '## En una frase',
    `${h.cuenta.rojo} funciones en rojo, ${h.cuenta.ambar} en ámbar y ${h.cuenta.verde} en verde${p1.length ? `; ${p1.length} de prioridad 1` : ''}.`,
    '## Dónde somos frágiles',
    lin(h.fragiles.map(f => `**${f.id} ${f.nombre}** (${f.area}): ${f.prioridad}, cobertura ${f.cobertura} de ${f.objetivo}${f.dias != null ? `, ${f.dias} días en ${f.semaforo}` : ''}${f.cubren.length ? `. Depende de: ${f.cubren.join(', ')}` : '. Hoy no la cubre nadie'}`)),
    '## Qué ha cambiado',
    h.cambios.length ? lin(h.cambios.map(c => `${c.id} ${c.nombre}: ${c.de} → ${c.a}`)) : 'Nada desde el último recálculo.',
    '## Dependencia de personas',
    lin(h.key_people.map(k => `${k.nombre} (${k.rol}): ${k.funciones.join(', ')}${k.oculta ? ' · **oculta**' : ''}${k.seguimiento ? ' · en seguimiento por People' : ''}`)),
    '## Qué estamos haciendo',
    h.planes.length ? lin(h.planes.map(p => `Plan ${p.plan_id}: ${p.empleado} en ${p.skill} (${p.funcion_id}), ${p.estado}${p.fecha_revision ? `, revisión ${p.fecha_revision}` : ''}`)) : 'Ningún plan activo.',
    '## Qué necesitamos de dirección',
    lin([
      ...p1.filter(f => !f.cubren.length).map(f => `Decidir cómo cubrir **${f.id}**: hoy no la sabe hacer nadie (formar fuera, contratar o apoyo externo).`),
      ...h.pendientes.slice(0, 2).map(a => `Desbloquear ${a.alerta_id} (${a.accion}): ${a.dias} días sin decisión.`),
      ...(h.caducadas.length ? [`Pedir a los managers que revaliden ${h.caducadas.length} skills con más de ${h.umbrales.mesesValidacion} meses: el mapa vale lo que valga la validación.`] : []),
    ].slice(0, 3)),
  ].join('\n\n');
}

// Markdown sencillo (títulos, listas, negrita) → HTML de email
function mdAHtml(md) {
  const escapar = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = s => escapar(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const out = []; let lista = false;
  for (const l of String(md).replace(/\r/g, '').split('\n')) {
    const li = l.match(/^\s*(?:[-*]|\d+\.)\s+(.*)/);
    if (li) { if (!lista) { out.push('<ul>'); lista = true; } out.push(`<li>${inline(li[1])}</li>`); continue; }
    if (lista) { out.push('</ul>'); lista = false; }
    const t = l.match(/^(#{1,4})\s+(.*)/);
    if (t) out.push(`<h${Math.min(t[1].length + 2, 5)}>${inline(t[2])}</h${Math.min(t[1].length + 2, 5)}>`);
    else if (l.trim()) out.push(`<p>${inline(l)}</p>`);
  }
  if (lista) out.push('</ul>');
  return out.join('\n');
}

module.exports = { umbralesAutomatizaciones, dias, sumarDias, fechaValida, fechaRevision, seguimientoPlanes, vigilar, mensajeInforme, informePorReglas, mdAHtml };
