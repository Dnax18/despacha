<!--
═══════════════════════════════════════════════════════════════
  DISEÑO — DESPACHA (POS Negocio de Barrio)
  Documento de definición visual. Se mete a la raíz del repo.
  Claude Code deriva TODO color y tipografía de aquí. No improvisar.
═══════════════════════════════════════════════════════════════
-->

# DISEÑO — Despacha

> Producto: **Despacha** — POS para negocio de barrio (frutería, carnicería, mini abarrotes)
> Sensación objetivo: limpio y moderno tipo fintech, pero cálido y claro para un dueño no técnico.
> Profesional y confiable como app de banco, sin ser frío ni intimidante.

---

## 1. PALETA

Todos los colores son variables CSS. El **verde principal** es UNA variable
que se cambia por cliente para re-tematizar toda la app (frutería verde,
carnicería rojo vino, abarrotes azul, etc.).

```css
:root {
  --marca:        #0F5132;  /* Verde profundo — color de marca, CAMBIABLE por cliente */
  --marca-claro:  #157347;  /* variante para hovers/estados */
  --accion:       #7CB342;  /* Verde lima — botones de cobrar/confirmar (acción) */
  --fondo:        #FAFAF7;  /* Blanco hueso — fondo, descansa la vista */
  --superficie:   #FFFFFF;  /* tarjetas, paneles */
  --tinta:        #1A1F1D;  /* texto y números */
  --tinta-suave:  #5C6661;  /* texto secundario, etiquetas */
  --aviso:        #F5A623;  /* ámbar — stock bajo, merma (avisa sin alarmar) */
  --critico:      #D64545;  /* rojo — eliminar, pérdida (solo lo crítico) */
  --linea:        #E8E8E2;  /* bordes, divisores */
}
```

---

## 2. TIPOGRAFÍA

- **Números y precios:** tipografía con **números tabulares** (alineación perfecta
  en columnas). En un POS los números son el producto; deben verse impecables y
  legibles a distancia. Ej: Inter (tiene tabular-nums) o similar.
- **Interfaz y texto:** sans-serif muy legible, sin adornos, que un señor de 55
  años lea sin lentes. Misma familia (Inter) en pesos distintos mantiene unidad.
- **Escala:** precios y totales grandes y en negrita; etiquetas pequeñas en
  mayúsculas con espaciado. El total a cobrar es el número más grande de la pantalla.

```css
font-feature-settings: "tnum";  /* números tabulares donde haya cifras */
```

---

## 3. LAYOUT DEL POS (computadora primero, responsive hacia abajo)

Se diseña para pantalla de computadora (lo que se propone al cliente), pero
**responsive**: funciona en tablet y celular si el negocio no tiene compu.
No se excluye a ningún cliente por su dispositivo.

```
┌─────────────────────────────────────────────────────────┐
│ [Logo]   [ Buscar producto... 🔍 ]   Mostrador▾   12:45  │  ← barra superior
├─────────────────────────────────────────────────────────┤
│ [ Fruta ][ Carne ][ Abarrotes ][ Bebidas ]  ⌄toggle      │  ← CATEGORÍAS ARRIBA
├──────────────────────────────────┬──────────────────────┤
│                                  │   TICKET ACTUAL       │
│   GRID DE PRODUCTOS              │                       │
│   ┌────┐ ┌────┐ ┌────┐          │  Manzana 1.5kg   $52  │
│   │ 🍎 │ │ 🥩 │ │ 🥤 │          │  Refresco         $18  │
│   └────┘ └────┘ └────┘          │  ──────────────────   │
│   (toca pieza = suma             │  TOTAL       $70.00   │
│    toca peso = teclado kg)       │                       │
│                                  │  [    COBRAR    ]     │  ← lima, grande
└──────────────────────────────────┴──────────────────────┘
```

**En tablet/celular:** el ticket pasa a una barra inferior desplegable;
el grid de productos se reacomoda a menos columnas.

### Categorías arriba con toggle
Las categorías van en barra horizontal arriba del grid. Un toggle (⌄) las
despliega/colapsa para mantener la pantalla limpia cuando no se usan.

### Búsqueda instantánea (live search)
> NOTA TÉCNICA: NO es AJAX (no hay servidor). Es filtrado en vivo de lo que
> ya está en memoria (localStorage). Al escribir "man" filtra al instante
> manzana, mango, mandarina. Es lo más rápido para agilizar el cobro.

---

## 4. ELEMENTO DE FIRMA: entrada de peso

Lo que hace memorable a Despacha. Al tocar un producto por kilo, aparece un
**teclado numérico grande y claro** donde se teclea kilos o monto, con el
cálculo en vivo (precio/kg × kg = subtotal). Rápido y satisfactorio. Ahí se
gasta la audacia del diseño; el resto queda quieto y limpio.

---

## 5. COMPONENTES BASE

- **Tarjeta de producto:** ícono/color por categoría, nombre, precio, indicador
  de tipo (kg / pza). Grande, tocable con el dedo.
- **Botón primario (Cobrar):** lima (--accion), grande, sombra suave. El más
  visible de la pantalla.
- **Botón destructivo:** rojo (--critico), solo para eliminar/merma.
- **Teclado numérico:** teclas grandes para peso y para cobro/cambio.
- **Toggle de rol:** Mostrador / Dueño visible en la barra.
- Border-radius medio (12px), sombras suaves. Nada de esquinas duras ni
  aspecto agresivo. Limpio y amable.

---

## 6. TEMATIZACIÓN POR CLIENTE

Para adaptar Despacha a cada negocio que se cierra:
1. Cambiar `--marca` (un valor) → re-tematiza toda la app.
2. Cambiar logo en la barra superior.
3. Cambiar `nombreNegocio` en config.
Tres cambios y el producto tiene identidad nueva para cada cliente.

---

## 7. PISO DE CALIDAD (no negociable)

- Responsive hasta celular.
- Foco de teclado visible (accesibilidad).
- Texto legible a distancia (es un POS, se ve de lejos).
- Respeta reduced-motion.
- Contraste alto en números y botones de acción.

---

## 8. VOZ / TEXTOS (copy)

- Botones dicen lo que hacen: "Cobrar", "Agregar", "Guardar venta". No "Enviar".
- El botón que dice "Cobrar" produce confirmación "Venta guardada".
- Pantallas vacías invitan a actuar: "Aún no hay ventas hoy. Toca un producto
  para empezar a cobrar."
- Errores claros, sin disculpas vagas: "Falta el peso del producto."
- Tono cercano y directo, en español de México, sentence case.
