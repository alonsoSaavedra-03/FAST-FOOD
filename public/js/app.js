// FastOrder S.A. - Cliente PWA Móvil
// Lógica de Catálogo, Carrito, IndexedDB y Sincronización Offline

let productsCatalog = [];
let activeCategory = 'ALL';
let cart = [];
let currentCustomProduct = null;
let simulatedOffline = false;
let deferredPrompt = null;
let activeOrderTracked = null;
let wsClient = null;

// ==========================================
// 1. REGISTRO DE SERVICE WORKER & A2HS
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            console.log('[App] Service Worker registrado exitosamente:', reg.scope);
        } catch (err) {
            console.warn('[App] Error al registrar Service Worker:', err);
        }
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
            console.log('[App] Mensaje del Service Worker: sincronizar órdenes pendientes.');
            syncPendingOrders();
        }
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBanner').classList.add('active');
});

document.getElementById('btnInstallPwa').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] Respuesta de instalación:', outcome);
        deferredPrompt = null;
        document.getElementById('installBanner').classList.remove('active');
    }
});

const btnDismiss = document.getElementById('btnDismissInstall');
if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
        document.getElementById('installBanner').classList.remove('active');
    });
}

// ==========================================
// 2. GESTIÓN DE CONECTIVIDAD & SIMULACIÓN
// ==========================================
function updateNetworkStatusUI() {
    const isOnline = navigator.onLine && !simulatedOffline;
    const btn = document.getElementById('netStatusBtn');
    const text = document.getElementById('netStatusText');
    const notice = document.getElementById('connectionNotice');
    const title = document.getElementById('noticeTitle');
    const badge = document.getElementById('noticeBadge');
    const desc = document.getElementById('noticeDesc');
    const actionBtn = document.getElementById('btnToggleSimulateNet');
    
    const checkoutBtn = document.getElementById('btnConfirmCheckout');
    const checkoutIcon = document.getElementById('checkoutBtnIcon');
    const checkoutText = document.getElementById('checkoutBtnText');

    if (isOnline) {
        if (btn) btn.className = 'status-pill status-online';
        if (text) text.textContent = 'En línea';

        if (notice) {
            notice.className = 'connection-notice notice-online';
            if (title) title.textContent = 'Conexión Activa';
            if (badge) badge.textContent = 'En línea';
            if (desc) desc.textContent = 'Estás conectado en tiempo real. Tus órdenes se despachan directamente a las pantallas de cocina.';
            if (actionBtn) actionBtn.textContent = 'Simular Offline';
        }

        if (checkoutBtn) {
            checkoutBtn.classList.remove('offline-mode');
            if (checkoutIcon) checkoutIcon.textContent = '🚀';
            if (checkoutText) checkoutText.textContent = 'Confirmar Pedido (En línea)';
        }
    } else {
        if (btn) btn.className = 'status-pill status-offline';
        if (text) text.textContent = 'Sin conexión';

        if (notice) {
            notice.className = 'connection-notice notice-offline';
            if (title) title.textContent = 'Modo Sin Conexión';
            if (badge) badge.textContent = 'Offline';
            if (desc) desc.textContent = 'Sin acceso a Internet. Tus pedidos se guardarán en este dispositivo y se sincronizarán al reconectar.';
            if (actionBtn) actionBtn.textContent = 'Reconectar';
        }

        if (checkoutBtn) {
            checkoutBtn.classList.add('offline-mode');
            if (checkoutIcon) checkoutIcon.textContent = '💾';
            if (checkoutText) checkoutText.textContent = 'Guardar Pedido (Sin conexión)';
        }
    }
}

window.addEventListener('online', () => {
    console.log('[Red] Conexión a internet restablecida.');
    updateNetworkStatusUI();
    showToast('🟢 Conexión restablecida. Sincronizando con cocina...', 'success');
    syncPendingOrders();
});

window.addEventListener('offline', () => {
    console.log('[Red] Conexión a internet perdida.');
    updateNetworkStatusUI();
    showToast('⚡ Sin conexión a Internet. Modo local activado.', 'warning');
});

function toggleConnectivitySimulation() {
    simulatedOffline = !simulatedOffline;
    updateNetworkStatusUI();
    if (simulatedOffline) {
        showToast('⚡ Simulación offline activada: Pedidos irán a IndexedDB.', 'warning');
    } else {
        showToast('🟢 Simulación finalizada: Reconectado con cocina en vivo.', 'success');
        syncPendingOrders();
    }
}

