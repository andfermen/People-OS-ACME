// Escenario 2 · nodo "Validar skill": el manager valida un nivel nuevo (p. ej. Javier, gestion-claves 3, validado por E008).
// Actualiza skills-empleados, completa el plan de backup de esa skill, recalcula y prepara las filas a escribir y el email de cierre.
// Completar un curso no sube el nivel: lo sube esta validación, que hace una persona.
const cfg = $('Configuración').first().json;
const T = tablas();
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const base = datosDesde(T, defs);
const hoy = hoyISO();

const id = String(cfg.empleado_id || '').trim().toUpperCase();
const skill = String(cfg.skill_id || '').trim().toLowerCase();
const nivel = String(parseInt(cfg.nivel, 10));
const manager = String(cfg.validado_por || '').trim().toUpperCase();
const e = base.empleados.find(x => x.id === id && x.estado === 'activo');
if (!e) throw new Error(`No existe ninguna persona activa con id ${id}`);
if (!base.taxonomia.skills.some(s => s.id === skill)) throw new Error(`La skill ${skill} no está en la taxonomía`);
if (!/^[1-4]$/.test(nivel)) throw new Error('El nivel tiene que ser 1, 2, 3 o 4');
if (!base.empleados.some(x => x.id === manager && x.estado === 'activo')) throw new Error(`No existe ninguna persona activa con id ${manager} para validar`);

// 1 · skills-empleados: se actualiza su fila (por número de fila) o se añade si la persona no tenía esa skill
const previa = base.skills.find(s => s.empleado_id === id && s.skill_id === skill);
const nueva = { empleado_id: id, skill_id: skill, nivel_declarado: nivel, nivel_validado: nivel, validado_por: manager, fecha: hoy };
const filas = [previa
  ? fila('skills-empleados', { row_number: previa._fila, ...nueva })
  : fila('skills-empleados (nueva)', nueva)];

// 2 · planes-backup: el plan activo de esa persona y skill se da por completado si alcanza el nivel objetivo
const completados = base.planes.filter(p => p.empleado_id === id && p.skill_id === skill && p.estado === 'activo' && +nivel >= +p.nivel_objetivo)
  .map(p => ({ ...p, estado: 'completado' }));
completados.forEach(p => filas.push(fila('planes-backup', { plan_id: p.plan_id, estado: 'completado' })));

// 3 · Recalcular y comparar con el mapa actual
const datos = { ...base,
  skills: previa ? base.skills.map(s => (s === previa ? { ...previa, ...nueva } : s)) : [...base.skills, nueva],
  planes: base.planes.map(p => completados.find(c => c.plan_id === p.plan_id) || p) };
const evento = `Skill validada: ${e.nombre} · ${skill} ${previa ? previa.nivel_validado : 0} → ${nivel} (valida ${manager})`;
const r = calcular(datos);
const nombres = new Map(r.funciones.map(f => [f.id, f.nombre]));
const cambios = comparar(fotoActual(T), r).map(c => ({ ...c, nombre: nombres.get(c.id) }));
filas.push(...filasMapa(r, datos, evento));

const mejoran = cambios.filter(c => c.cambio === 'mejora');
const cuerpo = `<h2>${esc(evento)}</h2>
  ${completados.length ? `<p>Plan(es) de backup completado(s): ${completados.map(p => esc(p.plan_id)).join(', ')}.</p>` : ''}
  ${cambios.length ? `<h3>Cambios en el mapa</h3>${listaCambios(cambios)}` : '<p>El mapa no cambia: el nuevo nivel no cambia la cobertura de ninguna función.</p>'}
  <p><i>El nivel lo ha validado una persona (${esc(manager)}). Completar un curso no sube el nivel por sí solo.</i></p>
  <p><a href="${enlaceHris()}">Ver el mapa</a></p>`;
return [{ json: { filas, email: {
  para: cfg.email_demo,
  asunto: `[Acme People OS] ${mejoran.length ? 'Riesgo reducido' : 'Skill validada'} · ${e.nombre} · ${skill} ${nivel}`,
  html: html(cuerpo),
} } }];
