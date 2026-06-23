// ============================================================
// inicio.js — Lógica de la pantalla de selección de rol (index.html)
// ============================================================
// Este archivo NO toca localStorage directo en ningún lado: todo lo
// que necesita pedirle o decirle a los datos pasa por almacen.js.
// Así, si almacen.js cambia por dentro (ej: a una API en la nube),
// este archivo no se entera ni necesita cambiar.

import {
  obtenerConfig,
  guardarConfig,
  hayProductosGuardados,
  guardarProductos,
  guardarRolActual,
  agregarVenta,
} from "./almacen.js";
import { productosEjemplo, configEjemplo, generarVentasEjemplo } from "./datos-ejemplo.js";

// Se ejecuta una sola vez, la primera vez que alguien abre la app en
// ese navegador. Si ya hay productos guardados, no hace nada: no
// queremos pisar el catálogo (ni las ventas) real de un negocio con
// los de ejemplo.
function inicializarDatosSiEsNecesario() {
  if (!hayProductosGuardados()) {
    guardarProductos(productosEjemplo);
    // Sembramos también ventas de varios días, para que el dashboard y
    // el histórico (módulo 5) se vean con datos reales desde el primer
    // arranque, no en blanco.
    generarVentasEjemplo().forEach((venta) => agregarVenta(venta));
  }
  if (!obtenerConfig()) {
    guardarConfig(configEjemplo);
  }
}

function mostrarNombreNegocio() {
  const config = obtenerConfig();
  const elementoNombre = document.querySelector("[data-nombre-negocio]");
  // El operador `?.` (encadenamiento opcional) evita un error si config
  // todavía fuera null: en vez de tronar el script, simplemente no hace
  // nada en ese caso. Aquí es un seguro extra, porque ya nos asegruamos
  // arriba de que config exista.
  if (elementoNombre && config) {
    elementoNombre.textContent = config.nombreNegocio;
  }
}

function elegirRol(rol) {
  guardarRolActual(rol);
  window.location.href = "pos.html";
}

// DOMContentLoaded se dispara cuando el HTML ya está completamente
// cargado y listo para manipularse. Si corriéramos este código antes
// de ese momento, document.querySelector no encontraría los botones
// porque todavía no existirían en la página.
document.addEventListener("DOMContentLoaded", () => {
  inicializarDatosSiEsNecesario();
  mostrarNombreNegocio();

  // querySelectorAll regresa una lista de TODOS los elementos que
  // tengan el atributo data-rol (en este caso, las dos tarjetas).
  // forEach recorre esa lista uno por uno para conectarles su evento.
  document.querySelectorAll("[data-rol]").forEach((tarjeta) => {
    // addEventListener "escucha" el clic en vez de usar onclick="" en
    // el HTML: mantiene el HTML limpio y permite escuchar varios
    // eventos sobre el mismo elemento sin pisarse entre sí.
    tarjeta.addEventListener("click", () => {
      // dataset.rol lee el atributo data-rol="..." del elemento como
      // texto normal de JS (ej: "mostrador" o "dueño").
      elegirRol(tarjeta.dataset.rol);
    });
  });
});
