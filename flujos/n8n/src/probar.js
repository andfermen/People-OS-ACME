// Banco de pruebas de los workflows de n8n sin n8n: ejecuta el código de los nodos tal cual está en los JSON generados,
// contra un Sheet simulado (los CSV de salidas/sheets/), y aplica las escrituras que producen.
// Recorre la demo: W1 baja de Elena → W2 aprobar opción B → W2 aprobar backup de Javier → W2 repetir (ya decidida) → W0 reiniciar.
// Uso: npm run probar-n8n   (después de npm run n8n)

const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..', '..');
const wf = n => JSON.parse(fs.readFileSync(path.join(RAIZ, 'flujos', 'n8n', n), 'utf8'));
const W0 = wf('W0-reiniciar-demo.json'), W1 = wf('W1-baja-recalcular-avisar.json'), W2 = wf('W2-aprobar.json');
const HOJAS = ['empleados', 'skills-empleados', 'planes-backup', 'bandas-salariales', 'encuesta-clima-agregada', 'historico-semaforo', 'alertas', 'key-people', 'cobertura'];

// ---------- Sheet simulado ----------
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
const sheet = Object.fromEntries(HOJAS.map(h => [h, csv(fs.readFileSync(path.join(RAIZ, 'salidas', 'sheets', `${h}.csv`), 'utf8')).map(f => f.map(comoSheet))]));
const recortar = rows => { const r = rows.map(f => { const g = [...f]; while (g.length && (g[g.length - 1] === '' || g[g.length - 1] == null)) g.pop(); return g; }); while (r.length && !r[r.length - 1].length) r.pop(); return r; };
const batchGet = () => ({ valueRanges: HOJAS.slice(0, 8).map(h => ({ range: h, values: recortar(sheet[h]) })) });

function aplicar(peticion) {
  if (peticion.url.includes(':batchUpdate')) for (const { range, values } of peticion.body.data) {
    const [, hoja, desde] = range.match(/^'(.+)'!A(\d+):/);
    values.forEach((fila, i) => { sheet[hoja][+desde - 1 + i] = fila; });
  } else if (peticion.url.includes(':append')) {
    const hoja = decodeURIComponent(peticion.url.match(/values\/(.+?):append/)[1]).match(/^'(.+)'!/)[1];
    sheet[hoja] = recortar(sheet[hoja]); sheet[hoja].push(...peticion.body.values);
  } else throw new Error('Petición desconocida ' + peticion.url);
}
const objetos = h => { const [cab, ...f] = recortar(sheet[h]); return f.filter(x => x.length).map(x => Object.fromEntries(cab.map((c, i) => [c, x[i] == null ? '' : String(x[i])]))); };

// ---------- Ejecutar un nodo de código como n8n ----------
function ejecutar(w, nombre, salidas) {
  const n = w.nodes.find(x => x.name === nombre);
  const $ = name => { if (!(name in salidas)) throw new Error(`Node '${name}' hasn't been executed`); return { first: () => ({ json: salidas[name][0] }), all: () => salidas[name].map(json => ({ json })) }; };
  const entrada = salidas.__entrada || [{}];
  const out = new Function('$', '$input', n.parameters.jsCode)($, { first: () => ({ json: entrada[0] }), all: () => entrada.map(json => ({ json })) });
  salidas[nombre] = out.map(o => o.json);
  return salidas[nombre];
}
const config = { sheet_id: 'TEST', email_demo: 'demo@acme.example', url_aprobar: 'https://n8n.test/webhook/acme-aprobar', modelo: 'claude-sonnet-5-5' };
const comunes = () => ({
  'Configuración': [config], 'Leer Sheet': [batchGet()],
  'Leer definiciones': [{ definiciones: fs.readFileSync(path.join(RAIZ, 'salidas', 'n8n', 'definiciones.json'), 'utf8') }],
});

let fallos = 0;
const caso = (txt, ok) => { console.log(`${ok ? '✅' : '❌'} ${txt}`); if (!ok) fallos++; };
const fn = id => objetos('cobertura').find(f => f.funcion_id === id);

