// Genera las hojas del Google Sheet en CSV (salidas/sheets/), listas para importar.
// Uso: npm run sheets   (opcional: --fecha 2026-09-30 para la foto del histórico)
const fs = require('fs');
const path = require('path');
const { cargar, calcular } = require('./cobertura');

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
escribir('funciones', ['funcion_id', 'nombre', 'area', 'criticidad', 'cobertura_objetivo', 'skill_id', 'nivel_minimo'],
  datos.funciones.funciones.flatMap(f => f.skills_requeridas.map(s => [f.id, f.nombre, f.area, f.criticidad, f.cobertura_objetivo || def, s.skill, s.nivel])));

escribir('catalogo-formacion', ['formacion_id', 'skill_id', 'de_nivel', 'a_nivel', 'tipo', 'nombre', 'semanas', 'coste_eur'],
  datos.catalogo.map(c => [c.id, c.skill, c.de, c.a, c.tipo, c.nombre, c.semanas, c.coste_eur]));

// cobertura: una fila por función (la vista del mapa de calor)
const icono = { verde: '🟢', ambar: '🟡', rojo: '🔴' };
escribir('cobertura', ['funcion_id', 'area', 'nombre', 'criticidad', 'semaforo', 'icono', 'prioridad', 'cobertura', 'objetivo', 'skill_mas_debil', 'cubren', 'backup_en_desarrollo', 'candidatos_con_interes'],
  r.funciones.map(f => {
    const s = f.skills.reduce((a, b) => (b.cobertura < a.cobertura ? b : a));
    const debiles = f.skills.filter(x => x.semaforo !== 'verde');
    return [f.id, f.area, f.nombre, f.criticidad, f.semaforo, icono[f.semaforo], f.prioridad, f.cobertura, f.objetivo, s.skill,
      s.personas.map(nombre).join('; '),
      debiles.flatMap(x => x.backups_en_desarrollo).map(nombre).join('; '),
      debiles.flatMap(x => (x.candidatos || []).filter(c => c.con_interes).map(c => c.nombre)).join('; ')];
  }));

escribir('key-people', ['empleado_id', 'nombre', 'area', 'rol', 'oculta', 'funciones', 'skills'],
  r.key_people.map(k => [k.id, k.nombre, k.area, k.rol, k.oculta ? 'si' : 'no',
    k.funciones.map(f => f.funcion).join('; '), k.funciones.map(f => f.skill).join('; ')]));

// Señales: hoja restringida a People (no compartir con managers)
escribir('senales-rotacion-PEOPLE', ['empleado_id', 'nombre', 'compa_ratio', 'probabilidad', 'senales'],
  r.senales_rotacion.map(s => [s.id, s.nombre, s.compa_ratio, s.probabilidad, s.senales.join('; ')]));

escribir('historico-semaforo', ['fecha', 'funcion_id', 'semaforo', 'cobertura', 'prioridad'],
  r.funciones.map(f => [fecha, f.id, f.semaforo, f.cobertura, f.prioridad]));

escribir('alertas', ['alerta_id', 'fecha', 'evento', 'funcion_id', 'prioridad', 'cambio', 'tipo_accion', 'accion', 'empleado_id', 'skill_id', 'formacion_id', 'por_que', 'riesgo_si_no', 'decision', 'decidido_por', 'fecha_decision'], []);
