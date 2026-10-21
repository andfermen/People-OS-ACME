// Banco de pruebas de los dos escenarios de n8n sin n8n: ejecuta el código de los nodos tal cual está en los JSON generados
// contra un Sheet simulado (los CSV de salidas/sheets/) e imita los nodos nativos de Google Sheets (leer filas;
// actualizar, añadir o reescribir por clave según ESCRITURAS de comun.js).
// Recorre la demo dos veces: E1 baja de Elena → aprobar opción B → aprobar backup de Javier → E2 Marcos valida a Javier.
// Uso: npm run probar-n8n   (después de npm run n8n)

const fs = require('fs');
const path = require('path');
const { LECTURAS, ESCRITURAS } = require('./comun');
const RAIZ = path.join(__dirname, '..', '..', '..');
const wf = n => JSON.parse(fs.readFileSync(path.join(RAIZ, 'flujos', 'n8n', n), 'utf8'));
const E1 = wf('E1-baja-de-elena.json'), E2 = wf('E2-actualizacion-de-skill.json');
const HOJAS = ['empleados', 'skills-empleados', 'planes-backup', 'alertas', 'cobertura', 'key-people', 'historico-semaforo'];

// ---------- Sheet simulado: { hoja: { cab, filas: [ {col: valor} ] } } ----------
function csv(t) {
  const filas = []; let fila = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { fila.push(c); c = ''; }
    else if (ch === '\n') { fila.push(c); filas.push(fila); fila = []; c = ''; } else if (ch !== '\r') c += ch;
  }
  if (c || fila.length) { fila.push(c); filas.push(fila); }
  return filas.filter(f => f.some(x => x !== ''));
}
const comoSheet = v => (/^-?\d+(\.\d+)?$/.test(v) && !/^0\d/.test(v) ? +v : v); // UNFORMATTED_VALUE devuelve números
let sheet;
function reiniciar() { // lo que hace Claude Code al "reiniciar la demo": volver a cargar los CSV iniciales
  sheet = Object.fromEntries(HOJAS.map(h => {
    const [cab, ...f] = csv(fs.readFileSync(path.join(RAIZ, 'salidas', 'sheets', `${h}.csv`), 'utf8'));
    return [h, { cab, filas: f.map(x => Object.fromEntries(cab.map((k, i) => [k, comoSheet(x[i] || '')]))) }];
  }));
}
const leerItems = h => (sheet[h].filas.length ? sheet[h].filas.map((f, i) => ({ row_number: i + 2, ...f })) : [{}]); // alwaysOutputData
const objetos = h => sheet[h].filas.map(f => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));

function escribir(item) {
  const e = ESCRITURAS[item._hoja];
  if (!e) throw new Error(`Hoja sin regla de escritura: ${item._hoja}`);
  const t = sheet[e.hoja || item._hoja];
  const datos = Object.fromEntries(Object.entries(item).filter(([k]) => t.cab.includes(k))); // handlingExtraData: ignoreIt
  const nueva = () => t.filas.push(Object.fromEntries(t.cab.map(k => [k, datos[k] ?? ''])));
  if (e.op === 'append' || e.op === 'reemplazar') return nueva();
  const i = e.clave === 'row_number' ? item.row_number - 2 : t.filas.findIndex(f => String(f[e.clave]) === String(item[e.clave]));
  if (i >= 0 && t.filas[i]) Object.assign(t.filas[i], datos);
  else if (e.op === 'appendOrUpdate') nueva();
  else throw new Error(`update sin fila que coincida en ${item._hoja}: ${item[e.clave]}`);
}

