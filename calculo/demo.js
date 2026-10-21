// Demo local del flujo principal (pasos 1-8) y del opcional "nueva skill". Plan B si falla el orquestador.
// El estado vive en salidas/demo/ (copias de los CSV); datos/ no se toca nunca.
//
//   npm run demo -- reset                              -> estado inicial + primera foto del histórico
//   npm run demo -- mapa                               -> mapa actual
//   npm run demo -- baja E007                          -> pasos 1-6: recálculo, comparación, propuesta, alertas, email
//   npm run demo -- aprobar ALR-001                    -> pasos 7-8: aprobación → plan de backup → recálculo
//   npm run demo -- validar E009 gestion-claves 3 E008 -> opcional: el manager valida el nuevo nivel → recálculo
//
// Con la variable ANTHROPIC_API_KEY, la propuesta la redacta Claude (prompts/proponer-acciones.md).
// Sin ella, se usa una propuesta por reglas: la demo nunca se queda en blanco.

const fs = require('fs');
const path = require('path');
const { cargar, calcular, comparar } = require('./cobertura');

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
const COLS_ALERTAS = ['alerta_id', 'fecha', 'evento', 'funcion_id', 'prioridad', 'cambio', 'tipo_accion', 'accion', 'empleado_id', 'skill_id', 'formacion_id', 'por_que', 'riesgo_si_no', 'decision', 'decidido_por', 'fecha_decision'];
const COLS_HIST = ['fecha', 'evento', 'funcion_id', 'semaforo', 'cobertura', 'prioridad'];
const estado = () => cargar(RAIZ, EST);

function foto(r, evento) {
  anadir('historico-semaforo.csv', r.funciones.map(x => ({ fecha: hoy(), evento, funcion_id: x.id, semaforo: x.semaforo, cobertura: x.cobertura, prioridad: x.prioridad })));
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

// ---------- Propuesta (pasos 4-5) ----------
function contexto(r, cambios, evento) {
  const ids = cambios.filter(c => c.cambio === 'empeora').map(c => c.id);
  const afectadas = r.funciones.filter(x => ids.includes(x.id));
  const implicadas = new Set(afectadas.flatMap(x => x.skills.filter(s => s.semaforo !== 'verde').flatMap(s => s.personas)));
  const formaciones = new Set(afectadas.flatMap(x => x.skills.flatMap(s => s.formacion || [])));
  const datos = estado();
  // Si alguna función se rediseña con IA, la recualificación sale de las formaciones de IA del catálogo
  if (afectadas.some(x => x.respuesta === 'redisenar')) datos.catalogo.filter(c => c.skill.startsWith('ia-')).forEach(c => formaciones.add(c.id));
  return {
    evento, cambios, funciones_afectadas: afectadas, key_people: r.key_people,
    senales: r.senales_rotacion.filter(s => implicadas.has(s.id)),
    catalogo: datos.catalogo.filter(c => formaciones.has(c.id)),
  };
}

function propuestaPorReglas(ctx) {
  const acciones = [];
  for (const fn of ctx.funciones_afectadas) for (const s of fn.skills.filter(x => x.semaforo !== 'verde')) {
    const cand = (s.candidatos || []).find(c => !c.es_key_person);
    const form = ctx.catalogo.find(c => c.skill === s.skill);
    if (fn.respuesta === 'redisenar') {
      // Lente AI first: no se forma a nadie en el proceso actual; se rediseña y se recualifica
      const formIa = ctx.catalogo.find(c => c.skill === 'ia-automatizacion' && c.de === 1);
      acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'rediseno', accion: `Rediseñar ${fn.nombre} con IA y automatización${cand ? ` y recualificar a ${cand.nombre}` : ''}`, empleado_id: cand?.id || '', skill_id: 'ia-automatizacion', formacion_id: formIa?.id || '', por_que: `Cobertura ${s.cobertura} en ${s.skill} e impacto IA alto: formar un backup en el proceso actual es invertir en un proceso que va a cambiar.${cand?.con_interes ? ` ${cand.nombre} tiene interés declarado.` : ''}`, riesgo_si_no: `${fn.nombre} sigue dependiendo de ${s.cobertura} persona(s) y de un proceso manual.` });
      if (s.cobertura === 0) acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'redistribuir', accion: `Cubrir ${fn.nombre} con apoyo temporal mientras dura el rediseño`, empleado_id: '', skill_id: s.skill, formacion_id: '', por_que: 'Nadie cubre la skill hoy.', riesgo_si_no: 'La próxima entrega queda sin responsable.' });
    }
    else if (cand && s.cobertura > 0) acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'backup', accion: `Plan de backup: ${cand.nombre} en ${s.skill} (${s.nivel_minimo - 1} → ${s.nivel_minimo})`, empleado_id: cand.id, skill_id: s.skill, formacion_id: form?.id || '', por_que: `Cobertura ${s.cobertura}. ${cand.nombre} está a un nivel${cand.con_interes ? ' y tiene interés declarado' : ''}.`, riesgo_si_no: `La función ${fn.nombre} depende de ${s.cobertura} persona.` });
    else acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'contratar', accion: `Abrir vacante con ${s.skill} nivel ${s.nivel_minimo}`, empleado_id: '', skill_id: s.skill, formacion_id: '', por_que: `Cobertura ${s.cobertura} y ningún candidato interno llega a tiempo.`, riesgo_si_no: `${fn.nombre} queda sin nadie que pueda sostenerla.` });
    if (s.cobertura === 1) {
      const kp = s.personas[0];
      acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'retencion', accion: `Conversación de permanencia con ${ctx.key_people.find(k => k.id === kp)?.nombre || kp}`, empleado_id: kp, skill_id: s.skill, formacion_id: '', por_que: 'Es la única cobertura de la skill.', riesgo_si_no: 'Una segunda salida deja la función sin cobertura.' });
    }
  }
  return { acciones, resumen_direccion: `${ctx.evento}: ${ctx.cambios.filter(c => c.cambio === 'empeora').length} función(es) empeoran. Se proponen ${acciones.length} acciones para su aprobación por People.`, detalle_people: '', observaciones: 'Propuesta generada por reglas (sin IA).' };
}