document.getElementById('netStatusBtn').addEventListener('click', toggleConnectivitySimulation);
const btnSim = document.getElementById('btnToggleSimulateNet');
if (btnSim) {
    btnSim.addEventListener('click', toggleConnectivitySimulation);
}

// ==========================================
// 3. CARGA DE CATÁLOGO (STALE-WHILE-REVALIDATE)
// ==========================================
async function loadCatalog() {
    try {
        // Primero intentar red
        if (navigator.onLine && !simulatedOffline) {
            const res = await fetch('/api/v1/productos');
            if (res.ok) {
                productsCatalog = await res.json();
                idbSaveCatalog(productsCatalog); // Guardar copia en IndexedDB
                renderProducts();
                return;
            }
        }
    } catch (e) {
        console.warn('[App] No se pudo obtener el menú por red, leyendo de IndexedDB...');
    }

    // Fallback a IndexedDB
    try {
        const cached = await idbGetCachedCatalog();
        if (cached && cached.length > 0) {
            productsCatalog = cached;
            renderProducts();
            showToast('Catálogo cargado desde almacenamiento local offline.', 'info');
            return;
        }
    } catch (err) {
        console.error('[IDB] Error al leer catálogo de IndexedDB:', err);
    }

    // Datos por defecto si es la primera vez offline
    productsCatalog = getFallbackProducts();
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('productsGrid');
    const filtered = activeCategory === 'ALL' 
        ? productsCatalog 
        : productsCatalog.filter(p => p.categoria === activeCategory);

    document.getElementById('productCountLabel').textContent = `${filtered.length} platillos disponibles`;

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px;">No hay productos en esta categoría.</p>';
        return;
    }

    grid.innerHTML = filtered.map(prod => `
        <div class="product-card" data-id="${prod.id_producto}">
            <div class="product-thumb">
                <span>${prod.icono || '🍔'}</span>
                ${prod.es_popular ? '<span class="product-badge">POPULAR</span>' : ''}
            </div>
            <div class="product-body">
                <h4 class="product-title">${prod.nombre}</h4>
                <p class="product-desc">${prod.descripcion}</p>
                <div class="product-footer">
                    <span class="product-price">S/ ${prod.precio.toFixed(2)}</span>
                    <button class="btn-add-item" onclick="openCustomModal('${prod.id_producto}')" title="Añadir">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filtro de Categorías
document.getElementById('categoryTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-pill');
    if (!btn) return;

    document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeCategory = btn.getAttribute('data-cat');
    document.getElementById('currentCategoryTitle').textContent = btn.textContent;
    renderProducts();
});

// ==========================================
// 4. MODAL DE PERSONALIZACIÓN
// ==========================================
window.openCustomModal = function(prodId) {
    const prod = productsCatalog.find(p => p.id_producto === prodId);
    if (!prod) return;

    currentCustomProduct = {
        ...prod,
        selectedAddons: [],
        selectedRemovals: [],
        kitchenNotes: ''
    };

    document.getElementById('modalProdTitle').textContent = prod.nombre;
    document.getElementById('modalProdDesc').textContent = prod.descripcion;
    document.getElementById('modalProdPrice').textContent = `S/ ${prod.precio.toFixed(2)}`;
    document.getElementById('modalKitchenNotes').value = '';

    // Renderizar Opciones de Agregados
    const addons = prod.modificadores_disponibles ? prod.modificadores_disponibles.filter(m => m.tipo === 'AGREGADO') : [
        { id: 'opt-queso', nombre: 'Queso Cheddar Extra', precio: 3.50 },
        { id: 'opt-bacon', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
        { id: 'opt-carne', nombre: 'Carne Adicional 150g', precio: 6.00 },
        { id: 'opt-papas', nombre: 'Papas al Hilo Extras', precio: 2.00 }
    ];

    document.getElementById('modalAddonsList').innerHTML = addons.map(add => `
        <div class="opt-item" onclick="toggleAddon('${add.id}', '${add.nombre}', ${add.precio}, this)">
            <span class="opt-label">➕ ${add.nombre}</span>
            <span class="opt-price">+S/ ${add.precio.toFixed(2)}</span>
        </div>
    `).join('');

    // Renderizar Opciones de Remoción
    const removals = [
        { id: 'rem-cebolla', nombre: 'Sin Cebolla' },
        { id: 'rem-salsas', nombre: 'Sin Salsas' },
        { id: 'rem-tomate', nombre: 'Sin Tomate' },
        { id: 'rem-pepinillos', nombre: 'Sin Pepinillos' }
    ];

    document.getElementById('modalRemovalsList').innerHTML = removals.map(rem => `
        <div class="opt-item" onclick="toggleRemoval('${rem.id}', '${rem.nombre}', this)">
            <span class="opt-label">➖ ${rem.nombre}</span>
            <span style="font-size:0.75rem; color:var(--text-muted);">Gratis</span>
        </div>
    `).join('');

    updateCustomTotal();
    document.getElementById('customModalOverlay').classList.add('active');
};

window.toggleAddon = function(id, nombre, precio, el) {
    el.classList.toggle('selected');
    const idx = currentCustomProduct.selectedAddons.findIndex(a => a.id === id);
    if (idx >= 0) {
        currentCustomProduct.selectedAddons.splice(idx, 1);
    } else {
        currentCustomProduct.selectedAddons.push({ id, nombre, precio });
    }
    updateCustomTotal();
};

window.toggleRemoval = function(id, nombre, el) {
    el.classList.toggle('selected');
    const idx = currentCustomProduct.selectedRemovals.findIndex(r => r.id === id);
    if (idx >= 0) {
        currentCustomProduct.selectedRemovals.splice(idx, 1);
    } else {
        currentCustomProduct.selectedRemovals.push({ id, nombre });
    }
};

function updateCustomTotal() {
    if (!currentCustomProduct) return;
    const addonsTotal = currentCustomProduct.selectedAddons.reduce((sum, a) => sum + a.precio, 0);
    const total = currentCustomProduct.precio + addonsTotal;
    document.getElementById('modalAddTotalBtn').textContent = `S/ ${total.toFixed(2)}`;
}

document.getElementById('btnCloseCustomModal').addEventListener('click', () => {
    document.getElementById('customModalOverlay').classList.remove('active');
});

document.getElementById('btnAddCustomToCart').addEventListener('click', () => {
    if (!currentCustomProduct) return;
    currentCustomProduct.kitchenNotes = document.getElementById('modalKitchenNotes').value.trim();

    const addonsCost = currentCustomProduct.selectedAddons.reduce((sum, a) => sum + a.precio, 0);
    const unitPrice = currentCustomProduct.precio + addonsCost;

    cart.push({
        id_temporal: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        id_producto: currentCustomProduct.id_producto,
        nombre: currentCustomProduct.nombre,
        icono: currentCustomProduct.icono,
        cantidad: 1,
        precio_unitario: unitPrice,
        modificadores: [
            ...currentCustomProduct.selectedAddons.map(a => ({ tipo: 'AGREGADO', nombre: a.nombre, precio: a.precio })),
            ...currentCustomProduct.selectedRemovals.map(r => ({ tipo: 'REMOCION', nombre: r.nombre, precio: 0 }))
        ],
        notas_cocina: currentCustomProduct.kitchenNotes
    });

    if ('vibrate' in navigator) navigator.vibrate(50);
    updateCartUI();
    document.getElementById('customModalOverlay').classList.remove('active');
    showToast(`¡${currentCustomProduct.nombre} añadido al pedido!`, 'success');
});

// ==========================================
// 5. GESTIÓN DEL CARRITO
// ==========================================
function updateCartUI() {
    const totalQty = cart.reduce((sum, i) => sum + i.cantidad, 0);
    const grandTotal = cart.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);

    document.getElementById('thumbBadge').textContent = totalQty;
    document.getElementById('thumbTotal').textContent = `S/ ${grandTotal.toFixed(2)}`;

    // Renderizar dentro del modal del carrito
    const container = document.getElementById('cartItemsContainer');
    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">Tu carrito está vacío. ¡Elige tus platillos favoritos!</p>';
    } else {
        container.innerHTML = cart.map((item, idx) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <div class="cart-item-mods">
                        ${item.modificadores.length > 0 ? item.modificadores.map(m => m.tipo === 'AGREGADO' ? `+${m.nombre}` : `-${m.nombre}`).join(', ') : 'Estándar'}
                        ${item.notas_cocina ? `<br><em>Nota: ${item.notas_cocina}</em>` : ''}
                    </div>
                    <span style="font-weight:800; color:var(--primary); font-size:0.85rem;">S/ ${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                </div>
                <div class="cart-item-actions">
                    <button class="btn-qty" onclick="changeItemQty(${idx}, -1)">-</button>
                    <span style="font-weight:700; font-size:0.9rem;">${item.cantidad}</span>
                    <button class="btn-qty" onclick="changeItemQty(${idx}, 1)">+</button>
                </div>
            </div>
        `).join('');
    }

    const subtotal = grandTotal / 1.18;
    const igv = grandTotal - subtotal;
    document.getElementById('cartSubtotalText').textContent = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById('cartIgvText').textContent = `S/ ${igv.toFixed(2)}`;
    document.getElementById('cartTotalText').textContent = `S/ ${grandTotal.toFixed(2)}`;
}

