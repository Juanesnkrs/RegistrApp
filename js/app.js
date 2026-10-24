/* ==========================================================
   RegistrApp - Lógica de la aplicación
   ========================================================== */

(function () {
    'use strict';

    const VIEWS = ['login', 'dashboard', 'inventory'];

    /* ---------- Navegación entre vistas ---------- */
    function switchView(viewName) {
        // Ocultar todas las vistas
        VIEWS.forEach(v => {
            document.getElementById('view-' + v).classList.add('hidden');
        });

        // Resetear estilos de las pestañas
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.classList.remove('bg-brand-600', 'text-white');
            tab.classList.add('text-slate-300');
        });

        // Mostrar vista destino y resaltar pestaña
        document.getElementById('view-' + viewName).classList.remove('hidden');
        const activeTab = document.getElementById('tab-' + viewName);
        if (activeTab) {
            activeTab.classList.add('bg-brand-600', 'text-white');
            activeTab.classList.remove('text-slate-300');
        }
    }

    /* ---------- Modal de producto ---------- */
    function openModal() {
        document.getElementById('modal-product').classList.remove('hidden');
    }

    function closeModal() {
        document.getElementById('modal-product').classList.add('hidden');
    }

    /* ---------- Acciones simuladas ---------- */
    function toggleSidebar() {
        alert('Menú lateral / Hamburger desplegado (Simulación de experiencia PWA móvil).');
    }

    function forgotPassword() {
        alert('Funcionalidad de recuperación de contraseña simulada.');
    }

    /* ---------- Registro de eventos ---------- */
    function bindEvents() {
        // Delegación de clics: botones con data-view-target / data-action / data-alert
        document.addEventListener('click', (e) => {
            const el = e.target.closest('[data-view-target], [data-action], [data-alert]');
            if (!el) return;

            if (el.dataset.viewTarget) {
                e.preventDefault();
                switchView(el.dataset.viewTarget);
                return;
            }

            if (el.dataset.alert) {
                alert(el.dataset.alert);
                return;
            }

            switch (el.dataset.action) {
                case 'open-modal':      openModal(); break;
                case 'close-modal':     closeModal(); break;
                case 'toggle-sidebar':  toggleSidebar(); break;
                case 'forgot-password': e.preventDefault(); forgotPassword(); break;
            }
        });

        // Login
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            switchView('dashboard');
        });

        // Guardar producto
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            closeModal();
            e.target.reset();
            alert('Producto guardado correctamente.');
        });
    }

    /* ---------- Inicialización ---------- */
    document.addEventListener('DOMContentLoaded', () => {
        bindEvents();
        switchView('login');
    });
})();