async function propuestaClaude(ctx) {
  const md = fs.readFileSync(path.join(RAIZ, 'prompts', 'proponer-acciones.md'), 'utf8');
  const system = md.split('## System')[1].split('## User')[0].trim();
  const j = v => JSON.stringify(v, null, 1);
  const user = `Evento: ${ctx.evento}\n\nCambios en el mapa:\n${j(ctx.cambios)}\n\nFunciones afectadas (detalle del cálculo):\n${j(ctx.funciones_afectadas)}\n\nKey people tras el cambio:\n${j(ctx.key_people)}\n\nSeñales de rotación (solo personas implicadas, confidencial People):\n${j(ctx.senales)}\n\nFormaciones disponibles:\n${j(ctx.catalogo)}`;
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
    por_que: a.por_que, riesgo_si_no: a.riesgo_si_no, decision: 'pendiente', decidido_por: '', fecha_decision: '',
  }));
  anadir('alertas.csv', filas);
  const email = [`Para: ${PARA}`, `Asunto: [Acme People OS] ${evento} · ${cambios.filter(c => c.cambio === 'empeora').length} función(es) empeoran`, '',
    prop.resumen_direccion, '', 'Acciones propuestas (pendientes de aprobación por People):',
    ...filas.map(a => `- ${a.alerta_id} [${a.prioridad}] ${a.accion}`), '', 'Mapa actualizado: hoja "cobertura".'].join('\n');
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
  e.estado = 'baja';
  escribir('empleados.csv', t.cols, t.filas);
  const evento = `Baja de ${e.nombre} (${e.rol})`;
  console.log(`[1] ${evento}`);
  const { r, cambios } = recalcular(evento);
  if (!cambios.some(c => c.cambio === 'empeora')) return console.log('\nNinguna función empeora: no se genera alerta.');
  console.log('\n[4] Candidatos, formación y señales de las personas implicadas calculados.');
  avisar(evento, cambios, await proponer(contexto(r, cambios, evento)));
  console.log('\nSiguiente: npm run demo -- aprobar <alerta_id>');
}

function aprobar(id) {
  const t = leer('alertas.csv');
  const a = t.filas.find(x => x.alerta_id === id);
  if (!a) throw new Error(`No existe ${id}`);
  a.decision = 'aprobada'; a.decidido_por = 'People'; a.fecha_decision = hoy();
  escribir('alertas.csv', t.cols, t.filas);
  console.log(`[7] People aprueba ${id}: ${a.accion}`);
  if (a.tipo_accion !== 'backup') return console.log('La acción no es un plan de backup: queda registrada, sin recálculo.');
  const p = leer('planes-backup.csv');
  const plan = { plan_id: `PB-${String(p.filas.length + 1).padStart(3, '0')}`, empleado_id: a.empleado_id, skill_id: a.skill_id, nivel_objetivo: '', funcion_id: a.funcion_id, formacion_id: a.formacion_id, fecha_inicio: hoy(), fecha_objetivo: '', estado: 'activo', origen: id };
  const fn = estado().funciones.funciones.find(x => x.id === a.funcion_id);
  plan.nivel_objetivo = fn.skills_requeridas.find(s => s.skill === a.skill_id).nivel;
  escribir('planes-backup.csv', p.cols, [...p.filas, plan]);
  console.log(`[8] Plan ${plan.plan_id} activo en planes-backup → vuelve al paso 1`);
  recalcular(`Plan de backup aprobado (${id})`);
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

(async () => {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd !== 'reset' && !fs.existsSync(f('alertas.csv'))) reset();
  if (cmd === 'reset') reset();
  else if (cmd === 'mapa') mapa();
  else if (cmd === 'baja') await baja(a[0]);
  else if (cmd === 'aprobar') aprobar(a[0]);
  else if (cmd === 'validar') validar(a[0], a[1], a[2], a[3]);
  else console.log('Comandos: reset · mapa · baja <id> · aprobar <alerta_id> · validar <empleado> <skill> <nivel> <manager>');
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
