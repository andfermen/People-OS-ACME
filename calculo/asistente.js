// Herramientas del Asistente de People (D-25): lo que un agente con Claude puede consultar para responder a People.
// El modelo decide qué herramienta usar y en qué orden; las cifras las calcula siempre el motor (calcular, comparar, vacante).
// Solo lectura: ninguna herramienta escribe. Privacidad por construcción: ninguna devuelve salarios, bandas, evaluaciones
// ni señales de rotación (para eso no hay herramienta, y el prompt manda negarse).
// Sin dependencias: recibe calcular, comparar y vacante como parámetro, para servir igual en Node y en los nodos de n8n.

const HERRAMIENTAS = [
  { name: 'consultar_mapa', description: 'Estado actual del mapa de cobertura: cuántas funciones hay en rojo, ámbar y verde, cuáles están en riesgo (con su prioridad, cobertura y quién las sostiene) y quiénes son las key people.',
    input_schema: { type: 'object', properties: {} } },
  { name: 'buscar_persona', description: 'Busca personas por nombre o id (por ejemplo "Carmen" o "E011"). Devuelve rol, área, manager, skills validadas y las funciones en las que es key person. No incluye datos salariales ni de desempeño.',
    input_schema: { type: 'object', properties: { texto: { type: 'string', description: 'Nombre, apellido o id de la persona' } }, required: ['texto'] } },
  { name: 'simular_baja', description: 'Simula qué pasaría si una persona dejara la compañía, sin cambiar nada: qué funciones empeoran, quién pasa a ser key person y qué candidatos internos podrían cubrir su puesto, con sus brechas.',
    input_schema: { type: 'object', properties: { empleado_id: { type: 'string', description: 'Id de la persona, por ejemplo E011. Si solo tienes el nombre, usa antes buscar_persona.' } }, required: ['empleado_id'] } },
  { name: 'candidatos_para_funcion', description: 'Para una función (por ejemplo CUS-02), devuelve las skills que pide, quién la cubre hoy, las personas a un nivel de distancia (indicando si tienen interés declarado) y la formación del catálogo que cerraría la brecha.',
    input_schema: { type: 'object', properties: { funcion_id: { type: 'string', description: 'Id de la función, por ejemplo CUS-02' } }, required: ['funcion_id'] } },
  { name: 'madurez_ia', description: 'Madurez IA por área (media de uso diario, automatización y criterio), siempre agregada: no se publica ningún grupo de menos de 5 personas.',
    input_schema: { type: 'object', properties: {} } },
];

const normalizar = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

