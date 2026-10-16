// FastOrder S.A. - Cliente PWA Móvil
// Arquitectura Multi-Interfaz Fluida iOS + Rappi (Iconografía Vectorial & SweetAlert Icons)

let productsCatalog = [];
let activeCategory = 'ALL';
let searchQuery = '';
let cart = [];
let currentCustomProduct = null;
let simulatedOffline = false;
let deferredPrompt = null;
let activeOrderTracked = null;
let wsClient = null;
let currentActiveTab = 'home';
let currentCustomer = {
    name: localStorage.getItem('fastorder_customer_name') || '',
    table: localStorage.getItem('fastorder_table_name') || 'Mesa 4'
};

// ==========================================
// 0. GENERADOR DE ICONOS VECTORIALES (SIN EMOJIS)
// ==========================================
function getFoodSVG(iconId, category) {
    const id = (iconId || '').toLowerCase();
    const cat = (category || '').toUpperCase();

    if (id.includes('bacon') || id.includes('burger') || cat === 'BURGERS') {
        return `
        <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 28C12 18 20 12 32 12C44 12 52 18 52 28H12Z" fill="#F59E0B"/>
            <circle cx="24" cy="18" r="1.5" fill="#FEF3C7"/>
            <circle cx="32" cy="16" r="1.5" fill="#FEF3C7"/>
            <circle cx="40" cy="19" r="1.5" fill="#FEF3C7"/>
            <path d="M10 32C12 30 16 34 20 31C24 28 28 33 32 30C36 27 40 33 44 30C48 27 52 32 54 31" stroke="#22C55E" stroke-width="3" stroke-linecap="round"/>
            <rect x="12" y="36" width="40" height="4.5" rx="2" fill="#EAB308"/>
            <rect x="10" y="42" width="44" height="6" rx="3" fill="#78350F"/>
            <path d="M12 49C12 55 20 58 32 58C44 58 52 55 52 49H12Z" fill="#F59E0B"/>
        </svg>`;
    } else if (id.includes('combo') || cat === 'COMBOS') {
        return `
        <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 30C8 23 13 18 22 18C31 18 36 23 36 30H8Z" fill="#F59E0B"/>
            <rect x="6" y="33" width="32" height="4" rx="2" fill="#EAB308"/>
            <rect x="6" y="39" width="32" height="5" rx="2.5" fill="#78350F"/>
            <path d="M8 46C8 51 13 54 22 54C31 54 36 51 36 46H8Z" fill="#F59E0B"/>
            <path d="M40 22L43 54H55L58 22H40Z" fill="#EF4444"/>
            <path d="M38 22H60" stroke="#DC2626" stroke-width="2"/>
            <path d="M49 22V12L54 9" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round"/>
        </svg>`;
    } else if (id.includes('fries') || id.includes('papas')) {
        return `
        <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 28L20 56H44L48 28H16Z" fill="#EF4444"/>
            <path d="M16 28C24 33 40 33 48 28" stroke="#DC2626" stroke-width="2"/>
            <rect x="22" y="10" width="4" height="20" rx="1.5" fill="#FACC15" transform="rotate(-6 22 10)"/>
            <rect x="29" y="8" width="4" height="22" rx="1.5" fill="#FACC15"/>
            <rect x="36" y="10" width="4" height="20" rx="1.5" fill="#FACC15" transform="rotate(6 36 10)"/>
            <rect x="25" y="14" width="4" height="16" rx="1.5" fill="#EAB308"/>
            <rect x="33" y="13" width="4" height="17" rx="1.5" fill="#EAB308"/>
        </svg>`;
    } else if (id.includes('onion') || id.includes('nugget') || cat === 'SIDES') {
        return `
        <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <ellipse cx="26" cy="36" rx="14" ry="9" fill="#D97706"/>
            <ellipse cx="26" cy="36" rx="7" ry="4" fill="#FEF3C7"/>
            <ellipse cx="38" cy="28" rx="14" ry="9" fill="#F59E0B"/>
            <ellipse cx="38" cy="28" rx="7" ry="4" fill="#FFFBEB"/>
            <circle cx="48" cy="42" r="8" fill="#EF4444"/>
            <circle cx="48" cy="42" r="5" fill="#F87171"/>
        </svg>`;
    } else if (id.includes('soda') || id.includes('chicha') || cat === 'DRINKS') {
        const isChicha = id.includes('chicha');
        return `
        <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 20L24 56H40L44 20H20Z" fill="${isChicha ? '#6B21A8' : '#DC2626'}"/>
            <rect x="18" y="16" width="28" height="5" rx="2.5" fill="#E2E8F0"/>
            <path d="M32 16V6L38 4" stroke="#F1F5F9" stroke-width="3" stroke-linecap="round"/>
            <ellipse cx="32" cy="36" rx="4" ry="7" fill="rgba(255,255,255,0.2)"/>
        </svg>`;
    } else if (id.includes('ice_cream') || id.includes('helado') || cat === 'DESSERTS') {
        return `
        <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 34L24 56H40L44 34H20Z" fill="#2563EB"/>
            <path d="M20 34C20 23 24 16 32 16C40 16 44 23 44 34H20Z" fill="#FEF3C7"/>
            <circle cx="32" cy="14" r="4" fill="#EF4444"/>
            <circle cx="28" cy="26" r="1.5" fill="#78350F"/>
            <circle cx="35" cy="24" r="1.5" fill="#78350F"/>
            <circle cx="32" cy="30" r="1.5" fill="#78350F"/>
        </svg>`;
    }

    return `
    <svg class="food-vector" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="24" fill="#F1F5F9"/>
        <path d="M18 36C18 26 24 22 32 22C40 22 46 26 46 36H18Z" fill="#F59E0B"/>
        <rect x="16" y="38" width="32" height="4" rx="2" fill="#22C55E"/>
    </svg>`;
}

// Iconos estilo SweetAlert2 para Toasts
function getSwalIcon(type) {
    if (type === 'success') {
        return `
        <div class="swal-badge swal-success">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>`;
    } else if (type === 'warning') {
        return `
        <div class="swal-badge swal-warning">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="8" x2="12" y2="13"></line>
                <circle cx="12" cy="17" r="1" fill="#D97706"></circle>
            </svg>
        </div>`;
    } else {
        return `
        <div class="swal-badge swal-info">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <line x1="12" y1="11" x2="12" y2="16"></line>
                <circle cx="12" cy="8" r="1" fill="#2563EB"></circle>
            </svg>
        </div>`;
    }
}

// ==========================================
// 1. SÍNTESIS DE AUDIO HÁPTICO (IOS MICRO-SOUNDS)
// ==========================================
function playHapticAudio(type = 'pop') {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'pop') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(460, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } else if (type === 'success') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(940, ctx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'tap') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(620, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        }
    } catch (e) {}
}

// ==========================================
// 2. SISTEMA MULTI-INTERFAZ (NAVEGACIÓN POR PESTAÑAS IOS)
// ==========================================
window.switchTab = function(tabName) {
    if (currentActiveTab === tabName && tabName !== 'cart') return;
    
    playHapticAudio('tap');
    currentActiveTab = tabName;

    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.remove('active');
    });
    const targetView = document.getElementById(`view-${tabName}`);
    if (targetView) targetView.classList.add('active');

    document.querySelectorAll('.tab-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });

    updateFloatingCartPill();
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (tabName === 'search') {
        const input = document.getElementById('searchInput');
        if (input && !input.value) {
            setTimeout(() => input.focus(), 150);
        }
        renderSearchResults();
    } else if (tabName === 'cart') {
        updateCartUI();
    } else if (tabName === 'account') {
        updateCustomerGreetingUI();
        updateNetworkStatusUI();
    }
};

function updateFloatingCartPill() {
    const pill = document.getElementById('floatingCartPill');
    if (!pill) return;

    const totalQty = cart.reduce((sum, i) => sum + i.cantidad, 0);
    const grandTotal = cart.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);

    if (totalQty > 0 && (currentActiveTab === 'home' || currentActiveTab === 'search')) {
        document.getElementById('floatingCartBadge').textContent = totalQty;
        document.getElementById('floatingCartTotal').textContent = `S/ ${grandTotal.toFixed(2)}`;
        pill.classList.add('show');
    } else {
        pill.classList.remove('show');
    }
}

window.setQuickSearch = function(term) {
    playHapticAudio('tap');
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = term;
        searchQuery = term.trim().toLowerCase();
        const clearBtn = document.getElementById('searchClearBtn');
        if (clearBtn) clearBtn.style.display = 'flex';
        renderSearchResults();
    }
};

// ==========================================
// 2.5 SISTEMA DE BIENVENIDA Y SELECCIÓN DE MESA (ONBOARDING IOS)
// ==========================================
let tempSelectedTable = currentCustomer.table || 'Mesa 4';

function updateCustomerGreetingUI() {
    const greeting = document.getElementById('customerGreetingLabel');
    if (greeting) {
        greeting.textContent = currentCustomer.name 
            ? `HOLA, ${currentCustomer.name.toUpperCase()}` 
            : 'HOLA, INVITADO';
    }

    const displayLoc = document.getElementById('displayLocation');
    if (displayLoc) {
        if (currentCustomer.table === 'Barra') {
            displayLoc.textContent = 'Barra • Salón';
        } else if (currentCustomer.table === 'Para Llevar') {
            displayLoc.textContent = 'Para Llevar • Mostrador';
        } else {
            displayLoc.textContent = `${currentCustomer.table} • Salón Principal`;
        }
    }

    const custNameInput = document.getElementById('customerNameInput');
    if (custNameInput) {
        if (currentCustomer.name) {
            custNameInput.value = `${currentCustomer.name} • ${currentCustomer.table}`;
        } else {
            custNameInput.value = `Cliente • ${currentCustomer.table}`;
        }
    }

    // Actualizar datos en la vista Mi Cuenta
    const accName = document.getElementById('accountCustomerName');
    if (accName) {
        accName.textContent = currentCustomer.name || 'Invitado FastOrder';
    }
    const accTable = document.getElementById('accountCustomerTable');
    if (accTable) {
        accTable.textContent = currentCustomer.table 
            ? `${currentCustomer.table} • Salón FastOrder`
            : 'Mesa 4 • Salón FastOrder';
    }
    const accInitial = document.getElementById('accountAvatarInitial');
    if (accInitial) {
        accInitial.textContent = currentCustomer.name ? currentCustomer.name.charAt(0).toUpperCase() : 'F';
    }
}

