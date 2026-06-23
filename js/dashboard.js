// ============================================================
// dashboard.js — Lógica del dashboard (dashboard.html)
// ============================================================
// Pantalla exclusiva del Dueño (sección 3 del plan). Aquí no se
// guarda nada nuevo: solo se LEE lo que ya guardaron pos.js
// (ventas) e inventario.js (mermas) para sacar las cuentas. Por eso
// este archivo solo importa funciones "obtener..." de almacen.js.

import { obtenerProductos, obtenerVentas, obtenerMermas, obtenerConfig, obtenerRolActual, cerrarSesionRol } from "./almacen.js";
import { formatoMoneda, pluralizar } from "./formato.js";

let productos = [];
let periodoActual = "hoy";

// ============================================================
// Arranque y permisos
// ============================================================

function verificarAcceso() {
  const rol = obtenerRolActual();
  if (!rol) {
    window.location.href = "index.html";
    return false;
  }
  if (rol !== "dueño") {
    window.location.href = "pos.html";
    return false;
  }
  return true;
}

function pintarBarraSuperior() {
  const config = obtenerConfig();
  document.querySelector("[data-nombre-negocio]").textContent = config.nombreNegocio;
  document.querySelector("[data-rol-actual]").textContent = "Dueño";
}

// ============================================================
// Filtro por periodo (Hoy / Esta semana / Este mes)
// ============================================================

// "Esta semana" son los últimos 7 días corridos (incluyendo hoy), no
// la semana de calendario: así evitamos la discusión de si la semana
// empieza lunes o domingo, y es más fácil de explicar ("lo de los
// últimos 7 días") que de programar mal por accidente.
function fechaEstaEnPeriodo(fechaIso, periodo) {
  const hoyIso = new Date().toISOString().slice(0, 10);

  if (periodo === "hoy") return fechaIso === hoyIso;

  if (periodo === "semana") {
    // Restar dos fechas en JS da milisegundos; dividir entre los
    // milisegundos que tiene un día (1000 × 60 × 60 × 24) lo convierte
    // a días completos de diferencia.
    const diasDeDiferencia = (new Date(hoyIso) - new Date(fechaIso)) / (1000 * 60 * 60 * 24);
    return diasDeDiferencia >= 0 && diasDeDiferencia < 7;
  }

  // periodo === "mes": comparamos solo "YYYY-MM" (los primeros 7
  // caracteres de la fecha), así agarra el mes de calendario completo.
  return fechaIso.slice(0, 7) === hoyIso.slice(0, 7);
}

// ============================================================
// Cálculo de las cifras del dashboard
// ============================================================

function calcularResumen() {
  // Una venta reembolsada se queda en el histórico como rastro de que
  // existió, pero para las cuentas del dashboard se trata como si el
  // dinero nunca hubiera entrado (el producto también regresó al
  // stock cuando se reembolsó).
  const ventasFiltradas = obtenerVentas()
    .filter((venta) => !venta.reembolsada)
    .filter((venta) => fechaEstaEnPeriodo(venta.fecha, periodoActual));
  const mermasFiltradas = obtenerMermas().filter((merma) => fechaEstaEnPeriodo(merma.fecha, periodoActual));

  let ventaTotal = 0;
  let gananciaEstimada = 0;
  // Un objeto normal de JS funciona aquí como "diccionario": la llave
  // es el id del producto y el valor es el margen acumulado de ese
  // producto en el periodo.
  const margenPorProducto = {};
  // Ídem, pero la llave aquí es el método de pago ("efectivo" o
  // "tarjeta"), para saber cuánto entró por cada uno.
  const ingresosPorMetodo = { efectivo: 0, tarjeta: 0 };
  const ventasPorMetodo = { efectivo: 0, tarjeta: 0 };

  ventasFiltradas.forEach((venta) => {
    ventaTotal += venta.total;
    ingresosPorMetodo[venta.metodoPago] += venta.total;
    ventasPorMetodo[venta.metodoPago] += 1;

    venta.items.forEach((item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      // Si el producto ya no existe (se borró del catálogo), tratamos
      // su costo como 0 en vez de tronar: la venta sí pasó, aunque ya
      // no podamos saber con exactitud cuánto costaba ese producto.
      const costoUnitario = producto ? producto.costo : 0;
      const margenItem = item.subtotal - costoUnitario * item.cantidad;

      gananciaEstimada += margenItem;
      margenPorProducto[item.productoId] = (margenPorProducto[item.productoId] || 0) + margenItem;
    });
  });

  const mermaTotal = mermasFiltradas.reduce((acumulado, merma) => acumulado + merma.costoPerdido, 0);

  return {
    ventaTotal,
    numVentas: ventasFiltradas.length,
    gananciaEstimada,
    mermaTotal,
    numMermas: mermasFiltradas.length,
    productoEstrella: encontrarProductoEstrella(margenPorProducto),
    ingresosPorMetodo,
    ventasPorMetodo,
  };
}

