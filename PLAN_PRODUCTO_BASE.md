<!--
═══════════════════════════════════════════════════════════════
  PLAN DEL PRODUCTO BASE — POS NEGOCIO DE BARRIO
  Documento de arranque. Se mete a la raíz del repo.
  De aquí parte Claude Code para construir el esqueleto.
═══════════════════════════════════════════════════════════════
-->

# PLAN — POS Negocio de Barrio (Producto Base)

> Versión del plan: 1.0
> Fecha: [HOY]
> Estado: Definición de alcance — antes de codear

---

## 1. QUÉ ES ESTO

Un sistema de punto de venta (POS) **base/genérico** para negocios de barrio:
**fruterías, carnicerías y mini abarrotes.** No es para un cliente específico —
es el PRODUCTO que se adapta y se vende a múltiples clientes.

**Por qué un solo producto sirve a tres giros:** los tres venden una mezcla de
productos **por peso** (fruta, carne) y **por pieza con precio fijo**
(refrescos, tortillas, latas, abarrotes). El motor es el mismo.

**Propósito doble:**
1. **Demo de venta:** se ve completo y funcional para mostrar al prospecto.
2. **Base de producción:** se adapta (logo, productos, precios) a cada cliente que cierra.

---

## 2. DECISIÓN TÉCNICA CLAVE: peso vs pieza

Cada producto tiene un **tipo de venta**:

- **Por peso (kg):** se teclea el precio/kg y los kilos (o se teclea el total y se calcula).
  Ej: manzana $35/kg → vende 1.5 kg → $52.50
- **Por pieza (precio fijo):** se toca el producto y suma su precio.
  Ej: refresco $18 → toca una vez → $18

El POS debe permitir las dos en el mismo ticket. Ese es el corazón del sistema.

---

## 3. LOS DOS ROLES

| Rol | Qué ve y hace | Qué NO ve |
|-----|---------------|-----------|
| **Mostrador (empleado)** | Cobrar, registrar ventas, ver productos y precios | NO ve ganancias, costos, márgenes ni reportes del dueño |
| **Dueño** | Todo lo del mostrador + dashboard, costos, márgenes, inventario, merma, histórico | — |

Acceso simple por PIN o selección de rol al entrar (sin login complejo para el demo).

---

## 4. MÓDULOS DE LA VERSIÓN 1 (el "todo" correcto)

> Regla: que se vea COMPLETO, no que tenga todo lo imaginable.
> Estos 6 módulos hacen un demo convincente y vendible.

### A. Punto de Venta (POS) — el más importante
- Pantalla de cobro rápida
- Agregar productos por peso (teclea kg) o por pieza (toca)
- Ticket en vivo (lista de lo que lleva el cliente + total)
- Cobrar: efectivo (calcula cambio) o tarjeta
- Guardar la venta al cerrar

### B. Catálogo de productos
- Lista de productos con: nombre, tipo (peso/pieza), precio venta, costo, categoría
- Agregar / editar / quitar producto
- (El costo solo lo ve el dueño)

### C. Inventario
- Stock actual por producto
- Registrar entrada de mercancía (compra)
- El stock baja solo con cada venta

### D. Merma (solo dueño)
- Registrar producto echado a perder / tirado
- Resta del inventario y se contabiliza como pérdida

### E. Dashboard (solo dueño)
- Venta del día / semana / mes
- Producto que más DEJA (margen), no solo el que más vende
- Total de merma del periodo
- Ganancia estimada

### F. Histórico de ventas
- Lista de ventas pasadas con fecha, total, productos
- Filtro por día

---

## 5. MODELO DE DATOS (estructura, para Claude Code)

Almacenamiento: **localStorage** (sin servidor, igual que Sabor & Capricho —
gratis, funciona offline, suficiente para una caja).

```
producto: {
  id, nombre, categoria,
  tipoVenta: "peso" | "pieza",
  precioVenta,      // por kg si es peso; por unidad si es pieza
  costo,            // lo que le cuesta al dueño (privado)
  stock,            // en kg o en piezas
  unidad: "kg" | "pza"
}

venta: {
  id, fecha, hora,
  items: [ { productoId, cantidad, subtotal } ],
  total, metodoPago: "efectivo" | "tarjeta",
  rol: "mostrador" | "dueño"   // quién la registró
}

merma: {
  id, fecha, productoId, cantidad, costoPerdido, motivo
}

config: {
  nombreNegocio, giro, logo, moneda: "MXN"
}
```

---

## 6. LO QUE NO VA EN LA V1 (límites para no enterrarse)

- Sin cuentas en la nube / multi-sucursal
- Sin facturación SAT (se ve después si el cliente lo pide → upsell)
- Sin app nativa (es PWA, vive en el navegador / se instala al inicio)
- Sin reportes complejos ni gráficas avanzadas (dashboard simple y claro)
- Sin gestión de proveedores ni cuentas por pagar

Todo esto es FUTURO / UPSELL. No v1.

---

## 7. BASE DE PARTIDA

Se adapta del código existente de **Sabor & Capricho** (ya tiene POS,
catálogo, inventario, dashboard, histórico). El trabajo principal es:
1. Agregar el **tipo de venta por peso** (Sabor & Capricho es solo por pieza)
2. Agregar los **dos roles** con permisos
3. Reforzar el módulo de **merma**
4. Cargar **datos de ejemplo** realistas (frutas, carnes, abarrotes) para el demo

---

## 8. DATOS DE EJEMPLO PARA EL DEMO

Cargar productos de muestra para que el demo se vea vivo:
- **Por peso:** manzana, plátano, naranja, jitomate, bistec, pollo
- **Por pieza:** refresco, tortillas (paquete), sabritas, agua, pan

Con ventas de ejemplo de varios días para que el dashboard y el histórico
muestren datos reales al cliente.

---

## 9. SIGUIENTE PASO

Construir en **Claude Code** dentro del repo, módulo por módulo, en este orden:
1. Estructura base + datos de ejemplo + selección de rol
2. POS (peso + pieza) — el núcleo
3. Catálogo
4. Inventario + merma
5. Dashboard + histórico
6. Pulido visual para que se vea profesional en el demo
