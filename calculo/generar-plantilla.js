// Amplía la plantilla ficticia a ~160 personas sin tocar los casos de la demo.
// - E001-E046 están hechos a mano (los casos de la demo que comprueba verificar-casos.js) y se conservan tal cual.
// - E047 en adelante se generan con una semilla fija: siempre salen las mismas personas.
// - Las skills de IA (ia-*) se generan para toda la plantilla, según la madurez de cada área.
// Las personas generadas tienen topes de nivel en las skills de los casos de la demo, para no cambiar
// quién cubre qué (ver TOPES). Ejecutar y después: npm run verificar && npm run sheets
//
// Uso: npm run plantilla

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ARCH_EMP = path.join(RAIZ, 'datos', 'empleados.csv');
const ARCH_SKI = path.join(RAIZ, 'datos', 'skills-empleados.csv');
const ULTIMO_A_MANO = 46;

// ---------- Azar con semilla (mulberry32) ----------
let semilla = 20261021;
function azar() {
  semilla |= 0; semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const elegir = lista => lista[Math.floor(azar() * lista.length)];

// ---------- Topes: skills de los casos de la demo ----------
// Ninguna persona generada llega al nivel que cambiaría un caso (key person, rojo, ámbar, baja de Elena).
const TOPES = {
  'conciliacion-onchain': 1, 'gestion-claves': 1, 'normativa-pbc': 2, 'sql-analitica': 2,
  'seguridad-aplicaciones': 2, 'respuesta-incidentes': 2, 'contabilidad-cripto': 2, 'gestion-personas': 1,
};
// Tampoco declaran interés en ellas: los candidatos con interés de la demo siguen siendo los mismos.
const SIN_INTERES = new Set(Object.keys(TOPES));

// ---------- Áreas: cuántas personas se añaden y con qué perfiles ----------
// skills: { skill: [mín, máx] } · ia: rangos de ia-uso-diario, ia-automatizacion, ia-criterio (0 = sin la skill)
const AREAS = {
  'Exchange y trading': { manager: 'E002', nuevas: 7, ia: [[1, 3], [0, 2], [1, 3]], perfiles: [
    { rol: 'Trader', nivel: 'intermedio', banda: 'TEC-2', skills: { 'trading-mercados': [2, 3], 'market-making': [1, 2], 'gestion-riesgo-mercado': [1, 2], 'sql-analitica': [1, 2] } },
    { rol: 'Analista de trading', nivel: 'junior', banda: 'TEC-1', skills: { 'trading-mercados': [1, 2], 'sql-analitica': [1, 2] } }] },
  'Custodia': { manager: 'E007', nuevas: 4, ia: [[1, 2], [0, 1], [1, 2]], perfiles: [
    { rol: 'Operador de custodia', nivel: 'intermedio', banda: 'TEC-2', skills: { 'operativa-wallets': [2, 3], 'analisis-blockchain': [1, 2], 'gestion-claves': [1, 1], 'conciliacion-onchain': [1, 1] } },
    { rol: 'Operador de custodia', nivel: 'junior', banda: 'TEC-1', skills: { 'operativa-wallets': [2, 2], 'analisis-blockchain': [1, 1] } }] },
  'Compliance AML/KYC': { manager: 'E011', nuevas: 14, ia: [[1, 2], [0, 1], [1, 2]], perfiles: [
    { rol: 'Analista KYC', nivel: 'intermedio', banda: 'GEN-2', skills: { 'kyc-onboarding': [2, 3], 'normativa-pbc': [2, 2] } },
    { rol: 'Analista KYC', nivel: 'junior', banda: 'GEN-1', skills: { 'kyc-onboarding': [2, 2], 'normativa-pbc': [1, 2] } },
    { rol: 'Analista AML', nivel: 'intermedio', banda: 'GEN-2', skills: { 'monitorizacion-transacciones': [2, 3], 'analisis-blockchain': [2, 2], 'normativa-pbc': [2, 2], 'sql-analitica': [1, 1] } }] },
  'Legal y regulatorio': { manager: 'E017', nuevas: 4, ia: [[1, 2], [0, 1], [1, 2]], perfiles: [
    { rol: 'Abogado', nivel: 'intermedio', banda: 'GEN-3', skills: { 'contratos-mercantil': [2, 3], 'proteccion-datos': [2, 3], 'regulacion-mica': [1, 2] } },
    { rol: 'Paralegal', nivel: 'junior', banda: 'GEN-1', skills: { 'contratos-mercantil': [1, 2], 'proteccion-datos': [1, 2] } }] },
  'Seguridad': { manager: 'E033', nuevas: 5, ia: [[1, 3], [1, 2], [2, 3]], perfiles: [
    { rol: 'Analista SOC', nivel: 'intermedio', banda: 'TEC-2', skills: { 'ciberseguridad-defensiva': [2, 3], 'respuesta-incidentes': [1, 2] } },
    { rol: 'Analista de seguridad', nivel: 'junior', banda: 'TEC-1', skills: { 'ciberseguridad-defensiva': [1, 2], 'seguridad-aplicaciones': [1, 1] } }] },
  'Ingeniería': { manager: 'E025', nuevas: 33, ia: [[2, 4], [1, 3], [2, 3]], perfiles: [
    { rol: 'Ingeniero backend', nivel: 'intermedio', banda: 'TEC-2', skills: { 'desarrollo-backend': [2, 3], 'infraestructura-cloud': [1, 2], 'sql-analitica': [1, 2] } },
    { rol: 'Ingeniero backend senior', nivel: 'senior', banda: 'TEC-3', skills: { 'desarrollo-backend': [3, 3], 'infraestructura-cloud': [2, 2], 'nodos-blockchain': [1, 2] } },
    { rol: 'Ingeniero frontend', nivel: 'intermedio', banda: 'TEC-2', skills: { 'desarrollo-frontend': [2, 3], 'desarrollo-backend': [1, 2] } },
    { rol: 'Ingeniero móvil', nivel: 'intermedio', banda: 'TEC-2', skills: { 'desarrollo-frontend': [2, 3] } },
    { rol: 'Ingeniero de QA', nivel: 'junior', banda: 'TEC-1', skills: { 'desarrollo-backend': [1, 2], 'desarrollo-frontend': [1, 2] } },
    { rol: 'Ingeniero DevOps', nivel: 'intermedio', banda: 'TEC-2', skills: { 'infraestructura-cloud': [2, 3], 'desarrollo-backend': [1, 2] } }] },
  'Producto': { manager: 'E020', nuevas: 8, ia: [[2, 4], [1, 2], [2, 3]], perfiles: [
    { rol: 'Product manager', nivel: 'intermedio', banda: 'TEC-2', skills: { 'gestion-producto': [2, 3], 'diseno-ux': [1, 2], 'sql-analitica': [1, 2] } },
    { rol: 'Diseñador UX/UI', nivel: 'intermedio', banda: 'TEC-2', skills: { 'diseno-ux': [2, 3], 'desarrollo-frontend': [1, 2] } },
    { rol: 'Analista de producto', nivel: 'junior', banda: 'TEC-1', skills: { 'sql-analitica': [1, 2], 'gestion-producto': [1, 2] } }] },
  'Atención al cliente (CX)': { manager: 'E036', nuevas: 26, ia: [[1, 2], [0, 1], [1, 1]], perfiles: [
    { rol: 'Agente de soporte', nivel: 'junior', banda: 'GEN-1', skills: { 'atencion-cliente': [2, 3] } },
    { rol: 'Agente de soporte', nivel: 'intermedio', banda: 'GEN-1', skills: { 'atencion-cliente': [2, 3], 'atencion-cliente-tecnica': [1, 2] } },
    { rol: 'Agente de soporte nivel 2', nivel: 'intermedio', banda: 'GEN-2', skills: { 'atencion-cliente': [3, 3], 'atencion-cliente-tecnica': [2, 2], 'analisis-blockchain': [1, 1] } }] },
  'Marketing': { manager: 'E044', nuevas: 8, ia: [[2, 3], [1, 2], [1, 2]], perfiles: [
    { rol: 'Especialista en marketing digital', nivel: 'intermedio', banda: 'GEN-2', skills: { 'marketing-digital': [2, 3], 'comunicacion-regulada': [1, 2] } },
    { rol: 'Content manager', nivel: 'junior', banda: 'GEN-1', skills: { 'marketing-digital': [1, 2], 'comunicacion-regulada': [1, 2] } }] },
  'Finanzas': { manager: 'E041', nuevas: 5, ia: [[1, 2], [0, 1], [1, 2]], perfiles: [
    { rol: 'Analista financiero', nivel: 'intermedio', banda: 'GEN-2', skills: { 'reporting-financiero': [2, 3], 'tesoreria': [1, 2], 'contabilidad-cripto': [1, 2] } },
    { rol: 'Contable', nivel: 'junior', banda: 'GEN-1', skills: { 'reporting-financiero': [1, 2], 'contabilidad-cripto': [1, 1] } }] },
};
// Madurez IA de las personas hechas a mano que no están en AREAS como receptoras
const IA_OTRAS = { 'Dirección': [[3, 3], [1, 1], [2, 2]], 'People': [[2, 2], [1, 1], [2, 2]] };
const SKILLS_IA = ['ia-uso-diario', 'ia-automatizacion', 'ia-criterio'];
const SOFT = ['comunicacion', 'resolucion-problemas'];

const NOMBRES = {
  H: ['Alejandro', 'Alberto', 'Antonio', 'Bruno', 'César', 'David', 'Eduardo', 'Enrique', 'Ernesto', 'Felipe', 'Francisco', 'Gabriel', 'Guillermo', 'Ignacio', 'Jaime', 'Joaquín', 'José', 'Juan', 'Julián', 'Lorenzo', 'Manuel', 'Martín', 'Miguel', 'Nicolás', 'Raúl', 'Roberto', 'Rodrigo', 'Samuel', 'Santiago', 'Sergio', 'Teodoro', 'Vicente'],
  M: ['Adriana', 'Alicia', 'Amparo', 'Andrea', 'Begoña', 'Blanca', 'Carla', 'Celia', 'Claudia', 'Daniela', 'Elisa', 'Esther', 'Gloria', 'Helena', 'Inmaculada', 'Isabel', 'Julia', 'Laia', 'Lorena', 'Mercedes', 'Miriam', 'Mónica', 'Nuria', 'Olga', 'Pilar', 'Rosa', 'Sofía', 'Susana', 'Teresa', 'Verónica', 'Yolanda', 'Zoe'],
};
const APELLIDOS = ['Aguado', 'Alonso', 'Arroyo', 'Bermejo', 'Bravo', 'Caballero', 'Calvo', 'Campos', 'Carrasco', 'Castro', 'Cuesta', 'Duran', 'Escudero', 'Esteban', 'Fernández', 'Flores', 'Gallardo', 'García', 'Gil', 'Giménez', 'González', 'Guerrero', 'Hernández', 'Ibáñez', 'Jiménez', 'León', 'López', 'Lozano', 'Márquez', 'Martín', 'Medina', 'Méndez', 'Mora', 'Moreno', 'Muñoz', 'Navarro', 'Ortiz', 'Pastor', 'Pérez', 'Prieto', 'Ramírez', 'Reyes', 'Rivas', 'Rodríguez', 'Romero', 'Rubio', 'Ruiz', 'Sánchez', 'Santos', 'Serrano', 'Soto', 'Suárez', 'Torres', 'Vázquez', 'Vega', 'Velasco'];
// Rol en femenino cuando corresponde, como en los datos hechos a mano
const rolSegun = (rol, genero) => (genero === 'M'
  ? rol.replace(/^Ingeniero/, 'Ingeniera').replace(/^Operador /, 'Operadora ').replace(/^Abogado/, 'Abogada').replace(/^Diseñador /, 'Diseñadora ')
  : rol);
const sinTildes = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------- CSV ----------
const esc = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function leer(archivo) {
  const [cab, ...filas] = fs.readFileSync(archivo, 'utf8').replace(/\r/g, '').trim().split('\n');
  const cols = cab.split(',');
  return { cols, filas: filas.map(f => Object.fromEntries(f.split(',').map((v, i) => [cols[i], v]))) };
}
const escribir = (archivo, cols, filas) =>
  fs.writeFileSync(archivo, [cols.join(','), ...filas.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n');

// ---------- Generación ----------
const num = id => +id.slice(1);
const emp = leer(ARCH_EMP);
const ski = leer(ARCH_SKI);
const aMano = emp.filas.filter(e => num(e.id) <= ULTIMO_A_MANO);
const skillsAMano = ski.filas.filter(s => num(s.empleado_id) <= ULTIMO_A_MANO && !SKILLS_IA.includes(s.skill_id));
const bandas = Object.fromEntries(leer(path.join(RAIZ, 'datos', 'bandas-salariales.csv')).filas.map(b => [b.banda_id, b]));

const usados = new Set(aMano.map(e => e.nombre));
const correos = new Set(aMano.map(e => e.email));
const nuevas = [];
const skillsNuevas = [];
const fecha = () => `2026-${String(entre(3, 7)).padStart(2, '0')}-${String(entre(1, 28)).padStart(2, '0')}`;

let siguiente = ULTIMO_A_MANO + 1;
for (const [area, def] of Object.entries(AREAS)) {
  for (let i = 0; i < def.nuevas; i++) {
    const genero = azar() < 0.5 ? 'H' : 'M';
    let nombre;
    do nombre = `${elegir(NOMBRES[genero])} ${elegir(APELLIDOS)} ${elegir(APELLIDOS)}`; while (usados.has(nombre));
    usados.add(nombre);
    const [n1, a1] = nombre.split(' ').map(sinTildes);
    let email = `${n1}.${a1}@acme.example`;
    for (let k = 2; correos.has(email); k++) email = `${n1}.${a1}${k}@acme.example`;
    correos.add(email);

    const p = def.perfiles[i % def.perfiles.length];
    const id = `E${String(siguiente++).padStart(3, '0')}`;
    const fechaVal = fecha();
    const niveles = {};
    for (const [skill, [a, b]] of Object.entries(p.skills)) niveles[skill] = Math.min(entre(a, b), TOPES[skill] || 4);
    niveles[elegir(SOFT)] = entre(2, 3);
    for (const [skill, nivel] of Object.entries(niveles)) {
      // El declarado a veces es 1 por encima del validado (como en los datos a mano)
      const declarado = Math.min(4, nivel + (azar() < 0.2 ? 1 : 0));
      skillsNuevas.push({ empleado_id: id, skill_id: skill, nivel_declarado: declarado, nivel_validado: nivel, validado_por: def.manager, fecha: fechaVal });
    }
    const posibles = [...Object.keys(p.skills).filter(s => !SIN_INTERES.has(s) && niveles[s] < 3), 'ia-automatizacion'];
    const antiguedad = p.nivel === 'junior' ? entre(2, 24) : entre(10, 60);
    const banda = bandas[p.banda];
    nuevas.push({
      id, nombre, email, genero, area, rol: rolSegun(p.rol, genero), nivel_puesto: p.nivel, manager_id: def.manager,
      antiguedad_meses: antiguedad, ultima_evaluacion: elegir([3, 3, 3, 4, 4, 2, 5]),
      skills_interes: azar() < 0.4 ? elegir(posibles) : '', banda_id: p.banda,
      salario_ficticio: Math.round((+banda.medio * (0.92 + azar() * 0.16)) / 500) * 500,
      meses_desde_ultima_revision: Math.min(antiguedad, entre(2, 14)),
      meses_con_manager_actual: Math.min(antiguedad, entre(6, 40)), estado: 'activo',
    });
  }
}

// Skills de IA para toda la plantilla
const skillsIa = [];
for (const e of [...aMano, ...nuevas]) {
  const rangos = (AREAS[e.area] || {}).ia || IA_OTRAS[e.area];
  const validador = e.manager_id || 'consejo';
  SKILLS_IA.forEach((skill, i) => {
    const nivel = entre(...rangos[i]);
    if (nivel > 0) skillsIa.push({ empleado_id: e.id, skill_id: skill, nivel_declarado: Math.min(4, nivel + (azar() < 0.3 ? 1 : 0)), nivel_validado: nivel, validado_por: validador, fecha: '2026-09-15' });
  });
}

const todas = [...aMano, ...nuevas];
escribir(ARCH_EMP, emp.cols, todas);
escribir(ARCH_SKI, ski.cols, [...skillsAMano, ...skillsNuevas, ...skillsIa]);
const porArea = todas.reduce((m, e) => ((m[e.area] = (m[e.area] || 0) + 1), m), {});
console.log(`Plantilla: ${todas.length} personas (${aMano.length} a mano + ${nuevas.length} generadas)`);
console.log(Object.entries(porArea).map(([a, n]) => `  ${a}: ${n}`).join('\n'));
console.log(`Skills: ${skillsAMano.length + skillsNuevas.length} de puesto + ${skillsIa.length} de IA`);
