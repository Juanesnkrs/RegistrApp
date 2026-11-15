const ProductoModel = require('../models/ProductoModel');

class ProductoController {
  constructor() {
    this.productoModel = new ProductoModel();
  }

  // POST /api/productos
  registrarProducto = async (req, res) => {
    try {
      const { idCategoria, nombreProducto, precioCompra, precioVenta, stockActual } = req.body;

      if (!idCategoria || !nombreProducto || precioCompra === undefined || precioVenta === undefined) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Todos los campos obligatorios deben ser diligenciados.'
        });
      }

      const nuevoProducto = await this.productoModel.crearProducto({
        idCategoria: Number(idCategoria),
        nombreProducto: String(nombreProducto).trim(),
        precioCompra: Number(precioCompra),
        precioVenta: Number(precioVenta),
        stockActual: Number(stockActual) || 0
      });

      return res.status(201).json({
        exito: true,
        mensaje: 'Producto registrado correctamente.',
        datos: nuevoProducto
      });
    } catch (error) {
      if (error.code === '23503') {
        return res.status(400).json({
          exito: false,
          mensaje: 'El id_categoria indicado no existe en la tabla CATEGORIA.'
        });
      }
      return res.status(500).json({
        exito: false,
        mensaje: 'Error interno al registrar el producto.',
        detalle: error.message
      });
    }
  };

  // GET /api/productos
  listarProductos = async (req, res) => {
    try {
      const listaProductos = await this.productoModel.obtenerTodosLosProductos();
      return res.status(200).json({
        exito: true,
        total: listaProductos.length,
        datos: listaProductos
      });
    } catch (error) {
      return res.status(500).json({
        exito: false,
        mensaje: 'Error interno al consultar los productos.',
        detalle: error.message
      });
    }
  };

  // GET /api/productos/:id
  consultarProductoPorId = async (req, res) => {
    try {
      const idProducto = Number(req.params.id);
      const productoEncontrado = await this.productoModel.obtenerProductoPorId(idProducto);

      if (!productoEncontrado) {
        return res.status(404).json({
          exito: false,
          mensaje: `No se encontró ningún producto con ID ${idProducto}.`
        });
      }

      return res.status(200).json({
        exito: true,
        datos: productoEncontrado
      });
    } catch (error) {
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al consultar el producto.',
        detalle: error.message
      });
    }
  };

  // PUT /api/productos/:id
  modificarProducto = async (req, res) => {
    try {
      const idProducto = Number(req.params.id);
      const { idCategoria, nombreProducto, precioCompra, precioVenta, stockActual } = req.body;

      const productoActualizado = await this.productoModel.actualizarProducto(idProducto, {
        idCategoria: Number(idCategoria),
        nombreProducto: String(nombreProducto).trim(),
        precioCompra: Number(precioCompra),
        precioVenta: Number(precioVenta),
        stockActual: Number(stockActual)
      });

      if (!productoActualizado) {
        return res.status(404).json({
          exito: false,
          mensaje: `No existe un producto con ID ${idProducto} para actualizar.`
        });
      }

      return res.status(200).json({
        exito: true,
        mensaje: 'Producto actualizado correctamente.',
        datos: productoActualizado
      });
    } catch (error) {
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al actualizar el producto.',
        detalle: error.message
      });
    }
  };

  // DELETE /api/productos/:id
  borrarProducto = async (req, res) => {
    try {
      const idProducto = Number(req.params.id);
      const productoEliminado = await this.productoModel.eliminarProducto(idProducto);

      if (!productoEliminado) {
        return res.status(404).json({
          exito: false,
          mensaje: `No existe un producto con ID ${idProducto} para eliminar.`
        });
      }

      return res.status(200).json({
        exito: true,
        mensaje: 'Producto eliminado correctamente.',
        datos: productoEliminado
      });
    } catch (error) {
      return res.status(500).json({
        exito: false,
        mensaje: 'Error al eliminar el producto.',
        detalle: error.message
      });
    }
  };
}

module.exports = ProductoController;