// W0 · nodo "Reiniciar": deja el Sheet como al principio de la demo para poder ensayar las veces que haga falta.
// Restaura empleados y planes-backup desde los CSV del repo, vacía alertas y deja el mapa y el histórico en la foto inicial.
const cfg = $('Configuración').first().json;
const T = tablas($('Leer Sheet').first().json);
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);

function csv(texto) {
  const filas = []; let fila = [], celda = '', q = false;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i];
    if (q) { if (ch === '"') { if (texto[i + 1] === '"') { celda += '"'; i++; } else q = false; } else celda += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { fila.push(celda); celda = ''; }
    else if (ch === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else if (ch !== '\r') celda += ch;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  const [cab, ...resto] = filas.filter(f => f.some(c => c !== ''));
  return { cab, filas: resto, objetos: resto.map(f => Object.fromEntries(cab.map((c, k) => [c, f[k] || '']))) };
}
const emp = csv($('Leer empleados (repo)').first().json.csv);
const pla = csv($('Leer planes (repo)').first().json.csv);

const datos = { ...datosDesde(T, defs), empleados: emp.objetos, planes: pla.objetos };
const r = calcular(datos);
const mapa = escriturasMapa(T, r, datos, 'inicial');
const n = h => T[h].filas.length ? T[h].filas[T[h].filas.length - 1]._fila - 1 : 0; // filas ocupadas (sin cabecera)

const data = [
  bloque('empleados', emp.cab.length, emp.filas, n('empleados')),
  bloque('planes-backup', pla.cab.length, pla.filas, n('planes-backup')),
  bloque('alertas', COLS.alertas.length, [], n('alertas')),
  bloque('historico-semaforo', COLS.historico.length, mapa.historico, n('historico-semaforo')),
  ...mapa.data,
];
return [{ json: batch(cfg.sheet_id, data) }];
