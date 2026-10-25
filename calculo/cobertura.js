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
// Las reglas (semáforo, prioridad, señales, vacante) y sus umbrales viven en definiciones/reglas.yaml (D-23): aquí solo se aplican.
const ORDEN = { verde: 0, ambar: 1, rojo: 2 };

// ---------- Lectura ----------
function leerCsv(archivo) {
  const [cab, ...filas] = fs.readFileSync(archivo, 'utf8').replace(/\r/g, '').trim().split('\n');
  const cols = cab.split(',');
  return filas.map(f => Object.fromEntries(f.split(',').map((v, i) => [cols[i], v])));
}
function leerYaml(archivo) { return yaml.load(fs.readFileSync(archivo, 'utf8')); }

// dirEstado: carpeta opcional con copias de los CSV que cambian en la demo (empleados, skills, planes).
function cargar(raiz = RAIZ, dirEstado = null) {
  const d = p => {
    const propio = dirEstado && p.startsWith('datos/') && path.join(dirEstado, path.basename(p));
    return propio && fs.existsSync(propio) ? propio : path.join(raiz, p);
  };
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
    reglas: leerYaml(d('definiciones/reglas.yaml')),
  };
}

// ---------- Cálculo ----------
function prioridad(semaforo, criticidad, reglas) {
  const R = reglas.prioridad;
  const p = R.puntos_semaforo[semaforo] * R.puntos_criticidad[criticidad];
  return (R.niveles.find(n => p >= n.puntos_minimos) || { prioridad: '-' }).prioridad;
}

// Semáforo de una skill: la primera regla de reglas.yaml (semaforo) que se cumple
function colorSkill(n, objetivo, conBackup, reglas) {
  for (const r of reglas.semaforo) {
    const si = r.si || {};
    const minimo = si.cobertura_minima === 'objetivo' ? objetivo : si.cobertura_minima;
    if (minimo != null && n < minimo) continue;
    if (si.cobertura != null && n !== si.cobertura) continue;
    if (si.con_backup && !conBackup) continue;
    return r.color;
  }
  throw new Error('reglas.yaml: ninguna regla del semáforo se cumple (la última debería no tener condiciones)');
}

