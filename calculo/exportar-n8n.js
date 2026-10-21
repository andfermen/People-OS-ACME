// Genera los dos workflows de n8n de la demo y las definiciones en JSON que leen en tiempo de ejecución.
// Uso: npm run n8n  → flujos/n8n/E1-baja-de-elena.json, flujos/n8n/E2-actualizacion-de-skill.json
//                    + salidas/n8n/definiciones.json (hay que hacer push: n8n lo lee de GitHub)
//
// Escenario 1 · Baja de Elena: tres entradas en un mismo workflow (formulario de baja, botón Aprobar del email,
//   formulario de reinicio) que comparten configuración y lectura, y un desvío las manda a su rama.
// Escenario 2 · Actualización de skill: el manager valida un nivel nuevo → recálculo → email de cierre.
//
// El código de los nodos sale de los mismos módulos que verifica `npm run verificar` (cobertura.js, propuesta.js, hojas.js)
// más flujos/n8n/src/. Así hay una sola versión del cálculo. Cambiar una regla de definiciones/ no exige reimportar
// los workflows: basta con `npm run n8n` (que reescribe definiciones.json) y push.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { cargar } = require('./cobertura');

const RAIZ = path.join(__dirname, '..');
const SRC = path.join(RAIZ, 'flujos', 'n8n', 'src');
const REPO_RAW = 'https://raw.githubusercontent.com/andfermen/People-OS-ACME/main';
const leer = p => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const sinModulo = t => t.split('\n').filter(l => !/^module\.exports|require\(/.test(l)).join('\n');

// ---------- Definiciones en JSON (n8n cloud no lee YAML) ----------
const d = cargar();
fs.mkdirSync(path.join(RAIZ, 'salidas', 'n8n'), { recursive: true });
fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'definiciones.json'),
  JSON.stringify({ funciones: d.funciones, taxonomia: d.taxonomia, areas: d.areas, catalogo: d.catalogo }, null, 1) + '\n');

// ---------- Biblioteca común de los nodos de código ----------
const cob = leer(path.join(__dirname, 'cobertura.js'));
const motor = cob.slice(cob.indexOf('const UMBRALES'), cob.indexOf('// ---------- Lectura')) + cob.slice(cob.indexOf('// ---------- Cálculo'), cob.indexOf('module.exports'));
const LIB = ['// ===== Generado por calculo/exportar-n8n.js. No editar aquí: editar calculo/ y flujos/n8n/src/ =====',
  motor, sinModulo(leer(path.join(__dirname, 'propuesta.js'))), sinModulo(leer(path.join(__dirname, 'hojas.js'))), leer(path.join(SRC, 'comun.js'))].join('\n');
const codigo = archivo => `${LIB}\n// ===== Nodo =====\n${leer(path.join(SRC, archivo))}`;

// ---------- Nodos ----------
const uid = nombre => crypto.createHash('md5').update(nombre).digest('hex').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*/, '$1-$2-$3-$4-$5');
const nodo = (wf, name, type, typeVersion, parameters, pos, extra = {}) => ({ id: uid(wf + name), name, type, typeVersion, position: pos, parameters, ...extra });
const cfg = "$('Configuración').first().json";

