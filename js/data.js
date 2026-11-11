/* ==========================================================
   RegistrApp - Datos de demostración y configuración
   Los campos replican las tablas PRODUCTO / CATEGORIA de
   RegistrAppDB.sql para facilitar la conexión con el Back-end.
   Se carga ANTES de app.js.
   ========================================================== */

const CONFIG = {
    IVA_RATE: 0.19,            // IVA 19%
    LOW_STOCK_THRESHOLD: 5,    // Stock igual o menor = alerta
    BASE_SALES_TODAY: 485000,  // Ventas simuladas del día
    FIRST_INVOICE_NUMBER: 10026
};

const CATEGORIES = ['Abarrotes', 'Bebidas', 'Lácteos', 'Snacks'];

const products = [
    { id_producto: 1, sku: '770123456789', nombre_producto: 'Aceite Vegetal 1L',    categoria: 'Abarrotes', precio_venta: 12500, stock_actual: 24, icon: 'fa-bottle-droplet' },
    { id_producto: 2, sku: '770987654321', nombre_producto: 'Leche Entera 1L',      categoria: 'Lácteos',   precio_venta: 4200,  stock_actual: 2,  icon: 'fa-glass-water' },
    { id_producto: 3, sku: '770555444333', nombre_producto: 'Arroz Blanco 500g',    categoria: 'Abarrotes', precio_venta: 2800,  stock_actual: 18, icon: 'fa-bowl-rice' },
    { id_producto: 4, sku: '770111222333', nombre_producto: 'Gaseosa 1.5L',         categoria: 'Bebidas',   precio_venta: 5500,  stock_actual: 30, icon: 'fa-bottle-water' },
    { id_producto: 5, sku: '770444555666', nombre_producto: 'Galletas Festival',    categoria: 'Snacks',    precio_venta: 1200,  stock_actual: 40, icon: 'fa-cookie' },
    { id_producto: 6, sku: '770777888999', nombre_producto: 'Café Molido 250g',     categoria: 'Abarrotes', precio_venta: 9800,  stock_actual: 5,  icon: 'fa-mug-hot' },
    { id_producto: 7, sku: '770000111222', nombre_producto: 'Huevos AA x12',        categoria: 'Lácteos',   precio_venta: 14000, stock_actual: 4,  icon: 'fa-egg' },
    { id_producto: 8, sku: '770333222111', nombre_producto: 'Pasta Espagueti 500g', categoria: 'Abarrotes', precio_venta: 3200,  stock_actual: 20, icon: 'fa-utensils' }
];
