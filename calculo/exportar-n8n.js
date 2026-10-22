// Genera los cuatro workflows de n8n de la demo y las definiciones en JSON que leen en tiempo de ejecución.
// Uso: npm run n8n  → flujos/n8n/E0-panel-y-reinicio.json, flujos/n8n/E1-baja-de-elena.json, flujos/n8n/E2-actualizacion-de-skill.json, flujos/n8n/E3-agentes-autonomos.json
//                    + salidas/n8n/definiciones.json (hay que hacer push: n8n lo lee de GitHub)
//
// Escenario 1 · Baja de Elena: dos entradas (formulario de baja y botón Aprobar del email) que comparten la lectura;
//   un desvío las manda a su rama y las dos acaban en la misma escritura y el mismo email.
// Escenario 2 · Actualización de skill: el manager valida un nivel nuevo → recálculo → email de cierre.
// Escenario 3 · Agentes autónomos (D-21): sin que nadie pulse nada. Cada lunes, el seguimiento de planes avisa, recuerda y escala;
//   el día 1 de cada mes, el centinela recalcula, detecta lo que se degrada y envía el informe para dirección.
//   Un formulario permite lanzarlos a mano con una fecha simulada ("12 semanas después").
// El Sheet se lee y escribe con nodos nativos de Google Sheets (la credencial de Google de n8n cloud no se puede usar
// en nodos HTTP). El reinicio de la demo no está en n8n: lo hace Claude Code (flujos/n8n/LEEME.md).
//
// El código de los nodos sale de los mismos módulos que verifica `npm run verificar` (cobertura.js, propuesta.js, hojas.js)
// más flujos/n8n/src/. Así hay una sola versión del cálculo.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cargar } = require('./cobertura');
const { LECTURAS, ESCRITURAS, HOJAS_INICIALES } = require('../flujos/n8n/src/comun');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'flujos', 'n8n', 'src');
const REPO_RAW = 'https://raw.githubusercontent.com/andfermen/People-OS-ACME/main';
const leer = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const sinModulo = t => t.split('\n').filter(l => !/^module\.exports|require\(/.test(l)).join('\n');

// ---------- Definiciones en JSON (n8n cloud no lee YAML) + bandas y encuesta (no cambian en la demo) + prompt de propuesta ----------
const d = cargar();
fs.mkdirSync(path.join(RAIZ, 'salidas', 'n8n'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'definiciones.json'),
  JSON.stringify({ funciones: d.funciones, taxonomia: d.taxonomia, areas: d.areas, catalogo: d.catalogo, bandas: d.bandas, encuesta: d.encuesta,
    prompt_propuesta: leer(path.join(RAIZ, 'prompts', 'proponer-acciones.md')), prompt_informe: leer(path.join(RAIZ, 'prompts', 'informe-direccion.md')) }, null, 1) + '\n');

// ---------- Biblioteca común de los nodos de código ----------
const cob = leer(path.join(__dirname, 'cobertura.js'));
const motor = cob.slice(cob.indexOf('const UMBRALES'), cob.indexOf('// ---------- Lectura')) + cob.slice(cob.indexOf('// ---------- Cálculo'), cob.indexOf('module.exports'));
const LIB = ['// ===== Generado por calculo/exportar-n8n.js. No editar aquí: editar calculo/ y flujos/n8n/src/ =====',
  motor, sinModulo(leer(path.join(__dirname, 'propuesta.js'))), sinModulo(leer(path.join(__dirname, 'hojas.js'))), sinModulo(leer(path.join(__dirname, 'agentes.js'))),
  sinModulo(leer(path.join(SRC, 'comun.js')))].join('\n');
const codigo = archivo => `${LIB}\n// ===== Nodo =====\n${leer(path.join(SRC, archivo))}`;

// ---------- Nodos ----------
const uid = nombre => crypto.createHash('md5').update(nombre).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*/, '$1-$2-$3-$4-$5');
const nodo = (wf, name, type, typeVersion, parameters, pos, extra = {}) => ({ id: uid(wf + name), name, type, typeVersion, position: pos, parameters, ...extra });
const cfg = "$('Configuración').first().json";
const doc = { __rl: true, mode: 'id', value: `={{ ${cfg}.sheet_id }}` };
const hojaRl = nombre => ({ __rl: true, mode: 'name', value: nombre });

