// ============================================================
// pos.js — Lógica de la pantalla de cobro (pos.html)
// ============================================================
// Este es el módulo más importante de Despacha: agregar productos
// por peso o por pieza al mismo ticket, y cobrar. Igual que en
// inicio.js, este archivo SOLO habla con los datos a través de
// almacen.js — nunca usa localStorage directo.

import {
  obtenerProductos,
  guardarProductos,
  obtenerConfig,
  obtenerRolActual,
  cerrarSesionRol,
  agregarVenta,
  obtenerVentas,
} from "./almacen.js";
import { formatoMoneda, describirItems } from "./formato.js";

// Cuántas ventas recientes mostrar como máximo debajo del POS: es
// solo para resolver una duda rápida de un cliente, no un histórico
// completo (eso ya vive en historico.html, exclusivo del Dueño).
const MAXIMO_VENTAS_RECIENTES = 8;

// ---- Datos fijos de presentación ----
// No están en almacen.js porque no son "datos del negocio": son solo
// cómo se ve cada categoría en pantalla. Si un cliente nuevo tuviera
// categorías distintas, esto seguiría funcionando gracias al `?? `
// (operador de valor por defecto) que usamos más abajo.
const ICONO_POR_CATEGORIA = { Fruta: "🍎", Carne: "🥩", Bebidas: "🥤", Abarrotes: "🛒" };
const COLOR_POR_CATEGORIA = {
  Fruta: "var(--accion)",
  Carne: "var(--marca)",
  Bebidas: "var(--marca-claro)",
  Abarrotes: "var(--aviso)",
};

// ---- Estado del módulo ----
// Usamos variables `let` (no `const`) porque su valor cambia conforme
// el mostrador trabaja: agrega productos, busca, cambia de categoría.
// Vive en memoria mientras la pestaña está abierta; lo que sí debe
// sobrevivir a un refresh (la venta ya cobrada) se guarda con
// almacen.js, no aquí.
let productos = [];
let ticket = []; // cada línea: { id, productoId, nombre, tipoVenta, unidad, cantidad, precioUnitario, subtotal }
let categoriaActual = "Todas";
let terminoBusqueda = "";
let productoEnTurno = null; // el producto por peso que está abierto en el teclado
let modoTeclado = "kg"; // "kg" o "monto"
let bufferTeclado = "";

// ---- Helpers ----

function generarId() {
  // crypto.randomUUID() genera un identificador único sin que
  // nosotros tengamos que inventar un contador. Lo usamos para las
  // líneas del ticket (que solo viven en memoria) y para el id de la
  // venta que se guarda.
  return crypto.randomUUID();
}

// ============================================================
// Arranque de la pantalla
// ============================================================

