// Escenario 4 · nodo "Preparar": la pregunta de People, el prompt del asistente y las herramientas que puede usar (D-25).
const cfg = $('Configuración').first().json;
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const pregunta = String((cfg.query || {}).pregunta || '').trim().slice(0, 500);
const md = defs.prompt_asistente;
const system = md.split('## System')[1].split('## User')[0].trim();
return [{ json: {
  sigue: !!pregunta, pregunta, traza: [], final: pregunta ? null : '',
  body: { model: cfg.modelo, max_tokens: 1500, system, tools: HERRAMIENTAS, messages: [{ role: 'user', content: md.split('## User')[1].trim().replace('{{pregunta}}', pregunta) }] },
} }];