const configuracion = (wf, pos, extra = []) => nodo(wf, 'Configuración', 'n8n-nodes-base.set', 3.4, {
  assignments: { assignments: [
    ['sheet_id', 'PEGAR_ID_DEL_SHEET'], ['email_demo', 'PEGAR_EMAIL_DEMO'], ...extra,
    ['modelo', 'claude-sonnet-5-5'], ['repo', REPO_RAW],
  ].map(([name, value]) => ({ id: uid(wf + name), name, value, type: 'string' })) },
  includeOtherFields: true, options: {},
}, pos);
const credGoogle = { authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api' };
const leerSheet = (wf, pos) => nodo(wf, 'Leer Sheet', 'n8n-nodes-base.httpRequest', 4.2, {
  url: `=https://sheets.googleapis.com/v4/spreadsheets/{{ ${cfg}.sheet_id }}/values:batchGet?${['empleados', 'skills-empleados', 'planes-backup', 'bandas-salariales', 'encuesta-clima-agregada', 'historico-semaforo', 'alertas', 'key-people'].map(h => `ranges=${h}`).join('&')}&valueRenderOption=UNFORMATTED_VALUE`,
  ...credGoogle, options: {},
}, pos);
const leerTexto = (wf, name, ruta, prop, pos) => nodo(wf, name, 'n8n-nodes-base.httpRequest', 4.2, {
  url: `={{ ${cfg}.repo }}/${ruta}`, options: { response: { response: { responseFormat: 'text', outputPropertyName: prop } } },
}, pos);
const code = (wf, name, fuente, pos) => nodo(wf, name, 'n8n-nodes-base.code', 2, { jsCode: fuente.endsWith('.js') ? codigo(fuente) : fuente }, pos);
const escribir = (wf, name, pos) => nodo(wf, name, 'n8n-nodes-base.httpRequest', 4.2, {
  method: 'POST', url: '={{ $json.url }}', ...credGoogle, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: {},
}, pos);
const gmail = (wf, name, para, asunto, mensaje, pos) => nodo(wf, name, 'n8n-nodes-base.gmail', 2.1, {
  operation: 'send', sendTo: para, subject: asunto, emailType: 'html', message: mensaje, options: { appendAttribution: false },
}, pos);
const formulario = (wf, name, titulo, descripcion, campos, pos) => nodo(wf, name, 'n8n-nodes-base.formTrigger', 2.2, {
  formTitle: titulo, formDescription: descripcion, formFields: { values: campos }, options: {},
}, pos, { webhookId: uid(wf + name) });

const a = (nodeName, index = 0) => ({ node: nodeName, type: 'main', index });
const cadena = nombres => Object.fromEntries(nombres.slice(0, -1).map((n, i) => [n, { main: [[a(nombres[i + 1])]] }]));
const fila = (y, x0, nombres) => nombres.map((n, i) => [n, [x0 + i * 220, y]]);
const workflow = (name, nodes, connections) => ({ name, nodes, connections, settings: { executionOrder: 'v1' } });
const guardar = (archivo, wf) => { fs.writeFileSync(path.join(RAIZ, 'flujos', 'n8n', archivo), JSON.stringify(wf, null, 2) + '\n'); console.log(`flujos/n8n/${archivo} (${wf.nodes.length} nodos)`); };

// ---------- Escenario 1 · Baja de Elena (pasos 1-8 + reinicio) ----------
{
  const wf = 'E1';
  const p = Object.fromEntries([
    ['Formulario baja', [0, 100]], ['Botón Aprobar', [0, 350]], ['Formulario reiniciar', [0, 600]],
    ...fila(350, 240, ['Configuración', 'Leer Sheet', 'Leer definiciones', 'Leer prompt', '¿Qué se ha pedido?']),
    ...fila(100, 1780, ['Motor', '¿Empeora alguna función?', 'Claude propone', 'Propuesta final', 'Preparar escrituras', 'Escribir (baja)', 'Emails', 'Email a dirección', 'Email a People']),
    ...fila(350, 1780, ['Aplicar decisión', 'Responder', 'Peticiones', 'Escribir (aprobación)', 'Email resultado', 'Enviar resultado']),
    ...fila(600, 1340, ['Leer empleados (repo)', 'Leer planes (repo)', 'Leer skills (repo)', 'Reiniciar', 'Escribir (reinicio)']),
  ]);
  const accion = "={{ $json.query && $json.query.alerta ? 'aprobar' : ($json.confirmar ? 'reiniciar' : 'baja') }}";
  const regla = (valor) => ({
    conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
      conditions: [{ id: uid(wf + valor), leftValue: `={{ ${cfg}.accion }}`, rightValue: valor, operator: { type: 'string', operation: 'equals' } }] },
    renameOutput: true, outputKey: valor,
  });
  const nodes = [
    formulario(wf, 'Formulario baja', 'Acme · Registrar una baja', 'Indica el id de la persona que deja la compañía (por ejemplo, E007). El sistema recalcula el mapa y avisa a dirección y a People.',
      [{ fieldLabel: 'empleado_id', placeholder: 'E007', requiredField: true }], p['Formulario baja']),
    nodo(wf, 'Botón Aprobar', 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: 'acme-aprobar', responseMode: 'responseNode', options: {} }, p['Botón Aprobar'], { webhookId: uid(wf + 'webhook') }),
    formulario(wf, 'Formulario reiniciar', 'Acme · Reiniciar demo', 'Deja el Sheet como al principio: plantilla y planes del repo, alertas vacías y mapa inicial.',
      [{ fieldLabel: 'confirmar', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Sí, reiniciar la demo' }] }, requiredField: true }], p['Formulario reiniciar']),
    configuracion(wf, p['Configuración'], [['url_aprobar', 'PEGAR_PRODUCTION_URL_DEL_NODO_BOTON_APROBAR'], ['accion', accion]]),
    leerSheet(wf, p['Leer Sheet']),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', p['Leer definiciones']),
    leerTexto(wf, 'Leer prompt', 'prompts/proponer-acciones.md', 'prompt', p['Leer prompt']),
    leerTexto(wf, 'Leer empleados (repo)', 'datos/empleados.csv', 'csv', p['Leer empleados (repo)']),
    leerTexto(wf, 'Leer planes (repo)', 'datos/planes-backup.csv', 'csv', p['Leer planes (repo)']),
    leerTexto(wf, 'Leer skills (repo)', 'datos/skills-empleados.csv', 'csv', p['Leer skills (repo)']),
    nodo(wf, '¿Qué se ha pedido?', 'n8n-nodes-base.switch', 3.2, { rules: { values: ['baja', 'aprobar', 'reiniciar'].map(regla) }, options: {} }, p['¿Qué se ha pedido?']),
    // Rama baja (pasos 1-6)
    code(wf, 'Motor', 'w1-motor.js', p['Motor']),
    nodo(wf, '¿Empeora alguna función?', 'n8n-nodes-base.if', 2.2, {
      conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
        conditions: [{ id: uid(wf + 'cond'), leftValue: '={{ $json.hay_alerta }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }] },
      options: {},
    }, p['¿Empeora alguna función?']),
    nodo(wf, 'Claude propone', 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 120000 },
    }, p['Claude propone'], { onError: 'continueRegularOutput' }),
    code(wf, 'Propuesta final', 'w1-propuesta.js', p['Propuesta final']),
    code(wf, 'Preparar escrituras', 'w1-escrituras.js', p['Preparar escrituras']),
    escribir(wf, 'Escribir (baja)', p['Escribir (baja)']),
    code(wf, 'Emails', 'w1-emails.js', p['Emails']),
    gmail(wf, 'Email a dirección', '={{ $json.para }}', '={{ $json.asunto_direccion }}', '={{ $json.html_direccion }}', p['Email a dirección']),
    gmail(wf, 'Email a People', "={{ $('Emails').first().json.para }}", "={{ $('Emails').first().json.asunto_people }}", "={{ $('Emails').first().json.html_people }}", p['Email a People']),
    // Rama aprobar (pasos 7-8)
    code(wf, 'Aplicar decisión', 'w2-aplicar.js', p['Aplicar decisión']),
    nodo(wf, 'Responder', 'n8n-nodes-base.respondToWebhook', 1.1, {
      respondWith: 'text', responseBody: '={{ $json.html }}', options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
    }, p['Responder']),
    code(wf, 'Peticiones', "return $('Aplicar decisión').first().json.peticiones.map(json => ({ json }));", p['Peticiones']),
    escribir(wf, 'Escribir (aprobación)', p['Escribir (aprobación)']),
    code(wf, 'Email resultado', "const e = $('Aplicar decisión').first().json.email;\nreturn e ? [{ json: e }] : [];", p['Email resultado']),
    gmail(wf, 'Enviar resultado', '={{ $json.para }}', '={{ $json.asunto }}', '={{ $json.html }}', p['Enviar resultado']),
    // Rama reiniciar
    code(wf, 'Reiniciar', 'w0-reiniciar.js', p['Reiniciar']),
    escribir(wf, 'Escribir (reinicio)', p['Escribir (reinicio)']),
  ];
  const connections = {
    'Formulario baja': { main: [[a('Configuración')]] }, 'Botón Aprobar': { main: [[a('Configuración')]] }, 'Formulario reiniciar': { main: [[a('Configuración')]] },
    ...cadena(['Configuración', 'Leer Sheet', 'Leer definiciones', 'Leer prompt', '¿Qué se ha pedido?']),
    '¿Qué se ha pedido?': { main: [[a('Motor')], [a('Aplicar decisión')], [a('Leer empleados (repo)')]] },
    'Motor': { main: [[a('¿Empeora alguna función?')]] },
    '¿Empeora alguna función?': { main: [[a('Claude propone')], [a('Preparar escrituras')]] },
    ...cadena(['Claude propone', 'Propuesta final', 'Preparar escrituras', 'Escribir (baja)', 'Emails', 'Email a dirección', 'Email a People']),
    ...cadena(['Aplicar decisión', 'Responder', 'Peticiones', 'Escribir (aprobación)', 'Email resultado', 'Enviar resultado']),
    ...cadena(['Leer empleados (repo)', 'Leer planes (repo)', 'Leer skills (repo)', 'Reiniciar', 'Escribir (reinicio)']),
  };
  guardar('E1-baja-de-elena.json', workflow('Acme People OS · Escenario 1 · Baja de Elena', nodes, connections));
}

// ---------- Escenario 2 · Actualización de skill (ámbar → verde) ----------
{
  const wf = 'E2';
  const orden = ['Formulario skill', 'Configuración', 'Leer Sheet', 'Leer definiciones', 'Validar skill', 'Escribir en Sheet', 'Email', 'Enviar email'];
  const p = Object.fromEntries(fila(300, 0, orden));
  const nodes = [
    formulario(wf, 'Formulario skill', 'Acme · Validar una skill', 'El manager confirma el nivel que ha alcanzado una persona de su equipo (por ejemplo, Javier tras su formación). Completar un curso no sube el nivel: lo valida el manager.', [
      { fieldLabel: 'empleado_id', placeholder: 'E009', requiredField: true },
      { fieldLabel: 'skill_id', placeholder: 'gestion-claves', requiredField: true },
      { fieldLabel: 'nivel', fieldType: 'dropdown', fieldOptions: { values: ['1', '2', '3', '4'].map(option => ({ option })) }, requiredField: true },
      { fieldLabel: 'validado_por', placeholder: 'E008 (su manager)', requiredField: true },
    ], p['Formulario skill']),
    configuracion(wf, p['Configuración']),
    leerSheet(wf, p['Leer Sheet']),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones', p['Leer definiciones']),
    code(wf, 'Validar skill', 'e2-skill.js', p['Validar skill']),
    escribir(wf, 'Escribir en Sheet', p['Escribir en Sheet']),
    code(wf, 'Email', "return [{ json: $('Validar skill').first().json.email }];", p['Email']),
    gmail(wf, 'Enviar email', '={{ $json.para }}', '={{ $json.asunto }}', '={{ $json.html }}', p['Enviar email']),
  ];
  guardar('E2-actualizacion-de-skill.json', workflow('Acme People OS · Escenario 2 · Actualización de skill', nodes, cadena(orden)));
}
console.log('salidas/n8n/definiciones.json');
