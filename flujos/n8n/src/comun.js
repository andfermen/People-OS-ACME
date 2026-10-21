// Utilidades de los nodos de código de n8n: leer el Sheet (una llamada batchGet) y preparar escrituras (batchUpdate y append).
// exportar-n8n.js las concatena con el motor (cobertura.js), la propuesta (propuesta.js) y las filas (hojas.js).

const HOJAS_LECTURA = ['empleados', 'skills-empleados', 'planes-backup', 'bandas-salariales', 'encuesta-clima-agregada', 'historico-semaforo', 'alertas', 'key-people'];
const API = id => `https://sheets.googleapis.com/v4/spreadsheets/${id}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);

// Respuesta de batchGet → { hoja: { cabecera, filas: [{ ...columnas, _fila }] } }. _fila es la fila real del Sheet.
function tablas(resp) {
  const t = {};
  HOJAS_LECTURA.forEach((h, i) => {
    const values = (resp.valueRanges[i] || {}).values || [];
    const cabecera = (values[0] || []).map(String);
    const filas = values.slice(1).map((row, j) => {
      const o = { _fila: j + 2 };
      cabecera.forEach((c, k) => { o[c] = row[k] == null ? '' : String(row[k]); });
      return o;
    }).filter(o => cabecera.some(c => o[c] !== ''));
    t[h] = { cabecera, filas };
  });
  return t;
}

function datosDesde(T, defs) {
  return {
    funciones: defs.funciones, taxonomia: defs.taxonomia, areas: defs.areas, catalogo: defs.catalogo,
    empleados: T['empleados'].filas, skills: T['skills-empleados'].filas, planes: T['planes-backup'].filas,
    bandas: T['bandas-salariales'].filas, encuesta: T['encuesta-clima-agregada'].filas,
  };
}

// Última foto del histórico: las filas con la misma fecha y evento que la última fila
function ultimaFoto(filas) {
  if (!filas.length) return null;
  const u = filas[filas.length - 1];
  return { funciones: filas.filter(x => x.fecha === u.fecha && x.evento === u.evento).map(x => ({ id: x.funcion_id, semaforo: x.semaforo, cobertura: +x.cobertura, nombre: '' })) };
}

// ---------- Escrituras ----------
const letra = n => { let s = ''; for (; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const valor = v => (v == null ? '' : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !/^0\d/.test(v) ? +v : v);

// Una fila existente (por _fila), con las columnas en el orden de la cabecera del Sheet
function filaEn(hoja, cabecera, obj) {
  return { range: `'${hoja}'!A${obj._fila}:${letra(cabecera.length)}${obj._fila}`, values: [cabecera.map(c => valor(obj[c]))] };
}
// Bloque desde la fila 2 que sustituye el contenido; rellena con vacíos hasta minFilas para borrar lo que hubiera
function bloque(hoja, ncols, filas, minFilas = 0) {
  const n = Math.max(filas.length, minFilas);
  if (!n) return null;
  const values = [...filas.map(f => f.map(valor)), ...Array(n - filas.length).fill(Array(ncols).fill(''))];
  return { range: `'${hoja}'!A2:${letra(ncols)}${n + 1}`, values };
}
const batch = (id, data) => ({ method: 'POST', url: `${API(id)}/values:batchUpdate`, body: { valueInputOption: 'RAW', data: data.filter(Boolean) } });
const append = (id, hoja, filas) => ({ method: 'POST', url: `${API(id)}/values/${encodeURIComponent(`'${hoja}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, body: { values: filas.map(f => f.map(valor)) } });

// Escrituras del mapa tras un recálculo: cobertura y key-people (sustituir) + foto en el histórico (añadir)
function escriturasMapa(T, r, datos, evento) {
  const nombre = id => datos.empleados.find(e => e.id === id)?.nombre || id;
  return {
    data: [bloque('cobertura', COLS.cobertura.length, filasCobertura(r, nombre)),
      bloque('key-people', COLS.keyPeople.length, filasKeyPeople(r), T['key-people'].filas.length)],
    historico: filasHistorico(r, hoyISO(), evento),
  };
}

// ---------- Email (HTML sencillo, se ve bien en Gmail) ----------
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = cuerpo => `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;max-width:680px">${cuerpo}<p style="color:#888;font-size:12px;margin-top:24px">Acme People OS · datos ficticios · generado automáticamente</p></div>`;
function listaCambios(cambios) {
  return `<ul>${cambios.map(c => `<li><b>${esc(c.id)}</b> ${esc(c.nombre)}: ${ICONO[c.de]} → ${ICONO[c.a]} (cobertura ${c.cobertura_antes} → ${c.cobertura_despues})</li>`).join('')}</ul>`;
}
