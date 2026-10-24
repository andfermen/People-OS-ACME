// Datos del reproductor del vídeo (video/reproductor.html, D-20).
// Ejecuta el ciclo real de la demo local (calculo/demo.js, propuesta por reglas) y guarda en video/datos.js
// lo que muestra cada escena: mapas, cambios, alertas, vacante, planes e histórico. Ninguna cifra se escribe a mano.
//
//   npm run video
//
// Reinicia salidas/demo/ (el estado de la demo local), igual que `npm run demo -- reset`.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { cargar, calcular, comparar, vacante } = require('./cobertura');
const { umbralesAutomatizaciones, sumarDias, seguimientoPlanes, vigilar, informePorReglas, mdAHtml } = require('./automatizaciones');
const { ejecutarHerramienta, resumenResultado } = require('./asistente');

const RAIZ = path.join(__dirname, '..');
const EST = path.join(RAIZ, 'salidas', 'demo');
const SALIDA = path.join(RAIZ, 'video', 'datos.js');

const env = { ...process.env };
delete env.ANTHROPIC_API_KEY; // propuesta por reglas: el vídeo no depende de la API
delete env.EMAIL_DEMO;
const demo = (...a) => execFileSync(process.execPath, [path.join(__dirname, 'demo.js'), ...a], { env, cwd: RAIZ, encoding: 'utf8' });

function leerCsv(n) {
  const txt = fs.readFileSync(path.join(EST, n), 'utf8').replace(/\r/g, '').trim();
  const [cab, ...filas] = txt.split('\n');
  const cols = cab.split(',');
  const partir = l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).slice(0, cols.length).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  return filas.map(l => Object.fromEntries(partir(l).map((v, i) => [cols[i], v])));
}

// Foto del mapa en el estado actual de salidas/demo/
function foto() {
  const datos = cargar(RAIZ, EST);
  const r = calcular(datos);
  const nombre = new Map(datos.empleados.map(e => [e.id, e.nombre]));
  const n = id => nombre.get(id) || id;
  const cuenta = { rojo: 0, ambar: 0, verde: 0 };
  r.funciones.forEach(f => cuenta[f.semaforo]++);
  return {
    r,
    mapa: {
      cuenta,
      funciones: r.funciones.map(f => ({
        id: f.id, nombre: f.nombre, area: f.area, criticidad: f.criticidad, impacto_ia: f.impacto_ia,
        semaforo: f.semaforo, cobertura: f.cobertura, objetivo: f.objetivo, prioridad: f.prioridad,
        skills: f.skills.map(s => ({ skill: s.skill, nivel_minimo: s.nivel_minimo, cobertura: s.cobertura, semaforo: s.semaforo, personas: s.personas.map(n), backups: s.backups_en_desarrollo.map(n) })),
      })),
      key_people: r.key_people.map(k => ({ id: k.id, nombre: k.nombre, area: k.area, rol: k.rol, oculta: k.oculta, funciones: k.funciones })),
    },
  };
}

const cambios = (a, b) => comparar(a.r, b.r).map(c => ({ ...c, nombre: b.r.funciones.find(f => f.id === c.id).nombre }));

// ---------- Ciclo ----------
demo('reset');
const inicial = foto();
const datosIni = cargar(RAIZ, EST);
const vac = vacante(datosIni, 'E007'); // el perfil del puesto se calcula con Elena aún dentro
const senales = inicial.r.senales_rotacion;

demo('baja', 'E007');
const baja = foto();
const alertasBaja = leerCsv('alertas.csv');
const emails = fs.readdirSync(EST).filter(f => f.startsWith('email-')).sort();
const emailBaja = fs.readFileSync(path.join(EST, emails[0]), 'utf8').replace(/\r/g, '');
const confidencial = fs.readdirSync(EST).filter(f => f.startsWith('people-CONFIDENCIAL')).map(f => fs.readFileSync(path.join(EST, f), 'utf8').trim())[0] || '';

demo('aprobar', 'ALR-002');
const alr002 = foto();
const alertas002 = leerCsv('alertas.csv');
const planes002 = leerCsv('planes-backup.csv');
const empleados002 = leerCsv('empleados.csv');

demo('aprobar', 'ALR-003');
const alr003 = foto();
const alertas003 = leerCsv('alertas.csv');
const planes003 = leerCsv('planes-backup.csv');

// Agentes autónomos (D-21): el tiempo se simula con la fecha. Semana 12: el seguimiento avisa a los managers.
const hoy = new Date().toISOString().slice(0, 10);
const semana = n => sumarDias(hoy, n * 7);
const acciones = n => seguimientoPlanes(cargar(RAIZ, EST), semana(n)); // lo que hará el agente ese lunes (antes de ejecutarlo)
const seg12 = acciones(12); demo('seguimiento', semana(12));

