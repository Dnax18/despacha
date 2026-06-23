// ============================================================
// almacen.js — CAPA DE DATOS (el único archivo que toca localStorage)
// ============================================================
// Idea clave: TODO el resto de la app (selección de rol, POS, catálogo,
// dashboard...) va a pedir y guardar datos llamando a las funciones de
// AQUÍ (obtenerProductos, guardarVenta, etc.). Nunca va a escribir
// "localStorage.setItem(...)" directamente.
//
// ¿Por qué? Porque si en el futuro Despacha se conecta a una base de
// datos en la nube en vez de localStorage, solo hay que reescribir
// ESTE archivo. El resto del código sigue llamando a las mismas
// funciones con los mismos nombres, sin enterarse del cambio.
// ============================================================

// Prefijo para todas las llaves: evita que Despacha choque con datos
// de otra app que use el mismo navegador (si las dos guardaran algo
// con la llave "config", se pisarían entre sí).
const PREFIJO = "despacha_";

// Centralizamos los nombres de las "colecciones" de datos en un solo
// objeto. Si algún día cambia el nombre de una llave, se cambia aquí
// una sola vez en vez de buscarla regada por todo el archivo.
const LLAVES = {
  productos: PREFIJO + "productos",
  config: PREFIJO + "config",
  rol: PREFIJO + "rol",
  ventas: PREFIJO + "ventas",
  mermas: PREFIJO + "mermas",
  entradas: PREFIJO + "entradas",
};

// ---- Helpers internos (NO se exportan: solo los usan las funciones
// públicas de más abajo) ----
// Esto es "encapsular": el resto del proyecto no necesita saber que
// por dentro convertimos los datos a JSON. Solo le importa el resultado.

function leer(llave, valorPorDefecto) {
  const guardado = localStorage.getItem(llave);
  // localStorage devuelve `null` cuando esa llave nunca se ha guardado
  // (ej: primera vez que se abre la app). En ese caso regresamos un
  // valor por defecto en vez de null, para que quien llama a esta
  // función no tenga que acordarse de revisar null cada vez que la usa.
  if (guardado === null) return valorPorDefecto;
  // localStorage solo entiende texto. Lo que guardamos como JSON
  // (texto) hay que "parsearlo" de vuelta a objeto/array de JS.
  return JSON.parse(guardado);
}

function escribir(llave, valor) {
  // JSON.stringify hace lo opuesto a JSON.parse: convierte un objeto
  // o array de JS a texto plano, que es lo único que localStorage
  // puede guardar (no acepta objetos directamente).
  localStorage.setItem(llave, JSON.stringify(valor));
}

function borrar(llave) {
  localStorage.removeItem(llave);
}

// ---- Productos ----

// `export` antes de una función permite que otros archivos hagan
// `import { obtenerProductos } from "./almacen.js"` y la usen.
// Es la forma moderna de compartir código entre archivos sin
// depender de variables globales sueltas.
export function obtenerProductos() {
  return leer(LLAVES.productos, []);
}

export function guardarProductos(productos) {
  escribir(LLAVES.productos, productos);
}

export function hayProductosGuardados() {
  // Útil para decidir, al abrir la app por primera vez, si hace falta
  // cargar los datos de ejemplo del demo o si el negocio ya tiene
  // su propio catálogo capturado.
  return localStorage.getItem(LLAVES.productos) !== null;
}

// ---- Configuración del negocio (nombre, giro, logo, moneda) ----

export function obtenerConfig() {
  return leer(LLAVES.config, null);
}

export function guardarConfig(config) {
  escribir(LLAVES.config, config);
}

// ---- Rol activo (Mostrador / Dueño) ----
// Guardamos el rol elegido en localStorage —y no en una variable normal
// de JavaScript— porque una variable se borra de la memoria en cuanto
// se cierra o recarga la pestaña. localStorage sobrevive a eso.

export function obtenerRolActual() {
  return leer(LLAVES.rol, null);
}

export function guardarRolActual(rol) {
  escribir(LLAVES.rol, rol);
}

export function cerrarSesionRol() {
  borrar(LLAVES.rol);
}

// ---- Ventas ----
// El modelo de datos completo ya está definido en el plan del producto,
// así que dejamos estas funciones listas desde ahora. Cuando se
// construya el módulo 2 (POS), ese módulo solo las USA: no necesita
// volver a tocar este archivo.

export function obtenerVentas() {
  return leer(LLAVES.ventas, []);
}

export function agregarVenta(venta) {
  const ventas = obtenerVentas();
  ventas.push(venta);
  escribir(LLAVES.ventas, ventas);
}

// Sobreescribe la lista completa de ventas. Se usa al EDITAR una venta
// que ya existía (corregir un error del mostrador), a diferencia de
// agregarVenta que solo sirve para sumar una nueva al final.
export function guardarVentas(ventas) {
  escribir(LLAVES.ventas, ventas);
}

// ---- Merma (se usará desde el módulo de inventario/merma) ----

export function obtenerMermas() {
  return leer(LLAVES.mermas, []);
}

export function agregarMerma(merma) {
  const mermas = obtenerMermas();
  mermas.push(merma);
  escribir(LLAVES.mermas, mermas);
}

// ---- Entradas de mercancía / compras (módulo de inventario) ----

export function obtenerEntradas() {
  return leer(LLAVES.entradas, []);
}

export function agregarEntrada(entrada) {
  const entradas = obtenerEntradas();
  entradas.push(entrada);
  escribir(LLAVES.entradas, entradas);
}