function verificarRol() {
  // Si alguien llega aquí sin haber elegido rol antes, lo regresamos
  // a la selección. No es seguridad real (todo vive en el navegador
  // del propio negocio), es solo mantener el flujo ordenado.
  if (!obtenerRolActual()) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function pintarBarraSuperior() {
  const config = obtenerConfig();
  const rol = obtenerRolActual();
  document.querySelector("[data-nombre-negocio]").textContent = config.nombreNegocio;
  document.querySelector("[data-rol-actual]").textContent =
    rol === "dueño" ? "Dueño" : "Mostrador";
  // Inventario, dashboard e histórico son exclusivos del Dueño: esos
  // links de navegación solo se muestran si ese es el rol activo.
  // querySelectorAll (no querySelector) porque ahora hay varios.
  document.querySelectorAll("[data-nav-dueno]").forEach((link) => {
    link.hidden = rol !== "dueño";
  });
}

function iniciarReloj() {
  const elementoReloj = document.querySelector("[data-reloj]");

  function actualizar() {
    const ahora = new Date();
    // padStart(2, "0") rellena con un cero a la izquierda si el número
    // tiene un solo dígito (ej: "9" se vuelve "09"). Así la hora nunca
    // se ve como "9:5" sino "09:05".
    const horas = String(ahora.getHours()).padStart(2, "0");
    const minutos = String(ahora.getMinutes()).padStart(2, "0");
    elementoReloj.textContent = `${horas}:${minutos}`;
  }

  actualizar();
  // setInterval repite una función cada X milisegundos. No hace falta
  // detenerlo con clearInterval porque vive mientras la pestaña esté
  // abierta, y al cerrarla el navegador limpia todo solo.
  setInterval(actualizar, 30000);
}

// ============================================================
// Categorías
// ============================================================

function obtenerListaCategorias() {
  // Set guarda solo valores ÚNICOS: si dos productos son "Fruta",
  // el Set solo la cuenta una vez. [...spread] lo convierte de vuelta
  // a un array normal, que sí podemos recorrer con map/forEach.
  const categoriasUnicas = [...new Set(productos.map((producto) => producto.categoria))];
  return ["Todas", ...categoriasUnicas];
}

function pintarCategorias() {
  const contenedor = document.querySelector("[data-lista-categorias]");
  // map transforma cada categoría en un botón (texto HTML), y join("")
  // pega todos esos textos en uno solo para meterlos de un golpe con
  // innerHTML. Es más simple que crear cada <button> a mano con
  // document.createElement cuando son varios elementos parecidos.
  contenedor.innerHTML = obtenerListaCategorias()
    .map(
      (categoria) => `
        <button
          type="button"
          class="categoria-boton"
          data-categoria="${categoria}"
          aria-pressed="${categoria === categoriaActual}"
        >${categoria}</button>
      `
    )
    .join("");

  contenedor.querySelectorAll("[data-categoria]").forEach((boton) => {
    boton.addEventListener("click", () => {
      categoriaActual = boton.dataset.categoria;
      pintarCategorias();
      pintarGridProductos();
    });
  });
}

// ============================================================
// Grid de productos (con búsqueda en vivo + filtro de categoría)
// ============================================================

function obtenerProductosFiltrados() {
  // Si hay texto en el buscador, buscamos en TODO el catálogo sin
  // importar la categoría seleccionada (es lo más rápido para
  // agilizar el cobro, como pide el documento de diseño).
  if (terminoBusqueda.trim() !== "") {
    const texto = terminoBusqueda.trim().toLowerCase();
    // filter regresa solo los elementos que cumplen la condición;
    // includes busca un texto DENTRO de otro texto (substring).
    return productos.filter((producto) => producto.nombre.toLowerCase().includes(texto));
  }

  if (categoriaActual === "Todas") return productos;
  return productos.filter((producto) => producto.categoria === categoriaActual);
}

function pintarGridProductos() {
  const grid = document.querySelector("[data-grid-productos]");
  const lista = obtenerProductosFiltrados();

  if (lista.length === 0) {
    grid.innerHTML = `<p class="pos-layout__sin-resultados">No se encontró ningún producto.</p>`;
    return;
  }

  grid.innerHTML = lista
    .map((producto) => {
      const icono = ICONO_POR_CATEGORIA[producto.categoria] ?? "📦";
      const color = COLOR_POR_CATEGORIA[producto.categoria] ?? "var(--tinta-suave)";
      const precio =
        producto.tipoVenta === "peso"
          ? `${formatoMoneda(producto.precioVenta)}/kg`
          : formatoMoneda(producto.precioVenta);

      return `
        <button
          type="button"
          class="tarjeta-producto"
          data-producto-id="${producto.id}"
          style="--icono-categoria: ${color};"
        >
          <span class="tarjeta-producto__icono">${icono}</span>
          <span class="tarjeta-producto__nombre">${producto.nombre}</span>
          <span class="tarjeta-producto__precio">${precio}</span>
          <span class="tarjeta-producto__unidad">${producto.unidad}</span>
        </button>
      `;
    })
    .join("");

  grid.querySelectorAll("[data-producto-id]").forEach((tarjeta) => {
    tarjeta.addEventListener("click", () => {
      // find regresa el PRIMER elemento que cumple la condición (o
      // undefined si ninguno). Aquí siempre lo encuentra porque el id
      // viene de la misma lista de productos.
      const producto = productos.find((item) => item.id === tarjeta.dataset.productoId);
      if (producto.tipoVenta === "pieza") {
        agregarPiezaAlTicket(producto);
      } else {
        abrirTecladoPeso(producto);
      }
    });
  });
}

// ============================================================
// Ticket
// ============================================================

// Suma cuánto de este producto ya está metido en el ticket (puede
// haber más de una línea si es por peso). Lo necesitamos para no
// dejar vender más de lo que hay en stock: el stock guardado en
// `producto` todavía no se descontó, así que hay que restarle a mano
// lo que ya se apartó en este mismo ticket antes de cobrarlo.
function cantidadEnTicket(productoId) {
  return ticket
    .filter((linea) => linea.productoId === productoId)
    .reduce((acumulado, linea) => acumulado + linea.cantidad, 0);
}

function agregarPiezaAlTicket(producto) {
  if (cantidadEnTicket(producto.id) + 1 > producto.stock) {
    mostrarError(`No hay suficiente stock de ${producto.nombre}.`);
    return;
  }

  // Si el producto ya está en el ticket, solo le sumamos una unidad en
  // vez de crear una línea repetida (así se ve como "Refresco x3" en
  // vez de tres líneas de "Refresco x1").
  const lineaExistente = ticket.find((linea) => linea.productoId === producto.id);

  if (lineaExistente) {
    lineaExistente.cantidad += 1;
    lineaExistente.subtotal = lineaExistente.cantidad * lineaExistente.precioUnitario;
  } else {
    ticket.push({
      id: generarId(),
      productoId: producto.id,
      nombre: producto.nombre,
      tipoVenta: "pieza",
      unidad: producto.unidad,
      cantidad: 1,
      precioUnitario: producto.precioVenta,
      subtotal: producto.precioVenta,
    });
  }

  pintarTicket();
}

function eliminarLineaDelTicket(idLinea) {
  // filter con "!==" reconstruye el array SIN el elemento que
  // queremos quitar. No mutamos el array a la mitad: creamos uno
  // nuevo y reemplazamos la variable. Es más fácil de seguir y evita
  // bugs raros de índices que se corren al borrar en medio de un loop.
  ticket = ticket.filter((linea) => linea.id !== idLinea);
  pintarTicket();
}

function calcularTotalTicket() {
  // reduce recorre el array y va acumulando un solo valor (aquí, la
  // suma). "acumulado" arranca en 0 y en cada vuelta le suma el
  // subtotal de esa línea.
  return ticket.reduce((acumulado, linea) => acumulado + linea.subtotal, 0);
}

function pintarTicket() {
  const lista = document.querySelector("[data-ticket-lista]");
  const vacio = document.querySelector("[data-ticket-vacio]");
  const botonCobrar = document.querySelector("[data-boton-cobrar]");

  vacio.hidden = ticket.length > 0;

  lista.innerHTML = ticket
    .map((linea) => {
      const detalleCantidad =
        linea.tipoVenta === "peso"
          ? `${linea.cantidad} ${linea.unidad} × ${formatoMoneda(linea.precioUnitario)}`
          : `${linea.cantidad} × ${formatoMoneda(linea.precioUnitario)}`;

      return `
        <li class="ticket-linea">
          <div class="ticket-linea__info">
            <span class="ticket-linea__nombre">${linea.nombre}</span>
            <span class="ticket-linea__cantidad">${detalleCantidad}</span>
          </div>
          <div class="ticket-linea__derecha">
            <span class="ticket-linea__subtotal">${formatoMoneda(linea.subtotal)}</span>
            <button type="button" class="boton-eliminar-linea" data-quitar-linea="${linea.id}" aria-label="Quitar ${linea.nombre} del ticket">
              ✕
            </button>
          </div>
        </li>
      `;
    })
    .join("");

  lista.querySelectorAll("[data-quitar-linea]").forEach((boton) => {
    boton.addEventListener("click", () => eliminarLineaDelTicket(boton.dataset.quitarLinea));
  });

  document.querySelector("[data-ticket-total]").textContent = formatoMoneda(calcularTotalTicket());
  botonCobrar.disabled = ticket.length === 0;
}

// ============================================================
// Modal: teclado de peso (elemento de firma del diseño)
// ============================================================

function abrirTecladoPeso(producto) {
  productoEnTurno = producto;
  modoTeclado = "kg";
  bufferTeclado = "";

  document.querySelector("[data-peso-nombre]").textContent = producto.nombre;
  document.querySelector("[data-peso-precio]").textContent = `${formatoMoneda(producto.precioVenta)} / kg`;
  document.querySelector("[data-peso-error]").textContent = "";
  actualizarBotonesModo();
  pintarPantallaPeso();

  document.querySelector("[data-overlay-peso]").hidden = false;
}

function cerrarTecladoPeso() {
  document.querySelector("[data-overlay-peso]").hidden = true;
  productoEnTurno = null;
}

function actualizarBotonesModo() {
  document.querySelectorAll("[data-modo-peso]").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.modoPeso === modoTeclado);
  });
}

