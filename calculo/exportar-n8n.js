// Genera los workflows de n8n de la demo y las definiciones en JSON que leen en tiempo de ejecución.
// Uso: npm run n8n  → flujos/n8n/*.json + salidas/n8n/definiciones.json (hay que hacer push: n8n lo lee de GitHub)
//
// HRIS · Google Sheets (D-24): el adaptador. Es el único workflow que habla con el sistema de registro; los demás le piden
//   leer (todas las hojas), escribir (cada fila a su hoja) o cargar (vaciar y volver a escribir, para el reinicio).
//   Pasar de Sheets a Factorial o Bizneo es cambiar este workflow.
// Escenario 0 · Panel y reinicio (D-22): la página de entrada para quien prueba la demo, sin instalar nada.
// Escenario 1 · Baja de Elena: formulario de baja y botón Aprobar del email, con la misma lectura y la misma escritura.
// Escenario 2 · Actualización de skill: el manager valida un nivel nuevo → recálculo → email de cierre.
// Escenario 3 · Automatizaciones con calendario (D-21): seguimiento de planes (cada lunes) y centinela (día 1 de cada mes).
// Escenario 4 · Asistente de People (D-25): un agente que razona con herramientas del motor, en solo lectura.
//
// El código de los nodos sale de los mismos módulos que verifica `npm run verificar` (cobertura.js, propuesta.js, hojas.js,
// agentes.js, asistente.js) más flujos/n8n/src/. Así hay una sola versión del cálculo, y las reglas salen de definiciones/reglas.yaml.

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

// ---------- Definiciones en JSON (n8n cloud no lee YAML): funciones, reglas, catálogos, bandas, encuesta y prompts ----------
const d = cargar();
fs.mkdirSync(path.join(RAIZ, 'salidas', 'n8n'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'definiciones.json'),
  JSON.stringify({ funciones: d.funciones, taxonomia: d.taxonomia, areas: d.areas, catalogo: d.catalogo, bandas: d.bandas, encuesta: d.encuesta, reglas: d.reglas,
    prompt_propuesta: leer(path.join(RAIZ, 'prompts', 'proponer-acciones.md')), prompt_informe: leer(path.join(RAIZ, 'prompts', 'informe-direccion.md')),
    prompt_asistente: leer(path.join(RAIZ, 'prompts', 'asistente-people.md')) }, null, 1) + '\n');

// ---------- Biblioteca común de los nodos de código ----------
const cob = leer(path.join(__dirname, 'cobertura.js'));
const motor = cob.slice(cob.indexOf('// Las reglas (semáforo'), cob.indexOf('// ---------- Lectura')) + cob.slice(cob.indexOf('// ---------- Cálculo'), cob.indexOf('module.exports'));
const LIB = ['// ===== Generado por calculo/exportar-n8n.js. No editar aquí: editar calculo/ y flujos/n8n/src/ =====',
  motor, ...['propuesta.js', 'hojas.js', 'agentes.js', 'asistente.js'].map(f => sinModulo(leer(path.join(__dirname, f)))),
  sinModulo(leer(path.join(SRC, 'comun.js')))].join('\n');
const codigo = archivo => `${LIB}\n// ===== Nodo =====\n${leer(path.join(SRC, archivo))}`;

// ---------- Nodos ----------
const uid = nombre => crypto.createHash('md5').update(nombre).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*/, '$1-$2-$3-$4-$5');
const nodo = (wf, name, type, typeVersion, parameters, pos, extra = {}) => ({ id: uid(wf + name), name, type, typeVersion, position: pos, parameters, ...extra });
const cfg = "$('Configuración').first().json";
const hojaRl = nombre => ({ __rl: true, mode: 'name', value: nombre });