const configuracion = (wf, pos, extra = []) => nodo(wf, 'Configuración', 'n8n-nodes-base.set', 3.4, {
  assignments: { assignments: [
    ['sheet_id', 'PEGAR_ID_DEL_SHEET'], ['email_demo', 'PEGAR_EMAIL_DEMO'], ...extra,
    ['modelo', 'claude-sonnet-5-5'], ['repo', REPO_RAW],
  ].map(([name, value]) => ({ id: uid(wf + name), name, value, type: 'string' })) },
  includeOtherFields: true, options: {},
}, pos);
const leerTexto = (wf, name, ruta, prop, pos) => nodo(wf, name, 'n8n-nodes-base.httpRequest', 4.2, {
  url: `={{ ${cfg}.repo }}/${ruta}`, options: { response: { response: { responseFormat: 'text', outputPropertyName: prop } } },
}, pos);
// Lectura nativa de una hoja: una vez por ejecución y aunque esté vacía (alertas al principio de la demo)
const leerHoja = (wf, name, hoja, pos) => nodo(wf, name, 'n8n-nodes-base.googleSheets', 4.5, {
  operation: 'read', documentId: doc, sheetName: hojaRl(hoja),
  options: { outputFormatting: { values: { general: 'UNFORMATTED_VALUE', date: 'FORMATTED_STRING' } } },
}, pos, { executeOnce: true, alwaysOutputData: true });
// Escritura nativa de una hoja según ESCRITURAS (comun.js). Las columnas se emparejan por nombre; _hoja se ignora.
const opcionesEscritura = { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' };
const escribirHoja = (wf, name, ruta, pos) => {
  const e = ESCRITURAS[ruta];
  const hoja = e.hoja || ruta;
  const columnas = { mappingMode: 'autoMapInputData', value: {}, ...(e.clave ? { matchingColumns: [e.clave] } : {}), schema: [] };
  return nodo(wf, name, 'n8n-nodes-base.googleSheets', 4.5, { operation: e.op === 'reemplazar' ? 'append' : e.op, documentId: doc, sheetName: hojaRl(hoja), columns: columnas, options: opcionesEscritura }, pos);
};
const code = (wf, name, fuente, pos) => nodo(wf, name, 'n8n-nodes-base.code', 2, { jsCode: fuente.endsWith('.js') ? codigo(fuente) : fuente }, pos);
const gmail = (wf, name, pos) => nodo(wf, name, 'n8n-nodes-base.gmail', 2.1, {
  operation: 'send', sendTo: '={{ $json.para }}', subject: '={{ $json.asunto }}', emailType: 'html', message: '={{ $json.html }}', options: { appendAttribution: false },
}, pos, { onError: 'continueRegularOutput' }); // si Gmail falla, el flujo sigue: la copia ya está en la bandeja (D-22)
const ENVIADO = 'Recibido. El sistema está trabajando: vuelve a la pestaña del panel y pulsa Actualizar en unos segundos.';
const formulario = (wf, name, titulo, descripcion, campos, pos) => nodo(wf, name, 'n8n-nodes-base.formTrigger', 2.2, {
  formTitle: titulo, formDescription: descripcion, formFields: { values: campos },
  options: { respondWithOptions: { values: { respondWith: 'text', formSubmittedText: ENVIADO } } },
}, pos, { webhookId: uid(wf + name) });
const nota = (wf, texto, pos, ancho, alto, color = 7) => nodo(wf, `Nota · ${texto.split('\n')[0]}`, 'n8n-nodes-base.stickyNote', 1, { content: texto, width: ancho, height: alto, color }, pos);
const desvio = (wf, name, campo, valores, pos) => nodo(wf, name, 'n8n-nodes-base.switch', 3.2, { rules: { values: valores.map(v => ({
  conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
    conditions: [{ id: uid(wf + name + v), leftValue: campo, rightValue: v, operator: { type: 'string', operation: 'equals' } }] },
  renameOutput: true, outputKey: v,
})) }, options: {} }, pos);

