// Escenario 0 · nodo "Panel": la página de entrada para quien prueba la demo sin instalar nada (D-22).
// Lee el Sheet en cada visita y enseña: qué hacer ahora (según el estado), el mapa en vivo, las decisiones pendientes con su
// botón Aprobar y la bandeja de People (copia de cada email que ha enviado el sistema). No escribe nada.
const cfg = $('Configuración').first().json;
const T = tablas();
const base = String(cfg.webhookUrl || '').replace(/acme-panel.*$/, ''); // …/webhook/ de esta misma instancia
const url = { aprobar: base + 'acme-aprobar', reiniciar: base + 'acme-reiniciar', panel: base + 'acme-panel', asistente: base + 'acme-asistente' };
const configurado = u => u && !/^PEGAR_/.test(u);

const empleados = T['empleados'].filas, alertas = T['alertas'].filas, planes = T['planes-backup'].filas;
const mapa = T['cobertura'].filas, kp = T['key-people'].filas, bandeja = T['bandeja'].filas;
const elena = empleados.find(e => e.id === 'E007');

// ---------- Qué hacer ahora: los pasos de la historia y si ya están hechos ----------
const backupJavier = alertas.find(a => a.tipo_accion === 'backup' && a.empleado_id === 'E009');
const planJavier = planes.find(p => p.empleado_id === 'E009' && p.skill_id === 'gestion-claves' && /^ALR/.test(p.origen || ''));
const enlace = (u, texto) => (configurado(u) ? `<a class="btn" href="${u}" target="_blank">${texto} ↗</a>` : `<span class="falta">${texto}: falta configurar la URL</span>`);
const pasos = [
  { t: 'Registrar la baja de Elena, responsable de custodia', d: 'Formulario de baja con el id <b>E007</b>. El sistema recalcula el mapa y prepara una propuesta para People.',
    hecho: elena && elena.estado === 'baja', accion: enlace(cfg.url_form_baja, 'Formulario de baja') },
  { t: 'Decidir cómo cubrir su puesto', d: 'En <i>Decisiones pendientes</i>, aprueba la opción A (buscar fuera) o la B (mover a Marcos). La otra se descarta sola.',
    hecho: alertas.some(a => /^VAC-/.test(a.grupo || '') && a.decision === 'aprobada') },
  { t: 'Aprobar el plan de backup de Javier', d: `${backupJavier ? `<b>${esc(backupJavier.alerta_id)}</b>: c` : 'C'}on un plan activo, <i>Gestión de claves</i> pasa de rojo a ámbar.`,
    hecho: backupJavier && backupJavier.decision === 'aprobada' },
  { t: 'Tres meses después: el seguimiento de planes', d: 'Formulario <i>Ejecutar ahora</i> → <b>seguimiento</b>, <b>+12 semanas</b>. Nadie le pide nada: la automatización ve que el plan de Javier ha llegado a su fecha y escribe a su manager. Míralo en la bandeja.',
    hecho: planJavier && (+planJavier.avisos > 0 || planJavier.estado === 'completado'), accion: enlace(cfg.url_form_automatizaciones, 'Formulario «Ejecutar ahora»') },
  { t: 'El manager valida a Javier', d: 'Pulsa <i>Validar a Javier</i> en el aviso de la bandeja (o abre el formulario de skill con <b>E009 · gestion-claves · 3 · E008</b>). <i>Gestión de claves</i> vuelve a verde.',
    hecho: planJavier && planJavier.estado === 'completado', accion: enlace(cfg.url_form_skill, 'Formulario de skill') },
  { t: 'Si nadie responde (opcional)', d: '<i>Ejecutar ahora</i> → seguimiento con <b>+13</b> y después <b>+14 semanas</b>: recuerda al manager y, tras dos avisos, escala a People.',
    hecho: alertas.some(a => /^SEG-/.test(a.grupo || '')), opcional: true },
  { t: 'El centinela: el informe del mes', d: '<i>Ejecutar ahora</i> → <b>centinela</b>, <b>+14 semanas</b>. Recalcula sin que nadie lo pida y deja en la bandeja el informe para dirección.',
    hecho: bandeja.some(b => /informe para dirección/.test(b.asunto || '')) },
];
const siguiente = pasos.findIndex(p => !p.hecho && !p.opcional);
const htmlPasos = pasos.map((p, i) => `<li class="${p.hecho ? 'hecho' : i === siguiente ? 'ahora' : ''}${p.opcional ? ' opcional' : ''}">
  <div class="n">${p.hecho ? '✓' : i + 1}</div><div><b>${p.t}</b>${i === siguiente ? ' <span class="tag">ahora</span>' : ''}<p>${p.d}</p>${p.accion && !p.hecho ? p.accion : ''}</div></li>`).join('');