window.changeItemQty = function(idx, delta) {
    if (!cart[idx]) return;
    cart[idx].cantidad += delta;
    if (cart[idx].cantidad <= 0) {
        cart.splice(idx, 1);
    }
    updateCartUI();
};

document.getElementById('btnOpenCart').addEventListener('click', () => {
    document.getElementById('cartModalOverlay').classList.add('active');
});

document.getElementById('btnCloseCartModal').addEventListener('click', () => {
    document.getElementById('cartModalOverlay').classList.remove('active');
});

// ==========================================
// 6. CHECKOUT: ONLINE VS OFFLINE
// ==========================================
document.getElementById('btnConfirmCheckout').addEventListener('click', async () => {
    if (cart.length === 0) {
        showToast('Agrega al menos un platillo al carrito antes de confirmar.', 'warning');
        return;
    }

    const clienteNombre = document.getElementById('customerNameInput').value.trim() || 'Cliente FastOrder';
    const grandTotal = cart.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);
    const uuidLocal = 'ord-loc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7);

    const orderPayload = {
        uuid_local: uuidLocal,
        cliente_nombre: clienteNombre,
        total: grandTotal,
        items: cart.map(i => ({
            id_producto: i.id_producto,
            producto: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            modificadores: i.modificadores,
            notas_cocina: i.notas_cocina
        })),
        creado_en: new Date().toISOString(),
        es_offline: false,
        status: 'PENDIENTE_SYNC'
    };

    const isConnected = navigator.onLine && !simulatedOffline;

    if (isConnected) {
        // Enviar directo al servidor
        try {
            const res = await fetch('/api/v1/pedidos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });

            if (res.ok) {
                const confirmedOrder = await res.json();
                handleOrderSuccess(confirmedOrder, false);
                return;
            }
        } catch (err) {
            console.warn('[Checkout] Falló el despacho online. Desviando a IndexedDB...');
        }
    }

    // MODO OFFLINE: Persistir en IndexedDB con Background Sync
    orderPayload.es_offline = true;
    orderPayload.ticket_numero = Math.floor(100 + Math.random() * 900);
    await idbSavePendingOrder(orderPayload);

    // Intentar registrar Sync si el navegador lo soporta
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const reg = await navigator.serviceWorker.ready;
            await reg.sync.register('sync-fastorder-orders');
            console.log('[Sync] Evento Background Sync registrado correctamente.');
        } catch (e) {
            console.log('[Sync] Background sync no disponible en este contexto.');
        }
    }

    handleOrderSuccess(orderPayload, true);
});

