// ============================================================
// inventario.js — Lógica de la pantalla de inventario y merma
// ============================================================
// Esta pantalla es exclusiva del Dueño (sección 3 del plan): a
// diferencia del catálogo, aquí ni siquiera dejamos entrar al
// Mostrador. Igual que el resto de los módulos, solo habla con los
// datos a través de almacen.js.

import {
  obtenerProductos,
  guardarProductos,
  obtenerConfig,
  obtenerRolActual,
  cerrarSesionRol,
  obtenerMermas,
  agregarMerma,
  obtenerEntradas,
  agregarEntrada,
} from "./almacen.js";
import { formatoMoneda } from "./formato.js";

let productos = [];
let terminoBusqueda = "";
let productoEnTurno = null; // el producto que está abierto en el modal de entrada o merma

// ============================================================
// Arranque y permisos
// ============================================================

function verificarAcceso() {
  const rol = obtenerRolActual();
  if (!rol) {
    window.location.href = "index.html";
    return false;
  }
  // Inventario y merma son solo para el Dueño. Si un Mostrador llega
  // aquí (por ejemplo, escribiendo la URL directo), lo regresamos al
  // POS en vez de mostrarle algo que no le corresponde.
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
// Tabla de inventario (stock actual + acciones)
// ============================================================

function obtenerProductosFiltrados() {
  if (terminoBusqueda.trim() === "") return productos;
  const texto = terminoBusqueda.trim().toLowerCase();
  return productos.filter((producto) => producto.nombre.toLowerCase().includes(texto));
}

function pintarTablaInventario() {
  const tabla = document.querySelector("[data-tabla-inventario]");
  const vacio = document.querySelector("[data-inventario-vacio]");
  const cuerpo = document.querySelector("[data-cuerpo-inventario]");
  const lista = obtenerProductosFiltrados();

  if (productos.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    vacio.textContent = "Aún no hay productos en el catálogo.";
    return;
  }

  if (lista.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    vacio.textContent = "No se encontró ningún producto.";
    return;
  }

  tabla.hidden = false;
  vacio.hidden = true;

  cuerpo.innerHTML = lista
    .map(
      (producto) => `
        <tr>
          <td>${producto.nombre}</td>
          <td>${producto.categoria}</td>
          <td class="celda-numero">${producto.stock} ${producto.unidad}</td>
          <td>
            <div class="catalogo__acciones-fila">
              <button type="button" class="boton-editar" data-abrir-entrada="${producto.id}">Entrada</button>
              <button type="button" class="boton-editar" data-abrir-ajuste="${producto.id}">Ajustar</button>
              <button type="button" class="boton-eliminar" data-abrir-merma="${producto.id}">Merma</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  cuerpo.querySelectorAll("[data-abrir-entrada]").forEach((boton) => {
    boton.addEventListener("click", () => abrirModalEntrada(boton.dataset.abrirEntrada));
  });

  cuerpo.querySelectorAll("[data-abrir-ajuste]").forEach((boton) => {
    boton.addEventListener("click", () => abrirModalAjuste(boton.dataset.abrirAjuste));
  });

  cuerpo.querySelectorAll("[data-abrir-merma]").forEach((boton) => {
    boton.addEventListener("click", () => abrirModalMerma(boton.dataset.abrirMerma));
  });
}

// ============================================================
// Modal: registrar entrada de mercancía (compra)
// ============================================================

function abrirModalEntrada(productoId) {
  productoEnTurno = productos.find((producto) => producto.id === productoId);

  document.querySelector("[data-form-entrada]").reset();
  document.querySelector("[data-entrada-error]").textContent = "";
  document.querySelector("[data-entrada-nombre]").textContent = `Entrada de ${productoEnTurno.nombre}`;
  document.querySelector("[data-entrada-stock-actual]").textContent =
    `Stock actual: ${productoEnTurno.stock} ${productoEnTurno.unidad}`;
  document.querySelector("[data-entrada-etiqueta]").textContent =
    `Cantidad recibida (${productoEnTurno.unidad})`;

  document.querySelector("[data-overlay-entrada]").hidden = false;
}

function cerrarModalEntrada() {
  document.querySelector("[data-overlay-entrada]").hidden = true;
  productoEnTurno = null;
}

function manejarSubmitEntrada(evento) {
  evento.preventDefault();

  const cantidad = Number.parseFloat(document.querySelector("[data-campo-entrada-cantidad]").value);
  const error = document.querySelector("[data-entrada-error]");

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    error.textContent = "Falta la cantidad recibida.";
    return;
  }

  agregarEntrada({
    id: crypto.randomUUID(),
    fecha: new Date().toISOString().slice(0, 10),
    productoId: productoEnTurno.id,
    cantidad,
  });

  productoEnTurno.stock += cantidad;
  guardarProductos(productos);

  cerrarModalEntrada();
  pintarTablaInventario();
  pintarTablaEntradas();
  mostrarAviso("Entrada registrada");
}

// ============================================================
// Modal: ajustar stock directo (corregir un conteo, sin merma)
// ============================================================
// A diferencia de Entrada y Merma, este ajuste NO se guarda en ningún
// historial ni se contabiliza como compra o pérdida: es solo corregir
// el número para que el sistema cuadre con lo que de verdad hay en el
// negocio (ej: un conteo físico salió distinto al del sistema).

function abrirModalAjuste(productoId) {
  productoEnTurno = productos.find((producto) => producto.id === productoId);

  document.querySelector("[data-form-ajuste]").reset();
  document.querySelector("[data-ajuste-error]").textContent = "";
  document.querySelector("[data-ajuste-nombre]").textContent = `Ajustar stock de ${productoEnTurno.nombre}`;
  document.querySelector("[data-ajuste-stock-actual]").textContent =
    `El sistema dice: ${productoEnTurno.stock} ${productoEnTurno.unidad}`;
  document.querySelector("[data-ajuste-etiqueta]").textContent =
    `Stock real (${productoEnTurno.unidad})`;
  // Arrancamos el campo con el valor actual: así, si el conteo real
  // coincide en casi todo, el Dueño solo corrige el dígito que cambió
  // en vez de teclear el número completo desde cero.
  document.querySelector("[data-campo-ajuste-cantidad]").value = productoEnTurno.stock;

  document.querySelector("[data-overlay-ajuste]").hidden = false;
}

function cerrarModalAjuste() {
  document.querySelector("[data-overlay-ajuste]").hidden = true;
  productoEnTurno = null;
}

function manejarSubmitAjuste(evento) {
  evento.preventDefault();

  const nuevoStock = Number.parseFloat(document.querySelector("[data-campo-ajuste-cantidad]").value);
  const error = document.querySelector("[data-ajuste-error]");

  if (!Number.isFinite(nuevoStock) || nuevoStock < 0) {
    error.textContent = "Escribe el stock real (no puede ser negativo).";
    return;
  }

  productoEnTurno.stock = nuevoStock;
  guardarProductos(productos);

  cerrarModalAjuste();
  pintarTablaInventario();
  mostrarAviso("Stock ajustado");
}

// ============================================================
// Modal: registrar merma
// ============================================================

function abrirModalMerma(productoId) {
  productoEnTurno = productos.find((producto) => producto.id === productoId);

  document.querySelector("[data-form-merma]").reset();
  document.querySelector("[data-merma-error]").textContent = "";
  document.querySelector("[data-merma-nombre]").textContent = `Merma de ${productoEnTurno.nombre}`;
  document.querySelector("[data-merma-stock-actual]").textContent =
    `Stock actual: ${productoEnTurno.stock} ${productoEnTurno.unidad}`;
  document.querySelector("[data-merma-etiqueta]").textContent =
    `Cantidad perdida (${productoEnTurno.unidad})`;
  document.querySelector("[data-merma-perdida-estimada]").textContent = "Pérdida estimada: $0.00";

  document.querySelector("[data-overlay-merma]").hidden = false;
}

function cerrarModalMerma() {
  document.querySelector("[data-overlay-merma]").hidden = true;
  productoEnTurno = null;
}

function pintarPerdidaEstimada() {
  const cantidad = Number.parseFloat(document.querySelector("[data-campo-merma-cantidad]").value) || 0;
  const perdida = cantidad * productoEnTurno.costo;
  document.querySelector("[data-merma-perdida-estimada]").textContent = `Pérdida estimada: ${formatoMoneda(perdida)}`;
}

function manejarSubmitMerma(evento) {
  evento.preventDefault();

  const cantidad = Number.parseFloat(document.querySelector("[data-campo-merma-cantidad]").value);
  const motivo = document.querySelector("[data-campo-merma-motivo]").value.trim();
  const error = document.querySelector("[data-merma-error]");

  if (!Number.isFinite(cantidad) || cantidad <= 0) {
    error.textContent = "Falta la cantidad perdida.";
    return;
  }
  if (cantidad > productoEnTurno.stock) {
    // No tiene sentido registrar más merma de la que hay en stock:
    // significaría perder un producto que, según el sistema, no existe.
    error.textContent = "No puedes registrar más merma que el stock actual.";
    return;
  }
  if (!motivo) {
    error.textContent = "Falta el motivo de la merma.";
    return;
  }

  const costoPerdido = Number((cantidad * productoEnTurno.costo).toFixed(2));

  agregarMerma({
    id: crypto.randomUUID(),
    fecha: new Date().toISOString().slice(0, 10),
    productoId: productoEnTurno.id,
    cantidad,
    costoPerdido,
    motivo,
  });

  productoEnTurno.stock -= cantidad;
  guardarProductos(productos);

  cerrarModalMerma();
  pintarTablaInventario();
  pintarTablaMermas();
  mostrarAviso("Merma registrada");
}

// ============================================================
// Tabla de mermas registradas
// ============================================================

function pintarTablaEntradas() {
  const tabla = document.querySelector("[data-tabla-entradas]");
  const vacio = document.querySelector("[data-entradas-vacio]");
  const cuerpo = document.querySelector("[data-cuerpo-entradas]");
  const entradas = [...obtenerEntradas()].reverse();

  if (entradas.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    return;
  }

  tabla.hidden = false;
  vacio.hidden = true;

  cuerpo.innerHTML = entradas
    .map((entrada) => {
      const producto = productos.find((item) => item.id === entrada.productoId);
      const nombreProducto = producto ? producto.nombre : "(producto eliminado)";
      const unidad = producto ? producto.unidad : "";

      return `
        <tr>
          <td>${entrada.fecha}</td>
          <td>${nombreProducto}</td>
          <td class="celda-numero">${entrada.cantidad} ${unidad}</td>
        </tr>
      `;
    })
    .join("");
}

function pintarTablaMermas() {
  const tabla = document.querySelector("[data-tabla-mermas]");
  const vacio = document.querySelector("[data-mermas-vacio]");
  const cuerpo = document.querySelector("[data-cuerpo-mermas]");
  // Recorremos de más reciente a más antigua, igual que se espera ver
  // un histórico: lo último que pasó, arriba. [...array].reverse()
  // copia el array antes de invertirlo, así no alteramos el original.
  const mermas = [...obtenerMermas()].reverse();

  if (mermas.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    return;
  }

  tabla.hidden = false;
  vacio.hidden = true;

  cuerpo.innerHTML = mermas
    .map((merma) => {
      const producto = productos.find((item) => item.id === merma.productoId);
      const nombreProducto = producto ? producto.nombre : "(producto eliminado)";
      const unidad = producto ? producto.unidad : "";

      return `
        <tr>
          <td>${merma.fecha}</td>
          <td>${nombreProducto}</td>
          <td class="celda-numero">${merma.cantidad} ${unidad}</td>
          <td class="celda-numero">${formatoMoneda(merma.costoPerdido)}</td>
          <td>${merma.motivo}</td>
        </tr>
      `;
    })
    .join("");
}

function mostrarAviso(texto) {
  const toast = document.querySelector("[data-toast]");
  toast.textContent = texto;
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

// ============================================================
// Conexión de eventos al cargar la página
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAcceso()) return;

  productos = obtenerProductos();

  pintarBarraSuperior();
  pintarTablaInventario();
  pintarTablaEntradas();
  pintarTablaMermas();

  document.querySelector("[data-buscador]").addEventListener("input", (evento) => {
    terminoBusqueda = evento.target.value;
    pintarTablaInventario();
  });

  document.querySelector("[data-cambiar-rol]").addEventListener("click", () => {
    cerrarSesionRol();
    window.location.href = "index.html";
  });

  document.querySelector("[data-entrada-cancelar]").addEventListener("click", cerrarModalEntrada);
  document.querySelector("[data-form-entrada]").addEventListener("submit", manejarSubmitEntrada);

  document.querySelector("[data-ajuste-cancelar]").addEventListener("click", cerrarModalAjuste);
  document.querySelector("[data-form-ajuste]").addEventListener("submit", manejarSubmitAjuste);

  document.querySelector("[data-merma-cancelar]").addEventListener("click", cerrarModalMerma);
  document.querySelector("[data-form-merma]").addEventListener("submit", manejarSubmitMerma);
  document.querySelector("[data-campo-merma-cantidad]").addEventListener("input", pintarPerdidaEstimada);

  // Escape cierra cualquiera de los tres modales que esté abierto en
  // ese momento, sin guardar nada.
  document.addEventListener("keydown", (evento) => {
    if (evento.key !== "Escape") return;
    if (!document.querySelector("[data-overlay-entrada]").hidden) {
      evento.preventDefault();
      cerrarModalEntrada();
    } else if (!document.querySelector("[data-overlay-ajuste]").hidden) {
      evento.preventDefault();
      cerrarModalAjuste();
    } else if (!document.querySelector("[data-overlay-merma]").hidden) {
      evento.preventDefault();
      cerrarModalMerma();
    }
  });
});
