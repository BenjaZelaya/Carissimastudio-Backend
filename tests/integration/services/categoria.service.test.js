// tests/integration/services/categoria.service.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import { connect, closeDatabase, clearDatabase } from "../../setup/db.js";
import {
  crearCategoria,
  obtenerCategorias,
  obtenerCategoriasAdmin,
  obtenerCategoriaPorId,
  actualizarCategoria,
  eliminarCategoria,
  restaurarCategoria,
  agregarProducto,
  quitarProducto,
  actualizarOrden,
  eliminarDefinitivo,
} from "../../../services/Categoria.js";
import Categoria from "../../../models/Categoria.js";
import Producto from "../../../models/Producto.js";

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const datosBase = { nombreCategoria: "Cejas", descripcion: "Servicios para cejas y laminado" };

const crearCategoriaTest = (overrides = {}) =>
  crearCategoria({ ...datosBase, ...overrides });

describe("crearCategoria", () => {
  it("crea una categoria activa con los datos correctos", async () => {
    const cat = await crearCategoriaTest();
    expect(cat._id).toBeDefined();
    expect(cat.nombreCategoria).toBe("Cejas");
    expect(cat.estado).toBe(true);
  });

  it("lanza AppError 409 si el nombre ya existe (case-insensitive)", async () => {
    await crearCategoriaTest();
    await expect(crearCategoriaTest({ nombreCategoria: "cejas" })).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it("lanza AppError 409 con el mismo nombre exacto", async () => {
    await crearCategoriaTest();
    await expect(crearCategoriaTest()).rejects.toMatchObject({ statusCode: 409 });
  });

  it("no colisiona con una categoria inactiva del mismo nombre", async () => {
    const cat = await crearCategoriaTest();
    await Categoria.findByIdAndUpdate(cat._id, { estado: false });
    const nueva = await crearCategoriaTest();
    expect(nueva._id).toBeDefined();
  });
});

describe("obtenerCategorias", () => {
  it("retorna solo las categorias activas paginadas", async () => {
    await crearCategoriaTest({ nombreCategoria: "Cejas" });
    await crearCategoriaTest({ nombreCategoria: "Pestanas" });
    await Categoria.create({ ...datosBase, nombreCategoria: "Inactiva", estado: false });
    const resultado = await obtenerCategorias({ page: 1, limit: 20 });
    expect(resultado.total).toBe(2);
    expect(resultado.categorias).toHaveLength(2);
    resultado.categorias.forEach((c) => expect(c.estado).toBe(true));
  });

  it("pagina correctamente", async () => {
    await crearCategoriaTest({ nombreCategoria: "Cat1" });
    await crearCategoriaTest({ nombreCategoria: "Cat2" });
    await crearCategoriaTest({ nombreCategoria: "Cat3" });
    const resultado = await obtenerCategorias({ page: 2, limit: 2 });
    expect(resultado.categorias).toHaveLength(1);
    expect(resultado.page).toBe(2);
  });
});

describe("obtenerCategoriasAdmin", () => {
  it("retorna todas las categorias incluyendo inactivas", async () => {
    await crearCategoriaTest({ nombreCategoria: "Activa" });
    await Categoria.create({ ...datosBase, nombreCategoria: "Inactiva", estado: false });
    const resultado = await obtenerCategoriasAdmin({ page: 1, limit: 20 });
    expect(resultado.total).toBe(2);
  });
});

describe("obtenerCategoriaPorId", () => {
  it("retorna la categoria activa por ID", async () => {
    const cat = await crearCategoriaTest();
    const resultado = await obtenerCategoriaPorId(cat._id.toString());
    expect(resultado._id.toString()).toBe(cat._id.toString());
  });

  it("lanza AppError 404 si la categoria no existe", async () => {
    await expect(
      obtenerCategoriaPorId("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lanza AppError 404 si la categoria esta inactiva", async () => {
    const cat = await crearCategoriaTest();
    await Categoria.findByIdAndUpdate(cat._id, { estado: false });
    await expect(
      obtenerCategoriaPorId(cat._id.toString())
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("actualizarCategoria", () => {
  it("actualiza el nombre de la categoria", async () => {
    const cat = await crearCategoriaTest();
    const resultado = await actualizarCategoria(cat._id.toString(), { nombreCategoria: "Pestanas" });
    expect(resultado.nombreCategoria).toBe("Pestanas");
  });

  it("lanza AppError 409 si el nuevo nombre ya lo usa otra categoria", async () => {
    await crearCategoriaTest({ nombreCategoria: "Cejas" });
    const cat2 = await crearCategoriaTest({ nombreCategoria: "Pestanas" });
    await expect(
      actualizarCategoria(cat2._id.toString(), { nombreCategoria: "cejas" })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("permite actualizar con el mismo nombre de la propia categoria", async () => {
    const cat = await crearCategoriaTest({ nombreCategoria: "Cejas" });
    const resultado = await actualizarCategoria(cat._id.toString(), { nombreCategoria: "Cejas" });
    expect(resultado.nombreCategoria).toBe("Cejas");
  });

  it("no modifica el estado aunque se envie en los datos", async () => {
    const cat = await crearCategoriaTest();
    const resultado = await actualizarCategoria(cat._id.toString(), { estado: false, nombreCategoria: "Nuevo" });
    expect(resultado.estado).toBe(true);
  });
});

describe("eliminarCategoria", () => {
  it("hace soft delete (estado = false)", async () => {
    const cat = await crearCategoriaTest();
    const resultado = await eliminarCategoria(cat._id.toString());
    expect(resultado.estado).toBe(false);
  });

  it("lanza AppError 404 si ya estaba inactiva", async () => {
    const cat = await crearCategoriaTest();
    await eliminarCategoria(cat._id.toString());
    await expect(eliminarCategoria(cat._id.toString())).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("restaurarCategoria", () => {
  it("reactiva una categoria inactiva", async () => {
    const cat = await crearCategoriaTest();
    await eliminarCategoria(cat._id.toString());
    const resultado = await restaurarCategoria(cat._id.toString());
    expect(resultado.estado).toBe(true);
  });

  it("lanza AppError 400 si la categoria ya esta activa", async () => {
    const cat = await crearCategoriaTest();
    await expect(restaurarCategoria(cat._id.toString())).rejects.toMatchObject({ statusCode: 400 });
  });

  it("lanza AppError 404 si la categoria no existe", async () => {
    await expect(
      restaurarCategoria("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("agregarProducto / quitarProducto", () => {
  const imgValida = "https://res.cloudinary.com/test/image/upload/test.jpg";

  it("agrega un producto a la categoria", async () => {
    const cat = await crearCategoriaTest();
    const prod = await Producto.create({ nombreProducto: "Henna", precio: 1500, img: imgValida });
    const resultado = await agregarProducto(cat._id.toString(), prod._id.toString());
    expect(resultado.productos.map((p) => p._id.toString())).toContain(prod._id.toString());
  });

  it("lanza AppError 409 si el producto ya esta en la categoria", async () => {
    const cat = await crearCategoriaTest();
    const prod = await Producto.create({ nombreProducto: "Henna", precio: 1500, img: imgValida });
    await agregarProducto(cat._id.toString(), prod._id.toString());
    await expect(
      agregarProducto(cat._id.toString(), prod._id.toString())
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("quita un producto de la categoria", async () => {
    const cat = await crearCategoriaTest();
    const prod = await Producto.create({ nombreProducto: "Henna", precio: 1500, img: imgValida });
    await agregarProducto(cat._id.toString(), prod._id.toString());
    const resultado = await quitarProducto(cat._id.toString(), prod._id.toString());
    expect(resultado.productos.map((p) => p._id.toString())).not.toContain(prod._id.toString());
  });
});

describe("actualizarOrden", () => {
  it("actualiza el orden de multiples categorias via bulkWrite", async () => {
    const cat1 = await crearCategoriaTest({ nombreCategoria: "Cat1" });
    const cat2 = await crearCategoriaTest({ nombreCategoria: "Cat2" });
    await actualizarOrden([
      { id: cat1._id.toString(), orden: 10 },
      { id: cat2._id.toString(), orden: 20 },
    ]);
    const c1 = await Categoria.findById(cat1._id);
    const c2 = await Categoria.findById(cat2._id);
    expect(c1.orden).toBe(10);
    expect(c2.orden).toBe(20);
  });
});

describe("eliminarDefinitivo", () => {
  it("elimina la categoria de la BD definitivamente", async () => {
    const cat = await crearCategoriaTest();
    await eliminarDefinitivo(cat._id.toString());
    const encontrada = await Categoria.findById(cat._id);
    expect(encontrada).toBeNull();
  });

  it("lanza AppError 404 si la categoria no existe", async () => {
    await expect(
      eliminarDefinitivo("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
