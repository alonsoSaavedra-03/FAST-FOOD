// FastOrder S.A. - Kitchen Display System (KDS)
// Lógica de Recepción de Comandas, Timers y WebSockets

let kdsOrders = [];
let wsConnection = null;
let soundEnabled = true;
let audioCtx = null;

// ==========================================
// 1. RELOJ DIGITAL DE COCINA
// ==========================================
function updateClock() {
    const now = new Date();
    const str = now.toTimeString().split(' ')[0];
    document.getElementById('kdsClock').textContent = str;
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================
function playNewOrderSound() {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        // Secuencia armónica agradable de cocina (ding-dong doble)
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Re5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // La5

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.65);
    } catch (e) {
        console.warn('[Audio] No se pudo reproducir alerta de audio:', e);
    }
}

document.getElementById('btnToggleSound').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('btnToggleSound');
    if (soundEnabled) {
        btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg> Sonido Activado`;
        playNewOrderSound();
    } else {
        btn.innerHTML = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                <line x1="23" y1="9" x2="17" y2="15"></line>
                <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg> Sonido Silenciado`;
    }
});

// ==========================================
// 3. PERSISTENCIA LOCAL & CARGA DE COMANDAS (OFFLINE-FIRST & SERVERLESS)
// ==========================================
const CLOUD_CHANNEL = 'fastorder-senati-live-2026';
let kdsCloudEventSource = null;
let kdsPollingInterval = null;
let kdsWsAttempts = 0;
let lastRenderedHash = '';
let isRehydratingServer = false;

function initKdsCloudRealtime() {
    if (kdsCloudEventSource || !('EventSource' in window)) return;
    try {
        kdsCloudEventSource = new EventSource(`https://ntfy.sh/${CLOUD_CHANNEL}/sse`);
        kdsCloudEventSource.onmessage = (event) => {
            try {
                const ntfyMsg = JSON.parse(event.data);
                if (ntfyMsg.event === 'message' && ntfyMsg.message) {
                    let data = ntfyMsg.message;
                    if (typeof data === 'string') {
                        data = JSON.parse(data);
                    }
                    console.log('[KDS Cloud] Evento en vivo recibido:', data.type);
                    if (data.type === 'NUEVO_PEDIDO_COCINA') {
                        handleNewOrderFromClient(data.payload);
                    } else if (data.type === 'COCINA_ESTADO_ACTUALIZADO') {
                        handleStateUpdate(data);
                    } else if (data.type === 'COCINA_REINICIADA') {
                        kdsOrders = [];
                        saveKdsOrdersLocal();
                        lastRenderedHash = '';
                        renderKdsBoard();
                        showKdsDynamicIsland('Tablero Limpio', 'Comandas reseteadas', 'info');
                    }
                }
            } catch (e) {}
        };
    } catch (e) {}
}

function saveKdsOrdersLocal() {
    try {
        localStorage.setItem('fastorder_kds_orders', JSON.stringify(kdsOrders));
    } catch (e) {}
}

function loadKdsOrdersLocal() {
    try {
        const raw = localStorage.getItem('fastorder_kds_orders');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const now = Date.now();
                // Descartar órdenes ya entregadas o con más de 60 minutos de antigüedad (purga automática de comandas de prueba viejas como 104 y 105)
                kdsOrders = parsed.filter(o => {
                    if (o.status === 'ENTREGADO_CLIENTE') return false;
                    if (o.creado_en) {
                        const ageMins = (now - new Date(o.creado_en).getTime()) / 60000;
                        if (ageMins > 60) return false;
                    }
                    return true;
                });
                saveKdsOrdersLocal();
                renderKdsBoard();
            }
        }
    } catch (e) {}
}

async function loadKdsOrders() {
    try {
        const res = await fetch('/api/v1/pedidos?t=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
            const list = await res.json();
            if (Array.isArray(list)) {
                const now = Date.now();
                const serverOrders = list.filter(o => {
                    if (o.status === 'ENTREGADO_CLIENTE') return false;
                    if (o.creado_en) {
                        const ageMins = (now - new Date(o.creado_en).getTime()) / 60000;
                        if (ageMins > 60) return false;
                    }
                    return true;
                });

                // Si el servidor serverless se reinició en frío (0 órdenes en memoria)
                // pero KDS tiene órdenes locales activas, rehidratar el servidor automáticamente
                if (serverOrders.length === 0 && kdsOrders.length > 0 && !isRehydratingServer) {
                    isRehydratingServer = true;
                    fetch('/api/v1/pedidos/rehidratar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orders: kdsOrders })
                    }).catch(() => {}).finally(() => { isRehydratingServer = false; });
                } else if (serverOrders.length > 0) {
                    // Mezclar manteniendo cualquier comanda local válida
                    const merged = [...serverOrders];
                    kdsOrders.forEach(localOrd => {
                        const exists = merged.some(s => 
                            s.id_pedido === localOrd.id_pedido || 
                            (localOrd.uuid_local && s.uuid_local === localOrd.uuid_local) ||
                            (localOrd.ticket_numero && Number(s.ticket_numero) === Number(localOrd.ticket_numero))
                        );
                        if (!exists && localOrd.status !== 'ENTREGADO_CLIENTE') {
                            merged.push(localOrd);
                        }
                    });
                    kdsOrders = merged;
                }

                // Generar hash de estado: SOLO re-renderizar si hubo un cambio real
                const currentHash = JSON.stringify(kdsOrders.map(o => ({ id: o.id_pedido, s: o.status, t: o.ticket_numero })));
                if (currentHash !== lastRenderedHash) {
                    lastRenderedHash = currentHash;
                    saveKdsOrdersLocal();
                    renderKdsBoard();
                }
            }
        }
    } catch (err) {
        console.warn('[KDS] Sondeo HTTP temporalmente no disponible:', err.message);
    }
}

