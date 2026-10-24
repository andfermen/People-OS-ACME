// Despliega los siete workflows en una instancia de n8n por su API pública, en lugar de importarlos a mano (D-28).
// Crea o actualiza cada workflow (por nombre, así las URLs no cambian al repetirlo), rellena las Configuraciones
// (ID del HRIS, email, URL de Aprobar y de los formularios), asigna las credenciales y activa los escenarios.
//
// Uso:  npm run desplegar -- --simular   (enseña lo que haría, sin llamar a n8n)
//       npm run desplegar
//
// Necesita, fuera del repo:
// - URL y clave de API de n8n: las de la CLI oficial (npx @n8n/cli login, se guardan en ~/.n8n-cli/config.json)
//   o las variables N8N_URL y N8N_API_KEY. La clave se crea en n8n: Settings → n8n API.
// - .n8n-demo.json en la raíz (está en .gitignore): { "sheet_id": "…", "email_demo": "…", "url_video": "…" (opcional) }
// - Las tres credenciales creadas en n8n: Google Sheets, Gmail y la de Claude (tipo «Anthropic»).

const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'flujos', 'n8n');
const SIMULAR = process.argv.includes('--simular');
const leerJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));

// ---------- Datos de la instancia y de la demo (nunca en el repo) ----------
function instancia() {
  let cfg = {};
  const archivo = path.join(os.homedir(), '.n8n-cli', 'config.json');
  if (fs.existsSync(archivo)) cfg = leerJson(archivo);
  const url = (process.env.N8N_URL || cfg.url || cfg.baseUrl || '').replace(/\/+$/, '').replace(/\/api\/v1$/, '');
  const clave = process.env.N8N_API_KEY || cfg.apiKey || cfg.api_key || '';
  if (!url || !clave) fallar('Falta la URL o la clave de API de n8n. Ejecuta: npx @n8n/cli login (o define N8N_URL y N8N_API_KEY).');
  return { url, clave };
}
function demo() {
  const archivo = path.join(RAIZ, '.n8n-demo.json');
  if (!fs.existsSync(archivo)) fallar('Falta .n8n-demo.json en la raíz: { "sheet_id": "…", "email_demo": "…" }');
  const d = leerJson(archivo);
  for (const c of ['sheet_id', 'email_demo']) if (!d[c] || /^PEGAR_/.test(d[c])) fallar(`.n8n-demo.json: falta ${c}`);
  return d;
}
function fallar(texto) { console.error(`\n✗ ${texto}\n`); process.exit(1); }

const n8n = SIMULAR ? null : instancia();
const datos = SIMULAR && !fs.existsSync(path.join(RAIZ, '.n8n-demo.json')) ? { sheet_id: '(sheet_id)', email_demo: '(email_demo)' } : demo();
const base = n8n ? n8n.url : 'https://TU-INSTANCIA.app.n8n.cloud';

