// Genera los workflows de n8n del flujo principal y las definiciones en JSON que leen en tiempo de ejecución.
// Uso: npm run n8n  → flujos/n8n/W0-reiniciar-demo.json, W1-baja-recalcular-avisar.json, W2-aprobar.json
//                    + salidas/n8n/definiciones.json (hay que hacer push: n8n lo lee de GitHub)
//
// El código de los nodos sale de los mismos módulos que verifica `npm run verificar` (cobertura.js, propuesta.js, hojas.js)
// más flujos/n8n/src/. Así hay una sola versión del cálculo. Cambiar una regla de definiciones/ no exige regenerar
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
let x = 0;
const nodo = (wf, name, type, typeVersion, parameters, extra = {}) => ({ id: uid(wf + name), name, type, typeVersion, position: [(x += 220), 300], parameters, ...extra });
const cfg = "$('Configuración').first().json";

const configuracion = wf => nodo(wf, 'Configuración', 'n8n-nodes-base.set', 3.4, {
  assignments: { assignments: [
    ['sheet_id', 'PEGAR_ID_DEL_SHEET'], ['email_demo', 'PEGAR_EMAIL_DEMO'], ['url_aprobar', 'PEGAR_URL_PRODUCCION_DE_W2'],
    ['modelo', 'claude-sonnet-5-5'], ['repo', REPO_RAW],
  ].map(([name, value]) => ({ id: uid(wf + name), name, value, type: 'string' })) },
  includeOtherFields: true, options: {},
});
const credGoogle = { authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api' };
const leerSheet = wf => nodo(wf, 'Leer Sheet', 'n8n-nodes-base.httpRequest', 4.2, {
  url: `=https://sheets.googleapis.com/v4/spreadsheets/{{ ${cfg}.sheet_id }}/values:batchGet?${['empleados', 'skills-empleados', 'planes-backup', 'bandas-salariales', 'encuesta-clima-agregada', 'historico-semaforo', 'alertas', 'key-people'].map(h => `ranges=${h}`).join('&')}&valueRenderOption=UNFORMATTED_VALUE`,
  ...credGoogle, options: {},
});
const leerTexto = (wf, name, ruta, prop) => nodo(wf, name, 'n8n-nodes-base.httpRequest', 4.2, {
  url: `={{ ${cfg}.repo }}/${ruta}`, options: { response: { response: { responseFormat: 'text', outputPropertyName: prop } } },
});
const code = (wf, name, archivo) => nodo(wf, name, 'n8n-nodes-base.code', 2, { jsCode: archivo.endsWith('.js') ? codigo(archivo) : archivo });
const escribir = wf => nodo(wf, 'Escribir en Sheet', 'n8n-nodes-base.httpRequest', 4.2, {
  method: 'POST', url: '={{ $json.url }}', ...credGoogle, sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: {},
});
const gmail = (wf, name, para, asunto, mensaje) => nodo(wf, name, 'n8n-nodes-base.gmail', 2.1, {
  operation: 'send', sendTo: para, subject: asunto, emailType: 'html', message: mensaje, options: { appendAttribution: false },
});
const formulario = (wf, titulo, descripcion, campos) => nodo(wf, 'Formulario', 'n8n-nodes-base.formTrigger', 2.2, {
  formTitle: titulo, formDescription: descripcion, formFields: { values: campos }, options: {},
}, { webhookId: uid(wf + 'form') });

const cadena = nombres => Object.fromEntries(nombres.slice(0, -1).map((n, i) => [n, { main: [[{ node: nombres[i + 1], type: 'main', index: 0 }]] }]));
const workflow = (name, nodes, connections) => ({ name, nodes, connections, settings: { executionOrder: 'v1' } });
const guardar = (archivo, wf) => { fs.writeFileSync(path.join(RAIZ, 'flujos', 'n8n', archivo), JSON.stringify(wf, null, 2) + '\n'); console.log(`flujos/n8n/${archivo} (${wf.nodes.length} nodos)`); };

// ---------- W1 · Baja → recalcular → avisar (pasos 1-6) ----------
{
  const wf = 'W1'; x = 0;
  const nodes = [
    formulario(wf, 'Acme · Registrar una baja', 'Indica el id de la persona que deja la compañía (por ejemplo, E007). El sistema recalcula el mapa y avisa a dirección y a People.',
      [{ fieldLabel: 'empleado_id', placeholder: 'E007', requiredField: true }]),
    configuracion(wf), leerSheet(wf),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones'),
    leerTexto(wf, 'Leer prompt', 'prompts/proponer-acciones.md', 'prompt'),
    code(wf, 'Motor', 'w1-motor.js'),
    nodo(wf, '¿Empeora alguna función?', 'n8n-nodes-base.if', 2.2, {
      conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and',
        conditions: [{ id: uid('W1cond'), leftValue: '={{ $json.hay_alerta }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }] },
      options: {},
    }),
    nodo(wf, 'Claude propone', 'n8n-nodes-base.httpRequest', 4.2, {
      method: 'POST', url: 'https://api.anthropic.com/v1/messages', authentication: 'genericCredentialType', genericAuthType: 'httpHeaderAuth',
      sendHeaders: true, headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }, { name: 'content-type', value: 'application/json' }] },
      sendBody: true, specifyBody: 'json', jsonBody: '={{ JSON.stringify($json.body) }}', options: { timeout: 120000 },
    }, { onError: 'continueRegularOutput' }),
    code(wf, 'Propuesta final', 'w1-propuesta.js'),
    code(wf, 'Preparar escrituras', 'w1-escrituras.js'),
    escribir(wf),
    code(wf, 'Emails', 'w1-emails.js'),
    gmail(wf, 'Email a dirección', '={{ $json.para }}', '={{ $json.asunto_direccion }}', '={{ $json.html_direccion }}'),
    gmail(wf, 'Email a People', "={{ $('Emails').first().json.para }}", "={{ $('Emails').first().json.asunto_people }}", "={{ $('Emails').first().json.html_people }}"),
  ];
  const connections = {
    ...cadena(['Formulario', 'Configuración', 'Leer Sheet', 'Leer definiciones', 'Leer prompt', 'Motor', '¿Empeora alguna función?']),
    '¿Empeora alguna función?': { main: [[{ node: 'Claude propone', type: 'main', index: 0 }], [{ node: 'Preparar escrituras', type: 'main', index: 0 }]] },
    ...cadena(['Claude propone', 'Propuesta final', 'Preparar escrituras', 'Escribir en Sheet', 'Emails', 'Email a dirección', 'Email a People']),
  };
  guardar('W1-baja-recalcular-avisar.json', workflow('Acme People OS · W1 · Baja → recalcular → avisar', nodes, connections));
}

