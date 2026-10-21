// Propuesta de acciones (pasos 4-5): contexto para Claude y propuesta por reglas si no hay IA.
// Sin dependencias: lo usan la demo local (demo.js) y el nodo de código de n8n (exportar-n8n.js).

function contexto(r, cambios, evento, vac, datos) {
  const ids = cambios.filter(c => c.cambio === 'empeora').map(c => c.id);
  const afectadas = r.funciones.filter(x => ids.includes(x.id));
  const implicadas = new Set(afectadas.flatMap(x => x.skills.filter(s => s.semaforo !== 'verde').flatMap(s => s.personas)));
  const formaciones = new Set(afectadas.flatMap(x => x.skills.flatMap(s => s.formacion || [])));
  // Si alguna función se rediseña con IA, la recualificación sale de las formaciones de IA del catálogo
  if (afectadas.some(x => x.respuesta === 'redisenar')) datos.catalogo.filter(c => c.skill.startsWith('ia-')).forEach(c => formaciones.add(c.id));
  if (vac) {
    // Lente AI first: una skill del puesto que solo sostiene funciones a rediseñar no se cubre tal cual (ni dentro ni fuera)
    vac.perfil.forEach(p => { p.redisenar = !!p.funcion && r.funciones.find(f => f.id === p.funcion)?.respuesta === 'redisenar'; });
    vac.candidatos.forEach(c => { implicadas.add(c.id); c.brechas.forEach(b => b.formacion.forEach(x => formaciones.add(x))); });
    // Solo People: compa-ratio del candidato frente a la banda del puesto que asumiría
    const banda = datos.bandas.find(b => b.banda_id === datos.empleados.find(e => e.id === vac.id).banda_id);
    vac.candidatos.forEach(c => { c.compa_en_puesto = +(datos.empleados.find(e => e.id === c.id).salario_ficticio / banda.medio).toFixed(2); c.banda_puesto = banda.banda_id; });
  }
  return {
    evento, cambios, funciones_afectadas: afectadas, key_people: r.key_people, vacante: vac,
    senales: r.senales_rotacion.filter(s => implicadas.has(s.id)),
    catalogo: datos.catalogo.filter(c => formaciones.has(c.id)),
  };
}

// Decisión de cubrir el puesto: dos opciones excluyentes con el mismo grupo (A fuera, B el mejor candidato interno)
function opcionesVacante(ctx) {
  const v = ctx.vacante;
  if (!v || !v.perfil.some(p => p.skill !== 'liderazgo' && !p.redisenar)) return [];
  const grupo = `VAC-${v.id}`;
  const prioridad = ctx.funciones_afectadas.map(x => x.prioridad).sort()[0] || 'P1';
  const ops = [{ prioridad, funcion_id: '', tipo: 'contratar', grupo, accion: `Opción A · Buscar fuera: ${v.rol} (${v.perfil.filter(p => !p.redisenar).map(p => `${p.skill} ${p.nivel}`).join(', ')})`, empleado_id: '', skill_id: '', formacion_id: '',
    por_que: v.candidatos.length ? 'Nadie dentro cumple el perfil completo.' : 'Ningún candidato interno cumple la mitad del perfil.',
    riesgo_si_no: `Proceso de 2-3 meses; mientras tanto, ${v.equipo ? `${v.equipo} personas sin responsable` : 'sus funciones dependen de quien quede'}.` }];
  const c = v.candidatos[0];
  if (c) {
    const conForm = c.brechas.find(b => b.formacion.length);
    ops.push({ prioridad, funcion_id: c.brechas.find(b => b.funcion)?.funcion || '', tipo: 'movilidad', grupo, accion: `Opción B · Mover a ${c.nombre} (${c.rol}) a ${v.rol}`, empleado_id: c.id, skill_id: conForm?.skill || '', formacion_id: conForm?.formacion[0] || '',
      por_que: `Cumple ${c.cumple} de ${c.de} skills del puesto. Le falta: ${c.brechas.map(b => `${b.skill} ${b.tiene} → ${b.necesita}${b.formacion.length ? ` (${b.formacion[0]})` : ' (sin formación en el catálogo)'}`).join('; ')}.`,
      riesgo_si_no: c.key_person_en.length ? `Coste organizativo: ya es la única cobertura de ${c.key_person_en.join(', ')}; asumir el puesto concentra el riesgo en una persona.` : 'Coste organizativo: su puesto actual queda por cubrir.' });
  }
  return ops;
}