// Calcula, a partir de lo tecleado, tanto los kilos como el subtotal,
// sin importar si la persona está tecleando kilos o un monto directo.
// Centralizar esta cuenta aquí evita tener la misma fórmula repetida
// en dos lugares (la pantalla en vivo y el momento de confirmar).
function calcularKgYSubtotal() {
  const valorTecleado = Number.parseFloat(bufferTeclado) || 0;
  if (!productoEnTurno) return { kg: 0, subtotal: 0 };

  if (modoTeclado === "kg") {
    return { kg: valorTecleado, subtotal: valorTecleado * productoEnTurno.precioVenta };
  }
  // modo "monto": la persona teclea el total que quiere cobrar y de
  // ahí se obtienen los kilos (monto ÷ precio por kg).
  return { kg: valorTecleado / productoEnTurno.precioVenta, subtotal: valorTecleado };
}

function pintarPantallaPeso() {
  const { kg, subtotal } = calcularKgYSubtotal();
  document.querySelector("[data-peso-pantalla]").textContent =
    bufferTeclado === "" ? "0" : bufferTeclado;
  document.querySelector("[data-peso-detalle]").textContent =
    modoTeclado === "kg"
      ? `Subtotal: ${formatoMoneda(subtotal)}`
      : `Equivale a ${kg.toFixed(3)} kg`;
}

