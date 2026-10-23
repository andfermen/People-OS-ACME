// Subworkflow HRIS · nodo "Tablas" (operación leer, D-24): junta lo que han leído los nodos de cada hoja en un solo objeto
// { tablas: { hoja: [filas] }, enlace } y lo devuelve al escenario que ha llamado. Con otro HRIS (Factorial, Bizneo),
// solo cambian los nodos de lectura de este subworkflow: la forma de lo que devuelve es la misma.
const cfgHris = $('Configuración HRIS').first().json;
const resultado = {};
for (const [hoja, nodo] of Object.entries(LECTURAS)) {
  try { resultado[hoja] = $(nodo).all().map(i => i.json); } catch (err) { resultado[hoja] = []; }
}
return [{ json: { tablas: resultado, enlace: `https://docs.google.com/spreadsheets/d/${cfgHris.sheet_id}/edit` } }];
