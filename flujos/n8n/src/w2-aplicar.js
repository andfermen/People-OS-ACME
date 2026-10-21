// W2 · nodo "Aplicar decisión": pasos 7-8. Aprueba la alerta (y descarta las otras opciones del mismo grupo),
// aplica el cambio (plan de backup o movilidad), recalcula y prepara la página de respuesta, las escrituras y el email.
const cfg = $('Configuración').first().json;
const T = tablas($('Leer Sheet').first().json);
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const base = datosDesde(T, defs);
const hoy = hoyISO();
const pagina = (titulo, cuerpo = '') => html(`<h2>${titulo}</h2>${cuerpo}<p><a href="https://docs.google.com/spreadsheets/d/${cfg.sheet_id}/edit">Abrir el Sheet</a></p>`);
const salida = (htmlPagina, peticiones = [], email = null) => [{ json: { html: htmlPagina, peticiones, email } }];

const alertaId = String(($('Webhook').first().json.query || {}).alerta || '').trim().toUpperCase();
const alertas = T['alertas'].filas;
const a = alertas.find(x => x.alerta_id === alertaId);
if (!a) return salida(pagina(`No existe la alerta ${esc(alertaId)}`));
if (a.decision !== 'pendiente') return salida(pagina(`${esc(alertaId)} ya está ${esc(a.decision)}`, `<p>${esc(a.accion)}</p><p>No se ha cambiado nada.</p>`));

// 7 · Decisión: aprobada + descartar las otras opciones de la misma decisión
const decidir = (x, decision) => filaEn('alertas', T['alertas'].cabecera, { ...x, decision, decidido_por: 'People', fecha_decision: hoy });
const descartadas = a.grupo ? alertas.filter(x => x !== a && x.grupo === a.grupo && x.decision === 'pendiente') : [];
const data = [decidir(a, 'aprobada'), ...descartadas.map(x => decidir(x, 'descartada'))];
const notas = descartadas.map(x => `${x.alerta_id} descartada (misma decisión): ${x.accion}`);

// 8 · Aplicar el cambio
let datos = base;
const planesNuevos = [];
const nuevoPlan = p => ({ plan_id: `PB-${String(base.planes.length + planesNuevos.length + 1).padStart(3, '0')}`, ...p });
if (a.tipo_accion === 'backup') {
  const fn = base.funciones.funciones.find(f => f.id === a.funcion_id);
  planesNuevos.push(nuevoPlan({ empleado_id: a.empleado_id, skill_id: a.skill_id, nivel_objetivo: fn.skills_requeridas.find(s => s.skill === a.skill_id).nivel, funcion_id: a.funcion_id, formacion_id: a.formacion_id, fecha_inicio: hoy, fecha_objetivo: '', estado: 'activo', origen: alertaId }));
  notas.push(`Plan de backup ${planesNuevos[0].plan_id}: ${a.skill_id} → ${planesNuevos[0].nivel_objetivo} con ${a.formacion_id}`);
}
if (a.tipo_accion === 'movilidad') {
  const vac = vacante(base, a.grupo.replace('VAC-', ''));
  const mov = aplicarMovilidad(base.empleados, vac, a.empleado_id, hoy, alertaId);
  const antes = new Map(base.empleados.map(e => [e.id, JSON.stringify(e)]));
  mov.empleados.filter(e => antes.get(e.id) !== JSON.stringify(e)).forEach(e => data.push(filaEn('empleados', T['empleados'].cabecera, e)));
  mov.planes.forEach(p => planesNuevos.push(nuevoPlan(p)));
  datos = { ...datos, empleados: mov.empleados };
  const c = vac.candidatos.find(x => x.id === a.empleado_id);
  notas.push(`${c.nombre} pasa a ${vac.rol}; su equipo pasa a depender de él.`, ...planesNuevos.map(p => `Plan ${p.plan_id}: ${p.skill_id} → ${p.nivel_objetivo} con ${p.formacion_id}`),
    ...c.brechas.filter(b => !b.formacion.length).map(b => `${b.skill}: sin formación en el catálogo → acompañamiento de su manager`));
}
datos = { ...datos, planes: [...datos.planes, ...planesNuevos] };

const peticiones = [];
let cambios = [];
let resumen = '<p>La acción queda registrada. No cambia la plantilla ni los planes, así que el mapa no se recalcula.</p>';
if (a.tipo_accion === 'backup' || a.tipo_accion === 'movilidad') {
  const evento = `Decisión aprobada (${alertaId})`;
  const r = calcular(datos);
  const nombres = new Map(r.funciones.map(f => [f.id, f.nombre]));
  cambios = comparar(ultimaFoto(T['historico-semaforo'].filas) || calcular(base), r).map(c => ({ ...c, nombre: nombres.get(c.id) }));
  const mapa = escriturasMapa(T, r, datos, evento);
  data.push(...mapa.data);
  peticiones.push(append(cfg.sheet_id, 'historico-semaforo', mapa.historico));
  resumen = cambios.length ? `<h3>Cambios en el mapa</h3>${listaCambios(cambios)}` : '<p>El mapa no cambia de color: mover o formar a alguien no crea skills validadas todavía.</p>';
}
peticiones.unshift(batch(cfg.sheet_id, data));
if (planesNuevos.length) peticiones.push(append(cfg.sheet_id, 'planes-backup', planesNuevos.map(p => T['planes-backup'].cabecera.map(c => p[c]))));

const cuerpo = `<p><b>${esc(a.accion)}</b></p><ul>${notas.map(n => `<li>${esc(n)}</li>`).join('')}</ul>${resumen}`;
return salida(pagina(`✅ ${esc(alertaId)} aprobada`, cuerpo), peticiones,
  { para: cfg.email_demo, asunto: `[Acme People OS] Decisión aprobada · ${alertaId} · ${cambios.filter(c => c.cambio === 'mejora').length ? 'el riesgo baja' : 'registrada'}`, html: html(`<h2>Decisión aprobada por People</h2>${cuerpo}`) });
