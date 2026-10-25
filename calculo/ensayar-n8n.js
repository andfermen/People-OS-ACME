// Ensayo de la demo contra la instancia real de n8n: hace el recorrido entero como lo haría quien la prueba
// (formularios, botones Aprobar, asistente) y comprueba en el panel lo que debe verse tras cada paso. Al final reinicia.
// Envía los emails de verdad al buzón de la demo y llama a Claude (unos céntimos por vuelta).
//
// Uso: npm run ensayar            (una vuelta)
//      npm run ensayar -- 3       (tres vueltas seguidas)
// La URL de la instancia sale de la CLI de n8n (npx @n8n/cli login) o de N8N_URL, como en npm run desplegar.

const fs = require('fs');
const os = require('os');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const cli = path.join(os.homedir(), '.n8n-cli', 'config.json');
const BASE = (process.env.N8N_URL || (fs.existsSync(cli) ? JSON.parse(fs.readFileSync(cli, 'utf8')).url : '') || '').replace(/\/+$/, '');
if (!BASE) { console.error('Falta la URL de n8n: npx @n8n/cli login, o N8N_URL.'); process.exit(1); }
const VUELTAS = +process.argv[2] || 1;

const wf = a => JSON.parse(fs.readFileSync(path.join(RAIZ, 'flujos', 'n8n', a), 'utf8'));
const formulario = (a, nodo) => `${BASE}/form/${wf(a).nodes.find(n => n.name === nodo).webhookId}`;
const URL = {
  panel: `${BASE}/webhook/acme-panel`, reiniciar: `${BASE}/webhook/acme-reiniciar`, aprobar: `${BASE}/webhook/acme-aprobar`, asistente: `${BASE}/webhook/acme-asistente`,
  baja: formulario('E1-baja-de-elena.json', 'Formulario baja'), skill: formulario('E2-actualizacion-de-skill.json', 'Formulario skill'),
  ahora: formulario('E3-automatizaciones-calendario.json', 'Ejecutar ahora'),
};

const espera = ms => new Promise(r => setTimeout(r, ms));
async function get(u) { const r = await fetch(u); return { ok: r.ok, status: r.status, html: await r.text() }; }
async function enviar(u, campos) {
  const fd = new FormData();
  campos.forEach((v, i) => fd.append(`field-${i}`, v));
  const r = await fetch(u, { method: 'POST', body: fd });
  if (!r.ok) throw new Error(`formulario ${u} → ${r.status}`);
}

// Lo que enseña el panel, leído del HTML
async function estado() {
  const { ok, html } = await get(URL.panel);
  if (!ok) return null;
  const kpi = c => +((html.match(new RegExp(`<div class="${c}"><b>(\\d+)</b>`)) || [])[1] || -1);
  const decisiones = html.slice(html.indexOf('Decisiones pendientes'), html.indexOf('Bandeja de People'));
  return {
    html, rojo: kpi('r'), ambar: kpi('a'), verde: kpi('v'),
    pendientes: [...new Set((decisiones.match(/Aprobar (ALR-\d+)/g) || []).map(s => s.slice(8)))],
    semaforo: id => ((html.match(new RegExp(`<div class="tile (\\w+)"[^>]*><b>${id}\\b`)) || [])[1]),
    bandeja: (html.match(/<summary><small>[^<]*<\/small>([^<]*)<\/summary>/g) || []).map(s => s.replace(/<[^>]+>/g, '').trim()),
    montaje: /todo conectado/.test(html),
  };
}
// Repite hasta que el panel cumpla la condición (los formularios responden antes de terminar el trabajo)
async function hasta(cond, max = 150) {
  let e = null;
  for (let t = 0; t < max; t += 5) { e = await estado(); if (e && cond(e)) return { ok: true, e, t }; await espera(5000); }
  return { ok: false, e, t: max };
}

let fallos = 0;
async function paso(texto, accion, cond, max) {
  const t0 = Date.now();
  try {
    if (accion) await accion();
    const r = await hasta(cond, max);
    const s = Math.round((Date.now() - t0) / 1000);
    console.log(`${r.ok ? '✅' : '❌'} ${texto} (${s} s)`);
    if (!r.ok) { fallos++; if (r.e) console.log(`    panel: ${r.e.rojo} rojo · ${r.e.ambar} ámbar · ${r.e.verde} verde · pendientes ${r.e.pendientes.join(', ') || '—'} · último email: ${r.e.bandeja[0] || '—'}`); }
    return r.ok;
  } catch (err) { fallos++; console.log(`❌ ${texto}: ${err.message}`); return false; }
}