const a = (nodeName, index = 0) => ({ node: nodeName, type: 'main', index });
const cadena = nombres => Object.fromEntries(nombres.slice(0, -1).map((n, i) => [n, { main: [[a(nombres[i + 1])]] }]));
const workflow = (name, nodes, connections) => ({ name, nodes, connections, settings: { executionOrder: 'v1' } });
const guardar = (archivo, wf) => { fs.writeFileSync(path.join(RAIZ, 'flujos', 'n8n', archivo), JSON.stringify(wf, null, 2) + '\n'); console.log(`flujos/n8n/${archivo} (${wf.nodes.filter(n => !n.type.endsWith('stickyNote')).length} nodos)`); };

// Bloque de escritura común: reparte las filas por hoja; key-people se vacía y se reescribe
const REPARTIR = fuentes => `// Filas a escribir, vengan de la rama que vengan, más una copia de cada email en la bandeja (el panel la enseña)
let o = null;
for (const n of ${JSON.stringify(fuentes)}) { try { o = $(n).first().json; break; } catch (e) { /* esa rama no se ha ejecutado */ } }
if (!o) return [];
const correos = o.emails || (o.email ? [o.email] : []);
const ahora = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16);
return [...o.filas, ...correos.map(e => ({ _hoja: 'bandeja', fecha: ahora, asunto: e.asunto, html: e.html }))].map(json => ({ json }));`;
const EMAIL = fuentes => `let o = null;\nfor (const n of ${JSON.stringify(fuentes)}) { try { o = $(n).first().json; break; } catch (e) { /* esa rama no se ha ejecutado */ } }\nreturn o && o.email ? [{ json: o.email }] : [];`;
function bloqueEscritura(wf, rutas, x, y) {
  const nombres = { empleados: 'Actualizar empleados', 'skills-empleados': 'Actualizar skills', 'skills-empleados (nueva)': 'Añadir skill nueva', 'planes-backup': 'Guardar planes', alertas: 'Guardar alertas', cobertura: 'Guardar cobertura', 'historico-semaforo': 'Añadir al histórico', 'key-people': 'Vaciar key-people', bandeja: 'Guardar en la bandeja' };
  const nodes = [desvio(wf, '¿A qué hoja?', '={{ $json._hoja }}', rutas, [x, y])];
  const salidas = [];
  rutas.forEach((r, i) => {
    const pos = [x + 260, y - 260 + i * 110];
    if (r === 'key-people') {
      nodes.push(nodo(wf, 'Vaciar key-people', 'n8n-nodes-base.googleSheets', 4.5, { operation: 'clear', documentId: doc, sheetName: hojaRl('key-people'), clear: 'wholeSheet', keepFirstRow: true }, pos, { executeOnce: true }),
        code(wf, 'Filas key-people', "return $('Repartir').all().filter(i => i.json._hoja === 'key-people');", [pos[0] + 220, pos[1]]),
        escribirHoja(wf, 'Escribir key-people', 'key-people', [pos[0] + 440, pos[1]]));
    } else nodes.push(escribirHoja(wf, nombres[r], r, pos));
    salidas.push([a(nombres[r])]);
  });
  return { nodes, connections: { '¿A qué hoja?': { main: salidas }, ...(rutas.includes('key-people') ? cadena(['Vaciar key-people', 'Filas key-people', 'Escribir key-people']) : {}) } };
}

