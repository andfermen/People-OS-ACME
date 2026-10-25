// Banco de pruebas de los workflows de n8n sin n8n: ejecuta el código de los nodos tal cual está en los JSON generados
// contra un HRIS simulado (los CSV de salidas/sheets/). Imita el subworkflow HRIS (D-24): leer todas las hojas; escribir
// actualizando, añadiendo o reescribiendo por clave según ESCRITURAS de comun.js; cargar para el reinicio.
// Las respuestas de Claude se simulan: sin API, para que las pruebas sean deterministas.
// Recorre la demo dos veces: E1 baja de Elena → aprobar opción B → aprobar backup de Javier → E3 seguimiento (+12 semanas)
// → E2 Marcos valida a Javier → E3 seguimiento recuerda y escala → E3 centinela.
// Uso: npm run probar-n8n   (después de npm run n8n)

const fs = require('fs');
const path = require('path');
const { LECTURAS, ESCRITURAS, HOJAS_INICIALES } = require('./comun');
const RAIZ = path.join(__dirname, '..', '..', '..');
const wf = n => JSON.parse(fs.readFileSync(path.join(RAIZ, 'flujos', 'n8n', n), 'utf8'));
const HRIS = wf('HRIS-google-sheets.json'), E0 = wf('E0-panel-y-reinicio.json'), E1 = wf('E1-baja-de-elena.json'), E1b = wf('E1b-aprobar-decision.json'), E2 = wf('E2-actualizacion-de-skill.json'),
  E3 = wf('E3-automatizaciones-calendario.json'), E4 = wf('E4-asistente-people.json');
const HOJAS = ['empleados', 'skills-empleados', 'planes-backup', 'alertas', 'cobertura', 'key-people', 'historico-semaforo', 'bandeja'];

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
// Escritura: Repartir → "Escribir en el HRIS" (subworkflow: ¿A qué hoja? → nodos de Sheets; key-people se vacía antes) · Email
function escribirTodo(w, salidas, email = 'Email') {
  const filas = ejecutar(w, 'Repartir', salidas);
  if (filas.some(f => f.operacion !== 'escribir')) throw new Error('Repartir debe pedir al HRIS la operación escribir');
  const kp = ejecutar(HRIS, 'Filas key-people', { 'Llamada al HRIS': filas });
  if (kp.length) sheet['key-people'].filas = []; // Vaciar key-people (solo si hay filas nuevas)
  filas.forEach(escribir);
  const e = ejecutar(w, email, salidas);
  return email === 'Email' ? e[0] : e;
}

const config = { sheet_id: 'TEST', email_demo: 'demo@acme.example', url_aprobar: 'https://n8n.test/webhook/acme-aprobar', url_formulario_skill: 'https://n8n.test/form/skill', modelo: 'claude-sonnet-5-5' };
const comunes = (entrada = {}) => ({
  'Configuración': [{ ...entrada, ...config }],
  'Leer definiciones': [{ definiciones: fs.readFileSync(path.join(RAIZ, 'salidas', 'n8n', 'definiciones.json'), 'utf8') }],
  'Leer HRIS': leerHris(),
});
// "Leer HRIS": lo que devuelve el nodo Tablas del subworkflow HRIS, ejecutado sobre las lecturas simuladas
function leerHris() {
  const s = { 'Configuración HRIS': [{ sheet_id: 'TEST' }], ...Object.fromEntries(Object.entries(LECTURAS).map(([h, nodo]) => [nodo, leerItems(h)])) };
  return ejecutar(HRIS, 'Tablas', s);
}