function handleOrderSuccess(order, isOffline) {
    cart = [];
    updateCartUI();
    document.getElementById('cartModalOverlay').classList.remove('active');

    activeOrderTracked = order;
    startOrderTracking(order, isOffline);

    if (isOffline) {
        showToast(`¡Pedido guardado en cola offline! Ticket preliminar #${order.ticket_numero || 'PWA'}`, 'warning');
    } else {
        showToast(`¡Pedido confirmado! Ticket #${order.ticket_numero} enviado a cocina.`, 'success');
    }
}

// ==========================================
// 7. SINCRONIZACIÓN DE PEDIDOS PENDIENTES
// ==========================================
async function syncPendingOrders() {
    if (!navigator.onLine || simulatedOffline) return;

    try {
        const pending = await idbGetPendingOrders();
        if (pending.length === 0) return;

        console.log(`[Sync] Sincronizando ${pending.length} pedido(s) con el servidor...`);

        for (const order of pending) {
            const res = await fetch('/api/v1/pedidos/sincronizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (res.ok) {
                const syncedOrder = await res.json();
                await idbMarkOrderSynced(order.uuid_local, syncedOrder);
                console.log(`[Sync] Pedido ${order.uuid_local} sincronizado como Ticket #${syncedOrder.ticket_numero}`);
                showToast(`¡Pedido offline sincronizado! Asignado Ticket #${syncedOrder.ticket_numero} en cocina.`, 'success');
                
                if (activeOrderTracked && activeOrderTracked.uuid_local === order.uuid_local) {
                    activeOrderTracked = syncedOrder;
                    startOrderTracking(syncedOrder, false);
                }
            }
        }
    } catch (err) {
        console.error('[Sync] Error al sincronizar pedidos:', err);
    }
}