// ---------- W1 · baja de Elena (Claude no disponible → propuesta por reglas) ----------
{
  const s = { ...comunes(), Formulario: [{ empleado_id: 'e007' }], 'Leer prompt': [{ prompt: fs.readFileSync(path.join(RAIZ, 'prompts', 'proponer-acciones.md'), 'utf8') }] };
  const m = ejecutar(W1, 'Motor', s)[0];
  caso('W1 Motor: la baja de Elena empeora CUS-01 y CUS-02', m.hay_alerta && ['CUS-01', 'CUS-02'].every(id => m.cambios.some(c => c.id === id && c.cambio === 'empeora')));
  caso('W1 Motor: la petición a Claude lleva el prompt y la vacante', m.body.system.includes('Vacante') && m.body.messages[0].content.includes('"candidatos"'));
  s.__entrada = [{ error: { message: 'simulado: sin API key' } }];
  const p = ejecutar(W1, 'Propuesta final', s)[0];
  caso('W1 Propuesta final: sin Claude usa las reglas (A, B, backup, conversación)', p.fuente.startsWith('reglas') && p.alertas.map(a => a.alerta_id).join() === 'ALR-001,ALR-002,ALR-003,ALR-004' && p.alertas[1].grupo === 'VAC-E007');
  delete s.__entrada;
  ejecutar(W1, 'Preparar escrituras', s).forEach(aplicar);
  caso('W1 Sheet: Elena de baja, CUS-01 en rojo, 4 alertas pendientes, foto nueva en el histórico',
    objetos('empleados').find(e => e.id === 'E007').estado === 'baja' && fn('CUS-01').semaforo === 'rojo'
    && objetos('alertas').filter(a => a.decision === 'pendiente').length === 4 && objetos('historico-semaforo').some(h => h.evento.startsWith('Baja de Elena')));
  caso('W1 Sheet: Marcos aparece en key-people y Elena ya no', objetos('key-people').some(k => k.empleado_id === 'E008') && !objetos('key-people').some(k => k.empleado_id === 'E007'));
  const e = ejecutar(W1, 'Emails', s)[0];
  caso('W1 Emails: dirección sin enlaces ni compa-ratio; People con enlaces de aprobación y nota confidencial',
    !e.html_direccion.includes('acme-aprobar') && !e.html_direccion.includes('compa') && e.html_people.includes('acme-aprobar?alerta=ALR-002') && e.html_people.includes('compa-ratio'));
  fs.mkdirSync(path.join(RAIZ, 'salidas', 'n8n'), { recursive: true });
  fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'muestra-email-direccion.html'), e.html_direccion);
  fs.writeFileSync(path.join(RAIZ, 'salidas', 'n8n', 'muestra-email-people.html'), e.html_people);
}

// ---------- W2 · aprobar ----------
function aprobar(alerta) {
  const s = { ...comunes(), Webhook: [{ query: { alerta } }] };
  const out = ejecutar(W2, 'Aplicar decisión', s)[0];
  out.peticiones.forEach(aplicar);
  return out;
}
{
  const o = aprobar('ALR-002');
  const al = Object.fromEntries(objetos('alertas').map(a => [a.alerta_id, a.decision]));
  const marcos = objetos('empleados').find(e => e.id === 'E008');
  caso('W2 opción B: ALR-002 aprobada, ALR-001 descartada; Marcos responsable de custodia; Javier depende de él; plan FOR-04',
    al['ALR-002'] === 'aprobada' && al['ALR-001'] === 'descartada' && marcos.rol === 'Responsable de custodia' && marcos.manager_id === 'E001'
    && objetos('empleados').find(e => e.id === 'E009').manager_id === 'E008' && objetos('planes-backup').some(p => p.empleado_id === 'E008' && p.formacion_id === 'FOR-04'));
  caso('W2 opción B: la página de respuesta lo confirma y CUS-02 sigue en rojo', o.html.includes('ALR-002 aprobada') && fn('CUS-02').semaforo === 'rojo');
  const o2 = aprobar('ALR-003');
  caso('W2 backup de Javier: CUS-01 pasa de rojo a ámbar y el email lo cuenta', fn('CUS-01').semaforo === 'ambar' && o2.email.html.includes('CUS-01') && o2.email.asunto.includes('el riesgo baja'));
  const o3 = aprobar('ALR-002');
  caso('W2 repetir un clic: "ya está aprobada" y no escribe nada', o3.html.includes('ya está aprobada') && !o3.peticiones.length);
  caso('W2 alerta inexistente: lo dice y no escribe nada', aprobar('ALR-999').html.includes('No existe'));
}

// ---------- W0 · reiniciar ----------
{
  const s = { ...comunes(),
    'Leer empleados (repo)': [{ csv: fs.readFileSync(path.join(RAIZ, 'datos', 'empleados.csv'), 'utf8') }],
    'Leer planes (repo)': [{ csv: fs.readFileSync(path.join(RAIZ, 'datos', 'planes-backup.csv'), 'utf8') }] };
  ejecutar(W0, 'Reiniciar', s).forEach(aplicar);
  caso('W0 reiniciar: Elena activa, Marcos en su rol, 2 planes, sin alertas, CUS-01 verde, 5 key people, una sola foto',
    objetos('empleados').find(e => e.id === 'E007').estado === 'activo' && objetos('empleados').find(e => e.id === 'E008').rol === 'Ingeniero de custodia senior'
    && objetos('planes-backup').length === 2 && !objetos('alertas').length && fn('CUS-01').semaforo === 'verde'
    && objetos('key-people').length === 5 && new Set(objetos('historico-semaforo').map(h => h.evento)).size === 1);
  const m = ejecutar(W1, 'Motor', { ...s, Formulario: [{ empleado_id: 'E007' }], 'Leer Sheet': [batchGet()], 'Leer prompt': [{ prompt: '## System\nx\n## User\ny' }] })[0];
  caso('Tras reiniciar, la demo se puede repetir: la baja de Elena vuelve a dar 2 funciones que empeoran', m.cambios.filter(c => c.cambio === 'empeora').length === 2);
}

console.log(fallos ? `\n${fallos} caso(s) fallan` : '\nLos workflows de n8n hacen la demo completa (código de los nodos) · muestras de email en salidas/n8n/');
process.exit(fallos ? 1 : 0);