function propuestaPorReglas(ctx) {
  const acciones = opcionesVacante(ctx);
  const enVacante = skill => ctx.vacante?.perfil.some(p => p.skill === skill);
  for (const fn of ctx.funciones_afectadas) for (const s of fn.skills.filter(x => x.semaforo !== 'verde')) {
    const cand = (s.candidatos || []).find(c => !c.es_key_person);
    const form = ctx.catalogo.find(c => c.skill === s.skill);
    if (fn.respuesta === 'redisenar') {
      // Lente AI first: no se forma a nadie en el proceso actual; se rediseña y se recualifica
      const formIa = ctx.catalogo.find(c => c.skill === 'ia-automatizacion' && c.de === 1);
      acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'rediseno', accion: `Rediseñar ${fn.nombre} con IA y automatización${cand ? ` y recualificar a ${cand.nombre}` : ''}`, empleado_id: cand?.id || '', skill_id: 'ia-automatizacion', formacion_id: formIa?.id || '', por_que: `Cobertura ${s.cobertura} en ${s.skill} e impacto IA alto: formar un backup en el proceso actual es invertir en un proceso que va a cambiar.${cand?.con_interes ? ` ${cand.nombre} tiene interés declarado.` : ''}`, riesgo_si_no: `${fn.nombre} sigue dependiendo de ${s.cobertura} persona(s) y de un proceso manual.` });
      if (s.cobertura === 0) acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'redistribuir', accion: `Cubrir ${fn.nombre} con apoyo temporal mientras dura el rediseño`, empleado_id: '', skill_id: s.skill, formacion_id: '', por_que: 'Nadie cubre la skill hoy.', riesgo_si_no: 'La próxima entrega queda sin responsable.' });
    }
    else if (cand && s.cobertura > 0) acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'backup', accion: `Plan de backup: ${cand.nombre} en ${s.skill} (${s.nivel_minimo - 1} → ${s.nivel_minimo})`, empleado_id: cand.id, skill_id: s.skill, formacion_id: form?.id || '', por_que: `Cobertura ${s.cobertura}. ${cand.nombre} está a un nivel${cand.con_interes ? ' y tiene interés declarado' : ''}.`, riesgo_si_no: `La función ${fn.nombre} depende de ${s.cobertura} persona.` });
    else if (enVacante(s.skill)) { /* la cubre la decisión de la vacante (opciones A/B) */ }
    else acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'contratar', accion: `Abrir vacante con ${s.skill} nivel ${s.nivel_minimo}`, empleado_id: '', skill_id: s.skill, formacion_id: '', por_que: `Cobertura ${s.cobertura} y ningún candidato interno llega a tiempo.`, riesgo_si_no: `${fn.nombre} queda sin nadie que pueda sostenerla.` });
    if (s.cobertura === 1) {
      const kp = s.personas[0];
      acciones.push({ prioridad: fn.prioridad, funcion_id: fn.id, tipo: 'retencion', accion: `Conversación de permanencia con ${ctx.key_people.find(k => k.id === kp)?.nombre || kp}`, empleado_id: kp, skill_id: s.skill, formacion_id: '', por_que: 'Es la única cobertura de la skill.', riesgo_si_no: 'Una segunda salida deja la función sin cobertura.' });
    }
  }
  const n = ctx.cambios.filter(c => c.cambio === 'empeora').length;
  const nOpciones = acciones.filter(a => a.grupo).length;
  const v = nOpciones ? ctx.vacante : null, c = nOpciones > 1 ? v.candidatos[0] : null;
  const resumen = v
    ? `${ctx.evento}: ${n} función(es) empeoran. Primera decisión: cómo cubrir el puesto de ${v.rol}, buscando fuera (A)${c ? ` o moviendo a ${c.nombre} (B)` : ''}. Además se proponen ${acciones.length - nOpciones} acción(es) para reducir el riesgo mientras tanto. Todo queda pendiente de aprobación por People.`
    : `${ctx.evento}: ${n} función(es) empeoran. Se proponen ${acciones.length} acciones para su aprobación por People.`;
  const sen = c && ctx.senales.find(s => s.id === c.id);
  const detalle = c ? `${c.nombre}: probabilidad ${sen?.probabilidad || 'baja'} (${sen?.senales.join('; ') || 'sin señales'}). Si asume el puesto con su salario actual, su compa-ratio en la banda ${c.banda_puesto} sería ${c.compa_en_puesto}: la opción B exige revisar condiciones.` : '';
  return { acciones, resumen_direccion: resumen, detalle_people: detalle, observaciones: 'Propuesta generada por reglas (sin IA).' };
}

// Mensaje de usuario para prompts/proponer-acciones.md (mismo orden que la sección ## User del prompt)
function mensajeClaude(ctx) {
  const j = v => JSON.stringify(v, null, 1);
  return `Evento: ${ctx.evento}

Cambios en el mapa:
${j(ctx.cambios)}

Funciones afectadas (detalle del cálculo):
${j(ctx.funciones_afectadas)}

Key people tras el cambio:
${j(ctx.key_people)}

Señales de rotación (solo personas implicadas, confidencial People):
${j(ctx.senales)}

Vacante (puesto que deja la persona, si aplica):
${j(ctx.vacante)}

Formaciones disponibles:
${j(ctx.catalogo)}`;
}

module.exports = { contexto, opcionesVacante, propuestaPorReglas, mensajeClaude };