async function api(metodo, ruta, cuerpo) {
  const res = await fetch(`${n8n.url}/api/v1${ruta}`, {
    method: metodo, headers: { 'X-N8N-API-KEY': n8n.clave, 'content-type': 'application/json', accept: 'application/json' },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const texto = await res.text();
  if (!res.ok) throw new Error(`${metodo} ${ruta} → ${res.status} ${texto.slice(0, 300)}`);
  return texto ? JSON.parse(texto) : {};
}
async function todos(ruta) {
  const filas = [];
  let cursor = '';
  do {
    const r = await api('GET', `${ruta}${ruta.includes('?') ? '&' : '?'}limit=100${cursor ? `&cursor=${cursor}` : ''}`);
    filas.push(...(r.data || []));
    cursor = r.nextCursor || '';
  } while (cursor);
  return filas;
}

// ---------- Los workflows, en orden: el HRIS primero (los demás necesitan su ID) ----------
const ARCHIVOS = ['HRIS-google-sheets.json', 'E1b-aprobar-decision.json', 'E1-baja-de-elena.json', 'E2-actualizacion-de-skill.json',
  'E3-automatizaciones-calendario.json', 'E4-asistente-people.json', 'E0-panel-y-reinicio.json'];
const wfs = Object.fromEntries(ARCHIVOS.map(a => [a, leerJson(path.join(DIR, a))]));
const formUrl = (archivo, nodo) => `${base}/form/${wfs[archivo].nodes.find(n => n.name === nodo).webhookId}`;
const URLS = {
  url_aprobar: `${base}/webhook/acme-aprobar`,
  url_form_baja: formUrl('E1-baja-de-elena.json', 'Formulario baja'),
  url_form_skill: formUrl('E2-actualizacion-de-skill.json', 'Formulario skill'),
  url_formulario_skill: formUrl('E2-actualizacion-de-skill.json', 'Formulario skill'),
  url_form_automatizaciones: formUrl('E3-automatizaciones-calendario.json', 'Ejecutar ahora'),
};
const PANEL = `${base}/webhook/acme-panel`;

// Rellena los PEGAR_… de los nodos de configuración con los valores de esta instancia
function configurar(wf, valores) {
  for (const n of wf.nodes.filter(n => n.type === 'n8n-nodes-base.set' && /^Configuración/.test(n.name))) {
    for (const a of n.parameters.assignments.assignments) if (/^PEGAR_/.test(a.value) && valores[a.name]) a.value = valores[a.name];
  }
  return wf;
}

// Credencial que necesita cada nodo, por tipo de nodo
const CREDENCIAL = {
  'n8n-nodes-base.googleSheets': 'googleSheetsOAuth2Api',
  'n8n-nodes-base.gmail': 'gmailOAuth2',
  'n8n-nodes-base.httpRequest': 'anthropicApi', // solo los que llaman a Claude
};
function asignarCredenciales(wf, previo, porTipo) {
  for (const n of wf.nodes) {
    const tipo = CREDENCIAL[n.type];
    if (!tipo || (n.type === 'n8n-nodes-base.httpRequest' && !/api\.anthropic\.com/.test(n.parameters.url || ''))) continue;
    const antes = previo && previo.nodes.find(p => p.name === n.name && p.credentials);
    if (antes) { n.credentials = antes.credentials; continue; } // la que ya tenía en n8n
    if (porTipo[tipo]) n.credentials = { [tipo]: porTipo[tipo] };
    if (n.type === 'n8n-nodes-base.googleSheets' && n.credentials) n.parameters.authentication = 'oAuth2';
  }
  return wf;
}

// Si hay varios con el mismo nombre (importaciones repetidas), se usa el último modificado; los demás no se tocan
const previoDe = (existentes, nombre) => existentes.filter(w => w.name === nombre).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];

(async () => {
  console.log(`${SIMULAR ? 'Simulación' : 'Despliegue'} en ${base}\n`);
  let existentes = [], porTipo = {};
  if (!SIMULAR) {
    existentes = await todos('/workflows');
    try {
      const creds = await todos('/credentials');
      for (const tipo of Object.values(CREDENCIAL)) {
        const c = creds.filter(x => x.type === tipo);
        if (c.length === 1) porTipo[tipo] = { id: c[0].id, name: c[0].name };
        else if (c.length > 1) console.log(`  · Hay ${c.length} credenciales de tipo ${tipo}: se usa la que ya tuviera cada nodo, o elígela en n8n.`);
      }
    } catch (e) { console.log('  · No se pueden listar las credenciales por la API: se mantienen las que ya tuvieran los nodos.'); }
  }

  // 1 · Desactivar las versiones anteriores (si no, el webhook acme-aprobar del E1 antiguo choca con el E1b)
  for (const a of ARCHIVOS) {
    for (const w of existentes.filter(w => w.name === wfs[a].name && w.active)) await api('POST', `/workflows/${w.id}/deactivate`);
  }

  // 2 · Crear o actualizar, de uno en uno
  const ids = {};
  let proyecto = null;
  for (const a of ARCHIVOS) {
    const valores = { sheet_id: datos.sheet_id, email_demo: datos.email_demo, url_video: datos.url_video, hris_workflow_id: ids['HRIS-google-sheets.json'] || '(id del HRIS)', ...URLS };
    const wf = configurar(wfs[a], valores);
    const resumen = wf.nodes.filter(n => /^Configuración/.test(n.name)).flatMap(n => n.parameters.assignments.assignments)
      .filter(x => x.name !== 'repo' && x.name !== 'modelo' && x.name !== 'accion').map(x => `${x.name}=${/^PEGAR_/.test(x.value) ? '(vacío)' : x.value}`);
    if (SIMULAR) { ids[a] = '(id)'; console.log(`· ${wf.name}\n    ${resumen.join('\n    ')}`); continue; }
    const previoLista = previoDe(existentes, wf.name);
    const previo = previoLista ? await api('GET', `/workflows/${previoLista.id}`) : null;
    const cuerpo = { name: wf.name, nodes: asignarCredenciales(wf, previo, porTipo).nodes, connections: wf.connections, settings: wf.settings };
    const r = previo ? await api('PUT', `/workflows/${previo.id}`, cuerpo) : await api('POST', '/workflows', cuerpo);
    ids[a] = r.id;
    // Los nuevos, al mismo proyecto que el HRIS: n8n no deja llamar a un subworkflow de otro proyecto
    if (a.startsWith('HRIS')) proyecto = ((((await api('GET', `/workflows/${r.id}`)).shared || [])[0]) || {}).projectId;
    else if (!previo && proyecto) await api('PUT', `/workflows/${r.id}/transfer`, { destinationProjectId: proyecto });
    const sinCredencial = cuerpo.nodes.filter(n => CREDENCIAL[n.type] && !n.credentials && (n.type !== 'n8n-nodes-base.httpRequest' || /anthropic/.test(n.parameters.url || '')));
    console.log(`✓ ${previo ? 'Actualizado' : 'Creado'}: ${wf.name} (${r.id})${sinCredencial.length ? `\n    ⚠ sin credencial: ${sinCredencial.map(n => n.name).join(', ')}` : ''}`);
  }
  if (SIMULAR) { console.log(`\nPanel: ${PANEL}`); return; }

  // 3 · Activar todos, también el HRIS: n8n solo deja llamar a un subworkflow publicado
  for (const a of ARCHIVOS) {
    try { await api('POST', `/workflows/${ids[a]}/activate`); console.log(`✓ Activo: ${wfs[a].name}`); }
    catch (e) { console.log(`✗ No se ha podido activar ${wfs[a].name}: ${e.message}\n    Suele ser una credencial sin asignar: ábrelo en n8n, asígnala y actívalo.`); }
  }

  // 4 · Comprobar que responde lo que verá quien pruebe la demo
  console.log('\nComprobación:');
  for (const [nombre, u] of [['Formulario baja', URLS.url_form_baja], ['Formulario skill', URLS.url_form_skill], ['Ejecutar ahora', URLS.url_form_automatizaciones]]) {
    const r = await fetch(u).catch(() => null);
    console.log(`${r && r.ok ? '✓' : '✗'} ${nombre}: ${u}${r && r.ok ? '' : ' (no responde: copia su Production URL en la Configuración del escenario 0)'}`);
  }
  const p = await fetch(PANEL).catch(() => null);
  const html = p && p.ok ? await p.text() : '';
  console.log(`${/todo conectado/.test(html) ? '✓' : '✗'} Panel: ${PANEL}${html ? (/todo conectado/.test(html) ? '' : '\n    El panel dice que falta algo: ábrelo y mira «Estado del montaje».') : ' (no responde)'}`);
})().catch(e => fallar(e.message));
