// tests/integration/services/usuario.service.test.js
import { describe, it, expect, beforeAll, afterEach, afterAll } from "@jest/globals";
import bcrypt from "bcryptjs";
import { connect, closeDatabase, clearDatabase } from "../../setup/db.js";
import {
  obtenerUsuarios,
  obtenerUsuarioPorId,
  actualizarUsuario,
  actualizarPerfilPropio,
  eliminarUsuario,
  restaurarUsuario,
} from "../../../services/Usuario.js";
import Usuario from "../../../models/Usuario.js";

beforeAll(async () => await connect());
afterEach(async () => await clearDatabase());
afterAll(async () => await closeDatabase());

const crearUsuario = async (overrides = {}) => {
  const salt = bcrypt.genSaltSync(10);
  return await Usuario.create({
    nombre: "Test",
    apellido: "User",
    email: `test${Date.now()}@test.com`,
    password: bcrypt.hashSync("pass123", salt),
    telefono: "1234567890",
    rol: "USER_ROLE",
    estado: true,
    ...overrides,
  });
};

describe("obtenerUsuarios", () => {
  it("retorna lista paginada de usuarios", async () => {
    await crearUsuario();
    await crearUsuario();
    const resultado = await obtenerUsuarios({ page: 1, limit: 20 });
    expect(resultado.total).toBe(2);
    expect(resultado.usuarios).toHaveLength(2);
    expect(resultado.page).toBe(1);
    expect(resultado.limit).toBe(20);
  });

  it("sanitiza limit mayor a 100 a 100", async () => {
    const resultado = await obtenerUsuarios({ page: 1, limit: 999 });
    expect(resultado.limit).toBe(100);
  });

  it("sanitiza limit menor a 1 a 1", async () => {
    const resultado = await obtenerUsuarios({ page: 1, limit: 0 });
    expect(resultado.limit).toBe(1);
  });

  it("sanitiza page menor a 1 a 1", async () => {
    const resultado = await obtenerUsuarios({ page: -5, limit: 20 });
    expect(resultado.page).toBe(1);
  });
});

describe("obtenerUsuarioPorId", () => {
  it("retorna el usuario activo por ID", async () => {
    const usuario = await crearUsuario();
    const resultado = await obtenerUsuarioPorId(usuario._id.toString());
    expect(resultado._id.toString()).toBe(usuario._id.toString());
  });

  it("lanza AppError 404 si el usuario no existe", async () => {
    await expect(
      obtenerUsuarioPorId("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("lanza AppError 404 si el usuario esta inactivo", async () => {
    const usuario = await crearUsuario({ estado: false });
    await expect(
      obtenerUsuarioPorId(usuario._id.toString())
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("actualizarUsuario", () => {
  it("actualiza campos permitidos del usuario", async () => {
    const usuario = await crearUsuario();
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const resultado = await actualizarUsuario(
      usuario._id.toString(),
      { nombre: "Nuevo" },
      admin
    );
    expect(resultado.nombre).toBe("Nuevo");
  });

  it("permite al admin cambiar el rol", async () => {
    const usuario = await crearUsuario();
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const resultado = await actualizarUsuario(
      usuario._id.toString(),
      { rol: "ADMIN_ROLE" },
      admin
    );
    expect(resultado.rol).toBe("ADMIN_ROLE");
  });

  it("lanza AppError 403 si un usuario no admin intenta cambiar el rol", async () => {
    const usuario = await crearUsuario();
    const otro = await crearUsuario();
    await expect(
      actualizarUsuario(usuario._id.toString(), { rol: "ADMIN_ROLE" }, otro)
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("lanza AppError 409 si el email ya lo usa otro usuario", async () => {
    const u1 = await crearUsuario();
    const u2 = await crearUsuario();
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    await expect(
      actualizarUsuario(u2._id.toString(), { email: u1.email }, admin)
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("hashea la contrasena si se envia en los datos", async () => {
    const usuario = await crearUsuario();
    const admin = await crearUsuario({ rol: "ADMIN_ROLE" });
    const resultado = await actualizarUsuario(
      usuario._id.toString(),
      { password: "nuevaPass123" },
      admin
    );
    const passValida = bcrypt.compareSync("nuevaPass123", resultado.password);
    expect(passValida).toBe(true);
  });
});

describe("actualizarPerfilPropio", () => {
  it("actualiza solo los campos permitidos (nombre, apellido, telefono)", async () => {
    const usuario = await crearUsuario({ nombre: "Viejo" });
    const resultado = await actualizarPerfilPropio(usuario._id.toString(), {
      nombre: "Nuevo",
      apellido: "Apellido",
    });
    expect(resultado.nombre).toBe("Nuevo");
    expect(resultado.apellido).toBe("Apellido");
  });

  it("lanza AppError 400 si no se envian campos validos", async () => {
    const usuario = await crearUsuario();
    await expect(
      actualizarPerfilPropio(usuario._id.toString(), {})
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("hashea la contrasena si se envia", async () => {
    const usuario = await crearUsuario();
    const resultado = await actualizarPerfilPropio(usuario._id.toString(), {
      password: "miNuevaPass",
    });
    const passValida = bcrypt.compareSync("miNuevaPass", resultado.password);
    expect(passValida).toBe(true);
  });
});

describe("eliminarUsuario", () => {
  it("hace soft delete del usuario", async () => {
    const usuario = await crearUsuario();
    const resultado = await eliminarUsuario(usuario._id.toString());
    expect(resultado.estado).toBe(false);
  });

  it("lanza AppError 404 si el usuario ya estaba inactivo", async () => {
    const usuario = await crearUsuario({ estado: false });
    await expect(eliminarUsuario(usuario._id.toString())).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("restaurarUsuario", () => {
  it("reactiva un usuario inactivo", async () => {
    const usuario = await crearUsuario();
    await eliminarUsuario(usuario._id.toString());
    const resultado = await restaurarUsuario(usuario._id.toString());
    expect(resultado.estado).toBe(true);
  });

  it("lanza AppError 400 si el usuario ya esta activo", async () => {
    const usuario = await crearUsuario();
    await expect(restaurarUsuario(usuario._id.toString())).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("lanza AppError 404 si el usuario no existe", async () => {
    await expect(
      restaurarUsuario("64a1b2c3d4e5f6a7b8c9d0e1")
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
