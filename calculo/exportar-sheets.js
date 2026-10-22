// Genera las hojas del Google Sheet en CSV (salidas/sheets/), listas para importar.
// Uso: npm run sheets   (opcional: --fecha 2026-09-30 para la foto del histórico)
const fs = require('fs');
const path = require('path');
const { cargar, calcular } = require('./cobertura');
const { COLS, filasCobertura, filasKeyPeople, filasHistorico } = require('./hojas');

const RAIZ = path.join(__dirname, '..');
const OUT = path.join(RAIZ, 'salidas', 'sheets');
const args = process.argv.slice(2);
const fecha = args.includes('--fecha') ? args[args.indexOf('--fecha') + 1] : new Date().toISOString().slice(0, 10);

const csv = v => (v == null ? '' : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
function escribir(nombre, cabecera, filas) {
  fs.writeFileSync(path.join(OUT, `${nombre}.csv`), [cabecera, ...filas].map(f => f.map(csv).join(',')).join('\n') + '\n');
  console.log(`salidas/sheets/${nombre}.csv (${filas.length} filas)`);
}

fs.mkdirSync(OUT, { recursive: true });
const datos = cargar();
const r = calcular(datos);
const nombre = id => datos.empleados.find(e => e.id === id)?.nombre || id;
const def = datos.funciones.defaults.cobertura_objetivo;

// Datos tal cual (copiados para importar todo desde una carpeta)
for (const f of ['empleados', 'skills-empleados', 'bandas-salariales', 'planes-backup', 'encuesta-clima-agregada'])
  fs.copyFileSync(path.join(RAIZ, 'datos', `${f}.csv`), path.join(OUT, `${f}.csv`));

// funciones: una fila por función y skill requerida (formato tabla, para fórmulas)
escribir('funciones', ['funcion_id', 'nombre', 'area', 'criticidad', 'cobertura_objetivo', 'skill_id', 'nivel_minimo', 'impacto_ia'],
  datos.funciones.funciones.flatMap(f => f.skills_requeridas.map(s => [f.id, f.nombre, f.area, f.criticidad, f.cobertura_objetivo || def, s.skill, s.nivel, f.impacto_ia])));

escribir('catalogo-formacion', ['formacion_id', 'skill_id', 'de_nivel', 'a_nivel', 'tipo', 'nombre', 'semanas', 'coste_eur'],
  datos.catalogo.map(c => [c.id, c.skill, c.de, c.a, c.tipo, c.nombre, c.semanas, c.coste_eur]));

// cobertura: una fila por función (la vista del mapa de calor).
// impacto_ia y respuesta van al final: el formato condicional del mapa sigue leyendo el semáforo en la columna E
escribir('cobertura', COLS.cobertura, filasCobertura(r, nombre));

// Madurez IA por área (plan AI first): agregada, sin personas
escribir('madurez-ia', ['segmento', 'n', 'ia_uso_diario', 'ia_automatizacion', 'ia_criterio', 'indice'],
  r.madurez_ia.map(m => [m.segmento, m.n, m['ia-uso-diario'], m['ia-automatizacion'], m['ia-criterio'], m.indice]));

escribir('key-people', COLS.keyPeople, filasKeyPeople(r));

// Señales: hoja restringida a People (no compartir con managers)
escribir('senales-rotacion-PEOPLE', ['empleado_id', 'nombre', 'compa_ratio', 'probabilidad', 'senales'],
  r.senales_rotacion.map(s => [s.id, s.nombre, s.compa_ratio, s.probabilidad, s.senales.join('; ')]));

// historico-semaforo: una foto por recálculo; evento distingue varias fotos del mismo día
escribir('historico-semaforo', COLS.historico, filasHistorico(r, fecha, 'inicial'));

escribir('alertas', COLS.alertas, []);
escribir('bandeja', COLS.bandeja, []);