let fallos = 0;
const caso = (txt, ok) => { console.log(`${ok ? '✅' : '❌'} ${txt}`); if (!ok) fallos++; };
const tipos = w => new Set(w.nodes.map(n => n.type));
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
  const s = comunes({ query: { alerta }, headers: {}, webhookUrl: 'https://n8n.test/webhook/acme-aprobar' });
  const o = ejecutar(E1b, 'Aplicar decisión', s)[0];
  return { o, email: escribirTodo(E1b, s) };
}
function validar(empleado_id, skill_id, nivel, validado_por) {
  const s = comunes({ empleado_id, skill_id, nivel, validado_por });
  ejecutar(E2, 'Validar skill', s);
  return escribirTodo(E2, s);
}
// Escenario 3: se lanza como el formulario "Ejecutar ahora" (automatización + tiempo simulado)
const enDias = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
function seguimiento(fecha, cuando) {
  const s = comunes({ automatizacion: 'seguimiento', fecha, cuando });
  const o = ejecutar(E3, 'Seguimiento', s)[0];
  return { o, emails: escribirTodo(E3, s, 'Emails') };
}
function centinela(fecha) {
  const s = comunes({ automatizacion: 'centinela', fecha });
  ejecutar(E3, 'Centinela', s);
  s.__entrada = [{ error: { message: 'simulado: sin API key' } }];
  const o = ejecutar(E3, 'Informe final', s)[0];
  delete s.__entrada;
  return { o, emails: escribirTodo(E3, s, 'Emails') };
}
const plan = id => objetos('planes-backup').find(p => p.plan_id === id);
// Escenario 0: el panel y el reinicio, como los lanza el navegador
const urlsE0 = { webhookUrl: 'https://n8n.test/webhook/acme-panel', url_form_baja: 'https://n8n.test/form/baja', url_form_skill: 'https://n8n.test/form/skill', url_form_automatizaciones: 'https://n8n.test/form/automatizaciones', url_video: 'PEGAR_URL_DEL_VIDEO_OPCIONAL', repo: 'https://raw.githubusercontent.com/acme/People-OS-ACME/main' };
const panel = () => ejecutar(E0, 'Panel', comunes(urlsE0))[0].html;
function reinicioE0() {
  const s = comunes({ ...urlsE0, webhookUrl: 'https://n8n.test/webhook/acme-reiniciar' });
  HOJAS_INICIALES.forEach(h => { s[`CSV ${h}`] = [{ csv: fs.readFileSync(path.join(RAIZ, 'salidas', 'sheets', `${h}.csv`), 'utf8') }]; });
  const filas = ejecutar(E0, 'Filas iniciales', s);
  if (filas.some(f => f.operacion !== 'cargar')) throw new Error('El reinicio debe pedir al HRIS la operación cargar');
  // Subworkflow HRIS, operación cargar: vaciar las hojas (dejan la cabecera) y escribir cada una
  [...HOJAS_INICIALES, 'alertas', 'bandeja'].forEach(h => { sheet[h].filas = []; });
  HOJAS_INICIALES.forEach(h => ejecutar(HRIS, `Solo ${h}`, { 'Llamada al HRIS': filas }).forEach(f => sheet[h].filas.push(Object.fromEntries(sheet[h].cab.map(k => [k, f[k] ?? ''])))));
  return ejecutar(E0, 'Página reiniciada', s)[0].html;
}

