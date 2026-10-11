// FastOrder S.A. - IndexedDB Persistence Module
// Offline-First Store Manager

const DB_NAME = 'FastOrderDB';
const DB_VERSION = 1;

let dbInstance = null;

function openFastOrderDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) return resolve(dbInstance);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('[IDB] Inicializando esquemas de Object Stores...');

            // Store de pedidos pendientes de sincronización (Offline)
            if (!db.objectStoreNames.contains('pending_orders')) {
                const pendingStore = db.createObjectStore('pending_orders', { keyPath: 'uuid_local' });
                pendingStore.createIndex('creado_en', 'creado_en', { unique: false });
                pendingStore.createIndex('status', 'status', { unique: false });
            }

            // Store de catálogo de productos para respaldo offline
            if (!db.objectStoreNames.contains('cached_catalog')) {
                db.createObjectStore('cached_catalog', { keyPath: 'id_producto' });
            }

            // Store de historial local de pedidos
            if (!db.objectStoreNames.contains('order_history')) {
                db.createObjectStore('order_history', { keyPath: 'uuid_local' });
            }
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('[IDB] Error al abrir base de datos:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Guardar pedido pendiente en IndexedDB
async function idbSavePendingOrder(order) {
    const db = await openFastOrderDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['pending_orders'], 'readwrite');
        const store = tx.objectStore('pending_orders');
        const req = store.put(order);
        req.onsuccess = () => resolve(order);
        req.onerror = () => reject(req.error);
    });
}

// Obtener todos los pedidos pendientes
async function idbGetPendingOrders() {
    const db = await openFastOrderDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['pending_orders'], 'readonly');
        const store = tx.objectStore('pending_orders');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

// Marcar pedido como sincronizado y mover a historial
async function idbMarkOrderSynced(uuid_local, serverData) {
    const db = await openFastOrderDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['pending_orders', 'order_history'], 'readwrite');
        const pendingStore = tx.objectStore('pending_orders');
        const historyStore = tx.objectStore('order_history');

        pendingStore.delete(uuid_local);

        const historyRecord = {
            ...serverData,
            uuid_local: uuid_local,
            sincronizado_en: new Date().toISOString()
        };
        historyStore.put(historyRecord);

        tx.oncomplete = () => resolve(historyRecord);
        tx.onerror = () => reject(tx.error);
    });
}

// Guardar catálogo en caché local
async function idbSaveCatalog(products) {
    const db = await openFastOrderDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['cached_catalog'], 'readwrite');
        const store = tx.objectStore('cached_catalog');
        products.forEach(p => store.put(p));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
    });
}

// Leer catálogo desde caché local
async function idbGetCachedCatalog() {
    const db = await openFastOrderDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['cached_catalog'], 'readonly');
        const store = tx.objectStore('cached_catalog');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

// Leer historial local de pedidos
async function idbGetOrderHistory() {
    const db = await openFastOrderDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(['order_history'], 'readonly');
        const store = tx.objectStore('order_history');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}