// Configuración de cada escenario: a qué HRIS llama, a quién avisa, qué modelo usa y de dónde lee las definiciones
const configuracion = (wf, pos, extra = []) => nodo(wf, 'Configuración', 'n8n-nodes-base.set', 3.4, {
  assignments: { assignments: [
    ['hris_workflow_id', 'PEGAR_ID_DEL_WORKFLOW_HRIS'], ['email_demo', 'PEGAR_EMAIL_DEMO'], ...extra,
    ['modelo', 'claude-sonnet-5-5'], ['repo', REPO_RAW],
  ].map(([name, value]) => ({ id: uid(wf + name), name, value, type: 'string' })) },
  includeOtherFields: true, options: {},
}, pos);
const leerTexto = (wf, name, ruta, prop, pos) => nodo(wf, name, 'n8n-nodes-base.httpRequest', 4.2, {
  url: `={{ ${cfg}.repo }}/${ruta}`, options: { response: { response: { responseFormat: 'text', outputPropertyName: prop } } },
}, pos);
const code = (wf, name, fuente, pos, extra = {}) => nodo(wf, name, 'n8n-nodes-base.code', 2, { jsCode: fuente.endsWith('.js') ? codigo(fuente) : fuente }, pos, extra);
const gmail = (wf, name, pos) => nodo(wf, name, 'n8n-nodes-base.gmail', 2.1, {
  operation: 'send', sendTo: '={{ $json.para }}', subject: '={{ $json.asunto }}', emailType: 'html', message: '={{ $json.html }}', options: { appendAttribution: false },
}, pos, { onError: 'continueRegularOutput' }); // si Gmail falla, el flujo sigue: la copia ya está en la bandeja (D-22)
const ENVIADO = 'Recibido. El sistema está trabajando: vuelve a la pestaña del panel y pulsa Actualizar en unos segundos.';
const formulario = (wf, name, titulo, descripcion, campos, pos) => nodo(wf, name, 'n8n-nodes-base.formTrigger', 2.2, {
  formTitle: titulo, formDescription: descripcion, formFields: { values: campos },
  options: { respondWithOptions: { values: { respondWith: 'text', formSubmittedText: ENVIADO } } },
}, pos, { webhookId: uid(wf + name) });
const webhook = (wf, name, ruta, pos) => nodo(wf, name, 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: ruta, responseMode: 'responseNode', options: {} }, pos, { webhookId: uid(wf + ruta) });
const responder = (wf, name, pos) => nodo(wf, name, 'n8n-nodes-base.respondToWebhook', 1.1, {
  respondWith: 'text', responseBody: '={{ $json.html }}', options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
}, pos);
const fijar = (wf, name, campo, valor, pos) => nodo(wf, name, 'n8n-nodes-base.set', 3.4, {
  assignments: { assignments: [{ id: uid(wf + name), name: campo, value: valor, type: 'string' }] }, includeOtherFields: true, options: {},
}, pos);
const claude = (wf, name, pos) => nodo(wf, name, 'n8n-nodes-base.httpRequest', 4.2, {
  method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
  sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] },
  sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 120000 },
}, pos, { onError: 'continueRegularOutput' });
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

// ---------- Llamadas al HRIS desde los escenarios ----------
// "Leer HRIS" devuelve un item { tablas, enlace }; "Escribir en el HRIS" recibe las filas con _hoja y operacion
const llamarHris = (wf, name, pos) => nodo(wf, name, 'n8n-nodes-base.executeWorkflow', 1.2, {
  source: 'database', workflowId: { __rl: true, mode: 'id', value: `={{ ${cfg}.hris_workflow_id }}` }, mode: 'once', options: { waitForSubWorkflow: true },
}, pos);
const pedirLectura = (wf, pos) => code(wf, 'Pedir lectura', "return [{ json: { operacion: 'leer' } }];", pos);
const REPARTIR = fuentes => `// Filas a escribir, vengan de la rama que vengan, más una copia de cada email en la bandeja (el panel la enseña)
let o = null;
for (const n of ${JSON.stringify(fuentes)}) { try { o = $(n).first().json; break; } catch (e) { /* esa rama no se ha ejecutado */ } }
if (!o) return [];
const correos = o.emails || (o.email ? [o.email] : []);
const ahora = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Madrid' }).slice(0, 16);
return [...o.filas, ...correos.map(e => ({ _hoja: 'bandeja', fecha: ahora, asunto: e.asunto, html: e.html }))].map(json => ({ json: { operacion: 'escribir', ...json } }));`;
const EMAILS = fuentes => `let o = null;\nfor (const n of ${JSON.stringify(fuentes)}) { try { o = $(n).first().json; break; } catch (e) { /* esa rama no se ha ejecutado */ } }\nreturn (o ? o.emails || (o.email ? [o.email] : []) : []).map(json => ({ json }));`;

