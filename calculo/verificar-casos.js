// Comprueba que los datos ficticios producen los casos obligatorios de la demo (los que cuenta README.md, parte 2).
// Ejecutar antes de cada ensayo: npm run verificar
const { cargar, calcular, simularBaja, simularBackup, comparar, vacante, aplicarMovilidad } = require('./cobertura');

const base = cargar();
const hoy = calcular(base);
const fn = (r, id) => r.funciones.find(f => f.id === id);
const kp = (r, id) => r.key_people.find(k => k.id === id);
const sen = (r, id) => r.senales_rotacion.find(s => s.id === id);
let fallos = 0;
function caso(nombre, ok) { console.log(`${ok ? '✅' : '❌'} ${nombre}`); if (!ok) fallos++; }

caso('Función crítica en rojo con key person evidente: CUS-02, Elena (responsable de custodia)',
  fn(hoy, 'CUS-02').semaforo === 'rojo' && fn(hoy, 'CUS-02').criticidad === 'critica' && !!kp(hoy, 'E007'));

caso('Función en ámbar con backup en desarrollo: CMP-03 (Diego, plan PB-001)',
  fn(hoy, 'CMP-03').semaforo === 'ambar' && fn(hoy, 'CMP-03').skills[0].backups_en_desarrollo.includes('E012'));

caso('Key person oculta: Lucía (analista de datos de Producto) sostiene el reporting AML de Compliance',
  !!kp(hoy, 'E022') && kp(hoy, 'E022').oculta && kp(hoy, 'E022').area !== 'Compliance AML/KYC');

const e = sen(hoy, 'E007');
caso('Caso de retención: key person en rojo con compa-ratio < 0,9 y > 18 meses sin revisión (Elena)',
  e.compa_ratio < 0.9 && e.senales.some(s => s.startsWith('S2')) && e.nivel_senales === 'alto');

const cand = fn(hoy, 'CUS-02').skills[0].candidatos;
caso('Candidata a upskilling a un nivel con interés: Javier para conciliación on-chain',
  cand[0].id === 'E009' && cand[0].con_interes);

const baja = calcular(simularBaja(base, 'E007'));
const cambios = comparar(hoy, baja);
caso('Escenario baja de Elena: CUS-01 pasa de verde a rojo y aparece Marcos como key person',
  fn(baja, 'CUS-01').semaforo === 'rojo' && !!kp(baja, 'E008') && cambios.some(c => c.id === 'CUS-01' && c.cambio === 'empeora'));

caso('Escenario baja: en CUS-01 el primer candidato es Javier (con interés)',
  fn(baja, 'CUS-01').skills[0].candidatos[0].id === 'E009');

const ciclo = calcular(simularBackup(simularBaja(base, 'E007'), 'E009', 'gestion-claves', 'CUS-01'));
caso('Cierre del ciclo: aprobar el backup de Javier pasa CUS-01 de rojo a ámbar',
  fn(ciclo, 'CUS-01').semaforo === 'ambar');

// Opcional: Javier completa FOR-01 y su manager valida nivel 3 en gestión de claves
const conSkill = { ...simularBaja(base, 'E007'), skills: base.skills.map(s => (s.empleado_id === 'E009' && s.skill_id === 'gestion-claves' ? { ...s, nivel_validado: '3', validado_por: 'E008' } : s)) };
const verde = calcular(conSkill);
caso('Opcional nueva skill: Javier validado en nivel 3 pasa CUS-01 de ámbar a verde',
  fn(verde, 'CUS-01').semaforo === 'verde' && comparar(ciclo, verde).some(c => c.id === 'CUS-01' && c.cambio === 'mejora'));

caso('Sin falsas alertas: tras la baja, ninguna función que sigue en verde aparece como "empeora"',
  cambios.every(c => c.a !== 'verde'));

// Vacante de Elena: buscar fuera o mover a Marcos (movilidad interna, D-15)
const vac = vacante(base, 'E007');
const marcos = vac.candidatos[0];
caso('Vacante de Elena: Marcos es el primer candidato interno, le falta conciliación (FOR-04, sin el mentoring de Elena) y es key person de CUS-01',
  marcos?.id === 'E008' && marcos.brechas.some(b => b.skill === 'conciliacion-onchain' && b.formacion.join() === 'FOR-04') && marcos.key_person_en.includes('CUS-01'));

