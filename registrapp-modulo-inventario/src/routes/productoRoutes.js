const express = require('express');
const ProductoController = require('../controllers/ProductoController');

const enrutador = express.Router();
const productoController = new ProductoController();

enrutador.post('/', productoController.registrarProducto);
enrutador.get('/', productoController.listarProductos);
enrutador.get('/:id', productoController.consultarProductoPorId);
enrutador.put('/:id', productoController.modificarProducto);
enrutador.delete('/:id', productoController.borrarProducto);

module.exports = enrutador;