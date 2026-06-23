// ============================================================
// registro-pwa.js — Activa el service worker (sw.js) en cada pantalla
// ============================================================
// Este archivo es chiquito a propósito: lo único que hace es avisarle
// al navegador "aquí está el service worker, úsalo". La lógica de qué
// guardar y cómo servirlo offline vive en sw.js, no aquí.

// No todos los navegadores (sobre todo los viejos) soportan service
// workers. Revisamos que exista antes de usarlo, en vez de asumir que
// sí y que la página truene si no.
if ("serviceWorker" in navigator) {
  // Esperamos a que la página termine de cargar para no competirle
  // ancho de banda o CPU a lo que el usuario está viendo en ese
  // momento (el registro del service worker puede esperar un poco).
  window.addEventListener("load", () => {
    // Ruta relativa (sin "/" al inicio): así sigue funcionando si algún
    // día Despacha se publica dentro de una subcarpeta (ej:
    // tusitio.com/despacha/) en vez de vivir en la raíz del dominio.
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.error("No se pudo activar el modo sin conexión:", error);
    });
  });
}
