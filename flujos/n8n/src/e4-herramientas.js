// Escenario 4 · nodo "Herramientas k" (D-25): una vuelta del bucle del agente.
// Lee la respuesta de Claude: si pide herramientas, las ejecuta con el motor (solo lectura), añade los resultados a la
// conversación y sigue; si ya ha respondido, termina. VUELTA y ANTERIOR los pone el generador (exportar-n8n.js).
const prev = $(ANTERIOR).first().json;
const res = $input.first().json || {};
const traza = [...prev.traza];
if (!Array.isArray(res.content)) {
  return [{ json: { ...prev, sigue: false, final: null, error: 'Claude no ha respondido (revisa la credencial Header Auth o el límite de gasto).', traza } }];
}
const texto = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
const usos = res.content.filter(b => b.type === 'tool_use');
if (res.stop_reason !== 'tool_use' || !usos.length) {
  return [{ json: { ...prev, sigue: false, final: texto, traza, body: null } }];
}
const defs = JSON.parse($('Leer definiciones').first().json.definiciones);
const datos = datosDesde(tablas(), defs);
const resultados = usos.map(u => {
  const r = ejecutarHerramienta(u.name, u.input || {}, datos, { calcular, comparar, vacante });
  traza.push({ vuelta: VUELTA, pensado: texto, herramienta: u.name, entrada: u.input || {}, resumen: resumenResultado(u.name, r) });
  return { type: 'tool_result', tool_use_id: u.id, content: JSON.stringify(r) };
});
const body = { ...prev.body, messages: [...prev.body.messages, { role: 'assistant', content: res.content }, { role: 'user', content: resultados }] };
return [{ json: { ...prev, sigue: true, body, traza } }];
