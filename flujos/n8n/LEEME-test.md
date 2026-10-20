# Prueba n8n vs Make (miércoles a mediodía, máx. 1 h)

**Objetivo:** decidir el orquestador (D-04). Si este workflow funciona en ~1 h → n8n. Si no → Make.

## Antes de empezar
- Cuenta n8n cloud (prueba gratuita) y la cuenta Google de la demo.
- Una **API key de Claude** (console.anthropic.com → API Keys).
- El Sheet ya montado (`salidas/sheets/LEEME.md`), con una hoja vacía más llamada `captura-pendiente` cuya fila 1 sea:
  `empleado_id,skill_id,nivel_declarado,nivel_validado,validado_por,fecha,evidencia,confianza,pregunta_para_manager,intereses`
- El flujo lee la taxonomía y el prompt desde GitHub. **Ahora el repo es privado**, así que elige una opción:
  - **A (recomendada, todos los datos son ficticios):** GitHub → *Settings → General → Change visibility → Public*.
  - **B:** dejarlo privado. Crea un token en GitHub (*Settings → Developer settings → Fine-grained tokens*, solo lectura de *Contents* de este repo) y, en los dos nodos *Leer …*, añade una credencial **Header Auth** con Name `Authorization` y Value `Bearer <token>`.

## Pasos
1. En n8n: **Workflows → ⋯ → Import from file** → `flujos/n8n/test-captura-skills.json`.
2. Nodo **Claude normaliza** → *Credential* → *Create new* → **Header Auth**: Name `x-api-key`, Value = tu API key. Guarda.
3. Nodo **Guardar en Sheet** → *Credential* → *Create new* → **Google Sheets OAuth2** → inicia sesión con la cuenta de la demo. En *Document* cambia `PEGAR_ID_DEL_SHEET` por el ID del Sheet.
4. Pulsa **Test workflow**. Se abre el formulario. Rellénalo:
   - `empleado_id`: `E009`
   - `texto`: el ejemplo 1 de `prompts/normalizar-skills.md` (operador de custodia).
5. Comprueba que en `captura-pendiente` aparecen ~3 filas (`operativa-wallets`, `gestion-claves`, `analisis-blockchain`) con `validado_por = pendiente`.

## Criterio
| Resultado | Decisión |
|---|---|
| Funciona en ≤ 1 h | **n8n**. El cálculo va en un nodo de código con `calculo/cobertura.js` |
| Se atasca en credenciales o nodos | **Make**. El cálculo va en fórmulas de Sheets, contrastadas con `npm run verificar` |

Apunta lo que pase (tiempo y dónde te atascaste) y Claude lo registra en `docs/decisiones.md`.

## Si falla
- **401 en Claude:** la cabecera debe llamarse exactamente `x-api-key`.
- **404 al leer el repo:** el repo es privado o la rama no es `main`.
- **El JSON de Claude no se parsea:** revisa la salida del nodo *Claude normaliza*. El nodo siguiente recorta el texto entre la primera `{` y la última `}`.
