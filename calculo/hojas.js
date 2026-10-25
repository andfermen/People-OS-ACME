// Filas de las hojas calculadas del Sheet (cobertura, key-people, histórico, alertas).
// Sin dependencias: lo usan exportar-sheets.js y los nodos de código de n8n (exportar-n8n.js).

const COLS = {
  cobertura: ['funcion_id', 'area', 'nombre', 'criticidad', 'semaforo', 'icono', 'prioridad', 'cobertura', 'objetivo', 'skill_mas_debil', 'cubren', 'backup_en_desarrollo', 'candidatos_con_interes', 'impacto_ia', 'respuesta'],
  keyPeople: ['empleado_id', 'nombre', 'area', 'rol', 'oculta', 'funciones', 'skills'],
  historico: ['fecha', 'funcion_id', 'semaforo', 'cobertura', 'prioridad', 'evento'],
  bandeja: ['fecha', 'asunto', 'html'], // copia de cada email que envía el sistema: el panel la enseña sin depender de un buzón (D-22)
  alertas: ['alerta_id', 'fecha', 'evento', 'funcion_id', 'prioridad', 'cambio', 'tipo_accion', 'accion', 'empleado_id', 'skill_id', 'formacion_id', 'por_que', 'riesgo_si_no', 'decision', 'decidido_por', 'fecha_decision', 'grupo'],
};
const ICONO = { verde: '🟢', ambar: '🟡', rojo: '🔴' };

function filasCobertura(r, nombre) {
  return r.funciones.map(f => {
    const s = f.skills.reduce((a, b) => (b.cobertura < a.cobertura ? b : a));
    const debiles = f.skills.filter(x => x.semaforo !== 'verde');
    return [f.id, f.area, f.nombre, f.criticidad, f.semaforo, ICONO[f.semaforo], f.prioridad, f.cobertura, f.objetivo, s.skill,
      s.personas.map(nombre).join('; '),
      debiles.flatMap(x => x.backups_en_desarrollo).map(nombre).join('; '),
      debiles.flatMap(x => (x.candidatos || []).filter(c => c.con_interes).map(c => c.nombre)).join('; '),
      f.impacto_ia, f.respuesta === 'redisenar' ? 'rediseñar con IA' : 'cubrir'];
  });
}

function filasKeyPeople(r) {
  return r.key_people.map(k => [k.id, k.nombre, k.area, k.rol, k.oculta ? 'si' : 'no',
    k.funciones.map(f => f.funcion).join('; '), k.funciones.map(f => f.skill).join('; ')]);
}

function filasHistorico(r, fecha, evento) {
  return r.funciones.map(f => [fecha, f.id, f.semaforo, f.cobertura, f.prioridad, evento]);
}

module.exports = { COLS, ICONO, filasCobertura, filasKeyPeople, filasHistorico };