// ---------- HRIS · Google Sheets: el adaptador (D-24) ----------
{
  const wf = 'HRIS';
  const doc = { __rl: true, mode: 'id', value: "={{ $('Configuración HRIS').first().json.sheet_id }}" };
  const leerHoja = (name, hoja, pos) => nodo(wf, name, 'n8n-nodes-base.googleSheets', 4.5, {
    operation: 'read', documentId: doc, sheetName: hojaRl(hoja), options: { outputFormatting: { values: { general: 'UNFORMATTED_VALUE', date: 'FORMATTED_STRING' } } },
  }, pos, { executeOnce: true, alwaysOutputData: true });
  const opcionesEscritura = { cellFormat: 'RAW', handlingExtraData: 'ignoreIt' };
  const escribirHoja = (name, ruta, pos) => {
    const e = ESCRITURAS[ruta];
    const columnas = { mappingMode: 'autoMapInputData', value: {}, ...(e.clave ? { matchingColumns: [e.clave] } : {}), schema: [] };
    return nodo(wf, name, 'n8n-nodes-base.googleSheets', 4.5, { operation: e.op === 'reemplazar' ? 'append' : e.op, documentId: doc, sheetName: hojaRl(e.hoja || ruta), columns: columnas, options: opcionesEscritura }, pos);
  };
  const vaciar = (h, pos) => nodo(wf, `Vaciar ${h}`, 'n8n-nodes-base.googleSheets', 4.5, { operation: 'clear', documentId: doc, sheetName: hojaRl(h), clear: 'wholeSheet', keepFirstRow: true }, pos, { executeOnce: true });
  const anadir = (h, pos) => nodo(wf, `Cargar ${h}`, 'n8n-nodes-base.googleSheets', 4.5, {
    operation: 'append', documentId: doc, sheetName: hojaRl(h), columns: { mappingMode: 'autoMapInputData', value: {}, schema: [] }, options: opcionesEscritura,
  }, pos);

  const hojas = Object.keys(LECTURAS);
  const rutas = ['empleados', 'skills-empleados', 'skills-empleados (nueva)', 'planes-backup', 'alertas', 'cobertura', 'historico-semaforo', 'bandeja', 'key-people'];
  const nombres = { empleados: 'Actualizar empleados', 'skills-empleados': 'Actualizar skills', 'skills-empleados (nueva)': 'Añadir skill nueva', 'planes-backup': 'Guardar planes', alertas: 'Guardar alertas', cobertura: 'Guardar cobertura', 'historico-semaforo': 'Añadir al histórico', 'key-people': 'Vaciar key-people', bandeja: 'Guardar en la bandeja' };
  const escritura = rutas.flatMap((r, i) => {
    const pos = [1000, 520 + i * 110];
    return r === 'key-people'
      ? [vaciar('key-people', pos), code(wf, 'Filas key-people', "return $('Llamada al HRIS').all().filter(i => i.json._hoja === 'key-people');", [pos[0] + 220, pos[1]]), escribirHoja('Escribir key-people', 'key-people', [pos[0] + 440, pos[1]])]
      : [escribirHoja(nombres[r], r, pos)];
  });
  const vaciadas = [...HOJAS_INICIALES, 'alertas', 'bandeja'];
  const carga = [...vaciadas.map(h => vaciar(h, [0, 0])),
    ...HOJAS_INICIALES.flatMap(h => [code(wf, `Solo ${h}`, `return $('Llamada al HRIS').all().filter(i => i.json._hoja === '${h}');`, [0, 0]), anadir(h, [0, 0])])];
  carga.forEach((n, i) => { n.position = [760 + (i % 7) * 200, 1580 + Math.floor(i / 7) * 150]; });
  // "Vaciar key-people" está en la escritura; en la carga se usa una copia con otro nombre
  const cargaRenombrada = carga.map(n => (n.name === 'Vaciar key-people' ? { ...n, name: 'Vaciar key-people (carga)', id: uid(wf + 'Vaciar key-people (carga)') } : n));
  const nodes = [
    nota(wf, '## HRIS · Google Sheets (adaptador)\nEl único workflow que habla con el sistema de registro. Los escenarios le piden **leer**, **escribir** o **cargar**. Para usar Factorial o Bizneo se cambia este workflow; los demás no se tocan.', [-40, 60], 1700, 200, 4),
    nodo(wf, 'Llamada al HRIS', 'n8n-nodes-base.executeWorkflowTrigger', 1.1, { inputSource: 'passthrough' }, [0, 400]),
    nodo(wf, 'Configuración HRIS', 'n8n-nodes-base.set', 3.4, {
      assignments: { assignments: [{ id: uid(wf + 'sheet_id'), name: 'sheet_id', value: 'PEGAR_ID_DEL_SHEET', type: 'string' }] }, includeOtherFields: true, options: {},
    }, [220, 400]),
    desvio(wf, '¿Qué operación?', '={{ $json.operacion }}', ['leer', 'escribir', 'cargar'], [440, 400]),
    ...hojas.map((h, i) => leerHoja(LECTURAS[h], h, [700 + i * 180, 260])),
    code(wf, 'Tablas', 'hris-tablas.js', [700 + hojas.length * 180, 260]),
    desvio(wf, '¿A qué hoja?', '={{ $json._hoja }}', rutas, [760, 900]),
    ...escritura,
    ...cargaRenombrada,
  ];
  const nombreCarga = n => (n === 'Vaciar key-people' ? 'Vaciar key-people (carga)' : n);
  const connections = {
    ...cadena(['Llamada al HRIS', 'Configuración HRIS', '¿Qué operación?']),
    '¿Qué operación?': { main: [[a(LECTURAS[hojas[0]])], [a('¿A qué hoja?')], [a(nombreCarga(carga[0].name))]] },
    ...cadena([...hojas.map(h => LECTURAS[h]), 'Tablas']),
    '¿A qué hoja?': { main: rutas.map(r => [a(nombres[r])]) },
    ...cadena(['Vaciar key-people', 'Filas key-people', 'Escribir key-people']),
    ...cadena(carga.map(n => nombreCarga(n.name))),
  };
  // Las posiciones de la escritura van debajo de la lectura
  nodes.find(n => n.name === '¿A qué hoja?').position = [760, 900];
  guardar('HRIS-google-sheets.json', workflow('Acme People OS · HRIS · Google Sheets (adaptador)', nodes, connections));
}

