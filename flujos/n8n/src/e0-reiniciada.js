// Escenario 0 · nodo "Página reiniciada": confirma el reinicio y vuelve al panel a los 2 segundos.
const cfg = $('Configuración').first().json;
const panel = String(cfg.webhookUrl || '').replace(/acme-reiniciar.*$/, 'acme-panel');
const n = $('Filas iniciales').all().length;
return [{ json: { html: `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="2;url=${panel}">
<div style="font-family:system-ui,sans-serif;margin:40px"><h2>Demo reiniciada</h2><p>${n} filas cargadas desde los CSV iniciales del repositorio. Volviendo al panel…</p><p><a href="${panel}">Ir al panel</a></p></div>` } }];
