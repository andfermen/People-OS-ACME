// Escenario 3 (agentes) · nodo "Centinela": centinela de riesgo (definiciones/reglas-agentes.md §2).
// El día 1 de cada mes, sin que nadie lo pida: recalcula el mapa, lo compara con el último recálculo, mira desde cuándo
// está frágil cada función, qué validaciones han caducado, qué planes tocan y qué decisiones siguen pendientes.
// Prepara la petición a Claude para el informe de dirección (prompts/informe-direccion.md), solo con datos agregados.
const cfg = $('Configuración').first().json;
const T = tablas();
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const base = datosDesde(T, defs);
const hoy = fechaDe(cfg);

const r = calcular(base);
const nombres = new Map(r.funciones.map(f => [f.id, f.nombre]));
const cambios = comparar(fotoActual(T), r).map(c => ({ ...c, nombre: nombres.get(c.id) }));
const h = vigilar(base, r, cambios, T['historico-semaforo'].filas, T['alertas'].filas, hoy);
const evento = `Revisión programada (centinela) · ${hoy}`;

const md = defs.prompt_informe;
const system = md.split('## System')[1].split('## User')[0].trim();
return [{ json: {
  hoy, h, evento, reglas: informePorReglas(h),
  filas: filasMapa(r, base, evento, hoy),
  body: { model: cfg.modelo, max_tokens: 2500, system, messages: [{ role: 'user', content: mensajeInforme(h, md.split('## User')[1].trim()) }] },
} }];