demo('validar', 'E009', 'gestion-claves', '3', 'E008'); // Marcos valida a Javier desde el enlace del aviso
const validar = foto();
const planesFin = leerCsv('planes-backup.csv');
const historico = leerCsv('historico-semaforo.csv');

const seg13 = acciones(13); demo('seguimiento', semana(13));
const seg14 = acciones(14); demo('seguimiento', semana(14));
const escalado = leerCsv('alertas.csv').find(a => a.grupo.startsWith('SEG-'));

// Centinela el mismo día: lo que detecta (antes de guardar su foto) y el informe por reglas
const datosCen = cargar(RAIZ, EST);
const rCen = calcular(datosCen);
const hist = leerCsv('historico-semaforo.csv');
const ultimo = hist[hist.length - 1].evento;
const fotoAnt = { funciones: hist.filter(x => x.evento === ultimo).map(x => ({ id: x.funcion_id, semaforo: x.semaforo, cobertura: +x.cobertura })) };
const cambiosCen = comparar(fotoAnt, rCen).map(c => ({ ...c, nombre: rCen.funciones.find(f => f.id === c.id).nombre }));
const centinela = vigilar(datosCen, rCen, cambiosCen, hist, leerCsv('alertas.csv'), semana(14));
const informe = informePorReglas(centinela);
demo('centinela', semana(14));

// ---------- Contexto para las escenas ----------
const emp = id => datosIni.empleados.find(e => e.id === id);
const resumenDireccion = emailBaja.split('\n\n')[1].trim();
const asunto = emailBaja.split('\n').find(l => l.startsWith('Asunto: ')).slice(8);
const marcos002 = empleados002.find(e => e.id === 'E008');
const dependenDeMarcos = empleados002.filter(e => e.manager_id === 'E008' && e.estado === 'activo').length;

const yamlFunciones = fs.readFileSync(path.join(RAIZ, 'definiciones', 'funciones.yaml'), 'utf8').replace(/\r/g, '');
const bloqueCus01 = yamlFunciones.match(/  - id: CUS-01\n(    .*\n)+/)[0].trimEnd();

