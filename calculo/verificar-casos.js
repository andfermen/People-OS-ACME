// Comprueba que los datos ficticios producen los casos obligatorios de la demo (CLAUDE.md §6).
// Ejecutar antes de cada ensayo: npm run verificar
const { cargar, calcular, simularBaja, simularBackup, comparar } = require('./cobertura');

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
  e.compa_ratio < 0.9 && e.senales.some(s => s.startsWith('S2')) && e.probabilidad === 'alta');

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

// Escala y lente AI first (CLAUDE.md §6)
const activos = base.empleados.filter(x => x.estado === 'activo').length;
caso(`Plantilla a escala de la compañía: ${activos} personas activas (~160)`, activos >= 150 && activos <= 170);

caso('AI first: CMP-04 en rojo con impacto IA alto → respuesta "rediseñar"; CUS-02 (impacto medio) → "cubrir"',
  fn(hoy, 'CMP-04').semaforo === 'rojo' && fn(hoy, 'CMP-04').respuesta === 'redisenar' && fn(hoy, 'CUS-02').respuesta === 'cubrir');

const bajaLucia = calcular(simularBaja(base, 'E022'));
caso('Escenario baja de Lucía: CMP-04 empeora (1 → 0) y Marta (con interés) es la primera candidata a recualificar',
  comparar(hoy, bajaLucia).some(c => c.id === 'CMP-04' && c.cambio === 'empeora') && fn(bajaLucia, 'CMP-04').skills[0].candidatos[0].id === 'E013');

const mad = Object.fromEntries(hoy.madurez_ia.map(m => [m.segmento, m]));
caso('Madurez IA por área: Ingeniería por encima de CX y ningún grupo publicado con n < 5',
  mad['Ingeniería'].indice > mad['Atención al cliente (CX)'].indice && hoy.madurez_ia.every(m => m.n >= 5));

console.log(fallos ? `\n${fallos} caso(s) fallan` : '\nTodos los casos de la demo se cumplen');
process.exit(fallos ? 1 : 0);
