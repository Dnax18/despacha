// ============================================================
// formato.js — Helpers de formato compartidos entre pantallas
// ============================================================
// formatoMoneda se repetía igual en pos.js, catalogo.js, inventario.js,
// dashboard.js e historico.js. Cuando una función tan chica se copia
// y pega en seis archivos, el riesgo es que un día alguien la cambie
// en uno solo (ej: para mostrar centavos distinto) y los demás queden
// inconsistentes sin que nadie lo note. Por eso vive aquí una sola vez.

export function formatoMoneda(numero) {
  return `$${numero.toFixed(2)}`;
}

// En español, el singular solo se usa para exactamente 1 ("1 venta");
// el 0 y todo lo demás usan plural ("0 ventas", "2 ventas"). Sin este
// helper, contadores como "${n} ventas" se ven raros en "1 ventas".
export function pluralizar(cantidad, singular, plural) {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`;
}

// Convierte los items guardados en una venta ({productoId, cantidad,
// subtotal}) a un texto legible como "Manzana 1.5kg, Refresco x2".
// Recibe la lista de productos como parámetro (en vez de importarla)
// porque cada pantalla ya tiene su propia copia cargada en memoria;
// así esta función no decide de dónde vienen los datos, solo los
// formatea.
export function describirItems(items, productos) {
  return items
    .map((item) => {
      const producto = productos.find((p) => p.id === item.productoId);
      const nombre = producto ? producto.nombre : "(producto eliminado)";
      const cantidad = producto && producto.tipoVenta === "peso" ? `${item.cantidad}kg` : `x${item.cantidad}`;
      return `${nombre} ${cantidad}`;
    })
    .join(", ");
}