function calcular(datos) {
  const { funciones, empleados, skills, planes, catalogo, reglas } = datos;
  const R = reglas;
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
        .filter(p => p.skill_id === skill && nivelDe(p.empleado_id, skill) === min - R.cobertura.backup_a_distancia)
        .map(p => p.empleado_id);
      const n = cubren.length;
      const semaforo = colorSkill(n, objetivo, backups.length > 0, R);
      return { skill, nivel_minimo: min, cobertura: n, personas: cubren, backups_en_desarrollo: backups, semaforo };
    });
    const peor = skillsF.reduce((a, b) => (ORDEN[b.semaforo] > ORDEN[a.semaforo] || (b.semaforo === a.semaforo && b.cobertura < a.cobertura) ? b : a));
    // Lente AI first (reglas-semaforo.md §7): en rojo con impacto IA alto no se forma un backup del proceso actual
    const respuesta = peor.semaforo === R.rediseno_ia.semaforo && f.impacto_ia === R.rediseno_ia.impacto_ia ? 'redisenar' : 'cubrir';
    return {
      id: f.id, nombre: f.nombre, area: f.area, criticidad: f.criticidad, impacto_ia: f.impacto_ia, objetivo,
      cobertura: Math.min(...skillsF.map(s => s.cobertura)),
      semaforo: peor.semaforo, prioridad: prioridad(peor.semaforo, f.criticidad, R), respuesta, skills: skillsF,
    };
  });

  // 2. Key people: única cobertura de una skill en función crítica o importante
  const keyPeople = new Map();
  for (const f of resultado) {
    if (!R.cobertura.key_person.criticidades.includes(f.criticidad)) continue;
    for (const s of f.skills) if (s.cobertura === R.cobertura.key_person.cobertura) {
      const id = s.personas[0];
      if (!keyPeople.has(id)) keyPeople.set(id, []);
      keyPeople.get(id).push({ funcion: f.id, skill: s.skill, semaforo: f.semaforo });
    }
  }

  // 3. Candidatos a backup y formación para skills en rojo/ámbar
  for (const f of resultado) for (const s of f.skills) {
    if (s.semaforo === 'verde') continue;
    s.candidatos = [...activos.keys()]
      .filter(id => nivelDe(id, s.skill) === s.nivel_minimo - R.cobertura.backup_a_distancia && !s.backups_en_desarrollo.includes(id))
      .map(id => ({ id, nombre: activos.get(id).nombre, area: activos.get(id).area, con_interes: interes(id).includes(s.skill), es_key_person: keyPeople.has(id) }))
      .sort((a, b) => b.con_interes - a.con_interes || a.es_key_person - b.es_key_person);
    // Un mentoring interno necesita a alguien que ya cubra la skill: con cobertura 0 no se propone
    s.formacion = catalogo.filter(c => c.skill === s.skill && c.a === s.nivel_minimo && !(c.tipo === 'mentoring-interno' && s.cobertura === 0)).map(c => c.id);
  }

  // 4. Señales de rotación (solo key people y personas que cubren funciones en rojo/ámbar)
  const enRiesgo = new Set(keyPeople.keys());
  for (const f of resultado) if (f.semaforo !== 'verde') for (const s of f.skills) if (s.semaforo !== 'verde') s.personas.forEach(id => enRiesgo.add(id));
  const senales = [...enRiesgo].map(id => ({ id, nombre: activos.get(id).nombre, ...senalesRotacion(activos.get(id), datos) }));

  return {
    funciones: resultado,
    key_people: [...keyPeople].map(([id, funcs]) => {
      const e = activos.get(id);
      const areaDe = fid => resultado.find(f => f.id === fid).area;
      // Oculta: puesto junior/intermedio, o sostiene una función de otra área (reglas-semaforo.md §3)
      const oculta = R.cobertura.key_person_oculta.niveles_puesto.includes(e.nivel_puesto) || funcs.some(f => areaDe(f.funcion) !== e.area);
      return { id, nombre: e.nombre, area: e.area, rol: e.rol, nivel_puesto: e.nivel_puesto, oculta, funciones: funcs };
    }),
    senales_rotacion: senales,
    madurez_ia: madurezIa(datos),
  };
}

// Madurez IA por área: nivel medio validado de cada skill de IA (sin la skill = 0).
// Áreas con menos de 5 personas se agrupan en su división, como las encuestas; si aun así no llegan a 5,
// no se publican. Así no se puede deducir el nivel de nadie.
function madurezIa(datos) {
  const skillsIa = datos.taxonomia.skills.filter(s => s.tipo === 'ia').map(s => s.id);
  const activos = datos.empleados.filter(e => e.estado === 'activo');
  const nivel = new Map(datos.skills.filter(s => s.nivel_validado).map(s => [`${s.empleado_id}|${s.skill_id}`, +s.nivel_validado]));
  const grupos = new Map();
  const cuenta = activos.reduce((m, e) => ((m[e.area] = (m[e.area] || 0) + 1), m), {});
  for (const e of activos) {
    const seg = cuenta[e.area] >= datos.reglas.anonimato.n_minimo ? e.area : `${datos.areas[e.area]} (áreas pequeñas)`;
    if (!grupos.has(seg)) grupos.set(seg, []);
    grupos.get(seg).push(e.id);
  }
  const media = ids => Object.fromEntries(skillsIa.map(s => [s, +(ids.reduce((t, id) => t + (nivel.get(`${id}|${s}`) || 0), 0) / ids.length).toFixed(1)]));
  return [...grupos].filter(([, ids]) => ids.length >= datos.reglas.anonimato.n_minimo).map(([segmento, ids]) => {
    const m = media(ids);
    return { segmento, n: ids.length, ...m, indice: +(skillsIa.reduce((t, s) => t + m[s], 0) / skillsIa.length).toFixed(1) };
  }).sort((a, b) => b.indice - a.indice);
}

function climaDe(area, datos) {
  const enc = datos.encuesta;
  const fila = (tipo, seg) => enc.find(r => r.segmento_tipo === tipo && r.segmento === seg && r.publicable === 'si' && +r.n >= datos.reglas.anonimato.n_minimo);
  return fila('area', area) || fila('division', datos.areas[area]) || null;
}

