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
    const icon = document.getElementById('soundIcon');
    if (soundEnabled) {
        btn.innerHTML = '🔊 Sonido Activado';
        playNewOrderSound();
    } else {
        btn.innerHTML = '🔇 Sonido Silenciado';
    }
});

// ==========================================
// 3. CARGA INICIAL DE COMANDAS & WEBSOCKETS
// ==========================================
async function loadKdsOrders() {
    try {
        const res = await fetch('/api/v1/pedidos');
        if (res.ok) {
            const list = await res.json();
            // Filtrar solo las que no estén entregadas todavía
            kdsOrders = list.filter(o => o.status !== 'ENTREGADO_CLIENTE');
            renderKdsBoard();
        }
    } catch (err) {
        console.error('[KDS] Error al cargar pedidos iniciales:', err);
    }
}

function initKdsWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    wsConnection = new WebSocket(wsUrl);

    let pollingInterval = null;

    wsConnection.onopen = () => {
        console.log('[KDS WS] Conectado al broker de cocina.');
        if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
        const badge = document.getElementById('kdsWsBadge');
        badge.className = 'ws-indicator ws-online';
        document.getElementById('kdsWsText').textContent = 'WSS Conectado';
    };

    wsConnection.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            console.log('[KDS WS] Evento entrante:', msg.type);

            if (msg.type === 'NUEVO_PEDIDO_COCINA') {
                handleNewOrderFromClient(msg.payload);
            } else if (msg.type === 'COCINA_ESTADO_ACTUALIZADO') {
                handleStateUpdate(msg);
            }
        } catch (e) {}
    };

    wsConnection.onerror = () => {
        // Fallback para entornos serverless (como Vercel)
        if (!pollingInterval) {
            console.log('[KDS] WebSocket no disponible en este hosting. Activando sondeo HTTP automático (Polling cada 3s)...');
            const badge = document.getElementById('kdsWsBadge');
            badge.className = 'ws-indicator ws-online';
            document.getElementById('kdsWsText').textContent = 'Sync API (3s)';
            pollingInterval = setInterval(loadKdsOrders, 3000);
        }
    };

    wsConnection.onclose = () => {
        if (!pollingInterval) {
            console.warn('[KDS WS] Conexión perdida. Activando sondeo HTTP...');
            const badge = document.getElementById('kdsWsBadge');
            badge.className = 'ws-indicator ws-online';
            document.getElementById('kdsWsText').textContent = 'Sync API (3s)';
            pollingInterval = setInterval(loadKdsOrders, 3000);
        }
        setTimeout(initKdsWebSocket, 6000);
    };
}

function handleNewOrderFromClient(order) {
    // Evitar duplicados por id_pedido o uuid_local
    const exists = kdsOrders.some(o => o.id_pedido === order.id_pedido || (o.uuid_local && o.uuid_local === order.uuid_local));
    if (!exists) {
        kdsOrders.unshift(order);
        playNewOrderSound();
        renderKdsBoard();
    }
}

function handleStateUpdate(updateData) {
    const idx = kdsOrders.findIndex(o => o.id_pedido === updateData.id_pedido || o.ticket_numero === updateData.ticket_numero);
    if (idx >= 0) {
        if (updateData.nuevo_estado === 'ENTREGADO_CLIENTE') {
            kdsOrders.splice(idx, 1);
        } else {
            kdsOrders[idx].status = updateData.nuevo_estado;
        }
        renderKdsBoard();
    }
}