// ---------- Mapa en vivo ----------
const cuenta = mapa.reduce((m, f) => ((m[f.semaforo] = (m[f.semaforo] || 0) + 1), m), { rojo: 0, ambar: 0, verde: 0 });
const areas = [];
for (const f of mapa) { let a = areas.find(x => x.n === f.area); if (!a) areas.push(a = { n: f.area, fs: [] }); a.fs.push(f); }
const htmlMapa = areas.map(a => `<div class="area"><span>${esc(a.n)}</span><div class="tiles">${a.fs.map(f =>
  `<div class="tile ${esc(f.semaforo)}" title="${esc(f.nombre)} · cubren: ${esc(f.cubren)}"><b>${esc(f.funcion_id)}${f.prioridad && f.prioridad !== '-' ? ` · ${esc(f.prioridad)}` : ''}</b><span>${esc(f.cobertura)}/${esc(f.objetivo)}</span><small>${esc(f.nombre)}</small></div>`).join('')}</div></div>`).join('');
const htmlKp = kp.map(k => `<li><b>${esc(k.nombre)}</b>${k.oculta === 'si' ? ' <span class="tag oculta">oculta</span>' : ''}<br><small>${esc(k.rol)} · ${esc(k.funciones)}</small></li>`).join('');

// ---------- Decisiones ----------
const pendientes = alertas.filter(a => a.decision === 'pendiente');
const tarjeta = a => `<div class="alerta${a.grupo && /^VAC-/.test(a.grupo) ? ' opcion' : ''}"><div class="cab"><b>${esc(a.alerta_id)}</b>${a.prioridad ? ` <span class="tag">${esc(a.prioridad)}</span>` : ''}${/^VAC-/.test(a.grupo || '') ? ' <span class="tag">elige una</span>' : ''}</div>
  <b>${esc(a.accion)}</b><p>${esc(a.por_que)}</p>${a.riesgo_si_no ? `<p class="riesgo">${esc(a.riesgo_si_no)}</p>` : ''}<a class="btn" href="${url.aprobar}?alerta=${encodeURIComponent(a.alerta_id)}">Aprobar ${esc(a.alerta_id)}</a></div>`;
const decididas = alertas.filter(a => a.decision !== 'pendiente');
const htmlDecisiones = (pendientes.length ? pendientes.map(tarjeta).join('') : '<p class="vacio">Nada pendiente.</p>')
  + (decididas.length ? `<details><summary>Ya decididas (${decididas.length})</summary><ul>${decididas.map(a => `<li><b>${esc(a.alerta_id)}</b> ${esc(a.accion)} · <span class="dec ${esc(a.decision)}">${esc(a.decision)}</span></li>`).join('')}</ul></details>` : '');

// ---------- Bandeja de People ----------
const correos = bandeja.slice().reverse().slice(0, 12);
const htmlBandeja = correos.length ? correos.map((c, i) => `<details${i === 0 ? ' open' : ''}><summary><small>${esc(c.fecha)}</small> ${esc(c.asunto)}</summary><div class="correo">${c.html}</div></details>`).join('')
  : '<p class="vacio">Aún no ha salido ningún email. Empieza por el paso 1.</p>';

