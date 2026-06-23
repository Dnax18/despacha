// ============================================================
// datos-ejemplo.js — DATOS DE MUESTRA PARA EL DEMO
// ============================================================
// Este archivo solo DESCRIBE datos, no guarda nada por sí mismo.
// Quien decide cuándo usarlos (la primera vez que se abre la app)
// es js/inicio.js. Separar "qué datos hay" de "cuándo se cargan"
// hace que, el día que un cliente real capture su propio catálogo,
// baste con no llamar a este archivo —nada más se cambia.
// ============================================================

// `export const` comparte esta lista con quien la importe, pero el
// `const` evita que alguien la reasigne por accidente (sí se pueden
// modificar sus elementos, pero no apuntar el nombre a otra cosa).
export const productosEjemplo = [
  // ---- Por peso (kg): el POS pedirá teclear el peso y calculará el
  // subtotal como precioVenta × kg ----
  { id: "p1", nombre: "Manzana", categoria: "Fruta", tipoVenta: "peso", precioVenta: 35, costo: 18, stock: 40, unidad: "kg" },
  { id: "p2", nombre: "Plátano", categoria: "Fruta", tipoVenta: "peso", precioVenta: 18, costo: 9, stock: 35, unidad: "kg" },
  { id: "p3", nombre: "Naranja", categoria: "Fruta", tipoVenta: "peso", precioVenta: 22, costo: 11, stock: 30, unidad: "kg" },
  { id: "p4", nombre: "Jitomate", categoria: "Fruta", tipoVenta: "peso", precioVenta: 28, costo: 14, stock: 25, unidad: "kg" },
  { id: "p5", nombre: "Bistec de res", categoria: "Carne", tipoVenta: "peso", precioVenta: 145, costo: 95, stock: 15, unidad: "kg" },
  { id: "p6", nombre: "Pollo (pierna y muslo)", categoria: "Carne", tipoVenta: "peso", precioVenta: 65, costo: 42, stock: 20, unidad: "kg" },

  // ---- Por pieza: precio fijo, el POS solo suma precioVenta una vez
  // por cada toque ----
  { id: "p7", nombre: "Refresco 600ml", categoria: "Bebidas", tipoVenta: "pieza", precioVenta: 18, costo: 11, stock: 60, unidad: "pza" },
  { id: "p8", nombre: "Tortillas (paquete)", categoria: "Abarrotes", tipoVenta: "pieza", precioVenta: 22, costo: 14, stock: 30, unidad: "pza" },
  { id: "p9", nombre: "Sabritas", categoria: "Abarrotes", tipoVenta: "pieza", precioVenta: 17, costo: 10, stock: 40, unidad: "pza" },
  { id: "p10", nombre: "Agua 1L", categoria: "Bebidas", tipoVenta: "pieza", precioVenta: 15, costo: 8, stock: 50, unidad: "pza" },
  { id: "p11", nombre: "Pan blanco", categoria: "Abarrotes", tipoVenta: "pieza", precioVenta: 32, costo: 20, stock: 18, unidad: "pza" },
];

// Config de ejemplo: así un prospecto ve la app "viva" desde el primer
// clic, en vez de una pantalla en blanco pidiendo datos.
export const configEjemplo = {
  nombreNegocio: "Frutería Despacha",
  giro: "frutería",
  logo: "",
  moneda: "MXN",
};

// Resta días a la fecha de hoy y regresa el resultado en formato
// "YYYY-MM-DD" (el mismo que usa pos.js al guardar una venta real).
// Es una FUNCIÓN (no una lista fija como productosEjemplo) porque las
// fechas tienen que calcularse en el momento en que se abre la app: si
// las hubiéramos escrito fijas, el demo se vería "viejo" cada día que
// pasara.
function fechaHaceNDias(diasAtras) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);
  return fecha.toISOString().slice(0, 10);
}

// Ventas de ejemplo repartidas en los últimos días, para que el
// dashboard y el histórico (módulo 5) no se vean vacíos en el primer
// arranque. Los montos coinciden con los precios de productosEjemplo.
export function generarVentasEjemplo() {
  const plantillas = [
    {
      diasAtras: 0,
      hora: "09:15",
      rol: "mostrador",
      metodoPago: "efectivo",
      items: [
        { productoId: "p1", cantidad: 1.2, subtotal: 42 }, // Manzana 1.2kg × $35
        { productoId: "p7", cantidad: 2, subtotal: 36 }, // Refresco x2 × $18
      ],
    },
    {
      diasAtras: 0,
      hora: "11:40",
      rol: "mostrador",
      metodoPago: "tarjeta",
      items: [
        { productoId: "p5", cantidad: 0.8, subtotal: 116 }, // Bistec 0.8kg × $145
        { productoId: "p9", cantidad: 1, subtotal: 17 }, // Sabritas x1
      ],
    },
    {
      diasAtras: 1,
      hora: "10:05",
      rol: "dueño",
      metodoPago: "efectivo",
      items: [
        { productoId: "p6", cantidad: 1.5, subtotal: 97.5 }, // Pollo 1.5kg × $65
        { productoId: "p10", cantidad: 3, subtotal: 45 }, // Agua x3
      ],
    },
    {
      diasAtras: 2,
      hora: "16:20",
      rol: "mostrador",
      metodoPago: "efectivo",
      items: [
        { productoId: "p1", cantidad: 2, subtotal: 70 }, // Manzana 2kg
        { productoId: "p7", cantidad: 1, subtotal: 18 }, // Refresco x1
      ],
    },
    {
      diasAtras: 4,
      hora: "12:00",
      rol: "mostrador",
      metodoPago: "tarjeta",
      items: [
        { productoId: "p9", cantidad: 4, subtotal: 68 }, // Sabritas x4
        { productoId: "p10", cantidad: 2, subtotal: 30 }, // Agua x2
      ],
    },
    {
      diasAtras: 6,
      hora: "09:50",
      rol: "dueño",
      metodoPago: "efectivo",
      items: [
        { productoId: "p5", cantidad: 1, subtotal: 145 }, // Bistec 1kg
      ],
    },
  ];

  return plantillas.map((plantilla) => ({
    id: crypto.randomUUID(),
    fecha: fechaHaceNDias(plantilla.diasAtras),
    hora: plantilla.hora,
    items: plantilla.items,
    total: plantilla.items.reduce((acumulado, item) => acumulado + item.subtotal, 0),
    metodoPago: plantilla.metodoPago,
    rol: plantilla.rol,
  }));
}