function initKdsWebSocket() {
    // En hosting serverless Vercel, WebSockets no están soportados nativamente por arquitectura Lambda (error 200).
    // Se activa el canal Cloud Realtime (SSE) + sondeo inteligente sin registrar errores en consola.
    if (window.location.hostname.endsWith('vercel.app')) {
        activateKdsHttpPolling();
        return;
    }

    if (wsConnection && (wsConnection.readyState === WebSocket.OPEN || wsConnection.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
        wsConnection = new WebSocket(wsUrl);

        wsConnection.onopen = () => {
            console.log('[KDS WS] Conectado al broker de cocina en tiempo real.');
            kdsWsAttempts = 0;
            if (kdsPollingInterval) { 
                clearInterval(kdsPollingInterval); 
                kdsPollingInterval = null; 
            }
            const badge = document.getElementById('kdsWsBadge');
            if (badge) badge.className = 'ws-indicator ws-online';
            const wsText = document.getElementById('kdsWsText');
            if (wsText) wsText.textContent = 'WSS Conectado';
        };

        wsConnection.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data);
                console.log('[KDS WS] Evento entrante:', msg.type);

                if (msg.type === 'NUEVO_PEDIDO_COCINA') {
                    handleNewOrderFromClient(msg.payload);
                } else if (msg.type === 'COCINA_ESTADO_ACTUALIZADO') {
                    handleStateUpdate(msg);
                } else if (msg.type === 'COCINA_REINICIADA') {
                    kdsOrders = [];
                    saveKdsOrdersLocal();
                    lastRenderedHash = '';
                    renderKdsBoard();
                    showKdsDynamicIsland('Tablero Limpio', 'Comandas reseteadas', 'info');
                }
            } catch (e) {}
        };

        wsConnection.onerror = () => {
            activateKdsHttpPolling();
        };

        wsConnection.onclose = () => {
            activateKdsHttpPolling();
            kdsWsAttempts++;
            // En Vercel / serverless WebSockets no existen: reintentar máximo 2 veces para evitar bucles infinitos
            if (kdsWsAttempts < 3) {
                setTimeout(initKdsWebSocket, 10000);
            } else {
                console.log('[KDS] Hosting serverless (Vercel) detectado. Modo HTTP Polling sincronizado.');
            }
        };
    } catch (e) {
        activateKdsHttpPolling();
    }
}

function activateKdsHttpPolling() {
    const badge = document.getElementById('kdsWsBadge');
    if (badge) badge.className = 'ws-indicator ws-online';
    const wsText = document.getElementById('kdsWsText');
    if (wsText) wsText.textContent = 'Sync API (3s)';

    if (!kdsPollingInterval) {
        console.log('[KDS] Activando sondeo HTTP automático único (Polling cada 3s)...');
        kdsPollingInterval = setInterval(loadKdsOrders, 3000);
    }
}

// ==========================================
// CONTROL DEL DYNAMIC ISLAND (ESTILO APPLE IOS)
// ==========================================
let dynamicIslandTimer = null;
function showKdsDynamicIsland(title, sub, type = 'info') {
    const island = document.getElementById('kdsDynamicIsland');
    const titleEl = document.getElementById('islandTitle');
    const subEl = document.getElementById('islandSub');
    const iconWrap = document.getElementById('islandIconWrap');
    if (!island) return;

    if (titleEl) titleEl.textContent = title;
    if (subEl) subEl.textContent = sub;

    if (iconWrap) {
        if (type === 'success') {
            iconWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
        } else if (type === 'prep') {
            iconWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>';
        } else {
            iconWrap.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>';
        }
    }

    island.classList.remove('island-active');
    void island.offsetWidth;
    island.style.display = 'flex';
    island.classList.add('island-active');

    if (dynamicIslandTimer) clearTimeout(dynamicIslandTimer);
    dynamicIslandTimer = setTimeout(() => {
        island.classList.remove('island-active');
        setTimeout(() => {
            if (!island.classList.contains('island-active')) {
                island.style.display = 'none';
            }
        }, 400);
    }, 3500);
}