function presionarTecla(tecla) {
  if (tecla === "borrar") {
    bufferTeclado = bufferTeclado.slice(0, -1);
  } else if (tecla === "." && bufferTeclado.includes(".")) {
    // Evita un buffer inválido como "1.2.3": un número solo puede
    // tener un punto decimal.
    return;
  } else {
    bufferTeclado += tecla;
  }
  pintarPantallaPeso();
}

function confirmarPeso() {
  const { kg, subtotal } = calcularKgYSubtotal();
  const error = document.querySelector("[data-peso-error]");

  if (!bufferTeclado || kg <= 0) {
    // Mensaje claro y específico, no una disculpa vaga (voz/copy,
    // sección 8 del diseño).
    error.textContent = "Falta el peso del producto.";
    return;
  }

  const disponible = productoEnTurno.stock - cantidadEnTicket(productoEnTurno.id);
  if (kg > disponible) {
    error.textContent = `Solo hay ${disponible.toFixed(3)} ${productoEnTurno.unidad} disponibles de ${productoEnTurno.nombre}.`;
    return;
  }

  ticket.push({
    id: generarId(),
    productoId: productoEnTurno.id,
    nombre: productoEnTurno.nombre,
    tipoVenta: "peso",
    unidad: productoEnTurno.unidad,
    cantidad: Number(kg.toFixed(3)),
    precioUnitario: productoEnTurno.precioVenta,
    subtotal: Number(subtotal.toFixed(2)),
  });

  pintarTicket();
  cerrarTecladoPeso();
}

