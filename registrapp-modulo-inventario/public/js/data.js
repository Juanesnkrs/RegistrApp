/**
 * @fileoverview Configuración global, catálogos y capa de comunicación HTTP (API REST)
 * para conectar el front-end de RegistrApp con Node.js/Express y PostgreSQL.
 * Se carga ANTES de js/app.js.
 */

/**
 * Constantes globales de negocio y conexión con el servidor backend.
 * @constant {Object}
 */
const CONFIG = {
    API_BASE_URL: 'http://localhost:3000/api/productos',
    IVA_RATE: 0.19,            // Impuesto al Valor Agregado (19%)
    LOW_STOCK_THRESHOLD: 5,    // Umbral de alerta de reabastecimiento
    BASE_SALES_TODAY: 485000,  // Base acumulada de ventas del día
    FIRST_INVOICE_NUMBER: 10026
};

/**
 * Catálogo de categorías sincronizado con los IDs de la tabla registrapp_db."CATEGORIA".
 * @constant {Array<{id: number, nombre: string, icon: string}>}
 */
const CATEGORIES = [
    { id: 1, nombre: 'Abarrotes', icon: 'fa-bowl-rice' },
    { id: 2, nombre: 'Bebidas', icon: 'fa-bottle-water' },
    { id: 3, nombre: 'Aseo', icon: 'fa-pump-soap' },
    { id: 4, nombre: 'Lácteos', icon: 'fa-glass-water' },
    { id: 5, nombre: 'Snacks', icon: 'fa-cookie' }
];

/**
 * Arreglo reactivo en memoria que almacena los productos sincronizados desde PostgreSQL.
 * @type {Array<Object>}
 */
let products = [];

/**
 * Servicio encargado de gestionar las peticiones HTTP (CRUD) hacia la API REST.
 */
class ProductoApiService {
    /**
     * Obtiene el listado completo de productos desde PostgreSQL y normaliza sus campos
     * para la interfaz visual (SKU, nombre de categoría e ícono).
     * @async
     * @returns {Promise<Array<Object>>} Lista de productos normalizados.
     */
    static async listarTodos() {
        const respuesta = await fetch(CONFIG.API_BASE_URL);
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.exito) {
            throw new Error(resultado.mensaje || 'Error al consultar el inventario en PostgreSQL.');
        }

        return (resultado.datos || []).map((fila) => {
            const catObj = CATEGORIES.find((c) => c.id === Number(fila.id_categoria));
            return {
                id_producto: Number(fila.id_producto),
                id_categoria: Number(fila.id_categoria),
                sku: `770${String(fila.id_producto).padStart(9, '0')}`,
                nombre_producto: fila.nombre_producto,
                categoria: catObj ? catObj.nombre : `Categoría ${fila.id_categoria}`,
                precio_compra: Number(fila.precio_compra),
                precio_venta: Number(fila.precio_venta),
                stock_actual: Number(fila.stock_actual),
                icon: catObj ? catObj.icon : 'fa-box'
            };
        });
    }

    /**
     * Registra un nuevo producto en la tabla registrapp_db."PRODUCTO".
     * @async
     * @param {Object} datosProducto - Payload con idCategoria, nombreProducto, precioCompra, precioVenta y stockActual.
     * @returns {Promise<Object>} Respuesta del servidor.
     */
    static async crear(datosProducto) {
        const respuesta = await fetch(CONFIG.API_BASE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosProducto)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.exito) {
            throw new Error(resultado.mensaje || 'No se pudo registrar el producto.');
        }
        return resultado;
    }

    /**
     * Actualiza los datos o el stock de un producto existente en PostgreSQL.
     * @async
     * @param {number} idProducto - Identificador único del producto.
     * @param {Object} datosProducto - Campos actualizados del producto.
     * @returns {Promise<Object>} Respuesta del servidor.
     */
    static async actualizar(idProducto, datosProducto) {
        const respuesta = await fetch(`${CONFIG.API_BASE_URL}/${idProducto}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datosProducto)
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.exito) {
            throw new Error(resultado.mensaje || 'No se pudo actualizar el producto.');
        }
        return resultado;
    }

    /**
     * Elimina un producto de la base de datos por su identificador.
     * @async
     * @param {number} idProducto - Identificador único del producto a eliminar.
     * @returns {Promise<Object>} Confirmación del servidor.
     */
    static async eliminar(idProducto) {
        const respuesta = await fetch(`${CONFIG.API_BASE_URL}/${idProducto}`, {
            method: 'DELETE'
        });
        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.exito) {
            throw new Error(resultado.mensaje || 'No se pudo eliminar el producto.');
        }
        return resultado;
    }
}