function ejecutarHerramienta(nombre, entrada, datos, motor) {
  const { calcular, comparar, vacante } = motor;
  const r = calcular(datos);
  const persona = id => datos.empleados.find(e => e.id === id);
  const nombreDe = id => persona(id)?.nombre || id;
  const skillNombre = id => datos.taxonomia.skills.find(s => s.id === id)?.nombre || id;
  const resumenFuncion = f => ({ id: f.id, nombre: f.nombre, area: f.area, criticidad: f.criticidad, semaforo: f.semaforo, prioridad: f.prioridad,
    cobertura: f.cobertura, objetivo: f.objetivo, respuesta: f.respuesta === 'redisenar' ? 'rediseñar con IA' : 'cubrir',
    sostienen: f.skills.reduce((a, b) => (b.cobertura < a.cobertura ? b : a)).personas.map(nombreDe) });
  const keyPeople = res => res.key_people.map(k => ({ nombre: k.nombre, rol: k.rol, area: k.area, oculta: k.oculta, funciones: k.funciones.map(f => f.funcion) }));
  const cuenta = res => res.funciones.reduce((m, f) => ((m[f.semaforo] = (m[f.semaforo] || 0) + 1), m), { rojo: 0, ambar: 0, verde: 0 });

  if (nombre === 'consultar_mapa') {
    return { mapa: cuenta(r), funciones_en_riesgo: r.funciones.filter(f => f.semaforo !== 'verde').map(resumenFuncion), key_people: keyPeople(r) };
  }
  if (nombre === 'buscar_persona') {
    const q = normalizar(entrada.texto);
    if (!q) return { error: 'Falta el texto a buscar' };
    const halladas = datos.empleados.filter(e => normalizar(e.id) === q || normalizar(e.nombre).includes(q)).slice(0, 5);
    if (!halladas.length) return { personas: [], nota: `No hay nadie que coincida con "${entrada.texto}"` };
    return { personas: halladas.map(e => {
      const kp = r.key_people.find(k => k.id === e.id);
      return { id: e.id, nombre: e.nombre, rol: e.rol, area: e.area, estado: e.estado, manager: nombreDe(e.manager_id),
        skills_validadas: datos.skills.filter(s => s.empleado_id === e.id && +s.nivel_validado > 0).map(s => ({ skill: skillNombre(s.skill_id), nivel: +s.nivel_validado })),
        key_person_en: kp ? kp.funciones.map(f => f.funcion) : [] };
    }) };
  }
  if (nombre === 'simular_baja') {
    const id = String(entrada.empleado_id || '').trim().toUpperCase();
    const e = persona(id);
    if (!e) return { error: `No existe ninguna persona con id ${id}. Usa buscar_persona.` };
    if (e.estado !== 'activo') return { error: `${e.nombre} ya no está activa: no se puede simular su baja.` };
    const vac = vacante(datos, id);
    const tras = calcular({ ...datos, empleados: datos.empleados.map(x => (x.id === id ? { ...x, estado: 'baja' } : x)) });
    const cambios = comparar(r, tras).map(c => ({ ...c, nombre: tras.funciones.find(f => f.id === c.id).nombre }));
    const antes = new Set(r.key_people.map(k => k.id));
    return {
      simulacion: `Baja de ${e.nombre} (${e.rol}). No se ha cambiado nada en el HRIS.`,
      funciones_que_empeoran: cambios.filter(c => c.cambio === 'empeora').map(c => ({ id: c.id, nombre: c.nombre, de: c.de, a: c.a, cobertura_antes: c.cobertura_antes, cobertura_despues: c.cobertura_despues })),
      mapa_antes: cuenta(r), mapa_despues: cuenta(tras),
      nuevas_key_people: keyPeople(tras).filter(k => !antes.has(tras.key_people.find(x => x.nombre === k.nombre).id)),
      puesto: { rol: vac.rol, equipo: vac.equipo, perfil: vac.perfil.map(p => ({ skill: skillNombre(p.skill), nivel: p.nivel })),
        candidatos_internos: vac.candidatos.map(c => ({ nombre: c.nombre, rol: c.rol, cumple: `${c.cumple} de ${c.de}`,
          brechas: c.brechas.map(b => ({ skill: skillNombre(b.skill), tiene: b.tiene, necesita: b.necesita, formacion: b.formacion })), ya_es_key_person_en: c.key_person_en })) },
    };
  }
  if (nombre === 'candidatos_para_funcion') {
    const fid = String(entrada.funcion_id || '').trim().toUpperCase();
    const f = r.funciones.find(x => x.id === fid);
    if (!f) return { error: `No existe la función ${fid}. Usa consultar_mapa para ver los ids.` };
    return { ...resumenFuncion(f), skills: f.skills.map(s => ({ skill: skillNombre(s.skill), nivel_minimo: s.nivel_minimo, cobertura: s.cobertura, semaforo: s.semaforo,
      cubren: s.personas.map(nombreDe), backups_en_desarrollo: s.backups_en_desarrollo.map(nombreDe),
      a_un_nivel: (s.candidatos || []).map(c => ({ nombre: c.nombre, area: c.area, con_interes: c.con_interes, ya_es_key_person: c.es_key_person })),
      formacion: (s.formacion || []).map(id => { const c = datos.catalogo.find(x => x.id === id); return { id, nombre: c.nombre, semanas: c.semanas }; }) })) };
  }
  if (nombre === 'madurez_ia') return { madurez_por_area: r.madurez_ia };
  return { error: `No existe la herramienta ${nombre}` };
}

// Una línea legible de lo que devolvió una herramienta, para enseñar cómo ha razonado el agente
function resumenResultado(nombre, res) {
  if (res.error) return res.error;
  if (nombre === 'consultar_mapa') return `Mapa ${res.mapa.rojo}·${res.mapa.ambar}·${res.mapa.verde}; ${res.funciones_en_riesgo.length} funciones en riesgo; ${res.key_people.length} key people`;
  if (nombre === 'buscar_persona') return res.personas.length ? res.personas.map(p => `${p.id} ${p.nombre} (${p.rol})`).join('; ') : res.nota;
  if (nombre === 'simular_baja') {
    const nf = res.funciones_que_empeoran.length, nc = res.puesto.candidatos_internos.length;
    return `${nf === 1 ? '1 función empeora' : `${nf} funciones empeoran`} (${res.funciones_que_empeoran.map(f => `${f.id} ${f.de}→${f.a}`).join(', ') || 'ninguna'}); ${nc === 1 ? '1 candidato interno' : `${nc} candidatos internos`}`;
  }
  if (nombre === 'candidatos_para_funcion') return `${res.id} ${res.semaforo} ${res.prioridad}; cobertura ${res.cobertura}/${res.objetivo}`;
  if (nombre === 'madurez_ia') return `${res.madurez_por_area.length} áreas publicadas`;
  return '';
}

module.exports = { HERRAMIENTAS, ejecutarHerramienta, resumenResultado };
