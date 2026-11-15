const { Pool } = require('pg');
require('dotenv').config();

const POOL_CONEXION = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: `-c search_path=${process.env.DB_SCHEMA || 'registrapp_db'},public`
});

async function verificarConexion() {
  try {
    const cliente = await POOL_CONEXION.connect();
    console.log('Conexión exitosa a PostgreSQL (Esquema: registrapp_db)');
    cliente.release();
  } catch (error) {
    console.error('Error al conectar con PostgreSQL:', error.message);
  }
}

module.exports = {
  POOL_CONEXION,
  verificarConexion
};