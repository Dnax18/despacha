// ============================================================
// catalogo.js — Lógica de la pantalla de catálogo (catalogo.html)
// ============================================================
// Igual que pos.js e inicio.js, este archivo solo habla con los
// datos a través de almacen.js. La regla de negocio de esta pantalla
// (decidida con el usuario): SOLO el Dueño puede agregar, editar o
// eliminar productos. El Mostrador puede entrar a ver el catálogo,
// pero sin el costo y sin los botones de gestión.

import { obtenerProductos, guardarProductos, obtenerConfig, obtenerRolActual, cerrarSesionRol } from "./almacen.js";
import { formatoMoneda } from "./formato.js";

let productos = [];
let esDueno = false;
let terminoBusqueda = "";
let productoEditandoId = null; // null = el formulario está en modo "agregar"
let idPendienteEliminar = null; // id de la fila que está mostrando "¿Seguro?"

// ============================================================
// Arranque
// ============================================================

function verificarRol() {
  if (!obtenerRolActual()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function pintarBarraSuperior() {
  const config = obtenerConfig();
  document.querySelector("[data-nombre-negocio]").textContent = config.nombreNegocio;
  document.querySelector("[data-rol-actual]").textContent = esDueno ? "Dueño" : "Mostrador";
  document.querySelectorAll("[data-nav-dueno]").forEach((link) => {
    link.hidden = !esDueno;
  });
}

// Decide qué partes de la pantalla se ven según el rol. Lo hacemos en
// JS (no escondiendo todo por CSS de antemano) porque el rol puede
// cambiar entre sesiones y el HTML siempre arranca igual para todos.
function aplicarPermisosSegunRol() {
  document.querySelector("[data-abrir-agregar]").hidden = !esDueno;
  document.querySelector("[data-columna-costo]").hidden = !esDueno;
  document.querySelector("[data-columna-creado]").hidden = !esDueno;
  document.querySelector("[data-columna-acciones]").hidden = !esDueno;
}

// ============================================================
// Tabla del catálogo
// ============================================================

// Igual que en pos.js: filtra por nombre en el catálogo completo que
// ya está en memoria, sin pedirle nada a un servidor.
function obtenerProductosFiltrados() {
  if (terminoBusqueda.trim() === "") return productos;
  const texto = terminoBusqueda.trim().toLowerCase();
  return productos.filter((producto) => producto.nombre.toLowerCase().includes(texto));
}

function pintarTabla() {
  const tabla = document.querySelector("[data-tabla-catalogo]");
  const vacio = document.querySelector("[data-catalogo-vacio]");
  const cuerpo = document.querySelector("[data-cuerpo-catalogo]");
  const listaFiltrada = obtenerProductosFiltrados();

  if (productos.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    vacio.textContent = "Aún no hay productos en el catálogo. Agrega el primero para empezar a vender.";
    return;
  }

  if (listaFiltrada.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    vacio.textContent = "No se encontró ningún producto.";
    return;
  }

  tabla.hidden = false;
  vacio.hidden = true;

  cuerpo.innerHTML = listaFiltrada
    .map((producto) => {
      const precio =
        producto.tipoVenta === "peso"
          ? `${formatoMoneda(producto.precioVenta)}/kg`
          : formatoMoneda(producto.precioVenta);

      // Solo armamos las celdas de costo y acciones si el rol es
      // dueño: así un Mostrador jamás recibe ese dato en el HTML,
      // ni siquiera escondido con CSS (que se podría inspeccionar).
      const celdaCosto = esDueno ? `<td class="celda-numero">${formatoMoneda(producto.costo)}</td>` : "";
      const celdaCreado = esDueno ? `<td>${producto.fechaCreacion ?? "—"}</td>` : "";

      const celdaAcciones = esDueno
        ? `<td>${
            idPendienteEliminar === producto.id
              ? `
                <span class="confirmar-eliminar">
                  ¿Eliminar?
                  <button type="button" data-confirmar-si="${producto.id}">Sí</button>
                  <button type="button" data-confirmar-no>No</button>
                </span>
              `
              : `
                <div class="catalogo__acciones-fila">
                  <button type="button" class="boton-editar" data-editar="${producto.id}">Editar</button>
                  <button type="button" class="boton-eliminar" data-eliminar="${producto.id}">Eliminar</button>
                </div>
              `
          }</td>`
        : "";

      return `
        <tr>
          <td>${producto.nombre}</td>
          <td>${producto.categoria}</td>
          <td><span class="etiqueta-tipo">${producto.tipoVenta === "peso" ? "Por kg" : "Por pieza"}</span></td>
          <td class="celda-numero">${precio}</td>
          ${celdaCosto}
          <td class="celda-numero">${producto.stock} ${producto.unidad}</td>
          ${celdaCreado}
          ${celdaAcciones}
        </tr>
      `;
    })
    .join("");

  if (!esDueno) return;

  cuerpo.querySelectorAll("[data-editar]").forEach((boton) => {
    boton.addEventListener("click", () => abrirModalEditar(boton.dataset.editar));
  });

  cuerpo.querySelectorAll("[data-eliminar]").forEach((boton) => {
    boton.addEventListener("click", () => {
      idPendienteEliminar = boton.dataset.eliminar;
      pintarTabla();
    });
  });

  cuerpo.querySelectorAll("[data-confirmar-si]").forEach((boton) => {
    boton.addEventListener("click", () => eliminarProducto(boton.dataset.confirmarSi));
  });

  cuerpo.querySelectorAll("[data-confirmar-no]").forEach((boton) => {
    boton.addEventListener("click", () => {
      idPendienteEliminar = null;
      pintarTabla();
    });
  });
}

function eliminarProducto(id) {
  productos = productos.filter((producto) => producto.id !== id);
  guardarProductos(productos);
  idPendienteEliminar = null;
  pintarTabla();
  mostrarAviso("Producto eliminado");
}

// ============================================================
// Modal: agregar / editar producto
// ============================================================

function pintarOpcionesCategorias() {
  const select = document.querySelector("[data-campo-categoria]");
  // Set quita duplicados: si hay diez productos "Fruta", la opción
  // solo aparece una vez en el select.
  const categorias = [...new Set(productos.map((producto) => producto.categoria))];

  select.innerHTML = `
    <option value="" disabled selected>Selecciona una categoría</option>
    ${categorias.map((categoria) => `<option value="${categoria}">${categoria}</option>`).join("")}
    <option value="__nueva__">+ Nueva categoría…</option>
  `;
}

// Cuando eligen "+ Nueva categoría…" se muestra el input de texto para
// escribirla; si elige una ya existente, el input se esconde y limpia.
function manejarCambioCategoria() {
  const select = document.querySelector("[data-campo-categoria]");
  const inputNueva = document.querySelector("[data-campo-categoria-nueva]");
  const esNueva = select.value === "__nueva__";
  inputNueva.hidden = !esNueva;
  if (esNueva) {
    inputNueva.value = "";
    inputNueva.focus();
  }
}

function actualizarEtiquetasSegunTipo() {
  const tipoSeleccionado = document.querySelector('[data-campo-tipo]:checked').value;
  const esPeso = tipoSeleccionado === "peso";

  document.querySelector("[data-etiqueta-precio]").textContent = esPeso
    ? "Precio de venta ($ por kg)"
    : "Precio de venta ($ por pieza)";

  document.querySelector("[data-etiqueta-stock]").textContent = esPeso
    ? "Stock inicial (kg)"
    : "Stock inicial (piezas)";

  // Con peso tiene sentido teclear decimales de stock (ej: 12.5 kg);
  // con pieza no (no existen "3.5 refrescos"), así que el teclado
  // numérico del celular tampoco debería invitar a poner un punto.
  document.querySelector("[data-campo-stock]").step = esPeso ? "0.01" : "1";
}

function limpiarFormulario() {
  document.querySelector("[data-form-producto]").reset();
  document.querySelector("[data-form-error]").textContent = "";
  document.querySelector("[data-campo-categoria-nueva]").hidden = true;
  document.querySelector("[data-campo-categoria-nueva]").value = "";
  actualizarEtiquetasSegunTipo();
}

function abrirModalAgregar() {
  productoEditandoId = null;
  pintarOpcionesCategorias();
  limpiarFormulario();
  document.querySelector("[data-form-titulo]").textContent = "Agregar producto";
  document.querySelector("[data-overlay-producto]").hidden = false;
}

function abrirModalEditar(id) {
  const producto = productos.find((item) => item.id === id);
  productoEditandoId = id;
  pintarOpcionesCategorias();
  limpiarFormulario();

  document.querySelector("[data-form-titulo]").textContent = "Editar producto";
  document.querySelector("[data-campo-nombre]").value = producto.nombre;
  document.querySelector("[data-campo-categoria]").value = producto.categoria;
  document.querySelector(`[data-campo-tipo][value="${producto.tipoVenta}"]`).checked = true;
  document.querySelector("[data-campo-precio]").value = producto.precioVenta;
  document.querySelector("[data-campo-costo]").value = producto.costo;
  document.querySelector("[data-campo-stock]").value = producto.stock;
  actualizarEtiquetasSegunTipo();

  document.querySelector("[data-overlay-producto]").hidden = false;
}

function cerrarModalProducto() {
  document.querySelector("[data-overlay-producto]").hidden = true;
}

function manejarSubmitFormulario(evento) {
  // preventDefault evita que el navegador recargue la página al
  // enviar el formulario, que es su comportamiento por defecto. Aquí
  // queremos manejarlo nosotros mismos con JavaScript.
  evento.preventDefault();

  const nombre = document.querySelector("[data-campo-nombre]").value.trim();
  const valorCategoria = document.querySelector("[data-campo-categoria]").value;
  const categoria =
    valorCategoria === "__nueva__"
      ? document.querySelector("[data-campo-categoria-nueva]").value.trim()
      : valorCategoria.trim();
  const tipoVenta = document.querySelector("[data-campo-tipo]:checked").value;
  const precioVenta = Number.parseFloat(document.querySelector("[data-campo-precio]").value);
  const costo = Number.parseFloat(document.querySelector("[data-campo-costo]").value);
  const stock = Number.parseFloat(document.querySelector("[data-campo-stock]").value);
  const error = document.querySelector("[data-form-error]");

  if (!nombre) {
    error.textContent = "Falta el nombre del producto.";
    return;
  }
  if (!categoria) {
    error.textContent = "Falta la categoría del producto.";
    return;
  }
  if (!Number.isFinite(precioVenta) || precioVenta <= 0) {
    error.textContent = "El precio de venta debe ser mayor a cero.";
    return;
  }
  if (!Number.isFinite(costo) || costo < 0) {
    error.textContent = "Falta el costo del producto.";
    return;
  }
  if (!Number.isFinite(stock) || stock < 0) {
    error.textContent = "El stock no puede ser negativo.";
    return;
  }

  const unidad = tipoVenta === "peso" ? "kg" : "pza";

  if (productoEditandoId) {
    // findIndex regresa la POSICIÓN del elemento dentro del array (un
    // número), no el elemento mismo. La usamos para reemplazar esa
    // posición exacta con los datos nuevos.
    const indice = productos.findIndex((item) => item.id === productoEditandoId);
    // Conserva la fecha de creación original: editar un producto no
    // debe cambiar cuándo se creó.
    const fechaCreacion = productos[indice].fechaCreacion;
    productos[indice] = {
      id: productoEditandoId,
      nombre,
      categoria,
      tipoVenta,
      precioVenta,
      costo,
      stock,
      unidad,
      fechaCreacion,
    };
  } else {
    // Mismo formato YYYY-MM-DD que usan las ventas en almacen.js, para
    // que se pueda ordenar/comparar como texto sin convertir nada.
    const fechaCreacion = new Date().toISOString().slice(0, 10);
    productos.push({
      id: crypto.randomUUID(),
      nombre,
      categoria,
      tipoVenta,
      precioVenta,
      costo,
      stock,
      unidad,
      fechaCreacion,
    });
  }

  guardarProductos(productos);
  cerrarModalProducto();
  pintarTabla();
  mostrarAviso(productoEditandoId ? "Producto actualizado" : "Producto guardado");
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
  if (!verificarRol()) return;

  productos = obtenerProductos();
  esDueno = obtenerRolActual() === "dueño";

  pintarBarraSuperior();
  aplicarPermisosSegunRol();
  pintarTabla();

  document.querySelector("[data-buscador]").addEventListener("input", (evento) => {
    terminoBusqueda = evento.target.value;
    pintarTabla();
  });

  document.querySelector("[data-cambiar-rol]").addEventListener("click", () => {
    cerrarSesionRol();
    window.location.href = "index.html";
  });

  // El resto de los controles (agregar, editar el formulario) solo
  // existen en el DOM para el dueño en la práctica, pero igual
  // protegemos con esDueno para no atar listeners que nunca se usarán.
  if (!esDueno) return;

  document.querySelector("[data-abrir-agregar]").addEventListener("click", abrirModalAgregar);
  document.querySelector("[data-form-cancelar]").addEventListener("click", cerrarModalProducto);
  document.querySelector("[data-form-producto]").addEventListener("submit", manejarSubmitFormulario);

  document.querySelectorAll("[data-campo-tipo]").forEach((radio) => {
    radio.addEventListener("change", actualizarEtiquetasSegunTipo);
  });

  document.querySelector("[data-campo-categoria]").addEventListener("change", manejarCambioCategoria);

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !document.querySelector("[data-overlay-producto]").hidden) {
      evento.preventDefault();
      cerrarModalProducto();
    }
  });
});
