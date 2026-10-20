// Motor de cálculo de cobertura, semáforo, key people, candidatos y señales de rotación.
// Implementa definiciones/reglas-semaforo.md y definiciones/reglas-senales-rotacion.md. Determinista: sin IA.
//
// Uso:
//   node calculo/cobertura.js                      -> mapa actual
//   node calculo/cobertura.js --baja E007          -> simula la baja de una persona
//   node calculo/cobertura.js --backup E009:gestion-claves:CUS-01  -> simula aprobar un plan de backup
//   node calculo/cobertura.js --json               -> salida en JSON (para el orquestador)

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const RAIZ = path.join(__dirname, '..');
const UMBRALES = { compaRatio: 0.9, mesesSinRevision: 18, evaluacionAlta: 4, mesesManagerReciente: 6, nMinimoEncuesta: 5 };
const ORDEN = { verde: 0, ambar: 1, rojo: 2 };
const PUNTOS_SEMAFORO = { rojo: 3, ambar: 2, verde: 0 };
const PUNTOS_CRITICIDAD = { critica: 3, importante: 2, soporte: 1 };

// ---------- Lectura ----------
function leerCsv(archivo) {
  const [cab, ...filas] = fs.readFileSync(archivo, 'utf8').replace(/\r/g, '').trim().split('\n');
  const cols = cab.split(',');
  return filas.map(f => Object.fromEntries(f.split(',').map((v, i) => [cols[i], v])));
}
function leerYaml(archivo) { return yaml.load(fs.readFileSync(archivo, 'utf8')); }

function cargar(raiz = RAIZ) {
  const d = p => path.join(raiz, p);
  return {
    funciones: leerYaml(d('definiciones/funciones.yaml')),
    taxonomia: leerYaml(d('definiciones/taxonomia-skills.yaml')),
    areas: leerYaml(d('definiciones/areas.yaml')).areas,
    catalogo: leerYaml(d('definiciones/catalogo-formacion.yaml')).formaciones,
    empleados: leerCsv(d('datos/empleados.csv')),
    skills: leerCsv(d('datos/skills-empleados.csv')),
    planes: leerCsv(d('datos/planes-backup.csv')),
    bandas: leerCsv(d('datos/bandas-salariales.csv')),
    encuesta: leerCsv(d('datos/encuesta-clima-agregada.csv')),
  };
}

// ---------- Cálculo ----------
function prioridad(semaforo, criticidad) {
  const p = PUNTOS_SEMAFORO[semaforo] * PUNTOS_CRITICIDAD[criticidad];
  return p >= 9 ? 'P1' : p >= 6 ? 'P2' : p >= 3 ? 'P3' : p >= 2 ? 'P4' : '-';
}

