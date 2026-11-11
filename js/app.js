/* ==========================================================
   RegistrApp - Lógica de la aplicación (Front-end)
   Depende de js/data.js (CONFIG, CATEGORIES, products)
   ========================================================== */

(function () {
    'use strict';

    /* ---------- Utilidades ---------- */
    const $ = (id) => document.getElementById(id);

    const currency = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0
    });
    const formatMoney = (n) => currency.format(n).replace(/\u00a0/g, ' ');

    const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));

    const normalize = (s) => String(s).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /* ---------- Estado ---------- */
    const state = {
        cart: [],                                   // [{ id, name, price, qty }]
        invoiceNumber: CONFIG.FIRST_INVOICE_NUMBER,
        salesToday: CONFIG.BASE_SALES_TODAY,
        editingId: null,
        invSearch: '',
        invCategory: '',
        posSearch: ''
    };

    const VIEW_TITLES = {
        dashboard: 'Panel Principal',
        inventory: 'Catálogo e Inventario',
        pos: 'Punto de Venta'
    };

    const findProduct = (id) => products.find((p) => p.id_producto === id);
    const isLow = (p) => p.stock_actual <= CONFIG.LOW_STOCK_THRESHOLD;
    const inCartQty = (id) => {
        const item = state.cart.find((i) => i.id === id);
        return item ? item.qty : 0;
    };

    /* ==========================================================
       FEEDBACK VISUAL (notificaciones)
       ========================================================== */
    function showToast(message, type = 'info') {
        const styles = {
            success: ['bg-emerald-600', 'fa-circle-check'],
            error:   ['bg-accent-600',  'fa-circle-xmark'],
            warning: ['bg-amber-500',   'fa-triangle-exclamation'],
            info:    ['bg-secondary',   'fa-circle-info']
        };
        const [bg, icon] = styles[type] || styles.info;

        const el = document.createElement('div');
        el.className = `toast-in pointer-events-auto flex items-center gap-2 ${bg} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg`;
        el.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span></span>`;
        el.querySelector('span').textContent = message;
        $('toast-container').appendChild(el);

        setTimeout(() => {
            el.classList.add('opacity-0');
            setTimeout(() => el.remove(), 300);
        }, 3200);
    }

    /* ==========================================================
       SESIÓN (simulada)
       ========================================================== */
    function setAuthenticated(isAuth) {
        const login = $('view-login');
        const shell = $('app-shell');
        login.classList.toggle('hidden', isAuth);
        login.classList.toggle('flex', !isAuth);
        shell.classList.toggle('hidden', !isAuth);
        shell.classList.toggle('flex', isAuth);
    }

    function handleLogin(e) {
        e.preventDefault();
        setAuthenticated(true);
        navigateTo('dashboard');
        e.target.reset();
        showToast('Sesión iniciada correctamente', 'success');
    }

    function logout() {
        closeSidebar();
        closeModal();
        setAuthenticated(false);
    }

    /* ==========================================================
       NAVEGACIÓN SPA
       ========================================================== */
    function navigateTo(view) {
        if (!VIEW_TITLES[view]) return;

        // Mostrar solo la vista seleccionada (sin recargar la página)
        document.querySelectorAll('[data-view]').forEach((section) => {
            section.classList.toggle('hidden', section.dataset.view !== view);
        });

        // Resaltar el botón activo del menú lateral
        document.querySelectorAll('.nav-btn').forEach((btn) => {
            const active = btn.dataset.nav === view;
            btn.classList.toggle('bg-primary', active);
            btn.classList.toggle('text-white', active);
            btn.classList.toggle('text-slate-300', !active);
            btn.classList.toggle('hover:bg-slate-700', !active);
            if (active) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });

        $('page-title').textContent = VIEW_TITLES[view];
        $('main-content').scrollTo({ top: 0 });
        closeSidebar();
    }

    function openSidebar() {
        $('sidebar').classList.remove('-translate-x-full');
        $('sidebar-overlay').classList.remove('hidden');
        $('btn-menu').setAttribute('aria-expanded', 'true');
    }

    function closeSidebar() {
        $('sidebar').classList.add('-translate-x-full');
        $('sidebar-overlay').classList.add('hidden');
        $('btn-menu').setAttribute('aria-expanded', 'false');
    }

    function toggleSidebar() {
        if ($('sidebar').classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    /* ==========================================================
       RENDER: DASHBOARD
       ========================================================== */
    function renderDashboard() {
        const totalItems = products.reduce((sum, p) => sum + p.stock_actual, 0);
        const categories = new Set(products.map((p) => p.categoria)).size;
        const alerts = products.filter(isLow).length;

        $('stat-sales').textContent = formatMoney(state.salesToday);
        $('stat-items').textContent = `${totalItems} Items`;
        $('stat-categories').textContent = `${categories} categorías activas`;
        $('stat-alerts').textContent = `${alerts} ${alerts === 1 ? 'Producto' : 'Productos'}`;
        $('bell-dot').classList.toggle('hidden', alerts === 0);
    }

    /* ==========================================================
       RENDER: INVENTARIO
       ========================================================== */
    function renderInventory() {
        const q = normalize(state.invSearch.trim());
        const list = products.filter((p) =>
            (!state.invCategory || p.categoria === state.invCategory) &&
            (!q || normalize(p.nombre_producto).includes(q) || p.sku.includes(q))
        );

        const body = $('inventory-body');
        if (!list.length) {
            body.innerHTML = `<tr><td colspan="5" class="py-10 px-4 text-center text-slate-400">
                <i class="fa-solid fa-box-open text-2xl mb-2 block" aria-hidden="true"></i>
                No se encontraron productos</td></tr>`;
            return;
        }

        body.innerHTML = list.map((p) => {
            const low = isLow(p);
            const initials = escapeHtml(p.nombre_producto.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 3).toUpperCase());
            const badge = low
                ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-accent-600 border border-red-200 animate-pulse">
                       <i class="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i> ${p.stock_actual} unds (Bajo)</span>`
                : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                       ${p.stock_actual} unidades</span>`;
            const name = escapeHtml(p.nombre_producto);

            return `<tr class="transition-colors ${low ? 'bg-red-50/10 hover:bg-red-50/40' : 'hover:bg-slate-50'}">
                <td class="py-3.5 px-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs ${low ? 'bg-red-100 text-accent-500' : 'bg-slate-100 text-slate-500'}" aria-hidden="true">${initials}</div>
                        <div>
                            <div class="font-semibold text-slate-900">${name}</div>
                            <div class="text-xs text-slate-400">SKU: ${escapeHtml(p.sku)}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4">${escapeHtml(p.categoria)}</td>
                <td class="py-3.5 px-4 font-semibold text-slate-900">${formatMoney(p.precio_venta)}</td>
                <td class="py-3.5 px-4 text-center">${badge}</td>
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button type="button" data-inv-action="edit" data-id="${p.id_producto}" aria-label="Editar ${name}"
                        class="p-2 w-11 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                    <button type="button" data-inv-action="delete" data-id="${p.id_producto}" aria-label="Eliminar ${name}"
                        class="p-2 w-11 text-slate-400 hover:text-accent-500 rounded-lg hover:bg-slate-100"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    /* ==========================================================
       RENDER: POS - CATÁLOGO
       ========================================================== */
    function getPosResults() {
        const q = normalize(state.posSearch.trim());
        return products.filter((p) =>
            !q || normalize(p.nombre_producto).includes(q) || p.sku.includes(q)
        );
    }

    function renderPosCatalog(focusId) {
        const grid = $('pos-catalog-grid');
        const list = getPosResults();

        if (!list.length) {
            grid.innerHTML = `<p class="col-span-full py-10 text-center text-slate-400">
                <i class="fa-solid fa-magnifying-glass text-2xl mb-2 block" aria-hidden="true"></i>
                No hay productos que coincidan</p>`;
            return;
        }

        grid.innerHTML = list.map((p) => {
            const available = p.stock_actual - inCartQty(p.id_producto);
            const soldOut = available <= 0;
            const low = !soldOut && isLow(p);
            const stockText = soldOut ? 'Agotado' : `${available} disp.`;
            const stockColor = soldOut || low ? 'text-accent-600 font-semibold' : 'text-slate-400';

            return `<button type="button" data-add-to-cart="${p.id_producto}" ${soldOut ? 'disabled' : ''}
                class="group bg-white p-4 rounded-xl border border-slate-200 text-center transition hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:shadow-none">
                <div class="w-14 h-14 bg-slate-100 text-slate-500 group-hover:bg-primary-50 group-hover:text-primary rounded-full mx-auto mb-3 flex items-center justify-center transition-colors" aria-hidden="true">
                    <i class="fa-solid ${escapeHtml(p.icon || 'fa-box')} text-xl"></i>
                </div>
                <span class="block font-semibold text-sm text-slate-900">${escapeHtml(p.nombre_producto)}</span>
                <span class="block text-primary font-bold mt-1">${formatMoney(p.precio_venta)}</span>
                <span class="block text-xs mt-1 ${stockColor}">${stockText}</span>
            </button>`;
        }).join('');

        if (focusId) {
            const btn = grid.querySelector(`[data-add-to-cart="${focusId}"]`);
            if (btn && !btn.disabled) btn.focus();
        }
    }

    /* ==========================================================
       POS - CARRITO Y CÁLCULO DE TOTALES
       ========================================================== */
    function calcTotals() {
        const subtotal = state.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
        const iva = Math.round(subtotal * CONFIG.IVA_RATE);
        return { subtotal, iva, total: subtotal + iva };
    }

    function renderCart(focusSelector) {
        const list = $('cart-items');

        if (!state.cart.length) {
            list.innerHTML = `<li class="py-10 text-center text-slate-400">
                <i class="fa-solid fa-cart-shopping text-3xl mb-2 block" aria-hidden="true"></i>
                <p class="text-sm font-medium text-slate-500">El carrito está vacío</p>
                <p class="text-xs">Toca un producto del catálogo para agregarlo</p></li>`;
        } else {
            list.innerHTML = state.cart.map((item) => {
                const name = escapeHtml(item.name);
                return `<li class="py-3 flex justify-between items-center gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-sm truncate">${name}</p>
                        <p class="text-xs text-slate-400">${formatMoney(item.price)} c/u</p>
                        <div class="flex items-center space-x-2 mt-1">
                            <button type="button" data-cart-action="dec" data-id="${item.id}" aria-label="Quitar una unidad de ${name}"
                                class="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"><i class="fa-solid fa-minus text-xs" aria-hidden="true"></i></button>
                            <span class="text-sm font-semibold w-6 text-center" aria-label="Cantidad">${item.qty}</span>
                            <button type="button" data-cart-action="inc" data-id="${item.id}" aria-label="Agregar una unidad de ${name}"
                                class="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"><i class="fa-solid fa-plus text-xs" aria-hidden="true"></i></button>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-bold">${formatMoney(item.price * item.qty)}</p>
                        <button type="button" data-cart-action="remove" data-id="${item.id}" aria-label="Eliminar ${name} del carrito"
                            class="w-11 text-slate-400 hover:text-accent-500 transition-colors"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                    </div>
                </li>`;
            }).join('');
        }

        const { subtotal, iva, total } = calcTotals();
        $('cart-subtotal').textContent = formatMoney(subtotal);
        $('cart-iva').textContent = formatMoney(iva);
        $('cart-total').textContent = formatMoney(total);
        $('cart-invoice').textContent = `#${state.invoiceNumber}`;

        const empty = state.cart.length === 0;
        $('btn-process-sale').disabled = empty;
        $('btn-clear-cart').disabled = empty;

        if (focusSelector) {
            const el = list.querySelector(focusSelector);
            if (el) el.focus();
        }
    }

    function addToCart(id) {
        const product = findProduct(id);
        if (!product) return;

        // Prevención de errores: no vender más de lo que hay en stock
        if (inCartQty(id) + 1 > product.stock_actual) {
            showToast(`Stock insuficiente de "${product.nombre_producto}"`, 'warning');
            return;
        }

        const item = state.cart.find((i) => i.id === id);
        if (item) item.qty += 1;
        else state.cart.push({ id, name: product.nombre_producto, price: product.precio_venta, qty: 1 });

        renderCart();
        renderPosCatalog(id);
    }

    function changeQty(id, delta) {
        const item = state.cart.find((i) => i.id === id);
        const product = findProduct(id);
        if (!item || !product) return;

        if (delta > 0 && item.qty + 1 > product.stock_actual) {
            showToast(`Solo hay ${product.stock_actual} unidades de "${product.nombre_producto}"`, 'warning');
            return;
        }

        item.qty += delta;
        if (item.qty <= 0) {
            state.cart = state.cart.filter((i) => i.id !== id);
            renderCart();
        } else {
            renderCart(`[data-cart-action="${delta > 0 ? 'inc' : 'dec'}"][data-id="${id}"]`);
        }
        renderPosCatalog();
    }

    function removeFromCart(id) {
        state.cart = state.cart.filter((i) => i.id !== id);
        renderCart();
        renderPosCatalog();
    }

    function clearCart() {
        if (!state.cart.length) return;
        state.cart = [];
        renderCart();
        renderPosCatalog();
        showToast('Carrito vaciado', 'info');
    }

    function processSale() {
        if (!state.cart.length) {
            showToast('Agrega al menos un producto antes de procesar la venta', 'error');
            return;
        }

        // Revalidar stock antes de confirmar
        for (const item of state.cart) {
            const p = findProduct(item.id);
            if (!p || item.qty > p.stock_actual) {
                showToast(`Stock insuficiente de "${item.name}"`, 'error');
                return;
            }
        }

        const { total } = calcTotals();
        state.cart.forEach((item) => { findProduct(item.id).stock_actual -= item.qty; });
        state.salesToday += total;

        const invoice = state.invoiceNumber++;
        state.cart = [];
        renderAll();
        showToast(`Venta #${invoice} procesada con éxito: ${formatMoney(total)}`, 'success');
    }

    function handlePosSearchKeydown(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();

        // Simula un lector de código de barras: código exacto o único resultado
        const code = e.target.value.trim();
        const results = getPosResults();
        const match = products.find((p) => p.sku === code) || (results.length === 1 ? results[0] : null);

        if (match) {
            addToCart(match.id_producto);
            e.target.value = '';
            state.posSearch = '';
            renderPosCatalog();
        } else {
            showToast('Producto no encontrado', 'error');
        }
    }

    /* ==========================================================
       MODAL: AGREGAR / EDITAR PRODUCTO
       ========================================================== */
    function openModal(productId = null) {
        const product = productId ? findProduct(productId) : null;
        state.editingId = product ? product.id_producto : null;

        $('product-form').reset();
        $('modal-title').textContent = product ? 'Editar producto' : 'Nuevo producto';
        $('product-submit').textContent = product ? 'Guardar cambios' : 'Guardar producto';

        if (product) {
            $('product-name').value = product.nombre_producto;
            $('product-category').value = product.categoria;
            $('product-price').value = product.precio_venta;
            $('product-stock').value = product.stock_actual;
        }

        const modal = $('modal-product');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        $('product-name').focus();
    }

    function closeModal() {
        const modal = $('modal-product');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        state.editingId = null;
    }

    function handleProductSubmit(e) {
        e.preventDefault();

        const name = $('product-name').value.trim();
        const category = $('product-category').value;
        const price = Number($('product-price').value);
        const stock = Number($('product-stock').value);

        if (!name || !category || !(price > 0) || !Number.isInteger(stock) || stock < 0) {
            showToast('Revisa los datos del producto', 'error');
            return;
        }

        if (state.editingId) {
            const p = findProduct(state.editingId);
            Object.assign(p, { nombre_producto: name, categoria: category, precio_venta: price, stock_actual: stock });

            // Mantener el carrito coherente con los cambios
            const item = state.cart.find((i) => i.id === p.id_producto);
            if (item) {
                item.name = name;
                item.price = price;
                item.qty = Math.min(item.qty, stock);
                if (item.qty === 0) state.cart = state.cart.filter((i) => i !== item);
            }
            showToast('Producto actualizado correctamente', 'success');
        } else {
            const id = products.reduce((max, p) => Math.max(max, p.id_producto), 0) + 1;
            products.push({
                id_producto: id,
                sku: `770${String(Date.now()).slice(-9)}`,
                nombre_producto: name,
                categoria: category,
                precio_venta: price,
                stock_actual: stock,
                icon: 'fa-box'
            });
            showToast('Producto guardado correctamente', 'success');
        }

        closeModal();
        renderAll();
    }

    function deleteProduct(id) {
        const p = findProduct(id);
        if (!p) return;
        if (!confirm(`¿Eliminar "${p.nombre_producto}" del inventario?`)) return;

        products.splice(products.indexOf(p), 1);
        state.cart = state.cart.filter((i) => i.id !== id);
        renderAll();
        showToast('Producto eliminado', 'info');
    }

    /* ==========================================================
       INICIALIZACIÓN Y EVENTOS
       ========================================================== */
    function renderAll() {
        renderDashboard();
        renderInventory();
        renderPosCatalog();
        renderCart();
    }

    function populateCategories() {
        const options = CATEGORIES.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
        $('inv-category').insertAdjacentHTML('beforeend', options);
        $('product-category').insertAdjacentHTML('beforeend', options);
    }

    function bindEvents() {
        // Delegación de clics para todos los botones con data-*
        document.addEventListener('click', (e) => {
            const target = e.target;

            // Clic en el fondo del modal = cerrar
            if (target === $('modal-product')) { closeModal(); return; }

            const el = target.closest(
                '[data-nav], [data-action], [data-toast], [data-add-to-cart], [data-cart-action], [data-inv-action]'
            );
            if (!el) return;

            if (el.dataset.nav) { navigateTo(el.dataset.nav); return; }
            if (el.dataset.toast) { showToast(el.dataset.toast, 'info'); return; }
            if (el.dataset.addToCart) { addToCart(Number(el.dataset.addToCart)); return; }

            if (el.dataset.cartAction) {
                const id = Number(el.dataset.id);
                const action = el.dataset.cartAction;
                if (action === 'inc') changeQty(id, 1);
                else if (action === 'dec') changeQty(id, -1);
                else if (action === 'remove') removeFromCart(id);
                return;
            }

            if (el.dataset.invAction) {
                const id = Number(el.dataset.id);
                if (el.dataset.invAction === 'edit') openModal(id);
                else if (el.dataset.invAction === 'delete') deleteProduct(id);
                return;
            }

            switch (el.dataset.action) {
                case 'logout':            logout(); break;
                case 'toggle-sidebar':    toggleSidebar(); break;
                case 'close-sidebar':     closeSidebar(); break;
                case 'open-modal':        openModal(); break;
                case 'close-modal':       closeModal(); break;
                case 'process-sale':      processSale(); break;
                case 'clear-cart':        clearCart(); break;
                case 'quick-new-product': navigateTo('inventory'); openModal(); break;
                case 'forgot-password':
                    e.preventDefault();
                    showToast('Recuperación de contraseña simulada', 'info');
                    break;
            }
        });

        // Teclado: Escape cierra modal y menú
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { closeModal(); closeSidebar(); }
        });

        // Formularios
        $('login-form').addEventListener('submit', handleLogin);
        $('product-form').addEventListener('submit', handleProductSubmit);

        // Búsqueda y filtros
        $('inv-search').addEventListener('input', (e) => { state.invSearch = e.target.value; renderInventory(); });
        $('inv-category').addEventListener('change', (e) => { state.invCategory = e.target.value; renderInventory(); });
        $('pos-search').addEventListener('input', (e) => { state.posSearch = e.target.value; renderPosCatalog(); });
        $('pos-search').addEventListener('keydown', handlePosSearchKeydown);
    }

    document.addEventListener('DOMContentLoaded', () => {
        populateCategories();
        renderAll();
        bindEvents();
        setAuthenticated(false); // Inicia en la pantalla de login
    });
})();