for (const vuelta of [1, 2]) {
  reiniciar();
  const v = `[ensayo ${vuelta}]`;
  if (vuelta === 1) caso('Escenarios 1 y 1b separados: el formulario de baja no convive con "Respond to Webhook"; el botón Aprobar (/webhook/acme-aprobar) vive en 1b',
    tipos(E1).has('n8n-nodes-base.formTrigger') && !tipos(E1).has('n8n-nodes-base.respondToWebhook') && !tipos(E1).has('n8n-nodes-base.webhook')
    && E1b.nodes.some(n => n.name === 'Botón Aprobar' && n.parameters.path === 'acme-aprobar') && !tipos(E1b).has('n8n-nodes-base.formTrigger'));

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
  const p1 = panel();
  caso(`${v} E0 panel tras la baja: mapa 5 en rojo, paso "decidir" marcado como ahora, botones Aprobar y el email en la bandeja`,
    objetos('bandeja').length === 1 && objetos('bandeja')[0].asunto.includes('CONFIDENCIAL People') && p1.includes('<b>5</b>en rojo')
    && /class="ahora[^"]*">[\s\S]*?Decidir cómo cubrir/.test(p1) && p1.includes('https://n8n.test/webhook/acme-aprobar?alerta=ALR-002') && p1.includes('Bandeja de People'));
  if (vuelta === 1) fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'muestra-panel.html'), p1);

  const B = aprobar('ALR-002');
  const al = Object.fromEntries(objetos('alertas').map(a => [a.alerta_id, a.decision]));
  const marcos = objetos('empleados').find(e => e.id === 'E008');
  caso(`${v} E1 aprobar opción B: ALR-002 aprobada, ALR-001 descartada; Marcos responsable de custodia; Javier depende de él; plan FOR-04; CUS-02 sigue en rojo`,
    al['ALR-002'] === 'aprobada' && al['ALR-001'] === 'descartada' && marcos.rol === 'Responsable de custodia' && marcos.manager_id === 'E001'
    && objetos('empleados').find(e => e.id === 'E009').manager_id === 'E008' && objetos('planes-backup').some(p => p.empleado_id === 'E008' && p.formacion_id === 'FOR-04')
    && fn('CUS-02').semaforo === 'rojo' && B.o.html.includes('ALR-002 aprobada'));
  caso(`${v} E1 la página de aprobar vuelve al panel`, B.o.html.includes('https://n8n.test/webhook/acme-panel'));
  const J = aprobar('ALR-003');
  caso(`${v} E1 aprobar backup de Javier: CUS-01 pasa de rojo a ámbar y el email lo cuenta`, fn('CUS-01').semaforo === 'ambar' && J.email.asunto.includes('el riesgo baja'));
  const R = aprobar('ALR-002');
  caso(`${v} E1 repetir un clic: "ya está aprobada", no escribe ni envía nada`, R.o.html.includes('ya está aprobada') && !R.o.filas.length && !R.email);

  // E3 · seguimiento de planes "12 semanas después": nadie pulsa nada y el agente avisa a los managers
  const s1 = seguimiento('', '+12 semanas'); // como el formulario: «cuando» = +12 semanas
  caso(`${v} E3 seguimiento (+12 semanas): avisa a Marcos por Javier (PB-004, formulario rellenado) y al CEO por Marcos (PB-003); lo anota en planes-backup`,
    s1.o.acciones.map(x => `${x.plan_id}:${x.tipo}:${x.manager.id}`).sort().join() === 'PB-003:aviso:E001,PB-004:aviso:E008'
    && s1.emails.some(e => e.asunto.includes('Para Marcos Fuentes Rey') && e.html.includes('form/skill?empleado_id=E009&amp;skill_id=gestion-claves&amp;nivel=3&amp;validado_por=E008') === false && e.html.includes('empleado_id=E009&skill_id=gestion-claves&nivel=3&validado_por=E008'))
    && plan('PB-004').avisos === '1' && plan('PB-003').avisos === '1');
  caso(`${v} E3 seguimiento el mismo día otra vez: no repite avisos`, !seguimiento(enDias(84)).o.acciones.length);

  const e2 = validar('E009', 'gestion-claves', '3', 'E008');
  const javier = objetos('skills-empleados').find(x => x.empleado_id === 'E009' && x.skill_id === 'gestion-claves');
  caso(`${v} E2 Marcos valida a Javier en gestión de claves 3: plan completado y CUS-01 pasa de ámbar a verde`,
    javier.nivel_validado === '3' && javier.validado_por === 'E008' && objetos('planes-backup').some(p => p.empleado_id === 'E009' && p.estado === 'completado')
    && fn('CUS-01').semaforo === 'verde' && e2.asunto.includes('Riesgo reducido'));

  const s2 = seguimiento(enDias(91));
  caso(`${v} E3 seguimiento (+13 semanas): Javier ya validado no vuelve a salir; a Marcos (PB-003) se le recuerda`,
    s2.o.acciones.map(x => `${x.plan_id}:${x.tipo}`).join() === 'PB-003:recordatorio' && s2.emails[0].asunto.includes('Recordatorio'));
  const s3 = seguimiento(enDias(98));
  const esc3 = objetos('alertas').find(x => x.grupo === 'SEG-PB-003');
  caso(`${v} E3 seguimiento (+14 semanas): tras 2 avisos escala a People con una alerta pendiente; después ya no insiste`,
    s3.o.acciones.map(x => `${x.plan_id}:${x.tipo}`).join() === 'PB-003:escalar' && esc3 && esc3.decision === 'pendiente' && esc3.tipo_accion === 'seguimiento'
    && s3.emails[0].asunto.startsWith('[Acme People OS] People') && !seguimiento(enDias(112)).o.acciones.length);

  // E3 · centinela: revisión mensual programada
  const c = centinela(enDias(98));
  const html = c.emails[0].html, corte = html.indexOf('Solo People');
  caso(`${v} E3 centinela: recalcula y guarda la foto; informe para dirección por reglas (CUS-02 P1 sin cobertura, ALR-004 pendiente, validaciones caducadas)`,
    objetos('historico-semaforo').some(x => x.evento.startsWith('Revisión programada (centinela)') && x.fecha === enDias(98)) && c.o.fuente.startsWith('reglas')
    && /CUS-02[^<]*<\/b>[^<]*P1, cobertura 0/.test(html.slice(0, corte)) && html.slice(0, corte).includes('Desbloquear ALR-004') && html.slice(0, corte).includes('revaliden'));
  if (vuelta === 1) {
    fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'muestra-email-centinela.html'), html);
    fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'muestra-email-seguimiento.html'), s1.emails.find(e => e.asunto.includes('Para Marcos')).html);
  }
  caso(`${v} E3 centinela: la parte para dirección no lleva señales ni salarios; la de People sí`,
    corte > 0 && !/compa-ratio|nivel (bajo|medio|alto)|señal(es)? activa|evaluación \d/.test(html.slice(0, corte)) && /nivel (medio|alto)/.test(html.slice(corte)));
}
// E0 reinicio: después de jugar, el botón Reiniciar deja el Sheet como al principio (sin Claude Code)
const pr = reinicioE0();
caso('E0 reiniciar: Elena activa, alertas y bandeja vacías, 2 planes, CUS-01 en verde, histórico inicial; vuelve al panel',
  objetos('empleados').find(e => e.id === 'E007').estado === 'activo' && !objetos('alertas').length && !objetos('bandeja').length && objetos('planes-backup').length === 2
  && fn('CUS-01').semaforo === 'verde' && objetos('historico-semaforo').every(h => h.evento === 'inicial') && objetos('skills-empleados').length > 900
  && pr.includes('https://n8n.test/webhook/acme-panel') && /class="ahora[^"]*">[\s\S]*?Registrar la baja/.test(panel()));

