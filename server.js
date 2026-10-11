// FastOrder S.A. - Servidor Backend API REST & WebSockets
// Arquitectura PWA Offline-First y Sistema KDS de Cocina en Tiempo Real

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 1. BASE DE DATOS EN MEMORIA (ESQUEMA 3FN)
// ==========================================
let ticketCounter = 101;

const CATALOG_DB = [
    {
        id_producto: 'p-01',
        categoria: 'COMBOS',
        nombre: 'Combo Doble Clásica',
        descripcion: '2 carnes de res 150g a la parrilla, doble queso cheddar fundido, papas fritas rústicas y gaseosa.',
        precio: 28.50,
        icono: '🍔',
        es_popular: true,
        modificadores_disponibles: [
            { id: 'opt-queso', tipo: 'AGREGADO', nombre: 'Queso Cheddar Extra', precio: 3.50 },
            { id: 'opt-bacon', tipo: 'AGREGADO', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
            { id: 'opt-carne', tipo: 'AGREGADO', nombre: 'Carne Adicional 150g', precio: 6.00 },
            { id: 'rem-cebolla', tipo: 'REMOCION', nombre: 'Sin Cebolla', precio: 0 },
            { id: 'rem-salsas', tipo: 'REMOCION', nombre: 'Sin Salsas', precio: 0 }
        ]
    },
    {
        id_producto: 'p-02',
        categoria: 'BURGERS',
        nombre: 'Monster Bacon Burger',
        descripcion: 'Triple carne, cuádruple tocino ahumado artesanal, queso cheddar y salsa barbacoa de la casa.',
        precio: 24.00,
        icono: '🥓',
        es_popular: true,
        modificadores_disponibles: [
            { id: 'opt-queso', tipo: 'AGREGADO', nombre: 'Queso Cheddar Extra', precio: 3.50 },
            { id: 'opt-bacon', tipo: 'AGREGADO', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
            { id: 'rem-cebolla', tipo: 'REMOCION', nombre: 'Sin Cebolla', precio: 0 }
        ]
    },
    {
        id_producto: 'p-03',
        categoria: 'BURGERS',
        nombre: 'Cheese Burger Especial',
        descripcion: 'Carne jugosa a la parrilla con doble queso cheddar fundido, lechuga crocante y pepinillos.',
        precio: 18.00,
        icono: '🧀',
        es_popular: false,
        modificadores_disponibles: [
            { id: 'opt-queso', tipo: 'AGREGADO', nombre: 'Queso Cheddar Extra', precio: 3.50 },
            { id: 'rem-pepinillos', tipo: 'REMOCION', nombre: 'Sin Pepinillos', precio: 0 }
        ]
    },
    {
        id_producto: 'p-04',
        categoria: 'BURGERS',
        nombre: 'Pollo Crujiente Deluxe',
        descripcion: 'Pechuga de pollo marinada extra crocante con lechuga fresca y mayonesa artesanal.',
        precio: 21.50,
        icono: '🍗',
        es_popular: false,
        modificadores_disponibles: [
            { id: 'opt-bacon', tipo: 'AGREGADO', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
            { id: 'opt-queso', tipo: 'AGREGADO', nombre: 'Queso Cheddar Extra', precio: 3.50 }
        ]
    },
    {
        id_producto: 'p-05',
        categoria: 'SIDES',
        nombre: 'Papas Rústicas Grandes',
        descripcion: 'Papas amarillas seleccionadas con cáscara, sal de mar y orégano seco.',
        precio: 9.50,
        icono: '🍟',
        es_popular: false,
        modificadores_disponibles: [
            { id: 'opt-queso', tipo: 'AGREGADO', nombre: 'Bañadas en Cheddar Fundido', precio: 3.50 },
            { id: 'opt-bacon', tipo: 'AGREGADO', nombre: 'Trocitos de Bacon', precio: 3.00 }
        ]
    },
    {
        id_producto: 'p-06',
        categoria: 'SIDES',
        nombre: 'Aros de Cebolla Crujientes',
        descripcion: '10 aros de cebolla rebozados y dorados, acompañados de salsa tártara.',
        precio: 8.00,
        icono: '🧅',
        es_popular: false,
        modificadores_disponibles: []
    },
    {
        id_producto: 'p-07',
        categoria: 'SIDES',
        nombre: 'Nuggets de Pollo x10',
        descripcion: 'Crujientes bocadillos de pechuga de pollo servidos con salsa barbacoa.',
        precio: 14.00,
        icono: '✨',
        es_popular: false,
        modificadores_disponibles: []
    },
    {
        id_producto: 'p-08',
        categoria: 'DRINKS',
        nombre: 'Inka Cola 500ml',
        descripcion: 'Gaseosa nacional helada o sin helar.',
        precio: 5.00,
        icono: '🥤',
        es_popular: false,
        modificadores_disponibles: []
    },
    {
        id_producto: 'p-09',
        categoria: 'DRINKS',
        nombre: 'Chicha Morada Artesanal',
        descripcion: 'Preparada con maíz morado peruano, manzana, piña y toques de canela.',
        precio: 6.00,
        icono: '🍇',
        es_popular: false,
        modificadores_disponibles: []
    },
    {
        id_producto: 'p-10',
        categoria: 'DESSERTS',
        nombre: 'Helado Oreo Cream',
        descripcion: 'Copa de helado de vainilla suave con abundante galleta Oreo triturada y fudge.',
        precio: 7.50,
        icono: '🍦',
        es_popular: false,
        modificadores_disponibles: []
    }
];

let ORDERS_DB = [];

// ==========================================
// 2. WEBSOCKETS BROADCAST MANAGER
// ==========================================
function broadcastWebSocket(messageObject) {
    const jsonStr = JSON.stringify(messageObject);
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // 1 = OPEN
            client.send(jsonStr);
        }
    });
}

