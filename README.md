# 🍔 FastOrder S.A. | Ecosistema PWA Offline-First & KDS en Tiempo Real

> **SENATI - Formación Profesional Dual**  
> **Carrera:** Informática y Desarrollo de Aplicaciones Web  
> **Estudiante:** Saavedra Donayre, Alonso Stevens  
> **Bloque:** 60PAWDS401 | **Semestre:** IV  
> **Proyecto:** Especificación Técnica e Implementación - Tarea 7  

---

## 📌 Descripción del Sistema

**FastOrder S.A.** es una solución web progresiva integral diseñada para eliminar los cuellos de botella operativos en cadenas de restaurantes de comida rápida. Resuelve la congestión en mostradores y la desconexión con la cocina implementando:

1. **Cliente PWA Móvil (Mobile-First & Offline-First):**
   - Catálogo interactivo categorizado (Hamburguesas, Combos, Acompañamientos, Bebidas, Postres).
   - Modal de personalización con recálculo dinámico de precios (adición de ingredientes extra y exclusiones).
   - Ergonomía táctil bajo la regla de la **Zona del Pulgar (Thumb Zone)**.
   - Resiliencia desconectada mediante **Service Worker (`sw.js`)**, **Cache Storage API** e **IndexedDB (`FastOrderDB`)**.
   - Emisión de tickets en cola offline con identificador **UUID v4** y despacho autónomo con **Background Sync API**.
   - Seguimiento en vivo del estado del pedido con barra de progreso reactiva.

2. **Monitor de Cocina KDS (Kitchen Display System):**
   - Tablero táctil en tiempo real para cocineros conectado mediante **WebSockets (WSS)** bidireccionales.
   - Despliegue instantáneo de comandas con alerta sonora y detalles claros de personalización.
   - **Cronómetros dinámicos** por comanda con código de color de semáforo:
     - 🟢 **Verde:** Menos de 5 minutos.
     - 🟡 **Amarillo:** Entre 5 y 10 minutos.
     - 🔴 **Rojo:** Más de 10 minutos (alerta visual de demora).
   - Control de estados operativos: `Recibido` ➔ `🔥 En Cocción` ➔ `✓ Listo para Entrega` ➔ `📦 Despachado`.

3. **Backend API REST & WebSocket Server:**
   - Construido en Node.js y Express con el módulo `ws`.
   - Garantía de **Idempotencia Transaccional** en el endpoint `/api/v1/pedidos/sincronizar` para evitar pedidos duplicados ante reintentos de red.
   - Emisión y recepción de eventos JSON estandarizados (`NUEVO_PEDIDO_COCINA`, `COCINA_ESTADO_ACTUALIZADO`).

---

## 🚀 Cómo Ejecutar la Aplicación

### Requisitos Previos
- Tener instalado **Node.js** (v18 o superior).

### Pasos de Inicio
1. Abre una terminal (PowerShell o CMD) en la carpeta del proyecto:
   ```bash
   cd C:\Users\likin\fastorder-pwa
   ```
2. Inicia el servidor:
   ```bash
   npm start
   ```
3. Abre tu navegador en las siguientes URLs:
   - 🏛️ **Portal del Ecosistema:** [http://localhost:3000/portal.html](http://localhost:3000/portal.html)
   - 📱 **App Cliente PWA:** [http://localhost:3000/](http://localhost:3000/)
   - 🍳 **Monitor KDS Cocina:** [http://localhost:3000/cocina.html](http://localhost:3000/cocina.html)

---

## 🧪 Protocolo de Pruebas y Demostración

### Prueba 1: Pedido en Línea y Recepción en Cocina (Tiempo Real)
1. Abre en dos ventanas paralelas: la **App Cliente** y el **Monitor KDS**.
2. En el cliente, selecciona un platillo (ej. *Combo Doble Clásica*), personalízalo con *Extra Queso* y confirma el pedido.
3. Observa cómo el ticket aparece **instantáneamente** en la pantalla KDS con sonido de campana y cronómetro activo.

### Prueba 2: Resiliencia Offline y Sincronización Automática
1. En la barra superior del cliente PWA, pulsa el botón verde **Online** para activar la **Simulación Offline** (o activa Modo Avión en DevTools).
2. Agrega una hamburguesa y pulsa **Guardar en Cola Offline**.
3. El pedido se almacenará de inmediato en **IndexedDB (`pending_orders`)** con estado `PENDIENTE_SYNC`.
4. Vuelve a pulsar el botón para volver a **Online**: el Service Worker detectará la red y sincronizará la orden automáticamente. La comanda aparecerá en cocina con el distintivo `⚡ OFFLINE SYNC`.

### Prueba 3: Notificación de Estados al Cliente
1. En la pantalla KDS de cocina, pulsa **🔥 Iniciar Cocción**.
2. Nota cómo la barra de seguimiento del cliente cambia a *En Preparación* y recibe un mensaje de aviso.
3. Pulsa **✓ Marcar Listo para Entrega**: el cliente recibirá una alerta verde indicando que puede retirar su pedido.
