# Montar el Google Sheet de la demo

Estos CSV se generan con `npm run sheets` (o `npm run sheets -- --fecha 2026-09-30` para fechar la foto inicial del histórico). **No se editan a mano**: se cambian los archivos de `definiciones/` o `datos/` y se regeneran.

## Pasos (~15 min)

1. Con tu cuenta de Google, crea un Sheet nuevo llamado `People OS · Acme`.
2. Por cada CSV de esta carpeta: **Archivo → Importar → Subir** → elige el CSV → *Insertar hojas nuevas*. El nombre de la hoja debe ser el del archivo sin `.csv` (por ejemplo, `cobertura`). Hojas:
   `empleados`, `skills-empleados`, `bandas-salariales`, `planes-backup`, `encuesta-clima-agregada`, `funciones`, `catalogo-formacion`, `cobertura`, `key-people`, `senales-rotacion-PEOPLE`, `historico-semaforo`, `alertas`, `madurez-ia`, `bandeja`.
3. **Mapa de calor** (hoja `cobertura`): selecciona la columna `semaforo` → *Formato → Formato condicional* → *El texto es exactamente*:
   - `rojo` → fondo rojo claro `#F4C7C3`
   - `ambar` → fondo amarillo `#FCE8B2`
   - `verde` → fondo verde claro `#B7E1CD`

   Aplica el mismo formato a toda la fila con la fórmula personalizada `=$E2="rojo"` (y lo mismo para ambar y verde) sobre el rango `A2:O`.
4. **Hoja `alertas`**: en la columna `decision`, *Datos → Validación de datos → Desplegable* con `pendiente`, `aprobada`, `descartada`.
5. **Privacidad**: haz clic derecho en la pestaña `senales-rotacion-PEOPLE` → *Proteger hoja* → solo tú puedes editarla. En la demo, comenta que en producción esta hoja vive en un archivo aparte al que solo accede People.
6. Inmoviliza la fila 1 de cada hoja (*Ver → Inmovilizar → 1 fila*).
7. Copia el ID del Sheet (el texto entre `/d/` y `/edit` en la URL). Va en el nodo **Configuración HRIS** del workflow HRIS (`flujos/n8n/LEEME.md`).

## Qué hoja escribe cada paso del flujo

| Paso | Hoja |
|---|---|
| 1 Disparo (baja) | `empleados.estado = baja` |
| 2-3 Recálculo y comparación | lee todas; escribe `cobertura`, `key-people` y añade una foto a `historico-semaforo` |
| 6 Alerta | añade filas a `alertas` con `decision = pendiente` |
| 7-8 Aprobación | `alertas.decision = aprobada` → añade una fila a `planes-backup` → vuelve al paso 1 |
