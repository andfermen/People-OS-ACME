# Auditor del repo (control de calidad) · construido

**Definición:** [`.claude/agents/auditor-demo.md`](../.claude/agents/auditor-demo.md) (agente de Claude Code).

## Qué hace

Después de cada cambio importante recorre siete comprobaciones y devuelve una lista priorizada:

1. **Funciona:** `npm run verificar` (casos de la demo) y `npm run probar-n8n` (código de los workflows contra un Sheet simulado).
2. **Generados al día:** regenera workflows, definiciones y CSV y mira si cambiaba algo sin subir.
3. **GitHub al día:** n8n lee de ahí las definiciones y el prompt.
4. **Cifras:** compara lo que dicen el README, el plan AI first y `empresa.md` con `npm run cifras`.
5. **Privacidad:** ni emails reales, ni claves, ni el ID del Sheet en el repo; el email a dirección sin datos individuales.
6. **Coherencia:** la estructura de `CLAUDE.md`, los comandos, los nombres de nodos y la numeración de decisiones existen de verdad.
7. **Prometido y no construido:** lo que alguien podría pedir ver y no existe, con la frase para responder.

## Qué no hace

- No arregla nada (solo regenera archivos derivados) ni hace commit o push: decide quien lo usa.
- No inventa cifras: todas salen del motor o de un comando.
- No ve el Sheet real, n8n ni los emails: lo dice en "Qué no he podido comprobar". Para eso está `npm run ensayar`.

## Por qué así

- **Cifras deterministas:** un modelo que "repasa" números se equivoca; uno que compara contra la salida de un script, no.
- **Solo lectura:** un auditor que también edita esconde lo que ha cambiado. Separar auditar de arreglar es el mismo principio que separar calcular de decidir.