// ---------- Ejecutar un nodo de código como n8n ----------
function ejecutar(w, nombre, salidas) {
  const n = w.nodes.find(x => x.name === nombre);
  if (!n) throw new Error(`No existe el nodo ${nombre}`);
  const $ = name => { if (!(name in salidas)) throw new Error(`Node '${name}' hasn't been executed`); return { first: () => ({ json: salidas[name][0] }), all: () => salidas[name].map(json => ({ json })) }; };
  const entrada = salidas.__entrada || [{}];
  const out = new Function('$', '$input', n.parameters.jsCode)($, { first: () => ({ json: entrada[0] }), all: () => entrada.map(json => ({ json })) });
  salidas[nombre] = out.map(o => o.json);
  return salidas[nombre];
}
// Bloque de escritura: Repartir → ¿A qué hoja? → nodos de Sheets (key-people se vacía antes) · Email
function escribirTodo(w, salidas) {
  const filas = ejecutar(w, 'Repartir', salidas);
  const kp = ejecutar(w, 'Filas key-people', salidas);
  if (kp.length) sheet['key-people'].filas = []; // Vaciar key-people (solo si hay filas nuevas)
  filas.forEach(escribir);
  return ejecutar(w, 'Email', salidas)[0];
}

const config = { sheet_id: 'TEST', email_demo: 'demo@acme.example', url_aprobar: 'https://n8n.test/webhook/acme-aprobar', modelo: 'claude-sonnet-5-5' };
const exprAccion = E1.nodes.find(n => n.name === 'Configuración').parameters.assignments.assignments.find(x => x.name === 'accion').value.replace(/^=\{\{|\}\}$/g, '');
const accionDe = entrada => new Function('$json', `return (${exprAccion});`)(entrada);
const comunes = (entrada = {}) => ({
  'Configuración': [{ ...entrada, ...config, accion: accionDe(entrada) }],
  'Leer definiciones': [{ definiciones: fs.readFileSync(path.join(RAIZ, 'salidas', 'n8n', 'definiciones.json'), 'utf8') }],
  ...Object.fromEntries(Object.entries(LECTURAS).map(([h, nodo]) => [nodo, leerItems(h)])),
});

let fallos = 0;
const caso = (txt, ok) => { console.log(`${ok ? '✅' : '❌'} ${txt}`); if (!ok) fallos++; };
const fn = id => objetos('cobertura').find(f => f.funcion_id === id);

function baja(id) {
  const s = comunes({ empleado_id: id });
  const m = ejecutar(E1, 'Motor', s)[0];
  s.__entrada = [{ error: { message: 'simulado: sin API key' } }];
  const p = ejecutar(E1, 'Propuesta final', s)[0];
  delete s.__entrada;
  ejecutar(E1, 'Escrituras', s);
  return { m, p, email: escribirTodo(E1, s) };
}
function aprobar(alerta) {
  const s = comunes({ query: { alerta }, headers: {} });
  const o = ejecutar(E1, 'Aplicar decisión', s)[0];
  return { o, email: escribirTodo(E1, s) };
}
function validar(empleado_id, skill_id, nivel, validado_por) {
  const s = comunes({ empleado_id, skill_id, nivel, validado_por });
  ejecutar(E2, 'Validar skill', s);
  return escribirTodo(E2, s);
}

