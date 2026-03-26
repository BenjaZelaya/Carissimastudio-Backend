// tests/integration/services/producto.service.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import { connect, closeDatabase, clearDatabase } from "../../setup/db.js";
import {
  crearProducto,
  obtenerProductos,
  obtenerProductosAdmin,
  obtenerProductoPorId,
  actualizarProducto,
  eliminarProducto,
  restaurarProducto,
  actualizarOrden,
  eliminarDefinitivo,
} from "../../../services/Producto.js";
import Producto from "../../../models/Producto.js";

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const imgValida = "https://res.cloudinary.com/test/image/upload/test.jpg";
const datosBase = { nombreProducto: "Laminado de cejas", precio: 3500, img: imgValida };

const crearProductoTest = (overrides = {}) =>
  crearProducto({ ...datosBase, ...overrides });

describe("crearProducto", () => {
  it("crea un producto activo con los datos correctos", async () => {
    const prod = await crearProductoTest();
    expect(prod._id).toBeDefined();
    expect(prod.nombreProducto).toBe("Laminado de cejas");
    expect(prod.estado).toBe(true);
  });

  it("lanza AppError 409 si el nombre ya existe (case-insensitive)", async () => {
    await crearProductoTest();
    await expect(crearProductoTest({ nombreProducto: "laminado de cejas" })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("no colisiona con un producto inactivo del mismo nombre", async () => {
    const prod = await crearProductoTest();
    await Producto.findByIdAndUpdate(prod._id, { estado: false });
    const nuevo = await crearProductoTest();
    expect(nuevo._id).toBeDefined();
  });
});

describe("obtenerProductos", () => {
  it("retorna solo los productos activos paginados", async () => {
    await crearProductoTest({ nombreProducto: "Prod1" });
    await crearProductoTest({ nombreProducto: "Prod2" });
    await Producto.create({ ...datosBase, nombreProducto: "Inactivo", estado: false });
    const resultado = await obtenerProductos({ page: 1, limit: 20 });
    expect(resultado.total).toBe(2);
    resultado.productos.forEach((p) => expect(p.estado).toBe(true));
  });
});

describe("obtenerProductosAdmin", () => {
  it("retorna todos los productos incluyendo inactivos", async () => {
    await crearProductoTest({ nombreProducto: "Activo" });
    await Producto.create({ ...datosBase, nombreProducto: "Inactivo", estado: false });
    const resultado = await obtenerProductosAdmin({ page: 1, limit: 20 });
    expect(resultado.total).toBe(2);
  });
});

describe("obtenerProductoPorId", () => {
  it("retorna el producto activo por ID", async () => {
    const prod = await crearProductoTest();
    const resultado = await obtenerProductoPorId(prod._id.toString());
    expect(resultado._id.toString()).toBe(prod._id.toString());
  });

  it("lanza AppError 404 si el producto no existe", async () => {
    await expect(
      obtenerProductoPorId("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lanza AppError 404 si el producto esta inactivo", async () => {
    const prod = await crearProductoTest();
    await Producto.findByIdAndUpdate(prod._id, { estado: false });
    await expect(
      obtenerProductoPorId(prod._id.toString())
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("actualizarProducto", () => {
  it("actualiza los campos del producto", async () => {
    const prod = await crearProductoTest();
    const resultado = await actualizarProducto(prod._id.toString(), { precio: 4000 });
    expect(resultado.precio).toBe(4000);
  });

  it("lanza AppError 409 si el nuevo nombre ya lo usa otro producto activo", async () => {
    await crearProductoTest({ nombreProducto: "Prod1" });
    const prod2 = await crearProductoTest({ nombreProducto: "Prod2" });
    await expect(
      actualizarProducto(prod2._id.toString(), { nombreProducto: "prod1" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("permite actualizar con el mismo nombre del propio producto", async () => {
    const prod = await crearProductoTest();
    const resultado = await actualizarProducto(prod._id.toString(), {
      nombreProducto: "Laminado de cejas",
    });
    expect(resultado.nombreProducto).toBe("Laminado de cejas");
  });

  it("no modifica el campo estado aunque se envie", async () => {
    const prod = await crearProductoTest();
    const resultado = await actualizarProducto(prod._id.toString(), { estado: false, precio: 2000 });
    expect(resultado.estado).toBe(true);
  });
});

describe("eliminarProducto", () => {
  it("hace soft delete (estado = false)", async () => {
    const prod = await crearProductoTest();
    const resultado = await eliminarProducto(prod._id.toString());
    expect(resultado.estado).toBe(false);
  });
});

describe("restaurarProducto", () => {
  it("reactiva un producto inactivo", async () => {
    const prod = await crearProductoTest();
    await eliminarProducto(prod._id.toString());
    const resultado = await restaurarProducto(prod._id.toString());
    expect(resultado.estado).toBe(true);
  });

  it("lanza AppError 400 si el producto ya esta activo", async () => {
    const prod = await crearProductoTest();
    await expect(restaurarProducto(prod._id.toString())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si el producto no existe", async () => {
    await expect(
      restaurarProducto("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("actualizarOrden", () => {
  it("actualiza el orden de multiples productos via bulkWrite", async () => {
    const p1 = await crearProductoTest({ nombreProducto: "Prod1" });
    const p2 = await crearProductoTest({ nombreProducto: "Prod2" });
    await actualizarOrden([
      { id: p1._id.toString(), orden: 5 },
      { id: p2._id.toString(), orden: 10 },
    ]);
    const prod1 = await Producto.findById(p1._id);
    const prod2 = await Producto.findById(p2._id);
    expect(prod1.orden).toBe(5);
    expect(prod2.orden).toBe(10);
  });
});

describe("eliminarDefinitivo", () => {
  it("elimina el producto de la BD permanentemente", async () => {
    const prod = await crearProductoTest();
    await eliminarDefinitivo(prod._id.toString());
    const encontrado = await Producto.findById(prod._id);
    expect(encontrado).toBeNull();
  });

  it("lanza AppError 404 si el producto no existe", async () => {
    await expect(
      eliminarDefinitivo("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
