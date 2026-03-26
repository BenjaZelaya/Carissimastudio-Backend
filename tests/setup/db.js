// tests/setup/db.js
// Gestiona el ciclo de vida de mongodb-memory-server para los tests.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

/**
 * Inicia un servidor MongoDB en memoria y conecta mongoose.
 * Si ya existe una conexion activa, la cierra primero.
 */
export const connect = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

/**
 * Elimina la base de datos, cierra la conexion y detiene el servidor.
 */
export const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
};

/**
 * Limpia todas las colecciones sin detener el servidor.
 * Usar en afterEach para aislar cada test.
 */
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};