// Nodos reales de los escenarios de n8n, agrupados por las notas del lienzo
function bloquesN8n(archivo) {
  const w = JSON.parse(fs.readFileSync(path.join(RAIZ, 'flujos', 'n8n', archivo), 'utf8'));
  const notas = w.nodes.filter(n => n.type.endsWith('stickyNote') && !n.parameters.content.startsWith('## En producción')).sort((a, b) => a.position[0] - b.position[0]);
  const bloques = notas.map(n => ({ titulo: n.parameters.content.split('\n')[0].replace(/^#+\s*/, ''), nodos: [] }));
  for (const n of w.nodes.filter(n => !n.type.endsWith('stickyNote')).sort((a, b) => a.position[0] - b.position[0] || a.position[1] - b.position[1])) {
    let i = 0;
    notas.forEach((s, j) => { if (n.position[0] >= s.position[0] - 60) i = j; });
    bloques[i].nodos.push({ nombre: n.name, tipo: n.type.replace('n8n-nodes-base.', '') });
  }
  const f = w.nodes.find(n => n.type.endsWith('formTrigger')).parameters;
  const formulario = { titulo: f.formTitle, descripcion: f.formDescription, campos: f.formFields.values.map(c => c.fieldLabel) };
  return { nodos: w.nodes.filter(n => !n.type.endsWith('stickyNote')).length, bloques, formulario };
}

// Asistente (D-25): los pasos que da el motor ante "¿Qué pasa si se va Carmen?" sobre el estado inicial.
// La respuesta redactada la escribe Claude en el panel; el vídeo solo enseña las herramientas y sus resultados reales.
const motorJs = require('./cobertura');
const pasosAsistente = [['buscar_persona', { texto: 'Carmen' }], ['simular_baja', { empleado_id: 'E011' }]].map(([herramienta, entrada]) => {
  const r = ejecutarHerramienta(herramienta, entrada, datosIni, motorJs);
  return { herramienta, entrada, resumen: resumenResultado(herramienta, r), resultado: r };
});

const datos = {
  generado: new Date().toISOString().slice(0, 10),
  origen: 'npm run video · calculo/demo.js (propuesta por reglas, sin API)',
  plantilla: {
    personas: datosIni.empleados.filter(e => e.estado === 'activo').length,
    funciones: datosIni.funciones.funciones.length,
    skills: datosIni.taxonomia.skills.length,
    skills_validadas: datosIni.skills.length,
    planes: datosIni.planes.length,
  },
  mapas: { inicial: inicial.mapa, baja: baja.mapa, alr002: alr002.mapa, alr003: alr003.mapa, validar: validar.mapa },
  cambios: { baja: cambios(inicial, baja), alr002: cambios(baja, alr002), alr003: cambios(alr002, alr003), validar: cambios(alr003, validar) },
  elena: { ...emp('E007'), senales: senales.find(s => s.id === 'E007') },
  javier: { ...emp('E009'), skill: datosIni.skills.find(s => s.empleado_id === 'E009' && s.skill_id === 'gestion-claves') },
  vacante: vac,
  email: { asunto, resumen_direccion: resumenDireccion, alertas: alertasBaja, confidencial },
  alertas002: alertas002, alertas003: alertas003,
  marcos002: { rol: marcos002.rol, dependen: dependenDeMarcos },
  planes: { alr002: planes002, alr003: planes003, validar: planesFin },
  historico: historico.filter(h => h.funcion_id === 'CUS-01' || h.funcion_id === 'CUS-02').map(h => ({ evento: h.evento, funcion_id: h.funcion_id, semaforo: h.semaforo, cobertura: +h.cobertura })),
  asistente: { pregunta: '¿Qué pasa si se va Carmen?', pasos: pasosAsistente },
  agentes: {
    umbrales: umbralesAutomatizaciones(datosIni.reglas), hoy, semanas: { 12: semana(12), 13: semana(13), 14: semana(14) },
    seguimiento: { 12: seg12, 13: seg13, 14: seg14 }, escalado,
    centinela: { ...centinela, senales: centinela.senales.length }, // el vídeo no muestra señales individuales
    informe_html: mdAHtml(informe),
  },
  definiciones: { cus01: bloqueCus01 },
  nombres: {
    skills: Object.fromEntries(datosIni.taxonomia.skills.map(s => [s.id, s.nombre])),
    formacion: Object.fromEntries(datosIni.catalogo.map(f => [f.id, { nombre: f.nombre, tipo: f.tipo, semanas: f.semanas }])),
  },
  n8n: { e1: bloquesN8n('E1-baja-de-elena.json'), e2: bloquesN8n('E2-actualizacion-de-skill.json'), e3: bloquesN8n('E3-automatizaciones-calendario.json') },
};

// Guion para leer mientras se graba (video/guion.html): sale de la tabla de locución de video/LEEME.md, una sola fuente
const leeme = fs.readFileSync(path.join(RAIZ, 'video', 'LEEME.md'), 'utf8').replace(/\r/g, '');
const escH = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bloques = [];
for (const l of leeme.split('\n')) {
  const esc = l.match(/^\| \*\*(\d+ · [^*]+)\*\* \|/);
  const paso = l.match(/^\| (\d+) \| ([^|]+) \| ([^|]+) \| "(.+)" \|$/);
  if (esc) bloques.push(`<h2>${escH(esc[1])}</h2>`);
  else if (paso) {
    const tecla = paso[3].includes('⚙');
    bloques.push(`<div class="paso"><div class="cab"><b>${paso[1]}</b> · ${escH(paso[3].replace('⚙', '').trim())} <span>${escH(paso[2].trim())}</span>${tecla ? ' <em>pulsa D para el panel técnico, y D otra vez antes de avanzar</em>' : ''}</div><p>${escH(paso[4])}</p><div class="sig">→ siguiente</div></div>`);
  }
}
fs.writeFileSync(path.join(RAIZ, 'video', 'guion.html'), `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guion del vídeo · People OS</title>
<!-- Generado por \`npm run video\` desde la tabla de locución de video/LEEME.md. No editar a mano. -->
<style>
body{margin:0;background:#18212b;color:#eef1f5;font-family:Inter,"Segoe UI",system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 20px 120px}
h1{font-size:20px;color:#9fb1c7;font-weight:600}h1 small{display:block;font-size:14px;margin-top:6px;font-weight:400}
h2{font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:#8fb4ff;margin:42px 0 12px;border-top:1px solid #2c3846;padding-top:18px}
.paso{margin:0 0 22px}.cab{font-size:15px;color:#9fb1c7}.cab b{color:#fff;font-size:18px}.cab span{float:right;font-variant-numeric:tabular-nums}
.cab em{display:block;color:#ffd38a;font-style:normal;font-size:14px;margin-top:4px}
p{font-size:27px;line-height:1.5;margin:8px 0 6px}.sig{font-size:13px;color:#5f7286}
</style></head><body><main>
<h1>Guion del vídeo · People OS<small>Lee a tu ritmo, no hace falta literal. Avanza el reproductor con → al terminar cada bloque.</small></h1>
${bloques.join('\n')}
</main></body></html>
`);

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, `// Generado por \`npm run video\` (calculo/exportar-video.js). No editar a mano.\nwindow.DEMO = ${JSON.stringify(datos, null, 1)};\n`);
const c = m => `${m.cuenta.rojo}·${m.cuenta.ambar}·${m.cuenta.verde}`;
console.log(`video/datos.js · mapa ${c(inicial.mapa)} → ${c(baja.mapa)} → ${c(alr003.mapa)} → ${c(validar.mapa)} · ${alertasBaja.length} alertas`);
