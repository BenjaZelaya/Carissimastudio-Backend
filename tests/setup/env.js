// tests/setup/env.js
// Variables de entorno necesarias para el entorno de testing.
// Este archivo se ejecuta antes de cada suite via jest.config.cjs > setupFiles.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_secret_clave_para_testing_no_usar_en_produccion";
process.env.MONGO_URI = "mongodb://localhost/test_placeholder"; // reemplazado por mongodb-memory-server
process.env.CLOUDINARY_CLOUD_NAME = "test_cloud";
process.env.CLOUDINARY_API_KEY = "test_api_key";
process.env.CLOUDINARY_API_SECRET = "test_api_secret";
