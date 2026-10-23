// Escenario 3 (automatizaciones con calendario) · nodo "Seguimiento": seguimiento de planes de backup (definiciones/reglas-agentes.md §1).
// Cada lunes, sin que nadie lo pida: a los planes que han llegado a su fecha, avisa al manager con el formulario de validación
// ya rellenado; si no valida, le recuerda a los 7 días; tras 2 avisos, abre una alerta para People. No sube ningún nivel.
const cfg = $('Configuración').first().json;
const T = tablas();
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const base = datosDesde(T, defs);
const hoy = fechaDe(cfg);

const acciones = seguimientoPlanes(base, hoy);
const U = umbralesAutomatizaciones(base.reglas);
const prioridadDe = id => T['cobertura'].filas.find(f => f.funcion_id === id)?.prioridad || '';
const skill = id => defs.taxonomia.skills.find(s => s.id === id)?.nombre || id;
const formacion = id => defs.catalogo.find(c => c.id === id);
const boton = (url, texto) => `<a href="${url}" style="background:#1a73e8;color:#fff;padding:6px 12px;border-radius:4px;text-decoration:none">${texto}</a>`;

let n = T['alertas'].filas.length;
const filas = [], emails = [];
for (const a of acciones) {
  filas.push(fila('planes-backup', { plan_id: a.plan_id, avisos: a.avisos, ultimo_aviso: hoy }));
  const f = formacion(a.formacion_id);
  const plan = `<ul><li>Persona: <b>${esc(a.empleado.nombre)}</b></li><li>Skill: ${esc(skill(a.skill_id))} · nivel validado hoy ${a.nivel_actual}, objetivo ${a.nivel_objetivo}</li>
    <li>Formación: ${esc(a.formacion_id)}${f ? ` · ${esc(f.nombre)} (${f.semanas} semanas)` : ''}</li><li>Función que protege: ${esc(a.funcion_id)}</li><li>Fecha de revisión: ${esc(a.fecha_revision)}</li></ul>`;

  if (a.tipo === 'escalar') {
    const al = {
      alerta_id: `ALR-${String(++n).padStart(3, '0')}`, fecha: hoy, evento: `Seguimiento de planes · ${a.plan_id}`, funcion_id: a.funcion_id, prioridad: prioridadDe(a.funcion_id), cambio: '',
      tipo_accion: 'seguimiento', accion: `Revisar el plan ${a.plan_id}: ${a.empleado.nombre} en ${a.skill_id} (${a.nivel_actual} → ${a.nivel_objetivo})`,
      empleado_id: a.empleado.id, skill_id: a.skill_id, formacion_id: a.formacion_id,
      por_que: `La revisión era el ${a.fecha_revision}. ${a.motivo}.`,
      riesgo_si_no: `${a.funcion_id} sigue dependiendo de un backup que nadie confirma.`, decision: 'pendiente', decidido_por: '', fecha_decision: '', grupo: `SEG-${a.plan_id}`,
    };
    filas.push(fila('alertas', al, COLS.alertas));
    emails.push({ para: cfg.email_demo, asunto: `[Acme People OS] People · ${a.plan_id} sin validar · ${al.alerta_id}`, html: html(`
      <h2>Un plan de backup necesita a People</h2><p>${esc(a.motivo)}. El seguimiento automático no puede hacer más: decide People.</p>${plan}
      <p>Queda registrado como <b>${al.alerta_id}</b> en la hoja <code>alertas</code>. Opciones: hablar con el manager, ampliar el plan o cambiar de backup. Decide People.</p>`) });
  } else {
    const q = { empleado_id: a.empleado.id, skill_id: a.skill_id, nivel: a.nivel_objetivo, validado_por: a.manager ? a.manager.id : '' };
    const url = `${cfg.url_formulario_skill}?${Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
    const quien = a.manager ? a.manager.nombre : 'manager';
    emails.push({ para: cfg.email_demo, asunto: `[Acme People OS] Para ${quien} (manager) · ${a.tipo === 'recordatorio' ? 'Recordatorio · ' : ''}¿Ha alcanzado ${a.empleado.nombre} el nivel ${a.nivel_objetivo}?`, html: html(`
      <h2>${a.tipo === 'recordatorio' ? 'Recordatorio: toca' : 'Toca'} revisar un plan de backup</h2>
      <p>Hola, ${esc(quien)}. El plan <b>${esc(a.plan_id)}</b> de tu equipo ha llegado a su fecha de revisión.</p>${plan}
      <p>Si ya tiene el nivel, valídalo aquí (el formulario va rellenado):</p><p>${boton(url, `Validar a ${esc(a.empleado.nombre)}`)}</p>
      <p><i>Completar la formación no sube el nivel: lo confirmas tú. Si aún no lo tiene, no hagas nada; te lo recordaré en ${U.diasEntreAvisos} días y, tras ${U.avisosAntesDeEscalar} avisos, People revisará el plan contigo.</i></p>`) });
  }
}
return [{ json: { hoy, acciones, filas, emails } }];
