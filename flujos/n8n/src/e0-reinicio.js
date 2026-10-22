// Escenario 0 · nodo "Filas iniciales": reinicio de la demo sin Claude Code (D-22).
// Lee los CSV iniciales que ha bajado de GitHub cada nodo "CSV …" (salidas/sheets/, los mismos que carga "reinicia la demo")
// y los convierte en filas con _hoja. Después, el flujo vacía las hojas y escribe estas filas hoja por hoja.
function csvAFilas(t) {
  const filas = []; let f = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { f.push(c); c = ''; }
    else if (ch === '\n') { f.push(c); filas.push(f); f = []; c = ''; } else if (ch !== '\r') c += ch;
  }
  if (c || f.length) { f.push(c); filas.push(f); }
  return filas.filter(x => x.some(v => v !== ''));
}
const items = [];
for (const h of HOJAS_INICIALES) {
  const [cab, ...filas] = csvAFilas(String($(`CSV ${h}`).first().json.csv || ''));
  if (!cab || !filas.length) throw new Error(`No se ha podido leer el CSV inicial de ${h} en GitHub`);
  for (const x of filas) items.push({ json: fila(h, Object.fromEntries(cab.map((k, i) => [k, x[i] ?? '']))) });
}
return items;
