<!--
═══════════════════════════════════════════════════════════════
  BITÁCORA.md — Avance del proyecto Despacha
  Se actualiza al final de cada sesión de trabajo.
═══════════════════════════════════════════════════════════════
-->

# Bitácora — Despacha

> Última actualización: 2026-06-22

---

## 1. Módulos construidos

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Estructura base + datos de ejemplo + selección de rol | Terminado |
| 2 | POS (cobro por peso y por pieza) | Terminado |
| 3 | Catálogo de productos | Terminado |
| 4 | Inventario + Merma | Terminado |
| 5 | Dashboard + Histórico de ventas | Terminado |
| 6 | Pulido visual | Terminado |

**Extras agregados sobre el plan original** (a partir de feedback durante las pruebas):

- Validación de stock en el POS (no se puede vender más de lo que hay).
- "Ventas recientes" en la pantalla de cobro, para resolver dudas de un cliente sin entrar al histórico.
- Teclado físico + Escape en todos los modales de la app.
- Indicador de "Falta: $X" mientras se teclea el efectivo recibido.
- Apartado de "Ingresos por método de pago" (efectivo vs. tarjeta) en el dashboard.
- Edición de una venta ya registrada (solo Dueño), con ajuste automático de stock.
- Reembolso completo de una venta (solo Dueño): regresa el stock, marca la venta como "Reembolsada" y el dashboard la excluye de los totales — pendiente de revisar a fondo en una sesión real con el cliente.
- Ajuste directo de stock en Inventario (corregir un conteo, sin pasar por merma).
- Responsive revisado y corregido para celular/tablet.
- PWA instalable + funcional sin internet (ver secciones 3 y 4).

---

## 2. Qué hace cada archivo `.js`

| Archivo | Qué hace |
|---------|----------|
| `js/almacen.js` | Única capa que toca `localStorage`: guarda/lee productos, config, rol, ventas, mermas y entradas. |
| `js/formato.js` | Helpers compartidos: formato de moneda, pluralización en español, y descripción legible de los productos de una venta. |
| `js/datos-ejemplo.js` | Catálogo y ventas de ejemplo (varios días) que se siembran solo la primera vez que se abre la app. |
| `js/inicio.js` | Lógica de la pantalla de selección de rol (`index.html`); siembra los datos de ejemplo si es la primera vez. |
| `js/pos.js` | El POS: agregar productos por peso/pieza al ticket, validar stock, cobrar (efectivo/tarjeta), guardar la venta, ventas recientes. |
| `js/catalogo.js` | Listar, agregar, editar y eliminar productos; el costo y la gestión son exclusivos del Dueño. |
| `js/inventario.js` | Stock por producto, registrar entradas de mercancía, ajustar stock directo, y registrar merma. |
| `js/dashboard.js` | Calcula y pinta las métricas del periodo elegido: venta total, ganancia estimada, merma, producto que más deja margen, ingresos por método de pago. |
| `js/historico.js` | Lista de ventas pasadas, filtro por día, edición de una venta (con ajuste de stock) y reembolso completo. |
| `js/registro-pwa.js` | Activa el service worker (`sw.js`) en cada pantalla para que la app funcione offline y se pueda instalar. |

---

## 3. Estado del responsive

Revisado y corregido en celular (390px) y laptop angosta (1280px), usando Chromium automatizado:

- **Navegación** (Cobrar/Catálogo/Inventario/Dashboard/Histórico): en pantallas angostas ya no se corta — se desliza horizontalmente como pestañas.
- **Tablas** (catálogo, inventario, histórico): se deslizan horizontalmente dentro de su propio contenedor en vez de romper el ancho de la página.
- **Ticket del POS**: en celular se vuelve una barra fija abajo, colapsable con un botón (⌄), tal como pide el documento de diseño ("el ticket pasa a una barra inferior desplegable").
- **Dashboard**: las tarjetas se acomodan solas (grid automático), no necesitó ajustes.

**Pendiente de revisar:** solo se probó en Chromium simulando tamaños de pantalla. No se ha probado en un dispositivo físico (celular o tablet reales), ni en otros navegadores (Safari, Firefox).

---

## 4. Estado del PWA

- `manifest.json` con nombre, colores de marca e íconos (192px y 512px, la "D" verde del logo).
- `sw.js` (service worker): guarda copia de todos los archivos de la app; estrategia "internet primero, caché de respaldo" — usa la versión más reciente si hay conexión, y la última guardada si no la hay.
- `js/registro-pwa.js` activa el service worker en las 6 pantallas.
- Confirmado con el motor de instalabilidad de Chrome: **0 errores**. Confirmado que la app sigue funcionando (POS visible y operable) simulando estar sin internet, después de una primera visita.
- **Instalación real confirmada en celular** (2026-06-22): se probó "Agregar a inicio" en un dispositivo físico y quedó instalada con el ícono de la "D" verde, abriendo en su propia ventana sin barra del navegador.

**Pendiente de revisar:** al instalarla y usarla en el celular real aparecieron ajustes de diseño/comportamiento por afinar en pantallas móviles — quedan como primer pendiente de la próxima sesión (ver sección 5).

---

## 5. Pendientes para la próxima sesión

> La sesión de mañana arranca con el primer punto: ajustes de diseño/comportamiento
> en móvil, detectados al usar la PWA ya instalada en un celular real.

- [ ] **Primer pendiente de mañana:** afinar ajustes de móvil encontrados al probar la app instalada en un celular real (pendiente anotar el detalle específico de cada ajuste al retomar).
- [ ] Probar el flujo completo (POS, catálogo, inventario, dashboard, histórico) en un navegador distinto a Chrome (Safari es importante si el cliente usa iPhone/iPad).
- [ ] Probar la instalación real también en una laptop/escritorio (ya se confirmó en celular).
- [ ] Decidir si se cotiza la integración con una terminal de pago real para el cobro con tarjeta (por ahora es solo registro contable, decisión en pausa).
- [ ] Revisar con calma el flujo de "editar/reembolsar venta" en un escenario real con el cliente, ya que es la funcionalidad más nueva y más delicada (toca inventario y dinero).
- [ ] Pantalla de configuración para cambiar `--marca`, logo y nombre del negocio sin editar código — hoy la tematización por cliente se hace a mano en los archivos.
- [ ] Limpiar carpetas `smoke-test-tmp*` vacías que quedaron de las pruebas de esta sesión (bloqueadas temporalmente por OneDrive, no son parte del proyecto).

---

## 6. Control de versiones

- Repositorio git local: inicializado el 2026-06-22.
- Repo remoto en GitHub: **subido y sincronizado** — https://github.com/Dnax18/despacha (rama `main`, `git status` confirma "up to date with 'origin/main'").
