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

demo('validar', 'E009', 'gestion-claves', '3', 'E008');
const validar = foto();
const planesFin = leerCsv('planes-backup.csv');
const historico = leerCsv('historico-semaforo.csv');

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
  const notas = w.nodes.filter(n => n.type.endsWith('stickyNote')).sort((a, b) => a.position[0] - b.position[0]);
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
  definiciones: { cus01: bloqueCus01 },
  nombres: {
    skills: Object.fromEntries(datosIni.taxonomia.skills.map(s => [s.id, s.nombre])),
    formacion: Object.fromEntries(datosIni.catalogo.map(f => [f.id, { nombre: f.nombre, tipo: f.tipo, semanas: f.semanas }])),
  },
  n8n: { e1: bloquesN8n('E1-baja-de-elena.json'), e2: bloquesN8n('E2-actualizacion-de-skill.json') },
};

fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
fs.writeFileSync(SALIDA, `// Generado por \`npm run video\` (calculo/exportar-video.js). No editar a mano.\nwindow.DEMO = ${JSON.stringify(datos, null, 1)};\n`);
const c = m => `${m.cuenta.rojo}·${m.cuenta.ambar}·${m.cuenta.verde}`;
console.log(`video/datos.js · mapa ${c(inicial.mapa)} → ${c(baja.mapa)} → ${c(alr003.mapa)} → ${c(validar.mapa)} · ${alertasBaja.length} alertas`);