// ---------- W2 · Aprobar desde el email (pasos 7-8) ----------
{
  const wf = 'W2'; x = 0;
  const nodes = [
    nodo(wf, 'Webhook', 'n8n-nodes-base.webhook', 2, { httpMethod: 'GET', path: 'acme-aprobar', responseMode: 'responseNode', options: {} }, { webhookId: uid('W2webhook') }),
    configuracion(wf), leerSheet(wf),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones'),
    code(wf, 'Aplicar decisión', 'w2-aplicar.js'),
    nodo(wf, 'Responder', 'n8n-nodes-base.respondToWebhook', 1.1, {
      respondWith: 'text', responseBody: '={{ $json.html }}', options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } },
    }),
    code(wf, 'Peticiones', "return $('Aplicar decisión').first().json.peticiones.map(json => ({ json }));"),
    escribir(wf),
    code(wf, 'Email resultado', "const e = $('Aplicar decisión').first().json.email;\nreturn e ? [{ json: e }] : [];"),
    gmail(wf, 'Email a People', '={{ $json.para }}', '={{ $json.asunto }}', '={{ $json.html }}'),
  ];
  guardar('W2-aprobar.json', workflow('Acme People OS · W2 · Aprobar desde el email', nodes,
    cadena(['Webhook', 'Configuración', 'Leer Sheet', 'Leer definiciones', 'Aplicar decisión', 'Responder', 'Peticiones', 'Escribir en Sheet', 'Email resultado', 'Email a People'])));
}

// ---------- W0 · Reiniciar demo ----------
{
  const wf = 'W0'; x = 0;
  const nodes = [
    formulario(wf, 'Acme · Reiniciar demo', 'Deja el Sheet como al principio: plantilla y planes del repo, alertas vacías y mapa inicial.',
      [{ fieldLabel: 'confirmar', fieldType: 'dropdown', fieldOptions: { values: [{ option: 'Sí, reiniciar la demo' }] }, requiredField: true }]),
    configuracion(wf), leerSheet(wf),
    leerTexto(wf, 'Leer definiciones', 'salidas/n8n/definiciones.json', 'definiciones'),
    leerTexto(wf, 'Leer empleados (repo)', 'datos/empleados.csv', 'csv'),
    leerTexto(wf, 'Leer planes (repo)', 'datos/planes-backup.csv', 'csv'),
    code(wf, 'Reiniciar', 'w0-reiniciar.js'),
    escribir(wf),
  ];
  guardar('W0-reiniciar-demo.json', workflow('Acme People OS · W0 · Reiniciar demo', nodes,
    cadena(['Formulario', 'Configuración', 'Leer Sheet', 'Leer definiciones', 'Leer empleados (repo)', 'Leer planes (repo)', 'Reiniciar', 'Escribir en Sheet'])));
}
console.log('salidas/n8n/definiciones.json');
