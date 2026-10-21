// Escenario 1 (baja) · nodo "Propuesta final": paso 5. Usa la respuesta de Claude; si falla o no es JSON válido, la propuesta por reglas.
const m = $('Motor').first().json;
const res = $input.first().json;
let prop, fuente = 'Claude';
// Si ninguna función empeora no hay nada que proponer ni que avisar
if (!m.hay_alerta) return [{ json: { fuente: '-', resumen_direccion: '', detalle_people: '', alertas: [] } }];
try {
  const t = res.content.find(b => b.type === 'text').text;
  prop = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
  if (!Array.isArray(prop.acciones) || !prop.acciones.length) throw new Error('sin acciones');
} catch (err) {
  prop = m.reglas;
  fuente = 'reglas (Claude no disponible)';
}

const hoy = hoyISO();
const alertas = prop.acciones.map((a, i) => ({
  alerta_id: `ALR-${String(m.n_alertas + i + 1).padStart(3, '0')}`, fecha: hoy, evento: m.evento,
  funcion_id: a.funcion_id || '', prioridad: a.prioridad || '', cambio: m.cambios.find(c => c.id === a.funcion_id)?.cambio || '',
  tipo_accion: a.tipo, accion: a.accion, empleado_id: a.empleado_id || '', skill_id: a.skill_id || '', formacion_id: a.formacion_id || '',
  por_que: a.por_que || '', riesgo_si_no: a.riesgo_si_no || '', decision: 'pendiente', decidido_por: '', fecha_decision: '', grupo: a.grupo || '',
}));
return [{ json: { fuente, resumen_direccion: prop.resumen_direccion, detalle_people: prop.detalle_people || '', alertas } }];