// ==========================================
// 8. SEGUIMIENTO DE ORDEN EN TIEMPO REAL
// ==========================================
function startOrderTracking(order, isOffline) {
    const sec = document.getElementById('trackingSection');
    sec.style.display = 'block';

    document.getElementById('trackTicketNum').textContent = `Ticket #${order.ticket_numero || 'PWA'}`;
    const badge = document.getElementById('trackStatusBadge');

    if (isOffline) {
        badge.textContent = 'En Cola Local (Sin Red)';
        badge.style.background = '#FEF3C7';
        badge.style.color = '#B45309';
        updateStepNodes(1);
    } else {
        badge.textContent = 'Recibido en Cocina';
        badge.style.background = '#EFF6FF';
        badge.style.color = '#1E3A8A';
        updateStepNodes(1);
    }
}

function updateStepNodes(currentStep) {
    for (let s = 1; s <= 4; s++) {
        const node = document.getElementById(`stepNode${s}`);
        node.classList.remove('completed', 'active');
        if (s < currentStep) node.classList.add('completed');
        if (s === currentStep) node.classList.add('active');
    }
}

// ==========================================
// 9. WEBSOCKETS CLIENT (TIEMPO REAL)
// ==========================================
function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    wsClient = new WebSocket(wsUrl);

    wsClient.onopen = () => {
        console.log('[WS] Conectado al servidor de eventos en tiempo real.');
    };

    wsClient.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'COCINA_ESTADO_ACTUALIZADO') {
                handleOrderStateChange(data);
            }
        } catch (e) {}
    };

    wsClient.onclose = () => {
        console.log('[WS] Conexión cerrada. Reintentando en 3s...');
        setTimeout(initWebSocket, 3000);
    };
}

function handleOrderStateChange(eventData) {
    if (!activeOrderTracked) return;
    if (activeOrderTracked.id_pedido === eventData.id_pedido || activeOrderTracked.ticket_numero === eventData.ticket_numero) {
        const badge = document.getElementById('trackStatusBadge');
        const etaText = document.getElementById('trackEtaText');

        if (eventData.nuevo_estado === 'EN_PREPARACION') {
            badge.textContent = '🔥 En Plancha / Cocción';
            badge.style.background = '#FEF3C7';
            badge.style.color = '#B45309';
            updateStepNodes(2);
            etaText.textContent = `Tiempo restante aproximado: ${eventData.tiempo_estimado || 8} min`;
            showToast(`¡Tu pedido #${eventData.ticket_numero} está en preparación en plancha!`, 'info');
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        } else if (eventData.nuevo_estado === 'LISTO_PARA_ENTREGA') {
            badge.textContent = '🎉 ¡Listo para Recoger!';
            badge.style.background = '#D1FAE5';
            badge.style.color = '#065F46';
            updateStepNodes(3);
            etaText.textContent = '¡Acércate al mostrador de entrega con tu ticket!';
            showToast(`¡Tu pedido #${eventData.ticket_numero} está LISTO para entrega! 🍔`, 'success');
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        } else if (eventData.nuevo_estado === 'ENTREGADO_CLIENTE') {
            badge.textContent = '✅ Pedido Entregado';
            badge.style.background = '#F1F5F9';
            badge.style.color = '#475569';
            updateStepNodes(4);
            etaText.textContent = '¡Gracias por disfrutar de FastOrder S.A.!';
            showToast(`Pedido #${eventData.ticket_numero} despachado con éxito.`, 'info');
        }
    }
}

// ==========================================
// 10. TOAST NOTIFICATIONS HELPER
// ==========================================
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');
    const text = document.getElementById('toastText');

    toast.className = `toast-msg ${type}`;
    if (type === 'success') icon.textContent = '✅';
    else if (type === 'warning') icon.textContent = '⚡';
    else icon.textContent = 'ℹ️';

    text.textContent = msg;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// Catálogo de respaldo inicial (siempre disponible)
