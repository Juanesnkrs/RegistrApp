/**
 * @fileoverview Lógica principal del componente front-end de RegistrApp (SPA).
 * Controla la navegación entre vistas, estado global, indicadores KPI, gestión CRUD
 * sincronizada con PostgreSQL y flujo de facturación en Punto de Venta (POS).
 * Depende de js/data.js (CONFIG, CATEGORIES, products, ProductoApiService).
 */

(function () {
    'use strict';

    /* ========================================================================
       UTILIDADES TRANSVERSALES
       ======================================================================== */

    /**
     * Atajo para obtener elementos del DOM por su atributo id.
     * @param {string} id - Identificador del elemento HTML.
     * @returns {HTMLElement|null} Elemento encontrado o null.
     */
    const $ = (id) => document.getElementById(id);

    /** Formateador numérico para pesos colombianos (COP) sin decimales */
    const currencyFormatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    /**
     * Formatea un valor numérico como moneda local legible.
     * @param {number} amount - Valor numérico a formatear.
     * @returns {string} Cadena monetaria (ej. "$ 12.500").
     */
    const formatMoney = (amount) => currencyFormatter.format(amount).replace(/\u00a0/g, ' ');

    /**
     * Escapa caracteres especiales HTML para prevenir inyección XSS al renderizar plantillas.
     * @param {string} text - Cadena de entrada.
     * @returns {string} Cadena sanitizada.
     */
    const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({
        '&': '&' + 'amp;',
        '<': '&' + 'lt;',
        '>': '&' + 'gt;',
        '"': '&' + 'quot;',
        "'": '&' + '#39;'
    }[char]));

    /**
     * Normaliza cadenas eliminando tildes y convirtiendo a minúsculas para búsquedas insensibles.
     * @param {string} text - Texto a normalizar.
     * @returns {string} Texto normalizado.
     */
    const normalizeText = (text) => String(text).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /* ========================================================================
       ESTADO CENTRAL DE LA APLICACIÓN (SPA)
       ======================================================================== */

    /**
     * Objeto de estado reactivo de la sesión y módulos activos.
     * @type {Object}
     */
    const appState = {
        cart: [],                                   // Ítems en factura: [{ id, name, price, qty }]
        invoiceNumber: CONFIG.FIRST_INVOICE_NUMBER, // Consecutivo de factura actual
        salesToday: CONFIG.BASE_SALES_TODAY,        // Acumulado de ventas del día
        editingId: null,                            // ID del producto en edición (null = creación)
        invSearch: '',                              // Término de búsqueda en inventario
        invCategory: '',                            // Filtro de categoría activa
        posSearch: ''                               // Término de búsqueda/escaneo en POS
    };

    /** Títulos dinámicos de la barra superior según la vista activa */
    const VIEW_TITLES = {
        dashboard: 'Panel Principal',
        inventory: 'Catálogo e Inventario',
        pos: 'Punto de Venta'
    };

    /** Busca un producto por su identificador en el arreglo sincronizado */
    const findProduct = (id) => products.find((p) => p.id_producto === id);

    /** Determina si un producto se encuentra en nivel crítico de existencias */
    const isLowStock = (product) => product.stock_actual <= CONFIG.LOW_STOCK_THRESHOLD;

    /** Obtiene la cantidad actualmente reservada en el carrito para un producto */
    const getInCartQty = (id) => {
        const item = appState.cart.find((i) => i.id === id);
        return item ? item.qty : 0;
    };

    /* ========================================================================
       FEEDBACK VISUAL (NOTIFICACIONES TOAST)
       ======================================================================== */

    /**
     * Despliega una notificación flotante temporal en la esquina inferior derecha.
     * @param {string} message - Mensaje informativo para el usuario.
     * @param {'success'|'error'|'warning'|'info'} [type='info'] - Categoría visual de la alerta.
     * @returns {void}
     */
    function showToast(message, type = 'info') {
        const toastStyles = {
            success: ['bg-emerald-600', 'fa-circle-check'],
            error:   ['bg-accent-600',  'fa-circle-xmark'],
            warning: ['bg-amber-500',   'fa-triangle-exclamation'],
            info:    ['bg-secondary',   'fa-circle-info']
        };
        const [bgClass, iconClass] = toastStyles[type] || toastStyles.info;

        const toastElement = document.createElement('div');
        toastElement.className = `toast-in pointer-events-auto flex items-center gap-2 ${bgClass} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg`;
        toastElement.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i><span></span>`;
        toastElement.querySelector('span').textContent = message;
        $('toast-container').appendChild(toastElement);

        setTimeout(() => {
            toastElement.classList.add('opacity-0');
            setTimeout(() => toastElement.remove(), 300);
        }, 3200);
    }

    /* ========================================================================
       SINCRONIZACIÓN CON POSTGRESQL (API REST)
       ======================================================================== */

    /**
     * Consulta los productos desde el backend Express/PostgreSQL y actualiza todas las vistas.
     * @async
     * @returns {Promise<void>}
     */
    async function syncProductsFromDatabase() {
        try {
            products = await ProductoApiService.listarTodos();
            renderAll();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    /* ========================================================================
       CONTROL DE SESIÓN (LOGIN / LOGOUT)
       ======================================================================== */

    /**
     * Alterna entre la pantalla de autenticación y el contenedor principal de la aplicación.
     * @param {boolean} isAuth - Indica si el usuario ha iniciado sesión.
     * @returns {void}
     */
    function setAuthenticated(isAuth) {
        const loginSection = $('view-login');
        const appShell = $('app-shell');
        loginSection.classList.toggle('hidden', isAuth);
        loginSection.classList.toggle('flex', !isAuth);
        appShell.classList.toggle('hidden', !isAuth);
        appShell.classList.toggle('flex', isAuth);
    }

    /**
     * Procesa el envío del formulario de acceso e inicializa los datos desde PostgreSQL.
     * @async
     * @param {SubmitEvent} event - Evento de envío del formulario.
     * @returns {Promise<void>}
     */
    async function handleLogin(event) {
        event.preventDefault();
        setAuthenticated(true);
        navigateTo('dashboard');
        event.target.reset();
        await syncProductsFromDatabase();
        showToast('Sesión iniciada correctamente', 'success');
    }

    /**
     * Cierra la sesión activa y restablece la vista de autenticación.
     * @returns {void}
     */
    function logout() {
        closeSidebar();
        closeModal();
        setAuthenticated(false);
    }

    /* ========================================================================
       NAVEGACIÓN SPA Y MENÚ RESPONSIVO
       ======================================================================== */

    /**
     * Muestra la sección solicitada sin recargar el navegador y resalta el menú activo.
     * @param {'dashboard'|'inventory'|'pos'} viewName - Identificador de la vista destino.
     * @returns {void}
     */
    function navigateTo(viewName) {
        if (!VIEW_TITLES[viewName]) return;

        document.querySelectorAll('[data-view]').forEach((section) => {
            section.classList.toggle('hidden', section.dataset.view !== viewName);
        });

        document.querySelectorAll('.nav-btn').forEach((btn) => {
            const isActive = btn.dataset.nav === viewName;
            btn.classList.toggle('bg-primary', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('text-slate-300', !isActive);
            btn.classList.toggle('hover:bg-slate-700', !isActive);
            if (isActive) btn.setAttribute('aria-current', 'page');
            else btn.removeAttribute('aria-current');
        });

        $('page-title').textContent = VIEW_TITLES[viewName];
        $('main-content').scrollTo({ top: 0 });
        closeSidebar();
    }

    /** Despliega el menú lateral en dispositivos móviles */
    function openSidebar() {
        $('sidebar').classList.remove('-translate-x-full');
        $('sidebar-overlay').classList.remove('hidden');
        $('btn-menu').setAttribute('aria-expanded', 'true');
    }

    /** Oculta el menú lateral en dispositivos móviles */
    function closeSidebar() {
        $('sidebar').classList.add('-translate-x-full');
        $('sidebar-overlay').classList.add('hidden');
        $('btn-menu').setAttribute('aria-expanded', 'false');
    }

    /** Alterna la visibilidad del menú lateral en pantallas pequeñas */
    function toggleSidebar() {
        if ($('sidebar').classList.contains('-translate-x-full')) openSidebar();
        else closeSidebar();
    }

    /* ========================================================================
       RENDERIZADO: DASHBOARD (INDICADORES KPI)
       ======================================================================== */

    /**
     * Calcula y actualiza los indicadores clave de rendimiento en el Dashboard.
     * @returns {void}
     */
    function renderDashboard() {
        const totalUnits = products.reduce((sum, p) => sum + p.stock_actual, 0);
        const activeCategories = new Set(products.map((p) => p.categoria)).size;
        const lowStockCount = products.filter(isLowStock).length;

        $('stat-sales').textContent = formatMoney(appState.salesToday);
        $('stat-items').textContent = `${totalUnits} Items`;
        $('stat-categories').textContent = `${activeCategories} categorías activas`;
        $('stat-alerts').textContent = `${lowStockCount} ${lowStockCount === 1 ? 'Producto' : 'Productos'}`;
        $('bell-dot').classList.toggle('hidden', lowStockCount === 0);
    }

    /* ========================================================================
       RENDERIZADO: INVENTARIO
       ======================================================================== */

    /**
     * Filtra y renderiza la tabla de productos con alertas visuales de bajo stock.
     * @returns {void}
     */
    function renderInventory() {
        const query = normalizeText(appState.invSearch.trim());
        const filteredList = products.filter((p) =>
            (!appState.invCategory || p.categoria === appState.invCategory) &&
            (!query || normalizeText(p.nombre_producto).includes(query) || p.sku.includes(query))
        );

        const tableBody = $('inventory-body');
        if (!filteredList.length) {
            tableBody.innerHTML = `<tr><td colspan="5" class="py-10 px-4 text-center text-slate-400">
                <i class="fa-solid fa-box-open text-2xl mb-2 block" aria-hidden="true"></i>
                No se encontraron productos registrados</td></tr>`;
            return;
        }

        tableBody.innerHTML = filteredList.map((product) => {
            const low = isLowStock(product);
            const initials = escapeHtml(
                product.nombre_producto.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '').slice(0, 3).toUpperCase() || 'PRD'
            );
            const stockBadge = low
                ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-accent-600 border border-red-200 animate-pulse">
                       <i class="fa-solid fa-circle-exclamation mr-1" aria-hidden="true"></i> ${product.stock_actual} unds (Bajo)</span>`
                : `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                       ${product.stock_actual} unidades</span>`;
            const safeName = escapeHtml(product.nombre_producto);

            return `<tr class="transition-colors ${low ? 'bg-red-50/10 hover:bg-red-50/40' : 'hover:bg-slate-50'}">
                <td class="py-3.5 px-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs ${low ? 'bg-red-100 text-accent-500' : 'bg-slate-100 text-slate-500'}" aria-hidden="true">${initials}</div>
                        <div>
                            <div class="font-semibold text-slate-900">${safeName}</div>
                            <div class="text-xs text-slate-400">ID #${product.id_producto} • SKU: ${escapeHtml(product.sku)}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3.5 px-4">${escapeHtml(product.categoria)}</td>
                <td class="py-3.5 px-4 font-semibold text-slate-900">${formatMoney(product.precio_venta)}</td>
                <td class="py-3.5 px-4 text-center">${stockBadge}</td>
                <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    <button type="button" data-inv-action="edit" data-id="${product.id_producto}" aria-label="Editar ${safeName}"
                        class="p-2 w-11 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-100"><i class="fa-solid fa-pen" aria-hidden="true"></i></button>
                    <button type="button" data-inv-action="delete" data-id="${product.id_producto}" aria-label="Eliminar ${safeName}"
                        class="p-2 w-11 text-slate-400 hover:text-accent-500 rounded-lg hover:bg-slate-100"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                </td>
            </tr>`;
        }).join('');
    }

    /* ========================================================================
       PUNTO DE VENTA (POS) - CATÁLOGO Y CARRITO
       ======================================================================== */

    /**
     * Filtra los productos disponibles según la búsqueda o código escaneado en POS.
     * @returns {Array<Object>} Productos coincidentes.
     */
    function getPosResults() {
        const query = normalizeText(appState.posSearch.trim());
        return products.filter((p) =>
            !query || normalizeText(p.nombre_producto).includes(query) || p.sku.includes(query)
        );
    }

    /**
     * Renderiza las tarjetas interactivas de productos en el catálogo del Punto de Venta.
     * @param {number} [focusId] - ID del botón a enfocar tras re-renderizar.
     * @returns {void}
     */
    function renderPosCatalog(focusId) {
        const catalogGrid = $('pos-catalog-grid');
        const list = getPosResults();

        if (!list.length) {
            catalogGrid.innerHTML = `<p class="col-span-full py-10 text-center text-slate-400">
                <i class="fa-solid fa-magnifying-glass text-2xl mb-2 block" aria-hidden="true"></i>
                No hay productos que coincidan</p>`;
            return;
        }

        catalogGrid.innerHTML = list.map((product) => {
            const availableStock = product.stock_actual - getInCartQty(product.id_producto);
            const isSoldOut = availableStock <= 0;
            const low = !isSoldOut && isLowStock(product);
            const stockLabel = isSoldOut ? 'Agotado' : `${availableStock} disp.`;
            const stockColorClass = isSoldOut || low ? 'text-accent-600 font-semibold' : 'text-slate-400';

            return `<button type="button" data-add-to-cart="${product.id_producto}" ${isSoldOut ? 'disabled' : ''}
                class="group bg-white p-4 rounded-xl border border-slate-200 text-center transition hover:border-primary hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:shadow-none">
                <div class="w-14 h-14 bg-slate-100 text-slate-500 group-hover:bg-primary-50 group-hover:text-primary rounded-full mx-auto mb-3 flex items-center justify-center transition-colors" aria-hidden="true">
                    <i class="fa-solid ${escapeHtml(product.icon || 'fa-box')} text-xl"></i>
                </div>
                <span class="block font-semibold text-sm text-slate-900">${escapeHtml(product.nombre_producto)}</span>
                <span class="block text-primary font-bold mt-1">${formatMoney(product.precio_venta)}</span>
                <span class="block text-xs mt-1 ${stockColorClass}">${stockLabel}</span>
            </button>`;
        }).join('');

        if (focusId) {
            const targetBtn = catalogGrid.querySelector(`[data-add-to-cart="${focusId}"]`);
            if (targetBtn && !targetBtn.disabled) targetBtn.focus();
        }
    }

    /**
     * Calcula Subtotal, IVA (19%) y Total general de la factura en curso.
     * @returns {{subtotal: number, iva: number, total: number}} Resumen financiero.
     */
    function calculateTotals() {
        const subtotal = appState.cart.reduce((sum, item) => sum + item.price * item.qty, 0);
        const iva = Math.round(subtotal * CONFIG.IVA_RATE);
        return { subtotal, iva, total: subtotal + iva };
    }

    /**
     * Renderiza los artículos agregados al carrito POS y actualiza los totales.
     * @param {string} [focusSelector] - Selector CSS para conservar el foco tras actualizar cantidades.
     * @returns {void}
     */
    function renderCart(focusSelector) {
        const cartList = $('cart-items');

        if (!appState.cart.length) {
            cartList.innerHTML = `<li class="py-10 text-center text-slate-400">
                <i class="fa-solid fa-cart-shopping text-3xl mb-2 block" aria-hidden="true"></i>
                <p class="text-sm font-medium text-slate-500">El carrito está vacío</p>
                <p class="text-xs">Toca un producto del catálogo para agregarlo</p></li>`;
        } else {
            cartList.innerHTML = appState.cart.map((item) => {
                const safeName = escapeHtml(item.name);
                return `<li class="py-3 flex justify-between items-center gap-3">
                    <div class="min-w-0">
                        <p class="font-semibold text-sm truncate">${safeName}</p>
                        <p class="text-xs text-slate-400">${formatMoney(item.price)} c/u</p>
                        <div class="flex items-center space-x-2 mt-1">
                            <button type="button" data-cart-action="dec" data-id="${item.id}" aria-label="Quitar una unidad de ${safeName}"
                                class="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"><i class="fa-solid fa-minus text-xs" aria-hidden="true"></i></button>
                            <span class="text-sm font-semibold w-6 text-center" aria-label="Cantidad">${item.qty}</span>
                            <button type="button" data-cart-action="inc" data-id="${item.id}" aria-label="Agregar una unidad de ${safeName}"
                                class="w-11 h-11 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center hover:bg-slate-300 transition-colors"><i class="fa-solid fa-plus text-xs" aria-hidden="true"></i></button>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-bold">${formatMoney(item.price * item.qty)}</p>
                        <button type="button" data-cart-action="remove" data-id="${item.id}" aria-label="Eliminar ${safeName} del carrito"
                            class="w-11 text-slate-400 hover:text-accent-500 transition-colors"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                    </div>
                </li>`;
            }).join('');
        }

        const { subtotal, iva, total } = calculateTotals();
        $('cart-subtotal').textContent = formatMoney(subtotal);
        $('cart-iva').textContent = formatMoney(iva);
        $('cart-total').textContent = formatMoney(total);
        $('cart-invoice').textContent = `#${appState.invoiceNumber}`;

        const isEmpty = appState.cart.length === 0;
        $('btn-process-sale').disabled = isEmpty;
        $('btn-clear-cart').disabled = isEmpty;

        if (focusSelector) {
            const focusedEl = cartList.querySelector(focusSelector);
            if (focusedEl) focusedEl.focus();
        }
    }

    /**
     * Agrega una unidad del producto seleccionado al carrito validando existencias reales.
     * @param {number} id - Identificador del producto.
     * @returns {void}
     */
    function addToCart(id) {
        const product = findProduct(id);
        if (!product) return;

        if (getInCartQty(id) + 1 > product.stock_actual) {
            showToast(`Stock insuficiente de "${product.nombre_producto}"`, 'warning');
            return;
        }

        const existingItem = appState.cart.find((i) => i.id === id);
        if (existingItem) existingItem.qty += 1;
        else appState.cart.push({ id, name: product.nombre_producto, price: product.precio_venta, qty: 1 });

        renderCart();
        renderPosCatalog(id);
    }

    /**
     * Incrementa o decrementa la cantidad de un artículo en el carrito POS.
     * @param {number} id - Identificador del producto.
     * @param {number} delta - Variación (+1 o -1).
     * @returns {void}
     */
    function changeQty(id, delta) {
        const item = appState.cart.find((i) => i.id === id);
        const product = findProduct(id);
        if (!item || !product) return;

        if (delta > 0 && item.qty + 1 > product.stock_actual) {
            showToast(`Solo hay ${product.stock_actual} unidades de "${product.nombre_producto}"`, 'warning');
            return;
        }

        item.qty += delta;
        if (item.qty <= 0) {
            appState.cart = appState.cart.filter((i) => i.id !== id);
            renderCart();
        } else {
            renderCart(`[data-cart-action="${delta > 0 ? 'inc' : 'dec'}"][data-id="${id}"]`);
        }
        renderPosCatalog();
    }

    /** Elimina por completo una línea del carrito POS */
    function removeFromCart(id) {
        appState.cart = appState.cart.filter((i) => i.id !== id);
        renderCart();
        renderPosCatalog();
    }

    /** Limpia todos los productos del carrito POS */
    function clearCart() {
        if (!appState.cart.length) return;
        appState.cart = [];
        renderCart();
        renderPosCatalog();
        showToast('Carrito vaciado', 'info');
    }

    /**
     * Confirma la venta actual, descuenta el stock en PostgreSQL mediante PUT /api/productos/:id
     * y actualiza los indicadores financieros del Dashboard.
     * @async
     * @returns {Promise<void>}
     */
    async function processSale() {
        if (!appState.cart.length) {
            showToast('Agrega al menos un producto antes de procesar la venta', 'error');
            return;
        }

        // Validación previa de existencias disponibles
        for (const item of appState.cart) {
            const product = findProduct(item.id);
            if (!product || item.qty > product.stock_actual) {
                showToast(`Stock insuficiente de "${item.name}"`, 'error');
                return;
            }
        }

        try {
            const { total } = calculateTotals();

            // Persiste el nuevo stock en PostgreSQL para cada producto vendido
            for (const item of appState.cart) {
                const product = findProduct(item.id);
                const updatedStock = Math.max(0, product.stock_actual - item.qty);

                await ProductoApiService.actualizar(product.id_producto, {
                    idCategoria: product.id_categoria,
                    nombreProducto: product.nombre_producto,
                    precioCompra: product.precio_compra,
                    precioVenta: product.precio_venta,
                    stockActual: updatedStock
                });
            }

            appState.salesToday += total;
            const processedInvoice = appState.invoiceNumber++;
            appState.cart = [];

            await syncProductsFromDatabase();
            showToast(`Venta #${processedInvoice} procesada y descontada en PostgreSQL: ${formatMoney(total)}`, 'success');
        } catch (error) {
            showToast(`Error al procesar venta: ${error.message}`, 'error');
        }
    }

    /**
     * Permite agregar productos al carrito presionando Enter (simulación de lector de códigos).
     * @param {KeyboardEvent} event - Evento de teclado.
     * @returns {void}
     */
    function handlePosSearchKeydown(event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();

        const scannedCode = event.target.value.trim();
        const results = getPosResults();
        const exactMatch = products.find((p) => p.sku === scannedCode) || (results.length === 1 ? results[0] : null);

        if (exactMatch) {
            addToCart(exactMatch.id_producto);
            event.target.value = '';
            appState.posSearch = '';
            renderPosCatalog();
        } else {
            showToast('Producto no encontrado', 'error');
        }
    }

    /* ========================================================================
       MODAL: CREAR / EDITAR PRODUCTO (PERSISTENCIA EN POSTGRESQL)
       ======================================================================== */

    /**
     * Abre el modal en modo creación o edición precargando los valores del producto.
     * @param {number|null} [productId=null] - ID del producto a editar, o null para crear uno nuevo.
     * @returns {void}
     */
    function openModal(productId = null) {
        const product = productId ? findProduct(productId) : null;
        appState.editingId = product ? product.id_producto : null;

        $('product-form').reset();
        $('modal-title').textContent = product ? `Editar producto #${product.id_producto}` : 'Nuevo producto';
        $('product-submit').textContent = product ? 'Guardar cambios' : 'Guardar producto';

        if (product) {
            $('product-name').value = product.nombre_producto;
            $('product-category').value = product.categoria;
            $('product-cost').value = product.precio_compra;
            $('product-price').value = product.precio_venta;
            $('product-stock').value = product.stock_actual;
        }

        const modal = $('modal-product');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        $('product-name').focus();
    }

    /** Cierra el modal de producto y limpia el estado de edición */
    function closeModal() {
        const modal = $('modal-product');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        appState.editingId = null;
    }

    /**
     * Valida los datos del formulario y ejecuta POST o PUT contra PostgreSQL.
     * @async
     * @param {SubmitEvent} event - Evento de envío del formulario modal.
     * @returns {Promise<void>}
     */
    async function handleProductSubmit(event) {
        event.preventDefault();

        const name = $('product-name').value.trim();
        const categoryName = $('product-category').value;
        const costPrice = Number($('product-cost').value);
        const salePrice = Number($('product-price').value);
        const stock = Number($('product-stock').value);

        const categoryObj = CATEGORIES.find((c) => c.nombre === categoryName);

        if (!name || !categoryObj || costPrice < 0 || !(salePrice > 0) || !Number.isInteger(stock) || stock < 0) {
            showToast('Revisa los datos ingresados del producto', 'error');
            return;
        }

        const payload = {
            idCategoria: categoryObj.id,
            nombreProducto: name,
            precioCompra: costPrice,
            precioVenta: salePrice,
            stockActual: stock
        };

        try {
            if (appState.editingId) {
                await ProductoApiService.actualizar(appState.editingId, payload);

                // Sincroniza el ítem si se encontraba dentro del carrito POS
                const cartItem = appState.cart.find((i) => i.id === appState.editingId);
                if (cartItem) {
                    cartItem.name = name;
                    cartItem.price = salePrice;
                    cartItem.qty = Math.min(cartItem.qty, stock);
                    if (cartItem.qty === 0) {
                        appState.cart = appState.cart.filter((i) => i.id !== cartItem.id);
                    }
                }
                showToast('Producto actualizado en PostgreSQL', 'success');
            } else {
                await ProductoApiService.crear(payload);
                showToast('Producto guardado en PostgreSQL', 'success');
            }

            closeModal();
            await syncProductsFromDatabase();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    /**
     * Solicita confirmación y elimina un producto de PostgreSQL mediante DELETE /api/productos/:id.
     * @async
     * @param {number} id - Identificador del producto a eliminar.
     * @returns {Promise<void>}
     */
    async function deleteProduct(id) {
        const product = findProduct(id);
        if (!product) return;
        if (!confirm(`¿Eliminar "${product.nombre_producto}" del inventario?`)) return;

        try {
            await ProductoApiService.eliminar(id);
            appState.cart = appState.cart.filter((i) => i.id !== id);
            await syncProductsFromDatabase();
            showToast('Producto eliminado de PostgreSQL', 'info');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    /* ========================================================================
       INICIALIZACIÓN Y DELEGACIÓN DE EVENTOS
       ======================================================================== */

    /** Re-renderiza todas las vistas sincronizadas con el estado actual */
    function renderAll() {
        renderDashboard();
        renderInventory();
        renderPosCatalog();
        renderCart();
    }

    /** Puebla los selectores de categorías en el filtro de inventario y en el modal */
    function populateCategories() {
        const optionsHtml = CATEGORIES
            .map((cat) => `<option value="${escapeHtml(cat.nombre)}">${escapeHtml(cat.nombre)}</option>`)
            .join('');
        $('inv-category').insertAdjacentHTML('beforeend', optionsHtml);
        $('product-category').insertAdjacentHTML('beforeend', optionsHtml);
    }

    /** Registra los manejadores de eventos globales mediante delegación */
    function bindEvents() {
        document.addEventListener('click', (event) => {
            const target = event.target;

            if (target === $('modal-product')) {
                closeModal();
                return;
            }

            const actionableEl = target.closest(
                '[data-nav], [data-action], [data-toast], [data-add-to-cart], [data-cart-action], [data-inv-action]'
            );
            if (!actionableEl) return;

            if (actionableEl.dataset.nav) { navigateTo(actionableEl.dataset.nav); return; }
            if (actionableEl.dataset.toast) { showToast(actionableEl.dataset.toast, 'info'); return; }
            if (actionableEl.dataset.addToCart) { addToCart(Number(actionableEl.dataset.addToCart)); return; }

            if (actionableEl.dataset.cartAction) {
                const id = Number(actionableEl.dataset.id);
                const action = actionableEl.dataset.cartAction;
                if (action === 'inc') changeQty(id, 1);
                else if (action === 'dec') changeQty(id, -1);
                else if (action === 'remove') removeFromCart(id);
                return;
            }

            if (actionableEl.dataset.invAction) {
                const id = Number(actionableEl.dataset.id);
                if (actionableEl.dataset.invAction === 'edit') openModal(id);
                else if (actionableEl.dataset.invAction === 'delete') deleteProduct(id);
                return;
            }

            switch (actionableEl.dataset.action) {
                case 'logout':            logout(); break;
                case 'toggle-sidebar':    toggleSidebar(); break;
                case 'close-sidebar':     closeSidebar(); break;
                case 'open-modal':        openModal(); break;
                case 'close-modal':       closeModal(); break;
                case 'process-sale':      processSale(); break;
                case 'clear-cart':        clearCart(); break;
                case 'quick-new-product': navigateTo('inventory'); openModal(); break;
                case 'forgot-password':
                    event.preventDefault();
                    showToast('Recuperación de contraseña simulada', 'info');
                    break;
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeModal();
                closeSidebar();
            }
        });

        $('login-form').addEventListener('submit', handleLogin);
        $('product-form').addEventListener('submit', handleProductSubmit);

        $('inv-search').addEventListener('input', (event) => {
            appState.invSearch = event.target.value;
            renderInventory();
        });
        $('inv-category').addEventListener('change', (event) => {
            appState.invCategory = event.target.value;
            renderInventory();
        });
        $('pos-search').addEventListener('input', (event) => {
            appState.posSearch = event.target.value;
            renderPosCatalog();
        });
        $('pos-search').addEventListener('keydown', handlePosSearchKeydown);
    }

    // Arranque de la aplicación cuando el DOM está listo
    document.addEventListener('DOMContentLoaded', () => {
        populateCategories();
        renderAll();
        bindEvents();
        setAuthenticated(false);
    });
})();