function calcular(datos) {
  const { funciones, empleados, skills, planes, catalogo } = datos;
  const objetivoDefecto = funciones.defaults.cobertura_objetivo;
  const activos = new Map(empleados.filter(e => e.estado === 'activo').map(e => [e.id, e]));
  const nivel = new Map(); // "E007|gestion-claves" -> nivel validado
  for (const s of skills) if (activos.has(s.empleado_id) && s.nivel_validado) nivel.set(`${s.empleado_id}|${s.skill_id}`, +s.nivel_validado);
  const nivelDe = (id, skill) => nivel.get(`${id}|${skill}`) || 0;
  const interes = id => (activos.get(id).skills_interes || '').split(';').filter(Boolean);
  const planesActivos = planes.filter(p => p.estado === 'activo' && activos.has(p.empleado_id));

  // 1. Cobertura y semáforo por skill y por función
  const resultado = funciones.funciones.map(f => {
    const objetivo = f.cobertura_objetivo || objetivoDefecto;
    const skillsF = f.skills_requeridas.map(({ skill, nivel: min }) => {
      const cubren = [...activos.keys()].filter(id => nivelDe(id, skill) >= min);
      const backups = planesActivos
        .filter(p => p.skill_id === skill && nivelDe(p.empleado_id, skill) === min - 1)
        .map(p => p.empleado_id);
      const n = cubren.length;
      const semaforo = n >= objetivo ? 'verde' : n >= 2 ? 'ambar' : n === 1 && backups.length ? 'ambar' : 'rojo';
      return { skill, nivel_minimo: min, cobertura: n, personas: cubren, backups_en_desarrollo: backups, semaforo };
    });
    const peor = skillsF.reduce((a, b) => (ORDEN[b.semaforo] > ORDEN[a.semaforo] || (b.semaforo === a.semaforo && b.cobertura < a.cobertura) ? b : a));
    return {
      id: f.id, nombre: f.nombre, area: f.area, criticidad: f.criticidad, objetivo,
      cobertura: Math.min(...skillsF.map(s => s.cobertura)),
      semaforo: peor.semaforo, prioridad: prioridad(peor.semaforo, f.criticidad), skills: skillsF,
    };
  });

  // 2. Key people: única cobertura de una skill en función crítica o importante
  const keyPeople = new Map();
  for (const f of resultado) {
    if (f.criticidad === 'soporte') continue;
    for (const s of f.skills) if (s.cobertura === 1) {
      const id = s.personas[0];
      if (!keyPeople.has(id)) keyPeople.set(id, []);
      keyPeople.get(id).push({ funcion: f.id, skill: s.skill, semaforo: f.semaforo });
    }
  }

  // 3. Candidatos a backup y formación para skills en rojo/ámbar
  for (const f of resultado) for (const s of f.skills) {
    if (s.semaforo === 'verde') continue;
    s.candidatos = [...activos.keys()]
      .filter(id => nivelDe(id, s.skill) === s.nivel_minimo - 1 && !s.backups_en_desarrollo.includes(id))
      .map(id => ({ id, nombre: activos.get(id).nombre, area: activos.get(id).area, con_interes: interes(id).includes(s.skill), es_key_person: keyPeople.has(id) }))
      .sort((a, b) => b.con_interes - a.con_interes || a.es_key_person - b.es_key_person);
    s.formacion = catalogo.filter(c => c.skill === s.skill && c.a === s.nivel_minimo).map(c => c.id);
  }

  // 4. Señales de rotación (solo key people y personas que cubren funciones en rojo/ámbar)
  const enRiesgo = new Set(keyPeople.keys());
  for (const f of resultado) if (f.semaforo !== 'verde') for (const s of f.skills) if (s.semaforo !== 'verde') s.personas.forEach(id => enRiesgo.add(id));
  const senales = [...enRiesgo].map(id => ({ id, nombre: activos.get(id).nombre, ...senalesRotacion(activos.get(id), datos) }));

  return {
    funciones: resultado,
    key_people: [...keyPeople].map(([id, funcs]) => ({ id, nombre: activos.get(id).nombre, area: activos.get(id).area, rol: activos.get(id).rol, nivel_puesto: activos.get(id).nivel_puesto, funciones: funcs })),
    senales_rotacion: senales,
  };
}

function climaDe(area, datos) {
  const enc = datos.encuesta;
  const fila = (tipo, seg) => enc.find(r => r.segmento_tipo === tipo && r.segmento === seg && r.publicable === 'si' && +r.n >= UMBRALES.nMinimoEncuesta);
  return fila('area', area) || fila('division', datos.areas[area]) || null;
}

function senalesRotacion(e, datos) {
  const banda = datos.bandas.find(b => b.banda_id === e.banda_id);
  const compa = +(e.salario_ficticio / banda.medio).toFixed(2);
  const media = +datos.encuesta.find(r => r.segmento_tipo === 'compania').engagement;
  const clima = climaDe(e.area, datos);
  const activas = [];
  if (compa < UMBRALES.compaRatio) activas.push(`S1 compa-ratio ${compa}`);
  if (+e.meses_desde_ultima_revision > UMBRALES.mesesSinRevision) activas.push(`S2 ${e.meses_desde_ultima_revision} meses sin revisión`);
  if (clima && +clima.engagement < media) activas.push(`S3 clima ${clima.segmento} ${clima.engagement} < ${media}`);
  if (+e.ultima_evaluacion >= UMBRALES.evaluacionAlta) activas.push(`S4 evaluación ${e.ultima_evaluacion}`);
  if (+e.meses_con_manager_actual <= UMBRALES.mesesManagerReciente) activas.push(`S5 ${e.meses_con_manager_actual} meses con su manager`);
  const probabilidad = activas.length >= 3 ? 'alta' : activas.length === 2 ? 'media' : 'baja';
  return { compa_ratio: compa, senales: activas, probabilidad };
}