wss.on('connection', (ws) => {
    console.log('[WSS] Nueva conexión cliente/cocina establecida.');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('[WSS] Mensaje recibido del cliente:', data.type);
        } catch (e) {}
    });

    ws.on('close', () => {
        console.log('[WSS] Conexión cerrada.');
    });
});

// ==========================================
// 3. RUTAS API REST (SPEC IEEE 830)
// ==========================================

// GET: Catálogo de productos
app.get('/api/v1/productos', (req, res) => {
    res.json(CATALOG_DB);
});

// GET: Lista de pedidos activos (para KDS)
app.get('/api/v1/pedidos', (req, res) => {
    res.json(ORDERS_DB);
});

// POST: Crear pedido nuevo (Online)
app.post('/api/v1/pedidos', (req, res) => {
    const { cliente_nombre, total, items, uuid_local } = req.body;

    const newOrder = {
        id_pedido: 'ORD-' + Date.now(),
        ticket_numero: ticketCounter++,
        uuid_local: uuid_local || crypto.randomUUID(),
        cliente_nombre: cliente_nombre || 'Cliente FastOrder',
        total: parseFloat(total) || 0,
        items: items || [],
        status: 'RECIBIDO_EN_SERVIDOR',
        es_offline: false,
        tiempo_estimado: 12,
        creado_en: new Date().toISOString()
    };

    ORDERS_DB.unshift(newOrder);

    console.log(`[API] Nuevo pedido recibido en línea: Ticket #${newOrder.ticket_numero} (Total: S/ ${newOrder.total})`);

    // Notificar a cocina KDS por WebSocket en tiempo real
    broadcastWebSocket({
        type: 'NUEVO_PEDIDO_COCINA',
        payload: newOrder
    });

    res.status(201).json(newOrder);
});

// POST: Sincronización garantizada de pedidos offline (Idempotente)
app.post('/api/v1/pedidos/sincronizar', (req, res) => {
    const { uuid_local, cliente_nombre, total, items, creado_en } = req.body;

    // Garantía de Idempotencia: Verificar si el uuid_local ya existe
    const existing = ORDERS_DB.find(o => o.uuid_local === uuid_local);
    if (existing) {
        console.log(`[Sync] Pedido ${uuid_local} ya existía previamente (Idempotencia respetada).`);
        return res.json(existing);
    }

    const syncedOrder = {
        id_pedido: 'ORD-SYNC-' + Date.now(),
        ticket_numero: ticketCounter++,
        uuid_local: uuid_local,
        cliente_nombre: cliente_nombre || 'Cliente Offline PWA',
        total: parseFloat(total) || 0,
        items: items || [],
        status: 'RECIBIDO_EN_SERVIDOR',
        es_offline: true,
        tiempo_estimado: 15,
        creado_en: creado_en || new Date().toISOString(),
        sincronizado_en: new Date().toISOString()
    };

    ORDERS_DB.unshift(syncedOrder);

    console.log(`[Sync] ¡Pedido Offline sincronizado con éxito! Ticket #${syncedOrder.ticket_numero} (UUID: ${uuid_local})`);

    // Notificar a pantalla KDS de cocina por WebSocket
    broadcastWebSocket({
        type: 'NUEVO_PEDIDO_COCINA',
        payload: syncedOrder
    });

    res.status(201).json(syncedOrder);
});

// PATCH: Transición de estado por cocina KDS
app.patch('/api/v1/pedidos/:id/estado', (req, res) => {
    const { id } = req.params;
    const { nuevo_estado, ticket_numero } = req.body;

    const order = ORDERS_DB.find(o => o.id_pedido === id || o.ticket_numero === Number(ticket_numero));

    if (!order) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    order.status = nuevo_estado;
    console.log(`[KDS] Transición de Ticket #${order.ticket_numero} a estado: ${nuevo_estado}`);

    // Emitir a todos los clientes conectados y KDS
    broadcastWebSocket({
        type: 'COCINA_ESTADO_ACTUALIZADO',
        id_pedido: order.id_pedido,
        ticket_numero: order.ticket_numero,
        nuevo_estado: nuevo_estado,
        tiempo_estimado: nuevo_estado === 'EN_PREPARACION' ? 8 : 0
    });

    res.json(order);
});

// FALLBACK ROUTE: Servir PWA index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// INICIAR SERVIDOR
if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log('========================================================');
        console.log('🍔 FASTORDER S.A. - SISTEMA PWA & KDS INICIADO CON ÉXITO');
        console.log('========================================================');
        console.log(`🌐 Servidor activo en: http://localhost:${PORT}`);
        console.log(`📱 Vista Cliente PWA: http://localhost:${PORT}/`);
        console.log(`🍳 Monitor KDS Cocina: http://localhost:${PORT}/cocina.html`);
        console.log(`🏛️ Portal de Inicio:   http://localhost:${PORT}/portal.html`);
        console.log('========================================================');
    });
}

module.exports = app;

