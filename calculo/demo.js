// Demo local del flujo principal (pasos 1-8) y del opcional "nueva skill". Plan B si falla el orquestador.
// El estado vive en salidas/demo/ (copias de los CSV); datos/ no se toca nunca.
//
//   npm run demo -- reset                              -> estado inicial + primera foto del histórico
//   npm run demo -- mapa                               -> mapa actual
//   npm run demo -- baja E007                          -> pasos 1-6: recálculo, comparación, propuesta, alertas, email
//   npm run demo -- aprobar ALR-002                    -> pasos 7-8: aprobación (opción de vacante, backup…) → recálculo
//   npm run demo -- validar E009 gestion-claves 3 E008 -> opcional: el manager valida el nuevo nivel → recálculo
//   npm run demo -- seguimiento [AAAA-MM-DD | +días]    -> seguimiento de planes (D-21): avisa, recuerda, escala
//   npm run demo -- centinela [AAAA-MM-DD | +días]      -> centinela de riesgo (D-21): revisión e informe para dirección
// La fecha simula el paso del tiempo (por defecto, hoy).
//
// Con la variable ANTHROPIC_API_KEY, la propuesta la redacta Claude (prompts/proponer-acciones.md).
// Sin ella, se usa una propuesta por reglas: la demo nunca se queda en blanco.

const fs = require('fs');
const path = require('path');
const { cargar, calcular, comparar, vacante, aplicarMovilidad } = require('./cobertura');
const { contexto, propuestaPorReglas, mensajeClaude } = require('./propuesta');
const { fechaValida, sumarDias, seguimientoPlanes, vigilar, informePorReglas } = require('./automatizaciones');

const RAIZ = path.join(__dirname, '..');
const EST = path.join(RAIZ, 'salidas', 'demo');
const MODELO = 'claude-sonnet-5-5';
const f = n => path.join(EST, n);
const hoy = () => new Date().toISOString().slice(0, 10);
const icono = { verde: '🟢', ambar: '🟡', rojo: '🔴' };
// Destinatario de los emails: variable EMAIL_DEMO (la dirección real nunca se escribe en el repo)
const PARA = process.env.EMAIL_DEMO || 'direccion@acme.example';