// ---------- Escenario 1 · Baja de Elena (pasos 1-8) ----------
{
  const wf = 'E1';
  const accion = "={{ $json.query && $json.query.alerta ? 'aprobar' : 'baja' }}";
  const nodes = [
    nota(wf, '## 1 · Entradas\nFormulario de baja (E007) o botón Aprobar del email de People', [-40, 120], 260, 520, 4),
    nota(wf, '## 2 · Lee\nDefiniciones y reglas (repo) y todo el HRIS (subworkflow HRIS)', [260, 220], 900, 300, 7),
    nota(wf, '## 3 · Calcula (reglas) y propone (Claude)\nArriba, la baja. Abajo, la decisión aprobada', [1180, 60], 760, 620, 6),
    nota(wf, '## 4 · Escribe en el HRIS y avisa\nLas filas van al subworkflow HRIS; un email a People', [1960, 60], 560, 780, 5),
    formulario(wf, 'Formulario baja', 'Acme · Registrar una baja', 'Indica el id de la persona que deja la compañía (por ejemplo, E007). El sistema recalcula el mapa y avisa a People.',
      [{ fieldLabel: 'empleado_id', placeholder: 'E007', requiredField: true }], [0, 260]),
    nodo(wf, 'Botón Aprobar', 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: 'acme-aprobar', responseMode: 'responseNode', options: {} }, [0, 480], { webhookId: uid(wf + 'webhook') }),
    configuracion(wf, [300, 370], [['url_aprobar', 'PEGAR_PRODUCTION_URL_DEL_NODO_BOTON_APROBAR'], ['accion', accion]]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [520, 370]),
    pedirLectura(wf, [740, 370]),
    llamarHris(wf, 'Leer HRIS', [940, 370]),
    desvio(wf, '¿Qué se ha pedido?', `={{ ${cfg}.accion }}`, ['baja', 'aprobar'], [1140, 370]),
    code(wf, 'Motor', 'e1-motor.js', [1240, 200]),
    claude(wf, 'Claude propone', [1440, 200]),
    code(wf, 'Propuesta final', 'e1-propuesta.js', [1620, 200]),
    code(wf, 'Escrituras', 'e1-escrituras.js', [1800, 200]),
    code(wf, 'Aplicar decisión', 'e1-aprobar.js', [1240, 540]),
    responder(wf, 'Responder', [1460, 640]),
    code(wf, 'Repartir', REPARTIR(['Escrituras', 'Aplicar decisión']), [2000, 300]),
    llamarHris(wf, 'Escribir en el HRIS', [2220, 300]),
    code(wf, 'Email', EMAILS(['Escrituras', 'Aplicar decisión']), [2000, 560]),
    gmail(wf, 'Enviar email', [2220, 560]),
  ];
  const connections = {
    'Formulario baja': { main: [[a('Configuración')]] }, 'Botón Aprobar': { main: [[a('Configuración')]] },
    ...cadena(['Configuración', 'Leer definiciones', 'Pedir lectura', 'Leer HRIS', '¿Qué se ha pedido?']),
    '¿Qué se ha pedido?': { main: [[a('Motor')], [a('Aplicar decisión')]] },
    ...cadena(['Motor', 'Claude propone', 'Propuesta final', 'Escrituras']),
    'Escrituras': { main: [[a('Repartir'), a('Email')]] },
    'Aplicar decisión': { main: [[a('Responder'), a('Repartir'), a('Email')]] },
    'Repartir': { main: [[a('Escribir en el HRIS')]] },
    'Email': { main: [[a('Enviar email')]] },
  };
  guardar('E1-baja-de-elena.json', workflow('Acme People OS · Escenario 1 · Baja de Elena', nodes, connections));
}