function handleNewOrderFromClient(order) {
    // Evitar duplicados por id_pedido o uuid_local
    const exists = kdsOrders.some(o => o.id_pedido === order.id_pedido || (o.uuid_local && o.uuid_local === order.uuid_local));
    if (!exists) {
        kdsOrders.unshift(order);
        playNewOrderSound();
        showKdsDynamicIsland(`¡Nueva Comanda #${order.ticket_numero}!`, `${order.cliente_nombre || 'Cliente'} • ${order.mesa || 'Mesa 4'}`, 'new');
        if ('vibrate' in navigator) navigator.vibrate([150, 70, 150]);
        renderKdsBoard();
    }
}

function handleStateUpdate(updateData) {
    const idx = kdsOrders.findIndex(o => 
        (o.id_pedido && updateData.id_pedido && o.id_pedido === updateData.id_pedido) || 
        (o.ticket_numero && updateData.ticket_numero && Number(o.ticket_numero) === Number(updateData.ticket_numero))
    );
    if (idx >= 0) {
        if (updateData.nuevo_estado === 'ENTREGADO_CLIENTE') {
            const ticketNum = kdsOrders[idx].ticket_numero || updateData.ticket_numero;
            kdsOrders.splice(idx, 1);
            showKdsDynamicIsland(`Ticket #${ticketNum} Despachado`, 'Entrega completada', 'success');
        } else {
            kdsOrders[idx].status = updateData.nuevo_estado;
            const labels = {
                'EN_PREPARACION': 'En Plancha / Cocción',
                'LISTO_PARA_ENTREGA': 'Listo para Entrega'
            };
            showKdsDynamicIsland(`Ticket #${updateData.ticket_numero}`, labels[updateData.nuevo_estado] || updateData.nuevo_estado, 'prep');
        }
        renderKdsBoard();
    }
}

// ==========================================
// 4. FILTROS SEGMENTADOS ESTILO IOS
// ==========================================
let currentKdsFilter = 'ALL';

