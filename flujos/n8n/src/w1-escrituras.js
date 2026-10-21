// W1 · nodo "Preparar escrituras": paso 6 en el Sheet. Baja + mapa (batchUpdate), foto del histórico y alertas (append).
const cfg = $('Configuración').first().json;
const m = $('Motor').first().json;
let prop = null;
try { prop = $('Propuesta final').first().json; } catch (err) { /* ninguna función empeora: no hay propuesta */ }

const peticiones = [batch(cfg.sheet_id, m.escrituras.data), append(cfg.sheet_id, 'historico-semaforo', m.escrituras.historico)];
if (prop) peticiones.push(append(cfg.sheet_id, 'alertas', prop.alertas.map(a => COLS.alertas.map(c => a[c]))));
return peticiones.map(json => ({ json }));