function senalesRotacion(e, datos) {
  const banda = datos.bandas.find(b => b.banda_id === e.banda_id);
  const compa = +(e.salario_ficticio / banda.medio).toFixed(2);
  const media = +datos.encuesta.find(r => r.segmento_tipo === 'compania').engagement;
  const clima = climaDe(e.area, datos);
  const U = datos.reglas.senales_rotacion;
  const activas = [];
  if (compa < U.compa_ratio_menor_que) activas.push(`S1 compa-ratio ${compa}`);
  if (+e.meses_desde_ultima_revision > U.meses_sin_revision_mas_de) activas.push(`S2 ${e.meses_desde_ultima_revision} meses sin revisión`);
  if (clima && +clima.engagement < media) activas.push(`S3 clima ${clima.segmento} ${clima.engagement} < ${media}`);
  if (+e.ultima_evaluacion >= U.evaluacion_desde) activas.push(`S4 evaluación ${e.ultima_evaluacion}`);
  if (+e.meses_con_manager_actual <= U.meses_con_manager_hasta) activas.push(`S5 ${e.meses_con_manager_actual} meses con su manager`);
  // Nivel de señales (bajo, medio, alto): cuántas están activas. No es una probabilidad ni una puntuación de la persona.
  const nivel_senales = activas.length >= U.nivel_senales.alto_desde ? 'alto' : activas.length >= U.nivel_senales.medio_desde ? 'medio' : 'bajo';
  return { compa_ratio: compa, senales: activas, nivel_senales };
}

// ---------- Escenarios ----------
function simularBaja(datos, id) {
  return { ...datos, empleados: datos.empleados.map(e => (e.id === id ? { ...e, estado: 'baja' } : e)) };
}
function simularBackup(datos, empleado, skill, funcion) {
  const plan = { plan_id: 'SIM', empleado_id: empleado, skill_id: skill, funcion_id: funcion || '', estado: 'activo' };
  return { ...datos, planes: [...datos.planes, plan] };
}

// ---------- Vacante y movilidad interna (reglas-semaforo.md §9) ----------
// Perfil del puesto que deja una persona: las skills que cubría en alguna función, con el nivel mínimo más alto
// que le pedían, y liderazgo si tenía equipo. Candidatos internos: quien cumple al menos la mitad del perfil.
function vacante(datos, id, despues = calcular(simularBaja(datos, id))) {
  const sale = datos.empleados.find(e => e.id === id);
  const nivel = new Map(datos.skills.filter(s => s.nivel_validado).map(s => [`${s.empleado_id}|${s.skill_id}`, +s.nivel_validado]));
  const niv = (e, skill) => nivel.get(`${e}|${skill}`) || 0;
  const req = new Map();
  for (const f of datos.funciones.funciones) for (const s of f.skills_requeridas)
    if (niv(id, s.skill) >= s.nivel && (!req.has(s.skill) || s.nivel > req.get(s.skill).nivel)) req.set(s.skill, { skill: s.skill, nivel: s.nivel, funcion: f.id });
  const equipo = datos.empleados.filter(e => e.manager_id === id && e.estado === 'activo').map(e => e.id);
  if (equipo.length) req.set('liderazgo', { skill: 'liderazgo', nivel: datos.reglas.vacante.nivel_liderazgo, funcion: '' });
  const perfil = [...req.values()];

  const cobertura = skill => datos.empleados.filter(e => e.estado === 'activo' && e.id !== id && niv(e.id, skill) >= (req.get(skill)?.nivel || 1)).length;
  const keyPeople = new Map(despues.key_people.map(k => [k.id, k.funciones.map(f => f.funcion)]));
  const candidatos = datos.empleados.filter(e => e.estado === 'activo' && e.id !== id).map(e => {
    const brechas = perfil.filter(p => niv(e.id, p.skill) < p.nivel).map(p => ({
      skill: p.skill, tiene: niv(e.id, p.skill), necesita: p.nivel, funcion: p.funcion,
      formacion: datos.catalogo.filter(c => c.skill === p.skill && c.de === niv(e.id, p.skill) && c.a === p.nivel
        && !(c.tipo === 'mentoring-interno' && cobertura(p.skill) === 0)).map(c => c.id),
    }));
    return { id: e.id, nombre: e.nombre, rol: e.rol, area: e.area, cumple: perfil.length - brechas.length, de: perfil.length, brechas, key_person_en: keyPeople.get(e.id) || [] };
  }).filter(c => c.cumple >= Math.ceil(c.de * datos.reglas.vacante.cumple_minimo))
    .sort((a, b) => b.cumple - a.cumple || a.brechas.reduce((t, x) => t + x.necesita - x.tiene, 0) - b.brechas.reduce((t, x) => t + x.necesita - x.tiene, 0))
    .slice(0, datos.reglas.vacante.candidatos_max);
  return { id, nombre: sale.nombre, rol: sale.rol, area: sale.area, equipo: equipo.length, perfil, candidatos };
}