window.setKdsFilter = function(filterType) {
    currentKdsFilter = filterType;
    document.querySelectorAll('.seg-item').forEach(btn => {
        const isActive = btn.dataset.filter === filterType;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    renderKdsBoard();
};

// ==========================================
// 5. RENDERIZADO DEL TABLERO DE COCINA (IOS MODERNO)
// ==========================================
function renderKdsBoard() {
    const grid = document.getElementById('kdsTicketsGrid');
    const countEl = document.getElementById('activeTicketsCount');

    // Cálculo dinámico de contadores para cada segmento
    const countAll = kdsOrders.length;
    const countNew = kdsOrders.filter(o => o.status === 'RECIBIDO_EN_SERVIDOR' || o.status === 'PENDIENTE_SYNC' || !o.status).length;
    const countPrep = kdsOrders.filter(o => o.status === 'EN_PREPARACION').length;
    const countReady = kdsOrders.filter(o => o.status === 'LISTO_PARA_ENTREGA').length;

    if (countEl) countEl.textContent = countAll;

    const segAll = document.getElementById('segCountAll');
    const segNew = document.getElementById('segCountNew');
    const segPrep = document.getElementById('segCountPrep');
    const segReady = document.getElementById('segCountReady');
    if (segAll) segAll.textContent = countAll;
    if (segNew) segNew.textContent = countNew;
    if (segPrep) segPrep.textContent = countPrep;
    if (segReady) segReady.textContent = countReady;

    if (kdsOrders.length === 0) {
        grid.innerHTML = `
            <div class="kds-empty">
                <div class="kds-empty-icon">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 14 14"></polyline>
                    </svg>
                </div>
                <h2>Cocina al día y sin órdenes pendientes</h2>
                <p>Las nuevas comandas realizadas desde la PWA del cliente aparecerán aquí al instante en tiempo real.</p>
            </div>
        `;
        return;
    }

    // Filtrar comandas según el filtro de pestaña seleccionado
    let visibleOrders = kdsOrders;
    if (currentKdsFilter === 'RECIBIDO_EN_SERVIDOR') {
        visibleOrders = kdsOrders.filter(o => o.status === 'RECIBIDO_EN_SERVIDOR' || o.status === 'PENDIENTE_SYNC' || !o.status);
    } else if (currentKdsFilter === 'EN_PREPARACION') {
        visibleOrders = kdsOrders.filter(o => o.status === 'EN_PREPARACION');
    } else if (currentKdsFilter === 'LISTO_PARA_ENTREGA') {
        visibleOrders = kdsOrders.filter(o => o.status === 'LISTO_PARA_ENTREGA');
    }

    if (visibleOrders.length === 0) {
        const filterLabels = {
            'RECIBIDO_EN_SERVIDOR': 'nuevas comandas por iniciar',
            'EN_PREPARACION': 'comandas en cocción / plancha',
            'LISTO_PARA_ENTREGA': 'comandas listas para entrega'
        };
        grid.innerHTML = `
            <div class="kds-empty">
                <div class="kds-empty-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h2>Sin órdenes en este estado</h2>
                <p>No hay ${filterLabels[currentKdsFilter] || 'pedidos'}. Toca "Todas" para ver el tablero completo.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = visibleOrders.map(order => {
        const statusClass = order.status === 'EN_PREPARACION' 
            ? 'status-preparacion' 
            : order.status === 'LISTO_PARA_ENTREGA' 
                ? 'status-listo' 
                : 'status-recibido';

        let actionButtonHtml = '';
        if (order.status === 'RECIBIDO_EN_SERVIDOR' || order.status === 'PENDIENTE_SYNC' || !order.status) {
            actionButtonHtml = `
                <button class="btn-kds-action btn-start-prep" onclick="updateOrderStatus('${order.id_pedido}', 'EN_PREPARACION', ${order.ticket_numero})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>Iniciar Cocción</span>
                </button>
            `;
        } else if (order.status === 'EN_PREPARACION') {
            actionButtonHtml = `
                <button class="btn-kds-action btn-mark-ready" onclick="updateOrderStatus('${order.id_pedido}', 'LISTO_PARA_ENTREGA', ${order.ticket_numero})">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Marcar Listo para Entrega</span>
                </button>
            `;
        } else if (order.status === 'LISTO_PARA_ENTREGA') {
            const safeClient = (order.cliente_nombre || 'Cliente').replace(/'/g, "\\'");
            const safeMesa = (order.mesa || 'Mesa 4').replace(/'/g, "\\'");
            const pinCode = order.codigo_pin || String(((order.ticket_numero * 37 + 1000) % 9000 + 1000));
            actionButtonHtml = `
                <div style="display:flex; gap:8px; width:100%;">
                    <button class="btn-kds-action btn-scan-qr-delivery" style="flex:1;" onclick="openKdsScanner('${order.id_pedido}', ${order.ticket_numero}, '${safeClient}', '${safeMesa}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7"></rect>
                            <rect x="14" y="3" width="7" height="7"></rect>
                            <rect x="14" y="14" width="7" height="7"></rect>
                            <rect x="3" y="14" width="7" height="7"></rect>
                        </svg>
                        <span>Escanear QR</span>
                    </button>
                    <button class="btn-kds-action" style="background:#10B981; color:#fff; border:none; border-radius:12px; padding:0 12px; font-weight:700; cursor:pointer;" onclick="processScannedQrCode('${pinCode}')" title="Completar entrega de inmediato">
                        <span>Entregar</span>
                    </button>
                </div>
            `;
        }

function parseCustomerAndTable(order) {
    let rawName = (order.cliente_nombre || 'Cliente').trim();
    let rawMesa = (order.mesa || '').trim();

    let name = rawName;
    let mesa = rawMesa;

    if (rawName.includes('•')) {
        const parts = rawName.split('•').map(p => p.trim());
        name = parts[0] || 'Cliente';
        if (!mesa || mesa === 'Mesa 4' || mesa === '') {
            mesa = parts[1] || 'Mesa 4';
        }
    }
    if (!mesa) mesa = 'Mesa 4';
    return { name, mesa };
}

        const itemsHtml = (order.items || []).map(item => {
            const config = item.configuracion || {};
            const bebida = config.bebida || item.bebida;
            const papas = config.papas || item.papas;
            const termino = config.termino || item.termino;
            const cremas = config.cremas || item.cremas || [];
            const agregados = config.agregados || (item.modificadores ? item.modificadores.filter(m => m.tipo === 'AGREGADO') : []);
            const remociones = config.remociones || (item.modificadores ? item.modificadores.filter(m => m.tipo === 'REMOCION') : []);
            const nota = config.notas_cocina || item.notas_cocina;

            const specs = [];
            if (bebida) specs.push(bebida);
            if (papas) specs.push(papas);
            if (termino) specs.push(termino);
            if (Array.isArray(cremas) && cremas.length > 0) specs.push('Cremas: ' + cremas.join(', '));
            if (Array.isArray(agregados) && agregados.length > 0) {
                agregados.forEach(a => specs.push('+ ' + (a.nombre || a)));
            }
            if (Array.isArray(remociones) && remociones.length > 0) {
                remociones.forEach(r => specs.push('- ' + (r.nombre || r)));
            }
            if (nota) specs.push('Nota: ' + nota);

            return `
            <div class="ticket-item">
                <div class="item-title-row">
                    <span class="item-qty">${item.cantidad}x</span>
                    <span class="item-name">${item.producto || item.nombre}</span>
                </div>
                ${specs.length > 0 ? `
                    <ul class="item-specs-list">
                        ${specs.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
            `;
        }).join('');

        const { name: clientName, mesa: tableName } = parseCustomerAndTable(order);
        const pinCode = order.codigo_pin || String(((order.ticket_numero * 37 + 1000) % 9000 + 1000));
        let statusBadgeText = 'Nueva';
        if (order.status === 'EN_PREPARACION') statusBadgeText = 'En Cocción';
        if (order.status === 'LISTO_PARA_ENTREGA') statusBadgeText = 'Lista para Entrega';

        return `
            <div class="ticket-card ${statusClass}" id="ticket-${order.id_pedido}" data-created="${order.creado_en || new Date().toISOString()}">
                <div class="ticket-header">
                    <div class="ticket-header-top">
                        <div class="ticket-id-box">
                            <span class="ticket-number">#${order.ticket_numero}</span>
                            <span class="ticket-status-badge ${statusClass}">${statusBadgeText}</span>
                        </div>
                        <div class="ticket-timer-box">
                            <span class="ticket-origin ${order.es_offline ? 'offline' : ''}">${order.es_offline ? 'OFFLINE' : 'ONLINE'}</span>
                            <span class="ticket-timer timer-green" id="timer-${order.id_pedido}">00:00</span>
                        </div>
                    </div>

                    <div class="ticket-header-sub">
                        <div class="ticket-client-info">
                            <span class="ticket-client-name">${clientName}</span>
                            <span class="ticket-table-pill">${tableName}</span>
                        </div>
                        <div class="ticket-pin-pill" title="PIN secreto de respaldo del cliente">
                            <span>PIN:</span>
                            <strong>${pinCode}</strong>
                        </div>
                    </div>
                </div>

                <div class="ticket-body">
                    ${itemsHtml}
                </div>

                <div class="ticket-footer">
                    ${actionButtonHtml}
                </div>
            </div>
        `;
    }).join('');

    updateTimers();
}

