// Utilidades de los nodos de código de n8n: leer las hojas (nodos nativos de Google Sheets) y preparar las filas a escribir.
// exportar-n8n.js las concatena con el motor (cobertura.js), la propuesta (propuesta.js) y las filas (hojas.js).

// Nodo de lectura de cada hoja. bandas y encuesta no cambian en la demo: vienen de definiciones.json (repo).
const LECTURAS = { empleados: 'Leer empleados', 'skills-empleados': 'Leer skills', 'planes-backup': 'Leer planes', alertas: 'Leer alertas', cobertura: 'Leer cobertura' };
// Cómo se escribe cada hoja con el nodo nativo: actualizar por clave, añadir o actualizar por clave, añadir, o vaciar y volver a escribir
const ESCRITURAS = {
  empleados: { op: 'update', clave: 'id' },
  'skills-empleados': { op: 'update', clave: 'row_number' },
  'skills-empleados (nueva)': { op: 'append', hoja: 'skills-empleados' }, // una skill que la persona no tenía
  'planes-backup': { op: 'appendOrUpdate', clave: 'plan_id' },
  alertas: { op: 'appendOrUpdate', clave: 'alerta_id' },
  cobertura: { op: 'appendOrUpdate', clave: 'funcion_id' },
  'historico-semaforo': { op: 'append' },
  'key-people': { op: 'reemplazar' },
};
const hoyISO = () => new Date().toISOString().slice(0, 10);

// Salida de los nodos de lectura → { hoja: { filas: [{ ...columnas, _fila }] } }. _fila es la fila real (row_number).
function tablas() {
  const t = {};
  for (const [hoja, nodo] of Object.entries(LECTURAS)) {
    let items = [];
    try { items = $(nodo).all().map(i => i.json); } catch (err) { /* este workflow no lee esa hoja */ }
    t[hoja] = { filas: items.filter(o => Object.keys(o).some(k => k !== 'row_number' && o[k] !== '' && o[k] != null)).map(o => {
      const f = { _fila: o.row_number };
      for (const [k, v] of Object.entries(o)) if (k !== 'row_number') f[k] = v == null ? '' : String(v);
      return f;
    }) };
  }
  return t;
}

function datosDesde(T, defs) {
  return {
    funciones: defs.funciones, taxonomia: defs.taxonomia, areas: defs.areas, catalogo: defs.catalogo,
    bandas: defs.bandas, encuesta: defs.encuesta,
    empleados: T['empleados'].filas, skills: T['skills-empleados'].filas, planes: T['planes-backup'].filas,
  };
}

// Foto anterior = lo que muestra ahora la hoja cobertura (siempre refleja el último recálculo)
function fotoActual(T) {
  return { funciones: T['cobertura'].filas.map(x => ({ id: x.funcion_id, semaforo: x.semaforo, cobertura: +x.cobertura, nombre: x.nombre })) };
}

// ---------- Filas a escribir: cada una lleva _hoja para que el desvío la mande a su nodo ----------
const valor = v => (v == null ? '' : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !/^0\d/.test(v) ? +v : v);
const fila = (hoja, obj, columnas = Object.keys(obj).filter(k => !k.startsWith('_'))) =>
  ({ _hoja: hoja, ...Object.fromEntries(columnas.map(c => [c, valor(obj[c])])) });
const filasDe = (hoja, cols, arrays) => arrays.map(a => fila(hoja, Object.fromEntries(cols.map((c, i) => [c, a[i]]))));

// Mapa tras un recálculo: cobertura (por funcion_id), key-people (se vacía y se reescribe) y foto en el histórico
function filasMapa(r, datos, evento) {
  const nombre = id => datos.empleados.find(e => e.id === id)?.nombre || id;
  return [
    ...filasDe('cobertura', COLS.cobertura, filasCobertura(r, nombre)),
    ...filasDe('key-people', COLS.keyPeople, filasKeyPeople(r)),
    ...filasDe('historico-semaforo', COLS.historico, filasHistorico(r, hoyISO(), evento)),
  ];
}

// ---------- Email (HTML sencillo, se ve bien en Gmail) ----------
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = cuerpo => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:680px">${cuerpo}<p style="color:#888;font-size:12px;margin-top:24px">Acme People OS · datos ficticios · generado automáticamente</p></div>`;
function listaCambios(cambios) {
  return `<ul>${cambios.map(c => `<li><b>${esc(c.id)}</b> ${esc(c.nombre)}: ${ICONO[c.de]} → ${ICONO[c.a]} (cobertura ${c.cobertura_antes} → ${c.cobertura_despues})</li>`).join('')}</ul>`;
}

module.exports = { LECTURAS, ESCRITURAS };