// Aprobar la opción interna: el candidato asume el puesto (rol, nivel, manager), el equipo pasa a depender de él
// y se abre un plan por cada brecha a un nivel (reglas.yaml: backup_a_distancia) que tenga formación en el catálogo. Devuelve filas nuevas, no escribe nada.
function aplicarMovilidad(empleados, vac, candidatoId, fecha, origen, reglas) {
  const sale = empleados.find(e => e.id === vac.id);
  const nuevos = empleados.map(e =>
    e.id === candidatoId ? { ...e, rol: sale.rol, nivel_puesto: sale.nivel_puesto, manager_id: sale.manager_id, meses_con_manager_actual: '0' }
      : e.manager_id === vac.id && e.estado === 'activo' ? { ...e, manager_id: candidatoId, meses_con_manager_actual: '0' } : e);
  const c = vac.candidatos.find(x => x.id === candidatoId);
  const planes = c.brechas.filter(b => b.necesita - b.tiene === reglas.cobertura.backup_a_distancia && b.formacion.length).map(b => ({
    empleado_id: candidatoId, skill_id: b.skill, nivel_objetivo: b.necesita, funcion_id: b.funcion, formacion_id: b.formacion[0],
    fecha_inicio: fecha, fecha_objetivo: '', estado: 'activo', origen,
  }));
  return { empleados: nuevos, planes };
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

module.exports = { cargar, calcular, simularBaja, simularBackup, comparar, prioridad, madurezIa, vacante, aplicarMovilidad };

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
    console.log(`${icono[f.semaforo]} ${f.prioridad.padEnd(2)} ${f.id.padEnd(7)} ${f.criticidad.padEnd(10)} cob ${f.cobertura}/${f.objetivo}  ${f.nombre}${debil ? '  · ' + debil : ''}${f.respuesta === 'redisenar' ? '  ⟳ rediseñar con IA' : ''}`);
  }
  console.log('\nKEY PEOPLE');
  for (const k of r.key_people) console.log(`- ${k.nombre} (${k.rol}, ${k.area}): ${k.funciones.map(f => `${f.funcion}/${f.skill}`).join(', ')}`);
  console.log('\nCANDIDATOS A BACKUP (rojo/ámbar)');
  for (const f of r.funciones) for (const s of f.skills) if (s.candidatos) {
    const c = s.candidatos.map(c => `${c.nombre}${c.con_interes ? ' ★interés' : ''}${c.es_key_person ? ' ⚠key person' : ''}`).join('; ') || 'ninguno → valorar contratar';
    console.log(`- ${f.id} ${s.skill}: ${c} · formación: ${s.formacion.join(', ') || '—'}`);
  }
  console.log('\nMADUREZ IA POR ÁREA (media 0-4: uso diario · automatización · criterio)');
  for (const m of r.madurez_ia) console.log(`- ${m.segmento} (n=${m.n}): ${m.indice}  [${m['ia-uso-diario']} · ${m['ia-automatizacion']} · ${m['ia-criterio']}]`);
  console.log('\nSEÑALES DE ROTACIÓN (vista solo People)');
  for (const s of r.senales_rotacion) console.log(`- ${s.nombre}: nivel ${s.nivel_senales} (${s.senales.join('; ') || 'ninguna'})`);
  if (cambios.length) {
    console.log('\nCAMBIOS FRENTE AL ESTADO ACTUAL');
    for (const c of cambios) console.log(`- ${c.id} ${c.nombre}: ${c.cambio} ${c.de} → ${c.a} (cobertura ${c.cobertura_antes} → ${c.cobertura_despues})`);
  }
}
