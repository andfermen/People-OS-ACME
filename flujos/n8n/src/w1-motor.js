// Escenario 1 (rama baja) · nodo "Motor": pasos 1-4. Aplica la baja en memoria, recalcula, compara con la última foto y prepara la petición a Claude.
const cfg = $('Configuración').first().json;
const T = tablas($('Leer Sheet').first().json);
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const base = datosDesde(T, defs);

const id = String(cfg.empleado_id || '').trim().toUpperCase();
const e = base.empleados.find(x => x.id === id);
if (!e) throw new Error(`No existe ${id} en la hoja empleados`);
if (e.estado !== 'activo') throw new Error(`${e.nombre} ya figura como ${e.estado}. Para repetir la demo, usa el formulario "Reiniciar demo".`);
const evento = `Baja de ${e.nombre} (${e.rol})`;

const vac = vacante(base, id); // el perfil del puesto se calcula con la persona aún dentro
const datos = simularBaja(base, id);
const r = calcular(datos);
const antes = ultimaFoto(T['historico-semaforo'].filas) || calcular(base);
const nombres = new Map(r.funciones.map(f => [f.id, f.nombre]));
const cambios = comparar(antes, r).map(c => ({ ...c, nombre: nombres.get(c.id) }));
const ctx = contexto(r, cambios, evento, vac, datos);

const md = $('Leer prompt').first().json.prompt;
const system = md.split('## System')[1].split('## User')[0].trim();
const mapa = escriturasMapa(T, r, datos, evento);
const conteo = r.funciones.reduce((m, f) => ((m[f.semaforo] = (m[f.semaforo] || 0) + 1), m), {});

return [{ json: {
  id, evento, hay_alerta: cambios.some(c => c.cambio === 'empeora'), cambios, conteo,
  key_people: r.key_people.map(k => k.nombre + (k.oculta ? ' (oculta)' : '')),
  reglas: propuestaPorReglas(ctx), n_alertas: T['alertas'].filas.length,
  escrituras: { data: [filaEn('empleados', T['empleados'].cabecera, { ...e, estado: 'baja' }), ...mapa.data], historico: mapa.historico },
  body: { model: cfg.modelo, max_tokens: 4000, system, messages: [{ role: 'user', content: mensajeClaude(ctx) }] },
} }];
