const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { verificarConexion } = require('./config/database');
const productoRoutes = require('./routes/productoRoutes');

const aplicacion = express();
const PUERTO_SERVIDOR = process.env.PORT || 3000;

// Middlewares
aplicacion.use(cors());
aplicacion.use(express.json());
aplicacion.use(express.static(path.join(__dirname, '../public')));

// Rutas de la API REST
aplicacion.use('/api/productos', productoRoutes);

// Inicio del servidor
aplicacion.listen(PUERTO_SERVIDOR, async () => {
  console.log(`Servidor RegistrApp activo en http://localhost:${PUERTO_SERVIDOR}`);
  await verificarConexion();
});