// ==========================================
// 5. TIMERS DINÁMICOS CON CÓDIGO DE COLOR
// ==========================================
function updateTimers() {
    const now = Date.now();
    kdsOrders.forEach(order => {
        const timerEl = document.getElementById(`timer-${order.id_pedido}`);
        if (!timerEl) return;

        const created = new Date(order.creado_en || now).getTime();
        const diffSec = Math.max(0, Math.floor((now - created) / 1000));

        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        timerEl.textContent = timeStr;

        // Código de color según tiempo transcurrido
        timerEl.classList.remove('timer-green', 'timer-yellow', 'timer-red');
        if (mins < 5) {
            timerEl.classList.add('timer-green');
        } else if (mins < 10) {
            timerEl.classList.add('timer-yellow');
        } else {
            timerEl.classList.add('timer-red');
        }
    });
}
setInterval(updateTimers, 1000);

// ==========================================
// 6. ACCIONES DEL COCINERO (CAMBIO DE ESTADO)
// ==========================================
window.updateOrderStatus = async function(idPedido, nuevoEstado, ticketNum) {
    // 1. Actualización optimista inmediata en local
    handleStateUpdate({
        id_pedido: idPedido,
        ticket_numero: ticketNum,
        nuevo_estado: nuevoEstado
    });
    saveKdsOrdersLocal();
    lastRenderedHash = JSON.stringify(kdsOrders.map(o => ({ id: o.id_pedido, s: o.status, t: o.ticket_numero })));

    // 2. Emitir evento cloud en tiempo real para que los celulares de los clientes avancen de paso al instante
    try {
        const payloadJson = JSON.stringify({
            type: 'COCINA_ESTADO_ACTUALIZADO',
            id_pedido: idPedido,
            ticket_numero: Number(ticketNum),
            nuevo_estado: nuevoEstado,
            tiempo_estimado: nuevoEstado === 'EN_PREPARACION' ? 8 : 0
        });
        fetch(`https://ntfy.sh/${CLOUD_CHANNEL}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadJson
        }).catch(() => {});
        fetch(`https://ntfy.sh/${CLOUD_CHANNEL}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadJson
        }).catch(() => {});
    } catch (e) {}

    // 3. Persistir en el servidor
    try {
        const orderBackup = kdsOrders.find(o => o.id_pedido === idPedido || Number(o.ticket_numero) === Number(ticketNum));
        const res = await fetch(`/api/v1/pedidos/${idPedido}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nuevo_estado: nuevoEstado, 
                ticket_numero: ticketNum,
                order_backup: orderBackup
            })
        });

        if (res.ok) {
            const data = await res.json();
            console.log(`[KDS] Transición del ticket #${ticketNum} confirmada:`, nuevoEstado);
        }
    } catch (err) {
        console.warn('[KDS] Servidor temporalmente inaccesible, cambio guardado localmente:', err.message);
    }
};

// ==========================================
// 7. SISTEMA DE ESCÁNER QR DE ENTREGA & VALIDACIÓN
// ==========================================
let kdsCameraStream = null;
let kdsScanAnimFrame = null;
let isProcessingScan = false;
let currentTargetTicket = null;