// ---------- Escenario 2 · Actualización de skill (ámbar → verde) ----------
{
  const wf = 'E2';
  const nodes = [
    nota(wf, '## Escenario 2 · Actualización de skill\n"Tres meses después": el manager valida el nivel que ha alcanzado Javier. Completar un curso no sube el nivel; lo valida una persona.', [-40, 60], 1500, 200, 4),
    formulario(wf, 'Formulario skill', 'Acme · Validar una skill', 'El manager confirma el nivel que ha alcanzado una persona de su equipo (por ejemplo, Javier tras su formación). Completar un curso no sube el nivel: lo valida el manager.', [
      { fieldLabel: 'empleado_id', placeholder: 'E009', requiredField: true },
      { fieldLabel: 'skill_id', placeholder: 'gestion-claves', requiredField: true },
      { fieldLabel: 'nivel', fieldType: 'dropdown', fieldOptions: { values: ['1', '2', '3', '4'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'validado_por', placeholder: 'E008 (su manager)', requiredField: true },
    ], [0, 400]),
    configuracion(wf, [220, 400]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [440, 400]),
    pedirLectura(wf, [660, 400]),
    llamarHris(wf, 'Leer HRIS', [860, 400]),
    code(wf, 'Validar skill', 'e2-skill.js', [1060, 400]),
    code(wf, 'Repartir', REPARTIR(['Validar skill']), [1260, 300]),
    llamarHris(wf, 'Escribir en el HRIS', [1460, 300]),
    code(wf, 'Email', EMAILS(['Validar skill']), [1260, 520]),
    gmail(wf, 'Enviar email', [1460, 520]),
  ];
  const connections = {
    ...cadena(['Formulario skill', 'Configuración', 'Leer definiciones', 'Pedir lectura', 'Leer HRIS', 'Validar skill']),
    'Validar skill': { main: [[a('Repartir'), a('Email')]] },
    'Repartir': { main: [[a('Escribir en el HRIS')]] },
    'Email': { main: [[a('Enviar email')]] },
  };
  guardar('E2-actualizacion-de-skill.json', workflow('Acme People OS · Escenario 2 · Actualización de skill', nodes, connections));
}

// ---------- Escenario 3 · Automatizaciones con calendario: seguimiento de planes y centinela (D-21) ----------
{
  const wf = 'E3';
  const programado = (name, intervalo, pos) => nodo(wf, name, 'n8n-nodes-base.scheduleTrigger', 1.2, { rule: { interval: [intervalo] } }, pos);
  const nodes = [
    nota(wf, '## 1 · Disparo: nadie pulsa nada\nCada lunes, el seguimiento de planes. El día 1 de cada mes, el centinela. El formulario es para la demo: lanza uno con el tiempo simulado.', [-60, 60], 520, 640, 4),
    nota(wf, '## 2 · Lee\nDefiniciones y reglas (repo) y todo el HRIS (subworkflow HRIS)', [480, 220], 820, 300, 7),
    nota(wf, '## 3 · Deciden cuándo actuar (reglas)\nArriba, seguimiento: avisa, recuerda, escala. Abajo, centinela: detecta y Claude redacta el informe.', [1320, 40], 760, 760, 6),
    nota(wf, '## 4 · Escribe en el HRIS y avisa\nEstado de los planes, alertas para People, foto del mapa; emails a managers y a People', [2100, 40], 520, 800, 5),
    programado('Cada lunes 8:00', { field: 'weeks', weeksInterval: 1, triggerAtDay: [1], triggerAtHour: 8 }, [0, 200]),
    fijar(wf, 'Automatización: seguimiento', 'automatizacion', 'seguimiento', [220, 200]),
    programado('Día 1 de cada mes 8:00', { field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 1, triggerAtHour: 8 }, [0, 380]),
    fijar(wf, 'Automatización: centinela', 'automatizacion', 'centinela', [220, 380]),
    formulario(wf, 'Ejecutar ahora', 'Acme · Ejecutar una automatización ahora', 'Para la demo: lanza el seguimiento de planes o el centinela sin esperar a su día. «Cuándo» simula el paso del tiempo: +12 semanas es cuando el plan de Javier llega a su fecha.', [
      { fieldLabel: 'automatizacion', fieldType: 'dropdown', fieldOptions: { values: ['seguimiento', 'centinela'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'cuando', fieldType: 'dropdown', fieldOptions: { values: ['hoy', '+12 semanas', '+13 semanas', '+14 semanas'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'fecha', placeholder: 'Opcional: una fecha exacta AAAA-MM-DD', requiredField: false },
    ], [0, 560]),
    configuracion(wf, [520, 370], [['url_formulario_skill', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_SKILL_DEL_ESCENARIO_2']]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [720, 370]),
    pedirLectura(wf, [920, 370]),
    llamarHris(wf, 'Leer HRIS', [1110, 370]),
    desvio(wf, '¿Qué automatización?', `={{ ${cfg}.automatizacion }}`, ['seguimiento', 'centinela'], [1340, 370]),
    code(wf, 'Seguimiento', 'e3-seguimiento.js', [1560, 200]),
    code(wf, 'Centinela', 'e3-centinela.js', [1560, 560]),
    claude(wf, 'Claude redacta el informe', [1740, 560]),
    code(wf, 'Informe final', 'e3-informe.js', [1920, 560]),
    code(wf, 'Repartir', REPARTIR(['Seguimiento', 'Informe final']), [2140, 300]),
    llamarHris(wf, 'Escribir en el HRIS', [2360, 300]),
    code(wf, 'Emails', EMAILS(['Seguimiento', 'Informe final']), [2140, 620]),
    gmail(wf, 'Enviar email', [2360, 620]),
  ];
  const connections = {
    'Cada lunes 8:00': { main: [[a('Automatización: seguimiento')]] }, 'Día 1 de cada mes 8:00': { main: [[a('Automatización: centinela')]] },
    'Automatización: seguimiento': { main: [[a('Configuración')]] }, 'Automatización: centinela': { main: [[a('Configuración')]] }, 'Ejecutar ahora': { main: [[a('Configuración')]] },
    ...cadena(['Configuración', 'Leer definiciones', 'Pedir lectura', 'Leer HRIS', '¿Qué automatización?']),
    '¿Qué automatización?': { main: [[a('Seguimiento')], [a('Centinela')]] },
    ...cadena(['Centinela', 'Claude redacta el informe', 'Informe final']),
    'Seguimiento': { main: [[a('Repartir'), a('Emails')]] },
    'Informe final': { main: [[a('Repartir'), a('Emails')]] },
    'Repartir': { main: [[a('Escribir en el HRIS')]] },
    'Emails': { main: [[a('Enviar email')]] },
  };
  guardar('E3-automatizaciones-calendario.json', workflow('Acme People OS · Escenario 3 · Automatizaciones con calendario', nodes, connections));
}

// ---------- Escenario 0 · Panel y reinicio: la demo sin depender de nadie (D-22) ----------
{
  const wf = 'E0';
  const reinicio = [
    ...HOJAS_INICIALES.map(h => leerTexto(wf, `CSV ${h}`, `salidas/sheets/${h}.csv`, 'csv', [0, 0])),
    code(wf, 'Filas iniciales', 'e0-reinicio.js', [0, 0]),
    llamarHris(wf, 'Cargar en el HRIS', [0, 0]),
    code(wf, 'Página reiniciada', 'e0-reiniciada.js', [0, 0], { executeOnce: true }),
    responder(wf, 'Responder reinicio', [0, 0]),
  ];
  reinicio.forEach((n, i) => { n.position = [900 + (i % 6) * 200, 560 + Math.floor(i / 6) * 160]; });
  const nodes = [
    nota(wf, '## Escenario 0 · Panel y reinicio\nLa página de entrada para quien prueba la demo: no instala nada. El panel lee el HRIS en cada visita; Reiniciar lo deja como al principio.', [-40, 60], 1700, 200, 4),
    nota(wf, '## Reinicio\nCSV iniciales de GitHub → el HRIS vacía las hojas y las vuelve a cargar → volver al panel', [880, 480], 1240, 380, 5),
    webhook(wf, 'Abrir el panel', 'acme-panel', [0, 300]),
    fijar(wf, 'Acción: panel', 'accion', 'panel', [220, 300]),
    webhook(wf, 'Reiniciar la demo', 'acme-reiniciar', [0, 520]),
    fijar(wf, 'Acción: reiniciar', 'accion', 'reiniciar', [220, 520]),
    configuracion(wf, [440, 400], [['url_form_baja', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_BAJA_E1'], ['url_form_skill', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_SKILL_E2'],
      ['url_form_automatizaciones', 'PEGAR_PRODUCTION_URL_DEL_FORMULARIO_EJECUTAR_AHORA_E3'], ['url_video', 'PEGAR_URL_DEL_VIDEO_OPCIONAL']]),
    desvio(wf, '¿Qué se ha pedido?', `={{ ${cfg}.accion }}`, ['panel', 'reiniciar'], [660, 400]),
    pedirLectura(wf, [900, 260]),
    llamarHris(wf, 'Leer HRIS', [1100, 260]),
    code(wf, 'Panel', 'e0-panel.js', [1300, 260]),
    responder(wf, 'Responder panel', [1500, 260]),
    ...reinicio,
  ];
  const connections = {
    'Abrir el panel': { main: [[a('Acción: panel')]] }, 'Reiniciar la demo': { main: [[a('Acción: reiniciar')]] },
    'Acción: panel': { main: [[a('Configuración')]] }, 'Acción: reiniciar': { main: [[a('Configuración')]] },
    'Configuración': { main: [[a('¿Qué se ha pedido?')]] },
    '¿Qué se ha pedido?': { main: [[a('Pedir lectura')], [a(reinicio[0].name)]] },
    ...cadena(['Pedir lectura', 'Leer HRIS', 'Panel', 'Responder panel']),
    ...cadena(reinicio.map(n => n.name)),
  };
  guardar('E0-panel-y-reinicio.json', workflow('Acme People OS · Escenario 0 · Panel y reinicio', nodes, connections));
}

// ---------- Escenario 4 · Asistente de People: un agente que razona con herramientas (D-25) ----------
// Bucle de agente desplegado en n8n: Claude decide qué herramienta usar → el motor la ejecuta → vuelta a Claude, hasta 4 vueltas.
// Las herramientas son de solo lectura y no devuelven salarios ni señales individuales (calculo/asistente.js).
{
  const wf = 'E4';
  const VUELTAS = 4;
  const vuelta = k => [
    fijar(wf, `¿Sigue? ${k}`, '_vuelta', String(k), [0, 0]),
    claude(wf, `Claude razona ${k}`, [0, 0]),
    code(wf, `Herramientas ${k}`, `const VUELTA = ${k};\nconst ANTERIOR = ${JSON.stringify(k === 1 ? 'Preparar' : `Herramientas ${k - 1}`)};\n` + leer(path.join(SRC, 'e4-herramientas.js')).replace(/^/, `${LIB}\n// ===== Nodo =====\n`), [0, 0]),
  ];
  const vueltas = Array.from({ length: VUELTAS }, (_, i) => vuelta(i + 1));
  vueltas.forEach((v, i) => v.forEach((n, j) => { n.position = [1300 + j * 200, 120 + i * 180]; }));
  // "¿Sigue? k" es un desvío: si la vuelta anterior pidió herramientas, sigue; si no, va a la respuesta
  vueltas.forEach((v, i) => { v[0] = nodo(wf, `¿Sigue? ${i + 1}`, 'n8n-nodes-base.if', 2, {
    conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, combinator: 'and',
      conditions: [{ id: uid(wf + 'sigue' + i), leftValue: '={{ $json.sigue }}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }] },
    options: {},
  }, [1300, 120 + i * 180]); });
  const nodes = [
    nota(wf, '## Escenario 4 · Asistente de People (agente)\nClaude **razona** y elige qué herramienta usar; las cifras las pone el motor. Solo lectura: no cambia nada y no ve salarios ni señales individuales.', [-40, -100], 2200, 180, 4),
    webhook(wf, 'Pregunta', 'acme-asistente', [0, 300]),
    configuracion(wf, [200, 300]),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', [400, 300]),
    pedirLectura(wf, [600, 300]),
    llamarHris(wf, 'Leer HRIS', [800, 300]),
    code(wf, 'Preparar', 'e4-preparar.js', [1000, 300]),
    ...vueltas.flat(),
    code(wf, 'Respuesta', 'e4-respuesta.js', [2300, 400]),
    responder(wf, 'Responder', [2500, 400]),
  ];
  const connections = {
    ...cadena(['Pregunta', 'Configuración', 'Leer definiciones', 'Pedir lectura', 'Leer HRIS', 'Preparar', '¿Sigue? 1']),
    ...Object.assign({}, ...vueltas.map((v, i) => ({
      [`¿Sigue? ${i + 1}`]: { main: [[a(`Claude razona ${i + 1}`)], [a('Respuesta')]] },
      [`Claude razona ${i + 1}`]: { main: [[a(`Herramientas ${i + 1}`)]] },
      [`Herramientas ${i + 1}`]: { main: [[a(i + 1 < VUELTAS ? `¿Sigue? ${i + 2}` : 'Respuesta')]] },
    }))),
    'Respuesta': { main: [[a('Responder')]] },
  };
  guardar('E4-asistente-people.json', workflow('Acme People OS · Escenario 4 · Asistente de People', nodes, connections));
}
console.log('salidas/n8n/definiciones.json');