// ---------- Estado del montaje: lo que suele fallar al montar la demo (LEEME, "Si falla"). Abierto solo si algo falla ----------
const cabecera = h => Object.keys((($('Leer HRIS').first().json.tablas || {})[h] || [])[0] || {});
const formularios = [cfg.url_form_baja, cfg.url_form_skill, cfg.url_form_automatizaciones].filter(configurado).length;
const montaje = [
  { t: 'HRIS', ok: empleados.length > 0 && mapa.length > 0, si: `${empleados.length} personas y ${mapa.length} funciones leídas por el adaptador`,
    no: 'El adaptador no devuelve datos: revisa hris_workflow_id en la Configuración y sheet_id en el HRIS. Si el Sheet está vacío, pulsa Reiniciar.' },
  { t: 'Seguimiento de planes', ok: !planes.length || ['avisos', 'ultimo_aviso'].every(c => cabecera('planes-backup').includes(c)), si: 'planes-backup tiene las columnas avisos y ultimo_aviso',
    no: 'Faltan las columnas avisos y ultimo_aviso en planes-backup.' },
  { t: 'Formularios', ok: formularios === 3, si: 'las tres URLs de formulario están configuradas', no: `${3 - formularios} de 3 URLs sin pegar en la Configuración del escenario 0.` },
];
const fallan = montaje.filter(m => !m.ok).length;
const htmlMontaje = `<details class="montaje${fallan ? ' mal' : ''}"${fallan ? ' open' : ''}><summary>${fallan ? `⚠ Estado del montaje: ${fallan} cosa${fallan > 1 ? 's' : ''} por revisar` : '✓ Estado del montaje: todo conectado'}</summary>
<ul>${montaje.map(m => `<li>${m.ok ? '✓' : '✗'} <b>${m.t}</b>: ${m.ok ? m.si : m.no}</li>`).join('')}</ul></details>`;

// ---------- Qué hay detrás: las capas (docs/arquitectura.md) y cómo serían en producción (docs/produccion.md) ----------
const capas = [
  ['Definiciones', 'Reglas, umbrales, funciones y prompts en archivos del repo (reglas.yaml). Cambiar una regla es editar un archivo.', 'Versionadas y revisadas antes de publicarse; cada ejecución usa una versión fija.'],
  ['Motor', 'Semáforo, prioridad, key people y candidatos: código determinista, el mismo que se verifica en el repo.', 'Igual, con las pruebas en integración continua antes de cada cambio.'],
  ['Orquestador', 'n8n: disparadores (formularios, botones, calendario), recálculo, emails y este panel.', 'Entornos separados (pruebas y real), aviso de errores y reintentos.'],
  ['HRIS', 'Google Sheets, al que solo habla un adaptador (leer, escribir, cargar).', 'El HRIS de la compañía por su API; la baja llega como evento del HRIS, no por un formulario.'],
  ['IA', 'Claude redacta la propuesta y el informe (si falla, salen por reglas) y razona en el asistente. Nunca calcula el riesgo ni decide.', 'Sin retención de datos en el proveedor, registro de lo que se le pregunta y una batería de pruebas antes de cambiar prompt o modelo.'],
  ['Personas', 'People aprueba; el manager valida skills. Cada decisión queda en el HRIS.', 'Con identificación (SSO), permisos por rol y registro de quién decidió qué.'],
];
const htmlDetras = `<div class="capas">${capas.map(([t, demo, prod]) => `<div><b>${t}</b><p>${demo}</p><p class="prod">En producción: ${prod}</p></div>`).join('')}</div>`;

