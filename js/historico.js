// ============================================================
// historico.js — Lógica del histórico de ventas (historico.html)
// ============================================================
// Pantalla exclusiva del Dueño (sección 3 del plan), igual que
// inventario.html y dashboard.html. Antes solo LEÍA ventas; ahora
// también permite EDITARLAS, para corregir un error del mostrador
// (ej: se cobró el producto equivocado o la cantidad mal).

import {
  obtenerProductos,
  guardarProductos,
  obtenerVentas,
  guardarVentas,
  obtenerConfig,
  obtenerRolActual,
  cerrarSesionRol,
} from "./almacen.js";
import { formatoMoneda, describirItems } from "./formato.js";

let productos = [];
let ventas = [];
let fechaFiltro = ""; // "" significa "sin filtro, mostrar todas"

// ---- Estado del modal de edición ----
let ventaEditandoId = null;
// itemsEditando es una copia de trabajo de los productos de la venta,
// separada de `ventas` a propósito: mientras el Dueño está editando
// (agregando, quitando, cambiando cantidades), no queremos tocar el
// dato real hasta que confirme "Guardar cambios". Así, si cancela,
// no hay que "deshacer" nada porque nunca se llegó a guardar.
let itemsEditando = [];
let metodoPagoEditando = "efectivo";
let idPendienteReembolso = null; // id de la venta que está mostrando "¿Reembolsar? Sí/No"

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