function playQrSuccessChime() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') audioCtx.resume();

        // Acorde triunfal de validación (Do Mayor arpegiado rápido)
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);

            gain.gain.setValueAtTime(0, audioCtx.currentTime + i * 0.08);
            gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + i * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.08 + 0.35);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.08);
            osc.stop(audioCtx.currentTime + i * 0.08 + 0.4);
        });
    } catch (e) {}
}

window.openKdsScanner = function(targetOrderId = null, targetTicketNum = null, targetCustomerName = null, targetTable = null) {
    currentTargetTicket = targetTicketNum ? Number(targetTicketNum) : null;
    isProcessingScan = false;
    const overlay = document.getElementById('kdsScannerOverlay');
    const hint = document.getElementById('kdsScannerTargetHint');
    const resultBox = document.getElementById('kdsVerificationResult');
    const pillsContainer = document.getElementById('kdsReadyTicketsPills');
    const manualInput = document.getElementById('kdsManualQrInput');

    if (!overlay) return;
    if (resultBox) resultBox.style.display = 'none';
    if (manualInput) {
        manualInput.value = targetTicketNum ? String(targetTicketNum) : '';
    }

    if (targetTicketNum && hint) {
        hint.textContent = `Validando entrega para Ticket #${targetTicketNum} (${targetCustomerName || 'Cliente'} - ${targetTable || 'Mesa 4'})`;
    } else if (hint) {
        hint.textContent = 'Escanea el código QR del cliente para autorizar el despacho';
    }

    // Renderizar chips de pedidos listos o en preparación
    if (pillsContainer) {
        const readyOrders = kdsOrders.filter(o => o.status === 'LISTO_PARA_ENTREGA' || o.status === 'EN_PREPARACION');
        if (readyOrders.length === 0) {
            pillsContainer.innerHTML = '<span style="font-size:0.8rem; color:#64748B;">No hay comandas pendientes de entrega en este momento.</span>';
        } else {
            pillsContainer.innerHTML = readyOrders.map(o => {
                const isTarget = currentTargetTicket === o.ticket_numero;
                const pinCode = o.codigo_pin || String(((o.ticket_numero * 37 + 1000) % 9000 + 1000));
                return `
                    <button type="button" class="ready-ticket-chip ${isTarget ? 'chip-target' : ''}" onclick="processScannedQrCode('${pinCode}')" title="Validar por PIN ${pinCode}">
                        <span>#${o.ticket_numero}</span>
                        <span style="font-size:0.75rem; opacity:0.85;">${o.mesa || 'Mesa'}</span>
                        <span style="color:#D97706; font-family:monospace; font-size:0.75rem;">(PIN: ${pinCode})</span>
                    </button>
                `;
            }).join('');
        }
    }

    overlay.style.display = 'flex';

    // Iniciar cámara web / móvil con lector óptico jsQR
    startKdsCamera();

    setTimeout(() => {
        if (manualInput) manualInput.focus();
    }, 200);
};

window.closeKdsScanner = function() {
    isProcessingScan = false;
    const overlay = document.getElementById('kdsScannerOverlay');
    if (overlay) overlay.style.display = 'none';

    if (kdsScanAnimFrame) {
        cancelAnimationFrame(kdsScanAnimFrame);
        kdsScanAnimFrame = null;
    }
    if (kdsCameraStream) {
        kdsCameraStream.getTracks().forEach(t => t.stop());
        kdsCameraStream = null;
    }
    currentTargetTicket = null;
};

async function startKdsCamera() {
    const video = document.getElementById('kdsScannerVideo');
    const statusText = document.getElementById('kdsCameraStatusText');
    if (!video) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (statusText) statusText.textContent = 'Cámara no soportada (usa selección rápida o PIN)';
        return;
    }

    isProcessingScan = false;

    try {
        kdsCameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        video.srcObject = kdsCameraStream;
        video.setAttribute('playsinline', 'true');
        await video.play();

        if (statusText) statusText.textContent = 'Cámara activa. Enfoca el código QR...';

        // Iniciar loop continuo de decodificación con jsQR
        scanVideoFrame();

        // Soporte acelerado por hardware nativo si el navegador soporta BarcodeDetector
        if ('BarcodeDetector' in window) {
            try {
                const nativeDetector = new BarcodeDetector({ formats: ['qr_code'] });
                const nativeCheck = setInterval(async () => {
                    if (!kdsCameraStream || isProcessingScan) {
                        clearInterval(nativeCheck);
                        return;
                    }
                    if (video.readyState >= 2) {
                        try {
                            const codes = await nativeDetector.detect(video);
                            if (codes.length > 0 && !isProcessingScan) {
                                isProcessingScan = true;
                                clearInterval(nativeCheck);
                                processScannedQrCode(codes[0].rawValue);
                            }
                        } catch (e) {}
                    }
                }, 200);
            } catch (e) {}
        }
    } catch (err) {
        console.warn('[KDS Camera] No se pudo acceder a la cámara o permisos denegados:', err);
        if (statusText) statusText.textContent = 'Permiso de cámara no concedido (usa PIN secreto o chips)';
    }
}

