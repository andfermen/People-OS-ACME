// Cifras de referencia que citan el guion, el plan AI first y la empresa, calculadas con el motor.
// Las usa el agente auditor-demo para comparar el texto de los documentos con los datos reales.
// Uso: npm run cifras
const { cargar, calcular, simularBaja, comparar, vacante } = require('./cobertura');
const { contexto } = require('./propuesta');

const base = cargar();
const hoy = calcular(base);
const baja = calcular(simularBaja(base, 'E007'));
const fn = (r, id) => r.funciones.find(f => f.id === id);
const cuenta = r => r.funciones.reduce((m, f) => ((m[f.semaforo] = (m[f.semaforo] || 0) + 1), m), {});
const n1 = v => String(v).replace('.', ',');
const linea = (clave, valor) => console.log(`${clave}: ${valor}`);

console.log('# Plantilla y mapa inicial');
linea('personas', base.empleados.length);
linea('funciones', hoy.funciones.length);
const c = cuenta(hoy);
linea('mapa inicial (rojo · ámbar · verde)', `${c.rojo} · ${c.ambar} · ${c.verde}`);
linea('key people', hoy.key_people.map(k => `${k.nombre}${k.oculta ? ' (oculta)' : ''}`).join('; '));
linea('personas por área', Object.entries(base.empleados.reduce((m, e) => ((m[e.area] = (m[e.area] || 0) + 1), m), {})).map(([a, n]) => `${a} ${n}`).join('; '));

console.log('\n# Baja de Elena (E007)');
for (const x of comparar(hoy, baja)) linea(`cambio ${x.id}`, `${x.de} → ${x.a} (cobertura ${x.cobertura_antes} → ${x.cobertura_despues})`);
linea('CUS-03 cobertura antes → después', `${fn(hoy, 'CUS-03').cobertura} → ${fn(baja, 'CUS-03').cobertura} (${fn(baja, 'CUS-03').semaforo})`);
const cb = cuenta(baja);
linea('mapa tras la baja (rojo · ámbar · verde)', `${cb.rojo} · ${cb.ambar} · ${cb.verde}`);
const vac = vacante(base, 'E007');
contexto(baja, comparar(hoy, baja), 'baja', vac, simularBaja(base, 'E007'));
const m = vac.candidatos[0];
linea('vacante: equipo', vac.equipo);
linea('vacante: perfil', vac.perfil.map(p => `${p.skill} ${p.nivel}`).join(', '));
linea('opción B: candidato', `${m.nombre} cumple ${m.cumple} de ${m.de}; brechas: ${m.brechas.map(b => `${b.skill} ${b.tiene}→${b.necesita} [${b.formacion.join(',') || 'sin formación'}]`).join('; ')}; key person en ${m.key_person_en.join(', ')}`);
linea('opción B: compa-ratio en la banda del puesto (solo People)', `${n1(m.compa_en_puesto)} (${m.banda_puesto})`);
const elena = hoy.senales_rotacion.find(s => s.id === 'E007');
linea('señales de Elena', `${elena.probabilidad} · compa ${n1(elena.compa_ratio)} · ${elena.senales.join('; ')}`);
const marcos = baja.senales_rotacion.find(s => s.id === 'E008');
linea('señales de Marcos tras la baja', `${marcos.probabilidad} · ${marcos.senales.join('; ')}`);

console.log('\n# Encuesta');
const enc = (t, s) => base.encuesta.find(r => r.segmento_tipo === t && r.segmento === s);
linea('engagement compañía', n1(enc('compania', 'Acme').engagement));
linea('engagement Custodia (n)', `${n1(enc('area', 'Custodia').engagement)} (n=${enc('area', 'Custodia').n})`);
linea('carga sostenible key people sí / no (n)', `${n1(enc('key_person', 'si').carga_sostenible)} (n=${enc('key_person', 'si').n}) / ${n1(enc('key_person', 'no').carga_sostenible)}`);

console.log('\n# AI first');
linea('madurez IA por área', hoy.madurez_ia.map(x => `${x.segmento} ${n1(x.indice)} (n=${x.n})`).join('; '));
const ia = base.skills.filter(s => s.skill_id.startsWith('ia-') && s.nivel_validado);
const cuantos = (skill, min) => new Set(ia.filter(s => s.skill_id === skill && +s.nivel_validado >= min).map(s => s.empleado_id));
linea('uso diario de IA (nivel ≥ 2)', `${cuantos('ia-uso-diario', 2).size} de ${base.empleados.length}`);
const auto = cuantos('ia-automatizacion', 3);
linea('automatizan (nivel ≥ 3)', `${auto.size} · por área: ${[...new Set(base.empleados.filter(e => auto.has(e.id)).map(e => e.area))].join(', ')}`);
linea('interés declarado en ia-automatizacion', base.empleados.filter(e => (e.skills_interes || '').includes('ia-automatizacion')).length);
linea('funciones por impacto IA', Object.entries(hoy.funciones.reduce((m2, f) => ((m2[f.impacto_ia] = (m2[f.impacto_ia] || 0) + 1), m2), {})).map(([k, v]) => `${k} ${v}`).join(' · '));
linea('impacto alto', hoy.funciones.filter(f => f.impacto_ia === 'alto').map(f => `${f.id} (${f.semaforo}, ${f.respuesta})`).join('; '));
const lucia = calcular(simularBaja(base, 'E022'));
linea('baja de Lucía: CMP-04', `${fn(hoy, 'CMP-04').cobertura} → ${fn(lucia, 'CMP-04').cobertura}, respuesta ${fn(lucia, 'CMP-04').respuesta}; primera candidata ${fn(lucia, 'CMP-04').skills[0].candidatos[0].nombre}`);