function mostrarAviso(texto, esError = false) {
  const toast = document.querySelector("[data-toast]");
  toast.textContent = texto;
  toast.classList.toggle("toast--error", esError);
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

// ============================================================
// Tabla del histórico
// ============================================================

function obtenerVentasOrdenadas() {
  const ventasFiltradas = fechaFiltro ? ventas.filter((venta) => venta.fecha === fechaFiltro) : ventas;

  // localeCompare ordena texto correctamente (incluyendo acentos);
  // aquí lo usamos sobre "fecha + hora" para que la venta más reciente
  // quede arriba sin tener que convertir nada a objetos Date.
  return [...ventasFiltradas].sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`));
}

function pintarTablaHistorico() {
  const tabla = document.querySelector("[data-tabla-historico]");
  const vacio = document.querySelector("[data-historico-vacio]");
  const cuerpo = document.querySelector("[data-cuerpo-historico]");
  const lista = obtenerVentasOrdenadas();

  if (lista.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    vacio.textContent = fechaFiltro
      ? "No hay ventas registradas ese día."
      : "Aún no hay ventas registradas. Cuando cobres en el POS, aparecen aquí.";
    return;
  }

  tabla.hidden = false;
  vacio.hidden = true;

  cuerpo.innerHTML = lista
    .map((venta) => {
      // Una venta reembolsada ya no se puede editar ni volver a
      // reembolsar: en su lugar solo se ve la etiqueta que explica su
      // estado. El registro se queda visible (no se borra) para que
      // quede el rastro de que existió.
      const celdaAcciones = venta.reembolsada
        ? `<span class="etiqueta-tipo etiqueta-reembolso">Reembolsada</span>`
        : idPendienteReembolso === venta.id
          ? `
              <span class="confirmar-eliminar">
                ¿Reembolsar?
                <button type="button" data-confirmar-reembolso-si="${venta.id}">Sí</button>
                <button type="button" data-confirmar-reembolso-no>No</button>
              </span>
            `
          : `
              <div class="catalogo__acciones-fila">
                <button type="button" class="boton-editar" data-editar-venta="${venta.id}">Editar</button>
                <button type="button" class="boton-eliminar" data-reembolsar-venta="${venta.id}">Reembolsar</button>
              </div>
            `;

      return `
        <tr class="${venta.reembolsada ? "fila-reembolsada" : ""}">
          <td>${venta.fecha}</td>
          <td>${venta.hora}</td>
          <td class="celda-items">${describirItems(venta.items, productos)}</td>
          <td class="celda-numero">${formatoMoneda(venta.total)}</td>
          <td><span class="etiqueta-tipo">${venta.metodoPago === "tarjeta" ? "Tarjeta" : "Efectivo"}</span></td>
          <td>${venta.rol === "dueño" ? "Dueño" : "Mostrador"}</td>
          <td>${celdaAcciones}</td>
        </tr>
      `;
    })
    .join("");

  cuerpo.querySelectorAll("[data-editar-venta]").forEach((boton) => {
    boton.addEventListener("click", () => abrirModalEditarVenta(boton.dataset.editarVenta));
  });

  cuerpo.querySelectorAll("[data-reembolsar-venta]").forEach((boton) => {
    boton.addEventListener("click", () => {
      idPendienteReembolso = boton.dataset.reembolsarVenta;
      pintarTablaHistorico();
    });
  });

  cuerpo.querySelectorAll("[data-confirmar-reembolso-si]").forEach((boton) => {
    boton.addEventListener("click", () => reembolsarVenta(boton.dataset.confirmarReembolsoSi));
  });

  cuerpo.querySelectorAll("[data-confirmar-reembolso-no]").forEach((boton) => {
    boton.addEventListener("click", () => {
      idPendienteReembolso = null;
      pintarTablaHistorico();
    });
  });
}

// ============================================================
// Reembolsar una venta completa
// ============================================================
// A diferencia de editar, esto NO abre un modal: se confirma inline
// en la misma fila (igual que "Eliminar" en el catálogo), porque es
// una sola decisión de sí/no, no algo que necesite ajustarse.

function reembolsarVenta(ventaId) {
  const venta = ventas.find((item) => item.id === ventaId);

  // Regresar al inventario todo lo que esa venta había descontado.
  // Aquí no hace falta "validar stock" como al editar: devolver
  // producto nunca puede dejar el stock en negativo.
  venta.items.forEach((item) => {
    const producto = productos.find((p) => p.id === item.productoId);
    if (producto) producto.stock += item.cantidad;
  });

  // No borramos la venta: la marcamos como reembolsada para que el
  // rastro de que existió se quede en el histórico, pero el dashboard
  // (módulo 5) la excluye de los totales como si el dinero nunca
  // hubiera entrado.
  venta.reembolsada = true;
  idPendienteReembolso = null;

  guardarProductos(productos);
  guardarVentas(ventas);

  pintarTablaHistorico();
  mostrarAviso("Venta reembolsada");
}

// ============================================================
// Modal: editar una venta ya registrada
// ============================================================

// El paso del input de cantidad depende del tipo de venta: por peso
// se aceptan decimales (1.5 kg), por pieza solo enteros (no existen
// "3.5 refrescos").
function pasoCantidad(tipoVenta) {
  return tipoVenta === "peso" ? "0.01" : "1";
}

function abrirModalEditarVenta(ventaId) {
  const venta = ventas.find((item) => item.id === ventaId);
  ventaEditandoId = ventaId;
  metodoPagoEditando = venta.metodoPago;

  // Reconstruimos cada línea con el PRECIO QUE SE COBRÓ EN ESA VENTA
  // (subtotal ÷ cantidad), no el precio actual del catálogo: si el
  // precio de la manzana subió después, no queremos que editar una
  // venta vieja cambie silenciosamente cuánto costaba en ese momento.
  itemsEditando = venta.items.map((item) => {
    const producto = productos.find((p) => p.id === item.productoId);
    return {
      idLocal: crypto.randomUUID(),
      productoId: item.productoId,
      nombre: producto ? producto.nombre : "(producto eliminado)",
      unidad: producto ? producto.unidad : "",
      tipoVenta: producto ? producto.tipoVenta : "pieza",
      cantidad: item.cantidad,
      precioUnitario: item.subtotal / item.cantidad,
      subtotal: item.subtotal,
    };
  });

  document.querySelector("[data-editar-venta-fecha]").textContent = `Venta del ${venta.fecha}, ${venta.hora}`;
  document.querySelector("[data-editar-venta-error]").textContent = "";
  pintarSelectAgregarProducto();
  pintarItemsEditando();
  actualizarBotonesMetodoPagoEditar();

  document.querySelector("[data-overlay-editar-venta]").hidden = false;
}

function cerrarModalEditarVenta() {
  document.querySelector("[data-overlay-editar-venta]").hidden = true;
  ventaEditandoId = null;
  itemsEditando = [];
}

function pintarItemsEditando() {
  const lista = document.querySelector("[data-editar-venta-items]");

  lista.innerHTML = itemsEditando
    .map(
      (item) => `
        <li class="ticket-linea">
          <div class="ticket-linea__info">
            <span class="ticket-linea__nombre">${item.nombre}</span>
            <input
              type="number"
              class="campo-cantidad-linea"
              min="0"
              step="${pasoCantidad(item.tipoVenta)}"
              value="${item.cantidad}"
              data-cantidad-linea="${item.idLocal}"
              aria-label="Cantidad de ${item.nombre}"
            />
          </div>
          <div class="ticket-linea__derecha">
            <span class="ticket-linea__subtotal" data-subtotal-linea="${item.idLocal}">${formatoMoneda(item.subtotal)}</span>
            <button type="button" class="boton-eliminar-linea" data-quitar-linea-editar="${item.idLocal}" aria-label="Quitar ${item.nombre} de la venta">
              ✕
            </button>
          </div>
        </li>
      `
    )
    .join("");

  lista.querySelectorAll("[data-cantidad-linea]").forEach((input) => {
    input.addEventListener("input", () => {
      const item = itemsEditando.find((linea) => linea.idLocal === input.dataset.cantidadLinea);
      const nuevaCantidad = Number.parseFloat(input.value) || 0;
      item.cantidad = nuevaCantidad;
      item.subtotal = nuevaCantidad * item.precioUnitario;
      lista.querySelector(`[data-subtotal-linea="${item.idLocal}"]`).textContent = formatoMoneda(item.subtotal);
      pintarTotalEditando();
    });
  });

  lista.querySelectorAll("[data-quitar-linea-editar]").forEach((boton) => {
    boton.addEventListener("click", () => {
      itemsEditando = itemsEditando.filter((linea) => linea.idLocal !== boton.dataset.quitarLineaEditar);
      pintarItemsEditando();
      pintarTotalEditando();
    });
  });

  pintarTotalEditando();
}

function pintarTotalEditando() {
  const total = itemsEditando.reduce((acumulado, item) => acumulado + item.subtotal, 0);
  document.querySelector("[data-editar-venta-total]").textContent = formatoMoneda(total);
}

function pintarSelectAgregarProducto() {
  const select = document.querySelector("[data-select-agregar-producto]");
  // La primera opción es un placeholder sin valor: así "Agregar
  // producto" no hace nada hasta que el Dueño elija uno de verdad.
  select.innerHTML =
    `<option value="">+ Elegir producto para agregar</option>` +
    productos
      .map((producto) => `<option value="${producto.id}">${producto.nombre} (${formatoMoneda(producto.precioVenta)})</option>`)
      .join("");
}

function agregarProductoAVentaEditando(productoId) {
  const producto = productos.find((item) => item.id === productoId);
  itemsEditando.push({
    idLocal: crypto.randomUUID(),
    productoId: producto.id,
    nombre: producto.nombre,
    unidad: producto.unidad,
    tipoVenta: producto.tipoVenta,
    // Cantidad inicial de 1 (una pieza, o 1 kg si es por peso); el
    // Dueño la ajusta con el input de cada línea si hace falta.
    cantidad: 1,
    precioUnitario: producto.precioVenta,
    subtotal: producto.precioVenta,
  });
  pintarItemsEditando();
}

function actualizarBotonesMetodoPagoEditar() {
  document.querySelectorAll("[data-editar-metodo-pago] [data-metodo]").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.metodo === metodoPagoEditando);
  });
}

function guardarEdicionVenta() {
  const error = document.querySelector("[data-editar-venta-error]");

  if (itemsEditando.length === 0) {
    error.textContent = "La venta debe tener al menos un producto.";
    return;
  }
  if (itemsEditando.some((item) => !Number.isFinite(item.cantidad) || item.cantidad <= 0)) {
    error.textContent = "Hay una cantidad inválida en la lista.";
    return;
  }

  const ventaOriginal = ventas.find((venta) => venta.id === ventaEditandoId);

  // Trabajamos sobre una COPIA del catálogo (no sobre `productos`
  // directo) para poder validar el stock disponible sin arriesgarnos
  // a dejar a medias un cambio si algo falla a mitad del camino.
  const productosCopia = productos.map((producto) => ({ ...producto }));

  // Paso 1: "regresar" al inventario lo que la venta ORIGINAL había
  // descontado. Es como si la venta nunca hubiera pasado, por un
  // instante, para poder revisar el stock real disponible.
  ventaOriginal.items.forEach((item) => {
    const producto = productosCopia.find((p) => p.id === item.productoId);
    if (producto) producto.stock += item.cantidad;
  });

  // Paso 2: sumar cuánto se necesita de cada producto en la versión
  // EDITADA (un mismo producto podría aparecer en más de una línea).
  const necesarioPorProducto = {};
  itemsEditando.forEach((item) => {
    necesarioPorProducto[item.productoId] = (necesarioPorProducto[item.productoId] || 0) + item.cantidad;
  });

  // Paso 3: validar que, ya con el stock "devuelto", sí alcance para
  // la nueva versión de la venta. Si no alcanza, no tocamos nada real
  // (productosCopia se descarta solo al salir de la función).
  for (const [productoId, cantidadNecesaria] of Object.entries(necesarioPorProducto)) {
    const producto = productosCopia.find((p) => p.id === productoId);
    if (producto && cantidadNecesaria > producto.stock) {
      error.textContent = `No hay suficiente stock de ${producto.nombre} para guardar este cambio.`;
      return;
    }
  }

  // Paso 4: ya validado, descontar la versión nueva.
  itemsEditando.forEach((item) => {
    const producto = productosCopia.find((p) => p.id === item.productoId);
    if (producto) producto.stock -= item.cantidad;
  });

  const ventaActualizada = {
    ...ventaOriginal,
    items: itemsEditando.map((item) => ({
      productoId: item.productoId,
      cantidad: item.cantidad,
      subtotal: Number(item.subtotal.toFixed(2)),
    })),
    total: Number(itemsEditando.reduce((acumulado, item) => acumulado + item.subtotal, 0).toFixed(2)),
    metodoPago: metodoPagoEditando,
  };

  ventas = ventas.map((venta) => (venta.id === ventaEditandoId ? ventaActualizada : venta));
  guardarVentas(ventas);
  guardarProductos(productosCopia);
  productos = productosCopia;

  cerrarModalEditarVenta();
  pintarTablaHistorico();
  mostrarAviso("Venta actualizada");
}

// ============================================================
// Conexión de eventos al cargar la página
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarAcceso()) return;

  productos = obtenerProductos();
  ventas = obtenerVentas();

  pintarBarraSuperior();
  pintarTablaHistorico();

  document.querySelector("[data-filtro-fecha]").addEventListener("change", (evento) => {
    fechaFiltro = evento.target.value;
    pintarTablaHistorico();
  });

  document.querySelector("[data-limpiar-filtro]").addEventListener("click", () => {
    fechaFiltro = "";
    document.querySelector("[data-filtro-fecha]").value = "";
    pintarTablaHistorico();
  });

  document.querySelector("[data-cambiar-rol]").addEventListener("click", () => {
    cerrarSesionRol();
    window.location.href = "index.html";
  });

  document.querySelector("[data-select-agregar-producto]").addEventListener("change", (evento) => {
    const productoId = evento.target.value;
    if (productoId) {
      agregarProductoAVentaEditando(productoId);
      evento.target.value = ""; // regresa al placeholder para la siguiente vez
    }
  });

  document.querySelectorAll("[data-editar-metodo-pago] [data-metodo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      metodoPagoEditando = boton.dataset.metodo;
      actualizarBotonesMetodoPagoEditar();
    });
  });

  document.querySelector("[data-editar-venta-cancelar]").addEventListener("click", cerrarModalEditarVenta);
  document.querySelector("[data-editar-venta-guardar]").addEventListener("click", guardarEdicionVenta);

  document.addEventListener("keydown", (evento) => {
    const overlay = document.querySelector("[data-overlay-editar-venta]");
    if (!overlay.hidden && evento.key === "Escape") {
      evento.preventDefault();
      cerrarModalEditarVenta();
    }
  });
});