// ============================================================
// Modal: cobro (efectivo o tarjeta)
// ============================================================

let metodoPagoActual = "efectivo";

function abrirPanelCobro() {
  metodoPagoActual = "efectivo";
  document.querySelector("[data-cobro-total]").textContent = `Total a cobrar: ${formatoMoneda(calcularTotalTicket())}`;
  document.querySelector("[data-campo-recibido]").value = "";
  document.querySelector("[data-cobro-error]").textContent = "";
  actualizarBotonesMetodoPago();
  pintarCambio();
  document.querySelector("[data-overlay-cobro]").hidden = false;
}

function cerrarPanelCobro() {
  document.querySelector("[data-overlay-cobro]").hidden = true;
}

function actualizarBotonesMetodoPago() {
  document.querySelectorAll("[data-metodo]").forEach((boton) => {
    boton.setAttribute("aria-pressed", boton.dataset.metodo === metodoPagoActual);
  });
  // El bloque para teclear el efectivo recibido solo tiene sentido si
  // el método de pago es "efectivo": con tarjeta no hay cambio que dar.
  document.querySelector("[data-bloque-efectivo]").hidden = metodoPagoActual !== "efectivo";
}

function pintarCambio() {
  const total = calcularTotalTicket();
  const recibido = Number.parseFloat(document.querySelector("[data-campo-recibido]").value) || 0;
  const diferencia = recibido - total;
  const detalle = document.querySelector("[data-cambio-detalle]");

  // Mientras el mostrador va tecleando, es más útil saber cuánto FALTA
  // que ver "$0.00" sin explicación (antes el cambio se "topaba" en 0
  // y no decía nada del faltante). En cuanto el recibido alcanza el
  // total, cambia a mostrar el cambio normalmente.
  if (diferencia < 0) {
    detalle.textContent = `Falta: ${formatoMoneda(Math.abs(diferencia))}`;
    detalle.classList.add("modal__pantalla-detalle--aviso");
  } else {
    detalle.textContent = `Cambio: ${formatoMoneda(diferencia)}`;
    detalle.classList.remove("modal__pantalla-detalle--aviso");
  }
}

function confirmarCobro() {
  const total = calcularTotalTicket();
  const error = document.querySelector("[data-cobro-error]");

  if (metodoPagoActual === "efectivo") {
    const recibido = Number.parseFloat(document.querySelector("[data-campo-recibido]").value) || 0;
    if (recibido < total) {
      error.textContent = "Falta completar el pago.";
      return;
    }
  }

  guardarVenta(total);
  cerrarPanelCobro();
  vaciarTicket();
  mostrarConfirmacion();
  // La venta que se acaba de cobrar debe aparecer de inmediato en la
  // lista de abajo, no hasta que alguien recargue la página.
  pintarVentasRecientes();
}

function guardarVenta(total) {
  const ahora = new Date();
  const venta = {
    id: generarId(),
    // toISOString().slice(0, 10) corta el texto "2025-06-22T14:32..."
    // y se queda solo con "2025-06-22": es una forma simple de
    // obtener la fecha en un formato que ordena bien alfabéticamente
    // (útil para el histórico y el dashboard de módulos futuros).
    fecha: ahora.toISOString().slice(0, 10),
    hora: `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`,
    items: ticket.map((linea) => ({
      productoId: linea.productoId,
      cantidad: linea.cantidad,
      subtotal: linea.subtotal,
    })),
    total,
    metodoPago: metodoPagoActual,
    rol: obtenerRolActual(),
  };

  agregarVenta(venta);
  descontarStockVendido();
}