// ---------- Escenario 1 · Baja de Elena (pasos 1-8) ----------
{
  const wf = 'E1';
  const accion = "={{ $json.query && $json.query.alerta ? 'aprobar' : 'baja' }}";
  const lecturas = ['empleados', 'skills-empleados', 'planes-backup', 'alertas', 'cobertura'];
  const esc = bloqueEscritura(wf, ['empleados', 'alertas', 'planes-backup', 'cobertura', 'historico-semaforo', 'bandeja', 'key-people'], 2700, 400);
  const nodes = [
    nota(wf, '## 1 · Entradas\nFormulario de baja (E007) o botón Aprobar del email de People', [-40, 120], 260, 520, 4),
    nota(wf, '## 2 · Lee el Sheet\nDefiniciones y prompt (repo); plantilla, skills, planes, alertas y mapa actual (Sheet)', [260, 220], 1660, 300, 7),
    nota(wf, '## 3 · Calcula (reglas) y propone (Claude)\nArriba, la baja. Abajo, la decisión aprobada', [1940, 60], 700, 620, 6),
    nota(wf, '## 4 · Escribe en el Sheet y avisa\nCada fila va a su hoja; un email a People', [2660, 60], 1160, 780, 5),
    formulario(wf, 'Formulario baja', 'Acme · Registrar una baja', 'Indica el id de la persona que deja la compañía (por ejemplo, E007). El sistema recalcula el mapa y avisa a People.',
      [{ fieldLabel: 'empleado_id', placeholder: 'E007', requiredField: true }], [0, 260]),
    nodo(wf, 'Botón Aprobar', 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: 'acme-aprobar', responseMode: 'responseNode', options: {} }, [0, 480], { webhookId: uid(wf + 'webhook') }),
    configuracion(wf, [300, 370], [['url_aprobar', 'PEGAR_PRODUCTION_URL_DEL_NODO_BOTON_APROBAR'], ['accion', accion]]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [520, 370]),
    ...lecturas.map((h, i) => leerHoja(wf, LECTURAS[h], h, [760 + i * 190, 370])),
    desvio(wf, '¿Qué se ha pedido?', `={{ ${cfg}.accion }}`, ['baja', 'aprobar'], [1780, 370]),
    code(wf, 'Motor', 'e1-motor.js', [1980, 200]),
    nodo(wf, 'Claude propone', 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 120000 },
    }, [2180, 200], { onError: 'continueRegularOutput' }),
    code(wf, 'Propuesta final', 'e1-propuesta.js', [2360, 200]),
    code(wf, 'Escrituras', 'e1-escrituras.js', [2540, 200]),
    code(wf, 'Aplicar decisión', 'e1-aprobar.js', [1980, 540]),
    nodo(wf, 'Responder', 'n8n-nodes-base.respondToWebhook', 1.1, {
      respondWith: 'text', responseBody: '={{ $json.html }}', options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
    }, [2200, 640]),
    code(wf, 'Repartir', REPARTIR(['Escrituras', 'Aplicar decisión']), [2700, 300]),
    ...esc.nodes.map(n => (n.name === '¿A qué hoja?' ? { ...n, position: [2860, 400] } : { ...n, position: [n.position[0] + 160, n.position[1]] })),
    code(wf, 'Email', EMAIL(['Escrituras', 'Aplicar decisión']), [2700, 760]),
    gmail(wf, 'Enviar email', [2900, 760]),
  ];
  const connections = {
    'Formulario baja': { main: [[a('Configuración')]] }, 'Botón Aprobar': { main: [[a('Configuración')]] },
    ...cadena(['Configuración', 'Leer definiciones', ...lecturas.map(h => LECTURAS[h]), '¿Qué se ha pedido?']),
    '¿Qué se ha pedido?': { main: [[a('Motor')], [a('Aplicar decisión')]] },
    ...cadena(['Motor', 'Claude propone', 'Propuesta final', 'Escrituras']),
    'Escrituras': { main: [[a('Repartir'), a('Email')]] },
    'Aplicar decisión': { main: [[a('Responder'), a('Repartir'), a('Email')]] },
    'Repartir': { main: [[a('¿A qué hoja?')]] },
    ...esc.connections,
    'Email': { main: [[a('Enviar email')]] },
  };
  guardar('E1-baja-de-elena.json', workflow('Acme People OS · Escenario 1 · Baja de Elena', nodes, connections));
}