const movido = aplicarMovilidad(simularBaja(base, 'E007').empleados, vac, 'E008', '2026-10-21', 'TEST', base.reglas);
const tras = { ...simularBaja(base, 'E007'), empleados: movido.empleados, planes: [...base.planes, ...movido.planes] };
caso('Opción B aprobada: Marcos pasa a responsable de custodia, el equipo depende de él y tiene plan en conciliación; CUS-02 sigue en rojo (cobertura 0)',
  movido.empleados.find(x => x.id === 'E008').rol === 'Responsable de custodia' && movido.empleados.find(x => x.id === 'E009').manager_id === 'E008'
  && movido.planes.some(p => p.skill_id === 'conciliacion-onchain') && fn(calcular(tras), 'CUS-02').semaforo === 'rojo');

caso('Opción B + backup de Javier: CUS-01 pasa de rojo a ámbar',
  fn(calcular(simularBackup(tras, 'E009', 'gestion-claves', 'CUS-01')), 'CUS-01').semaforo === 'ambar');

// Escala y lente AI first (D-13, D-14)
const activos = base.empleados.filter(x => x.estado === 'activo').length;
caso(`Plantilla a escala de la compañía: ${activos} personas activas (~160)`, activos >= 150 && activos <= 170);

caso('AI first: CMP-04 en rojo con impacto IA alto → respuesta "rediseñar"; CUS-02 (impacto medio) → "cubrir"',
  fn(hoy, 'CMP-04').semaforo === 'rojo' && fn(hoy, 'CMP-04').respuesta === 'redisenar' && fn(hoy, 'CUS-02').respuesta === 'cubrir');

const bajaLucia = calcular(simularBaja(base, 'E022'));
caso('Escenario baja de Lucía: CMP-04 empeora (1 → 0) y Marta (con interés) es la primera candidata a recualificar',
  comparar(hoy, bajaLucia).some(c => c.id === 'CMP-04' && c.cambio === 'empeora') && fn(bajaLucia, 'CMP-04').skills[0].candidatos[0].id === 'E013');

// Coherencia AI first + vacante: si el puesto solo sostiene funciones a rediseñar, no se propone cubrirlo tal cual
const { contexto, propuestaPorReglas } = require('./propuesta');
const propLucia = propuestaPorReglas(contexto(bajaLucia, comparar(hoy, bajaLucia), 'Baja de Lucía', vacante(base, 'E022'), simularBaja(base, 'E022')));
caso('Baja de Lucía: se propone rediseñar CMP-04 y no buscar fuera a alguien para hacer el informe como ahora',
  propLucia.acciones.some(a => a.tipo === 'rediseno') && !propLucia.acciones.some(a => a.grupo));

const mad = Object.fromEntries(hoy.madurez_ia.map(m => [m.segmento, m]));
caso('Madurez IA por área: Ingeniería por encima de CX y ningún grupo publicado con n < 5',
  mad['Ingeniería'].indice > mad['Atención al cliente (CX)'].indice && hoy.madurez_ia.every(m => m.n >= 5));

// Las reglas son datos (definiciones/reglas.yaml, D-23): cambiarlas cambia el resultado sin tocar el motor
const base0 = cargar();
const conReglas = cambio => { const r = JSON.parse(JSON.stringify(base0.reglas)); cambio(r); return calcular({ ...base0, reglas: r }); };
const fnDe = (r, id) => r.funciones.find(f => f.id === id);
const sinAmbarPorBackup = conReglas(r => { r.semaforo = r.semaforo.filter(x => !(x.si && x.si.con_backup)); });
const prioridadMasEstricta = conReglas(r => { r.prioridad.niveles.find(n => n.prioridad === 'P1').puntos_minimos = 10; });
caso('reglas.yaml manda: sin la regla "1 con backup → ámbar", CMP-03 pasa a rojo; con P1 a 10 puntos, CUS-02 deja de ser P1',
  fnDe(hoy, 'CMP-03').semaforo === 'ambar' && fnDe(sinAmbarPorBackup, 'CMP-03').semaforo === 'rojo'
  && fnDe(hoy, 'CUS-02').prioridad === 'P1' && fnDe(prioridadMasEstricta, 'CUS-02').prioridad !== 'P1');

console.log(fallos ? `\n${fallos} caso(s) fallan` : '\nTodos los casos de la demo se cumplen');
process.exit(fallos ? 1 : 0);