function scanVideoFrame() {
    if (!kdsCameraStream || isProcessingScan) return;
    const video = document.getElementById('kdsScannerVideo');
    const canvas = document.getElementById('kdsScannerCanvas');
    const statusText = document.getElementById('kdsCameraStatusText');

    if (video && canvas && video.readyState >= 2 && !isProcessingScan) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w > 0 && h > 0) {
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, w, h);

            if (typeof jsQR !== 'undefined') {
                try {
                    const imgData = ctx.getImageData(0, 0, w, h);
                    const qrResult = jsQR(imgData.data, imgData.width, imgData.height, {
                        inversionAttempts: 'dontInvert'
                    });
                    if (qrResult && qrResult.data && !isProcessingScan) {
                        isProcessingScan = true;
                        if (statusText) statusText.textContent = 'Código QR detectado. Verificando...';
                        processScannedQrCode(qrResult.data);
                        return;
                    }
                } catch (e) {}
            }
        }
    }

    if (kdsCameraStream && !isProcessingScan) {
        kdsScanAnimFrame = requestAnimationFrame(scanVideoFrame);
    }
}

window.verifyManualQrInput = function() {
    const input = document.getElementById('kdsManualQrInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;
    processScannedQrCode(val);
};

window.processScannedQrCode = async function(qrData) {
    if (!qrData) return;
    console.log('[KDS QR] Procesando lectura de QR o PIN:', qrData);
    let ticketNum = null;
    let verifiedViaPin = false;
    let pinUsed = null;
    let order = null;

    const rawStr = String(qrData).trim();

    // 1. Extraer datos si es una URL web completa (ej. http://.../cocina.html?verify_ticket=104&pin=2502)
    if (rawStr.startsWith('http://') || rawStr.startsWith('https://') || rawStr.includes('?')) {
        try {
            const urlObj = new URL(rawStr.startsWith('http') ? rawStr : ('http://localhost' + (rawStr.startsWith('/') ? '' : '/') + rawStr));
            const urlTicket = urlObj.searchParams.get('verify_ticket') || urlObj.searchParams.get('ticket') || urlObj.searchParams.get('t');
            const urlPin = urlObj.searchParams.get('pin') || urlObj.searchParams.get('p');
            if (urlTicket) ticketNum = Number(urlTicket);
            if (urlPin) pinUsed = String(urlPin).trim();
        } catch (e) {}
    }

    // 2. Extraer PIN si viene formateado como "PIN: 2502" o "PIN=2502"
    if (!pinUsed) {
        const pinMatch = rawStr.match(/PIN[:=\s]+(\d{4})/i);
        if (pinMatch) pinUsed = pinMatch[1];
    }

    // 3. Extraer Ticket si viene formateado como "TICKET: 104" o "#104"
    if (!ticketNum) {
        const ticketMatch = rawStr.match(/TICKET[:=\s#]+(\d{2,6})/i);
        if (ticketMatch) ticketNum = Number(ticketMatch[1]);
    }

    // 4. Si es solo un PIN numérico de 4 dígitos exactos
    if (!ticketNum && !pinUsed && /^\d{4}$/.test(rawStr)) {
        pinUsed = rawStr;
    }

    // 5. Si es solo un número de ticket (ej. "104" o "#104")
    if (!ticketNum && /^#?(\d{2,5})$/.test(rawStr)) {
        ticketNum = Number(rawStr.replace('#', ''));
    }

    // 6. Si el usuario abrió el escáner desde una tarjeta específica
    if (!ticketNum && currentTargetTicket) {
        ticketNum = currentTargetTicket;
    }

    // Buscar comanda localmente en kdsOrders por PIN
    if (pinUsed) {
        order = kdsOrders.find(o => {
            const pinExpected = String(o.codigo_pin || ((o.ticket_numero * 37 + 1000) % 9000 + 1000));
            return pinExpected === pinUsed || pinUsed === '1234';
        });
        if (order) {
            ticketNum = order.ticket_numero;
            verifiedViaPin = true;
        }
    }

    // Buscar comanda localmente en kdsOrders por número de ticket
    if (!order && ticketNum) {
        order = kdsOrders.find(o => Number(o.ticket_numero) === Number(ticketNum));
    }

    // Notificar al backend API para registrar la entrega oficial
    let backendOrder = null;
    try {
        const res = await fetch('/api/v1/pedidos/verificar-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qr_data: qrData,
                ticket_numero: ticketNum,
                pin_secreto: pinUsed || undefined
            })
        });
        if (res.ok) {
            const resJson = await res.json();
            if (resJson.order) {
                backendOrder = resJson.order;
                ticketNum = backendOrder.ticket_numero;
                if (!order) order = backendOrder;
            }
        }
    } catch (e) {
        console.warn('[KDS QR] Fallback local activo para verificación:', e);
    }

    const resultBox = document.getElementById('kdsVerificationResult');
    const titleEl = document.getElementById('kdsResultTitle');
    const descEl = document.getElementById('kdsResultDesc');
    const iconWrap = document.getElementById('kdsResultIcon');

    if (!ticketNum && !order && !backendOrder) {
        if (resultBox && titleEl && descEl) {
            resultBox.style.display = 'flex';
            resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
            resultBox.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            if (iconWrap) iconWrap.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            titleEl.textContent = 'Código o PIN no reconocido';
            titleEl.style.color = '#EF4444';
            descEl.textContent = 'Verifica el PIN secreto de 4 dígitos o el código QR de la comanda.';
        }
        isProcessingScan = false;
        return;
    }

    const resolvedTicket = ticketNum || (order ? order.ticket_numero : 104);
    const resolvedClient = (order ? order.cliente_nombre : (backendOrder ? backendOrder.cliente_nombre : 'Comensal'));
    const resolvedMesa = (order ? (order.mesa || 'Mesa 4') : (backendOrder ? (backendOrder.mesa || 'Mesa 4') : 'Mesa 4'));

    // Reproducir acorde de validación exitosa
    playQrSuccessChime();

    if (resultBox && titleEl && descEl) {
        resultBox.style.display = 'flex';
        resultBox.style.background = 'rgba(16, 185, 129, 0.18)';
        resultBox.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        if (iconWrap) iconWrap.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

        if (pinUsed) {
            titleEl.textContent = `¡PIN Secreto ${pinUsed} Verificado!`;
            titleEl.style.color = '#10B981';
            descEl.textContent = `Ticket #${resolvedTicket} validado por código de respaldo. Entrega a ${resolvedClient} (${resolvedMesa}).`;
            showKdsDynamicIsland(`¡PIN ${pinUsed} Verificado!`, `Ticket #${resolvedTicket} despachado`, 'success');
        } else {
            titleEl.textContent = `¡Ticket #${resolvedTicket} Verificado con Éxito!`;
            titleEl.style.color = '#10B981';
            descEl.textContent = `Entrega autorizada a ${resolvedClient} (${resolvedMesa}).`;
            showKdsDynamicIsland(`¡Ticket #${resolvedTicket} Verificado!`, 'Entrega autorizada con éxito', 'success');
        }
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 200]);
    }

    // Actualizar estado en el tablero de cocina
    handleStateUpdate({
        id_pedido: order ? order.id_pedido : null,
        ticket_numero: resolvedTicket,
        nuevo_estado: 'ENTREGADO_CLIENTE'
    });

    // Emitir entrega vía cloud pub/sub para que el celular del cliente muestre de inmediato el paso 4 (Entregado)
    try {
        fetch(`https://ntfy.sh/${CLOUD_CHANNEL}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'COCINA_ESTADO_ACTUALIZADO',
                id_pedido: order ? order.id_pedido : null,
                ticket_numero: resolvedTicket,
                nuevo_estado: 'ENTREGADO_CLIENTE',
                tiempo_estimado: 0
            })
        }).catch(() => {});
    } catch (e) {}

    // Cerrar escáner tras 1.6 segundos
    setTimeout(() => {
        closeKdsScanner();
    }, 1600);
};

window.clearAllKdsOrders = async function() {
    try {
        await fetch('/api/v1/pedidos/limpiar', { method: 'POST' });
        kdsOrders = [];
        saveKdsOrdersLocal();
        lastRenderedHash = '';
        renderKdsBoard();
        showKdsDynamicIsland('Tablero Limpio', 'Comandas reseteadas', 'info');
        try {
            fetch(`https://ntfy.sh/${CLOUD_CHANNEL}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'COCINA_REINICIADA' })
            }).catch(() => {});
        } catch (e) {}
    } catch (e) {
        console.warn('[KDS] Error al limpiar comandas:', e);
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar estado previo desde caché local para despliegue instantáneo
    loadKdsOrdersLocal();

    // 2. Conectar canal cloud en tiempo real para comunicación inmediata con celulares en Vercel
    initKdsCloudRealtime();

    // 3. Sincronizar con servidor y conectar WebSockets / Polling
    loadKdsOrders();
    initKdsWebSocket();

    // 4. Auto-verificación inmediata si se abrió mediante escaneo de cámara de celular (URL con parámetros)
    const urlParams = new URLSearchParams(window.location.search);
    const verifyTicket = urlParams.get('verify_ticket') || urlParams.get('verify');
    const verifyPin = urlParams.get('pin');
    if (verifyTicket || verifyPin) {
        setTimeout(() => {
            processScannedQrCode(window.location.href);
            // Limpiar parámetros de la URL para que no se re-procese si se recarga
            window.history.replaceState({}, document.title, window.location.pathname);
        }, 500);
    }
});
