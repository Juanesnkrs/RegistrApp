const { POOL_CONEXION } = require('../config/database');

class ProductoModel {
  // 1. INSERCIÓN (CREATE)
  async crearProducto(datosProducto) {
    const {
      idCategoria,
      nombreProducto,
      precioCompra,
      precioVenta,
      stockActual
    } = datosProducto;

    const consultaSql = `
      INSERT INTO registrapp_db."PRODUCTO" 
        (id_categoria, nombre_producto, precio_compra, precio_venta, stock_actual)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;

    const valores = [
      idCategoria,
      nombreProducto,
      precioCompra,
      precioVenta,
      stockActual
    ];

    const resultado = await POOL_CONEXION.query(consultaSql, valores);
    return resultado.rows[0];
  }

  // 2. CONSULTA GENERAL (READ ALL)
  async obtenerTodosLosProductos() {
    const consultaSql = `
      SELECT 
        id_producto,
        id_categoria,
        nombre_producto,
        precio_compra,
        precio_venta,
        stock_actual
      FROM registrapp_db."PRODUCTO"
      ORDER BY id_producto ASC;
    `;

    const resultado = await POOL_CONEXION.query(consultaSql);
    return resultado.rows;
  }

  // 2.1. CONSULTA POR ID (READ ONE)
  async obtenerProductoPorId(idProducto) {
    const consultaSql = `
      SELECT 
        id_producto,
        id_categoria,
        nombre_producto,
        precio_compra,
        precio_venta,
        stock_actual
      FROM registrapp_db."PRODUCTO"
      WHERE id_producto = $1;
    `;

    const resultado = await POOL_CONEXION.query(consultaSql, [idProducto]);
    return resultado.rows[0] || null;
  }

  // 3. ACTUALIZACIÓN (UPDATE)
  async actualizarProducto(idProducto, datosProducto) {
    const {
      idCategoria,
      nombreProducto,
      precioCompra,
      precioVenta,
      stockActual
    } = datosProducto;

    const consultaSql = `
      UPDATE registrapp_db."PRODUCTO"
      SET 
        id_categoria = $1,
        nombre_producto = $2,
        precio_compra = $3,
        precio_venta = $4,
        stock_actual = $5
      WHERE id_producto = $6
      RETURNING *;
    `;

    const valores = [
      idCategoria,
      nombreProducto,
      precioCompra,
      precioVenta,
      stockActual,
      idProducto
    ];

    const resultado = await POOL_CONEXION.query(consultaSql, valores);
    return resultado.rows[0] || null;
  }

  // 4. ELIMINACIÓN (DELETE)
  async eliminarProducto(idProducto) {
    const consultaSql = `
      DELETE FROM registrapp_db."PRODUCTO"
      WHERE id_producto = $1
      RETURNING *;
    `;

    const resultado = await POOL_CONEXION.query(consultaSql, [idProducto]);
    return resultado.rows[0] || null;
  }
}

module.exports = ProductoModel;