function encontrarProductoEstrella(margenPorProducto) {
  const entradas = Object.entries(margenPorProducto);
  if (entradas.length === 0) return null;

  // reduce para encontrar la entrada con el margen más alto, sin tener
  // que ordenar todo el array primero (más directo para solo "el más
  // grande de todos").
  const [productoIdGanador, margenGanador] = entradas.reduce((mejorHastaAhora, actual) =>
    actual[1] > mejorHastaAhora[1] ? actual : mejorHastaAhora
  );

  const producto = productos.find((p) => p.id === productoIdGanador);
  return {
    nombre: producto ? producto.nombre : "(producto eliminado)",
    margen: margenGanador,
  };
}

// ============================================================
// Pintar las tarjetas
// ============================================================

function pintarDashboard() {
  const resumen = calcularResumen();

  document.querySelector("[data-dato-venta-total]").textContent = formatoMoneda(resumen.ventaTotal);
  document.querySelector("[data-dato-num-ventas]").textContent = pluralizar(resumen.numVentas, "venta", "ventas");

  document.querySelector("[data-dato-ganancia]").textContent = formatoMoneda(resumen.gananciaEstimada);

  document.querySelector("[data-dato-merma]").textContent = formatoMoneda(resumen.mermaTotal);
  document.querySelector("[data-dato-merma-detalle]").textContent = pluralizar(resumen.numMermas, "registro", "registros");

  const cifraEstrella = document.querySelector("[data-dato-producto-estrella]");
  const detalleEstrella = document.querySelector("[data-dato-producto-estrella-margen]");
  if (resumen.productoEstrella) {
    cifraEstrella.textContent = resumen.productoEstrella.nombre;
    detalleEstrella.textContent = `Dejó ${formatoMoneda(resumen.productoEstrella.margen)} de margen`;
  } else {
    cifraEstrella.textContent = "—";
    detalleEstrella.textContent = "";
  }

  document.querySelector("[data-dato-ingreso-efectivo]").textContent = formatoMoneda(resumen.ingresosPorMetodo.efectivo);
  document.querySelector("[data-dato-ventas-efectivo]").textContent = pluralizar(resumen.ventasPorMetodo.efectivo, "venta", "ventas");

  document.querySelector("[data-dato-ingreso-tarjeta]").textContent = formatoMoneda(resumen.ingresosPorMetodo.tarjeta);
  document.querySelector("[data-dato-ventas-tarjeta]").textContent = pluralizar(resumen.ventasPorMetodo.tarjeta, "venta", "ventas");

  document.querySelector("[data-dashboard-vacio]").hidden = resumen.numVentas > 0;
}

// ============================================================
// Conexión de eventos al cargar la página
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAcceso()) return;

  productos = obtenerProductos();

  pintarBarraSuperior();
  pintarDashboard();

  document.querySelectorAll("[data-periodo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      periodoActual = boton.dataset.periodo;
      document.querySelectorAll("[data-periodo]").forEach((otro) => {
        otro.setAttribute("aria-pressed", otro === boton);
      });
      pintarDashboard();
    });
  });

  document.querySelector("[data-cambiar-rol]").addEventListener("click", () => {
    cerrarSesionRol();
    window.location.href = "index.html";
  });
});