// ---------- Escenario 2 · Actualización de skill (ámbar → verde) ----------
{
  const wf = 'E2';
  const lecturas = ['empleados', 'skills-empleados', 'planes-backup', 'cobertura'];
  const esc = bloqueEscritura(wf, ['skills-empleados', 'skills-empleados (nueva)', 'planes-backup', 'cobertura', 'historico-semaforo', 'bandeja', 'key-people'], 1740, 400);
  const nodes = [
    nota(wf, '## Escenario 2 · Actualización de skill\n"Tres meses después": el manager valida el nivel que ha alcanzado Javier. Completar un curso no sube el nivel; lo valida una persona.', [-40, 60], 1700, 200, 4),
    formulario(wf, 'Formulario skill', 'Acme · Validar una skill', 'El manager confirma el nivel que ha alcanzado una persona de su equipo (por ejemplo, Javier tras su formación). Completar un curso no sube el nivel: lo valida el manager.', [
      { fieldLabel: 'empleado_id', placeholder: 'E009', requiredField: true },
      { fieldLabel: 'skill_id', placeholder: 'gestion-claves', requiredField: true },
      { fieldLabel: 'nivel', fieldType: 'dropdown', fieldOptions: { values: ['1', '2', '3', '4'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'validado_por', placeholder: 'E008 (su manager)', requiredField: true },
    ], [0, 400]),
    configuracion(wf, [220, 400]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [440, 400]),
    ...lecturas.map((h, i) => leerHoja(wf, LECTURAS[h], h, [660 + i * 180, 400])),
    code(wf, 'Validar skill', 'e2-skill.js', [1400, 400]),
    code(wf, 'Repartir', REPARTIR(['Validar skill']), [1580, 300]),
    ...esc.nodes,
    code(wf, 'Email', EMAIL(['Validar skill']), [1580, 620]),
    gmail(wf, 'Enviar email', [1780, 620]),
  ];
  const connections = {
    ...cadena(['Formulario skill', 'Configuración', 'Leer definiciones', ...lecturas.map(h => LECTURAS[h]), 'Validar skill']),
    'Validar skill': { main: [[a('Repartir'), a('Email')]] },
    'Repartir': { main: [[a('¿A qué hoja?')]] },
    ...esc.connections,
    'Email': { main: [[a('Enviar email')]] },
  };
  guardar('E2-actualizacion-de-skill.json', workflow('Acme People OS · Escenario 2 · Actualización de skill', nodes, connections));
}
// ---------- Escenario 3 · Agentes autónomos (seguimiento de planes y centinela) ----------
{
  const wf = 'E3';
  const lecturas = ['empleados', 'skills-empleados', 'planes-backup', 'alertas', 'cobertura', 'historico-semaforo'];
  const esc = bloqueEscritura(wf, ['planes-backup', 'alertas', 'cobertura', 'historico-semaforo', 'bandeja', 'key-people'], 2560, 420);
  const programado = (name, intervalo, pos) => nodo(wf, name, 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [intervalo] } }, pos);
  const agente = (name, valor, pos) => nodo(wf, name, 'n8n-nodes-base.set', 3.4, {
    assignments: { assignments: [{ id: uid(wf + name), name: 'agente', value: valor, type: 'string' }] }, includeOtherFields: true, options: {},
  }, pos);
  const EMAILS = fuentes => `let o = null;\nfor (const n of ${JSON.stringify(fuentes)}) { try { o = $(n).first().json; break; } catch (e) { /* esa rama no se ha ejecutado */ } }\nreturn (o && o.emails ? o.emails : []).map(json => ({ json }));`;
  const nodes = [
    nota(wf, '## 1 · Disparo: nadie pulsa nada\nCada lunes, el seguimiento de planes. El día 1 de cada mes, el centinela. El formulario es para la demo: lanza uno con una fecha simulada.', [-60, 60], 520, 640, 4),
    nota(wf, '## 2 · Lee el Sheet\nDefiniciones y prompt (repo); plantilla, skills, planes, alertas, mapa e histórico (Sheet)', [480, 220], 1460, 300, 7),
    nota(wf, '## 3 · Los agentes deciden cuándo actuar (reglas)\nArriba, seguimiento: avisa, recuerda, escala. Abajo, centinela: detecta y Claude redacta el informe.', [1960, 40], 540, 760, 6),
    nota(wf, '## 4 · Escribe en el Sheet y avisa\nEstado de los planes, alertas para People, foto del mapa; emails a managers y a People', [2520, 40], 1200, 800, 5),
    programado('Cada lunes 8:00', { field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 8 }, [0, 200]),
    agente('Agente: seguimiento', 'seguimiento', [220, 200]),
    programado('Día 1 de cada mes 8:00', { field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 1, triggerAtHour: 8 }, [0, 380]),
    agente('Agente: centinela', 'centinela', [220, 380]),
    formulario(wf, 'Ejecutar un agente ahora', 'Acme · Ejecutar un agente ahora', 'Para la demo: lanza un agente sin esperar a su día. «Cuándo» simula el paso del tiempo: +12 semanas es cuando el plan de Javier llega a su fecha.', [
      { fieldLabel: 'agente', fieldType: 'dropdown', fieldOptions: { values: ['seguimiento', 'centinela'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'cuando', fieldType: 'dropdown', fieldOptions: { values: ['hoy', '+12 semanas', '+13 semanas', '+14 semanas'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'fecha', placeholder: 'Opcional: una fecha exacta AAAA-MM-DD', requiredField: false },
    ], [0, 560]),
    configuracion(wf, [520, 370], [['url_formulario_skill', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_SKILL_DEL_ESCENARIO_2']]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [700, 370]),
    ...lecturas.map((h, i) => leerHoja(wf, LECTURAS[h], h, [880 + i * 170, 370])),
    desvio(wf, '¿Qué agente?', `={{ ${cfg}.agente }}`, ['seguimiento', 'centinela'], [1800, 370]),
    code(wf, 'Seguimiento', 'e3-seguimiento.js', [2020, 200]),
    code(wf, 'Centinela', 'e3-centinela.js', [2020, 560]),
    nodo(wf, 'Claude redacta el informe', 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 120000 },
    }, [2200, 560], { onError: 'continueRegularOutput' }),
    code(wf, 'Informe final', 'e3-informe.js', [2380, 560]),
    code(wf, 'Repartir', REPARTIR(['Seguimiento', 'Informe final']), [2560, 300]),
    ...esc.nodes.map(n => (n.name === '¿A qué hoja?' ? { ...n, position: [2740, 420] } : { ...n, position: [n.position[0] + 180, n.position[1]] })),
    code(wf, 'Emails', EMAILS(['Seguimiento', 'Informe final']), [2560, 740]),
    gmail(wf, 'Enviar email', [2760, 740]),
  ];
  const connections = {
    'Cada lunes 8:00': { main: [[a('Agente: seguimiento')]] }, 'Día 1 de cada mes 8:00': { main: [[a('Agente: centinela')]] },
    'Agente: seguimiento': { main: [[a('Configuración')]] }, 'Agente: centinela': { main: [[a('Configuración')]] }, 'Ejecutar un agente ahora': { main: [[a('Configuración')]] },
    ...cadena(['Configuración', 'Leer definiciones', ...lecturas.map(h => LECTURAS[h]), '¿Qué agente?']),
    '¿Qué agente?': { main: [[a('Seguimiento')], [a('Centinela')]] },
    ...cadena(['Centinela', 'Claude redacta el informe', 'Informe final']),
    'Seguimiento': { main: [[a('Repartir'), a('Emails')]] },
    'Informe final': { main: [[a('Repartir'), a('Emails')]] },
    'Repartir': { main: [[a('¿A qué hoja?')]] },
    ...esc.connections,
    'Emails': { main: [[a('Enviar email')]] },
  };
  guardar('E3-agentes-autonomos.json', workflow('Acme People OS · Escenario 3 · Agentes autónomos', nodes, connections));
}
// ---------- Escenario 0 · Panel y reinicio: la demo sin depender de nadie (D-22) ----------
// Panel: página de entrada (mapa en vivo, qué hacer ahora, decisiones con su botón Aprobar, bandeja de People).
// Reinicio: baja de GitHub los CSV iniciales, vacía las hojas y las vuelve a escribir, en cadena, y vuelve al panel.
{
  const wf = 'E0';
  const lecturas = ['empleados', 'planes-backup', 'alertas', 'cobertura', 'key-people', 'bandeja'];
  const webhook = (name, ruta, pos) => nodo(wf, name, 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: ruta, responseMode: 'responseNode', options: {} }, pos, { webhookId: uid(wf + ruta) });
  const accion = (name, valor, pos) => nodo(wf, name, 'n8n-nodes-base.set', 3.4, {
    assignments: { assignments: [{ id: uid(wf + name), name: 'accion', value: valor, type: 'string' }] }, includeOtherFields: true, options: {},
  }, pos);
  const responder = (name, pos) => nodo(wf, name, 'n8n-nodes-base.respondToWebhook', 1.1, {
    respondWith: 'text', responseBody: '={{ $json.html }}', options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
  }, pos);
  const vaciar = h => nodo(wf, `Vaciar ${h}`, 'n8n-nodes-base.googleSheets', 4.5, { operation: 'clear', documentId: doc, sheetName: hojaRl(h), clear: 'wholeSheet', keepFirstRow: true }, [0, 0], { executeOnce: true });
  const anadir = h => nodo(wf, `Escribir ${h}`, 'n8n-nodes-base.googleSheets', 4.5, {
    operation: 'append', documentId: doc, sheetName: hojaRl(h), columns: { mappingMode: 'autoMapInputData', value: {}, schema: [] }, options: opcionesEscritura,
  }, [0, 0]);
  const vaciadas = [...HOJAS_INICIALES, 'alertas', 'bandeja'];
  // Cadena del reinicio: CSV de GitHub → filas → vaciar cada hoja → escribir cada hoja → página → responder
  const cadenaReinicio = [
    ...HOJAS_INICIALES.map(h => leerTexto(wf, `CSV ${h}`, `salidas/sheets/${h}.csv`, 'csv', [0, 0])),
    code(wf, 'Filas iniciales', 'e0-reinicio.js', [0, 0]),
    ...vaciadas.map(vaciar),
    ...HOJAS_INICIALES.flatMap(h => [code(wf, `Solo ${h}`, `return $('Filas iniciales').all().filter(i => i.json._hoja === '${h}');`, [0, 0]), anadir(h)]),
    code(wf, 'Página reiniciada', 'e0-reiniciada.js', [0, 0]),
    responder('Responder reinicio', [0, 0]),
  ];
  // Posiciones: la cadena del reinicio en filas de 8 nodos, debajo del panel
  cadenaReinicio.forEach((n, i) => { n.position = [1500 + (i % 8) * 200, 520 + Math.floor(i / 8) * 160]; });
  const nodes = [
    nota(wf, '## Escenario 0 · Panel y reinicio\nLa página de entrada para quien prueba la demo: no instala nada. El panel lee el Sheet en cada visita; Reiniciar lo deja como al principio sin Claude Code.', [-40, 60], 1460, 200, 4),
    nota(wf, '## Reinicio\nCSV iniciales de GitHub → vaciar las hojas → escribirlas de nuevo, una detrás de otra → volver al panel', [1480, 420], 1640, 760, 5),
    webhook('Abrir el panel', 'acme-panel', [0, 300]),
    accion('Acción: panel', 'panel', [220, 300]),
    webhook('Reiniciar la demo', 'acme-reiniciar', [0, 520]),
    accion('Acción: reiniciar', 'reiniciar', [220, 520]),
    configuracion(wf, [440, 400], [['url_form_baja', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_BAJA_E1'], ['url_form_skill', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_SKILL_E2'],
      ['url_form_agentes', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_AGENTES_E3'], ['url_video', 'PEGAR_URL_DEL_VIDEO_OPCIONAL']]),
    desvio(wf, '¿Qué se ha pedido?', `={{ ${cfg}.accion }}`, ['panel', 'reiniciar'], [640, 400]),
    ...lecturas.map((h, i) => leerHoja(wf, LECTURAS[h], h, [860 + i * 170, 260])),
    code(wf, 'Panel', 'e0-panel.js', [1880, 260]),
    responder('Responder panel', [2080, 260]),
    ...cadenaReinicio,
  ];
  const connections = {
    'Abrir el panel': { main: [[a('Acción: panel')]] }, 'Reiniciar la demo': { main: [[a('Acción: reiniciar')]] },
    'Acción: panel': { main: [[a('Configuración')]] }, 'Acción: reiniciar': { main: [[a('Configuración')]] },
    'Configuración': { main: [[a('¿Qué se ha pedido?')]] },
    '¿Qué se ha pedido?': { main: [[a(LECTURAS[lecturas[0]])], [a(cadenaReinicio[0].name)]] },
    ...cadena([...lecturas.map(h => LECTURAS[h]), 'Panel', 'Responder panel']),
    ...cadena(cadenaReinicio.map(n => n.name)),
  };
  guardar('E0-panel-y-reinicio.json', workflow('Acme People OS · Escenario 0 · Panel y reinicio', nodes, connections));
}
console.log('salidas/n8n/definiciones.json');