function getFallbackProducts() {
    return [
        { id_producto: 'p-01', nombre: 'Combo Doble Clásica', descripcion: '2 carnes de res 150g, queso cheddar, papas fritas y bebida.', precio: 28.50, categoria: 'COMBOS', icono: '🍔', es_popular: true },
        { id_producto: 'p-02', nombre: 'Monster Bacon Burger', descripcion: 'Triple carne, cuádruple tocino ahumado y salsa especial BBQ.', precio: 24.00, categoria: 'BURGERS', icono: '🥓', es_popular: true },
        { id_producto: 'p-03', nombre: 'Cheese Burger Especial', descripcion: 'Carne a la parrilla con doble queso cheddar fundido y pepinillos.', precio: 18.00, categoria: 'BURGERS', icono: '🧀' },
        { id_producto: 'p-04', nombre: 'Pollo Crujiente Deluxe', descripcion: 'Pechuga de pollo empanizada extra crocante con lechuga fresca.', precio: 21.50, categoria: 'BURGERS', icono: '🍗' },
        { id_producto: 'p-05', nombre: 'Papas Rústicas Grandes', descripcion: 'Papas cortadas a mano con sal de mar y orégano.', precio: 9.50, categoria: 'SIDES', icono: '🍟' },
        { id_producto: 'p-06', nombre: 'Aros de Cebolla Crujientes', descripcion: 'Aros de cebolla rebozados acompañados de salsa tártara.', precio: 8.00, categoria: 'SIDES', icono: '🧅' },
        { id_producto: 'p-07', nombre: 'Nuggets de Pollo x10', descripcion: 'Crujientes bocados de pollo con salsa golf o barbacoa.', precio: 14.00, categoria: 'SIDES', icono: '✨' },
        { id_producto: 'p-08', nombre: 'Inka Cola 500ml', descripcion: 'Gaseosa nacional helada o sin helar.', precio: 5.00, categoria: 'DRINKS', icono: '🥤' },
        { id_producto: 'p-09', nombre: 'Chicha Morada Artesanal', descripcion: 'Preparada con maíz morado, piña, manzana y canela.', precio: 6.00, categoria: 'DRINKS', icono: '🍇' },
        { id_producto: 'p-10', nombre: 'Helado Oreo Cream', descripcion: 'Copa de helado con trozos crujientes de galleta Oreo.', precio: 7.50, categoria: 'DESSERTS', icono: '🍦' }
    ];
}

// Inicialización general
document.addEventListener('DOMContentLoaded', () => {
    updateNetworkStatusUI();
    loadCatalog();
    initWebSocket();

    // Soporte para captura de vistas y demostración mediante URL
    const urlParams = new URLSearchParams(window.location.search);
    const demoState = urlParams.get('state');

    if (demoState === 'offline') {
        simulatedOffline = true;
        updateNetworkStatusUI();
    } else if (demoState === 'custom') {
        setTimeout(() => {
            openCustomModal('p-01');
        }, 500);
    } else if (demoState === 'cart') {
        cart = [
            {
                id_temporal: 'demo-1',
                id_producto: 'p-01',
                nombre: 'Combo Doble Clásica',
                cantidad: 1,
                precio_unitario: 32.00,
                modificadores: [{ tipo: 'AGREGADO', nombre: 'Queso Cheddar Extra', precio: 3.50 }],
                notas_cocina: 'Papas bien doradas'
            },
            {
                id_temporal: 'demo-2',
                id_producto: 'p-08',
                nombre: 'Inka Cola 500ml',
                cantidad: 1,
                precio_unitario: 5.00,
                modificadores: [],
                notas_cocina: 'Helada'
            }
        ];
        updateCartUI();
        setTimeout(() => {
            document.getElementById('cartModalOverlay').classList.add('active');
        }, 500);
    } else if (demoState === 'tracking') {
        setTimeout(() => {
            startOrderTracking({
                ticket_numero: 104,
                cliente_nombre: 'Cliente FastOrder',
                total: 37.00
            }, false);
            updateStepNodes(2);
            document.getElementById('trackStatusBadge').textContent = '🔥 En Plancha / Cocción';
            document.getElementById('trackStatusBadge').style.background = '#FEF3C7';
            document.getElementById('trackStatusBadge').style.color = '#B45309';
        }, 400);
    }
});