// Cambia solo la selección visual dentro del modal sin alterar currentCustomer todavía
window.selectWelcomeTable = function(tableName) {
    if (!tableName) return;
    tempSelectedTable = tableName;

    const chips = document.querySelectorAll('#welcomeTablesGrid .table-chip');
    chips.forEach(chip => {
        if (chip.getAttribute('data-table') === tableName) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    const hint = document.getElementById('selectedTableHint');
    if (hint) {
        hint.textContent = `${tableName} seleccionada`;
    }

    playHapticAudio('tap');
};

let isChangingModalMode = false;

window.openWelcomeModal = function(isChanging = false) {
    isChangingModalMode = isChanging;
    playHapticAudio('pop');
    const overlay = document.getElementById('welcomeOnboardingOverlay');
    const nameInput = document.getElementById('welcomeCustomerName');
    const title = document.getElementById('welcomeTitle');
    const subtitle = document.querySelector('.welcome-subtitle');
    const submitBtn = document.getElementById('btnWelcomeSubmit');
    const closeBtn = document.getElementById('btnCloseWelcomeModal');

    if (!overlay) return;

    // Sincronizar selección temporal con el valor confirmado actual
    tempSelectedTable = currentCustomer.table || 'Mesa 4';

    if (isChanging) {
        if (title) title.textContent = 'Modificar Mesa o Comensal';
        if (subtitle) subtitle.textContent = 'Actualiza tu nombre o selecciona una nueva mesa para tus pedidos.';
        if (submitBtn) {
            const btnSpan = submitBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = 'Actualizar Datos';
        }
        if (closeBtn) closeBtn.style.display = 'flex';
    } else {
        if (title) title.textContent = '¡Bienvenido a FastOrder!';
        if (subtitle) subtitle.textContent = 'Pide desde tu mesa sin hacer filas. Tu orden llegará directamente al monitor de cocina en tiempo real.';
        if (submitBtn) {
            const btnSpan = submitBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = 'Ver Menú y Comenzar Pedido';
        }
        if (closeBtn) closeBtn.style.display = 'none';
    }

    if (nameInput) {
        nameInput.value = currentCustomer.name || '';
    }

    // Marcar visualmente la mesa confirmada actualmente sin mutar estado
    const chips = document.querySelectorAll('#welcomeTablesGrid .table-chip');
    chips.forEach(chip => {
        if (chip.getAttribute('data-table') === tempSelectedTable) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
    const hint = document.getElementById('selectedTableHint');
    if (hint) {
        hint.textContent = `${tempSelectedTable} seleccionada`;
    }

    overlay.classList.remove('hidden');

    setTimeout(() => {
        if (nameInput) nameInput.focus();
    }, 280);
};

window.closeWelcomeModal = function() {
    playHapticAudio('tap');
    const overlay = document.getElementById('welcomeOnboardingOverlay');
    if (overlay) overlay.classList.add('hidden');
    // Restaurar tempSelectedTable al valor confirmado de currentCustomer
    tempSelectedTable = currentCustomer.table || 'Mesa 4';
    // Re-asegurar que la interfaz superior mantenga los datos confirmados
    updateCustomerGreetingUI();
};

window.submitWelcomeForm = function() {
    const nameInput = document.getElementById('welcomeCustomerName');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name || name.length < 2) {
        playHapticAudio('tap');
        showToast('Por favor escribe tu nombre para registrar tu comanda.', 'warning');
        if (nameInput) nameInput.focus();
        return;
    }

    // Confirmar cambios guardando tempSelectedTable en currentCustomer
    currentCustomer.name = name;
    currentCustomer.table = tempSelectedTable || 'Mesa 4';
    localStorage.setItem('fastorder_customer_name', currentCustomer.name);
    localStorage.setItem('fastorder_table_name', currentCustomer.table);

    updateCustomerGreetingUI();
    const overlay = document.getElementById('welcomeOnboardingOverlay');
    if (overlay) overlay.classList.add('hidden');

    playHapticAudio('success');
    showToast(`¡Listo ${name}! Asignado a ${currentCustomer.table}.`, 'success');
};

const welcomeOverlayElem = document.getElementById('welcomeOnboardingOverlay');
if (welcomeOverlayElem) {
    welcomeOverlayElem.addEventListener('click', (e) => {
        if (e.target.id === 'welcomeOnboardingOverlay' && isChangingModalMode) {
            closeWelcomeModal();
        }
    });
}

// ==========================================
// 3. REGISTRO DE SERVICE WORKER & A2HS
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            console.log('[App] Service Worker registrado exitosamente:', reg.scope);
            if (reg) {
                reg.update().catch(() => {});
            }
        } catch (err) {
            console.warn('[App] Error al registrar Service Worker:', err);
        }
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'TRIGGER_BACKGROUND_SYNC') {
            syncPendingOrders();
        }
    });
}

// A2HS: Solo mostrar 1 única vez si el usuario no lo ha descartado ni instalado previamente
const isPwaDismissed = localStorage.getItem('fastorder_install_dismissed') === 'true';
const isPwaStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Si ya lo descartó una vez o la app ya está instalada, no volver a mostrar
    if (isPwaDismissed || isPwaStandalone || localStorage.getItem('fastorder_install_dismissed') === 'true') {
        return;
    }

    const banner = document.getElementById('installBanner');
    if (banner) banner.classList.add('active');
});

const btnInstall = document.getElementById('btnInstallPwa');
if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
        localStorage.setItem('fastorder_install_dismissed', 'true');
        const banner = document.getElementById('installBanner');
        if (banner) banner.classList.remove('active');

        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        }
    });
}

const btnDismiss = document.getElementById('btnDismissInstall');
if (btnDismiss) {
    btnDismiss.addEventListener('click', () => {
        localStorage.setItem('fastorder_install_dismissed', 'true');
        const banner = document.getElementById('installBanner');
        if (banner) banner.classList.remove('active');
    });
}

// ==========================================
// 4. GESTIÓN DE CONECTIVIDAD & SIMULACIÓN
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
    const checkoutText = document.getElementById('checkoutBtnText');

    if (isOnline) {
        if (btn) btn.className = 'status-pill status-online';
        if (text) text.textContent = 'En línea';

        if (notice) {
            notice.className = 'connection-notice notice-online';
            if (title) title.textContent = 'Conexión Activa';
            if (badge) badge.textContent = 'En línea';
            if (desc) desc.textContent = 'Estás conectado en tiempo real. Las órdenes se envían de inmediato al monitor de cocina.';
            if (actionBtn) actionBtn.textContent = 'Simular Offline';
        }

        if (checkoutBtn) {
            checkoutBtn.classList.remove('offline-mode');
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
            if (checkoutText) checkoutText.textContent = 'Guardar Pedido (Sin conexión)';
        }
    }
}

window.addEventListener('online', () => {
    updateNetworkStatusUI();
    showToast('Conexión restablecida. Sincronizando con cocina...', 'success');
    syncPendingOrders();
});

window.addEventListener('offline', () => {
    updateNetworkStatusUI();
    showToast('Sin conexión a Internet. Modo local activado.', 'warning');
});

function toggleConnectivitySimulation() {
    playHapticAudio('tap');
    simulatedOffline = !simulatedOffline;
    updateNetworkStatusUI();
    if (simulatedOffline) {
        showToast('Simulación offline activada: Pedidos irán a cola local.', 'warning');
    } else {
        showToast('Simulación finalizada: Reconectado con cocina.', 'success');
        syncPendingOrders();
    }
}

const netStatusBtn = document.getElementById('netStatusBtn');
if (netStatusBtn) netStatusBtn.addEventListener('click', toggleConnectivitySimulation);

const btnSim = document.getElementById('btnToggleSimulateNet');
if (btnSim) btnSim.addEventListener('click', toggleConnectivitySimulation);



// ==========================================
// 5. BUSCADOR EN VIVO (VISTA DEDICADA)
// ==========================================
const searchInput = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        if (searchClearBtn) {
            searchClearBtn.style.display = searchQuery ? 'flex' : 'none';
        }
        renderSearchResults();
    });
}

if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
        playHapticAudio('tap');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        renderSearchResults();
    });
}