// ---------- CSV ----------
const esc = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function leer(n) {
  const txt = fs.readFileSync(f(n), 'utf8').replace(/\r/g, '').trim();
  const [cab, ...filas] = txt.split('\n');
  const cols = cab.split(',');
  const partir = l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).slice(0, cols.length).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  return { cols, filas: filas.map(l => Object.fromEntries(partir(l).map((v, i) => [cols[i], v]))) };
}
function escribir(n, cols, filas) { fs.writeFileSync(f(n), [cols.join(','), ...filas.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n'); }
function anadir(n, filas) { const t = leer(n); escribir(n, t.cols, [...t.filas, ...filas]); }

// ---------- Estado ----------
const COLS_ALERTAS = ['alerta_id', 'fecha', 'evento', 'funcion_id', 'prioridad', 'cambio', 'tipo_accion', 'accion', 'empleado_id', 'skill_id', 'formacion_id', 'por_que', 'riesgo_si_no', 'decision', 'decidido_por', 'fecha_decision', 'grupo'];
// grupo: opciones excluyentes de una misma decisión (p. ej. VAC-E007: buscar fuera o mover a alguien). Aprobar una descarta las demás.
const COLS_HIST = ['fecha', 'evento', 'funcion_id', 'semaforo', 'cobertura', 'prioridad'];
const estado = () => cargar(RAIZ, EST);

function foto(r, evento, fecha = hoy()) {
  anadir('historico-semaforo.csv', r.funciones.map(x => ({ fecha, evento, funcion_id: x.id, semaforo: x.semaforo, cobertura: x.cobertura, prioridad: x.prioridad })));
}
function ultimaFoto() {
  const h = leer('historico-semaforo.csv').filas;
  const ult = h[h.length - 1].evento;
  const filas = h.filter(x => x.evento === ult);
  return { funciones: filas.map(x => ({ id: x.funcion_id, semaforo: x.semaforo, cobertura: +x.cobertura, nombre: '' })) };
}

function reset() {
  fs.rmSync(EST, { recursive: true, force: true });
  fs.mkdirSync(EST, { recursive: true });
  for (const n of ['empleados.csv', 'skills-empleados.csv', 'planes-backup.csv']) fs.copyFileSync(path.join(RAIZ, 'datos', n), f(n));
  escribir('alertas.csv', COLS_ALERTAS, []);
  escribir('historico-semaforo.csv', COLS_HIST, []);
  const r = calcular(estado());
  foto(r, 'inicial');
  console.log('Estado de la demo reiniciado en salidas/demo/');
  mapa(r);
}

function mapa(r = calcular(estado()), resaltar = []) {
  const c = { verde: 0, ambar: 0, rojo: 0 };
  r.funciones.forEach(x => c[x.semaforo]++);
  console.log(`\nMAPA · ${c.rojo} rojo · ${c.ambar} ámbar · ${c.verde} verde`);
  for (const x of r.funciones) if (x.semaforo !== 'verde' || resaltar.includes(x.id))
    console.log(`${icono[x.semaforo]} ${x.prioridad.padEnd(2)} ${x.id.padEnd(7)} cob ${x.cobertura}/${x.objetivo}  ${x.nombre}${resaltar.includes(x.id) ? '  ◀' : ''}`);
  console.log(`Key people: ${r.key_people.map(k => k.nombre + (k.oculta ? ' (oculta)' : '')).join(', ')}`);
}

// ---------- Recálculo + comparación (pasos 2-3) ----------
function recalcular(evento) {
  const antes = ultimaFoto();
  const r = calcular(estado());
  const nombres = new Map(r.funciones.map(x => [x.id, x.nombre]));
  const cambios = comparar(antes, r).map(c => ({ ...c, nombre: nombres.get(c.id) }));
  foto(r, evento);
  console.log(`\n[2-3] Recálculo tras "${evento}". Cambios frente a la foto anterior:`);
  if (!cambios.length) console.log('  (ninguno)');
  for (const c of cambios) console.log(`  ${c.cambio === 'empeora' ? '↓' : '↑'} ${c.id} ${c.nombre}: ${icono[c.de]} → ${icono[c.a]} (cobertura ${c.cobertura_antes} → ${c.cobertura_despues})`);
  mapa(r, cambios.map(c => c.id));
  return { r, cambios };
}

// ---------- Propuesta (pasos 4-5): calculo/propuesta.js ----------
async function propuestaClaude(ctx) {
  const md = fs.readFileSync(path.join(RAIZ, 'prompts', 'proponer-acciones.md'), 'utf8');
  const system = md.split('## System')[1].split('## User')[0].trim();
  const user = mensajeClaude(ctx);
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODELO, max_tokens: 4000, system, messages: [{ role: 'user', content: user }] }),
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const t = (await res.json()).content.find(b => b.type === 'text').text;
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
}

async function proponer(ctx) {
  if (process.env.ANTHROPIC_API_KEY) {
    try { console.log('\n[5] Claude redacta la propuesta…'); return await propuestaClaude(ctx); }
    catch (e) { console.log(`  Claude no disponible (${e.message.slice(0, 80)}). Uso la propuesta por reglas.`); }
  } else console.log('\n[5] Sin ANTHROPIC_API_KEY: propuesta por reglas.');
  return propuestaPorReglas(ctx);
}

// ---------- Aviso (paso 6) ----------
function avisar(evento, cambios, prop) {
  const prev = leer('alertas.csv').filas.length;
  const filas = prop.acciones.map((a, i) => ({
    alerta_id: `ALR-${String(prev + i + 1).padStart(3, '0')}`, fecha: hoy(), evento,
    funcion_id: a.funcion_id, prioridad: a.prioridad, cambio: cambios.find(c => c.id === a.funcion_id)?.cambio || '',
    tipo_accion: a.tipo, accion: a.accion, empleado_id: a.empleado_id || '', skill_id: a.skill_id || '', formacion_id: a.formacion_id || '',
    por_que: a.por_que, riesgo_si_no: a.riesgo_si_no, decision: 'pendiente', decidido_por: '', fecha_decision: '', grupo: a.grupo || '',
  }));
  anadir('alertas.csv', filas);
  const opciones = filas.filter(a => a.grupo);
  const nEmp = cambios.filter(c => c.cambio === 'empeora').length;
  const email = [`Para: ${PARA}`, `Asunto: [Acme People OS] ${evento} · ${nEmp === 1 ? '1 función empeora' : `${nEmp} funciones empeoran`}`, '',
    prop.resumen_direccion, '',
    ...(opciones.length ? ['DECISIÓN · Cubrir el puesto (elegir una opción):', ...opciones.flatMap(a => [`- ${a.alerta_id} ${a.accion}`, `    ${a.por_que}`, `    ${a.riesgo_si_no}`]), ''] : []),
    opciones.length ? 'Otras acciones (pendientes de aprobación por People):' : 'Acciones propuestas (pendientes de aprobación por People):',
    ...filas.filter(a => !a.grupo).map(a => `- ${a.alerta_id} [${a.prioridad}] ${a.accion}`), '', 'Mapa actualizado: hoja "cobertura".'].join('\n');
  const archivo = `email-${Date.now()}.txt`;
  fs.writeFileSync(f(archivo), email + '\n');
  if (prop.detalle_people) fs.writeFileSync(f(archivo.replace('email', 'people-CONFIDENCIAL')), prop.detalle_people + '\n');
  console.log(`\n[6] ${filas.length} alertas en salidas/demo/alertas.csv · email en salidas/demo/${archivo}\n`);
  console.log(email.split('\n').map(l => '   │ ' + l).join('\n'));
}

// ---------- Comandos ----------
async function baja(id) {
  const t = leer('empleados.csv');
  const e = t.filas.find(x => x.id === id);
  if (!e) throw new Error(`No existe ${id}`);
  const vac = vacante(estado(), id); // el perfil del puesto se calcula con la persona aún dentro
  e.estado = 'baja';
  escribir('empleados.csv', t.cols, t.filas);
  const evento = `Baja de ${e.nombre} (${e.rol})`;
  console.log(`[1] ${evento}`);
  const { r, cambios } = recalcular(evento);
  if (!cambios.some(c => c.cambio === 'empeora')) return console.log('\nNinguna función empeora: no se genera alerta.');
  console.log(`\n[4] Candidatos, formación y señales calculados. Vacante: ${vac.rol} · candidatos internos: ${vac.candidatos.map(c => `${c.nombre} (${c.cumple}/${c.de})`).join(', ') || 'ninguno'}.`);
  avisar(evento, cambios, await proponer(contexto(r, cambios, evento, vac, estado())));
  console.log('\nSiguiente: npm run demo -- aprobar <alerta_id>');
}

function aprobar(id) {
  const t = leer('alertas.csv');
  const a = t.filas.find(x => x.alerta_id === id);
  if (!a) throw new Error(`No existe ${id}`);
  a.decision = 'aprobada'; a.decidido_por = 'People'; a.fecha_decision = hoy();
  const descartadas = a.grupo ? t.filas.filter(x => x.grupo === a.grupo && x !== a && x.decision === 'pendiente') : [];
  descartadas.forEach(x => Object.assign(x, { decision: 'descartada', decidido_por: 'People', fecha_decision: hoy() }));
  escribir('alertas.csv', t.cols, t.filas);
  console.log(`[7] People aprueba ${id}: ${a.accion}`);
  descartadas.forEach(x => console.log(`    ${x.alerta_id} descartada (misma decisión): ${x.accion}`));
  if (a.tipo_accion === 'movilidad') return mover(a);
  if (a.tipo_accion !== 'backup') return console.log('La acción no cambia la plantilla ni los planes: queda registrada, sin recálculo.');
  const p = leer('planes-backup.csv');
  const plan = { plan_id: `PB-${String(p.filas.length + 1).padStart(3, '0')}`, empleado_id: a.empleado_id, skill_id: a.skill_id, nivel_objetivo: '', funcion_id: a.funcion_id, formacion_id: a.formacion_id, fecha_inicio: hoy(), fecha_objetivo: '', estado: 'activo', origen: id };
  const fn = estado().funciones.funciones.find(x => x.id === a.funcion_id);
  plan.nivel_objetivo = fn.skills_requeridas.find(s => s.skill === a.skill_id).nivel;
  escribir('planes-backup.csv', p.cols, [...p.filas, plan]);
  console.log(`[8] Plan ${plan.plan_id} activo en planes-backup → vuelve al paso 1`);
  recalcular(`Plan de backup aprobado (${id})`);
}

// Opción interna aprobada: cambio de rol + equipo + planes para cerrar las brechas → vuelve al paso 1
function mover(a) {
  const vac = vacante(estado(), a.grupo.replace('VAC-', ''));
  const e = leer('empleados.csv');
  const { empleados, planes } = aplicarMovilidad(e.filas, vac, a.empleado_id, hoy(), a.alerta_id, estado().reglas);
  escribir('empleados.csv', e.cols, empleados);
  const p = leer('planes-backup.csv');
  const nuevos = planes.map((x, i) => ({ plan_id: `PB-${String(p.filas.length + i + 1).padStart(3, '0')}`, ...x }));
  escribir('planes-backup.csv', p.cols, [...p.filas, ...nuevos]);
  const c = vac.candidatos.find(x => x.id === a.empleado_id);
  console.log(`[8] ${c.nombre} pasa a ${vac.rol}; ${vac.equipo - 1} personas pasan a depender de él.`);
  nuevos.forEach(x => console.log(`    Plan ${x.plan_id}: ${x.skill_id} → ${x.nivel_objetivo} con ${x.formacion_id}`));
  c.brechas.filter(b => !b.formacion.length).forEach(b => console.log(`    ${b.skill}: sin formación en el catálogo → acompañamiento de su manager`));
  recalcular(`Movilidad aprobada (${a.alerta_id})`);
}

function validar(empleado, skill, nivel, manager) {
  const s = leer('skills-empleados.csv');
  const fila = s.filas.find(x => x.empleado_id === empleado && x.skill_id === skill);
  Object.assign(fila, { nivel_declarado: nivel, nivel_validado: nivel, validado_por: manager, fecha: hoy() });
  escribir('skills-empleados.csv', s.cols, s.filas);
  const p = leer('planes-backup.csv');
  p.filas.filter(x => x.empleado_id === empleado && x.skill_id === skill && x.estado === 'activo').forEach(x => (x.estado = 'completado'));
  escribir('planes-backup.csv', p.cols, p.filas);
  console.log(`[Opcional] ${manager} valida ${empleado} en ${skill} nivel ${nivel}. Plan de backup → completado.`);
  const { cambios } = recalcular(`Nueva skill validada (${empleado} ${skill} ${nivel})`);
  const mejoran = cambios.filter(c => c.cambio === 'mejora');
  if (mejoran.length) {
    const archivo = `email-${Date.now()}.txt`;
    fs.writeFileSync(f(archivo), [`Para: ${PARA}`, `Asunto: [Acme People OS] Riesgo reducido`, '', ...mejoran.map(c => `- ${c.id} ${c.nombre}: ${c.de} → ${c.a}`)].join('\n') + '\n');
    console.log(`\nEmail de cierre en salidas/demo/${archivo}`);
  }
}

// ---------- Automatizaciones con calendario (D-21): en n8n las dispara el calendario; aquí, el comando ----------
function seguimiento(fecha) {
  const datos = estado();
  const acciones = seguimientoPlanes(datos, fecha);
  console.log(`[Seguimiento · ${fecha}] ${acciones.length ? `${acciones.length} plan(es) requieren acción` : 'Ningún plan requiere acción'}`);
  const p = leer('planes-backup.csv');
  const al = leer('alertas.csv');
  for (const x of acciones) {
    Object.assign(p.filas.find(f => f.plan_id === x.plan_id), { avisos: x.avisos, ultimo_aviso: fecha });
    if (x.tipo === 'escalar') {
      const id = `ALR-${String(al.filas.length + 1).padStart(3, '0')}`;
      al.filas.push({ alerta_id: id, fecha, evento: `Seguimiento de planes · ${x.plan_id}`, funcion_id: x.funcion_id, prioridad: '', cambio: '', tipo_accion: 'seguimiento',
        accion: `Revisar el plan ${x.plan_id}: ${x.empleado.nombre} en ${x.skill_id} (${x.nivel_actual} → ${x.nivel_objetivo})`, empleado_id: x.empleado.id, skill_id: x.skill_id, formacion_id: x.formacion_id,
        por_que: `La revisión era el ${x.fecha_revision}. ${x.motivo}.`,
        riesgo_si_no: `${x.funcion_id} sigue dependiendo de un backup que nadie confirma.`, decision: 'pendiente', decidido_por: '', fecha_decision: '', grupo: `SEG-${x.plan_id}` });
      console.log(`  ⚠ ${x.plan_id}: ${x.motivo} → escala a People (${id})`);
    } else console.log(`  ✉ ${x.plan_id}: ${x.tipo} a ${x.manager?.nombre} (manager) · ¿ha alcanzado ${x.empleado.nombre} ${x.skill_id} ${x.nivel_objetivo}? Revisión ${x.fecha_revision}`);
  }
  escribir('planes-backup.csv', p.cols, p.filas);
  escribir('alertas.csv', al.cols, al.filas);
  return acciones;
}

function centinela(fecha) {
  const datos = estado();
  const antes = ultimaFoto();
  const r = calcular(datos);
  const nombres = new Map(r.funciones.map(x => [x.id, x.nombre]));
  const cambios = comparar(antes, r).map(c => ({ ...c, nombre: nombres.get(c.id) }));
  const h = vigilar(datos, r, cambios, leer('historico-semaforo.csv').filas, leer('alertas.csv').filas, fecha);
  foto(r, `Revisión programada (centinela) · ${fecha}`, fecha);
  const md = informePorReglas(h);
  fs.writeFileSync(f(`informe-direccion-${fecha}.md`), md + '\n');
  console.log(`[Centinela · ${fecha}] Mapa ${h.cuenta.rojo}·${h.cuenta.ambar}·${h.cuenta.verde} · ${h.fragiles.length} P1/P2 · ${h.pendientes.length} decisión(es) pendiente(s) · ${h.caducadas.length} validación(es) de más de ${h.umbrales.mesesValidacion} meses`);
  console.log(`Informe para dirección (por reglas) en salidas/demo/informe-direccion-${fecha}.md\n`);
  console.log(md.split('\n').map(l => '   │ ' + l).join('\n'));
  return h;
}

(async () => {
  const [cmd, ...a] = process.argv.slice(2);
  // Fecha: AAAA-MM-DD, o +N días desde hoy (p. ej. +84 = 12 semanas después)
  const fecha = fechaValida(a[0]) ? a[0] : /^\+\d+$/.test(a[0] || '') ? sumarDias(hoy(), +a[0].slice(1)) : hoy();
  if (cmd !== 'reset' && !fs.existsSync(f('alertas.csv'))) reset();
  if (cmd === 'reset') reset();
  else if (cmd === 'mapa') mapa();
  else if (cmd === 'baja') await baja(a[0]);
  else if (cmd === 'aprobar') aprobar(a[0]);
  else if (cmd === 'validar') validar(a[0], a[1], a[2], a[3]);
  else if (cmd === 'seguimiento') seguimiento(fecha);
  else if (cmd === 'centinela') centinela(fecha);
  else console.log('Comandos: reset · mapa · baja <id> · aprobar <alerta_id> · validar <empleado> <skill> <nivel> <manager> · seguimiento [fecha] · centinela [fecha]');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
