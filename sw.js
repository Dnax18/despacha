// ============================================================
// sw.js — Service Worker de Despacha (lo que la hace una PWA "real")
// ============================================================
// Un service worker es un script que el navegador corre POR FUERA de
// la página (no tiene acceso al DOM), incluso si la pestaña está
// cerrada. Aquí lo usamos para dos cosas:
//   1. Que el navegador pueda "instalar" Despacha como si fuera una
//      app nativa (agregar a pantalla de inicio / escritorio).
//   2. Que, después de la primera visita, la app siga abriendo aunque
//      no haya internet (los DATOS ya viven en localStorage; lo que
//      falta sin esto son los archivos HTML/CSS/JS en sí).

// Cambiar este número de versión es la forma de avisarle al navegador
// "hay una versión nueva, descarta la copia vieja" la próxima vez que
// se actualicen estos archivos.
const CACHE_NAME = "despacha-cache-v1";

// El "app shell": todo lo que Despacha necesita para dibujarse, sin
// contar los datos (esos viven en localStorage, no aquí).
const ARCHIVOS_APP_SHELL = [
  "./",
  "./index.html",
  "./pos.html",
  "./catalogo.html",
  "./inventario.html",
  "./dashboard.html",
  "./historico.html",
  "./css/estilos.css",
  "./js/almacen.js",
  "./js/formato.js",
  "./js/datos-ejemplo.js",
  "./js/inicio.js",
  "./js/pos.js",
  "./js/catalogo.js",
  "./js/inventario.js",
  "./js/dashboard.js",
  "./js/historico.js",
  "./js/registro-pwa.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// "install" se dispara una sola vez, cuando el navegador descarga este
// archivo por primera vez (o detecta que cambió). Aquí aprovechamos
// para descargar y guardar de una vez todo el app shell.
self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_APP_SHELL)));
});

// "activate" se dispara cuando este service worker toma control (después
// de instalarse). Aquí borramos cachés de versiones viejas, para que
// no se vayan acumulando archivos obsoletos para siempre.
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nombresGuardados) =>
      Promise.all(
        nombresGuardados
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    )
  );
});

// "fetch" se dispara cada vez que la página pide CUALQUIER archivo
// (una imagen, un .js, la página misma). Aquí decidimos de dónde sale
// la respuesta: primero intentamos internet (para que, si hay
// conexión, siempre se vea la versión más reciente); si eso falla
// (sin internet), usamos la copia guardada.
self.addEventListener("fetch", (evento) => {
  const peticion = evento.request;
  const esDeNuestroSitio = new URL(peticion.url).origin === location.origin;

  // Solo interceptamos peticiones GET de nuestro propio sitio. Las
  // fuentes de Google (otro origen) y cualquier POST/PUT se dejan
  // pasar tal cual, sin pasar por la caché.
  if (peticion.method !== "GET" || !esDeNuestroSitio) return;

  evento.respondWith(
    fetch(peticion)
      .then((respuestaDeRed) => {
        // Cada vez que SÍ hay internet, actualizamos la copia guardada
        // con la respuesta fresca. .clone() es necesario porque una
        // respuesta solo se puede "leer" una vez; clonarla nos da una
        // copia independiente para guardar mientras la original se
        // regresa a la página.
        const copia = respuestaDeRed.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(peticion, copia));
        return respuestaDeRed;
      })
      .catch(() => caches.match(peticion))
  );
});