for (const vuelta of [1, 2]) {
  reiniciar();
  const v = `[ensayo ${vuelta}]`;
  if (vuelta === 1) caso('Desvío del Escenario 1: formulario de baja → baja; botón Aprobar → aprobar',
    accionDe({ empleado_id: 'E007' }) === 'baja' && accionDe({ query: { alerta: 'ALR-002' }, headers: {} }) === 'aprobar');

  const b = baja('e007');
  caso(`${v} E1 baja: empeoran CUS-01 y CUS-02; sin Claude usa las reglas (ALR-001…004, A/B en el mismo grupo)`,
    ['CUS-01', 'CUS-02'].every(id => b.m.cambios.some(c => c.id === id && c.cambio === 'empeora')) && b.p.fuente.startsWith('reglas')
    && b.p.alertas.map(a => a.alerta_id).join() === 'ALR-001,ALR-002,ALR-003,ALR-004' && b.p.alertas[1].grupo === 'VAC-E007');
  caso(`${v} E1 baja · Sheet: Elena de baja, CUS-01 en rojo, 4 alertas pendientes, foto en el histórico, Marcos en key-people y Elena no`,
    objetos('empleados').find(e => e.id === 'E007').estado === 'baja' && fn('CUS-01').semaforo === 'rojo'
    && objetos('alertas').filter(a => a.decision === 'pendiente').length === 4 && objetos('historico-semaforo').some(h => h.evento.startsWith('Baja de Elena'))
    && objetos('key-people').some(k => k.empleado_id === 'E008') && !objetos('key-people').some(k => k.empleado_id === 'E007'));
  caso(`${v} E1 baja · un email a People: resumen para dirección, botones Aprobar y bloque confidencial separado`,
    b.email.asunto.startsWith('[Acme People OS] CONFIDENCIAL People') && b.email.html.includes('lo que vería dirección')
    && b.email.html.includes('acme-aprobar?alerta=ALR-002') && b.email.html.indexOf('compa-ratio') > b.email.html.indexOf('Solo People'));
  if (vuelta === 1) fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'muestra-email-people.html'), b.email.html);

  const B = aprobar('ALR-002');
  const al = Object.fromEntries(objetos('alertas').map(a => [a.alerta_id, a.decision]));
  const marcos = objetos('empleados').find(e => e.id === 'E008');
  caso(`${v} E1 aprobar opción B: ALR-002 aprobada, ALR-001 descartada; Marcos responsable de custodia; Javier depende de él; plan FOR-04; CUS-02 sigue en rojo`,
    al['ALR-002'] === 'aprobada' && al['ALR-001'] === 'descartada' && marcos.rol === 'Responsable de custodia' && marcos.manager_id === 'E001'
    && objetos('empleados').find(e => e.id === 'E009').manager_id === 'E008' && objetos('planes-backup').some(p => p.empleado_id === 'E008' && p.formacion_id === 'FOR-04')
    && fn('CUS-02').semaforo === 'rojo' && B.o.html.includes('ALR-002 aprobada'));
  const J = aprobar('ALR-003');
  caso(`${v} E1 aprobar backup de Javier: CUS-01 pasa de rojo a ámbar y el email lo cuenta`, fn('CUS-01').semaforo === 'ambar' && J.email.asunto.includes('el riesgo baja'));
  const R = aprobar('ALR-002');
  caso(`${v} E1 repetir un clic: "ya está aprobada", no escribe ni envía nada`, R.o.html.includes('ya está aprobada') && !R.o.filas.length && !R.email);

  const e2 = validar('E009', 'gestion-claves', '3', 'E008');
  const javier = objetos('skills-empleados').find(x => x.empleado_id === 'E009' && x.skill_id === 'gestion-claves');
  caso(`${v} E2 Marcos valida a Javier en gestión de claves 3: plan completado y CUS-01 pasa de ámbar a verde`,
    javier.nivel_validado === '3' && javier.validado_por === 'E008' && objetos('planes-backup').some(p => p.empleado_id === 'E009' && p.estado === 'completado')
    && fn('CUS-01').semaforo === 'verde' && e2.asunto.includes('Riesgo reducido'));
}
let error = '';
try { validar('E009', 'no-existe', '3', 'E008'); } catch (e) { error = e.message; }
caso('E2 entrada inválida: una skill que no está en la taxonomía da un error claro', error.includes('taxonomía'));
caso('E1 alerta inexistente: lo dice y no escribe nada', aprobar('ALR-999').o.html.includes('No existe'));

console.log(fallos ? `\n${fallos} caso(s) fallan` : '\nLos dos escenarios de n8n hacen la demo completa, dos veces seguidas · muestra del email en salidas/n8n/');
process.exit(fallos ? 1 : 0);