// HRIS: los escenarios no tienen nodos de Google Sheets; todo pasa por el subworkflow
const nodosSheets = w => w.nodes.filter(n => n.type === 'n8n-nodes-base.googleSheets').length;
const hl = leerHris()[0];
caso('HRIS (adaptador): solo el subworkflow HRIS tiene nodos de Google Sheets; "leer" devuelve todas las hojas y el enlace',
  [E0, E1, E1b, E2, E3, E4].every(w => nodosSheets(w) === 0) && nodosSheets(HRIS) > 0
  && Object.keys(LECTURAS).every(h => Array.isArray(hl.tablas[h])) && hl.enlace.includes('TEST'));
const pm = panel();
caso('E0 panel: "Estado del montaje" en verde con todo configurado, y "Qué hay detrás" con las capas y cómo serían en producción',
  pm.includes('todo conectado') && !pm.includes('por revisar') && pm.includes('Qué hay detrás') && (pm.match(/En producción:/g) || []).length === 6);
caso('Cada workflow lleva en el lienzo su nota "En producción"',
  [HRIS, E0, E1, E1b, E2, E3, E4].every(w => w.nodes.some(n => n.type.endsWith('stickyNote') && n.parameters.content.startsWith('## En producción'))));

// E4 · Asistente de People: un agente. Se simulan dos respuestas de Claude: pide una herramienta y luego responde
const claudePide = (nombre, input) => ({ stop_reason: 'tool_use', content: [{ type: 'text', text: 'Voy a simular la baja antes de responder.' }, { type: 'tool_use', id: 'tu_1', name: nombre, input }] });
const claudeResponde = texto => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: texto }] });
function asistente(pregunta, respuestas) {
  const s = comunes({ query: { pregunta }, webhookUrl: 'https://n8n.test/webhook/acme-asistente' });
  let o = ejecutar(E4, 'Preparar', s)[0];
  for (let k = 1; k <= 4 && o.sigue; k++) { s.__entrada = [respuestas[k - 1] || { error: 'sin respuesta' }]; o = ejecutar(E4, `Herramientas ${k}`, s)[0]; }
  s.__entrada = [o];
  return { o, html: ejecutar(E4, 'Respuesta', s)[0].html };
}
const as = asistente('¿Qué pasa si se va Carmen?', [claudePide('simular_baja', { empleado_id: 'E011' }), claudeResponde('Si se va Carmen, **CMP-03** se queda sin cobertura.')]);
caso('E4 asistente (agente): Claude pide simular_baja, el motor la ejecuta y Claude responde; la página enseña la respuesta y cómo ha razonado',
  as.o.final.includes('CMP-03') && as.o.traza.length === 1 && as.o.traza[0].herramienta === 'simular_baja' && /CMP-03 \w+→rojo/.test(as.o.traza[0].resumen)
  && as.html.includes('Cómo lo ha razonado') && as.html.includes('simular_baja') && as.html.includes('https://n8n.test/webhook/acme-panel'));
