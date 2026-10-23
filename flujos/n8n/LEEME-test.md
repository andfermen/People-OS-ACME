# Prueba de captura de skills (D-04)

`test-captura-skills.json` es el primer workflow que se construyó: sirvió para elegir n8n como orquestador (D-04) y deja probada la **captura** de skills, que está diseñada pero no forma parte de la demo.

**Qué hace:** un formulario recibe el id de una persona y un texto libre sobre lo que hace → Claude lo normaliza contra `definiciones/taxonomia-skills.yaml` con `prompts/normalizar-skills.md` (skill, nivel propuesto, evidencia, pregunta para el manager) → las filas se guardan en la hoja `captura-pendiente` con `validado_por = pendiente`. El nivel no cuenta hasta que lo valida el manager.

**Para probarlo:**
1. En n8n: *Workflows → ⋯ → Import from file* → `flujos/n8n/test-captura-skills.json`.
2. Nodo **Claude normaliza** → credencial **Header Auth** (`x-api-key` = la clave de API de Claude).
3. Nodo **Guardar en Sheet** → credencial de Google Sheets; en *Document*, cambia `PEGAR_ID_DEL_SHEET` por el ID del Sheet. La hoja `captura-pendiente` lleva la cabecera `empleado_id,skill_id,nivel_declarado,nivel_validado,validado_por,fecha,evidencia,confianza,pregunta_para_manager,intereses`.
4. **Test workflow** → en el formulario, `empleado_id` = `E009` y como texto el ejemplo 1 de `prompts/normalizar-skills.md`.
5. En `captura-pendiente` aparecen unas 3 filas (`operativa-wallets`, `gestion-claves`, `analisis-blockchain`) pendientes de validar.

Este workflow no usa el adaptador HRIS (D-24) porque es anterior; si la captura entrara en la demo, escribiría a través de él.