function descontarStockVendido() {
  // Partimos de la lista más reciente de productos (no de la variable
  // `productos` en memoria) para no pisar cambios que algún otro
  // módulo pudiera haber guardado mientras tanto.
  const productosActuales = obtenerProductos();

  ticket.forEach((linea) => {
    const producto = productosActuales.find((item) => item.id === linea.productoId);
    if (producto) {
      producto.stock = Math.max(0, producto.stock - linea.cantidad);
    }
  });

  guardarProductos(productosActuales);
  // Refrescamos también la copia en memoria de este módulo para que
  // el grid (si vuelve a abrirse el catálogo) ya refleje el stock
  // nuevo sin tener que recargar la página.
  productos = productosActuales;
}

function vaciarTicket() {
  ticket = [];
  pintarTicket();
}

// ============================================================
// Ventas recientes (debajo del POS, para resolver dudas rápido)
// ============================================================

function pintarVentasRecientes() {
  const ventas = obtenerVentas();
  const tabla = document.querySelector("[data-tabla-ventas-recientes]");
  const vacio = document.querySelector("[data-ventas-recientes-vacio]");
  const cuerpo = document.querySelector("[data-cuerpo-ventas-recientes]");

  if (ventas.length === 0) {
    tabla.hidden = true;
    vacio.hidden = false;
    return;
  }

  tabla.hidden = false;
  vacio.hidden = true;

  const masRecientesPrimero = [...ventas]
    .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`))
    .slice(0, MAXIMO_VENTAS_RECIENTES);

  cuerpo.innerHTML = masRecientesPrimero
    .map(
      (venta) => `
        <tr class="${venta.reembolsada ? "fila-reembolsada" : ""}">
          <td>${venta.fecha}</td>
          <td>${venta.hora}</td>
          <td class="celda-items">${describirItems(venta.items, productos)}</td>
          <td class="celda-numero">
            ${formatoMoneda(venta.total)}
            ${venta.reembolsada ? '<span class="etiqueta-tipo etiqueta-reembolso">Reembolsada</span>' : ""}
          </td>
        </tr>
      `
    )
    .join("");
}

// Un solo aviso flotante para los dos casos: confirmación (verde) y
// error de stock (rojo). El segundo argumento decide el color
// agregando o quitando la clase "toast--error" en vez de tener dos
// elementos HTML separados para básicamente lo mismo.
function mostrarAviso(texto, esError = false) {
  const toast = document.querySelector("[data-toast]");
  toast.textContent = texto;
  toast.classList.toggle("toast--error", esError);
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2500);
}

function mostrarConfirmacion() {
  // El botón "Cobrar" produce la confirmación "Venta guardada" (voz y
  // copy, sección 8).
  mostrarAviso("Venta guardada");
}

function mostrarError(texto) {
  mostrarAviso(texto, true);
}

// ============================================================
// Conexión de eventos al cargar la página
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!verificarRol()) return;

  productos = obtenerProductos();

  pintarBarraSuperior();
  iniciarReloj();
  pintarCategorias();
  pintarGridProductos();
  pintarTicket();
  pintarVentasRecientes();

  document.querySelector("[data-buscador]").addEventListener("input", (evento) => {
    terminoBusqueda = evento.target.value;
    pintarGridProductos();
  });

  document.querySelector("[data-toggle-categorias]").addEventListener("click", (evento) => {
    const lista = document.querySelector("[data-lista-categorias]");
    lista.hidden = !lista.hidden;
    // aria-expanded le dice tanto a la hoja de estilos (para girar la
    // flechita) como a un lector de pantalla si el contenido está
    // visible o no. Lo guardamos como texto "true"/"false" porque los
    // atributos HTML siempre son texto, nunca booleanos de JS.
    evento.currentTarget.setAttribute("aria-expanded", lista.hidden ? "false" : "true");
  });

  document.querySelector("[data-cambiar-rol]").addEventListener("click", () => {
    cerrarSesionRol();
    window.location.href = "index.html";
  });

  // Solo importa en celular (en escritorio el botón está escondido por
  // CSS), pero el listener no hace daño tenerlo siempre puesto.
  document.querySelector("[data-toggle-ticket-movil]").addEventListener("click", (evento) => {
    const contenido = document.querySelector("[data-ticket-contenido]");
    contenido.hidden = !contenido.hidden;
    evento.currentTarget.setAttribute("aria-expanded", contenido.hidden ? "false" : "true");
  });

  // ---- Teclado de peso ----
  document.querySelectorAll("[data-modo-peso]").forEach((boton) => {
    boton.addEventListener("click", () => {
      modoTeclado = boton.dataset.modoPeso;
      bufferTeclado = "";
      actualizarBotonesModo();
      pintarPantallaPeso();
    });
  });

  document.querySelectorAll("[data-tecla]").forEach((boton) => {
    boton.addEventListener("click", () => presionarTecla(boton.dataset.tecla));
  });

  document.querySelector("[data-peso-cancelar]").addEventListener("click", cerrarTecladoPeso);
  document.querySelector("[data-peso-agregar]").addEventListener("click", confirmarPeso);

  // Soporte de teclado físico (no solo el teclado numérico en pantalla)
  // y Escape para cerrar. "keydown" en el document escucha SIN
  // importar qué elemento tenga el foco en ese momento, porque el
  // teclado de peso no tiene un <input> real donde escribir.
  document.addEventListener("keydown", (evento) => {
    const overlayPeso = document.querySelector("[data-overlay-peso]");
    const overlayCobro = document.querySelector("[data-overlay-cobro]");

    if (!overlayPeso.hidden) {
      // preventDefault es clave en Enter: si el foco quedó en el botón
      // del producto (el que abrió este modal), el navegador interpreta
      // Enter como "darle clic a ese botón otra vez" después de que
      // confirmarPeso() ya cerró el modal — y lo reabre solo, como si
      // nada hubiera pasado. Sin preventDefault, Enter "funciona" pero
      // se ve roto.
      if (evento.key >= "0" && evento.key <= "9") {
        evento.preventDefault();
        presionarTecla(evento.key);
      } else if (evento.key === "." || evento.key === ",") {
        // Algunos teclados (y el numpad en español) escriben la coma
        // decimal en vez del punto; las tratamos igual.
        evento.preventDefault();
        presionarTecla(".");
      } else if (evento.key === "Backspace") {
        evento.preventDefault(); // evita que el navegador "regrese de página"
        presionarTecla("borrar");
      } else if (evento.key === "Enter") {
        evento.preventDefault();
        confirmarPeso();
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarTecladoPeso();
      }
      return;
    }

    if (!overlayCobro.hidden) {
      // Igual que en el teclado de peso: Enter en el campo "Recibido"
      // completa la venta directo, sin tener que soltar el teclado
      // para darle clic a "Guardar venta" con el mouse.
      if (evento.key === "Enter") {
        evento.preventDefault();
        confirmarCobro();
      } else if (evento.key === "Escape") {
        evento.preventDefault();
        cerrarPanelCobro();
      }
    }
  });

  // ---- Panel de cobro ----
  document.querySelector("[data-boton-cobrar]").addEventListener("click", abrirPanelCobro);
  document.querySelector("[data-cobro-cancelar]").addEventListener("click", cerrarPanelCobro);
  document.querySelector("[data-cobro-confirmar]").addEventListener("click", confirmarCobro);

  document.querySelectorAll("[data-metodo]").forEach((boton) => {
    boton.addEventListener("click", () => {
      metodoPagoActual = boton.dataset.metodo;
      actualizarBotonesMetodoPago();
      pintarCambio();
    });
  });

  document.querySelector("[data-campo-recibido]").addEventListener("input", pintarCambio);
});