const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acme People OS · demo</title>
<style>
:root{--f:#eef1f5;--s:#fff;--b:#dde3ea;--t:#18212b;--t2:#5b6876;--a:#3b5bdb;--v:#2f9e6a;--vs:#e3f5ec;--am:#d69520;--ams:#fdf3dc;--r:#d6453d;--rs:#fde7e5}
*{box-sizing:border-box}body{margin:0;font-family:Inter,"Segoe UI",system-ui,sans-serif;background:var(--f);color:var(--t);font-size:15px;line-height:1.45}
header{background:var(--s);border-bottom:1px solid var(--b);padding:14px 20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center}
header h1{font-size:19px;margin:0}header h1 i{color:var(--a);font-style:normal}.demo{background:var(--ams);color:#8a5a00;border-radius:99px;padding:4px 10px;font-size:12px}
header .acc{margin-left:auto;display:flex;gap:8px}main{max-width:1240px;margin:0 auto;padding:20px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:18px}
section{background:var(--s);border:1px solid var(--b);border-radius:12px;padding:16px 18px;min-width:0}section>h2{font-size:15px;margin:0 0 10px;text-transform:uppercase;letter-spacing:.06em;color:var(--t2)}
.intro{grid-column:1/-1}.intro p{margin:4px 0;color:var(--t2)}
.btn{display:inline-block;background:var(--a);color:#fff;text-decoration:none;border-radius:6px;padding:7px 12px;font-size:14px;margin-top:6px;border:0;cursor:pointer;font:inherit}
.btn.sec{background:var(--s);color:var(--t);border:1px solid var(--b)}.falta{color:var(--r);font-size:13px}
ol.pasos{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}ol.pasos li{display:flex;gap:10px;padding:8px;border-radius:8px}
ol.pasos .n{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;background:var(--f)}
ol.pasos li.hecho{opacity:.6}ol.pasos li.hecho .n{background:var(--vs);color:var(--v)}ol.pasos li.ahora{background:#e8edff}ol.pasos li.ahora .n{background:var(--a);color:#fff}
ol.pasos p{margin:2px 0 0;color:var(--t2);font-size:14px}.opcional b{font-weight:600}
.tag{font-size:11px;background:var(--f);border-radius:99px;padding:1px 8px;color:var(--t2)}.tag.oculta{background:#efeafd;color:#7b61d1}
.kpi{display:flex;gap:8px;margin-bottom:10px}.kpi div{border:1px solid var(--b);border-radius:8px;padding:6px 12px}.kpi b{font-size:20px;display:block}
.kpi .r b{color:var(--r)}.kpi .a b{color:var(--am)}.kpi .v b{color:var(--v)}
.area{display:grid;grid-template-columns:130px 1fr;gap:6px;margin-bottom:5px;align-items:center}.area>span{font-size:12.5px;color:var(--t2);font-weight:600}
.tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.tile{border-radius:6px;padding:4px 7px;font-size:11.5px;display:grid;grid-template-columns:1fr auto}
.tile small{grid-column:1/-1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tile.verde{background:var(--vs);color:#1d6b47}.tile.ambar{background:var(--ams);color:#8a5a00}.tile.rojo{background:var(--rs);color:#a12d26}
ul.kp{list-style:none;padding:0;margin:10px 0 0;display:grid;grid-template-columns:1fr 1fr;gap:6px}ul.kp small{color:var(--t2)}
.alerta{border:1px solid var(--b);border-radius:8px;padding:10px 12px;margin-bottom:8px}.alerta.opcion{border-left:4px solid var(--a)}.alerta p{margin:4px 0;font-size:14px}.alerta .riesgo{color:#a12d26}
.dec{font-size:12px;font-weight:700}.dec.aprobada{color:var(--v)}.dec.descartada{color:var(--t2);text-decoration:line-through}
details{border:1px solid var(--b);border-radius:8px;margin-bottom:8px;padding:8px 10px}summary{cursor:pointer;font-weight:600;font-size:14px}summary small{color:var(--t2);font-weight:400;margin-right:6px}
.correo{margin-top:8px;border-top:1px solid var(--b);padding-top:8px;overflow-x:auto}.vacio{color:var(--t2)}
.nota{font-size:12.5px;color:var(--t2)}.montaje{margin:10px 0 0;font-size:13.5px}.montaje.mal{border-color:var(--r);background:var(--rs)}.montaje ul{margin:6px 0 0;padding-left:18px}
.capas{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}.capas div{border:1px solid var(--b);border-radius:8px;padding:10px 12px}.capas p{margin:4px 0 0;font-size:13.5px}.capas .prod{color:var(--t2);font-size:12.5px}footer{max-width:1240px;margin:0 auto 30px;padding:0 20px;color:var(--t2);font-size:13px}
@media(max-width:900px){main{grid-template-columns:minmax(0,1fr);padding:12px}header .acc{margin-left:0}.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}.area{grid-template-columns:1fr}ul.kp{grid-template-columns:1fr}.capas{grid-template-columns:1fr}}
</style></head><body>
<header><h1>acme<i>.</i> People OS</h1><span class="demo">Entorno de demostración · datos ficticios</span>
<div class="acc"><button class="btn sec" onclick="location.reload()">↻ Actualizar</button><button class="btn sec" onclick="if(confirm('¿Reiniciar la demo? Vuelve todo al estado inicial (tarda unos segundos).'))location.href='${url.reiniciar}'">Reiniciar la demo</button></div></header>
<main>
<section class="intro"><h2>Cómo probarlo</h2><p>Todo lo que ves lo calcula el sistema ahora, leyendo el Sheet que hace de HRIS. Los formularios se abren en otra pestaña: tras enviarlos, vuelve aquí y pulsa <b>Actualizar</b> (el recálculo tarda unos segundos; la propuesta de Claude, algo más).</p>
<p class="nota">Si otra persona lo está probando a la vez, compartís los datos. <b>Reiniciar</b> lo deja como al principio.</p>${htmlMontaje}</section>
<section><h2>Qué hacer ahora</h2><ol class="pasos">${htmlPasos}</ol></section>
<section class="intro"><h2>Pregúntale al asistente · un agente</h2><p>Claude decide qué consultar (el mapa, una persona, una baja simulada, candidatos, madurez IA) y responde con las cifras del motor. Solo lee: no cambia nada y no ve salarios ni señales individuales.</p>
<form action="${url.asistente}" method="get" target="_blank" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><input name="pregunta" placeholder="Por ejemplo: ¿qué pasa si se va Carmen?" style="flex:1;min-width:220px;padding:8px 12px;border:1px solid var(--b);border-radius:6px;font:inherit"><button class="btn" style="margin-top:0">Preguntar ↗</button></form>
<p class="nota" style="margin-top:8px">Prueba: ${['¿Qué pasa si se va Carmen?', '¿Quién podría cubrir la prueba de reservas?', '¿Qué área va peor en IA?'].map(e => `<a href="${url.asistente}?pregunta=${encodeURIComponent(e)}" target="_blank">${e}</a>`).join(' · ')}</p></section>
<section><h2>Mapa de cobertura</h2><div class="kpi"><div class="r"><b>${cuenta.rojo}</b>en rojo</div><div class="a"><b>${cuenta.ambar}</b>en ámbar</div><div class="v"><b>${cuenta.verde}</b>en verde</div></div>${htmlMapa}
<h2 style="margin-top:14px">Key people (calculadas, nadie las marca)</h2><ul class="kp">${htmlKp}</ul></section>
<section><h2>Decisiones pendientes de People</h2>${htmlDecisiones}</section>
<section><h2>Bandeja de People</h2><p class="nota">Copia de cada email que ha enviado el sistema, el más reciente arriba. En producción, cada uno llega a su destinatario (People o el manager); aquí se ven todos.</p>${htmlBandeja}</section>
<section class="intro"><h2>Qué hay detrás</h2><p class="nota">Lo que se hace (reglas) está separado de quién lo ejecuta (n8n), y el riesgo se calcula, no se opina. Así está montada la demo y así sería en producción.</p>${htmlDetras}</section>
</main>
<footer>Código, reglas y decisiones: <a href="${String(cfg.repo).replace('raw.githubusercontent.com', 'github.com').replace(/\/main$/, '')}">repositorio</a>${configurado(cfg.url_video) ? ` · <a href="${cfg.url_video}">vídeo</a>` : ''} · <a href="${enlaceHris()}">HRIS (Google Sheets)</a></footer>
</body></html>`;
return [{ json: { html: pagina } }];