// ---------- Escenarios ----------
function simularBaja(datos, id) {
  return { ...datos, empleados: datos.empleados.map(e => (e.id === id ? { ...e, estado: 'baja' } : e)) };
}
function simularBackup(datos, empleado, skill, funcion) {
  const plan = { plan_id: 'SIM', empleado_id: empleado, skill_id: skill, funcion_id: funcion || '', estado: 'activo' };
  return { ...datos, planes: [...datos.planes, plan] };
}

// Compara con una foto anterior: funciones que empeoran o mejoran
function comparar(antes, despues) {
  const previo = new Map(antes.funciones.map(f => [f.id, f]));
  return despues.funciones.flatMap(f => {
    const a = previo.get(f.id);
    if (!a) return [];
    // Cambio de color, o cambio de cobertura sin cambiar de color fuera del verde
    const d = ORDEN[f.semaforo] - ORDEN[a.semaforo] || (f.semaforo !== 'verde' ? a.cobertura - f.cobertura : 0);
    if (!d) return [];
    return [{ id: f.id, nombre: f.nombre, cambio: d > 0 ? 'empeora' : 'mejora', de: a.semaforo, a: f.semaforo, cobertura_antes: a.cobertura, cobertura_despues: f.cobertura }];
  });
}

module.exports = { cargar, calcular, simularBaja, simularBackup, comparar, prioridad };

// ---------- CLI ----------
if (require.main === module) {
  const args = process.argv.slice(2);
  const val = flag => (args.includes(flag) ? args[args.indexOf(flag) + 1] : null);
  const base = cargar();
  let datos = base;
  if (val('--baja')) datos = simularBaja(datos, val('--baja'));
  if (val('--backup')) { const [e, s, f] = val('--backup').split(':'); datos = simularBackup(datos, e, s, f); }
  const r = calcular(datos);
  const cambios = datos === base ? [] : comparar(calcular(base), r);
  if (args.includes('--json')) { console.log(JSON.stringify({ ...r, cambios }, null, 2)); process.exit(0); }

  const icono = { verde: '🟢', ambar: '🟡', rojo: '🔴' };
  const nombre = id => base.empleados.find(e => e.id === id).nombre;
  console.log('\nMAPA DE COBERTURA');
  for (const f of r.funciones) {
    const debil = f.skills.filter(s => s.semaforo !== 'verde').map(s => `${s.skill}=${s.cobertura}${s.backups_en_desarrollo.length ? ' +backup' : ''}`).join(', ');
    console.log(`${icono[f.semaforo]} ${f.prioridad.padEnd(2)} ${f.id.padEnd(7)} ${f.criticidad.padEnd(10)} cob ${f.cobertura}/${f.objetivo}  ${f.nombre}${debil ? '  · ' + debil : ''}`);
  }
  console.log('\nKEY PEOPLE');
  for (const k of r.key_people) console.log(`- ${k.nombre} (${k.rol}, ${k.area}): ${k.funciones.map(f => `${f.funcion}/${f.skill}`).join(', ')}`);
  console.log('\nCANDIDATOS A BACKUP (rojo/ámbar)');
  for (const f of r.funciones) for (const s of f.skills) if (s.candidatos) {
    const c = s.candidatos.map(c => `${c.nombre}${c.con_interes ? ' ★interés' : ''}${c.es_key_person ? ' ⚠key person' : ''}`).join('; ') || 'ninguno → valorar contratar';
    console.log(`- ${f.id} ${s.skill}: ${c} · formación: ${s.formacion.join(', ') || '—'}`);
  }
  console.log('\nSEÑALES DE ROTACIÓN (vista solo People)');
  for (const s of r.senales_rotacion) console.log(`- ${s.nombre}: ${s.probabilidad} (${s.senales.join('; ') || 'ninguna'})`);
  if (cambios.length) {
    console.log('\nCAMBIOS FRENTE AL ESTADO ACTUAL');
    for (const c of cambios) console.log(`- ${c.id} ${c.nombre}: ${c.cambio} ${c.de} → ${c.a} (cobertura ${c.cobertura_antes} → ${c.cobertura_despues})`);
  }
}