const { HERRAMIENTAS, ejecutarHerramienta } = require('../../../calculo/asistente');
const motor = require('../../../calculo/cobertura');
const datosAs = motor.cargar();
const salidasAs = HERRAMIENTAS.map(h => JSON.stringify(ejecutarHerramienta(h.name, { texto: 'Elena', empleado_id: 'E007', funcion_id: 'CUS-02' }, datosAs, motor)));
caso('E4 asistente: las 5 herramientas funcionan y ninguna devuelve salarios, bandas, evaluaciones ni señales de rotación',
  HERRAMIENTAS.length === 5 && salidasAs.every(t => !t.includes('"error"')) && !salidasAs.some(t => /"(salario[a-z_]*|banda_id|compa_ratio|ultima_evaluacion|senales[a-z_]*|nivel_senales|probabilidad|meses_desde_ultima_revision)"s*:|compa-ratio/i.test(t)));
const sinApi = asistente('¿Dónde somos frágiles?', [{ error: { message: 'simulado: sin API key' } }]);
caso('E4 asistente sin Claude: lo dice con claridad, sin inventar respuesta',
  !sinApi.o.final && sinApi.html.includes('Claude no ha respondido'));

// Si el manager ya no está (Elena se va y nadie asume el puesto), el agente no le escribe: escala directamente a People
reiniciar();
baja('E007'); aprobar('ALR-003');
const sm = seguimiento(enDias(84));
caso('E3 seguimiento sin manager activo: no avisa a quien se ha ido; escala a People con el motivo',
  sm.o.acciones.length === 1 && sm.o.acciones[0].tipo === 'escalar' && sm.o.acciones[0].sin_manager
  && !sm.emails.some(e => e.asunto.includes('Elena')) && objetos('alertas').find(x => x.grupo.startsWith('SEG-')).por_que.includes('no tiene un manager activo'));

let error = '';
try { validar('E009', 'no-existe', '3', 'E008'); } catch (e) { error = e.message; }
caso('E2 entrada inválida: una skill que no está en la taxonomía da un error claro', error.includes('taxonomía'));
caso('E1 alerta inexistente: lo dice y no escribe nada', aprobar('ALR-999').o.html.includes('No existe'));

console.log(fallos ? `\n${fallos} caso(s) fallan` : '\nLos workflows de n8n hacen la demo completa, dos veces seguidas · muestras de los emails en salidas/n8n/');
process.exit(fallos ? 1 : 0);