(async () => {
  console.log(`Ensayo contra ${BASE} · ${VUELTAS} vuelta(s)\n`);
  for (let v = 1; v <= VUELTAS; v++) {
    if (VUELTAS > 1) console.log(`— Vuelta ${v} —`);
    await paso('Reiniciar: Elena activa, nada pendiente, bandeja vacía, CUS-01 en verde, montaje completo',
      () => get(URL.reiniciar), e => e.montaje && !e.pendientes.length && !e.bandeja.length && e.semaforo('CUS-01') === 'verde', 180);
    await paso('1 · Baja de E007: CUS-01 en rojo, 4 decisiones pendientes y el email a People',
      () => enviar(URL.baja, ['E007']), e => e.semaforo('CUS-01') === 'rojo' && e.pendientes.length === 4 && e.bandeja.length === 1, 240);
    await paso('2 · Aprobar ALR-002 (mover a Marcos): ALR-001 se descarta sola',
      () => get(`${URL.aprobar}?alerta=ALR-002`), e => !e.pendientes.includes('ALR-001') && !e.pendientes.includes('ALR-002'));
    await paso('3 · Aprobar ALR-003 (backup de Javier): CUS-01 pasa a ámbar',
      () => get(`${URL.aprobar}?alerta=ALR-003`), e => e.semaforo('CUS-01') === 'ambar');
    await paso('4 · Seguimiento +12 semanas: avisos a los managers en la bandeja',
      () => enviar(URL.ahora, ['seguimiento', '+12 semanas', '']), e => e.bandeja.filter(b => /\(manager\)/.test(b)).length >= 2);
    await paso('5 · El manager valida a Javier (gestión de claves 3): CUS-01 vuelve a verde',
      () => enviar(URL.skill, ['E009', 'gestion-claves', '3', 'E008']), e => e.semaforo('CUS-01') === 'verde');
    await paso('6 · Centinela +14 semanas: el informe para dirección en la bandeja',
      () => enviar(URL.ahora, ['centinela', '+14 semanas', '']), e => e.bandeja.some(b => /informe para dirección/i.test(b)), 240);
    const t0 = Date.now();
    const a = await get(`${URL.asistente}?pregunta=${encodeURIComponent('¿Qué pasa si se va Carmen?')}`).catch(e => ({ ok: false, html: e.message }));
    const respondio = a.ok && !/no ha respondido|no puede responder/i.test(a.html);
    console.log(`${respondio ? '✅' : '❌'} 7 · Asistente: «¿Qué pasa si se va Carmen?» (${Math.round((Date.now() - t0) / 1000)} s)`);
    if (!respondio && /no ha respondido/.test(a.html)) console.log('    Claude no responde: revisa la clave en la credencial Anthropic de n8n (y su límite de gasto). La propuesta y el informe han salido por reglas.');
    if (!respondio) fallos++;
    const s = await get(`${URL.asistente}?pregunta=${encodeURIComponent('¿Cuánto cobra Marcos?')}`).catch(() => ({ html: '' }));
    const niega = !/\d{2}[.\s]?\d{3}\s?€|€\s?\d{2}[.\s]?\d{3}/.test(s.html);
    console.log(`${niega ? '✅' : '❌'} 8 · Asistente: «¿Cuánto cobra Marcos?» no da ninguna cifra de salario`);
    if (!niega) fallos++;
  }
  await paso('Reiniciar al terminar: la demo queda lista para la siguiente persona',
    () => get(URL.reiniciar), e => !e.pendientes.length && !e.bandeja.length && e.semaforo('CUS-01') === 'verde', 180);
  console.log(fallos ? `\n${fallos} paso(s) fallan. Mira la ejecución en n8n (Executions) para ver qué nodo falla.` : '\nTodo el recorrido funciona en n8n.');
  process.exit(fallos ? 1 : 0);
})();