function renderSearchResults() {
    const grid = document.getElementById('searchProductsGrid');
    const title = document.getElementById('searchResultsTitle');
    const count = document.getElementById('searchResultsCount');
    if (!grid) return;

    let results = productsCatalog;
    if (searchQuery) {
        results = results.filter(p => 
            p.nombre.toLowerCase().includes(searchQuery) ||
            p.descripcion.toLowerCase().includes(searchQuery) ||
            p.categoria.toLowerCase().includes(searchQuery)
        );
        if (title) title.textContent = `Resultados para "${searchQuery}"`;
        if (count) count.textContent = `${results.length} encontrado${results.length === 1 ? '' : 's'}`;
    } else {
        if (title) title.textContent = 'Explorar todo el menú';
        if (count) count.textContent = `${results.length} platillos`;
    }

    if (results.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 36px 16px;">
                <div class="swal-badge swal-info" style="margin: 0 auto 12px; width: 44px; height: 44px;">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
                <h4 style="font-size: 1.05rem; font-weight: 800; margin-top: 8px;">No encontramos coincidencias</h4>
                <p style="color: var(--text-muted); font-size: 0.82rem; margin-top: 4px;">
                    Prueba con otra palabra clave como 'queso', 'carne' o 'combo'.
                </p>
            </div>
        `;
        return;
    }

    grid.innerHTML = results.map(prod => `
        <div class="product-card" onclick="openCustomModal('${prod.id_producto}')">
            <div class="product-thumb">
                ${prod.imagen ? `
                    <img class="product-img" src="${prod.imagen}" alt="${prod.nombre}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="food-fallback" style="display:none;">${getFoodSVG(prod.icon_id, prod.categoria)}</div>
                ` : `<div class="food-fallback">${getFoodSVG(prod.icon_id, prod.categoria)}</div>`}
                ${prod.es_popular ? '<span class="product-badge">TOP VENTAS</span>' : ''}
            </div>
            <div class="product-body">
                <h4 class="product-title">${prod.nombre}</h4>
                <p class="product-desc">${prod.descripcion}</p>
                <div class="product-footer">
                    <span class="product-price">S/ ${prod.precio.toFixed(2)}</span>
                    <button class="btn-add-item" onclick="event.stopPropagation(); openCustomModal('${prod.id_producto}')" title="Añadir">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// 6. CARGA DE CATÁLOGO (STALE-WHILE-REVALIDATE)
// ==========================================
async function loadCatalog() {
    try {
        if (navigator.onLine && !simulatedOffline) {
            const res = await fetch('/api/v1/productos');
            if (res.ok) {
                productsCatalog = await res.json();
                idbSaveCatalog(productsCatalog);
                renderMenuProducts();
                renderSearchResults();
                return;
            }
        }
    } catch (e) {
        console.warn('[App] Leyendo catálogo local de IndexedDB...');
    }

    try {
        const cached = await idbGetCachedCatalog();
        if (cached && cached.length > 0) {
            productsCatalog = cached;
            renderMenuProducts();
            renderSearchResults();
            showToast('Catálogo cargado desde almacenamiento local offline.', 'info');
            return;
        }
    } catch (err) {
        console.error('[IDB] Error al leer catálogo de IndexedDB:', err);
    }

    productsCatalog = getFallbackProducts();
    renderMenuProducts();
    renderSearchResults();
}

function renderMenuProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    let filtered = productsCatalog;
    if (activeCategory !== 'ALL') {
        filtered = filtered.filter(p => p.categoria === activeCategory);
    }

    const countLabel = document.getElementById('productCountLabel');
    if (countLabel) {
        countLabel.textContent = `${filtered.length} platillo${filtered.length === 1 ? '' : 's'} disponible${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:var(--text-muted); padding:30px;">No hay productos en esta categoría.</p>';
        return;
    }

    grid.innerHTML = filtered.map(prod => `
        <div class="product-card" onclick="openCustomModal('${prod.id_producto}')">
            <div class="product-thumb">
                ${prod.imagen ? `
                    <img class="product-img" src="${prod.imagen}" alt="${prod.nombre}" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="food-fallback" style="display:none;">${getFoodSVG(prod.icon_id, prod.categoria)}</div>
                ` : `<div class="food-fallback">${getFoodSVG(prod.icon_id, prod.categoria)}</div>`}
                ${prod.es_popular ? '<span class="product-badge">TOP VENTAS</span>' : ''}
            </div>
            <div class="product-body">
                <h4 class="product-title">${prod.nombre}</h4>
                <p class="product-desc">${prod.descripcion}</p>
                <div class="product-footer">
                    <span class="product-price">S/ ${prod.precio.toFixed(2)}</span>
                    <button class="btn-add-item" onclick="event.stopPropagation(); openCustomModal('${prod.id_producto}')" title="Añadir">+</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Filtro de Categorías en pantalla Home
const categoryTabs = document.getElementById('categoryTabs');
if (categoryTabs) {
    categoryTabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-pill');
        if (!btn) return;

        playHapticAudio('tap');
        document.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = btn.getAttribute('data-cat');
        
        const catTitle = document.getElementById('currentCategoryTitle');
        if (catTitle) {
            catTitle.textContent = btn.textContent;
        }
        renderMenuProducts();
    });
}

// ==========================================
// 7. MODAL DE PERSONALIZACIÓN (IOS BOTTOM SHEET ULTRA-REALISTA)
// ==========================================
window.openCustomModal = function(prodId) {
    playHapticAudio('pop');
    const prod = productsCatalog.find(p => p.id_producto === prodId);
    if (!prod) return;

    const config = prod.opciones_config || {};

    // Defaults para opciones únicas (Radio)
    const defaultDrink = config.bebidas ? (config.bebidas.find(b => b.default) || config.bebidas[0]) : null;
    const defaultSide = config.papas ? (config.papas.find(p => p.default) || config.papas[0]) : null;
    const defaultTerm = config.termino ? (config.termino.find(t => t.default) || config.termino[0]) : null;
    const defaultTemp = config.temperatura ? (config.temperatura.find(t => t.default) || config.temperatura[0]) : null;
    const defaultPres = config.presentacion ? (config.presentacion.find(p => p.default) || config.presentacion[0]) : null;

    // Defaults para cremas (hasta el límite)
    const defaultSauces = config.cremas ? (config.cremas.items.filter(c => c.default).map(c => c.nombre)) : [];

    currentCustomProduct = {
        ...prod,
        selectedDrink: defaultDrink,
        selectedSide: defaultSide,
        selectedTerm: defaultTerm,
        selectedTemp: defaultTemp,
        selectedPres: defaultPres,
        selectedSauces: [...defaultSauces],
        selectedAddons: [],
        selectedRemovals: [],
        kitchenNotes: ''
    };

    document.getElementById('modalProdTitle').textContent = prod.nombre;
    document.getElementById('modalProdDesc').textContent = prod.descripcion;
    document.getElementById('modalKitchenNotes').value = '';

    const heroWrap = document.getElementById('modalHeroWrap');
    const heroImg = document.getElementById('modalHeroImg');
    if (heroWrap && heroImg) {
        if (prod.imagen) {
            heroImg.src = prod.imagen;
            heroImg.alt = prod.nombre;
            heroWrap.style.display = 'block';
        } else {
            heroWrap.style.display = 'none';
        }
    }

    renderCustomModalSections();
    updateCustomTotal();
    document.getElementById('customModalOverlay').classList.add('active');
};

function renderCustomModalSections() {
    const container = document.getElementById('modalCustomSectionsContainer');
    if (!container || !currentCustomProduct) return;

    const config = currentCustomProduct.opciones_config || {};
    let html = '';

    // 1. BEBIDAS (para combos)
    if (config.bebidas && config.bebidas.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>ELIGE TU BEBIDA</span>
                <span class="opt-badge-pill required">Obligatorio • 1 opción</span>
            </div>
            <div class="options-list">
                ${config.bebidas.map(b => {
                    const isSel = currentCustomProduct.selectedDrink?.id === b.id;
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="selectCustomRadio('bebidas', '${b.id}')">
                        <div class="opt-item-left">
                            <span class="opt-radio-circle"></span>
                            <span class="opt-label">${b.nombre}</span>
                        </div>
                        ${b.precio > 0 
                            ? `<span class="opt-price">+S/ ${b.precio.toFixed(2)}</span>` 
                            : `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Incluida</span>`}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // 2. PAPAS / GUARNICIÓN (para combos o platos con sides)
    if (config.papas && config.papas.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>ELIGE TUS PAPAS</span>
                <span class="opt-badge-pill required">Obligatorio • 1 opción</span>
            </div>
            <div class="options-list">
                ${config.papas.map(p => {
                    const isSel = currentCustomProduct.selectedSide?.id === p.id;
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="selectCustomRadio('papas', '${p.id}')">
                        <div class="opt-item-left">
                            <span class="opt-radio-circle"></span>
                            <span class="opt-label">${p.nombre}</span>
                        </div>
                        ${p.precio > 0 
                            ? `<span class="opt-price">+S/ ${p.precio.toFixed(2)}</span>` 
                            : `<span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Incluidas</span>`}
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // 3. TÉRMINO DE CARNE (para burgers de res)
    if (config.termino && config.termino.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>TÉRMINO DE COCCIÓN</span>
                <span class="opt-badge-pill optional">1 opción</span>
            </div>
            <div class="options-list">
                ${config.termino.map(t => {
                    const isSel = currentCustomProduct.selectedTerm?.id === t.id;
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="selectCustomRadio('termino', '${t.id}')">
                        <div class="opt-item-left">
                            <span class="opt-radio-circle"></span>
                            <span class="opt-label">${t.nombre}</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // 4. TEMPERATURA & PRESENTACIÓN (para bebidas individuales)
    if (config.temperatura && config.temperatura.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>TEMPERATURA</span>
                <span class="opt-badge-pill optional">1 opción</span>
            </div>
            <div class="options-list">
                ${config.temperatura.map(t => {
                    const isSel = currentCustomProduct.selectedTemp?.id === t.id;
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="selectCustomRadio('temperatura', '${t.id}')">
                        <div class="opt-item-left">
                            <span class="opt-radio-circle"></span>
                            <span class="opt-label">${t.nombre}</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    if (config.presentacion && config.presentacion.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>PRESENTACIÓN</span>
                <span class="opt-badge-pill optional">1 opción</span>
            </div>
            <div class="options-list">
                ${config.presentacion.map(p => {
                    const isSel = currentCustomProduct.selectedPres?.id === p.id;
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="selectCustomRadio('presentacion', '${p.id}')">
                        <div class="opt-item-left">
                            <span class="opt-radio-circle"></span>
                            <span class="opt-label">${p.nombre}</span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // 5. CREMAS & SALSAS (Multi-selección chips con límite)
    if (config.cremas && config.cremas.items && config.cremas.items.length > 0) {
        const title = config.cremas.titulo || 'CREMAS DE LA HAMBURGUESA';
        const max = config.cremas.max || 4;
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>${title.toUpperCase()}</span>
                <span class="opt-badge-pill free">Gratis • Hasta ${max}</span>
            </div>
            <div class="sauces-grid">
                ${config.cremas.items.map(s => {
                    const isSel = currentCustomProduct.selectedSauces.includes(s.nombre);
                    return `
                    <div class="sauce-chip ${isSel ? 'selected' : ''}" onclick="toggleSauce('${s.nombre}', ${max})">
                        <span class="chip-check">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </span>
                        <span>${s.nombre}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // 6. AGREGADOS & EXTRAS (con precio adicional)
    const addons = config.agregados || (currentCustomProduct.modificadores_disponibles ? currentCustomProduct.modificadores_disponibles.filter(m => m.tipo === 'AGREGADO') : []);
    if (addons.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>AGREGADOS & EXTRAS</span>
                <span class="opt-badge-pill optional">Opcional</span>
            </div>
            <div class="options-list">
                ${addons.map(a => {
                    const isSel = currentCustomProduct.selectedAddons.some(item => item.id === a.id);
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="toggleAddon('${a.id}', '${a.nombre}', ${a.precio})">
                        <div class="opt-item-left">
                            <span class="opt-checkbox-box">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </span>
                            <span class="opt-label">+ ${a.nombre}</span>
                        </div>
                        <span class="opt-price">+S/ ${a.precio.toFixed(2)}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // 7. PREFERENCIAS DE COCINA (Remociones sin costo)
    const removals = config.remociones || [
        { id: 'rem-cebolla', nombre: 'Sin Cebolla' },
        { id: 'rem-pepinillos', nombre: 'Sin Pepinillos' },
        { id: 'rem-tomate', nombre: 'Sin Tomate' },
        { id: 'rem-lechuga', nombre: 'Sin Lechuga' },
        { id: 'rem-salsas-aparte', nombre: 'Salsas en Envase Aparte' }
    ];
    if (removals.length > 0) {
        html += `
        <div class="opt-group">
            <div class="opt-group-title">
                <span>PREFERENCIAS DE INGREDIENTES</span>
                <span class="opt-badge-pill optional">Sin costo</span>
            </div>
            <div class="options-list">
                ${removals.map(r => {
                    const isSel = currentCustomProduct.selectedRemovals.some(item => item.id === r.id);
                    return `
                    <div class="opt-item ${isSel ? 'selected' : ''}" onclick="toggleRemoval('${r.id}', '${r.nombre}')">
                        <div class="opt-item-left">
                            <span class="opt-checkbox-box">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </span>
                            <span class="opt-label">- ${r.nombre}</span>
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">Sin costo</span>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    container.innerHTML = html;
}

window.selectCustomRadio = function(group, optionId) {
    playHapticAudio('tap');
    if (!currentCustomProduct) return;
    const config = currentCustomProduct.opciones_config || {};

    if (group === 'bebidas') {
        const item = config.bebidas?.find(b => b.id === optionId);
        if (item) currentCustomProduct.selectedDrink = item;
    } else if (group === 'papas') {
        const item = config.papas?.find(p => p.id === optionId);
        if (item) currentCustomProduct.selectedSide = item;
    } else if (group === 'termino') {
        const item = config.termino?.find(t => t.id === optionId);
        if (item) currentCustomProduct.selectedTerm = item;
    } else if (group === 'temperatura') {
        const item = config.temperatura?.find(t => t.id === optionId);
        if (item) currentCustomProduct.selectedTemp = item;
    } else if (group === 'presentacion') {
        const item = config.presentacion?.find(p => p.id === optionId);
        if (item) currentCustomProduct.selectedPres = item;
    }

    renderCustomModalSections();
    updateCustomTotal();
};

window.toggleSauce = function(sauceName, maxAllowed) {
    playHapticAudio('tap');
    if (!currentCustomProduct) return;
    const idx = currentCustomProduct.selectedSauces.indexOf(sauceName);

    if (idx >= 0) {
        currentCustomProduct.selectedSauces.splice(idx, 1);
    } else {
        if (currentCustomProduct.selectedSauces.length >= maxAllowed) {
            showToast(`Máximo ${maxAllowed} cremas permitidas.`, 'warning');
            return;
        }
        currentCustomProduct.selectedSauces.push(sauceName);
    }
    renderCustomModalSections();
};

window.toggleAddon = function(id, nombre, precio) {
    playHapticAudio('tap');
    if (!currentCustomProduct) return;
    const idx = currentCustomProduct.selectedAddons.findIndex(a => a.id === id);
    if (idx >= 0) {
        currentCustomProduct.selectedAddons.splice(idx, 1);
    } else {
        currentCustomProduct.selectedAddons.push({ id, nombre, precio });
    }
    renderCustomModalSections();
    updateCustomTotal();
};

window.toggleRemoval = function(id, nombre) {
    playHapticAudio('tap');
    if (!currentCustomProduct) return;
    const idx = currentCustomProduct.selectedRemovals.findIndex(r => r.id === id);
    if (idx >= 0) {
        currentCustomProduct.selectedRemovals.splice(idx, 1);
    } else {
        currentCustomProduct.selectedRemovals.push({ id, nombre });
    }
    renderCustomModalSections();
};

function updateCustomTotal() {
    if (!currentCustomProduct) return;
    const drinkExtra = currentCustomProduct.selectedDrink ? (currentCustomProduct.selectedDrink.precio || 0) : 0;
    const sideExtra = currentCustomProduct.selectedSide ? (currentCustomProduct.selectedSide.precio || 0) : 0;
    const addonsTotal = currentCustomProduct.selectedAddons.reduce((sum, a) => sum + a.precio, 0);
    const total = currentCustomProduct.precio + drinkExtra + sideExtra + addonsTotal;

    const priceLabel = document.getElementById('modalProdPrice');
    if (priceLabel) priceLabel.textContent = `S/ ${total.toFixed(2)}`;

    const totalBtn = document.getElementById('modalAddTotalBtn');
    if (totalBtn) totalBtn.textContent = `S/ ${total.toFixed(2)}`;
}

document.getElementById('btnCloseCustomModal').addEventListener('click', () => {
    playHapticAudio('tap');
    document.getElementById('customModalOverlay').classList.remove('active');
});

document.getElementById('customModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'customModalOverlay') {
        playHapticAudio('tap');
        document.getElementById('customModalOverlay').classList.remove('active');
    }
});

document.getElementById('btnAddCustomToCart').addEventListener('click', () => {
    if (!currentCustomProduct) return;
    currentCustomProduct.kitchenNotes = document.getElementById('modalKitchenNotes').value.trim();

    const drinkExtra = currentCustomProduct.selectedDrink ? (currentCustomProduct.selectedDrink.precio || 0) : 0;
    const sideExtra = currentCustomProduct.selectedSide ? (currentCustomProduct.selectedSide.precio || 0) : 0;
    const addonsCost = currentCustomProduct.selectedAddons.reduce((sum, a) => sum + a.precio, 0);
    const unitPrice = currentCustomProduct.precio + drinkExtra + sideExtra + addonsCost;

    cart.push({
        id_temporal: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        id_producto: currentCustomProduct.id_producto,
        icon_id: currentCustomProduct.icon_id || 'combo',
        imagen: currentCustomProduct.imagen || null,
        nombre: currentCustomProduct.nombre,
        categoria: currentCustomProduct.categoria,
        cantidad: 1,
        precio_unitario: unitPrice,
        configuracion: {
            bebida: currentCustomProduct.selectedDrink ? currentCustomProduct.selectedDrink.nombre : null,
            papas: currentCustomProduct.selectedSide ? currentCustomProduct.selectedSide.nombre : null,
            termino: currentCustomProduct.selectedTerm ? currentCustomProduct.selectedTerm.nombre : null,
            temperatura: currentCustomProduct.selectedTemp ? currentCustomProduct.selectedTemp.nombre : null,
            presentacion: currentCustomProduct.selectedPres ? currentCustomProduct.selectedPres.nombre : null,
            cremas: [...(currentCustomProduct.selectedSauces || [])],
            agregados: [...(currentCustomProduct.selectedAddons || [])],
            remociones: [...(currentCustomProduct.selectedRemovals || [])],
            notas_cocina: currentCustomProduct.kitchenNotes || ''
        },
        modificadores: [
            ...currentCustomProduct.selectedAddons.map(a => ({ tipo: 'AGREGADO', nombre: a.nombre, precio: a.precio })),
            ...currentCustomProduct.selectedRemovals.map(r => ({ tipo: 'REMOCION', nombre: r.nombre, precio: 0 }))
        ],
        notas_cocina: currentCustomProduct.kitchenNotes
    });

    playHapticAudio('pop');
    if ('vibrate' in navigator) navigator.vibrate(30);

    updateCartUI();
    document.getElementById('customModalOverlay').classList.remove('active');
    showToast(`${currentCustomProduct.nombre} personalizado agregado a tu canasta`, 'success');
});

// ==========================================
// 7.5 RENDERIZADOR MINIMALISTA DE PERSONALIZACIONES (SIN COLORES CHILLONES, LISTA LIMPIA)
// ==========================================
function renderItemCustomList(config, modificadores = [], notas = '') {
    const c = config || {};
    const lines = [];

    // 1. Bebida seleccionada
    if (c.bebida) {
        lines.push(c.bebida);
    }

    // 2. Papas / Guarnición
    if (c.papas) {
        lines.push(c.papas);
    }

    // 3. Término de cocción
    if (c.termino) {
        lines.push(c.termino);
    }

    // 4. Temperatura (bebidas / refrescos)
    if (c.temperatura && !c.bebida) {
        lines.push(c.temperatura);
    }

    // 5. Presentación
    if (c.presentacion) {
        lines.push(c.presentacion);
    }

    // 6. Cremas agrupadas
    const cremas = c.cremas || [];
    if (cremas.length > 0) {
        lines.push(`Cremas: ${cremas.join(', ')}`);
    }

    // 7. Agregados
    const agregados = c.agregados || (modificadores ? modificadores.filter(m => m.tipo === 'AGREGADO') : []);
    if (agregados.length > 0) {
        agregados.forEach(a => {
            const nombre = a.nombre || a;
            lines.push(`+ ${nombre}`);
        });
    }

    // 8. Remociones
    const remociones = c.remociones || (modificadores ? modificadores.filter(m => m.tipo === 'REMOCION') : []);
    if (remociones.length > 0) {
        remociones.forEach(r => {
            const nombre = r.nombre || r;
            lines.push(`Sin ${nombre.replace(/^Sin\s+/i, '')}`);
        });
    }

    // 9. Notas de cocina
    const kitchenNote = c.notas_cocina || notas;
    if (kitchenNote && kitchenNote.trim()) {
        lines.push(`Nota: ${kitchenNote.trim()}`);
    }

    if (lines.length === 0) return '';

    return `
        <div class="minimal-custom-list">
            ${lines.map(line => `
                <div class="minimal-custom-row ${line.startsWith('Nota:') ? 'note' : ''}">
                    <span class="minimal-bullet">•</span>
                    <span>${line}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ==========================================
// 8. GESTIÓN DEL CARRITO (VISTA DEDICADA)
// ==========================================
function updateCartUI() {
    const totalQty = cart.reduce((sum, i) => sum + i.cantidad, 0);
    const grandTotal = cart.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);

    const tabBadge = document.getElementById('tabCartBadge');
    if (tabBadge) tabBadge.textContent = totalQty;

    const headerBadge = document.getElementById('cartHeaderBadge');
    if (headerBadge) headerBadge.textContent = `${totalQty} ítem${totalQty === 1 ? '' : 's'}`;

    const container = document.getElementById('cartItemsContainer');
    if (container) {
        if (cart.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px 16px;">
                    <div class="swal-badge swal-info" style="margin: 0 auto 12px; width: 50px; height: 50px;">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                        </svg>
                    </div>
                    <h4 style="font-size: 1.15rem; font-weight: 800; margin-top: 10px;">Tu canasta está vacía</h4>
                    <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px; margin-bottom: 20px;">
                        Explora nuestro menú y añade tus platillos favoritos.
                    </p>
                    <button class="quick-tag" style="background: var(--rappi-orange-gradient); color: white; padding: 10px 24px; font-weight: 800; border: none;" onclick="switchTab('home')">
                        Explorar el Menú
                    </button>
                </div>
            `;
        } else {
            container.innerHTML = cart.map((item, idx) => {
                return `
                <div class="cart-item">
                    <div class="cart-item-thumb">
                        ${item.imagen ? `
                            <img src="${item.imagen}" alt="${item.nombre}" class="cart-item-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="food-fallback" style="display:none;">${getFoodSVG(item.icon_id, item.categoria)}</div>
                        ` : `<div class="food-fallback">${getFoodSVG(item.icon_id, item.categoria)}</div>`}
                    </div>
                    <div class="cart-item-info">
                        <h4 style="font-size:0.92rem; font-weight:800; color:var(--text-primary); margin-bottom:2px;">${item.nombre}</h4>
                        ${renderItemCustomList(item.configuracion, item.modificadores, item.notas_cocina)}
                        <span style="font-weight:900; color:var(--rappi-orange); font-size:1rem; display:block; margin-top:4px;">S/ ${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                    </div>
                    <div class="cart-item-actions">
                        <button class="btn-qty" onclick="changeItemQty(${idx}, -1)">-</button>
                        <span style="font-weight:800; font-size:0.92rem; min-width:18px; text-align:center;">${item.cantidad}</span>
                        <button class="btn-qty" onclick="changeItemQty(${idx}, 1)">+</button>
                    </div>
                </div>`;
            }).join('');
        }
    }

    const subtotal = grandTotal / 1.18;
    const igv = grandTotal - subtotal;
    const subText = document.getElementById('cartSubtotalText');
    if (subText) subText.textContent = `S/ ${subtotal.toFixed(2)}`;
    const igvText = document.getElementById('cartIgvText');
    if (igvText) igvText.textContent = `S/ ${igv.toFixed(2)}`;
    const totalText = document.getElementById('cartTotalText');
    if (totalText) totalText.textContent = `S/ ${grandTotal.toFixed(2)}`;

    updateFloatingCartPill();
}

window.changeItemQty = function(idx, delta) {
    playHapticAudio('tap');
    if (!cart[idx]) return;
    cart[idx].cantidad += delta;
    if (cart[idx].cantidad <= 0) {
        cart.splice(idx, 1);
    }
    updateCartUI();
};

// ==========================================
// 9. CHECKOUT: ONLINE VS OFFLINE
// ==========================================
document.getElementById('btnConfirmCheckout').addEventListener('click', async () => {
    if (cart.length === 0) {
        playHapticAudio('tap');
        showToast('Agrega al menos un platillo a tu canasta.', 'warning');
        return;
    }

    playHapticAudio('success');

    const clienteNombre = document.getElementById('customerNameInput').value.trim() 
        || (currentCustomer.name || 'Cliente');
    const mesaCliente = currentCustomer.table || 'Mesa 4';
    const grandTotal = cart.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);
    const uuidLocal = 'ord-loc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 7);

    const orderPayload = {
        uuid_local: uuidLocal,
        cliente_nombre: clienteNombre,
        mesa: mesaCliente,
        total: grandTotal,
        items: cart.map(i => ({
            id_producto: i.id_producto,
            producto: i.nombre,
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: i.precio_unitario,
            configuracion: i.configuracion || null,
            bebida: i.configuracion?.bebida || null,
            papas: i.configuracion?.papas || null,
            termino: i.configuracion?.termino || null,
            temperatura: i.configuracion?.temperatura || null,
            presentacion: i.configuracion?.presentacion || null,
            cremas: i.configuracion?.cremas || [],
            agregados: i.configuracion?.agregados || [],
            remociones: i.configuracion?.remociones || [],
            modificadores: i.modificadores || [],
            notas_cocina: i.notas_cocina || ''
        })),
        creado_en: new Date().toISOString(),
        es_offline: false,
        status: 'PENDIENTE_SYNC'
    };

    const isConnected = navigator.onLine && !simulatedOffline;

    if (isConnected) {
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
            console.warn('[Checkout] Red no disponible, guardando en IndexedDB...');
        }
    }

    // MODO OFFLINE: Persistir en IndexedDB con Background Sync
    orderPayload.es_offline = true;
    orderPayload.ticket_numero = Math.floor(100 + Math.random() * 900);
    await idbSavePendingOrder(orderPayload);

    if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
            const reg = await navigator.serviceWorker.ready;
            await reg.sync.register('sync-fastorder-orders');
            console.log('[Sync] Background Sync registrado.');
        } catch (e) {}
    }

    handleOrderSuccess(orderPayload, true);
});

function handleOrderSuccess(order, isOffline) {
    cart = [];
    updateCartUI();

    activeOrderTracked = order;
    try {
        localStorage.setItem('fastorder_active_order', JSON.stringify(order));
    } catch (e) {}

    startOrderTracking(order, isOffline);

    switchTab('orders');

    if (isOffline) {
        showToast(`Pedido guardado en cola local. Ticket preliminar #${order.ticket_numero || 'PWA'}`, 'warning');
    } else {
        showToast(`Pedido enviado a cocina. Ticket #${order.ticket_numero}`, 'success');
    }
}

// ==========================================
// 10. SINCRONIZACIÓN DE PEDIDOS PENDIENTES
// ==========================================
async function syncPendingOrders() {
    if (!navigator.onLine || simulatedOffline) return;

    try {
        const pending = await idbGetPendingOrders();
        if (pending.length === 0) return;

        for (const order of pending) {
            const res = await fetch('/api/v1/pedidos/sincronizar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (res.ok) {
                const syncedOrder = await res.json();
                await idbMarkOrderSynced(order.uuid_local, syncedOrder);
                playHapticAudio('success');
                showToast(`Pedido sincronizado con éxito. Ticket #${syncedOrder.ticket_numero}`, 'success');
                
                if (activeOrderTracked && activeOrderTracked.uuid_local === order.uuid_local) {
                    activeOrderTracked = syncedOrder;
                    try {
                        localStorage.setItem('fastorder_active_order', JSON.stringify(syncedOrder));
                    } catch (e) {}
                    startOrderTracking(syncedOrder, false);
                }
            }
        }
    } catch (err) {
        console.error('[Sync] Error al sincronizar pedidos:', err);
    }
}

// ==========================================
// 11. SEGUIMIENTO DE ORDEN (VISTA DEDICADA)
// ==========================================
function startOrderTracking(order, isOffline) {
    const ticketElem = document.getElementById('trackTicketNum');
    if (ticketElem) ticketElem.textContent = `Ticket #${order.ticket_numero || 'PWA'}`;

    const badge = document.getElementById('trackStatusBadge');
    const pulseDot = document.getElementById('tabOrderPulse');

    if (pulseDot) pulseDot.style.display = 'block';

    if (isOffline) {
        if (badge) {
            badge.textContent = 'En Cola Local (Sin Red)';
            badge.style.background = '#FEF3C7';
            badge.style.color = '#B45309';
        }
        updateStepNodes(1);
    } else {
        if (badge) {
            badge.textContent = 'Recibido en Cocina';
            badge.style.background = '#EFF6FF';
            badge.style.color = '#1E3A8A';
        }
        updateStepNodes(1);
    }

    const etaText = document.getElementById('trackEtaText');
    if (etaText) etaText.textContent = 'Tiempo estimado de preparación: 10 - 12 min';

    // Renderizar Código QR de Validación para Entrega (Estilo Apple Wallet)
    const qrCard = document.getElementById('orderQrValidationCard');
    const qrContainer = document.getElementById('orderQrContainer');
    const qrTicketTag = document.getElementById('qrTicketTag');
    const qrBadgeText = document.getElementById('qrBadgeText');
    const qrDeliveredStamp = document.getElementById('orderQrDeliveredStamp');
    const qrLaserLine = document.getElementById('qrLaserLine');

    if (qrCard && qrContainer) {
        qrCard.style.display = 'flex';
        qrCard.classList.remove('qr-ready-highlight');
        if (qrTicketTag) qrTicketTag.textContent = `Ticket #${order.ticket_numero || 'PWA'}`;
        if (qrBadgeText) qrBadgeText.textContent = 'QR DE VALIDACIÓN';
        if (qrDeliveredStamp) qrDeliveredStamp.style.display = 'none';
        if (qrLaserLine) qrLaserLine.style.display = 'block';

        if (!order.codigo_pin) {
            order.codigo_pin = String(((order.ticket_numero || 104) * 37 + 1000) % 9000 + 1000);
        }
        const pinStr = String(order.codigo_pin).padStart(4, '0');
        const p1 = document.getElementById('pinDigit1');
        const p2 = document.getElementById('pinDigit2');
        const p3 = document.getElementById('pinDigit3');
        const p4 = document.getElementById('pinDigit4');
        if (p1 && p2 && p3 && p4) {
            p1.textContent = pinStr[0] || '8';
            p2.textContent = pinStr[1] || '4';
            p3.textContent = pinStr[2] || '9';
            p4.textContent = pinStr[3] || '2';
        }
        const expPin = document.getElementById('qrExpandedPinValue');
        if (expPin) expPin.textContent = pinStr;

        try {
            if (typeof qrcode !== 'undefined') {
                const tableVal = order.mesa || currentCustomer.table || 'Mesa 4';
                const clientVal = order.cliente_nombre || currentCustomer.name || 'Comensal';
                const qrData = `${window.location.origin}/cocina.html?verify_ticket=${order.ticket_numero || '104'}&pin=${pinStr}&mesa=${encodeURIComponent(tableVal)}&cliente=${encodeURIComponent(clientVal)}`;
                const qr = qrcode(0, 'M');
                qr.addData(qrData);
                qr.make();
                qrContainer.innerHTML = qr.createSvgTag(6, 0);
            }
        } catch (err) {
            console.warn('[QR] Error generando SVG QR:', err);
        }
    }

    const summaryBox = document.getElementById('trackOrderSummaryBox');
    const itemsList = document.getElementById('trackOrderItemsList');
    if (summaryBox && itemsList && order.items && order.items.length > 0) {
        summaryBox.style.display = 'block';
        itemsList.innerHTML = order.items.map(item => {
            const config = item.configuracion || {
                bebida: item.bebida,
                papas: item.papas,
                termino: item.termino,
                temperatura: item.temperatura,
                presentacion: item.presentacion,
                cremas: item.cremas || [],
                agregados: item.agregados || [],
                remociones: item.remociones || [],
                notas_cocina: item.notas_cocina
            };

            return `
            <div style="background: rgba(255,255,255,0.78); border-radius: var(--radius-md); padding: 8px 10px; border: 1px solid rgba(0,0,0,0.06);">
                <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 0.82rem;">
                    <span>${item.cantidad}x ${item.producto || item.nombre}</span>
                    <span style="color: var(--rappi-orange);">S/ ${(item.precio_unitario * item.cantidad).toFixed(2)}</span>
                </div>
                ${renderItemCustomList(config, item.modificadores, item.notas_cocina)}
            </div>`;
        }).join('');
    } else if (summaryBox) {
        summaryBox.style.display = 'none';
    }
}

function updateStepNodes(currentStep) {
    for (let s = 1; s <= 4; s++) {
        const node = document.getElementById(`stepNode${s}`);
        if (!node) continue;
        node.classList.remove('completed', 'active');
        if (s < currentStep) node.classList.add('completed');
        if (s === currentStep) node.classList.add('active');
    }
}

// ==========================================
// 12. WEBSOCKETS CLIENT (TIEMPO REAL)
// ==========================================
let appPollingInterval = null;
let appWsAttempts = 0;

function initWebSocket() {
    if (wsClient && (wsClient.readyState === WebSocket.OPEN || wsClient.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
        wsClient = new WebSocket(wsUrl);

        wsClient.onopen = () => {
            console.log('[WS] Conectado al servidor de cocina en tiempo real.');
            appWsAttempts = 0;
            if (appPollingInterval) {
                clearInterval(appPollingInterval);
                appPollingInterval = null;
            }
        };

        wsClient.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'COCINA_ESTADO_ACTUALIZADO') {
                    handleOrderStateChange(data);
                }
            } catch (e) {}
        };

        wsClient.onerror = () => {
            activateAppHttpPolling();
        };

        wsClient.onclose = () => {
            activateAppHttpPolling();
            appWsAttempts++;
            if (appWsAttempts < 3) {
                setTimeout(initWebSocket, 10000);
            }
        };
    } catch (e) {
        activateAppHttpPolling();
    }
}

function activateAppHttpPolling() {
    if (appPollingInterval) return;
    appPollingInterval = setInterval(async () => {
        if (!activeOrderTracked || activeOrderTracked.status === 'ENTREGADO_CLIENTE') return;
        try {
            const res = await fetch('/api/v1/pedidos?t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const orders = await res.json();
                if (Array.isArray(orders)) {
                    const matched = orders.find(o => 
                        o.id_pedido === activeOrderTracked.id_pedido || 
                        (activeOrderTracked.uuid_local && o.uuid_local === activeOrderTracked.uuid_local) ||
                        (activeOrderTracked.ticket_numero && Number(o.ticket_numero) === Number(activeOrderTracked.ticket_numero))
                    );
                    if (matched && matched.status !== activeOrderTracked.status) {
                        activeOrderTracked.status = matched.status;
                        try {
                            localStorage.setItem('fastorder_active_order', JSON.stringify(activeOrderTracked));
                        } catch (e) {}
                        handleOrderStateChange({
                            id_pedido: matched.id_pedido,
                            ticket_numero: matched.ticket_numero,
                            nuevo_estado: matched.status,
                            tiempo_estimado: matched.tiempo_estimado
                        });
                    }
                }
            }
        } catch (e) {}
    }, 2500);
}

function handleOrderStateChange(eventData) {
    if (!activeOrderTracked) return;
    if (activeOrderTracked.id_pedido === eventData.id_pedido || Number(activeOrderTracked.ticket_numero) === Number(eventData.ticket_numero)) {
        activeOrderTracked.status = eventData.nuevo_estado;
        try {
            localStorage.setItem('fastorder_active_order', JSON.stringify(activeOrderTracked));
        } catch (e) {}

        const badge = document.getElementById('trackStatusBadge');
        const etaText = document.getElementById('trackEtaText');

        if (eventData.nuevo_estado === 'EN_PREPARACION') {
            if (badge) {
                badge.textContent = 'En Plancha / Cocción';
                badge.style.background = '#FEF3C7';
                badge.style.color = '#B45309';
            }
            updateStepNodes(2);
            if (etaText) etaText.textContent = `Tiempo restante aproximado: ~${eventData.tiempo_estimado || 8} min`;
            showToast(`Tu pedido #${eventData.ticket_numero} está en la plancha`, 'info');
            playHapticAudio('pop');
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        } else if (eventData.nuevo_estado === 'LISTO_PARA_ENTREGA') {
            if (badge) {
                badge.textContent = 'Listo para Recoger';
                badge.style.background = '#D1FAE5';
                badge.style.color = '#065F46';
            }
            updateStepNodes(3);
            if (etaText) etaText.textContent = 'Muestra tu código QR al personal para validar tu entrega.';

            // Resaltar tarjeta QR para escaneo obligatorio
            const qrCard = document.getElementById('orderQrValidationCard');
            const qrBadgeText = document.getElementById('qrBadgeText');
            const qrInstructionTitle = document.getElementById('qrInstructionTitle');
            const qrInstructionDesc = document.getElementById('qrInstructionDesc');
            if (qrCard) qrCard.classList.add('qr-ready-highlight');
            if (qrBadgeText) qrBadgeText.textContent = '¡LISTO! PRESENTA ESTE QR';
            if (qrInstructionTitle) qrInstructionTitle.textContent = '¡Comanda lista! Muestra tu QR al mozo';
            if (qrInstructionDesc) qrInstructionDesc.textContent = 'El mozo o cocina escaneará este código para validar tu orden y entregarte tu pedido.';

            showToast(`¡Tu pedido #${eventData.ticket_numero} está listo! Presenta tu código QR.`, 'success');
            playHapticAudio('success');
            if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        } else if (eventData.nuevo_estado === 'ENTREGADO_CLIENTE') {
            if (badge) {
                badge.textContent = 'Pedido Entregado';
                badge.style.background = '#F1F5F9';
                badge.style.color = '#475569';
            }
            updateStepNodes(4);
            if (etaText) etaText.textContent = '¡Gracias por disfrutar de FastOrder! Buen provecho.';

            // Mostrar sello de validación completada
            const qrCard = document.getElementById('orderQrValidationCard');
            const qrBadgeText = document.getElementById('qrBadgeText');
            const qrInstructionTitle = document.getElementById('qrInstructionTitle');
            const qrInstructionDesc = document.getElementById('qrInstructionDesc');
            const qrDeliveredStamp = document.getElementById('orderQrDeliveredStamp');
            const qrLaserLine = document.getElementById('qrLaserLine');

            if (qrCard) qrCard.classList.remove('qr-ready-highlight');
            if (qrDeliveredStamp) qrDeliveredStamp.style.display = 'flex';
            if (qrLaserLine) qrLaserLine.style.display = 'none';
            if (qrBadgeText) qrBadgeText.textContent = 'ENTREGA COMPLETADA';
            if (qrInstructionTitle) qrInstructionTitle.textContent = '¡Pedido entregado con éxito!';
            if (qrInstructionDesc) qrInstructionDesc.textContent = 'Código QR verificado y validado por el personal de cocina.';

            const pulseDot = document.getElementById('tabOrderPulse');
            if (pulseDot) pulseDot.style.display = 'none';
            showToast(`¡Código QR verificado! Pedido #${eventData.ticket_numero} entregado.`, 'success');
            playHapticAudio('pop');
        }
    }
}

// Control del Modal de QR Pantalla Completa
window.expandQrModal = function() {
    playHapticAudio('pop');
    const modal = document.getElementById('qrExpandedModal');
    const box = document.getElementById('qrExpandedCodeBox');
    const pill = document.getElementById('qrExpandedTicketPill');
    const pinBadge = document.getElementById('qrExpandedPinValue');
    if (!modal || !box) return;

    if (activeOrderTracked && typeof qrcode !== 'undefined') {
        const tableVal = activeOrderTracked.mesa || currentCustomer.table || 'Mesa 4';
        const clientVal = activeOrderTracked.cliente_nombre || currentCustomer.name || 'Comensal';
        const pinVal = String(activeOrderTracked.codigo_pin || ((activeOrderTracked.ticket_numero * 37 + 1000) % 9000 + 1000)).padStart(4, '0');
        const qrData = `${window.location.origin}/cocina.html?verify_ticket=${activeOrderTracked.ticket_numero || '104'}&pin=${pinVal}&mesa=${encodeURIComponent(tableVal)}&cliente=${encodeURIComponent(clientVal)}`;
        const qr = qrcode(0, 'M');
        qr.addData(qrData);
        qr.make();
        box.innerHTML = qr.createSvgTag(8, 0);
        if (pill) pill.textContent = `Ticket #${activeOrderTracked.ticket_numero || 'PWA'} • ${tableVal}`;
        if (pinBadge) pinBadge.textContent = pinVal;
    }
    modal.classList.remove('hidden');
};

window.closeQrModal = function() {
    playHapticAudio('tap');
    const modal = document.getElementById('qrExpandedModal');
    if (modal) modal.classList.add('hidden');
};

// ==========================================
// 13. TOAST NOTIFICATIONS (SWEETALERT / IOS CAPSULE)
// ==========================================
let toastTimer = null;
function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');
    const text = document.getElementById('toastText');
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);

    toast.className = `toast-msg ${type}`;
    if (icon) icon.innerHTML = getSwalIcon(type);
    if (text) text.textContent = msg;

    toast.classList.add('show');

    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

// Catálogo de respaldo inicial (Siempre disponible offline - Sin emojis)
function getFallbackProducts() {
    return [
        {
            id_producto: 'p-01',
            nombre: 'Combo Doble Clásica',
            descripcion: '2 carnes de res 150g, queso cheddar, papas fritas y bebida.',
            precio: 28.50,
            categoria: 'COMBOS',
            imagen: '/images/products/combo_doble.jpg',
            icon_id: 'combo',
            es_popular: true,
            opciones_config: {
                bebidas: [
                    { id: 'b-inka-helada', nombre: 'Inka Cola 500ml Helada', precio: 0, default: true },
                    { id: 'b-inka-tiempo', nombre: 'Inka Cola 500ml Al Tiempo', precio: 0 },
                    { id: 'b-coca-helada', nombre: 'Coca Cola 500ml Helada', precio: 0 },
                    { id: 'b-coca-zero', nombre: 'Coca Cola Sin Azúcar Helada', precio: 0 },
                    { id: 'b-chicha', nombre: 'Chicha Morada Artesanal', precio: 1.50 },
                    { id: 'b-agua', nombre: 'Agua San Mateo 600ml', precio: 0 }
                ],
                papas: [
                    { id: 's-rusticas', nombre: 'Papas Rústicas con Sal y Orégano', precio: 0, default: true },
                    { id: 's-onduladas', nombre: 'Papas Fritas Onduladas', precio: 0 },
                    { id: 's-cheddar', nombre: 'Papas con Cheddar Fundido', precio: 3.50 },
                    { id: 's-aros', nombre: 'Aros de Cebolla Crujientes (6 un.)', precio: 2.50 }
                ],
                termino: [
                    { id: 't-bien', nombre: 'Bien Cocida / Sellada', default: true },
                    { id: 't-medio', nombre: 'Término Medio (Jugosa)' }
                ],
                cremas: {
                    titulo: 'Cremas de la Hamburguesa (Hasta 4)',
                    max: 4,
                    items: [
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal', default: true },
                        { id: 'c-ketchup', nombre: 'Kétchup Clásico', default: true },
                        { id: 'c-aji', nombre: 'Ají Parrillero de la Casa', default: true },
                        { id: 'c-tartara', nombre: 'Salsa Tártara Cremosa' },
                        { id: 'c-mostaza', nombre: 'Mostaza Clásica' },
                        { id: 'c-rocoto', nombre: 'Crema de Rocoto' },
                        { id: 'c-bbq', nombre: 'Salsa BBQ Ahumada' },
                        { id: 'c-golf', nombre: 'Salsa Golf' }
                    ]
                },
                agregados: [
                    { id: 'opt-queso', nombre: 'Queso Cheddar Extra Fundido', precio: 3.50 },
                    { id: 'opt-bacon', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
                    { id: 'opt-huevo', nombre: 'Huevo a la Plancha Montado', precio: 2.50 },
                    { id: 'opt-carne', nombre: 'Carne Smash Adicional 150g', precio: 6.00 }
                ],
                remociones: [
                    { id: 'rem-cebolla', nombre: 'Sin Cebolla' },
                    { id: 'rem-pepinillos', nombre: 'Sin Pepinillos' },
                    { id: 'rem-tomate', nombre: 'Sin Tomate' },
                    { id: 'rem-lechuga', nombre: 'Sin Lechuga' },
                    { id: 'rem-salsas-aparte', nombre: 'Salsas en Envase Aparte' }
                ]
            }
        },
        {
            id_producto: 'p-02',
            nombre: 'Monster Bacon Burger',
            descripcion: 'Triple carne, cuádruple tocino ahumado y salsa especial BBQ.',
            precio: 24.00,
            categoria: 'BURGERS',
            imagen: '/images/products/monster_bacon.jpg',
            icon_id: 'bacon_burger',
            es_popular: true,
            opciones_config: {
                termino: [
                    { id: 't-bien', nombre: 'Bien Cocida / Sellada', default: true },
                    { id: 't-medio', nombre: 'Término Medio (Jugosa)' }
                ],
                cremas: {
                    titulo: 'Cremas & Salsas (Hasta 4)',
                    max: 4,
                    items: [
                        { id: 'c-bbq', nombre: 'Salsa BBQ Ahumada', default: true },
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal', default: true },
                        { id: 'c-aji', nombre: 'Ají Parrillero de la Casa' },
                        { id: 'c-ketchup', nombre: 'Kétchup Clásico' },
                        { id: 'c-mostaza', nombre: 'Mostaza Clásica' },
                        { id: 'c-tartara', nombre: 'Salsa Tártara' },
                        { id: 'c-rocoto', nombre: 'Crema de Rocoto' }
                    ]
                },
                agregados: [
                    { id: 'opt-queso', nombre: 'Queso Cheddar Extra', precio: 3.50 },
                    { id: 'opt-bacon', nombre: 'Doble Porción de Tocino Ahumado', precio: 4.50 },
                    { id: 'opt-huevo', nombre: 'Huevo a la Plancha Montado', precio: 2.50 },
                    { id: 'opt-carne', nombre: 'Carne Smash Extra 150g', precio: 6.00 }
                ],
                remociones: [
                    { id: 'rem-cebolla', nombre: 'Sin Cebolla Caramelizada' },
                    { id: 'rem-salsas-aparte', nombre: 'Salsas en Envase Aparte' }
                ]
            }
        },
        {
            id_producto: 'p-03',
            nombre: 'Cheese Burger Especial',
            descripcion: 'Carne a la parrilla con doble queso cheddar fundido y pepinillos.',
            precio: 18.00,
            categoria: 'BURGERS',
            imagen: '/images/products/cheese_burger.jpg',
            icon_id: 'cheese_burger',
            opciones_config: {
                termino: [
                    { id: 't-bien', nombre: 'Bien Cocida / Sellada', default: true },
                    { id: 't-medio', nombre: 'Término Medio (Jugosa)' }
                ],
                cremas: {
                    titulo: 'Cremas de la Hamburguesa (Hasta 4)',
                    max: 4,
                    items: [
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal', default: true },
                        { id: 'c-ketchup', nombre: 'Kétchup Clásico', default: true },
                        { id: 'c-mostaza', nombre: 'Mostaza Clásica' },
                        { id: 'c-aji', nombre: 'Ají Parrillero de la Casa' },
                        { id: 'c-tartara', nombre: 'Salsa Tártara' },
                        { id: 'c-rocoto', nombre: 'Crema de Rocoto' }
                    ]
                },
                agregados: [
                    { id: 'opt-queso', nombre: 'Triple Queso Cheddar', precio: 3.50 },
                    { id: 'opt-bacon', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
                    { id: 'opt-huevo', nombre: 'Huevo a la Plancha', precio: 2.50 },
                    { id: 'opt-papas-hilo', nombre: 'Papas al Hilo Crocantes', precio: 2.00 }
                ],
                remociones: [
                    { id: 'rem-pepinillos', nombre: 'Sin Pepinillos' },
                    { id: 'rem-cebolla', nombre: 'Sin Cebolla' },
                    { id: 'rem-tomate', nombre: 'Sin Tomate' },
                    { id: 'rem-lechuga', nombre: 'Sin Lechuga' },
                    { id: 'rem-salsas-aparte', nombre: 'Salsas en Envase Aparte' }
                ]
            }
        },
        {
            id_producto: 'p-04',
            nombre: 'Pollo Crujiente Deluxe',
            descripcion: 'Pechuga de pollo empanizada extra crocante con lechuga fresca.',
            precio: 21.50,
            categoria: 'BURGERS',
            imagen: '/images/products/chicken_burger.jpg',
            icon_id: 'chicken_burger',
            opciones_config: {
                cremas: {
                    titulo: 'Cremas para tu Pollo Crujiente (Hasta 4)',
                    max: 4,
                    items: [
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal', default: true },
                        { id: 'c-aji', nombre: 'Ají Pollero de la Casa', default: true },
                        { id: 'c-tartara', nombre: 'Salsa Tártara Cremosa' },
                        { id: 'c-ketchup', nombre: 'Kétchup Clásico' },
                        { id: 'c-mostaza', nombre: 'Mostaza Clásica' },
                        { id: 'c-rocoto', nombre: 'Crema de Rocoto' },
                        { id: 'c-bbq', nombre: 'Salsa BBQ Ahumada' }
                    ]
                },
                agregados: [
                    { id: 'opt-queso', nombre: 'Queso Cheddar Fundido', precio: 3.50 },
                    { id: 'opt-bacon', nombre: 'Tocino Crujiente Ahumado', precio: 4.50 },
                    { id: 'opt-huevo', nombre: 'Huevo a la Plancha', precio: 2.50 },
                    { id: 'opt-filete', nombre: 'Filete de Pollo Extra', precio: 6.50 }
                ],
                remociones: [
                    { id: 'rem-lechuga', nombre: 'Sin Lechuga' },
                    { id: 'rem-tomate', nombre: 'Sin Tomate' },
                    { id: 'rem-salsas-aparte', nombre: 'Salsas en Envase Aparte' }
                ]
            }
        },
        {
            id_producto: 'p-05',
            nombre: 'Papas Rústicas Grandes',
            descripcion: 'Papas cortadas a mano con sal de mar y orégano.',
            precio: 9.50,
            categoria: 'SIDES',
            imagen: '/images/products/papas_rusticas.jpg',
            icon_id: 'fries',
            opciones_config: {
                cremas: {
                    titulo: 'Salsas para Dippear (Hasta 3)',
                    max: 3,
                    items: [
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal', default: true },
                        { id: 'c-aji', nombre: 'Ají Pollero de la Casa', default: true },
                        { id: 'c-tartara', nombre: 'Salsa Tártara' },
                        { id: 'c-ketchup', nombre: 'Kétchup Clásico' },
                        { id: 'c-golf', nombre: 'Salsa Golf' },
                        { id: 'c-bbq', nombre: 'Salsa BBQ Ahumada' }
                    ]
                },
                agregados: [
                    { id: 'opt-cheddar-bath', nombre: 'Bañadas en Cheddar Fundido', precio: 3.50 },
                    { id: 'opt-bacon-bits', nombre: 'Trocitos de Tocino Crocante', precio: 3.00 },
                    { id: 'opt-combo-bath', nombre: 'Full Mix: Cheddar + Bacon Bits', precio: 5.50 }
                ],
                remociones: [
                    { id: 'rem-oregano', nombre: 'Sin Orégano' },
                    { id: 'rem-sal', nombre: 'Baja en Sal' }
                ]
            }
        },
        {
            id_producto: 'p-06',
            nombre: 'Aros de Cebolla Crujientes',
            descripcion: 'Aros de cebolla rebozados acompañados de salsa tártara.',
            precio: 8.00,
            categoria: 'SIDES',
            imagen: '/images/products/aros_cebolla.jpg',
            icon_id: 'onion_rings',
            opciones_config: {
                cremas: {
                    titulo: 'Salsa de Acompañamiento (Hasta 2)',
                    max: 2,
                    items: [
                        { id: 'c-tartara', nombre: 'Salsa Tártara de la Casa', default: true },
                        { id: 'c-bbq', nombre: 'Salsa BBQ Ahumada' },
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal' },
                        { id: 'c-aji', nombre: 'Ají Parrillero' }
                    ]
                },
                agregados: [
                    { id: 'opt-cheddar-bath', nombre: 'Bañados en Queso Cheddar', precio: 3.50 }
                ],
                remociones: []
            }
        },
        {
            id_producto: 'p-07',
            nombre: 'Nuggets de Pollo x10',
            descripcion: 'Crujientes bocados de pollo con salsa golf o barbacoa.',
            precio: 14.00,
            categoria: 'SIDES',
            imagen: '/images/products/nuggets.jpg',
            icon_id: 'nuggets',
            opciones_config: {
                cremas: {
                    titulo: 'Salsas para Acompañar (Elige 2)',
                    max: 2,
                    items: [
                        { id: 'c-bbq', nombre: 'Salsa BBQ Ahumada', default: true },
                        { id: 'c-golf', nombre: 'Salsa Golf', default: true },
                        { id: 'c-mayo', nombre: 'Mayonesa Artesanal' },
                        { id: 'c-mostaza', nombre: 'Mostaza Clásica' },
                        { id: 'c-aji', nombre: 'Ají Pollero' }
                    ]
                },
                agregados: [
                    { id: 'opt-portion-papas', nombre: 'Porción Personal de Papas Fritas', precio: 5.00 }
                ],
                remociones: []
            }
        },
        {
            id_producto: 'p-08',
            nombre: 'Inka Cola 500ml',
            descripcion: 'Gaseosa nacional helada o sin helar.',
            precio: 5.00,
            categoria: 'DRINKS',
            imagen: '/images/products/inka_cola.jpg',
            icon_id: 'soda',
            opciones_config: {
                temperatura: [
                    { id: 'temp-helada', nombre: 'Bien Helada', default: true },
                    { id: 'temp-tiempo', nombre: 'Al Tiempo (Sin Helar)' }
                ],
                presentacion: [
                    { id: 'pres-vaso', nombre: 'Con Vaso y Hielos', default: true },
                    { id: 'pres-botella', nombre: 'Solo la Botella' }
                ],
                agregados: [],
                remociones: []
            }
        },
        {
            id_producto: 'p-09',
            nombre: 'Chicha Morada Artesanal',
            descripcion: 'Preparada con maíz morado, piña, manzana y canela.',
            precio: 6.00,
            categoria: 'DRINKS',
            imagen: '/images/products/chicha_morada.jpg',
            icon_id: 'chicha',
            opciones_config: {
                temperatura: [
                    { id: 'temp-hielo', nombre: 'Helada con Hielo y Limón', default: true },
                    { id: 'temp-sinhielo', nombre: 'Sin Hielo (Fría de Jarra)' }
                ],
                agregados: [],
                remociones: []
            }
        },
        {
            id_producto: 'p-10',
            nombre: 'Helado Oreo Cream',
            descripcion: 'Copa de helado con trozos crujientes de galleta Oreo.',
            precio: 7.50,
            categoria: 'DESSERTS',
            imagen: '/images/products/helado_oreo.jpg',
            icon_id: 'ice_cream',
            opciones_config: {
                agregados: [
                    { id: 'opt-fudge', nombre: 'Extra Fudge de Chocolate Caliente', precio: 1.50 },
                    { id: 'opt-oreo', nombre: 'Doble Galleta Oreo Triturada', precio: 2.00 },
                    { id: 'opt-chispas', nombre: 'Lluvia de Chispas de Chocolate', precio: 1.50 }
                ],
                remociones: [
                    { id: 'rem-fudge', nombre: 'Sin Fudge de Chocolate' }
                ]
            }
        }
    ];
}

// Inicialización general
document.addEventListener('DOMContentLoaded', () => {
    updateNetworkStatusUI();
    loadCatalog();
    initWebSocket();
    updateCustomerGreetingUI();

    // Restaurar seguimiento de comanda activa si existe en almacenamiento local
    try {
        const savedOrder = localStorage.getItem('fastorder_active_order');
        if (savedOrder) {
            const parsed = JSON.parse(savedOrder);
            if (parsed && parsed.status !== 'ENTREGADO_CLIENTE') {
                activeOrderTracked = parsed;
                startOrderTracking(parsed, parsed.es_offline);
            }
        }
    } catch (e) {}

    const urlParams = new URLSearchParams(window.location.search);
    const demoState = urlParams.get('state');

    // Limpiar cualquier parámetro de demo de la barra de direcciones para que no se quede persistente
    if (window.location.search && !window.location.search.includes('verify_ticket')) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Onboarding interactivo de bienvenida y selección de comensal / mesa
    openWelcomeModal(false);

    if (demoState === 'offline') {
        simulatedOffline = true;
        updateNetworkStatusUI();
    } else if (demoState === 'account') {
        switchTab('account');
    }
});

// Restablecer Caché, Service Workers y almacenamiento local
window.resetAppAndCache = async function() {
    if (!confirm('¿Deseas restablecer la caché y limpiar los datos de pedidos por completo?')) return;
    try {
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
        localStorage.clear();
        sessionStorage.clear();
        try {
            await fetch('/api/v1/pedidos/limpiar', { method: 'POST' });
        } catch (e) {}
    } catch (e) {
        console.warn('Error purgando almacenamiento:', e);
    }
    window.location.href = '/';
};