// ==========================================
// 4. RENDERIZADO DEL TABLERO DE COCINA
// ==========================================
function renderKdsBoard() {
    const grid = document.getElementById('kdsTicketsGrid');
    const countEl = document.getElementById('activeTicketsCount');

    countEl.textContent = kdsOrders.length;

    if (kdsOrders.length === 0) {
        grid.innerHTML = `
            <div class="kds-empty">
                <div class="kds-empty-icon">🍔</div>
                <h2>Cocina al día y sin órdenes pendientes</h2>
                <p>Las nuevas comandas realizadas desde la PWA del cliente aparecerán aquí al instante en tiempo real.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = kdsOrders.map(order => {
        const statusClass = order.status === 'EN_PREPARACION' 
            ? 'status-preparacion' 
            : order.status === 'LISTO_PARA_ENTREGA' 
                ? 'status-listo' 
                : 'status-recibido';

        let actionButtonHtml = '';
        if (order.status === 'RECIBIDO_EN_SERVIDOR' || order.status === 'PENDIENTE_SYNC' || !order.status) {
            actionButtonHtml = `
                <button class="btn-kds-action btn-start-prep" onclick="updateOrderStatus('${order.id_pedido}', 'EN_PREPARACION', ${order.ticket_numero})">
                    🔥 Iniciar Cocción
                </button>
            `;
        } else if (order.status === 'EN_PREPARACION') {
            actionButtonHtml = `
                <button class="btn-kds-action btn-mark-ready" onclick="updateOrderStatus('${order.id_pedido}', 'LISTO_PARA_ENTREGA', ${order.ticket_numero})">
                    ✓ Marcar Listo para Entrega
                </button>
            `;
        } else if (order.status === 'LISTO_PARA_ENTREGA') {
            actionButtonHtml = `
                <button class="btn-kds-action btn-dispatch" onclick="updateOrderStatus('${order.id_pedido}', 'ENTREGADO_CLIENTE', ${order.ticket_numero})">
                    📦 Despachar al Cliente
                </button>
            `;
        }

        const itemsHtml = (order.items || []).map(item => `
            <div class="ticket-item">
                <div class="item-main">
                    <span class="item-qty">${item.cantidad}</span>
                    <span>${item.producto || item.nombre}</span>
                </div>
                ${item.modificadores && item.modificadores.length > 0 ? `
                    <div class="item-mods">
                        ${item.modificadores.map(m => `
                            <span class="mod-tag ${m.tipo === 'AGREGADO' ? 'mod-add' : 'mod-rem'}">
                                ${m.tipo === 'AGREGADO' ? '➕ ' + m.nombre : '➖ ' + m.nombre}
                            </span>
                        `).join('')}
                    </div>
                ` : ''}
                ${item.notas_cocina ? `<div class="item-notes">Nota: ${item.notas_cocina}</div>` : ''}
            </div>
        `).join('');

        return `
            <div class="ticket-card ${statusClass}" id="ticket-${order.id_pedido}" data-created="${order.creado_en || new Date().toISOString()}">
                <div class="ticket-header">
                    <div>
                        <div class="ticket-number">#${order.ticket_numero}</div>
                        <span style="font-size:0.75rem; color:#94A3B8; font-weight:600;">${order.cliente_nombre || 'Mesa / PWA'}</span>
                    </div>
                    <div style="text-align:right;">
                        <span class="ticket-origin ${order.es_offline ? 'offline' : ''}">
                            ${order.es_offline ? '⚡ OFFLINE SYNC' : '🌐 PWA ONLINE'}
                        </span>
                        <div class="ticket-timer timer-green" id="timer-${order.id_pedido}">
                            ⏱️ 00:00
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

        timerEl.textContent = `⏱️ ${timeStr}`;

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
    try {
        const res = await fetch(`/api/v1/pedidos/${idPedido}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevo_estado: nuevoEstado, ticket_numero: ticketNum })
        });

        if (res.ok) {
            const data = await res.json();
            handleStateUpdate({
                id_pedido: idPedido,
                ticket_numero: ticketNum,
                nuevo_estado: nuevoEstado
            });
        }
    } catch (err) {
        console.error('[KDS] Error al cambiar estado del pedido:', err);
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const demo = urlParams.get('state');

    if (demo === 'active_orders' || demo === 'offline_sync') {
        kdsOrders = [
            {
                id_pedido: 'ord-demo-1',
                ticket_numero: 101,
                cliente_nombre: 'Mesa 4 - Carlos M.',
                creado_en: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
                status: 'EN_PREPARACION',
                es_offline: false,
                items: [
                    { producto: 'Combo Doble Clásica', cantidad: 1, modificadores: [{ tipo: 'AGREGADO', nombre: 'Queso Cheddar Extra' }], notas_cocina: 'Papas bien doradas' },
                    { producto: 'Inka Cola 500ml', cantidad: 1, modificadores: [] }
                ]
            },
            {
                id_pedido: 'ord-demo-2',
                ticket_numero: 102,
                cliente_nombre: 'Para Llevar - Ana R.',
                creado_en: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
                status: 'RECIBIDO_EN_COCINA',
                es_offline: true,
                items: [
                    { producto: 'Monster Bacon Burger', cantidad: 2, modificadores: [{ tipo: 'REMOCION', nombre: 'Sin Cebolla' }], notas_cocina: 'Sin salsas' },
                    { producto: 'Papas Rústicas Grandes', cantidad: 1, modificadores: [{ tipo: 'AGREGADO', nombre: 'Bañadas en Cheddar' }] }
                ]
            }
        ];
        renderKdsBoard();
    } else {
        loadKdsOrders();
    }
    initKdsWebSocket();
});
